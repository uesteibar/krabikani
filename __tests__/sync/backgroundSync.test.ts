import { backgroundSync } from '../../src/sync/syncService';
import { WaniKaniClient } from '../../src/api/wanikaniApi';

// Mock the storage module
jest.mock('../../src/storage/database', () => ({
  upsertSubjects: jest.fn().mockResolvedValue(undefined),
  upsertAssignments: jest.fn().mockResolvedValue(undefined),
  upsertAssignment: jest.fn().mockResolvedValue(undefined),
  updateSyncStatus: jest.fn().mockResolvedValue(undefined),
  getSyncStatus: jest.fn().mockResolvedValue({
    id: 1,
    last_subjects_sync: '2026-01-25T10:00:00.000Z',
    last_assignments_sync: '2026-01-25T10:00:00.000Z',
    last_summary_sync: null,
  }),
  getAllPendingLessons: jest.fn().mockResolvedValue([]),
  getAllPendingReviews: jest.fn().mockResolvedValue([]),
  deletePendingLessonByAssignmentId: jest.fn().mockResolvedValue(undefined),
  deletePendingReview: jest.fn().mockResolvedValue(undefined),
  insertPendingLessons: jest.fn().mockResolvedValue(undefined),
  insertPendingReview: jest.fn().mockResolvedValue(undefined),
  deleteAllPendingLessons: jest.fn().mockResolvedValue(undefined),
  deleteAllPendingReviews: jest.fn().mockResolvedValue(undefined),
}));

// Create a mock fetch for API tests
const mockFetch = jest.fn();
(globalThis as { fetch: typeof fetch }).fetch = mockFetch;

describe('backgroundSync', () => {
  let client: WaniKaniClient;

  beforeEach(() => {
    jest.clearAllMocks();
    // Create client with no retries for deterministic tests
    client = new WaniKaniClient('test-api-key', { maxRetries: 0 });

    // Default mock responses
    mockFetch
      // getUser
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () => Promise.resolve({
          object: 'user',
          url: 'https://api.wanikani.com/v2/user',
          data_updated_at: '2026-01-25T10:00:00.000Z',
          data: {
            id: 'user-id',
            username: 'testuser',
            level: 5,
            profile_url: 'https://www.wanikani.com/users/testuser',
            started_at: '2024-01-01T00:00:00.000Z',
            current_vacation_started_at: null,
            subscription: {
              active: true,
              type: 'lifetime',
              max_level_granted: 60,
              period_ends_at: null,
            },
            preferences: {
              lessons_batch_size: 5,
              default_voice_actor_id: 1,
              lessons_autoplay_audio: true,
              reviews_autoplay_audio: true,
              lessons_presentation_order: 'ascending_level_then_subject',
              reviews_presentation_order: 'shuffled',
              extra_study_autoplay_audio: true,
            },
          },
        }),
      })
      // getSubjects (empty result - no updates)
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () => Promise.resolve({
          object: 'collection',
          url: 'https://api.wanikani.com/v2/subjects',
          pages: { next_url: null, previous_url: null, per_page: 1000 },
          total_count: 0,
          data_updated_at: '2026-01-25T10:00:00.000Z',
          data: [],
        }),
      })
      // getAssignments (empty result - no updates)
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () => Promise.resolve({
          object: 'collection',
          url: 'https://api.wanikani.com/v2/assignments',
          pages: { next_url: null, previous_url: null, per_page: 1000 },
          total_count: 0,
          data_updated_at: '2026-01-25T10:00:00.000Z',
          data: [],
        }),
      });
  });

  describe('basic sync', () => {
    it('should successfully sync when no pending data and no updates', async () => {
      const result = await backgroundSync(client);

      expect(result.success).toBe(true);
      expect(result.skipped).toBe(false);
      expect(result.pendingData).toBeDefined();
      expect(result.subjects).toBeDefined();
      expect(result.assignments).toBeDefined();
    });

    it('should sync pending data first', async () => {
      const result = await backgroundSync(client);

      expect(result.pendingData).toBeDefined();
      expect(result.pendingData?.success).toBe(true);
      expect(result.pendingData?.lessons.syncedCount).toBe(0);
      expect(result.pendingData?.reviews.syncedCount).toBe(0);
    });
  });

  describe('skip behavior', () => {
    it('should skip sync when shouldSkip returns true', async () => {
      const shouldSkip = jest.fn().mockReturnValue(true);

      const result = await backgroundSync(client, {
        shouldSkip,
        skipReason: 'Test skip reason',
      });

      expect(result.success).toBe(true);
      expect(result.skipped).toBe(true);
      expect(result.skipReason).toBe('Test skip reason');
      expect(shouldSkip).toHaveBeenCalled();
    });

    it('should not skip sync when shouldSkip returns false', async () => {
      const shouldSkip = jest.fn().mockReturnValue(false);

      const result = await backgroundSync(client, {
        shouldSkip,
        skipReason: 'Test skip reason',
      });

      expect(result.success).toBe(true);
      expect(result.skipped).toBe(false);
      expect(shouldSkip).toHaveBeenCalled();
    });

    it('should use default skip reason when not provided', async () => {
      const shouldSkip = jest.fn().mockReturnValue(true);

      const result = await backgroundSync(client, { shouldSkip });

      expect(result.skipped).toBe(true);
      expect(result.skipReason).toBe('Sync skipped');
    });

    it('should proceed when shouldSkip is not provided', async () => {
      const result = await backgroundSync(client);

      expect(result.skipped).toBe(false);
    });
  });

  describe('error handling', () => {
    it('should handle API errors gracefully', async () => {
      mockFetch.mockReset();
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      const result = await backgroundSync(client);

      expect(result.success).toBe(false);
      expect(result.skipped).toBe(false);
      expect(result.error).toBe('Network error');
    });

    it('should handle 401 unauthorized errors', async () => {
      mockFetch.mockReset();
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 401,
        json: () => Promise.resolve({ error: 'Unauthorized', code: 401 }),
      });

      const result = await backgroundSync(client);

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });
  });

  describe('incremental sync', () => {
    it('should use last sync timestamp for incremental subject sync', async () => {
      await backgroundSync(client);

      // Check that getSubjects was called with updated_after parameter
      const subjectsCall = mockFetch.mock.calls.find(call =>
        call[0].includes('/v2/subjects'),
      );
      expect(subjectsCall).toBeDefined();
      expect(subjectsCall?.[0]).toContain('updated_after=');
    });
  });
});
