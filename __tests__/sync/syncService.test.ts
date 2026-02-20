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
  syncPendingData,
  syncPendingSynonyms,
  clearPendingSynonyms,
  syncStudyMaterials,
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
  insertPendingSynonym,
  getPendingSynonymCount,
  getPendingSynonyms,
  addUserSynonym,
  getUserSynonymsBySubjectId,
  upsertAssignment,
} from '../../src/storage/database';

jest.mock('@op-engineering/op-sqlite');

// Get mock helpers from the mocked module to ensure same instance
const { __resetMockDatabase } = jest.requireMock('@op-engineering/op-sqlite');

// Mock fetch globally
const mockFetch = jest.fn();
(globalThis as { fetch: typeof fetch }).fetch = mockFetch;

// Helper to create mock radical data
function createMockRadical(
  id: number,
  level: number,
): WaniKaniResource<RadicalData> {
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
function createMockKanji(
  id: number,
  level: number,
): WaniKaniResource<KanjiData> {
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
        {
          reading: 'いち',
          primary: true,
          accepted_answer: true,
          type: 'onyomi',
        },
        {
          reading: 'ひと',
          primary: false,
          accepted_answer: true,
          type: 'kunyomi',
        },
      ],
      visually_similar_subject_ids: [],
    },
  };
}

// Helper to create mock vocabulary data
function createMockVocabulary(
  id: number,
  level: number,
): WaniKaniResource<VocabularyData> {
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
      context_sentences: [
        { en: 'I have one apple.', ja: 'りんごが一つあります。' },
      ],
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
  const hasAvailableAt = Object.prototype.hasOwnProperty.call(
    options,
    'availableAt',
  );
  const hasStartedAt = Object.prototype.hasOwnProperty.call(
    options,
    'startedAt',
  );
  const hasUnlockedAt = Object.prototype.hasOwnProperty.call(
    options,
    'unlockedAt',
  );

  return {
    id,
    object: 'assignment',
    url: `https://api.wanikani.com/v2/assignments/${id}`,
    data_updated_at: '2024-01-01T00:00:00.000000Z',
    data: {
      available_at: hasAvailableAt
        ? options.availableAt!
        : '2024-01-01T00:00:00.000000Z',
      burned_at: null,
      created_at: '2023-01-01T00:00:00.000000Z',
      hidden: false,
      passed_at: null,
      resurrected_at: null,
      srs_stage: options.srsStage ?? 1,
      started_at: hasStartedAt
        ? options.startedAt!
        : '2023-06-01T00:00:00.000000Z',
      subject_id: subjectId,
      subject_type: 'radical',
      unlocked_at: hasUnlockedAt
        ? options.unlockedAt!
        : '2023-01-01T00:00:00.000000Z',
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
      expect(meanings).toEqual([
        { meaning: 'Ground', primary: true, accepted_answer: true },
      ]);
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
          data: [createMockAssignment(100, 1), createMockAssignment(101, 2)],
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
            next_url:
              'https://api.wanikani.com/v2/assignments?page_after_id=101',
            previous_url: null,
          },
          total_count: 4,
          data_updated_at: '2024-01-01T00:00:00.000000Z',
          data: [createMockAssignment(100, 1), createMockAssignment(101, 2)],
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
          data: [createMockAssignment(102, 3), createMockAssignment(103, 4)],
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
            next_url:
              'https://api.wanikani.com/v2/assignments?page_after_id=101',
            previous_url: null,
          },
          total_count: 5,
          data_updated_at: '2024-01-01T00:00:00.000000Z',
          data: [createMockAssignment(100, 1), createMockAssignment(101, 2)],
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
      await updateSyncStatus({
        last_assignments_sync: '2024-05-01T00:00:00.000000Z',
      });

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
          currentSrsStage: 1,
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
          currentSrsStage: 1,
        },
        {
          assignmentId: 101,
          subjectId: 2,
          incorrectMeaningAnswers: 0,
          incorrectReadingAnswers: 1,
          currentSrsStage: 2,
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
          currentSrsStage: 1,
        },
        {
          assignmentId: 101,
          subjectId: 2,
          incorrectMeaningAnswers: 2,
          incorrectReadingAnswers: 1,
          currentSrsStage: 3,
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
            currentSrsStage: 1,
          },
          {
            assignmentId: 101,
            subjectId: 2,
            incorrectMeaningAnswers: 0,
            incorrectReadingAnswers: 0,
            currentSrsStage: 2,
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
          currentSrsStage: 1,
        },
        {
          assignmentId: 101,
          subjectId: 2,
          incorrectMeaningAnswers: 0,
          incorrectReadingAnswers: 0,
          currentSrsStage: 2,
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
          currentSrsStage: 1,
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

    it('should optimistically update assignment when offline (all correct)', async () => {
      // Insert a test assignment at srs_stage=3, available_at in the past
      await upsertAssignment({
        id: 100,
        subject_id: 1,
        srs_stage: 3,
        available_at: '2024-01-01T00:00:00.000000Z',
        started_at: '2024-01-01T00:00:00.000000Z',
        unlocked_at: '2024-01-01T00:00:00.000000Z',
        data_updated_at: '2024-01-01T00:00:00.000000Z',
      });

      const result = await submitReviews(null, [
        {
          assignmentId: 100,
          subjectId: 1,
          incorrectMeaningAnswers: 0,
          incorrectReadingAnswers: 0,
          currentSrsStage: 3,
        },
      ]);

      expect(result.success).toBe(true);
      expect(result.queuedCount).toBe(1);

      // Verify assignment was optimistically updated
      const assignment = await getAssignmentById(100);
      expect(assignment).not.toBeNull();
      expect(assignment!.srs_stage).toBe(4);
      // available_at should be in the future
      expect(new Date(assignment!.available_at!).getTime()).toBeGreaterThan(
        Date.now() - 5000,
      );
      // Other fields should be preserved
      expect(assignment!.subject_id).toBe(1);
      expect(assignment!.started_at).toBe('2024-01-01T00:00:00.000000Z');
      expect(assignment!.unlocked_at).toBe('2024-01-01T00:00:00.000000Z');
      expect(assignment!.data_updated_at).toBe('2024-01-01T00:00:00.000000Z');
    });

    it('should optimistically update assignment with incorrect answers', async () => {
      await upsertAssignment({
        id: 100,
        subject_id: 1,
        srs_stage: 5,
        available_at: '2024-01-01T00:00:00.000000Z',
        started_at: '2024-01-01T00:00:00.000000Z',
        unlocked_at: '2024-01-01T00:00:00.000000Z',
        data_updated_at: '2024-01-01T00:00:00.000000Z',
      });

      await submitReviews(null, [
        {
          assignmentId: 100,
          subjectId: 1,
          incorrectMeaningAnswers: 1,
          incorrectReadingAnswers: 0,
          currentSrsStage: 5,
        },
      ]);

      const assignment = await getAssignmentById(100);
      expect(assignment).not.toBeNull();
      // Guru 1 (5) with incorrect → Apprentice 4 (4)
      expect(assignment!.srs_stage).toBe(4);
    });

    it('should set available_at to future after offline submission so item is no longer due', async () => {
      // Insert assignment with available_at in the past (available for review)
      await upsertAssignment({
        id: 100,
        subject_id: 1,
        srs_stage: 3,
        available_at: '2024-01-01T00:00:00.000000Z',
        started_at: '2024-01-01T00:00:00.000000Z',
        unlocked_at: '2024-01-01T00:00:00.000000Z',
        data_updated_at: '2024-01-01T00:00:00.000000Z',
      });

      // Verify available_at is in the past (would be returned by getAvailableReviews)
      let assignment = await getAssignmentById(100);
      expect(
        new Date(assignment!.available_at!).getTime(),
      ).toBeLessThan(Date.now());

      // Submit review offline
      await submitReviews(null, [
        {
          assignmentId: 100,
          subjectId: 1,
          incorrectMeaningAnswers: 0,
          incorrectReadingAnswers: 0,
          currentSrsStage: 3,
        },
      ]);

      // Verify available_at is now in the future (getAvailableReviews filters by available_at <= now)
      assignment = await getAssignmentById(100);
      expect(
        new Date(assignment!.available_at!).getTime(),
      ).toBeGreaterThan(Date.now());
    });

    it('should skip optimistic update when assignment not found in DB', async () => {
      // No assignment inserted for id 99999
      const result = await submitReviews(null, [
        {
          assignmentId: 99999,
          subjectId: 1,
          incorrectMeaningAnswers: 0,
          incorrectReadingAnswers: 0,
          currentSrsStage: 3,
        },
      ]);

      // Review should still be queued successfully
      expect(result.success).toBe(true);
      expect(result.queuedCount).toBe(1);

      const pendingReviews = await getAllPendingReviews();
      expect(pendingReviews).toHaveLength(1);
      expect(pendingReviews[0].assignment_id).toBe(99999);
    });

    it('should set burned items to available_at null after offline submission', async () => {
      // Stage 8 (Enlightened) with all correct → stage 9 (Burned)
      await upsertAssignment({
        id: 100,
        subject_id: 1,
        srs_stage: 8,
        available_at: '2024-01-01T00:00:00.000000Z',
        started_at: '2024-01-01T00:00:00.000000Z',
        unlocked_at: '2024-01-01T00:00:00.000000Z',
        data_updated_at: '2024-01-01T00:00:00.000000Z',
      });

      await submitReviews(null, [
        {
          assignmentId: 100,
          subjectId: 1,
          incorrectMeaningAnswers: 0,
          incorrectReadingAnswers: 0,
          currentSrsStage: 8,
        },
      ]);

      const assignment = await getAssignmentById(100);
      expect(assignment).not.toBeNull();
      expect(assignment!.srs_stage).toBe(9);
      expect(assignment!.available_at).toBeNull();
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
          currentSrsStage: 1,
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
          currentSrsStage: 1,
        },
        {
          assignmentId: 101,
          subjectId: 2,
          incorrectMeaningAnswers: 0,
          incorrectReadingAnswers: 0,
          currentSrsStage: 1,
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
          currentSrsStage: 1,
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

    it('should overwrite optimistic values with server data after sync', async () => {
      const client = new WaniKaniClient('test-api-key', { maxRetries: 0 });

      // Insert assignment and submit offline (creates optimistic update)
      await upsertAssignment({
        id: 100,
        subject_id: 1,
        srs_stage: 3,
        available_at: '2024-01-01T00:00:00.000000Z',
        started_at: '2024-01-01T00:00:00.000000Z',
        unlocked_at: '2024-01-01T00:00:00.000000Z',
        data_updated_at: '2024-01-01T00:00:00.000000Z',
      });

      await submitReviews(null, [
        {
          assignmentId: 100,
          subjectId: 1,
          incorrectMeaningAnswers: 0,
          incorrectReadingAnswers: 0,
          currentSrsStage: 3,
        },
      ]);

      // Verify optimistic update was applied
      let assignment = await getAssignmentById(100);
      expect(assignment!.srs_stage).toBe(4);

      // Mock API response with different server values
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => createMockReviewResponse(1000, 100, 1, 5),
      });

      // Sync pending reviews
      await syncPendingReviews(client);

      // Verify server values overwrite optimistic ones
      assignment = await getAssignmentById(100);
      expect(assignment).not.toBeNull();
      expect(assignment!.srs_stage).toBe(5);
      expect(assignment!.available_at).toBe('2024-01-15T18:00:00.000000Z');
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
          currentSrsStage: 1,
        },
        {
          assignmentId: 101,
          subjectId: 2,
          incorrectMeaningAnswers: 1,
          incorrectReadingAnswers: 1,
          currentSrsStage: 3,
        },
      ]);

      let pendingCount = await getPendingReviewCount();
      expect(pendingCount).toBe(2);

      await clearPendingReviews();

      pendingCount = await getPendingReviewCount();
      expect(pendingCount).toBe(0);
    });
  });

  describe('syncPendingData', () => {
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

    it('should sync both pending lessons and reviews', async () => {
      const client = new WaniKaniClient('test-api-key', { maxRetries: 0 });

      // Queue a lesson and a review offline
      await completeLessons(null, [{ assignmentId: 100, subjectId: 1 }]);
      await submitReviews(null, [
        {
          assignmentId: 101,
          subjectId: 2,
          incorrectMeaningAnswers: 0,
          incorrectReadingAnswers: 0,
          currentSrsStage: 1,
        },
      ]);

      // Verify they were queued
      expect(await getPendingLessonCount()).toBe(1);
      expect(await getPendingReviewCount()).toBe(1);

      // Mock API responses for lesson start and review creation
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
          json: async () => createMockReviewResponse(1000, 101, 2, 2),
        });

      const result = await syncPendingData(client);

      expect(result.success).toBe(true);
      expect(result.lessons.syncedCount).toBe(1);
      expect(result.lessons.failedCount).toBe(0);
      expect(result.reviews.syncedCount).toBe(1);
      expect(result.reviews.failedCount).toBe(0);

      // Verify both queues are empty
      expect(await getPendingLessonCount()).toBe(0);
      expect(await getPendingReviewCount()).toBe(0);
    });

    it('should continue syncing reviews even if lessons fail', async () => {
      const client = new WaniKaniClient('test-api-key', { maxRetries: 0 });

      // Queue a lesson and a review
      await completeLessons(null, [{ assignmentId: 100, subjectId: 1 }]);
      await submitReviews(null, [
        {
          assignmentId: 101,
          subjectId: 2,
          incorrectMeaningAnswers: 0,
          incorrectReadingAnswers: 0,
          currentSrsStage: 1,
        },
      ]);

      // Mock: lesson sync fails, review sync succeeds
      mockFetch
        .mockResolvedValueOnce({
          ok: false,
          status: 500,
        })
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: async () => createMockReviewResponse(1000, 101, 2, 2),
        });

      const result = await syncPendingData(client);

      expect(result.success).toBe(false); // Overall success is false
      expect(result.lessons.success).toBe(false);
      expect(result.lessons.failedCount).toBe(1);
      expect(result.reviews.success).toBe(true);
      expect(result.reviews.syncedCount).toBe(1);

      // Lesson should still be in queue, review should be cleared
      expect(await getPendingLessonCount()).toBe(1);
      expect(await getPendingReviewCount()).toBe(0);
    });

    it('should return success when both queues are empty', async () => {
      const client = new WaniKaniClient('test-api-key', { maxRetries: 0 });

      const result = await syncPendingData(client);

      expect(result.success).toBe(true);
      expect(result.lessons.syncedCount).toBe(0);
      expect(result.reviews.syncedCount).toBe(0);
    });

    it('should handle zero data loss - failed items remain in queue', async () => {
      const client = new WaniKaniClient('test-api-key', { maxRetries: 0 });

      // Queue multiple reviews
      await submitReviews(null, [
        {
          assignmentId: 100,
          subjectId: 1,
          incorrectMeaningAnswers: 1,
          incorrectReadingAnswers: 0,
          currentSrsStage: 1,
        },
        {
          assignmentId: 101,
          subjectId: 2,
          incorrectMeaningAnswers: 0,
          incorrectReadingAnswers: 1,
          currentSrsStage: 2,
        },
      ]);

      expect(await getPendingReviewCount()).toBe(2);

      // First fails, second succeeds
      mockFetch
        .mockResolvedValueOnce({
          ok: false,
          status: 500,
        })
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: async () => createMockReviewResponse(1000, 101, 2, 2),
        });

      const result = await syncPendingData(client);

      // Only one review should remain
      expect(await getPendingReviewCount()).toBe(1);
      expect(result.reviews.syncedCount).toBe(1);
      expect(result.reviews.failedCount).toBe(1);

      // The failed review is preserved with its original data
      const pendingReviews = await getAllPendingReviews();
      expect(pendingReviews[0].assignment_id).toBe(100);
      expect(pendingReviews[0].incorrect_meaning_answers).toBe(1);
      expect(pendingReviews[0].incorrect_reading_answers).toBe(0);
    });

    it('should include synonyms result in syncPendingData', async () => {
      const client = new WaniKaniClient('test-api-key', { maxRetries: 0 });

      // Add a pending synonym and corresponding user synonym
      await addUserSynonym({ subject_id: 42, synonym: 'test-synonym' });
      await insertPendingSynonym({ subject_id: 42, synonym: 'test-synonym' });

      // Mock: no existing study material
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          object: 'collection',
          data: [],
          total_count: 0,
          pages: { per_page: 500, next_url: null, previous_url: null },
        }),
      });

      // Mock: create study material
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          id: 1,
          object: 'study_material',
          data: {
            subject_id: 42,
            meaning_synonyms: ['test-synonym'],
          },
        }),
      });

      const result = await syncPendingData(client);

      expect(result.synonyms).toBeDefined();
      expect(result.synonyms.syncedCount).toBe(1);
      expect(result.synonyms.failedCount).toBe(0);
    });
  });

  describe('syncPendingSynonyms', () => {
    it('should return success when no pending synonyms exist', async () => {
      const client = new WaniKaniClient('test-api-key', { maxRetries: 0 });

      const result = await syncPendingSynonyms(client);

      expect(result.success).toBe(true);
      expect(result.syncedCount).toBe(0);
      expect(result.failedCount).toBe(0);
    });

    it('should create new study material when none exists for subject', async () => {
      const client = new WaniKaniClient('test-api-key', { maxRetries: 0 });

      // Add a user synonym and pending synonym
      await addUserSynonym({ subject_id: 42, synonym: 'my synonym' });
      await insertPendingSynonym({ subject_id: 42, synonym: 'my synonym' });

      // Mock: no existing study material
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          object: 'collection',
          url: 'https://api.wanikani.com/v2/study_materials',
          pages: { per_page: 500, next_url: null, previous_url: null },
          total_count: 0,
          data_updated_at: null,
          data: [],
        }),
      });

      // Mock: create study material
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          id: 1,
          object: 'study_material',
          url: 'https://api.wanikani.com/v2/study_materials/1',
          data_updated_at: '2024-01-01T00:00:00.000000Z',
          data: {
            created_at: '2024-01-01T00:00:00.000000Z',
            hidden: false,
            meaning_note: null,
            meaning_synonyms: ['my synonym'],
            reading_note: null,
            subject_id: 42,
            subject_type: 'vocabulary',
          },
        }),
      });

      const result = await syncPendingSynonyms(client);

      expect(result.success).toBe(true);
      expect(result.syncedCount).toBe(1);
      expect(result.failedCount).toBe(0);

      // Verify pending synonym was removed
      const pendingCount = await getPendingSynonymCount();
      expect(pendingCount).toBe(0);

      // Verify API calls
      expect(mockFetch).toHaveBeenCalledTimes(2);
      // First call: GET study_materials with subject_ids filter
      expect(mockFetch.mock.calls[0][0]).toContain('/study_materials');
      expect(mockFetch.mock.calls[0][0]).toContain('subject_ids=42');
      // Second call: POST to create study_material
      expect(mockFetch.mock.calls[1][0]).toBe(
        'https://api.wanikani.com/v2/study_materials',
      );
    });

    it('should update existing study material and merge synonyms', async () => {
      const client = new WaniKaniClient('test-api-key', { maxRetries: 0 });

      // Add a user synonym and pending synonym
      await addUserSynonym({ subject_id: 42, synonym: 'new synonym' });
      await insertPendingSynonym({ subject_id: 42, synonym: 'new synonym' });

      // Mock: existing study material with one synonym
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          object: 'collection',
          url: 'https://api.wanikani.com/v2/study_materials',
          pages: { per_page: 500, next_url: null, previous_url: null },
          total_count: 1,
          data_updated_at: '2024-01-01T00:00:00.000000Z',
          data: [
            {
              id: 100,
              object: 'study_material',
              url: 'https://api.wanikani.com/v2/study_materials/100',
              data_updated_at: '2024-01-01T00:00:00.000000Z',
              data: {
                created_at: '2024-01-01T00:00:00.000000Z',
                hidden: false,
                meaning_note: null,
                meaning_synonyms: ['existing synonym'],
                reading_note: null,
                subject_id: 42,
                subject_type: 'vocabulary',
              },
            },
          ],
        }),
      });

      // Mock: update study material
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          id: 100,
          object: 'study_material',
          data: {
            subject_id: 42,
            meaning_synonyms: ['existing synonym', 'new synonym'],
          },
        }),
      });

      const result = await syncPendingSynonyms(client);

      expect(result.success).toBe(true);
      expect(result.syncedCount).toBe(1);

      // Verify API call was PUT to update
      expect(mockFetch).toHaveBeenCalledTimes(2);
      const [url, options] = mockFetch.mock.calls[1];
      expect(url).toBe('https://api.wanikani.com/v2/study_materials/100');
      expect(options.method).toBe('PUT');
      const body = JSON.parse(options.body);
      expect(body.study_material.meaning_synonyms).toContain('existing synonym');
      expect(body.study_material.meaning_synonyms).toContain('new synonym');
    });

    it('should sync multiple synonyms for same subject in one batch', async () => {
      const client = new WaniKaniClient('test-api-key', { maxRetries: 0 });

      // Add multiple synonyms for the same subject
      await addUserSynonym({ subject_id: 42, synonym: 'synonym1' });
      await addUserSynonym({ subject_id: 42, synonym: 'synonym2' });
      await insertPendingSynonym({ subject_id: 42, synonym: 'synonym1' });
      await insertPendingSynonym({ subject_id: 42, synonym: 'synonym2' });

      // Mock: no existing study material
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          object: 'collection',
          data: [],
          total_count: 0,
          pages: { per_page: 500, next_url: null, previous_url: null },
        }),
      });

      // Mock: create study material
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          id: 1,
          object: 'study_material',
          data: {
            subject_id: 42,
            meaning_synonyms: ['synonym1', 'synonym2'],
          },
        }),
      });

      const result = await syncPendingSynonyms(client);

      expect(result.success).toBe(true);
      expect(result.syncedCount).toBe(2);
      expect(result.failedCount).toBe(0);

      // Verify only 2 API calls were made (GET + POST), not one per synonym
      expect(mockFetch).toHaveBeenCalledTimes(2);

      // Verify both synonyms were included in the create call
      const [, options] = mockFetch.mock.calls[1];
      const body = JSON.parse(options.body);
      expect(body.study_material.meaning_synonyms).toContain('synonym1');
      expect(body.study_material.meaning_synonyms).toContain('synonym2');
    });

    it('should mark user synonyms as synced after successful sync', async () => {
      const client = new WaniKaniClient('test-api-key', { maxRetries: 0 });

      // Add user synonym and pending synonym
      await addUserSynonym({ subject_id: 42, synonym: 'my synonym' });
      await insertPendingSynonym({ subject_id: 42, synonym: 'my synonym' });

      // Verify synced_at is null initially
      const beforeSync = await getUserSynonymsBySubjectId(42);
      expect(beforeSync[0].synced_at).toBeNull();

      // Mock API calls
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          object: 'collection',
          data: [],
          total_count: 0,
          pages: { per_page: 500, next_url: null, previous_url: null },
        }),
      });
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          id: 1,
          object: 'study_material',
          data: { subject_id: 42, meaning_synonyms: ['my synonym'] },
        }),
      });

      await syncPendingSynonyms(client);

      // Verify synced_at is now set
      const afterSync = await getUserSynonymsBySubjectId(42);
      expect(afterSync[0].synced_at).not.toBeNull();
    });

    it('should continue on individual subject failure', async () => {
      const client = new WaniKaniClient('test-api-key', { maxRetries: 0 });

      // Add synonyms for two different subjects
      await addUserSynonym({ subject_id: 42, synonym: 'synonym42' });
      await addUserSynonym({ subject_id: 43, synonym: 'synonym43' });
      await insertPendingSynonym({ subject_id: 42, synonym: 'synonym42' });
      await insertPendingSynonym({ subject_id: 43, synonym: 'synonym43' });

      // First subject: GET fails
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
      });

      // Second subject: GET succeeds (no existing material)
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          object: 'collection',
          data: [],
          total_count: 0,
          pages: { per_page: 500, next_url: null, previous_url: null },
        }),
      });

      // Second subject: POST succeeds
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          id: 1,
          object: 'study_material',
          data: { subject_id: 43, meaning_synonyms: ['synonym43'] },
        }),
      });

      const result = await syncPendingSynonyms(client);

      expect(result.success).toBe(false); // Not all succeeded
      expect(result.syncedCount).toBe(1);
      expect(result.failedCount).toBe(1);

      // Failed synonym should still be in pending queue
      const pending = await getPendingSynonyms();
      expect(pending).toHaveLength(1);
      expect(pending[0].subject_id).toBe(42);
    });

    it('should handle API error and return error result', async () => {
      const client = new WaniKaniClient('test-api-key', { maxRetries: 0 });

      // Add a pending synonym
      await addUserSynonym({ subject_id: 42, synonym: 'my synonym' });
      await insertPendingSynonym({ subject_id: 42, synonym: 'my synonym' });

      // Mock: API error
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
      });

      const result = await syncPendingSynonyms(client);

      expect(result.success).toBe(false);
      expect(result.syncedCount).toBe(0);
      expect(result.failedCount).toBe(1);

      // Synonym should still be in pending queue
      const pendingCount = await getPendingSynonymCount();
      expect(pendingCount).toBe(1);
    });
  });

  describe('clearPendingSynonyms', () => {
    it('should clear all pending synonyms', async () => {
      // Add some pending synonyms
      await insertPendingSynonym({ subject_id: 1, synonym: 'synonym1' });
      await insertPendingSynonym({ subject_id: 2, synonym: 'synonym2' });

      let pendingCount = await getPendingSynonymCount();
      expect(pendingCount).toBe(2);

      await clearPendingSynonyms();

      pendingCount = await getPendingSynonymCount();
      expect(pendingCount).toBe(0);
    });
  });

  describe('syncStudyMaterials', () => {
    // Helper to create a mock study material API response
    function createMockStudyMaterialsCollection(
      materials: Array<{
        id: number;
        subject_id: number;
        meaning_synonyms: string[];
      }>,
      nextUrl: string | null = null,
    ) {
      return {
        object: 'collection',
        url: 'https://api.wanikani.com/v2/study_materials',
        pages: { per_page: 500, next_url: nextUrl, previous_url: null },
        total_count: materials.length,
        data_updated_at: '2024-01-01T00:00:00.000000Z',
        data: materials.map(m => ({
          id: m.id,
          object: 'study_material',
          url: `https://api.wanikani.com/v2/study_materials/${m.id}`,
          data_updated_at: '2024-01-01T00:00:00.000000Z',
          data: {
            created_at: '2024-01-01T00:00:00.000000Z',
            hidden: false,
            meaning_note: null,
            meaning_synonyms: m.meaning_synonyms,
            reading_note: null,
            subject_id: m.subject_id,
            subject_type: 'vocabulary',
          },
        })),
      };
    }

    it('should fetch study materials and insert synonyms', async () => {
      const client = new WaniKaniClient('test-api-key', { maxRetries: 0 });

      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () =>
          createMockStudyMaterialsCollection([
            { id: 1, subject_id: 42, meaning_synonyms: ['hello', 'hi'] },
            { id: 2, subject_id: 43, meaning_synonyms: ['goodbye'] },
          ]),
      });

      const result = await syncStudyMaterials(client);

      expect(result.success).toBe(true);
      expect(result.syncedCount).toBe(2);

      // Verify synonyms were inserted
      const synonyms42 = await getUserSynonymsBySubjectId(42);
      expect(synonyms42).toHaveLength(2);
      expect(synonyms42.map(s => s.synonym)).toContain('hello');
      expect(synonyms42.map(s => s.synonym)).toContain('hi');
      // synced_at should be set (not null) for remote synonyms
      expect(synonyms42[0].synced_at).not.toBeNull();

      const synonyms43 = await getUserSynonymsBySubjectId(43);
      expect(synonyms43).toHaveLength(1);
      expect(synonyms43[0].synonym).toBe('goodbye');
    });

    it('should handle pagination', async () => {
      const client = new WaniKaniClient('test-api-key', { maxRetries: 0 });

      // First page
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () =>
          createMockStudyMaterialsCollection(
            [{ id: 1, subject_id: 42, meaning_synonyms: ['one'] }],
            'https://api.wanikani.com/v2/study_materials?page_after_id=1',
          ),
      });

      // Second page
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () =>
          createMockStudyMaterialsCollection([
            { id: 2, subject_id: 43, meaning_synonyms: ['two'] },
          ]),
      });

      const result = await syncStudyMaterials(client);

      expect(result.success).toBe(true);
      expect(result.syncedCount).toBe(2);
      expect(mockFetch).toHaveBeenCalledTimes(2);
    });

    it('should support incremental sync with updatedAfter', async () => {
      const client = new WaniKaniClient('test-api-key', { maxRetries: 0 });
      const updatedAfter = '2024-06-01T00:00:00.000000Z';

      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => createMockStudyMaterialsCollection([]),
      });

      await syncStudyMaterials(client, { updatedAfter });

      const calledUrl = mockFetch.mock.calls[0][0] as string;
      expect(calledUrl).toContain('updated_after=');
    });

    it('should update sync status after successful sync', async () => {
      const client = new WaniKaniClient('test-api-key', { maxRetries: 0 });

      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => createMockStudyMaterialsCollection([]),
      });

      const beforeSync = await getSyncStatus();
      expect(beforeSync?.last_study_materials_sync).toBeNull();

      await syncStudyMaterials(client);

      const afterSync = await getSyncStatus();
      expect(afterSync?.last_study_materials_sync).not.toBeNull();
    });

    it('should overwrite existing synced synonym with WaniKani version', async () => {
      const client = new WaniKaniClient('test-api-key', { maxRetries: 0 });

      // Add an existing synonym that was previously synced
      await addUserSynonym({
        subject_id: 42,
        synonym: 'Hello',
        synced_at: '2024-01-01T00:00:00.000000Z',
      });

      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () =>
          createMockStudyMaterialsCollection([
            { id: 1, subject_id: 42, meaning_synonyms: ['hello'] }, // lowercase from WaniKani
          ]),
      });

      await syncStudyMaterials(client);

      const synonyms = await getUserSynonymsBySubjectId(42);
      // Should have one synonym (the WaniKani version replaced the local one)
      expect(synonyms).toHaveLength(1);
      expect(synonyms[0].synonym).toBe('hello'); // WaniKani's casing
    });

    it('should preserve local-only synonyms (synced_at is null)', async () => {
      const client = new WaniKaniClient('test-api-key', { maxRetries: 0 });

      // Add a local-only synonym (synced_at is null)
      await addUserSynonym({
        subject_id: 42,
        synonym: 'my local synonym',
      });

      // WaniKani returns a different synonym for the same subject
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () =>
          createMockStudyMaterialsCollection([
            { id: 1, subject_id: 42, meaning_synonyms: ['remote synonym'] },
          ]),
      });

      await syncStudyMaterials(client);

      const synonyms = await getUserSynonymsBySubjectId(42);
      // Should have both synonyms
      expect(synonyms).toHaveLength(2);
      expect(synonyms.map(s => s.synonym)).toContain('my local synonym');
      expect(synonyms.map(s => s.synonym)).toContain('remote synonym');
    });

    it('should handle empty study materials gracefully', async () => {
      const client = new WaniKaniClient('test-api-key', { maxRetries: 0 });

      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => createMockStudyMaterialsCollection([]),
      });

      const result = await syncStudyMaterials(client);

      expect(result.success).toBe(true);
      expect(result.syncedCount).toBe(0);
    });

    it('should handle study materials with empty meaning_synonyms', async () => {
      const client = new WaniKaniClient('test-api-key', { maxRetries: 0 });

      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () =>
          createMockStudyMaterialsCollection([
            { id: 1, subject_id: 42, meaning_synonyms: [] },
          ]),
      });

      const result = await syncStudyMaterials(client);

      expect(result.success).toBe(true);
      expect(result.syncedCount).toBe(1);

      // No synonyms should be inserted
      const synonyms = await getUserSynonymsBySubjectId(42);
      expect(synonyms).toHaveLength(0);
    });

    it('should return error result on API failure', async () => {
      const client = new WaniKaniClient('test-api-key', { maxRetries: 0 });

      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 401,
      });

      const result = await syncStudyMaterials(client);

      expect(result.success).toBe(false);
      expect(result.syncedCount).toBe(0);
      expect(result.error).toBe('Invalid API key');
    });

    it('should return error result on network failure', async () => {
      const client = new WaniKaniClient('test-api-key', { maxRetries: 0 });

      mockFetch.mockRejectedValueOnce(new Error('Network unavailable'));

      const result = await syncStudyMaterials(client);

      expect(result.success).toBe(false);
      expect(result.syncedCount).toBe(0);
      expect(result.error).toBe('Network unavailable');
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
          url: 'https://api.wanikani.com/v2/study_materials',
          pages: {
            per_page: 2,
            next_url:
              'https://api.wanikani.com/v2/study_materials?page_after_id=2',
            previous_url: null,
          },
          total_count: 3,
          data_updated_at: '2024-01-01T00:00:00.000000Z',
          data: [
            {
              id: 1,
              object: 'study_material',
              data: { subject_id: 42, meaning_synonyms: ['one'] },
            },
            {
              id: 2,
              object: 'study_material',
              data: { subject_id: 43, meaning_synonyms: ['two'] },
            },
          ],
        }),
      });

      // Second page
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          object: 'collection',
          url: 'https://api.wanikani.com/v2/study_materials?page_after_id=2',
          pages: { per_page: 1, next_url: null, previous_url: null },
          total_count: 3,
          data_updated_at: '2024-01-01T00:00:00.000000Z',
          data: [
            {
              id: 3,
              object: 'study_material',
              data: { subject_id: 44, meaning_synonyms: ['three'] },
            },
          ],
        }),
      });

      await syncStudyMaterials(client, { onProgress });

      expect(onProgress).toHaveBeenCalledTimes(2);
      expect(onProgress).toHaveBeenNthCalledWith(1, 2, 3);
      expect(onProgress).toHaveBeenNthCalledWith(2, 3, 3);
    });

    it('should handle case-insensitive synonym matching', async () => {
      const client = new WaniKaniClient('test-api-key', { maxRetries: 0 });

      // Add an existing synced synonym with different casing
      await addUserSynonym({
        subject_id: 42,
        synonym: 'HELLO',
        synced_at: '2024-01-01T00:00:00.000000Z',
      });

      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () =>
          createMockStudyMaterialsCollection([
            { id: 1, subject_id: 42, meaning_synonyms: ['hello'] },
          ]),
      });

      await syncStudyMaterials(client);

      const synonyms = await getUserSynonymsBySubjectId(42);
      // Should have one synonym (matched case-insensitively)
      expect(synonyms).toHaveLength(1);
      expect(synonyms[0].synonym).toBe('hello'); // Updated to WaniKani's casing
    });
  });
});
