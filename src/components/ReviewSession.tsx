import React, {
  useState,
  useCallback,
  useMemo,
  useEffect,
  useRef,
} from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
} from 'react-native';

import type {
  SubjectType,
  Meaning,
  Reading,
  KanjiReading,
  AuxiliaryMeaning,
} from '../api/types';
import {
  addUserSynonym,
  insertPendingSynonym,
  getSetting,
} from '../storage/database';
import {
  COLORS,
  BORDER_RADIUS,
  SPACING,
  FONT_SIZES,
  MIN_TOUCH_TARGET,
} from '../theme';
import { ReviewCompletion, type ReviewResultItem } from './ReviewCompletion';
import { ExpandableDetails } from './ExpandableDetails';
import { ItemDetails } from './ItemDetails';
import { getSrsLevelInfo, calculateSrsStageAfterIncorrect } from '../theme';
import type { SrsBadge } from './SubjectDisplay';
import { QuizEngine } from './quiz/QuizEngine';
import type {
  Question,
  QuizEngineConfig,
  QuizAnswerEvent,
  ProgressMode,
} from './quiz/types';

// ============================================
// Types
// ============================================

/** Component radical data for kanji review items */
export interface ReviewComponentRadical {
  /** Subject ID */
  id: number;
  /** Radical characters (null for image-only radicals) */
  characters: string | null;
  /** Primary meaning of the radical */
  meaning: string;
  /** JSON string of character images (for radicals without Unicode characters) */
  characterImages?: string | null;
}

/** Component kanji data for vocabulary review items */
export interface ReviewComponentKanji {
  /** Subject ID */
  id: number;
  /** Kanji character */
  characters: string;
  /** Primary meaning of the kanji */
  meaning: string;
  /** Primary reading of the kanji */
  reading: string;
}

/** Data for a review item */
export interface ReviewItem {
  /** Unique identifier for the item */
  id: number;
  /** The assignment ID for this item */
  assignmentId: number;
  /** The subject type (radical, kanji, vocabulary, kana_vocabulary) */
  subjectType: SubjectType;
  /** The SRS stage for this item (1-9) */
  srsStage: number;
  /** The characters to display (e.g., "大", "たべる") - null for some radicals */
  characters: string | null;
  /** Array of meanings for the subject */
  meanings: Meaning[];
  /** Array of readings (null for radicals) */
  readings: Reading[] | KanjiReading[] | null;
  /** Mnemonic for remembering the meaning */
  meaningMnemonic: string;
  /** Mnemonic for remembering the reading (null for radicals) */
  readingMnemonic: string | null;
  /** Auxiliary meanings for validation (optional) */
  auxiliaryMeanings?: AuxiliaryMeaning[];
  /** Component radicals for kanji items (optional) */
  componentRadicals?: ReviewComponentRadical[];
  /** Component kanji for vocabulary items (optional) */
  componentKanji?: ReviewComponentKanji[];
  /** User-defined synonyms for meaning validation */
  userSynonyms?: string[];
}

/** Type of question being asked */
type ReviewQuestionType = 'meaning' | 'reading';

/** A single review question */
interface ReviewQuestion {
  /** The item being reviewed */
  item: ReviewItem;
  /** The type of question (meaning or reading) */
  type: ReviewQuestionType;
  /** Unique key for React rendering */
  key: string;
}

/** Result of answering a question */
interface ReviewAnswerResult {
  question: ReviewQuestion;
  userAnswer: string;
  isCorrect: boolean;
  correctAnswer: string;
}


/** Tracks completion status and incorrect counts for each item */
export interface ItemProgress {
  /** Whether the meaning question has been answered correctly */
  meaningCorrect: boolean;
  /** Whether the reading question has been answered correctly (true for radicals) */
  readingCorrect: boolean;
  /** Number of incorrect meaning answers */
  incorrectMeaningAnswers: number;
  /** Number of incorrect reading answers */
  incorrectReadingAnswers: number;
}

export interface ReviewSessionProps {
  /** The items to review */
  items: ReviewItem[];
  /** Callback when a question is answered (for external tracking) */
  onAnswer?: (result: ReviewAnswerResult) => void;
  /** Callback when the session is complete (all items reviewed) */
  onSessionComplete?: (itemProgress: Map<number, ItemProgress>) => void;
  /** Delay in ms before auto-advancing after correct answer (default: 500ms for appreciable feedback) */
  autoAdvanceDelay?: number;
  /** Callback when wrap-up mode is toggled */
  onWrapUpToggle?: (isWrappingUp: boolean) => void;
  /** Callback when user wants to return to dashboard from completion screen */
  onReturnToDashboard?: () => void;
  /** Whether the reviews were synced online or queued offline (for completion screen) */
  syncedOnline?: boolean;
  /** Callback when a component is pressed (for navigation to item detail) */
  onComponentPress?: (subjectId: number) => void;
  /** Callback when item progress changes (for exit handling) */
  onProgressChange?: (itemProgress: Map<number, ItemProgress>) => void;
}

/**
 * Fisher-Yates shuffle algorithm for randomizing array order.
 */
export function shuffleArray<T>(array: T[]): T[] {
  const result = [...array];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

/**
 * Generates review questions for a set of items.
 * Each item gets a meaning question (and reading question if not a radical).
 * The order of items is randomized, and for each item, whether meaning
 * or reading comes first is also randomized.
 */
export function generateReviewQuestions(items: ReviewItem[]): ReviewQuestion[] {
  const shuffledItems = shuffleArray(items);
  const questions: ReviewQuestion[] = [];

  for (const item of shuffledItems) {
    const meaningFirst = Math.random() < 0.5;

    if (item.subjectType === 'radical') {
      questions.push({
        item,
        type: 'meaning',
        key: `${item.id}-meaning`,
      });
    } else if (meaningFirst) {
      questions.push({
        item,
        type: 'meaning',
        key: `${item.id}-meaning`,
      });
      questions.push({
        item,
        type: 'reading',
        key: `${item.id}-reading`,
      });
    } else {
      questions.push({
        item,
        type: 'reading',
        key: `${item.id}-reading`,
      });
      questions.push({
        item,
        type: 'meaning',
        key: `${item.id}-meaning`,
      });
    }
  }

  return shuffleArray(questions);
}

/** Maximum number of incomplete (initiated but not finished) items allowed at once */
export const MAX_INCOMPLETE_ITEMS = 10;

/**
 * Convert a ReviewQuestion to a unified Question for QuizEngine.
 */
function reviewQuestionToQuestion(rq: ReviewQuestion): Question {
  const { item, type, key } = rq;
  const mnemonic =
    type === 'meaning'
      ? item.meaningMnemonic
      : item.readingMnemonic ?? item.meaningMnemonic;
  const mnemonicLabel =
    type === 'meaning' ? 'Meaning Mnemonic:' : 'Reading Mnemonic:';

  return {
    id: key,
    subjectId: item.id,
    subjectType: item.subjectType,
    displayText: item.characters ?? '?',
    displayMode: 'characters',
    correctAnswers: [],
    questionType: type,
    mnemonic,
    mnemonicLabel,
    meanings: item.meanings,
    readings: item.readings ?? [],
    auxiliaryMeanings: item.auxiliaryMeanings ?? [],
    userSynonyms: item.userSynonyms ?? [],
  };
}

/**
 * Build a lookup map from question ID back to ReviewQuestion.
 */
function buildQuestionMap(
  reviewQuestions: ReviewQuestion[],
): Map<string, ReviewQuestion> {
  const map = new Map<string, ReviewQuestion>();
  for (const rq of reviewQuestions) {
    map.set(rq.key, rq);
  }
  return map;
}

// ============================================
// Component
// ============================================

export function ReviewSession({
  items,
  onAnswer,
  onSessionComplete,
  autoAdvanceDelay = 500,
  onWrapUpToggle,
  onReturnToDashboard,
  syncedOnline = false,
  onComponentPress,
  onProgressChange,
}: ReviewSessionProps) {
  // Generate initial review questions
  const initialReviewQuestions = useMemo(
    () => generateReviewQuestions(items),
    [items],
  );

  // Convert to unified Questions for QuizEngine
  const initialQuestions = useMemo(
    () => initialReviewQuestions.map(reviewQuestionToQuestion),
    [initialReviewQuestions],
  );

  // Build lookup map from question ID to ReviewQuestion
  const questionMapRef = useRef(buildQuestionMap(initialReviewQuestions));
  useEffect(() => {
    questionMapRef.current = buildQuestionMap(initialReviewQuestions);
  }, [initialReviewQuestions]);

  // Initialize item progress tracking
  const [_itemProgress, setItemProgress] = useState<Map<number, ItemProgress>>(() => {
    const progress = new Map<number, ItemProgress>();
    for (const item of items) {
      progress.set(item.id, {
        meaningCorrect: false,
        readingCorrect: item.subjectType === 'radical',
        incorrectMeaningAnswers: 0,
        incorrectReadingAnswers: 0,
      });
    }
    return progress;
  });

  // Level-up animation state
  const [levelUpAnimation, setLevelUpAnimation] = useState<{
    fromStage: number;
    toStage: number;
  } | null>(null);

  // Level-down animation state
  const [levelDownAnimation, setLevelDownAnimation] = useState<{
    fromStage: number;
    toStage: number;
  } | null>(null);

  // Pending level-down: stored on incorrect answer, triggered on Continue
  const [pendingLevelDown, setPendingLevelDown] = useState<{
    fromStage: number;
    toStage: number;
  } | null>(null);

  // Wrap-up mode state
  const [isWrappingUp, setIsWrappingUp] = useState(false);
  // Track which items have been introduced (at least one question shown)
  const [introducedItemIds, setIntroducedItemIds] = useState<Set<number>>(
    new Set(),
  );
  // Zen mode state
  const [zenModeEnabled, setZenModeEnabled] = useState(false);

  // Track items that have already had their level-down animation shown
  // Map: item ID → downgraded SRS stage
  const levelDownShownRef = useRef<Map<number, number>>(new Map());

  // Track completed items
  const [completedItemCount, setCompletedItemCount] = useState(0);
  const totalItemCount = items.length;

  // Track the current question for SRS badge and introduced tracking
  const [currentQuestionId, setCurrentQuestionId] = useState<string | null>(null);

  // Whether onSessionComplete has been called for the current session
  const sessionCompleteCalledRef = useRef(false);

  // Track whether we are showing incorrect feedback (for SRS badge)
  const [showingIncorrectFeedback, setShowingIncorrectFeedback] = useState(false);
  const [feedbackQuestionId, setFeedbackQuestionId] = useState<string | null>(null);

  // Fetch zen mode setting on mount
  useEffect(() => {
    const loadZenModeSetting = async () => {
      const zenModeSetting = await getSetting('zenMode');
      setZenModeEnabled(zenModeSetting === true);
    };
    loadZenModeSetting();
  }, []);

  // Reset state when items change
  useEffect(() => {
    const newProgress = new Map<number, ItemProgress>();
    for (const item of items) {
      newProgress.set(item.id, {
        meaningCorrect: false,
        readingCorrect: item.subjectType === 'radical',
        incorrectMeaningAnswers: 0,
        incorrectReadingAnswers: 0,
      });
    }
    setItemProgress(newProgress);
    setCompletedItemCount(0);
    setLevelUpAnimation(null);
    setLevelDownAnimation(null);
    setPendingLevelDown(null);
    setIsWrappingUp(false);
    setIntroducedItemIds(new Set());
    setCurrentQuestionId(null);
    setShowingIncorrectFeedback(false);
    setFeedbackQuestionId(null);
    sessionCompleteCalledRef.current = false;
    levelDownShownRef.current = new Map();
  }, [items]);

  // Notify parent of progress changes
  useEffect(() => {
    onProgressChange?.(_itemProgress);
  }, [_itemProgress, onProgressChange]);

  // Session completion detection
  const isComplete = useMemo(() => {
    if (isWrappingUp) {
      if (introducedItemIds.size === 0) return false;
      for (const itemId of introducedItemIds) {
        const progress = _itemProgress.get(itemId);
        if (
          !progress ||
          !(progress.meaningCorrect && progress.readingCorrect)
        ) {
          return false;
        }
      }
      return true;
    }
    return completedItemCount >= totalItemCount;
  }, [
    isWrappingUp,
    introducedItemIds,
    _itemProgress,
    completedItemCount,
    totalItemCount,
  ]);

  // Count of introduced items that are not yet complete
  const incompleteItemCount = useMemo(() => {
    let count = 0;
    for (const itemId of introducedItemIds) {
      const progress = _itemProgress.get(itemId);
      if (progress && !(progress.meaningCorrect && progress.readingCorrect)) {
        count++;
      }
    }
    return count;
  }, [introducedItemIds, _itemProgress]);

  const wrapUpRemainingCount = isWrappingUp ? incompleteItemCount : 0;

  // Handle wrap-up button press
  const handleWrapUpToggle = useCallback(() => {
    setIsWrappingUp(prev => {
      const newValue = !prev;
      onWrapUpToggle?.(newValue);
      return newValue;
    });
  }, [onWrapUpToggle]);

  // Track introduced items when question is shown
  const handleQuestionChange = useCallback(
    (question: Question) => {
      const itemId = question.subjectId;
      if (!introducedItemIds.has(itemId)) {
        setIntroducedItemIds(prev => new Set(prev).add(itemId));
      }
    },
    [introducedItemIds],
  );

  // Handle answer from QuizEngine
  const handleAnswer = useCallback(
    (event: QuizAnswerEvent) => {
      const { question, result } = event;
      const rq = questionMapRef.current.get(question.id);
      if (!rq) return;

      const { item, type } = rq;
      const isCorrect = result.status === 'correct' || result.status === 'fuzzyMatch';

      // Track current question for SRS badge
      setCurrentQuestionId(question.id);

      // Notify parent
      onAnswer?.({
        question: rq,
        userAnswer: result.userAnswer,
        isCorrect,
        correctAnswer: result.correctAnswer,
      });

      // Compute item completion state before update
      const currentProgress = _itemProgress.get(item.id)!;
      const willMeaningBeCorrect =
        type === 'meaning' && isCorrect ? true : currentProgress.meaningCorrect;
      const willReadingBeCorrect =
        type === 'reading' && isCorrect ? true : currentProgress.readingCorrect;
      const itemWillBeComplete = willMeaningBeCorrect && willReadingBeCorrect;
      const itemWasComplete =
        currentProgress.meaningCorrect && currentProgress.readingCorrect;
      const itemJustCompleted = itemWillBeComplete && !itemWasComplete;
      const newCompletedCount = itemJustCompleted
        ? completedItemCount + 1
        : completedItemCount;

      // Check session completion
      let sessionWillComplete: boolean;
      if (isWrappingUp) {
        sessionWillComplete =
          itemJustCompleted &&
          (() => {
            for (const itemId of introducedItemIds) {
              if (itemId === item.id) continue;
              const progress = _itemProgress.get(itemId);
              if (
                !progress ||
                !(progress.meaningCorrect && progress.readingCorrect)
              ) {
                return false;
              }
            }
            return true;
          })();
      } else {
        sessionWillComplete = newCompletedCount >= totalItemCount;
      }

      // Build new progress for callback
      let newProgressForCallback: Map<number, ItemProgress> | null = null;
      if (sessionWillComplete && isCorrect) {
        if (isWrappingUp) {
          newProgressForCallback = new Map<number, ItemProgress>();
          for (const itemId of introducedItemIds) {
            const progress = _itemProgress.get(itemId)!;
            if (itemId === item.id) {
              const updatedProgress = { ...progress };
              if (type === 'meaning') {
                updatedProgress.meaningCorrect = true;
              } else {
                updatedProgress.readingCorrect = true;
              }
              newProgressForCallback.set(itemId, updatedProgress);
            } else {
              newProgressForCallback.set(itemId, progress);
            }
          }
        } else {
          newProgressForCallback = new Map(_itemProgress);
          const updatedItemProgress = { ...newProgressForCallback.get(item.id)! };
          if (type === 'meaning') {
            updatedItemProgress.meaningCorrect = true;
          } else {
            updatedItemProgress.readingCorrect = true;
          }
          newProgressForCallback.set(item.id, updatedItemProgress);
        }
      }

      // Update item progress
      setItemProgress(prev => {
        const newProgress = new Map(prev);
        const currentItemProgress = { ...newProgress.get(item.id)! };

        if (isCorrect) {
          if (type === 'meaning') {
            currentItemProgress.meaningCorrect = true;
          } else {
            currentItemProgress.readingCorrect = true;
          }
        } else {
          if (type === 'meaning') {
            currentItemProgress.incorrectMeaningAnswers++;
          } else {
            currentItemProgress.incorrectReadingAnswers++;
          }
        }

        newProgress.set(item.id, currentItemProgress);
        return newProgress;
      });

      if (isCorrect) {
        // Check SRS level-up
        const currentStage = item.srsStage;
        const newStage = Math.min(currentStage + 1, 9);
        const currentLevel = getSrsLevelInfo(currentStage);
        const newLevel = getSrsLevelInfo(newStage);
        const isLevelUp =
          currentLevel && newLevel && currentLevel.key !== newLevel.key;

        if (isLevelUp && itemJustCompleted) {
          setLevelUpAnimation({
            fromStage: currentStage,
            toStage: newStage,
          });
        }

        // Schedule post-feedback updates
        setTimeout(() => {
          setLevelUpAnimation(null);

          if (itemJustCompleted) {
            setCompletedItemCount(newCompletedCount);
          }

          if (newProgressForCallback) {
            onSessionComplete?.(newProgressForCallback);
            sessionCompleteCalledRef.current = true;
          }
        }, autoAdvanceDelay);
      } else {
        // Incorrect — set up feedback tracking and SRS level-down
        setShowingIncorrectFeedback(true);
        setFeedbackQuestionId(question.id);

        const currentStage = item.srsStage;
        const newStage = calculateSrsStageAfterIncorrect(currentStage);
        const currentLevel = getSrsLevelInfo(currentStage);
        const newLevel = getSrsLevelInfo(newStage);
        const isLevelDown =
          currentLevel && newLevel && currentLevel.key !== newLevel.key;

        if (isLevelDown && !levelDownShownRef.current.has(item.id)) {
          // First failure for this item — record it and trigger animation
          levelDownShownRef.current.set(item.id, newStage);
          setPendingLevelDown({
            fromStage: currentStage,
            toStage: newStage,
          });
        }
      }
    },
    [
      _itemProgress,
      onAnswer,
      onSessionComplete,
      completedItemCount,
      totalItemCount,
      isWrappingUp,
      introducedItemIds,
      autoAdvanceDelay,
    ],
  );

  // Handle Mark as Correct from QuizEngine
  const handleMarkCorrect = useCallback(
    (question: Question, userAnswer: string) => {
      const rq = questionMapRef.current.get(question.id);
      if (!rq) return;

      const { item, type } = rq;

      // Clear pending level-down
      setPendingLevelDown(null);
      setShowingIncorrectFeedback(false);
      setFeedbackQuestionId(null);

      // Notify parent
      onAnswer?.({
        question: rq,
        userAnswer,
        isCorrect: true,
        correctAnswer: '',
      });

      // Update item progress
      const currentProgress = _itemProgress.get(item.id)!;
      const wasComplete =
        currentProgress.meaningCorrect && currentProgress.readingCorrect;

      setItemProgress(prev => {
        const newProgress = new Map(prev);
        const itemProgress = { ...newProgress.get(item.id)! };

        if (type === 'meaning') {
          itemProgress.meaningCorrect = true;
          if (itemProgress.incorrectMeaningAnswers > 0) {
            itemProgress.incorrectMeaningAnswers--;
          }
        } else {
          itemProgress.readingCorrect = true;
          if (itemProgress.incorrectReadingAnswers > 0) {
            itemProgress.incorrectReadingAnswers--;
          }
        }

        newProgress.set(item.id, itemProgress);
        return newProgress;
      });

      // Check if item just completed
      const willMeaningBeCorrect =
        type === 'meaning' ? true : currentProgress.meaningCorrect;
      const willReadingBeCorrect =
        type === 'reading' ? true : currentProgress.readingCorrect;
      const willBeComplete = willMeaningBeCorrect && willReadingBeCorrect;
      const itemJustCompleted = willBeComplete && !wasComplete;

      if (itemJustCompleted) {
        const newCompletedCount = completedItemCount + 1;
        setCompletedItemCount(newCompletedCount);

        // Check session completion
        let sessionComplete: boolean;
        if (isWrappingUp) {
          sessionComplete = (() => {
            for (const itemId of introducedItemIds) {
              if (itemId === item.id) continue;
              const progress = _itemProgress.get(itemId);
              if (
                !progress ||
                !(progress.meaningCorrect && progress.readingCorrect)
              ) {
                return false;
              }
            }
            return true;
          })();
        } else {
          sessionComplete = newCompletedCount >= totalItemCount;
        }

        if (sessionComplete) {
          const finalProgress = new Map<number, ItemProgress>();
          const itemsToInclude = isWrappingUp
            ? introducedItemIds
            : new Set(_itemProgress.keys());
          for (const itemId of itemsToInclude) {
            const progress = _itemProgress.get(itemId)!;
            if (itemId === item.id) {
              const updatedProgress = { ...progress };
              if (type === 'meaning') {
                updatedProgress.meaningCorrect = true;
                if (updatedProgress.incorrectMeaningAnswers > 0) {
                  updatedProgress.incorrectMeaningAnswers--;
                }
              } else {
                updatedProgress.readingCorrect = true;
                if (updatedProgress.incorrectReadingAnswers > 0) {
                  updatedProgress.incorrectReadingAnswers--;
                }
              }
              finalProgress.set(itemId, updatedProgress);
            } else {
              finalProgress.set(itemId, progress);
            }
          }
          onSessionComplete?.(finalProgress);
          sessionCompleteCalledRef.current = true;
        }
      }
    },
    [
      _itemProgress,
      onAnswer,
      onSessionComplete,
      completedItemCount,
      totalItemCount,
      isWrappingUp,
      introducedItemIds,
    ],
  );

  // Handle Add as Synonym from QuizEngine
  const handleAddSynonym = useCallback(
    async (question: Question, userAnswer: string) => {
      const rq = questionMapRef.current.get(question.id);
      if (!rq) return;

      const { item } = rq;

      // Save synonym to database
      await addUserSynonym({
        subject_id: item.id,
        synonym: userAnswer,
        synced_at: null,
      });

      // Queue for sync
      await insertPendingSynonym({
        subject_id: item.id,
        synonym: userAnswer,
      });
    },
    [],
  );

  // onContinueDelay — trigger level-down animation
  const handleContinueDelay = useCallback((): number => {
    if (pendingLevelDown) {
      setLevelDownAnimation(pendingLevelDown);
      setPendingLevelDown(null);
      // After this delay, QuizEngine will advance
      // We need to clean up level-down state
      setTimeout(() => {
        setLevelDownAnimation(null);
        setShowingIncorrectFeedback(false);
        setFeedbackQuestionId(null);
      }, 800);
      return 800;
    }
    setShowingIncorrectFeedback(false);
    setFeedbackQuestionId(null);
    return 0;
  }, [pendingLevelDown]);

  // shouldSkipQuestion — buffer cap + wrap-up logic
  const shouldSkipQuestion = useCallback(
    (question: Question): boolean => {
      const itemId = question.subjectId;
      const isIntroduced = introducedItemIds.has(itemId);
      const itemProgress = _itemProgress.get(itemId);
      const isItemDone =
        itemProgress &&
        itemProgress.meaningCorrect &&
        itemProgress.readingCorrect;

      const blockNewItems =
        isWrappingUp || incompleteItemCount >= MAX_INCOMPLETE_ITEMS;

      if (blockNewItems && (!isIntroduced || isItemDone)) {
        return true;
      }

      return false;
    },
    [isWrappingUp, incompleteItemCount, introducedItemIds, _itemProgress],
  );

  // getSrsBadge — compute SRS badge based on current state
  const getSrsBadge = useCallback(
    (question: Question): SrsBadge | undefined => {
      if (zenModeEnabled) return undefined;

      const rq = questionMapRef.current.get(question.id);
      if (!rq) return undefined;

      // During incorrect feedback with level-down animation
      if (showingIncorrectFeedback && feedbackQuestionId === question.id && levelDownAnimation) {
        return {
          type: 'animated',
          stage: levelDownAnimation.toStage,
          fromStage: levelDownAnimation.fromStage,
          animateLevelDown: true,
        };
      }

      // During correct feedback with level-up animation
      if (levelUpAnimation && currentQuestionId === question.id) {
        return {
          type: 'animated',
          stage: levelUpAnimation.toStage,
          fromStage: levelUpAnimation.fromStage,
          animateLevelUp: true,
        };
      }

      // If this item has already had its level-down shown, display the downgraded stage
      const downgradedStage = levelDownShownRef.current.get(rq.item.id);
      if (downgradedStage !== undefined) {
        return { type: 'static', stage: downgradedStage };
      }

      return { type: 'static', stage: rq.item.srsStage };
    },
    [
      zenModeEnabled,
      showingIncorrectFeedback,
      feedbackQuestionId,
      levelDownAnimation,
      levelUpAnimation,
      currentQuestionId,
    ],
  );

  // renderDetailsContent
  const renderDetailsContent = useCallback(
    (question: Question): React.ReactNode | undefined => {
      const rq = questionMapRef.current.get(question.id);
      if (!rq) return undefined;

      const feedbackItem = rq.item;

      return (
        <ExpandableDetails
          resetKey={rq.key}
          testID="review-session-expandable-details"
        >
          <ItemDetails
            subjectType={feedbackItem.subjectType}
            meanings={feedbackItem.meanings}
            readings={feedbackItem.readings}
            meaningMnemonic={feedbackItem.meaningMnemonic}
            readingMnemonic={feedbackItem.readingMnemonic}
            componentRadicals={feedbackItem.componentRadicals}
            componentKanji={feedbackItem.componentKanji}
            onComponentPress={onComponentPress}
            hideMnemonicType={rq.type}
            testID="review-session-item-details"
          />
        </ExpandableDetails>
      );
    },
    [onComponentPress],
  );

  // renderCompletion
  const renderCompletion = useCallback((): React.ReactNode => {
    const itemsToCount = isWrappingUp
      ? introducedItemIds
      : new Set(_itemProgress.keys());
    let totalIncorrect = 0;
    for (const itemId of itemsToCount) {
      const progress = _itemProgress.get(itemId);
      if (progress) {
        totalIncorrect +=
          progress.incorrectMeaningAnswers + progress.incorrectReadingAnswers;
      }
    }

    const itemsReviewedCount = isWrappingUp
      ? introducedItemIds.size
      : completedItemCount;

    const resultItems: ReviewResultItem[] = [];
    for (const item of items) {
      if (isWrappingUp && !introducedItemIds.has(item.id)) continue;

      const progress = _itemProgress.get(item.id);
      if (!progress) continue;

      const totalItemIncorrect =
        progress.incorrectMeaningAnswers + progress.incorrectReadingAnswers;

      const primaryMeaning =
        item.meanings.find(m => m.primary)?.meaning ??
        item.meanings[0]?.meaning ??
        '';

      let primaryReading = '';
      if (item.readings) {
        const primary = item.readings.find(r => r.primary);
        primaryReading = primary?.reading ?? item.readings[0]?.reading ?? '';
      }

      resultItems.push({
        id: item.id,
        characters: item.characters,
        primaryMeaning,
        primaryReading,
        subjectType: item.subjectType,
        isCorrect: totalItemIncorrect === 0,
      });
    }

    const handleReturnToDashboard = () => {
      onReturnToDashboard?.();
    };

    return (
      <ReviewCompletion
        itemsReviewed={itemsReviewedCount}
        incorrectCount={totalIncorrect}
        syncedOnline={syncedOnline}
        onReturnToDashboard={handleReturnToDashboard}
        resultItems={resultItems}
      />
    );
  }, [
    isWrappingUp,
    introducedItemIds,
    _itemProgress,
    completedItemCount,
    items,
    syncedOnline,
    onReturnToDashboard,
  ]);

  // renderEmpty
  const renderEmpty = useCallback((): React.ReactNode => {
    return (
      <View style={styles.container} testID="review-session-empty">
        <Text style={styles.emptyText}>No reviews available</Text>
      </View>
    );
  }, []);

  // renderExtraButtons — wrap-up toggle
  const renderExtraButtons = useCallback((isShowingFeedback: boolean): React.ReactNode => {
    return (
      <TouchableOpacity
        style={[
          styles.wrapUpButton,
          isWrappingUp && styles.wrapUpButtonActive,
        ]}
        onPress={handleWrapUpToggle}
        disabled={isShowingFeedback}
        activeOpacity={0.8}
        testID="review-session-wrap-up"
      >
        <Text
          style={[
            styles.wrapUpButtonText,
            isWrappingUp && styles.wrapUpButtonTextActive,
          ]}
        >
          {isWrappingUp ? 'Cancel' : 'Wrap Up'}
        </Text>
      </TouchableOpacity>
    );
  }, [isWrappingUp, handleWrapUpToggle]);

  // Build QuizEngine config
  const quizConfig: QuizEngineConfig = useMemo(
    () => {
      const showProgressStats = !zenModeEnabled || isWrappingUp;
      const displayTotalCount = isWrappingUp
        ? introducedItemIds.size
        : totalItemCount;
      const displayCompletedCount = isWrappingUp
        ? introducedItemIds.size - wrapUpRemainingCount
        : completedItemCount;

      const progressMode: ProgressMode = showProgressStats
        ? {
            mode: 'progress',
            current: displayCompletedCount,
            total: displayTotalCount,
            wrapUpRemaining: isWrappingUp ? wrapUpRemainingCount : undefined,
          }
        : { mode: 'zen' };

      return {
      questions: initialQuestions,
      progressMode,
      completionMode: 'never',
      isComplete,
      allowMarkCorrect: true,
      allowAddSynonym: true,
      requeueIncorrect: true,
      showSrsBadge: true,
      showSubjectTypeLabel: false,
      onAnswer: handleAnswer,
      onMarkCorrect: handleMarkCorrect,
      onAddSynonym: handleAddSynonym,
      getSrsBadge,
      shouldSkipQuestion,
      onContinueDelay: handleContinueDelay,
      renderCompletion,
      renderDetailsContent,
      renderExtraButtons,
      renderEmpty,
      autoAdvanceDelay,
      testID: 'review-session',
      subjectDisplayTestIDSuffix: 'character-container',
      onQuestionChange: handleQuestionChange,
    };
    },
    [
      initialQuestions,
      zenModeEnabled,
      isWrappingUp,
      introducedItemIds.size,
      totalItemCount,
      wrapUpRemainingCount,
      completedItemCount,
      isComplete,
      handleAnswer,
      handleMarkCorrect,
      handleAddSynonym,
      getSrsBadge,
      shouldSkipQuestion,
      handleContinueDelay,
      renderCompletion,
      renderDetailsContent,
      renderExtraButtons,
      renderEmpty,
      autoAdvanceDelay,
      handleQuestionChange,
    ],
  );

  return <QuizEngine config={quizConfig} />;
}

// ============================================
// Styles
// ============================================

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background.primary,
  },
  emptyText: {
    fontSize: FONT_SIZES.base,
    color: COLORS.text.secondary,
    textAlign: 'center',
    marginTop: SPACING.xxxl,
  },
  wrapUpButton: {
    minWidth: 100,
    paddingVertical: SPACING.lg,
    paddingHorizontal: SPACING.xl,
    minHeight: MIN_TOUCH_TARGET,
    borderRadius: BORDER_RADIUS.md,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.neutral.gray100,
    borderWidth: 2,
    borderColor: COLORS.feedback.warning,
  },
  wrapUpButtonActive: {
    backgroundColor: COLORS.feedback.warning,
  },
  wrapUpButtonText: {
    fontSize: FONT_SIZES.sm,
    fontWeight: 'bold',
    color: COLORS.feedback.warning,
  },
  wrapUpButtonTextActive: {
    color: COLORS.text.inverse,
  },
});
