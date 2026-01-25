/**
 * Type tests for WaniKani API types
 * These tests verify that the TypeScript types correctly model the API responses
 */
import type {
  Subject,
  Radical,
  Kanji,
  Vocabulary,
  KanaVocabulary,
  Assignment,
  User,
  WaniKaniCollection,
  AssignmentData,
  ApiErrorCode,
} from '../../src/api/types';

describe('WaniKani API Types', () => {
  describe('Subject types', () => {
    it('should correctly type a Radical', () => {
      const radical: Radical = {
        id: 1,
        object: 'radical',
        url: 'https://api.wanikani.com/v2/subjects/1',
        data_updated_at: '2024-01-01T00:00:00.000000Z',
        data: {
          auxiliary_meanings: [],
          characters: '一',
          created_at: '2024-01-01T00:00:00.000000Z',
          document_url: 'https://www.wanikani.com/radicals/ground',
          hidden_at: null,
          lesson_position: 0,
          level: 1,
          meaning_mnemonic: 'This is one line.',
          meanings: [{ meaning: 'Ground', primary: true, accepted_answer: true }],
          slug: 'ground',
          spaced_repetition_system_id: 1,
          amalgamation_subject_ids: [440],
        },
      };

      expect(radical.object).toBe('radical');
      expect(radical.data.meanings[0].meaning).toBe('Ground');
    });

    it('should correctly type a Kanji', () => {
      const kanji: Kanji = {
        id: 440,
        object: 'kanji',
        url: 'https://api.wanikani.com/v2/subjects/440',
        data_updated_at: '2024-01-01T00:00:00.000000Z',
        data: {
          auxiliary_meanings: [],
          characters: '一',
          created_at: '2024-01-01T00:00:00.000000Z',
          document_url: 'https://www.wanikani.com/kanji/%E4%B8%80',
          hidden_at: null,
          lesson_position: 0,
          level: 1,
          meaning_mnemonic: 'This is one line.',
          meanings: [{ meaning: 'One', primary: true, accepted_answer: true }],
          slug: 'one',
          spaced_repetition_system_id: 1,
          amalgamation_subject_ids: [2467],
          component_subject_ids: [1],
          meaning_hint: 'A single line means one.',
          reading_hint: 'It sounds like each.',
          reading_mnemonic: 'Imagine a bee saying "each".',
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
              accepted_answer: false,
              type: 'kunyomi',
            },
          ],
          visually_similar_subject_ids: [],
        },
      };

      expect(kanji.object).toBe('kanji');
      expect(kanji.data.readings[0].type).toBe('onyomi');
    });

    it('should correctly type a Vocabulary', () => {
      const vocabulary: Vocabulary = {
        id: 2467,
        object: 'vocabulary',
        url: 'https://api.wanikani.com/v2/subjects/2467',
        data_updated_at: '2024-01-01T00:00:00.000000Z',
        data: {
          auxiliary_meanings: [],
          characters: '一',
          created_at: '2024-01-01T00:00:00.000000Z',
          document_url: 'https://www.wanikani.com/vocabulary/%E4%B8%80',
          hidden_at: null,
          lesson_position: 0,
          level: 1,
          meaning_mnemonic: 'This vocab means one.',
          meanings: [{ meaning: 'One', primary: true, accepted_answer: true }],
          slug: 'one',
          spaced_repetition_system_id: 1,
          component_subject_ids: [440],
          context_sentences: [
            { en: 'There is one apple.', ja: 'りんごが一つあります。' },
          ],
          meaning_hint: null,
          parts_of_speech: ['numeral'],
          pronunciation_audios: [],
          reading_mnemonic: 'This reads as ichi.',
          readings: [
            { reading: 'いち', primary: true, accepted_answer: true },
          ],
        },
      };

      expect(vocabulary.object).toBe('vocabulary');
      expect(vocabulary.data.parts_of_speech).toContain('numeral');
    });

    it('should correctly type a KanaVocabulary', () => {
      const kanaVocab: KanaVocabulary = {
        id: 9000,
        object: 'kana_vocabulary',
        url: 'https://api.wanikani.com/v2/subjects/9000',
        data_updated_at: '2024-01-01T00:00:00.000000Z',
        data: {
          auxiliary_meanings: [],
          characters: 'そう',
          created_at: '2024-01-01T00:00:00.000000Z',
          document_url: 'https://www.wanikani.com/vocabulary/そう',
          hidden_at: null,
          lesson_position: 0,
          level: 1,
          meaning_mnemonic: 'This means "yes" or "that is right".',
          meanings: [{ meaning: 'Yes', primary: true, accepted_answer: true }],
          slug: 'sou',
          spaced_repetition_system_id: 1,
          context_sentences: [],
          meaning_hint: null,
          parts_of_speech: ['interjection'],
          pronunciation_audios: [],
          readings: [{ reading: 'そう', primary: true, accepted_answer: true }],
        },
      };

      expect(kanaVocab.object).toBe('kana_vocabulary');
    });

    it('should allow Subject union type', () => {
      const subjects: Subject[] = [
        {
          id: 1,
          object: 'radical',
          url: '',
          data_updated_at: null,
          data: {
            auxiliary_meanings: [],
            characters: '一',
            created_at: '',
            document_url: '',
            hidden_at: null,
            lesson_position: 0,
            level: 1,
            meaning_mnemonic: '',
            meanings: [],
            slug: '',
            spaced_repetition_system_id: 1,
            amalgamation_subject_ids: [],
          },
        } as Radical,
      ];

      expect(subjects.length).toBe(1);
    });
  });

  describe('Assignment type', () => {
    it('should correctly type an Assignment', () => {
      const assignment: Assignment = {
        id: 1234,
        object: 'assignment',
        url: 'https://api.wanikani.com/v2/assignments/1234',
        data_updated_at: '2024-01-01T00:00:00.000000Z',
        data: {
          available_at: '2024-01-01T12:00:00.000000Z',
          burned_at: null,
          created_at: '2024-01-01T00:00:00.000000Z',
          hidden: false,
          passed_at: null,
          resurrected_at: null,
          srs_stage: 5,
          started_at: '2024-01-01T01:00:00.000000Z',
          subject_id: 440,
          subject_type: 'kanji',
          unlocked_at: '2024-01-01T00:00:00.000000Z',
        },
      };

      expect(assignment.object).toBe('assignment');
      expect(assignment.data.srs_stage).toBe(5);
      expect(assignment.data.subject_type).toBe('kanji');
    });
  });

  describe('User type', () => {
    it('should correctly type a User', () => {
      const user: User = {
        object: 'user',
        url: 'https://api.wanikani.com/v2/user',
        data_updated_at: '2024-01-01T00:00:00.000000Z',
        data: {
          id: '12345',
          username: 'testuser',
          level: 10,
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
      };

      expect(user.object).toBe('user');
      expect(user.data.subscription.type).toBe('lifetime');
    });
  });

  describe('Collection type', () => {
    it('should correctly type a WaniKaniCollection', () => {
      const collection: WaniKaniCollection<AssignmentData> = {
        object: 'collection',
        url: 'https://api.wanikani.com/v2/assignments',
        pages: {
          per_page: 500,
          next_url: 'https://api.wanikani.com/v2/assignments?page_after_id=500',
          previous_url: null,
        },
        total_count: 1000,
        data_updated_at: '2024-01-01T00:00:00.000000Z',
        data: [
          {
            id: 1,
            object: 'assignment',
            url: '',
            data_updated_at: null,
            data: {
              available_at: null,
              burned_at: null,
              created_at: '',
              hidden: false,
              passed_at: null,
              resurrected_at: null,
              srs_stage: 0,
              started_at: null,
              subject_id: 1,
              subject_type: 'radical',
              unlocked_at: null,
            },
          },
        ],
      };

      expect(collection.object).toBe('collection');
      expect(collection.pages.per_page).toBe(500);
    });
  });

  describe('Error types', () => {
    it('should have valid ApiErrorCode values', () => {
      const codes: ApiErrorCode[] = [
        'UNAUTHORIZED',
        'FORBIDDEN',
        'NOT_FOUND',
        'UNPROCESSABLE_ENTITY',
        'TOO_MANY_REQUESTS',
        'INTERNAL_SERVER_ERROR',
        'SERVICE_UNAVAILABLE',
        'NETWORK_ERROR',
        'UNKNOWN_ERROR',
      ];

      expect(codes.length).toBe(9);
    });
  });
});
