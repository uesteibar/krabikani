// API Client
export {
  WaniKaniClient,
  WaniKaniApiError,
  type SubjectCollection,
  type AssignmentCollection,
  type RetryOptions,
} from './wanikaniApi';

// Legacy support
export {
  validateApiKey,
  type WaniKaniUser,
  type WaniKaniUserResponse,
  type ValidationResult,
} from './wanikaniApi';

// Types
export type {
  // Base types
  SubjectType,
  WaniKaniResource,
  WaniKaniCollection,
  // User types
  UserData,
  User,
  // Meaning and reading types
  Meaning,
  AuxiliaryMeaning,
  Reading,
  KanjiReading,
  // Subject types
  RadicalData,
  KanjiData,
  VocabularyData,
  KanaVocabularyData,
  Radical,
  Kanji,
  Vocabulary,
  KanaVocabulary,
  Subject,
  SubjectData,
  // Assignment types
  AssignmentData,
  Assignment,
  // Summary types
  SummaryLesson,
  SummaryReview,
  SummaryData,
  Summary,
  // Review types
  ReviewData,
  Review,
  CreateReviewParams,
  CreateReviewResponse,
  // Error types
  WaniKaniErrorResponse,
  ApiErrorCode,
  ApiErrorDetails,
} from './types';
