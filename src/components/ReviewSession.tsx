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
  TextInput,
  View,
  KeyboardAvoidingView,
  Platform,
  TouchableOpacity,
  ScrollView,
  Animated,
  type TextInput as TextInputType,
} from 'react-native';

import type {
  SubjectType,
  Meaning,
  Reading,
  KanjiReading,
  AuxiliaryMeaning,
} from '../api/types';
import {
  processRomajiInput,
  romajiToHiragana,
} from '../utils/romajiToHiragana';
import {
  validateMeaningAnswer,
  validateReadingAnswer,
} from '../utils/answerValidation';
import {
  getSubjectColor,
  COLORS,
  SHADOW,
  BORDER_RADIUS,
  SPACING,
  FONT_SIZES,
  PROGRESS_COLORS,
  MIN_TOUCH_TARGET,
} from '../theme';
import { MnemonicText } from './MnemonicText';

// ============================================
// Types
// ============================================

/** Data for a review item */
export interface ReviewItem {
  /** Unique identifier for the item */
  id: number;
  /** The assignment ID for this item */
  assignmentId: number;
  /** The subject type (radical, kanji, vocabulary, kana_vocabulary) */
  subjectType: SubjectType;
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
}

/** Type of question being asked */
export type ReviewQuestionType = 'meaning' | 'reading';

/** A single review question */
export interface ReviewQuestion {
  /** The item being reviewed */
  item: ReviewItem;
  /** The type of question (meaning or reading) */
  type: ReviewQuestionType;
  /** Unique key for React rendering */
  key: string;
}

/** Result of answering a question */
export interface ReviewAnswerResult {
  question: ReviewQuestion;
  userAnswer: string;
  isCorrect: boolean;
  correctAnswer: string;
}

/** Feedback state when showing incorrect answer */
export interface IncorrectFeedback {
  question: ReviewQuestion;
  userAnswer: string;
  correctAnswer: string;
  mnemonic: string;
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
}

/**
 * Get the prompt text based on question type.
 */
function getQuestionPrompt(type: ReviewQuestionType): string {
  return type === 'meaning' ? 'What is the meaning?' : 'What is the reading?';
}

/**
 * Get all accepted meanings as a string for display.
 */
function getAcceptedMeaningsDisplay(meanings: Meaning[]): string {
  const accepted = meanings.filter(m => m.accepted_answer);
  return accepted.map(m => m.meaning).join(', ');
}

/**
 * Get all accepted readings as a string for display.
 */
function getAcceptedReadingsDisplay(
  readings: Reading[] | KanjiReading[] | null,
): string {
  if (!readings) return '';
  const accepted = readings.filter(r => r.accepted_answer);
  return accepted.map(r => r.reading).join(', ');
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
  // First, shuffle the items
  const shuffledItems = shuffleArray(items);

  const questions: ReviewQuestion[] = [];

  for (const item of shuffledItems) {
    // Determine question order for this item
    const meaningFirst = Math.random() < 0.5;

    if (item.subjectType === 'radical') {
      // Radicals only have meaning questions
      questions.push({
        item,
        type: 'meaning',
        key: `${item.id}-meaning`,
      });
    } else if (meaningFirst) {
      // Meaning first, then reading
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
      // Reading first, then meaning
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

  // Shuffle the entire question list for even more randomization
  return shuffleArray(questions);
}

// ============================================
// Component
// ============================================

/**
 * ReviewSession presents review questions for items that are due for review.
 * Shows characters prominently with an input field for answers.
 * Meaning questions expect English text; reading questions use romaji-to-hiragana conversion.
 *
 * Features:
 * - Progress bar showing completion (items fully completed / total items)
 * - Remaining count display
 * - Randomized item and question order
 * - Each item requires correct answers for both meaning and reading (except radicals)
 */
export function ReviewSession({
  items,
  onAnswer,
  onSessionComplete,
  autoAdvanceDelay = 500,
  onWrapUpToggle,
}: ReviewSessionProps) {
  // Generate initial questions once when items change
  const initialQuestions = useMemo(
    () => generateReviewQuestions(items),
    [items],
  );

  // Initialize item progress tracking
  const initialItemProgress = useMemo(() => {
    const progress = new Map<number, ItemProgress>();
    for (const item of items) {
      progress.set(item.id, {
        meaningCorrect: false,
        readingCorrect: item.subjectType === 'radical', // Radicals have no reading
        incorrectMeaningAnswers: 0,
        incorrectReadingAnswers: 0,
      });
    }
    return progress;
  }, [items]);

  // Question queue: includes initial questions + re-queued incorrect ones
  const [questionQueue, setQuestionQueue] =
    useState<ReviewQuestion[]>(initialQuestions);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [inputValue, setInputValue] = useState('');
  const [displayValue, setDisplayValue] = useState('');
  const [pendingRomaji, setPendingRomaji] = useState('');
  const [_itemProgress, setItemProgress] =
    useState<Map<number, ItemProgress>>(initialItemProgress);
  const [showCorrectFeedback, setShowCorrectFeedback] = useState(false);
  const [incorrectFeedback, setIncorrectFeedback] =
    useState<IncorrectFeedback | null>(null);

  // Wrap-up mode state
  const [isWrappingUp, setIsWrappingUp] = useState(false);
  // Track which items have been introduced (at least one question shown)
  const [introducedItemIds, setIntroducedItemIds] = useState<Set<number>>(
    new Set(),
  );

  // Track completed questions for session progress
  const [completedItemCount, setCompletedItemCount] = useState(0);
  const totalItemCount = items.length;

  // Track answer counts to report
  const answeredQuestionsCount = useRef(0);

  // Ref for TextInput to enable auto-focus
  const inputRef = useRef<TextInputType>(null);

  // Shake animation for invalid reading submission
  const shakeAnimation = useRef(new Animated.Value(0)).current;

  // Reset state when items change
  useEffect(() => {
    const newQuestions = generateReviewQuestions(items);
    const newProgress = new Map<number, ItemProgress>();
    for (const item of items) {
      newProgress.set(item.id, {
        meaningCorrect: false,
        readingCorrect: item.subjectType === 'radical',
        incorrectMeaningAnswers: 0,
        incorrectReadingAnswers: 0,
      });
    }
    setQuestionQueue(newQuestions);
    setCurrentQuestionIndex(0);
    setInputValue('');
    setDisplayValue('');
    setPendingRomaji('');
    setItemProgress(newProgress);
    setCompletedItemCount(0);
    setShowCorrectFeedback(false);
    setIncorrectFeedback(null);
    setIsWrappingUp(false);
    setIntroducedItemIds(new Set());
    answeredQuestionsCount.current = 0;
  }, [items]);

  const currentQuestion = questionQueue[currentQuestionIndex];

  // Session is complete when:
  // - Normal mode: all items are completed
  // - Wrap-up mode: all introduced items are completed
  const isComplete = useMemo(() => {
    if (isWrappingUp) {
      // In wrap-up mode, complete when all introduced items have both answers correct
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

  // Track introduced items when showing a new question
  useEffect(() => {
    if (currentQuestion && !introducedItemIds.has(currentQuestion.item.id)) {
      setIntroducedItemIds(prev => new Set(prev).add(currentQuestion.item.id));
    }
  }, [currentQuestion, introducedItemIds]);

  // Calculate wrap-up state: count of introduced items that are not yet complete
  const wrapUpRemainingCount = useMemo(() => {
    if (!isWrappingUp) return 0;
    let count = 0;
    for (const itemId of introducedItemIds) {
      const progress = _itemProgress.get(itemId);
      if (progress && !(progress.meaningCorrect && progress.readingCorrect)) {
        count++;
      }
    }
    return count;
  }, [isWrappingUp, introducedItemIds, _itemProgress]);

  // Auto-focus input when question changes or during correct feedback
  useEffect(() => {
    // Don't focus if showing incorrect feedback (user needs to tap Continue) or session is complete
    if (!incorrectFeedback && !isComplete) {
      // Small delay to ensure the input is rendered and ready
      const timer = setTimeout(() => {
        inputRef.current?.focus();
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [
    currentQuestionIndex,
    incorrectFeedback,
    showCorrectFeedback,
    isComplete,
  ]);

  // Handle wrap-up button press
  const handleWrapUpToggle = useCallback(() => {
    setIsWrappingUp(prev => {
      const newValue = !prev;
      onWrapUpToggle?.(newValue);
      return newValue;
    });
  }, [onWrapUpToggle]);

  // Handle input change for reading questions (romaji to hiragana)
  const handleReadingInputChange = useCallback((text: string) => {
    const state = processRomajiInput(text, false);
    setInputValue(text);
    setDisplayValue(state.hiragana);
    setPendingRomaji(state.pending);
  }, []);

  // Handle input change for meaning questions (direct text)
  const handleMeaningInputChange = useCallback((text: string) => {
    setInputValue(text);
    setDisplayValue(text);
    setPendingRomaji('');
  }, []);

  // Get the current input handler based on question type
  const handleInputChange =
    currentQuestion?.type === 'reading'
      ? handleReadingInputChange
      : handleMeaningInputChange;

  // Find the next valid question index, considering wrap-up mode
  const findNextQuestionIndex = useCallback(
    (
      startIndex: number,
      queue: ReviewQuestion[],
      wrappingUp: boolean,
      introduced: Set<number>,
      progress: Map<number, ItemProgress>,
    ): number => {
      let nextIndex = startIndex;

      // In wrap-up mode, skip questions for items that haven't been introduced yet
      // or items that are already complete
      while (nextIndex < queue.length && wrappingUp) {
        const question = queue[nextIndex];
        const itemId = question.item.id;
        const itemProgress = progress.get(itemId);
        const isIntroduced = introduced.has(itemId);
        const isItemDone =
          itemProgress &&
          itemProgress.meaningCorrect &&
          itemProgress.readingCorrect;

        // Skip if not introduced or already complete
        if (!isIntroduced || isItemDone) {
          nextIndex++;
        } else {
          break;
        }
      }

      return nextIndex;
    },
    [],
  );

  // Advance to next question (clearing input and feedback)
  const advanceToNextQuestion = useCallback(() => {
    setCurrentQuestionIndex(prev => {
      const nextIndex = prev + 1;
      return findNextQuestionIndex(
        nextIndex,
        questionQueue,
        isWrappingUp,
        introducedItemIds,
        _itemProgress,
      );
    });
    setInputValue('');
    setDisplayValue('');
    setPendingRomaji('');
    setIncorrectFeedback(null);
    setShowCorrectFeedback(false);
  }, [
    findNextQuestionIndex,
    questionQueue,
    isWrappingUp,
    introducedItemIds,
    _itemProgress,
  ]);

  // Handle tap to continue after incorrect answer
  const handleContinue = useCallback(() => {
    advanceToNextQuestion();
  }, [advanceToNextQuestion]);

  // Trigger shake animation for invalid input
  const triggerShake = useCallback(() => {
    shakeAnimation.setValue(0);
    Animated.sequence([
      Animated.timing(shakeAnimation, {
        toValue: 10,
        duration: 50,
        useNativeDriver: true,
      }),
      Animated.timing(shakeAnimation, {
        toValue: -10,
        duration: 50,
        useNativeDriver: true,
      }),
      Animated.timing(shakeAnimation, {
        toValue: 10,
        duration: 50,
        useNativeDriver: true,
      }),
      Animated.timing(shakeAnimation, {
        toValue: -10,
        duration: 50,
        useNativeDriver: true,
      }),
      Animated.timing(shakeAnimation, {
        toValue: 0,
        duration: 50,
        useNativeDriver: true,
      }),
    ]).start();
  }, [shakeAnimation]);

  // Check if input contains any romaji (non-hiragana letters)
  const hasRomajiCharacters = useCallback((text: string): boolean => {
    // Check if there are any a-z characters remaining
    return /[a-zA-Z]/.test(text);
  }, []);

  // Check if an item is fully completed (both meaning and reading correct)
  const isItemComplete = useCallback((progress: ItemProgress): boolean => {
    return progress.meaningCorrect && progress.readingCorrect;
  }, []);

  // Handle answer submission
  const handleSubmit = useCallback(() => {
    if (!currentQuestion || showCorrectFeedback || incorrectFeedback) return;

    const { item, type } = currentQuestion;

    // For reading questions, check if input has unconverted romaji
    if (type === 'reading') {
      const converted = romajiToHiragana(inputValue);
      if (hasRomajiCharacters(converted)) {
        // Input has romaji that couldn't be converted - shake and reject
        triggerShake();
        return;
      }
    }

    // Get the final answer
    const answer =
      type === 'reading' ? romajiToHiragana(inputValue) : inputValue.trim();

    // Validate the answer
    let isCorrect = false;
    if (type === 'meaning') {
      const validationResult = validateMeaningAnswer(
        answer,
        item.meanings,
        item.auxiliaryMeanings ?? [],
      );
      isCorrect = validationResult.isCorrect;
    } else {
      const validationResult = validateReadingAnswer(
        answer,
        item.readings ?? [],
      );
      isCorrect = validationResult.isCorrect;
    }

    // Get correct answer for display
    const correctAnswer =
      type === 'meaning'
        ? getAcceptedMeaningsDisplay(item.meanings)
        : getAcceptedReadingsDisplay(item.readings);

    const result: ReviewAnswerResult = {
      question: currentQuestion,
      userAnswer: answer,
      isCorrect,
      correctAnswer,
    };

    // Notify parent
    onAnswer?.(result);
    answeredQuestionsCount.current++;

    // Compute whether session will complete after this answer
    // We need to read current state to predict the outcome
    const currentProgress = _itemProgress.get(item.id)!;
    const willMeaningBeCorrect =
      type === 'meaning' && isCorrect ? true : currentProgress.meaningCorrect;
    const willReadingBeCorrect =
      type === 'reading' && isCorrect ? true : currentProgress.readingCorrect;
    const itemWillBeComplete = willMeaningBeCorrect && willReadingBeCorrect;
    const itemWasComplete = isItemComplete(currentProgress);
    const itemJustCompleted = itemWillBeComplete && !itemWasComplete;
    const newCompletedCount = itemJustCompleted
      ? completedItemCount + 1
      : completedItemCount;

    // Check session completion differently for wrap-up mode vs normal mode
    let sessionWillComplete: boolean;
    if (isWrappingUp) {
      // In wrap-up mode: complete when all introduced items are done
      sessionWillComplete =
        itemJustCompleted &&
        (() => {
          // Check if all introduced items will be complete after this answer
          for (const itemId of introducedItemIds) {
            if (itemId === item.id) {
              // This item will be complete
              continue;
            }
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

    // Build the new progress for callback (needs to be done before state update for proper value)
    let newProgressForCallback: Map<number, ItemProgress> | null = null;
    if (sessionWillComplete && isCorrect) {
      // Pre-compute the new progress map for the callback
      // In wrap-up mode, only include introduced items
      if (isWrappingUp) {
        newProgressForCallback = new Map<number, ItemProgress>();
        for (const itemId of introducedItemIds) {
          const progress = _itemProgress.get(itemId)!;
          if (itemId === item.id) {
            // Update the current item's progress
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
      const currentItemProgress = newProgress.get(item.id)!;

      if (isCorrect) {
        // Mark this question type as correct
        if (type === 'meaning') {
          currentItemProgress.meaningCorrect = true;
        } else {
          currentItemProgress.readingCorrect = true;
        }
      } else {
        // Increment incorrect count
        if (type === 'meaning') {
          currentItemProgress.incorrectMeaningAnswers++;
        } else {
          currentItemProgress.incorrectReadingAnswers++;
        }

        // Re-queue the question
        setQuestionQueue(prevQueue => [...prevQueue, currentQuestion]);
      }

      newProgress.set(item.id, currentItemProgress);

      return newProgress;
    });

    if (isCorrect) {
      // Show brief correct feedback then auto-advance
      setShowCorrectFeedback(true);
      setTimeout(() => {
        setShowCorrectFeedback(false);

        // Update completed count if item just completed (deferred so feedback shows first)
        if (itemJustCompleted) {
          setCompletedItemCount(newCompletedCount);
        }

        // Call onSessionComplete if session is complete
        if (newProgressForCallback) {
          onSessionComplete?.(newProgressForCallback);
        }

        // Only advance to next question if session is not complete
        if (!sessionWillComplete) {
          advanceToNextQuestion();
        }
      }, autoAdvanceDelay);
    } else {
      // Show incorrect feedback - user must tap to continue
      const mnemonic =
        type === 'meaning'
          ? item.meaningMnemonic
          : item.readingMnemonic ?? item.meaningMnemonic;

      setIncorrectFeedback({
        question: currentQuestion,
        userAnswer: answer,
        correctAnswer,
        mnemonic,
      });

      // Note: Completed count update and session completion callbacks are not triggered
      // for incorrect answers since the question is re-queued and not yet completed
    }
  }, [
    currentQuestion,
    inputValue,
    showCorrectFeedback,
    incorrectFeedback,
    onAnswer,
    onSessionComplete,
    totalItemCount,
    completedItemCount,
    _itemProgress,
    advanceToNextQuestion,
    isItemComplete,
    autoAdvanceDelay,
    isWrappingUp,
    introducedItemIds,
  ]);

  // Handle edge case of empty items array
  if (items.length === 0) {
    return (
      <View style={styles.container} testID="review-session-empty">
        <Text style={styles.emptyText}>No reviews available</Text>
      </View>
    );
  }

  // Handle session completion
  if (isComplete) {
    return (
      <View style={styles.container} testID="review-session-complete">
        <Text style={styles.completeText}>Session Complete!</Text>
        <Text style={styles.completeSubtext}>
          {answeredQuestionsCount.current} questions answered
        </Text>
      </View>
    );
  }

  // Handle case where we've gone past the queue (shouldn't happen, but be safe)
  if (!currentQuestion) {
    return (
      <View style={styles.container} testID="review-session-empty">
        <Text style={styles.emptyText}>Loading...</Text>
      </View>
    );
  }

  const { item, type } = currentQuestion;

  // If showing incorrect feedback, render the feedback view
  if (incorrectFeedback) {
    // Calculate progress: In wrap-up mode, use introduced items count
    const displayTotalCount = isWrappingUp
      ? introducedItemIds.size
      : totalItemCount;
    const displayCompletedCount = isWrappingUp
      ? introducedItemIds.size - wrapUpRemainingCount
      : completedItemCount;
    const progressPercentage =
      displayTotalCount > 0
        ? (displayCompletedCount / displayTotalCount) * 100
        : 0;
    const remainingCount = isWrappingUp
      ? wrapUpRemainingCount
      : totalItemCount - completedItemCount;

    return (
      <View style={styles.container} testID="review-session-incorrect-feedback">
        {/* Progress indicator */}
        <View style={styles.progressContainer} testID="review-session-progress">
          <View style={styles.progressTextRow}>
            <Text
              style={styles.progressText}
              testID="review-session-progress-text"
            >
              {displayCompletedCount} / {displayTotalCount}
            </Text>
            {isWrappingUp ? (
              <Text
                style={styles.wrapUpText}
                testID="review-session-wrapping-up-text"
              >
                Wrapping up: {wrapUpRemainingCount} remaining
              </Text>
            ) : (
              <Text
                style={styles.remainingText}
                testID="review-session-remaining-text"
              >
                {remainingCount} remaining
              </Text>
            )}
          </View>
          <View style={styles.progressBar}>
            <View
              style={[
                styles.progressFill,
                isWrappingUp && styles.wrapUpProgressFill,
                { width: `${progressPercentage}%` },
              ]}
              testID="review-session-progress-fill"
            />
          </View>
        </View>

        {/* Character display with red tint for incorrect */}
        <View
          style={[styles.characterContainer, styles.incorrectHeader]}
          testID="review-session-character-container"
        >
          <Text style={styles.characters} testID="review-session-characters">
            {incorrectFeedback.question.item.characters ?? '?'}
          </Text>
          <Text
            style={styles.incorrectLabel}
            testID="review-session-incorrect-label"
          >
            Incorrect
          </Text>
        </View>

        {/* Feedback content */}
        <ScrollView
          style={styles.feedbackContainer}
          contentContainerStyle={styles.feedbackContent}
        >
          {/* User's answer */}
          <View style={styles.feedbackSection}>
            <Text
              style={styles.feedbackLabel}
              testID="review-session-your-answer-label"
            >
              Your Answer:
            </Text>
            <Text style={styles.userAnswer} testID="review-session-your-answer">
              {incorrectFeedback.userAnswer || '(empty)'}
            </Text>
          </View>

          {/* Correct answer */}
          <View style={styles.feedbackSection}>
            <Text
              style={styles.feedbackLabel}
              testID="review-session-correct-answer-label"
            >
              Correct Answer:
            </Text>
            <Text
              style={styles.correctAnswerText}
              testID="review-session-correct-answer"
            >
              {incorrectFeedback.correctAnswer}
            </Text>
          </View>

          {/* Mnemonic */}
          <View style={styles.feedbackSection}>
            <Text
              style={styles.feedbackLabel}
              testID="review-session-mnemonic-label"
            >
              {incorrectFeedback.question.type === 'meaning'
                ? 'Meaning Mnemonic:'
                : 'Reading Mnemonic:'}
            </Text>
            <MnemonicText
              text={incorrectFeedback.mnemonic}
              style={styles.mnemonicText}
              testID="review-session-mnemonic"
            />
          </View>
        </ScrollView>

        {/* Continue button */}
        <TouchableOpacity
          style={[styles.submitButton, styles.continueButton]}
          onPress={handleContinue}
          activeOpacity={0.8}
          testID="review-session-continue"
        >
          <Text style={styles.submitButtonText}>Continue</Text>
        </TouchableOpacity>
      </View>
    );
  }
  const backgroundColor = getSubjectColor(item.subjectType);
  const questionPrompt = getQuestionPrompt(type);
  const placeholder =
    type === 'meaning' ? 'Enter meaning...' : 'Type reading (romaji)...';

  // For reading input, show the converted hiragana + any pending romaji
  const displayText =
    type === 'reading' ? displayValue + pendingRomaji : displayValue;

  // Calculate progress: In wrap-up mode, use introduced items count
  const displayTotalCount = isWrappingUp
    ? introducedItemIds.size
    : totalItemCount;
  const displayCompletedCount = isWrappingUp
    ? introducedItemIds.size - wrapUpRemainingCount
    : completedItemCount;
  const progressPercentage =
    displayTotalCount > 0
      ? (displayCompletedCount / displayTotalCount) * 100
      : 0;
  const remainingCount = isWrappingUp
    ? wrapUpRemainingCount
    : totalItemCount - completedItemCount;

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      testID="review-session"
    >
      {/* Progress indicator */}
      <View style={styles.progressContainer} testID="review-session-progress">
        <View style={styles.progressTextRow}>
          <Text
            style={styles.progressText}
            testID="review-session-progress-text"
          >
            {displayCompletedCount} / {displayTotalCount}
          </Text>
          {isWrappingUp ? (
            <Text
              style={styles.wrapUpText}
              testID="review-session-wrapping-up-text"
            >
              Wrapping up: {wrapUpRemainingCount} remaining
            </Text>
          ) : (
            <Text
              style={styles.remainingText}
              testID="review-session-remaining-text"
            >
              {remainingCount} remaining
            </Text>
          )}
        </View>
        <View style={styles.progressBar}>
          <View
            style={[
              styles.progressFill,
              isWrappingUp && styles.wrapUpProgressFill,
              { width: `${progressPercentage}%` },
            ]}
            testID="review-session-progress-fill"
          />
        </View>
      </View>

      {/* Character display - with green tint if showing correct feedback */}
      <View
        style={[
          styles.characterContainer,
          showCorrectFeedback ? styles.correctHeader : { backgroundColor },
        ]}
        testID="review-session-character-container"
      >
        <Text style={styles.characters} testID="review-session-characters">
          {item.characters ?? '?'}
        </Text>
        {showCorrectFeedback ? (
          <Text
            style={styles.correctLabel}
            testID="review-session-correct-label"
          >
            Correct!
          </Text>
        ) : (
          <Text style={styles.subjectType} testID="review-session-subject-type">
            {item.subjectType.replace('_', ' ')}
          </Text>
        )}
      </View>

      {/* Question type label */}
      <View
        style={[
          styles.questionContainer,
          type === 'reading'
            ? styles.questionContainerReading
            : styles.questionContainerMeaning,
        ]}
      >
        <Text
          style={[
            styles.questionType,
            type === 'reading' && styles.questionTypeReading,
          ]}
          testID="review-session-question-type"
        >
          {type === 'meaning' ? 'MEANING' : 'READING'}
        </Text>
      </View>

      {/* Input area - no flex to keep it near the question prompt */}
      <Animated.View
        style={[
          styles.inputContainer,
          { transform: [{ translateX: shakeAnimation }] },
        ]}
        testID="review-session-input-container"
      >
        <TextInput
          ref={inputRef}
          style={[styles.input, { borderColor: backgroundColor }]}
          value={type === 'reading' ? displayText : inputValue}
          onChangeText={handleInputChange}
          onSubmitEditing={handleSubmit}
          placeholder={placeholder}
          placeholderTextColor="#999"
          autoCapitalize="none"
          autoCorrect={false}
          autoComplete="off"
          keyboardType={type === 'reading' ? 'ascii-capable' : 'default'}
          returnKeyType="done"
          blurOnSubmit={false}
          caretHidden={true}
          testID="review-session-input"
        />
      </Animated.View>

      {/* Spacer to push buttons to bottom */}
      <View style={styles.spacer} />

      {/* Button row: Submit + Wrap Up */}
      <View style={styles.buttonRow}>
        {/* Submit button */}
        <TouchableOpacity
          style={[
            styles.submitButton,
            styles.submitButtonFlex,
            { backgroundColor },
          ]}
          onPress={handleSubmit}
          disabled={showCorrectFeedback}
          activeOpacity={0.8}
          testID="review-session-submit"
        >
          <Text style={styles.submitButtonText}>Submit</Text>
        </TouchableOpacity>

        {/* Wrap Up button */}
        <TouchableOpacity
          style={[
            styles.wrapUpButton,
            isWrappingUp && styles.wrapUpButtonActive,
          ]}
          onPress={handleWrapUpToggle}
          disabled={showCorrectFeedback}
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
      </View>
    </KeyboardAvoidingView>
  );
}

// ============================================
// Styles
// ============================================

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background.primary,
  },
  questionTypeBar: {
    height: 10,
    width: '100%',
  },
  questionTypeBarReading: {
    backgroundColor: COLORS.neutral.black,
  },
  questionTypeBarMeaning: {
    backgroundColor: COLORS.neutral.white,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border.medium,
  },
  progressContainer: {
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.md,
    paddingBottom: SPACING.sm,
    backgroundColor: COLORS.background.secondary,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border.light,
  },
  progressTextRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.sm,
  },
  progressText: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.text.secondary,
    fontWeight: '500',
  },
  remainingText: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.text.tertiary,
  },
  progressBar: {
    height: 4,
    backgroundColor: PROGRESS_COLORS.background,
    borderRadius: BORDER_RADIUS.sm,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: PROGRESS_COLORS.fill,
    borderRadius: BORDER_RADIUS.sm,
  },
  characterContainer: {
    paddingVertical: 48,
    paddingHorizontal: SPACING.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  characters: {
    fontSize: FONT_SIZES.display,
    fontWeight: 'bold',
    color: COLORS.text.inverse,
    textAlign: 'center',
  },
  subjectType: {
    fontSize: FONT_SIZES.sm,
    color: 'rgba(255, 255, 255, 0.8)',
    marginTop: SPACING.sm,
    textTransform: 'capitalize',
  },
  // Correct feedback styles
  correctHeader: {
    backgroundColor: COLORS.feedback.correct,
  },
  correctLabel: {
    fontSize: FONT_SIZES.sm,
    fontWeight: 'bold',
    color: COLORS.text.inverse,
    marginTop: SPACING.sm,
  },
  questionContainer: {
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.lg,
    alignItems: 'center',
  },
  questionContainerReading: {
    backgroundColor: COLORS.neutral.black,
  },
  questionContainerMeaning: {
    backgroundColor: COLORS.neutral.white,
  },
  questionType: {
    fontSize: FONT_SIZES.sm,
    fontWeight: '700',
    color: COLORS.text.tertiary,
    letterSpacing: 2,
  },
  questionTypeReading: {
    color: COLORS.text.inverse,
  },
  inputContainer: {
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.md,
    paddingBottom: SPACING.sm,
  },
  spacer: {
    flex: 1,
  },
  convertedDisplay: {
    fontSize: FONT_SIZES.xxxl,
    fontWeight: '500',
    color: COLORS.text.primary,
    textAlign: 'center',
    marginBottom: SPACING.lg,
    minHeight: 40,
  },
  input: {
    borderWidth: 2,
    borderRadius: BORDER_RADIUS.md,
    paddingVertical: SPACING.lg,
    paddingHorizontal: SPACING.lg,
    fontSize: FONT_SIZES.lg,
    textAlign: 'center',
    backgroundColor: COLORS.background.input,
  },
  submitButton: {
    margin: SPACING.lg,
    paddingVertical: SPACING.lg,
    minHeight: MIN_TOUCH_TARGET,
    borderRadius: BORDER_RADIUS.md,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: SHADOW.color,
    shadowOffset: SHADOW.offset,
    shadowOpacity: SHADOW.opacity,
    shadowRadius: SHADOW.radius,
    elevation: SHADOW.elevation,
  },
  submitButtonText: {
    fontSize: FONT_SIZES.lg,
    fontWeight: 'bold',
    color: COLORS.text.inverse,
  },
  emptyText: {
    fontSize: FONT_SIZES.base,
    color: COLORS.text.secondary,
    textAlign: 'center',
    marginTop: SPACING.xxxl,
  },
  completeText: {
    fontSize: FONT_SIZES.xxl,
    fontWeight: 'bold',
    color: COLORS.text.primary,
    textAlign: 'center',
    marginTop: SPACING.xxxl,
  },
  completeSubtext: {
    fontSize: FONT_SIZES.base,
    color: COLORS.text.secondary,
    textAlign: 'center',
    marginTop: SPACING.sm,
  },
  // Incorrect feedback styles
  incorrectHeader: {
    backgroundColor: COLORS.feedback.incorrect,
  },
  incorrectLabel: {
    fontSize: FONT_SIZES.lg,
    fontWeight: 'bold',
    color: COLORS.text.inverse,
    marginTop: SPACING.sm,
  },
  feedbackContainer: {
    flex: 1,
  },
  feedbackContent: {
    padding: SPACING.lg,
  },
  feedbackSection: {
    marginBottom: SPACING.xl,
  },
  feedbackLabel: {
    fontSize: FONT_SIZES.sm,
    fontWeight: '600',
    color: COLORS.text.secondary,
    marginBottom: SPACING.xs,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  userAnswer: {
    fontSize: FONT_SIZES.xl,
    color: COLORS.feedback.incorrect,
    fontWeight: '500',
  },
  correctAnswerText: {
    fontSize: FONT_SIZES.xxl,
    color: COLORS.feedback.correct,
    fontWeight: 'bold',
  },
  mnemonicText: {
    fontSize: FONT_SIZES.base,
    color: COLORS.text.primary,
    lineHeight: FONT_SIZES.xxl,
  },
  continueButton: {
    backgroundColor: COLORS.neutral.gray600,
  },
  // Wrap-up mode styles
  wrapUpText: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.feedback.warning,
    fontWeight: '600',
  },
  wrapUpProgressFill: {
    backgroundColor: PROGRESS_COLORS.wrapUpFill,
  },
  buttonRow: {
    flexDirection: 'row',
    paddingHorizontal: SPACING.lg,
    paddingBottom: SPACING.lg,
    gap: SPACING.md,
  },
  submitButtonFlex: {
    flex: 1,
    margin: 0,
  },
  wrapUpButton: {
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
