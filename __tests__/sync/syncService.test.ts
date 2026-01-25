import {
  syncSubjects,
  syncAssignments,
  getUserLevel,
  convertSubjectToInput,
  convertAssignmentToInput,
  completeLessons,
  syncPendingLessons,
  clearPendingLessons,
  submitReviews,
  syncPendingReviews,
  clearPendingReviews,
} from '../../src/sync/syncService';
import { WaniKaniClient, WaniKaniApiError } from '../../src/api/wanikaniApi';
import type {
  WaniKaniResource,
  RadicalData,
  KanjiData,
  VocabularyData,
  AssignmentData,
} from '../../src/api/types';
import {
  initializeDatabase,
  getSubjectCount,
  getSubjectById,
  getAssignmentCount,
  getAssignmentById,
  getSyncStatus,
  updateSyncStatus,
  _resetDatabaseInstance,
  getAllPendingLessons,
  getPendingLessonCount,
  getAllPendingReviews,
  getPendingReviewCount,
} from '../../src/storage/database';
import { __resetMockDatabase } from '../../__mocks__/react-native-sqlite-storage';

// Mock fetch globally
const mockFetch = jest.fn();
(globalThis as { fetch: typeof fetch }).fetch = mockFetch;

// Helper to create mock radical data
function createMockRadical(id: number, level: number): WaniKaniResource<RadicalData> {
  return {
    id,
    object: 'radical',
    url: `https://api.wanikani.com/v2/subjects/${id}`,
    data_updated_at: '2024-01-01T00:00:00.000000Z',
    data: {
      auxiliary_meanings: [],
      characters: '一',
      created_at: '2012-02-27T19:55:19.000000Z',
      document_url: 'https://www.wanikani.com/radicals/ground',
      hidden_at: null,
      lesson_position: 0,
      level,
      meaning_mnemonic: 'This is the ground radical',
      meanings: [{ meaning: 'Ground', primary: true, accepted_answer: true }],
      slug: 'ground',
      spaced_repetition_system_id: 1,
      amalgamation_subject_ids: [440],
    },
  };
}

// Helper to create mock kanji data
function createMockKanji(id: number, level: number): WaniKaniResource<KanjiData> {
  return {
    id,
    object: 'kanji',
    url: `https://api.wanikani.com/v2/subjects/${id}`,
    data_updated_at: '2024-01-01T00:00:00.000000Z',
    data: {
      auxiliary_meanings: [],
      characters: '一',
      created_at: '2012-02-27T19:55:19.000000Z',
      document_url: 'https://www.wanikani.com/kanji/一',
      hidden_at: null,
      lesson_position: 0,
      level,
      meaning_mnemonic: 'Imagine a single horizontal line',
      meanings: [{ meaning: 'One', primary: true, accepted_answer: true }],
      slug: 'one',
      spaced_repetition_system_id: 1,
      amalgamation_subject_ids: [2467],
      component_subject_ids: [1],
      meaning_hint: null,
      reading_hint: null,
      reading_mnemonic: 'As you count up, say "ITCHY"',
      readings: [
        { reading: 'いち', primary: true, accepted_answer: true, type: 'onyomi' },
        { reading: 'ひと', primary: false, accepted_answer: true, type: 'kunyomi' },
      ],
      visually_similar_subject_ids: [],
    },
  };
}

// Helper to create mock vocabulary data
function createMockVocabulary(id: number, level: number): WaniKaniResource<VocabularyData> {
  return {
    id,
    object: 'vocabulary',
    url: `https://api.wanikani.com/v2/subjects/${id}`,
    data_updated_at: '2024-01-01T00:00:00.000000Z',
    data: {
      auxiliary_meanings: [],
      characters: '一',
      created_at: '2012-02-27T19:55:19.000000Z',
      document_url: 'https://www.wanikani.com/vocabulary/一',
      hidden_at: null,
      lesson_position: 0,
      level,
      meaning_mnemonic: 'This is a vocab mnemonic',
      meanings: [{ meaning: 'One', primary: true, accepted_answer: true }],
      slug: 'one',
      spaced_repetition_system_id: 1,
      component_subject_ids: [440],
      context_sentences: [{ en: 'I have one apple.', ja: 'りんごが一つあります。' }],
      meaning_hint: null,
      parts_of_speech: ['numeral'],
      pronunciation_audios: [],
      reading_mnemonic: 'This is the reading mnemonic',
      readings: [{ reading: 'いち', primary: true, accepted_answer: true }],
    },
  };
}

// Helper to create mock assignment data
function createMockAssignment(
  id: number,
  subjectId: number,
  options: {
    srsStage?: number;
    availableAt?: string | null;
    startedAt?: string | null;
    unlockedAt?: string | null;
  } = {},
): WaniKaniResource<AssignmentData> {
  // Use 'hasOwnProperty' check to distinguish between undefined (use default) and null (explicit null)
  const hasAvailableAt = Object.prototype.hasOwnProperty.call(options, 'availableAt');
  const hasStartedAt = Object.prototype.hasOwnProperty.call(options, 'startedAt');
  const hasUnlockedAt = Object.prototype.hasOwnProperty.call(options, 'unlockedAt');

  return {
    id,
    object: 'assignment',
    url: `https://api.wanikani.com/v2/assignments/${id}`,
    data_updated_at: '2024-01-01T00:00:00.000000Z',
    data: {
      available_at: hasAvailableAt ? options.availableAt! : '2024-01-01T00:00:00.000000Z',
      burned_at: null,
      created_at: '2023-01-01T00:00:00.000000Z',
      hidden: false,
      passed_at: null,
      resurrected_at: null,
      srs_stage: options.srsStage ?? 1,
      started_at: hasStartedAt ? options.startedAt! : '2023-06-01T00:00:00.000000Z',
      subject_id: subjectId,
      subject_type: 'radical',
      unlocked_at: hasUnlockedAt ? options.unlockedAt! : '2023-01-01T00:00:00.000000Z',
    },
  };
}

describe('syncService', () => {
  beforeEach(async () => {
    jest.clearAllMocks();
    __resetMockDatabase();
    _resetDatabaseInstance();
    await initializeDatabase();
  });

  describe('convertSubjectToInput', () => {
    it('should convert a radical subject to database input', () => {
      const radical = createMockRadical(1, 1);
      const input = convertSubjectToInput(radical);

      expect(input.id).toBe(1);
      expect(input.object_type).toBe('radical');
      expect(input.characters).toBe('一');
      expect(input.level).toBe(1);
      expect(input.meaning_mnemonic).toBe('This is the ground radical');
      expect(input.readings).toBeNull(); // Radicals don't have readings
      expect(input.reading_mnemonic).toBeNull();
      expect(input.data_updated_at).toBe('2024-01-01T00:00:00.000000Z');

      // Verify meanings are serialized as JSON
      const meanings = JSON.parse(input.meanings);
      expect(meanings).toEqual([{ meaning: 'Ground', primary: true, accepted_answer: true }]);
    });

    it('should convert a kanji subject to database input', () => {
      const kanji = createMockKanji(440, 1);
      const input = convertSubjectToInput(kanji);

      expect(input.id).toBe(440);
      expect(input.object_type).toBe('kanji');
      expect(input.characters).toBe('一');
      expect(input.level).toBe(1);
      expect(input.meaning_mnemonic).toBe('Imagine a single horizontal line');
      expect(input.reading_mnemonic).toBe('As you count up, say "ITCHY"');

      // Verify readings are serialized as JSON
      const readings = JSON.parse(input.readings!);
      expect(readings).toHaveLength(2);
      expect(readings[0].reading).toBe('いち');
      expect(readings[0].type).toBe('onyomi');

      // Verify component_subject_ids are serialized as JSON
      const componentIds = JSON.parse(input.component_subject_ids!);
      expect(componentIds).toEqual([1]);
    });

    it('should convert a vocabulary subject to database input', () => {
      const vocab = createMockVocabulary(2467, 1);
      const input = convertSubjectToInput(vocab);

      expect(input.id).toBe(2467);
      expect(input.object_type).toBe('vocabulary');
      expect(input.characters).toBe('一');
      expect(input.level).toBe(1);
      expect(input.reading_mnemonic).toBe('This is the reading mnemonic');

      // Verify readings are serialized
      const readings = JSON.parse(input.readings!);
      expect(readings).toHaveLength(1);
      expect(readings[0].reading).toBe('いち');

      // Verify component_subject_ids are serialized
      const componentIds = JSON.parse(input.component_subject_ids!);
      expect(componentIds).toEqual([440]);
    });

    it('should handle null characters', () => {
      const radical = createMockRadical(1, 1);
      radical.data.characters = null;
      const input = convertSubjectToInput(radical);

      expect(input.characters).toBeNull();
    });
  });

  describe('syncSubjects', () => {
    it('should fetch and store subjects up to the specified level', async () => {
      const client = new WaniKaniClient('test-api-key', { maxRetries: 0 });

      // Mock the API response with a collection of subjects
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          object: 'collection',
          url: 'https://api.wanikani.com/v2/subjects',
          pages: { per_page: 500, next_url: null, previous_url: null },
          total_count: 2,
          data_updated_at: '2024-01-01T00:00:00.000000Z',
          data: [createMockRadical(1, 1), createMockKanji(440, 1)],
        }),
      });

      const result = await syncSubjects(client, { maxLevel: 1 });

      expect(result.success).toBe(true);
      expect(result.syncedCount).toBe(2);
      expect(result.error).toBeUndefined();

      // Verify subjects were stored in the database
      const count = await getSubjectCount();
      expect(count).toBe(2);

      const radical = await getSubjectById(1);
      expect(radical).not.toBeNull();
      expect(radical?.object_type).toBe('radical');

      const kanji = await getSubjectById(440);
      expect(kanji).not.toBeNull();
      expect(kanji?.object_type).toBe('kanji');
    });

    it('should handle pagination and fetch all pages', async () => {
      const client = new WaniKaniClient('test-api-key', { maxRetries: 0 });

      // First page
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          object: 'collection',
          url: 'https://api.wanikani.com/v2/subjects',
          pages: {
            per_page: 2,
            next_url: 'https://api.wanikani.com/v2/subjects?page_after_id=2',
            previous_url: null,
          },
          total_count: 4,
          data_updated_at: '2024-01-01T00:00:00.000000Z',
          data: [createMockRadical(1, 1), createMockRadical(2, 1)],
        }),
      });

      // Second page
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          object: 'collection',
          url: 'https://api.wanikani.com/v2/subjects?page_after_id=2',
          pages: { per_page: 2, next_url: null, previous_url: null },
          total_count: 4,
          data_updated_at: '2024-01-01T00:00:00.000000Z',
          data: [createMockKanji(3, 1), createMockVocabulary(4, 1)],
        }),
      });

      const result = await syncSubjects(client, { maxLevel: 1 });

      expect(result.success).toBe(true);
      expect(result.syncedCount).toBe(4);

      // Verify both pages were fetched
      expect(mockFetch).toHaveBeenCalledTimes(2);

      // Verify all subjects were stored
      const count = await getSubjectCount();
      expect(count).toBe(4);
    });

    it('should call progress callback with correct values', async () => {
      const client = new WaniKaniClient('test-api-key', { maxRetries: 0 });
      const onProgress = jest.fn();

      // First page
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          object: 'collection',
          url: 'https://api.wanikani.com/v2/subjects',
          pages: {
            per_page: 2,
            next_url: 'https://api.wanikani.com/v2/subjects?page_after_id=2',
            previous_url: null,
          },
          total_count: 5,
          data_updated_at: '2024-01-01T00:00:00.000000Z',
          data: [createMockRadical(1, 1), createMockRadical(2, 1)],
        }),
      });

      // Second page
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          object: 'collection',
          url: 'https://api.wanikani.com/v2/subjects?page_after_id=2',
          pages: { per_page: 3, next_url: null, previous_url: null },
          total_count: 5,
          data_updated_at: '2024-01-01T00:00:00.000000Z',
          data: [
            createMockKanji(3, 1),
            createMockVocabulary(4, 1),
            createMockVocabulary(5, 1),
          ],
        }),
      });

      await syncSubjects(client, { maxLevel: 1, onProgress });

      // Progress should be called twice (once per page)
      expect(onProgress).toHaveBeenCalledTimes(2);
      expect(onProgress).toHaveBeenNthCalledWith(1, 2, 5); // First page: 2 of 5
      expect(onProgress).toHaveBeenNthCalledWith(2, 5, 5); // Second page: 5 of 5
    });

    it('should build correct levels array from 1 to maxLevel', async () => {
      const client = new WaniKaniClient('test-api-key', { maxRetries: 0 });

      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          object: 'collection',
          url: 'https://api.wanikani.com/v2/subjects',
          pages: { per_page: 500, next_url: null, previous_url: null },
          total_count: 0,
          data_updated_at: '2024-01-01T00:00:00.000000Z',
          data: [],
        }),
      });

      await syncSubjects(client, { maxLevel: 3 });

      // Verify the URL contains levels=1,2,3
      const calledUrl = mockFetch.mock.calls[0][0] as string;
      expect(calledUrl).toContain('levels=1%2C2%2C3');
      expect(calledUrl).toContain('hidden=false');
    });

    it('should support incremental sync with updatedAfter', async () => {
      const client = new WaniKaniClient('test-api-key', { maxRetries: 0 });
      const updatedAfter = '2024-06-01T00:00:00.000000Z';

      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          object: 'collection',
          url: 'https://api.wanikani.com/v2/subjects',
          pages: { per_page: 500, next_url: null, previous_url: null },
          total_count: 0,
          data_updated_at: '2024-01-01T00:00:00.000000Z',
          data: [],
        }),
      });

      await syncSubjects(client, { maxLevel: 1, updatedAfter });

      // Verify the URL contains updated_after parameter
      const calledUrl = mockFetch.mock.calls[0][0] as string;
      expect(calledUrl).toContain('updated_after=');
    });

    it('should update sync status after successful sync', async () => {
      const client = new WaniKaniClient('test-api-key', { maxRetries: 0 });

      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          object: 'collection',
          url: 'https://api.wanikani.com/v2/subjects',
          pages: { per_page: 500, next_url: null, previous_url: null },
          total_count: 1,
          data_updated_at: '2024-01-01T00:00:00.000000Z',
          data: [createMockRadical(1, 1)],
        }),
      });

      const beforeSync = await getSyncStatus();
      expect(beforeSync?.last_subjects_sync).toBeNull();

      await syncSubjects(client, { maxLevel: 1 });

      const afterSync = await getSyncStatus();
      expect(afterSync?.last_subjects_sync).not.toBeNull();
    });

    it('should return error result on API failure', async () => {
      const client = new WaniKaniClient('test-api-key', { maxRetries: 0 });

      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 401,
      });

      const result = await syncSubjects(client, { maxLevel: 1 });

      expect(result.success).toBe(false);
      expect(result.syncedCount).toBe(0);
      expect(result.error).toBe('Invalid API key');
    });

    it('should return error result on network failure', async () => {
      const client = new WaniKaniClient('test-api-key', { maxRetries: 0 });

      mockFetch.mockRejectedValueOnce(new Error('Network unavailable'));

      const result = await syncSubjects(client, { maxLevel: 1 });

      expect(result.success).toBe(false);
      expect(result.syncedCount).toBe(0);
      expect(result.error).toBe('Network unavailable');
    });

    it('should handle empty response gracefully', async () => {
      const client = new WaniKaniClient('test-api-key', { maxRetries: 0 });

      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          object: 'collection',
          url: 'https://api.wanikani.com/v2/subjects',
          pages: { per_page: 500, next_url: null, previous_url: null },
          total_count: 0,
          data_updated_at: '2024-01-01T00:00:00.000000Z',
          data: [],
        }),
      });

      const result = await syncSubjects(client, { maxLevel: 1 });

      expect(result.success).toBe(true);
      expect(result.syncedCount).toBe(0);

      const count = await getSubjectCount();
      expect(count).toBe(0);
    });

    it('should store multiple subjects from multiple levels', async () => {
      const client = new WaniKaniClient('test-api-key', { maxRetries: 0 });

      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          object: 'collection',
          url: 'https://api.wanikani.com/v2/subjects',
          pages: { per_page: 500, next_url: null, previous_url: null },
          total_count: 4,
          data_updated_at: '2024-01-01T00:00:00.000000Z',
          data: [
            createMockRadical(1, 1),
            createMockKanji(2, 1),
            createMockRadical(3, 2),
            createMockKanji(4, 2),
          ],
        }),
      });

      const result = await syncSubjects(client, { maxLevel: 2 });

      expect(result.success).toBe(true);
      expect(result.syncedCount).toBe(4);

      // Verify all subjects are stored with correct levels
      const subject1 = await getSubjectById(1);
      expect(subject1?.level).toBe(1);

      const subject4 = await getSubjectById(4);
      expect(subject4?.level).toBe(2);
    });
  });

  describe('getUserLevel', () => {
    it('should return user level from API', async () => {
      const client = new WaniKaniClient('test-api-key', { maxRetries: 0 });

      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          object: 'user',
          url: 'https://api.wanikani.com/v2/user',
          data_updated_at: '2024-01-01T00:00:00.000000Z',
          data: {
            id: '12345',
            username: 'testuser',
            level: 15,
            profile_url: 'https://www.wanikani.com/users/testuser',
            started_at: '2020-01-01T00:00:00.000000Z',
            current_vacation_started_at: null,
            subscription: {
              active: true,
              type: 'lifetime',
              max_level_granted: 60,
              period_ends_at: null,
            },
            preferences: {
              default_voice_actor_id: 1,
              extra_study_autoplay_audio: false,
              lessons_autoplay_audio: false,
              lessons_batch_size: 5,
              lessons_presentation_order: 'ascending_level_then_subject',
              reviews_autoplay_audio: false,
              reviews_display_srs_indicator: true,
              reviews_presentation_order: 'shuffled',
            },
          },
        }),
      });

      const level = await getUserLevel(client);

      expect(level).toBe(15);
    });

    it('should throw on API error', async () => {
      const client = new WaniKaniClient('test-api-key', { maxRetries: 0 });

      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 401,
      });

      await expect(getUserLevel(client)).rejects.toThrow(WaniKaniApiError);
    });
  });

  describe('convertAssignmentToInput', () => {
    it('should convert an assignment to database input', () => {
      const assignment = createMockAssignment(100, 1, {
        srsStage: 5,
        availableAt: '2024-06-01T12:00:00.000000Z',
        startedAt: '2024-01-15T10:00:00.000000Z',
        unlockedAt: '2024-01-01T00:00:00.000000Z',
      });

      const input = convertAssignmentToInput(assignment);

      expect(input.id).toBe(100);
      expect(input.subject_id).toBe(1);
      expect(input.srs_stage).toBe(5);
      expect(input.available_at).toBe('2024-06-01T12:00:00.000000Z');
      expect(input.started_at).toBe('2024-01-15T10:00:00.000000Z');
      expect(input.unlocked_at).toBe('2024-01-01T00:00:00.000000Z');
      expect(input.data_updated_at).toBe('2024-01-01T00:00:00.000000Z');
    });

    it('should handle null values in assignment', () => {
      const assignment = createMockAssignment(100, 1, {
        availableAt: null,
        startedAt: null,
      });

      const input = convertAssignmentToInput(assignment);

      expect(input.available_at).toBeNull();
      expect(input.started_at).toBeNull();
    });
  });

  describe('syncAssignments', () => {
    it('should fetch and store assignments', async () => {
      const client = new WaniKaniClient('test-api-key', { maxRetries: 0 });

      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          object: 'collection',
          url: 'https://api.wanikani.com/v2/assignments',
          pages: { per_page: 500, next_url: null, previous_url: null },
          total_count: 2,
          data_updated_at: '2024-01-01T00:00:00.000000Z',
          data: [
            createMockAssignment(100, 1),
            createMockAssignment(101, 2),
          ],
        }),
      });

      const result = await syncAssignments(client);

      expect(result.success).toBe(true);
      expect(result.syncedCount).toBe(2);
      expect(result.error).toBeUndefined();

      // Verify assignments were stored in the database
      const count = await getAssignmentCount();
      expect(count).toBe(2);

      const assignment1 = await getAssignmentById(100);
      expect(assignment1).not.toBeNull();
      expect(assignment1?.subject_id).toBe(1);

      const assignment2 = await getAssignmentById(101);
      expect(assignment2).not.toBeNull();
      expect(assignment2?.subject_id).toBe(2);
    });

    it('should handle pagination and fetch all pages', async () => {
      const client = new WaniKaniClient('test-api-key', { maxRetries: 0 });

      // First page
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          object: 'collection',
          url: 'https://api.wanikani.com/v2/assignments',
          pages: {
            per_page: 2,
            next_url: 'https://api.wanikani.com/v2/assignments?page_after_id=101',
            previous_url: null,
          },
          total_count: 4,
          data_updated_at: '2024-01-01T00:00:00.000000Z',
          data: [
            createMockAssignment(100, 1),
            createMockAssignment(101, 2),
          ],
        }),
      });

      // Second page
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          object: 'collection',
          url: 'https://api.wanikani.com/v2/assignments?page_after_id=101',
          pages: { per_page: 2, next_url: null, previous_url: null },
          total_count: 4,
          data_updated_at: '2024-01-01T00:00:00.000000Z',
          data: [
            createMockAssignment(102, 3),
            createMockAssignment(103, 4),
          ],
        }),
      });

      const result = await syncAssignments(client);

      expect(result.success).toBe(true);
      expect(result.syncedCount).toBe(4);

      // Verify both pages were fetched
      expect(mockFetch).toHaveBeenCalledTimes(2);

      // Verify all assignments were stored
      const count = await getAssignmentCount();
      expect(count).toBe(4);
    });

    it('should call progress callback with correct values', async () => {
      const client = new WaniKaniClient('test-api-key', { maxRetries: 0 });
      const onProgress = jest.fn();

      // First page
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          object: 'collection',
          url: 'https://api.wanikani.com/v2/assignments',
          pages: {
            per_page: 2,
            next_url: 'https://api.wanikani.com/v2/assignments?page_after_id=101',
            previous_url: null,
          },
          total_count: 5,
          data_updated_at: '2024-01-01T00:00:00.000000Z',
          data: [
            createMockAssignment(100, 1),
            createMockAssignment(101, 2),
          ],
        }),
      });

      // Second page
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          object: 'collection',
          url: 'https://api.wanikani.com/v2/assignments?page_after_id=101',
          pages: { per_page: 3, next_url: null, previous_url: null },
          total_count: 5,
          data_updated_at: '2024-01-01T00:00:00.000000Z',
          data: [
            createMockAssignment(102, 3),
            createMockAssignment(103, 4),
            createMockAssignment(104, 5),
          ],
        }),
      });

      await syncAssignments(client, { onProgress });

      // Progress should be called twice (once per page)
      expect(onProgress).toHaveBeenCalledTimes(2);
      expect(onProgress).toHaveBeenNthCalledWith(1, 2, 5); // First page: 2 of 5
      expect(onProgress).toHaveBeenNthCalledWith(2, 5, 5); // Second page: 5 of 5
    });

    it('should fetch only unlocked assignments', async () => {
      const client = new WaniKaniClient('test-api-key', { maxRetries: 0 });

      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          object: 'collection',
          url: 'https://api.wanikani.com/v2/assignments',
          pages: { per_page: 500, next_url: null, previous_url: null },
          total_count: 0,
          data_updated_at: '2024-01-01T00:00:00.000000Z',
          data: [],
        }),
      });

      await syncAssignments(client);

      // Verify the URL contains unlocked=true
      const calledUrl = mockFetch.mock.calls[0][0] as string;
      expect(calledUrl).toContain('unlocked=true');
    });

    it('should support incremental sync with updatedAfter', async () => {
      const client = new WaniKaniClient('test-api-key', { maxRetries: 0 });
      const updatedAfter = '2024-06-01T00:00:00.000000Z';

      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          object: 'collection',
          url: 'https://api.wanikani.com/v2/assignments',
          pages: { per_page: 500, next_url: null, previous_url: null },
          total_count: 0,
          data_updated_at: '2024-01-01T00:00:00.000000Z',
          data: [],
        }),
      });

      await syncAssignments(client, { updatedAfter });

      // Verify the URL contains updated_after parameter
      const calledUrl = mockFetch.mock.calls[0][0] as string;
      expect(calledUrl).toContain('updated_after=');
    });

    it('should update sync status after successful sync', async () => {
      const client = new WaniKaniClient('test-api-key', { maxRetries: 0 });

      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          object: 'collection',
          url: 'https://api.wanikani.com/v2/assignments',
          pages: { per_page: 500, next_url: null, previous_url: null },
          total_count: 1,
          data_updated_at: '2024-01-01T00:00:00.000000Z',
          data: [createMockAssignment(100, 1)],
        }),
      });

      const beforeSync = await getSyncStatus();
      expect(beforeSync?.last_assignments_sync).toBeNull();

      await syncAssignments(client);

      const afterSync = await getSyncStatus();
      expect(afterSync?.last_assignments_sync).not.toBeNull();
    });

    it('should return error result on API failure', async () => {
      const client = new WaniKaniClient('test-api-key', { maxRetries: 0 });

      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 401,
      });

      const result = await syncAssignments(client);

      expect(result.success).toBe(false);
      expect(result.syncedCount).toBe(0);
      expect(result.error).toBe('Invalid API key');
    });

    it('should return error result on network failure', async () => {
      const client = new WaniKaniClient('test-api-key', { maxRetries: 0 });

      mockFetch.mockRejectedValueOnce(new Error('Network unavailable'));

      const result = await syncAssignments(client);

      expect(result.success).toBe(false);
      expect(result.syncedCount).toBe(0);
      expect(result.error).toBe('Network unavailable');
    });

    it('should handle empty response gracefully', async () => {
      const client = new WaniKaniClient('test-api-key', { maxRetries: 0 });

      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          object: 'collection',
          url: 'https://api.wanikani.com/v2/assignments',
          pages: { per_page: 500, next_url: null, previous_url: null },
          total_count: 0,
          data_updated_at: '2024-01-01T00:00:00.000000Z',
          data: [],
        }),
      });

      const result = await syncAssignments(client);

      expect(result.success).toBe(true);
      expect(result.syncedCount).toBe(0);

      const count = await getAssignmentCount();
      expect(count).toBe(0);
    });

    it('should resume from previous sync timestamp if available', async () => {
      const client = new WaniKaniClient('test-api-key', { maxRetries: 0 });

      // Set a previous sync timestamp to simulate an interrupted sync
      const previousSyncTime = '2024-05-01T00:00:00.000000Z';
      await updateSyncStatus({ last_assignments_sync: previousSyncTime });

      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          object: 'collection',
          url: 'https://api.wanikani.com/v2/assignments',
          pages: { per_page: 500, next_url: null, previous_url: null },
          total_count: 1,
          data_updated_at: '2024-01-01T00:00:00.000000Z',
          data: [createMockAssignment(100, 1)],
        }),
      });

      const result = await syncAssignments(client);

      expect(result.success).toBe(true);
      expect(result.resumed).toBe(true);

      // Verify the URL contains updated_after with the previous sync time
      const calledUrl = mockFetch.mock.calls[0][0] as string;
      expect(calledUrl).toContain('updated_after=');
    });

    it('should not mark as resumed when updatedAfter is explicitly provided', async () => {
      const client = new WaniKaniClient('test-api-key', { maxRetries: 0 });

      // Set a previous sync timestamp
      await updateSyncStatus({ last_assignments_sync: '2024-05-01T00:00:00.000000Z' });

      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          object: 'collection',
          url: 'https://api.wanikani.com/v2/assignments',
          pages: { per_page: 500, next_url: null, previous_url: null },
          total_count: 0,
          data_updated_at: '2024-01-01T00:00:00.000000Z',
          data: [],
        }),
      });

      // Explicitly provide updatedAfter - this shouldn't be marked as resumed
      const result = await syncAssignments(client, {
        updatedAfter: '2024-06-01T00:00:00.000000Z',
      });

      expect(result.success).toBe(true);
      expect(result.resumed).toBe(false);
    });

    it('should store assignments with correct field values', async () => {
      const client = new WaniKaniClient('test-api-key', { maxRetries: 0 });

      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          object: 'collection',
          url: 'https://api.wanikani.com/v2/assignments',
          pages: { per_page: 500, next_url: null, previous_url: null },
          total_count: 1,
          data_updated_at: '2024-01-01T00:00:00.000000Z',
          data: [
            createMockAssignment(100, 42, {
              srsStage: 7,
              availableAt: '2024-07-15T14:30:00.000000Z',
              startedAt: '2024-02-10T09:00:00.000000Z',
              unlockedAt: '2024-02-01T00:00:00.000000Z',
            }),
          ],
        }),
      });

      await syncAssignments(client);

      const assignment = await getAssignmentById(100);
      expect(assignment).not.toBeNull();
      expect(assignment?.id).toBe(100);
      expect(assignment?.subject_id).toBe(42);
      expect(assignment?.srs_stage).toBe(7);
      expect(assignment?.available_at).toBe('2024-07-15T14:30:00.000000Z');
      expect(assignment?.started_at).toBe('2024-02-10T09:00:00.000000Z');
      expect(assignment?.unlocked_at).toBe('2024-02-01T00:00:00.000000Z');
    });
  });

  describe('completeLessons', () => {
    it('should complete lessons online and update local database', async () => {
      const client = new WaniKaniClient('test-api-key', { maxRetries: 0 });

      // Mock the startAssignment API response
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          id: 100,
          object: 'assignment',
          url: 'https://api.wanikani.com/v2/assignments/100',
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

      const result = await completeLessons(client, [
        { assignmentId: 100, subjectId: 1 },
      ]);

      expect(result.success).toBe(true);
      expect(result.completedCount).toBe(1);
      expect(result.queuedCount).toBe(0);

      // Verify assignment was updated in local database
      const assignment = await getAssignmentById(100);
      expect(assignment).not.toBeNull();
      expect(assignment?.started_at).toBe('2024-01-15T10:00:00.000000Z');
      expect(assignment?.srs_stage).toBe(1);
    });

    it('should complete multiple lessons online', async () => {
      const client = new WaniKaniClient('test-api-key', { maxRetries: 0 });

      // Mock responses for two lessons
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

      const result = await completeLessons(client, [
        { assignmentId: 100, subjectId: 1 },
        { assignmentId: 101, subjectId: 2 },
      ]);

      expect(result.success).toBe(true);
      expect(result.completedCount).toBe(2);
      expect(mockFetch).toHaveBeenCalledTimes(2);
    });

    it('should queue lessons when offline (client is null)', async () => {
      const result = await completeLessons(null, [
        { assignmentId: 100, subjectId: 1 },
        { assignmentId: 101, subjectId: 2 },
      ]);

      expect(result.success).toBe(true);
      expect(result.completedCount).toBe(0);
      expect(result.queuedCount).toBe(2);

      // Verify lessons were queued
      const pendingCount = await getPendingLessonCount();
      expect(pendingCount).toBe(2);

      const pendingLessons = await getAllPendingLessons();
      expect(pendingLessons).toHaveLength(2);
      expect(pendingLessons[0].assignment_id).toBe(100);
      expect(pendingLessons[1].assignment_id).toBe(101);
    });

    it('should update local assignments when queueing offline', async () => {
      await completeLessons(null, [{ assignmentId: 100, subjectId: 1 }]);

      // Verify local assignment was updated
      const assignment = await getAssignmentById(100);
      expect(assignment).not.toBeNull();
      expect(assignment?.started_at).not.toBeNull();
      expect(assignment?.srs_stage).toBe(1);
    });

    it('should call progress callback', async () => {
      const client = new WaniKaniClient('test-api-key', { maxRetries: 0 });
      const onProgress = jest.fn();

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

      await completeLessons(
        client,
        [
          { assignmentId: 100, subjectId: 1 },
          { assignmentId: 101, subjectId: 2 },
        ],
        { onProgress },
      );

      expect(onProgress).toHaveBeenCalledTimes(2);
      expect(onProgress).toHaveBeenNthCalledWith(1, 1, 2);
      expect(onProgress).toHaveBeenNthCalledWith(2, 2, 2);
    });

    it('should return empty result for empty lessons array', async () => {
      const client = new WaniKaniClient('test-api-key', { maxRetries: 0 });

      const result = await completeLessons(client, []);

      expect(result.success).toBe(true);
      expect(result.completedCount).toBe(0);
      expect(result.queuedCount).toBe(0);
    });

    it('should handle API error and return partial progress', async () => {
      const client = new WaniKaniClient('test-api-key', { maxRetries: 0 });

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
        });

      const result = await completeLessons(client, [
        { assignmentId: 100, subjectId: 1 },
        { assignmentId: 101, subjectId: 2 },
      ]);

      expect(result.success).toBe(false);
      expect(result.completedCount).toBe(1);
      expect(result.error).toBeDefined();
    });
  });

  describe('syncPendingLessons', () => {
    it('should sync pending lessons from queue', async () => {
      const client = new WaniKaniClient('test-api-key', { maxRetries: 0 });

      // Queue a lesson offline first
      await completeLessons(null, [{ assignmentId: 100, subjectId: 1 }]);

      // Verify it was queued
      let pendingCount = await getPendingLessonCount();
      expect(pendingCount).toBe(1);

      // Mock the API response for syncing
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

      const result = await syncPendingLessons(client);

      expect(result.success).toBe(true);
      expect(result.syncedCount).toBe(1);
      expect(result.failedCount).toBe(0);

      // Verify pending lesson was removed from queue
      pendingCount = await getPendingLessonCount();
      expect(pendingCount).toBe(0);
    });

    it('should return success for empty queue', async () => {
      const client = new WaniKaniClient('test-api-key', { maxRetries: 0 });

      const result = await syncPendingLessons(client);

      expect(result.success).toBe(true);
      expect(result.syncedCount).toBe(0);
      expect(result.failedCount).toBe(0);
    });

    it('should continue syncing on individual lesson failure', async () => {
      const client = new WaniKaniClient('test-api-key', { maxRetries: 0 });

      // Queue two lessons offline
      await completeLessons(null, [
        { assignmentId: 100, subjectId: 1 },
        { assignmentId: 101, subjectId: 2 },
      ]);

      // First fails, second succeeds
      mockFetch
        .mockResolvedValueOnce({
          ok: false,
          status: 500,
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

      const result = await syncPendingLessons(client);

      expect(result.success).toBe(false); // Not all succeeded
      expect(result.syncedCount).toBe(1);
      expect(result.failedCount).toBe(1);

      // First lesson should still be in queue, second should be removed
      const pendingLessons = await getAllPendingLessons();
      expect(pendingLessons).toHaveLength(1);
      expect(pendingLessons[0].assignment_id).toBe(100);
    });
  });

  describe('clearPendingLessons', () => {
    it('should clear all pending lessons', async () => {
      // Queue some lessons
      await completeLessons(null, [
        { assignmentId: 100, subjectId: 1 },
        { assignmentId: 101, subjectId: 2 },
      ]);

      let pendingCount = await getPendingLessonCount();
      expect(pendingCount).toBe(2);

      await clearPendingLessons();

      pendingCount = await getPendingLessonCount();
      expect(pendingCount).toBe(0);
    });
  });

  describe('submitReviews', () => {
    // Helper function to create a mock review API response
    function createMockReviewResponse(
      reviewId: number,
      assignmentId: number,
      subjectId: number,
      newSrsStage: number = 2,
    ) {
      return {
        id: reviewId,
        object: 'review',
        url: `https://api.wanikani.com/v2/reviews/${reviewId}`,
        data_updated_at: '2024-01-15T10:00:00.000000Z',
        data: {
          assignment_id: assignmentId,
          subject_id: subjectId,
          created_at: '2024-01-15T10:00:00.000000Z',
          incorrect_meaning_answers: 1,
          incorrect_reading_answers: 0,
          spaced_repetition_system_id: 1,
          starting_srs_stage: 1,
          ending_srs_stage: newSrsStage,
        },
        resources_updated: {
          assignment: {
            id: assignmentId,
            object: 'assignment',
            url: `https://api.wanikani.com/v2/assignments/${assignmentId}`,
            data_updated_at: '2024-01-15T10:00:00.000000Z',
            data: {
              subject_id: subjectId,
              srs_stage: newSrsStage,
              available_at: '2024-01-15T18:00:00.000000Z',
              started_at: '2024-01-01T10:00:00.000000Z',
              unlocked_at: '2024-01-01T00:00:00.000000Z',
            },
          },
          review_statistic: {
            id: 1000,
            object: 'review_statistic',
            data: {},
          },
        },
      };
    }

    it('should submit reviews online and update local database', async () => {
      const client = new WaniKaniClient('test-api-key', { maxRetries: 0 });

      // Mock the createReview API response
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => createMockReviewResponse(1000, 100, 1, 2),
      });

      const result = await submitReviews(client, [
        {
          assignmentId: 100,
          subjectId: 1,
          incorrectMeaningAnswers: 1,
          incorrectReadingAnswers: 0,
        },
      ]);

      expect(result.success).toBe(true);
      expect(result.submittedCount).toBe(1);
      expect(result.queuedCount).toBe(0);

      // Verify assignment was updated in local database
      const assignment = await getAssignmentById(100);
      expect(assignment).not.toBeNull();
      expect(assignment?.srs_stage).toBe(2);
      expect(assignment?.available_at).toBe('2024-01-15T18:00:00.000000Z');
    });

    it('should submit multiple reviews online', async () => {
      const client = new WaniKaniClient('test-api-key', { maxRetries: 0 });

      // Mock responses for two reviews
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: async () => createMockReviewResponse(1000, 100, 1, 2),
        })
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: async () => createMockReviewResponse(1001, 101, 2, 3),
        });

      const result = await submitReviews(client, [
        {
          assignmentId: 100,
          subjectId: 1,
          incorrectMeaningAnswers: 1,
          incorrectReadingAnswers: 0,
        },
        {
          assignmentId: 101,
          subjectId: 2,
          incorrectMeaningAnswers: 0,
          incorrectReadingAnswers: 1,
        },
      ]);

      expect(result.success).toBe(true);
      expect(result.submittedCount).toBe(2);
      expect(mockFetch).toHaveBeenCalledTimes(2);
    });

    it('should queue reviews when offline (client is null)', async () => {
      const result = await submitReviews(null, [
        {
          assignmentId: 100,
          subjectId: 1,
          incorrectMeaningAnswers: 1,
          incorrectReadingAnswers: 0,
        },
        {
          assignmentId: 101,
          subjectId: 2,
          incorrectMeaningAnswers: 2,
          incorrectReadingAnswers: 1,
        },
      ]);

      expect(result.success).toBe(true);
      expect(result.submittedCount).toBe(0);
      expect(result.queuedCount).toBe(2);

      // Verify reviews were queued
      const pendingCount = await getPendingReviewCount();
      expect(pendingCount).toBe(2);

      const pendingReviews = await getAllPendingReviews();
      expect(pendingReviews).toHaveLength(2);
      expect(pendingReviews[0].assignment_id).toBe(100);
      expect(pendingReviews[0].incorrect_meaning_answers).toBe(1);
      expect(pendingReviews[0].incorrect_reading_answers).toBe(0);
      expect(pendingReviews[1].assignment_id).toBe(101);
      expect(pendingReviews[1].incorrect_meaning_answers).toBe(2);
      expect(pendingReviews[1].incorrect_reading_answers).toBe(1);
    });

    it('should call progress callback', async () => {
      const client = new WaniKaniClient('test-api-key', { maxRetries: 0 });
      const onProgress = jest.fn();

      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: async () => createMockReviewResponse(1000, 100, 1, 2),
        })
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: async () => createMockReviewResponse(1001, 101, 2, 3),
        });

      await submitReviews(
        client,
        [
          {
            assignmentId: 100,
            subjectId: 1,
            incorrectMeaningAnswers: 0,
            incorrectReadingAnswers: 0,
          },
          {
            assignmentId: 101,
            subjectId: 2,
            incorrectMeaningAnswers: 0,
            incorrectReadingAnswers: 0,
          },
        ],
        { onProgress },
      );

      expect(onProgress).toHaveBeenCalledTimes(2);
      expect(onProgress).toHaveBeenNthCalledWith(1, 1, 2);
      expect(onProgress).toHaveBeenNthCalledWith(2, 2, 2);
    });

    it('should return empty result for empty reviews array', async () => {
      const client = new WaniKaniClient('test-api-key', { maxRetries: 0 });

      const result = await submitReviews(client, []);

      expect(result.success).toBe(true);
      expect(result.submittedCount).toBe(0);
      expect(result.queuedCount).toBe(0);
    });

    it('should handle API error and return partial progress', async () => {
      const client = new WaniKaniClient('test-api-key', { maxRetries: 0 });

      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: async () => createMockReviewResponse(1000, 100, 1, 2),
        })
        .mockResolvedValueOnce({
          ok: false,
          status: 500,
        });

      const result = await submitReviews(client, [
        {
          assignmentId: 100,
          subjectId: 1,
          incorrectMeaningAnswers: 0,
          incorrectReadingAnswers: 0,
        },
        {
          assignmentId: 101,
          subjectId: 2,
          incorrectMeaningAnswers: 0,
          incorrectReadingAnswers: 0,
        },
      ]);

      expect(result.success).toBe(false);
      expect(result.submittedCount).toBe(1);
      expect(result.error).toBeDefined();
    });

    it('should send correct incorrect answer counts in API request', async () => {
      const client = new WaniKaniClient('test-api-key', { maxRetries: 0 });

      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => createMockReviewResponse(1000, 100, 1, 1),
      });

      await submitReviews(client, [
        {
          assignmentId: 100,
          subjectId: 1,
          incorrectMeaningAnswers: 3,
          incorrectReadingAnswers: 2,
        },
      ]);

      // Verify the API was called with correct parameters
      expect(mockFetch).toHaveBeenCalledTimes(1);
      const [_url, options] = mockFetch.mock.calls[0];
      const body = JSON.parse(options.body);
      expect(body.review.assignment_id).toBe(100);
      expect(body.review.incorrect_meaning_answers).toBe(3);
      expect(body.review.incorrect_reading_answers).toBe(2);
    });
  });

  describe('syncPendingReviews', () => {
    // Helper function to create a mock review API response
    function createMockReviewResponse(
      reviewId: number,
      assignmentId: number,
      subjectId: number,
      newSrsStage: number = 2,
    ) {
      return {
        id: reviewId,
        object: 'review',
        url: `https://api.wanikani.com/v2/reviews/${reviewId}`,
        data_updated_at: '2024-01-15T10:00:00.000000Z',
        data: {
          assignment_id: assignmentId,
          subject_id: subjectId,
          created_at: '2024-01-15T10:00:00.000000Z',
          incorrect_meaning_answers: 0,
          incorrect_reading_answers: 0,
          spaced_repetition_system_id: 1,
          starting_srs_stage: 1,
          ending_srs_stage: newSrsStage,
        },
        resources_updated: {
          assignment: {
            id: assignmentId,
            object: 'assignment',
            url: `https://api.wanikani.com/v2/assignments/${assignmentId}`,
            data_updated_at: '2024-01-15T10:00:00.000000Z',
            data: {
              subject_id: subjectId,
              srs_stage: newSrsStage,
              available_at: '2024-01-15T18:00:00.000000Z',
              started_at: '2024-01-01T10:00:00.000000Z',
              unlocked_at: '2024-01-01T00:00:00.000000Z',
            },
          },
          review_statistic: {
            id: 1000,
            object: 'review_statistic',
            data: {},
          },
        },
      };
    }

    it('should sync pending reviews from queue', async () => {
      const client = new WaniKaniClient('test-api-key', { maxRetries: 0 });

      // Queue a review offline first
      await submitReviews(null, [
        {
          assignmentId: 100,
          subjectId: 1,
          incorrectMeaningAnswers: 1,
          incorrectReadingAnswers: 0,
        },
      ]);

      // Verify it was queued
      let pendingCount = await getPendingReviewCount();
      expect(pendingCount).toBe(1);

      // Mock the API response for syncing
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => createMockReviewResponse(1000, 100, 1, 2),
      });

      const result = await syncPendingReviews(client);

      expect(result.success).toBe(true);
      expect(result.syncedCount).toBe(1);
      expect(result.failedCount).toBe(0);

      // Verify pending review was removed from queue
      pendingCount = await getPendingReviewCount();
      expect(pendingCount).toBe(0);
    });

    it('should return success for empty queue', async () => {
      const client = new WaniKaniClient('test-api-key', { maxRetries: 0 });

      const result = await syncPendingReviews(client);

      expect(result.success).toBe(true);
      expect(result.syncedCount).toBe(0);
      expect(result.failedCount).toBe(0);
    });

    it('should continue syncing on individual review failure', async () => {
      const client = new WaniKaniClient('test-api-key', { maxRetries: 0 });

      // Queue two reviews offline
      await submitReviews(null, [
        {
          assignmentId: 100,
          subjectId: 1,
          incorrectMeaningAnswers: 0,
          incorrectReadingAnswers: 0,
        },
        {
          assignmentId: 101,
          subjectId: 2,
          incorrectMeaningAnswers: 0,
          incorrectReadingAnswers: 0,
        },
      ]);

      // First fails, second succeeds
      mockFetch
        .mockResolvedValueOnce({
          ok: false,
          status: 500,
        })
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: async () => createMockReviewResponse(1001, 101, 2, 2),
        });

      const result = await syncPendingReviews(client);

      expect(result.success).toBe(false); // Not all succeeded
      expect(result.syncedCount).toBe(1);
      expect(result.failedCount).toBe(1);

      // First review should still be in queue, second should be removed
      const pendingReviews = await getAllPendingReviews();
      expect(pendingReviews).toHaveLength(1);
      expect(pendingReviews[0].assignment_id).toBe(100);
    });

    it('should update local database with API response', async () => {
      const client = new WaniKaniClient('test-api-key', { maxRetries: 0 });

      // Queue a review offline
      await submitReviews(null, [
        {
          assignmentId: 100,
          subjectId: 1,
          incorrectMeaningAnswers: 0,
          incorrectReadingAnswers: 0,
        },
      ]);

      // Mock the API response
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => createMockReviewResponse(1000, 100, 1, 5),
      });

      await syncPendingReviews(client);

      // Verify local assignment was updated with API response
      const assignment = await getAssignmentById(100);
      expect(assignment).not.toBeNull();
      expect(assignment?.srs_stage).toBe(5);
      expect(assignment?.available_at).toBe('2024-01-15T18:00:00.000000Z');
    });
  });

  describe('clearPendingReviews', () => {
    it('should clear all pending reviews', async () => {
      // Queue some reviews
      await submitReviews(null, [
        {
          assignmentId: 100,
          subjectId: 1,
          incorrectMeaningAnswers: 0,
          incorrectReadingAnswers: 0,
        },
        {
          assignmentId: 101,
          subjectId: 2,
          incorrectMeaningAnswers: 1,
          incorrectReadingAnswers: 1,
        },
      ]);

      let pendingCount = await getPendingReviewCount();
      expect(pendingCount).toBe(2);

      await clearPendingReviews();

      pendingCount = await getPendingReviewCount();
      expect(pendingCount).toBe(0);
    });
  });
});
