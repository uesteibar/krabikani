import {
  syncSubjects,
  getUserLevel,
  convertSubjectToInput,
} from '../../src/sync/syncService';
import { WaniKaniClient, WaniKaniApiError } from '../../src/api/wanikaniApi';
import type { WaniKaniResource, RadicalData, KanjiData, VocabularyData } from '../../src/api/types';
import {
  initializeDatabase,
  getSubjectCount,
  getSubjectById,
  getSyncStatus,
  _resetDatabaseInstance,
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
});
