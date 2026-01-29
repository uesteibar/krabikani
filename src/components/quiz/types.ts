import type React from 'react';
import type {
  SubjectType,
  Meaning,
  AuxiliaryMeaning,
  Reading,
  KanjiReading,
} from '../../api/types';
import type { SrsBadge } from '../SubjectDisplay';
import type { QuestionTypeLabelType } from '../QuestionTypeLabel';
import type { MaterialDesignIcons } from '@react-native-vector-icons/material-design-icons';

export type QuestionType = 'meaning' | 'reading' | 'reverse';

export type AnswerStatus = 'correct' | 'incorrect' | 'fuzzyMatch';

export interface Question {
  id: string;
  subjectId: number;
  subjectType: SubjectType;
  displayText: string;
  displayMode: 'characters' | 'meaning';
  correctAnswers: string[];
  questionType: QuestionType;
  mnemonic: string;
  mnemonicLabel: string;
  meanings: Meaning[];
  readings: (Reading | KanjiReading)[];
  auxiliaryMeanings: AuxiliaryMeaning[];
  userSynonyms: string[];
}

export interface AnswerResult {
  status: AnswerStatus;
  userAnswer: string;
  correctAnswer: string;
}

/** Callback result for onAnswer — includes the question and answer result */
export interface QuizAnswerEvent {
  question: Question;
  result: AnswerResult;
}

/** Progress mode discriminated union for ProgressHeader */
export type ProgressMode =
  | { mode: 'progress'; current: number; total: number; wrapUpRemaining?: number }
  | { mode: 'zen' }
  | { mode: 'practice'; phrase: string; icon: React.ComponentProps<typeof MaterialDesignIcons>['name'] }
  | { mode: 'none' };

/** Completion mode: how the engine determines the session is done */
export type CompletionMode =
  | 'allQuestions'   // Complete when all original question keys are answered correctly
  | 'never';         // Never complete (infinite mode for practice screens)

/** Auto-refill configuration for infinite modes */
export interface AutoRefillConfig {
  /** Number of remaining questions before triggering refill */
  threshold: number;
  /** Async function that returns new questions to append */
  loadMore: () => Promise<Question[]>;
}

/** Configuration for the QuizEngine component */
export interface QuizEngineConfig {
  /** Initial questions to display */
  questions: Question[];
  /** How to display question type label (maps question to label type) */
  questionLabelType?: (question: Question) => QuestionTypeLabelType;
  /** Progress mode for the header */
  progressMode: ProgressMode;
  /** How completion is detected */
  completionMode: CompletionMode;
  /** Allow "Mark as Correct" button on incorrect feedback */
  allowMarkCorrect: boolean;
  /** Allow "Add as Synonym" link on incorrect meaning feedback */
  allowAddSynonym: boolean;
  /** Re-queue incorrect answers at end of queue */
  requeueIncorrect: boolean;
  /** Show SRS badge on subject display */
  showSrsBadge: boolean;
  /** Show subject type label on subject display */
  showSubjectTypeLabel: boolean;
  /** Auto-refill configuration (for infinite/practice modes) */
  autoRefill?: AutoRefillConfig;
  /** Callback when an answer is submitted */
  onAnswer?: (event: QuizAnswerEvent) => void;
  /** Callback when the session is complete */
  onComplete?: () => void;
  /** Callback when a component is pressed (for navigation) */
  onComponentPress?: (subjectId: number) => void;
  /** Render function for completion screen */
  renderCompletion?: () => React.ReactNode;
  /** Render function for details content in incorrect feedback */
  renderDetailsContent?: (question: Question) => React.ReactNode | undefined;
  /** Get SRS badge for current question */
  getSrsBadge?: (question: Question) => SrsBadge | undefined;
  /** Callback for Mark as Correct action */
  onMarkCorrect?: (question: Question, userAnswer: string) => void;
  /** Callback for Add as Synonym action */
  onAddSynonym?: (question: Question, userAnswer: string) => Promise<void>;
  /** Render additional buttons (e.g., wrap-up button). isShowingFeedback is true during correct feedback. */
  renderExtraButtons?: (isShowingFeedback: boolean) => React.ReactNode;
  /** Delay in ms before auto-advancing after correct answer */
  autoAdvanceDelay?: number;
  /** testID prefix for the component */
  testID?: string;
  /**
   * Filter to skip questions during advance. Return true to skip.
   * Used by ReviewSession for buffer cap and wrap-up mode.
   */
  shouldSkipQuestion?: (question: Question) => boolean;
  /**
   * External completion flag — overrides internal completion detection.
   * When provided, QuizEngine uses this instead of its own tracking.
   */
  isComplete?: boolean;
  /**
   * Custom delay before advancing after incorrect feedback continue.
   * Used by ReviewSession for level-down animation timing.
   * Return the delay in ms, or 0 for immediate advance.
   */
  onContinueDelay?: () => number;
  /**
   * Render function for empty state (no questions).
   * Used by ReviewSession for custom empty message.
   */
  renderEmpty?: () => React.ReactNode;
  /**
   * Custom testID suffix for the subject display container.
   * Defaults to 'subject-display'. Set to match existing testIDs during migration.
   */
  subjectDisplayTestIDSuffix?: string;
  /**
   * Callback when the current question changes.
   * Used by ReviewSession for tracking introduced items.
   */
  onQuestionChange?: (question: Question) => void;
}
