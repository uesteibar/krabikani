// WaniKani API v2 Types
// Based on https://docs.api.wanikani.com/20170710/

// ============================================
// Base Types
// ============================================

export type SubjectType = 'radical' | 'kanji' | 'vocabulary' | 'kana_vocabulary';

export interface WaniKaniResource<T> {
  id: number;
  object: string;
  url: string;
  data_updated_at: string | null;
  data: T;
}

export interface WaniKaniCollection<T> {
  object: 'collection';
  url: string;
  pages: {
    per_page: number;
    next_url: string | null;
    previous_url: string | null;
  };
  total_count: number;
  data_updated_at: string | null;
  data: WaniKaniResource<T>[];
}

// ============================================
// User Types
// ============================================

export interface UserData {
  id: string;
  username: string;
  level: number;
  profile_url: string;
  started_at: string;
  current_vacation_started_at: string | null;
  subscription: {
    active: boolean;
    type: 'free' | 'recurring' | 'lifetime';
    max_level_granted: number;
    period_ends_at: string | null;
  };
  preferences: {
    default_voice_actor_id: number;
    extra_study_autoplay_audio: boolean;
    lessons_autoplay_audio: boolean;
    lessons_batch_size: number;
    lessons_presentation_order: string;
    reviews_autoplay_audio: boolean;
    reviews_display_srs_indicator: boolean;
    reviews_presentation_order: string;
  };
}

// User response has a different structure than other resources
export interface User {
  object: 'user';
  url: string;
  data_updated_at: string;
  data: UserData;
}

// ============================================
// Meaning and Reading Types
// ============================================

export interface Meaning {
  meaning: string;
  primary: boolean;
  accepted_answer: boolean;
}

export interface AuxiliaryMeaning {
  meaning: string;
  type: 'whitelist' | 'blacklist';
}

export interface Reading {
  reading: string;
  primary: boolean;
  accepted_answer: boolean;
}

export interface KanjiReading {
  reading: string;
  primary: boolean;
  accepted_answer: boolean;
  type: 'onyomi' | 'kunyomi' | 'nanori';
}

// ============================================
// Subject Types
// ============================================

interface BaseSubjectData {
  auxiliary_meanings: AuxiliaryMeaning[];
  characters: string | null;
  created_at: string;
  document_url: string;
  hidden_at: string | null;
  lesson_position: number;
  level: number;
  meaning_mnemonic: string;
  meanings: Meaning[];
  slug: string;
  spaced_repetition_system_id: number;
}

export interface RadicalData extends BaseSubjectData {
  amalgamation_subject_ids: number[];
  character_images?: Array<{
    url: string;
    content_type: string;
    metadata: {
      inline_styles?: boolean;
      color?: string;
      dimensions?: string;
      style_name?: string;
    };
  }>;
}

export interface KanjiData extends BaseSubjectData {
  amalgamation_subject_ids: number[];
  component_subject_ids: number[];
  meaning_hint: string | null;
  reading_hint: string | null;
  reading_mnemonic: string;
  readings: KanjiReading[];
  visually_similar_subject_ids: number[];
}

export interface VocabularyData extends BaseSubjectData {
  component_subject_ids: number[];
  context_sentences: Array<{
    en: string;
    ja: string;
  }>;
  meaning_hint: string | null;
  parts_of_speech: string[];
  pronunciation_audios: Array<{
    url: string;
    content_type: string;
    metadata: {
      gender: string;
      source_id: number;
      pronunciation: string;
      voice_actor_id: number;
      voice_actor_name: string;
      voice_description: string;
    };
  }>;
  reading_mnemonic: string;
  readings: Reading[];
}

export interface KanaVocabularyData extends BaseSubjectData {
  context_sentences: Array<{
    en: string;
    ja: string;
  }>;
  meaning_hint: string | null;
  parts_of_speech: string[];
  pronunciation_audios: Array<{
    url: string;
    content_type: string;
    metadata: {
      gender: string;
      source_id: number;
      pronunciation: string;
      voice_actor_id: number;
      voice_actor_name: string;
      voice_description: string;
    };
  }>;
  readings: Reading[];
}

export type Radical = WaniKaniResource<RadicalData> & { object: 'radical' };
export type Kanji = WaniKaniResource<KanjiData> & { object: 'kanji' };
export type Vocabulary = WaniKaniResource<VocabularyData> & {
  object: 'vocabulary';
};
export type KanaVocabulary = WaniKaniResource<KanaVocabularyData> & {
  object: 'kana_vocabulary';
};

export type Subject = Radical | Kanji | Vocabulary | KanaVocabulary;
export type SubjectData =
  | RadicalData
  | KanjiData
  | VocabularyData
  | KanaVocabularyData;

// ============================================
// Assignment Types
// ============================================

export interface AssignmentData {
  available_at: string | null;
  burned_at: string | null;
  created_at: string;
  hidden: boolean;
  passed_at: string | null;
  resurrected_at: string | null;
  srs_stage: number;
  started_at: string | null;
  subject_id: number;
  subject_type: SubjectType;
  unlocked_at: string | null;
}

export type Assignment = WaniKaniResource<AssignmentData> & {
  object: 'assignment';
};

// ============================================
// Summary Types
// ============================================

export interface SummaryLesson {
  available_at: string;
  subject_ids: number[];
}

export interface SummaryReview {
  available_at: string;
  subject_ids: number[];
}

export interface SummaryData {
  lessons: SummaryLesson[];
  next_reviews_at: string | null;
  reviews: SummaryReview[];
}

export interface Summary {
  object: 'report';
  url: string;
  data_updated_at: string;
  data: SummaryData;
}

// ============================================
// Review Types
// ============================================

export interface ReviewData {
  assignment_id: number;
  created_at: string;
  ending_srs_stage: number;
  incorrect_meaning_answers: number;
  incorrect_reading_answers: number;
  spaced_repetition_system_id: number;
  starting_srs_stage: number;
  subject_id: number;
}

export type Review = WaniKaniResource<ReviewData> & {
  object: 'review';
};

export interface CreateReviewParams {
  assignment_id?: number;
  subject_id?: number;
  incorrect_meaning_answers: number;
  incorrect_reading_answers: number;
  created_at?: string;
}

export interface CreateReviewResponse {
  id: number;
  object: 'review';
  url: string;
  data_updated_at: string;
  data: ReviewData;
  resources_updated: {
    assignment: Assignment;
    review_statistic: WaniKaniResource<unknown>;
  };
}

// ============================================
// Error Types
// ============================================

export interface WaniKaniErrorResponse {
  error: string;
  code: number;
}

export type ApiErrorCode =
  | 'UNAUTHORIZED'
  | 'FORBIDDEN'
  | 'NOT_FOUND'
  | 'UNPROCESSABLE_ENTITY'
  | 'TOO_MANY_REQUESTS'
  | 'INTERNAL_SERVER_ERROR'
  | 'SERVICE_UNAVAILABLE'
  | 'NETWORK_ERROR'
  | 'UNKNOWN_ERROR';

export interface ApiErrorDetails {
  code: ApiErrorCode;
  statusCode: number;
  message: string;
  retryable: boolean;
}
