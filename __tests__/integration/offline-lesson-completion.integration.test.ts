/**
 * Integration tests for US-003: Offline lesson completion queuing
 *
 * These tests verify the complete offline lesson completion flow:
 * 1. When device is offline, completed lessons are queued in pending_lessons table
 * 2. Local assignments table is updated with started_at timestamp
 * 3. Completion screen shows 'Queued' status when offline
 * 4. User can complete multiple batches offline without data loss
 * 5. Queued lessons sync automatically when device reconnects
 * 6. After sync, pending_lessons entries are removed
 */

import { WaniKaniClient } from '../../src/api/wanikaniApi';
import {
  completeLessons,
  syncPendingLessons,
  type LessonToComplete,
} from '../../src/sync/syncService';
import {
  initializeDatabase,
  getAssignmentById,
  getAllPendingLessons,
  getPendingLessonCount,
  _resetDatabaseInstance,
} from '../../src/storage/database';

jest.mock('@op-engineering/op-sqlite');

// Get mock helpers from the mocked module
const { __resetMockDatabase } = jest.requireMock('@op-engineering/op-sqlite');

// Mock fetch globally
const mockFetch = jest.fn();
(globalThis as { fetch: typeof fetch }).fetch = mockFetch;

describe('US-003: Offline lesson completion queuing', () => {
  beforeEach(async () => {
    _resetDatabaseInstance();
    __resetMockDatabase();
    await initializeDatabase();
    mockFetch.mockClear();
  });

  describe('AC1: When device is offline, completed lessons are queued in pending_lessons table', () => {
    it('should queue a single lesson in pending_lessons when offline', async () => {
      const lessons: LessonToComplete[] = [
        { assignmentId: 100, subjectId: 1 },
      ];

      // Complete lessons offline (client = null)
      const result = await completeLessons(null, lessons);

      expect(result.success).toBe(true);
      expect(result.completedCount).toBe(0);
      expect(result.queuedCount).toBe(1);

      // Verify lesson was queued
      const pendingCount = await getPendingLessonCount();
      expect(pendingCount).toBe(1);

      const pendingLessons = await getAllPendingLessons();
      expect(pendingLessons).toHaveLength(1);
      expect(pendingLessons[0].assignment_id).toBe(100);
      expect(pendingLessons[0].subject_id).toBe(1);
      expect(pendingLessons[0].started_at).toBeTruthy();
    });

    it('should queue multiple lessons in pending_lessons when offline', async () => {
      const lessons: LessonToComplete[] = [
        { assignmentId: 100, subjectId: 1 },
        { assignmentId: 101, subjectId: 2 },
        { assignmentId: 102, subjectId: 3 },
      ];

      // Complete lessons offline
      const result = await completeLessons(null, lessons);

      expect(result.success).toBe(true);
      expect(result.queuedCount).toBe(3);

      // Verify all lessons were queued
      const pendingCount = await getPendingLessonCount();
      expect(pendingCount).toBe(3);

      const pendingLessons = await getAllPendingLessons();
      expect(pendingLessons).toHaveLength(3);
      const assignmentIds = pendingLessons.map(l => l.assignment_id);
      expect(assignmentIds).toContain(100);
      expect(assignmentIds).toContain(101);
      expect(assignmentIds).toContain(102);
    });
  });

  describe('AC2: Local assignments table is updated with started_at timestamp', () => {
    it('should update local assignment with started_at when offline', async () => {
      const lessons: LessonToComplete[] = [
        { assignmentId: 100, subjectId: 1 },
      ];

      // Complete lessons offline
      await completeLessons(null, lessons);

      // Verify local assignment was updated
      const assignment = await getAssignmentById(100);
      expect(assignment).not.toBeNull();
      expect(assignment?.started_at).not.toBeNull();
      expect(assignment?.srs_stage).toBe(1);
      expect(assignment?.subject_id).toBe(1);
    });

    it('should update all local assignments with started_at for multiple lessons', async () => {
      const lessons: LessonToComplete[] = [
        { assignmentId: 100, subjectId: 1 },
        { assignmentId: 101, subjectId: 2 },
      ];

      // Complete lessons offline
      await completeLessons(null, lessons);

      // Verify both assignments were updated
      const assignment1 = await getAssignmentById(100);
      expect(assignment1?.started_at).not.toBeNull();
      expect(assignment1?.srs_stage).toBe(1);

      const assignment2 = await getAssignmentById(101);
      expect(assignment2?.started_at).not.toBeNull();
      expect(assignment2?.srs_stage).toBe(1);
    });

    it('should set started_at timestamp to current time', async () => {
      const beforeTime = new Date().toISOString();

      const lessons: LessonToComplete[] = [
        { assignmentId: 100, subjectId: 1 },
      ];

      await completeLessons(null, lessons);

      const afterTime = new Date().toISOString();

      const assignment = await getAssignmentById(100);
      const startedAt = assignment?.started_at ?? '';

      // Verify timestamp is within reasonable range
      expect(startedAt >= beforeTime).toBe(true);
      expect(startedAt <= afterTime).toBe(true);
    });
  });

  describe('AC3: Completion screen shows "Queued" status when offline', () => {
    it('should return queuedCount > 0 and completedCount = 0 when offline', async () => {
      const lessons: LessonToComplete[] = [
        { assignmentId: 100, subjectId: 1 },
      ];

      const result = await completeLessons(null, lessons);

      // UI uses completedCount > 0 to determine if syncedOnline = true
      // When completedCount = 0, UI shows "Queued" status
      expect(result.completedCount).toBe(0);
      expect(result.queuedCount).toBeGreaterThan(0);
      expect(result.success).toBe(true);
    });
  });

  describe('AC4: User can complete multiple batches offline without data loss', () => {
    it('should queue lessons from multiple batches without data loss', async () => {
      // First batch
      const batch1: LessonToComplete[] = [
        { assignmentId: 100, subjectId: 1 },
        { assignmentId: 101, subjectId: 2 },
      ];

      const result1 = await completeLessons(null, batch1);
      expect(result1.success).toBe(true);
      expect(result1.queuedCount).toBe(2);

      // Second batch
      const batch2: LessonToComplete[] = [
        { assignmentId: 102, subjectId: 3 },
        { assignmentId: 103, subjectId: 4 },
      ];

      const result2 = await completeLessons(null, batch2);
      expect(result2.success).toBe(true);
      expect(result2.queuedCount).toBe(2);

      // Third batch
      const batch3: LessonToComplete[] = [
        { assignmentId: 104, subjectId: 5 },
      ];

      const result3 = await completeLessons(null, batch3);
      expect(result3.success).toBe(true);
      expect(result3.queuedCount).toBe(1);

      // Verify all lessons are queued
      const pendingCount = await getPendingLessonCount();
      expect(pendingCount).toBe(5);

      const pendingLessons = await getAllPendingLessons();
      expect(pendingLessons).toHaveLength(5);

      // Verify all assignment IDs are present
      const assignmentIds = pendingLessons.map(l => l.assignment_id);
      expect(assignmentIds).toContain(100);
      expect(assignmentIds).toContain(101);
      expect(assignmentIds).toContain(102);
      expect(assignmentIds).toContain(103);
      expect(assignmentIds).toContain(104);

      // Verify all local assignments were updated
      for (let i = 100; i <= 104; i++) {
        const assignment = await getAssignmentById(i);
        expect(assignment?.started_at).not.toBeNull();
      }
    });

    it('should preserve queue order and timestamps across multiple batches', async () => {
      // Complete first batch
      await completeLessons(null, [
        { assignmentId: 100, subjectId: 1 },
      ]);

      const firstPendingLessons = await getAllPendingLessons();
      const firstTimestamp = firstPendingLessons[0].started_at;

      // Wait a bit to ensure different timestamp
      await new Promise(resolve => setTimeout(resolve, 10));

      // Complete second batch
      await completeLessons(null, [
        { assignmentId: 101, subjectId: 2 },
      ]);

      const allPendingLessons = await getAllPendingLessons();
      expect(allPendingLessons).toHaveLength(2);

      // Verify both lessons retained their timestamps
      const lesson100 = allPendingLessons.find(l => l.assignment_id === 100);
      const lesson101 = allPendingLessons.find(l => l.assignment_id === 101);

      expect(lesson100?.started_at).toBe(firstTimestamp);
      expect(lesson101?.started_at).toBeTruthy();
      expect(lesson101!.started_at >= firstTimestamp).toBe(true);
    });
  });

  describe('AC5: Queued lessons sync automatically when device reconnects', () => {
    it('should sync all queued lessons when reconnecting online', async () => {
      // Queue lessons offline
      await completeLessons(null, [
        { assignmentId: 100, subjectId: 1 },
        { assignmentId: 101, subjectId: 2 },
      ]);

      // Verify lessons are queued
      const pendingCountBefore = await getPendingLessonCount();
      expect(pendingCountBefore).toBe(2);

      // Mock API responses for syncing
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: async () => ({
            id: 100,
            object: 'assignment',
            data_updated_at: '2024-01-15T10:00:00.000000Z',
            data: {
              subject_id: 1,
              srs_stage: 1,
              available_at: '2024-01-15T14:00:00.000000Z',
              started_at: '2024-01-15T10:00:00.000000Z',
              unlocked_at: '2024-01-01T00:00:00.000000Z',
            },
          }),
        })
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: async () => ({
            id: 101,
            object: 'assignment',
            data_updated_at: '2024-01-15T10:00:00.000000Z',
            data: {
              subject_id: 2,
              srs_stage: 1,
              available_at: '2024-01-15T14:00:00.000000Z',
              started_at: '2024-01-15T10:00:00.000000Z',
              unlocked_at: '2024-01-01T00:00:00.000000Z',
            },
          }),
        });

      // Sync when reconnecting online
      const client = new WaniKaniClient('test-api-key', { maxRetries: 0 });
      const result = await syncPendingLessons(client);

      expect(result.success).toBe(true);
      expect(result.syncedCount).toBe(2);
      expect(result.failedCount).toBe(0);
    });

    it('should handle partial sync when some lessons fail', async () => {
      // Queue lessons offline
      await completeLessons(null, [
        { assignmentId: 100, subjectId: 1 },
        { assignmentId: 101, subjectId: 2 },
      ]);

      // Mock API: first succeeds, second fails
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: async () => ({
            id: 100,
            object: 'assignment',
            data_updated_at: '2024-01-15T10:00:00.000000Z',
            data: {
              subject_id: 1,
              srs_stage: 1,
              available_at: '2024-01-15T14:00:00.000000Z',
              started_at: '2024-01-15T10:00:00.000000Z',
              unlocked_at: '2024-01-01T00:00:00.000000Z',
            },
          }),
        })
        .mockResolvedValueOnce({
          ok: false,
          status: 500,
          json: async () => ({ error: 'Server error' }),
        });

      const client = new WaniKaniClient('test-api-key', { maxRetries: 0 });
      const result = await syncPendingLessons(client);

      expect(result.success).toBe(false);
      expect(result.syncedCount).toBe(1);
      expect(result.failedCount).toBe(1);

      // Verify failed lesson remains in queue
      const pendingCount = await getPendingLessonCount();
      expect(pendingCount).toBe(1);

      const pendingLessons = await getAllPendingLessons();
      expect(pendingLessons[0].assignment_id).toBe(101);
    });
  });

  describe('AC6: After sync, pending_lessons entries are removed', () => {
    it('should remove successfully synced lessons from pending queue', async () => {
      // Queue lessons offline
      await completeLessons(null, [
        { assignmentId: 100, subjectId: 1 },
      ]);

      // Verify lesson is queued
      const pendingCountBefore = await getPendingLessonCount();
      expect(pendingCountBefore).toBe(1);

      // Mock successful API sync
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          id: 100,
          object: 'assignment',
          data_updated_at: '2024-01-15T10:00:00.000000Z',
          data: {
            subject_id: 1,
            srs_stage: 1,
            available_at: '2024-01-15T14:00:00.000000Z',
            started_at: '2024-01-15T10:00:00.000000Z',
            unlocked_at: '2024-01-01T00:00:00.000000Z',
          },
        }),
      });

      // Sync
      const client = new WaniKaniClient('test-api-key', { maxRetries: 0 });
      await syncPendingLessons(client);

      // Verify pending lesson was removed
      const pendingCountAfter = await getPendingLessonCount();
      expect(pendingCountAfter).toBe(0);

      const pendingLessons = await getAllPendingLessons();
      expect(pendingLessons).toHaveLength(0);
    });

    it('should remove all successfully synced lessons after batch sync', async () => {
      // Queue multiple lessons offline
      await completeLessons(null, [
        { assignmentId: 100, subjectId: 1 },
        { assignmentId: 101, subjectId: 2 },
        { assignmentId: 102, subjectId: 3 },
      ]);

      // Verify all lessons are queued
      const pendingCountBefore = await getPendingLessonCount();
      expect(pendingCountBefore).toBe(3);

      // Mock all API responses
      for (let i = 100; i <= 102; i++) {
        mockFetch.mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: async () => ({
            id: i,
            object: 'assignment',
            data_updated_at: '2024-01-15T10:00:00.000000Z',
            data: {
              subject_id: i - 99,
              srs_stage: 1,
              available_at: '2024-01-15T14:00:00.000000Z',
              started_at: '2024-01-15T10:00:00.000000Z',
              unlocked_at: '2024-01-01T00:00:00.000000Z',
            },
          }),
        });
      }

      // Sync all
      const client = new WaniKaniClient('test-api-key', { maxRetries: 0 });
      const result = await syncPendingLessons(client);

      expect(result.syncedCount).toBe(3);

      // Verify all pending lessons were removed
      const pendingCountAfter = await getPendingLessonCount();
      expect(pendingCountAfter).toBe(0);
    });

    it('should update local assignments with authoritative API data after sync', async () => {
      // Queue lesson offline with optimistic values
      await completeLessons(null, [
        { assignmentId: 100, subjectId: 1 },
      ]);

      // Verify optimistic assignment
      const assignmentBefore = await getAssignmentById(100);
      expect(assignmentBefore?.started_at).toBeTruthy();
      expect(assignmentBefore?.srs_stage).toBe(1);

      // Mock API response with authoritative data
      const apiStartedAt = '2024-01-15T10:30:00.000000Z';
      const apiAvailableAt = '2024-01-15T18:00:00.000000Z';
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          id: 100,
          object: 'assignment',
          data_updated_at: '2024-01-15T10:30:00.000000Z',
          data: {
            subject_id: 1,
            srs_stage: 1,
            available_at: apiAvailableAt,
            started_at: apiStartedAt,
            unlocked_at: '2024-01-01T00:00:00.000000Z',
          },
        }),
      });

      // Sync
      const client = new WaniKaniClient('test-api-key', { maxRetries: 0 });
      await syncPendingLessons(client);

      // Verify assignment was overwritten with API data
      const assignmentAfter = await getAssignmentById(100);
      expect(assignmentAfter?.started_at).toBe(apiStartedAt);
      expect(assignmentAfter?.available_at).toBe(apiAvailableAt);
      expect(assignmentAfter?.data_updated_at).toBe('2024-01-15T10:30:00.000000Z');
    });
  });

  describe('Integration: Complete offline workflow', () => {
    it('should complete full offline-to-online workflow', async () => {
      // Step 1: Complete lessons while offline
      const lessons: LessonToComplete[] = [
        { assignmentId: 100, subjectId: 1 },
        { assignmentId: 101, subjectId: 2 },
      ];

      const offlineResult = await completeLessons(null, lessons);

      // Verify offline completion
      expect(offlineResult.success).toBe(true);
      expect(offlineResult.completedCount).toBe(0);
      expect(offlineResult.queuedCount).toBe(2);

      // Verify lessons are queued
      const pendingCount = await getPendingLessonCount();
      expect(pendingCount).toBe(2);

      // Verify local assignments were updated
      const assignment1 = await getAssignmentById(100);
      const assignment2 = await getAssignmentById(101);
      expect(assignment1?.started_at).toBeTruthy();
      expect(assignment2?.started_at).toBeTruthy();

      // Step 2: Device reconnects, sync pending lessons
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: async () => ({
            id: 100,
            object: 'assignment',
            data_updated_at: '2024-01-15T11:00:00.000000Z',
            data: {
              subject_id: 1,
              srs_stage: 1,
              available_at: '2024-01-15T15:00:00.000000Z',
              started_at: '2024-01-15T11:00:00.000000Z',
              unlocked_at: '2024-01-01T00:00:00.000000Z',
            },
          }),
        })
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: async () => ({
            id: 101,
            object: 'assignment',
            data_updated_at: '2024-01-15T11:00:00.000000Z',
            data: {
              subject_id: 2,
              srs_stage: 1,
              available_at: '2024-01-15T15:00:00.000000Z',
              started_at: '2024-01-15T11:00:00.000000Z',
              unlocked_at: '2024-01-01T00:00:00.000000Z',
            },
          }),
        });

      const client = new WaniKaniClient('test-api-key', { maxRetries: 0 });
      const syncResult = await syncPendingLessons(client);

      // Verify sync completed
      expect(syncResult.success).toBe(true);
      expect(syncResult.syncedCount).toBe(2);
      expect(syncResult.failedCount).toBe(0);

      // Verify pending queue is empty
      const pendingCountAfter = await getPendingLessonCount();
      expect(pendingCountAfter).toBe(0);

      // Verify assignments were updated with API data
      const assignment1After = await getAssignmentById(100);
      const assignment2After = await getAssignmentById(101);
      expect(assignment1After?.started_at).toBe('2024-01-15T11:00:00.000000Z');
      expect(assignment2After?.started_at).toBe('2024-01-15T11:00:00.000000Z');
    });

    it('should handle completing new lessons while previous ones are still pending', async () => {
      // Complete first batch offline
      await completeLessons(null, [
        { assignmentId: 100, subjectId: 1 },
      ]);

      // Verify first lesson is queued
      let pendingCount = await getPendingLessonCount();
      expect(pendingCount).toBe(1);

      // Complete second batch offline (still offline)
      await completeLessons(null, [
        { assignmentId: 101, subjectId: 2 },
      ]);

      // Verify both lessons are queued
      pendingCount = await getPendingLessonCount();
      expect(pendingCount).toBe(2);

      // Device reconnects, sync all pending
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: async () => ({
            id: 100,
            object: 'assignment',
            data_updated_at: '2024-01-15T11:00:00.000000Z',
            data: {
              subject_id: 1,
              srs_stage: 1,
              available_at: '2024-01-15T15:00:00.000000Z',
              started_at: '2024-01-15T11:00:00.000000Z',
              unlocked_at: '2024-01-01T00:00:00.000000Z',
            },
          }),
        })
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: async () => ({
            id: 101,
            object: 'assignment',
            data_updated_at: '2024-01-15T11:00:00.000000Z',
            data: {
              subject_id: 2,
              srs_stage: 1,
              available_at: '2024-01-15T15:00:00.000000Z',
              started_at: '2024-01-15T11:00:00.000000Z',
              unlocked_at: '2024-01-01T00:00:00.000000Z',
            },
          }),
        });

      const client = new WaniKaniClient('test-api-key', { maxRetries: 0 });
      const syncResult = await syncPendingLessons(client);

      // Verify all lessons synced
      expect(syncResult.success).toBe(true);
      expect(syncResult.syncedCount).toBe(2);

      // Verify queue is empty
      pendingCount = await getPendingLessonCount();
      expect(pendingCount).toBe(0);
    });
  });
});
