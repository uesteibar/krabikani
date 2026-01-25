import React, { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import {
  StyleSheet,
  Text,
  TextInput,
  View,
  KeyboardAvoidingView,
  Platform,
  TouchableOpacity,
  ScrollView,
} from 'react-native';

import type { SubjectType, Meaning, Reading, KanjiReading, AuxiliaryMeaning } from '../api/types';
import { processRomajiInput, romajiToHiragana } from '../utils/romajiToHiragana';
import { validateMeaningAnswer, validateReadingAnswer } from '../utils/answerValidation';

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
  /** Delay in ms before auto-advancing after correct answer (default: 50ms for near-instant feedback) */
  autoAdvanceDelay?: number;
}

// ============================================
// Helper Functions
// ============================================

/**
 * Get the background color based on subject type.
 * Uses WaniKani-inspired colors.
 */
function getSubjectColor(subjectType: SubjectType): string {
  switch (subjectType) {
    case 'radical':
      return '#00aaff'; // WaniKani blue for radicals
    case 'kanji':
      return '#e8a4c9'; // Pink for kanji
    case 'vocabulary':
    case 'kana_vocabulary':
      return '#8f5bc4'; // Purple for vocabulary
    default:
      return '#888';
  }
}

/**
 * Get the prompt text based on question type.
 */
function getQuestionPrompt(type: ReviewQuestionType): string {
  return type === 'meaning' ? "What is the meaning?" : "What is the reading?";
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
function getAcceptedReadingsDisplay(readings: Reading[] | KanjiReading[] | null): string {
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
  autoAdvanceDelay = 50,
}: ReviewSessionProps) {
  // Generate initial questions once when items change
  const initialQuestions = useMemo(() => generateReviewQuestions(items), [items]);

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
  const [questionQueue, setQuestionQueue] = useState<ReviewQuestion[]>(initialQuestions);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [inputValue, setInputValue] = useState('');
  const [displayValue, setDisplayValue] = useState('');
  const [pendingRomaji, setPendingRomaji] = useState('');
  const [_itemProgress, setItemProgress] = useState<Map<number, ItemProgress>>(initialItemProgress);
  const [showCorrectFeedback, setShowCorrectFeedback] = useState(false);
  const [incorrectFeedback, setIncorrectFeedback] = useState<IncorrectFeedback | null>(null);

  // Track completed questions for session progress
  const [completedItemCount, setCompletedItemCount] = useState(0);
  const totalItemCount = items.length;

  // Track answer counts to report
  const answeredQuestionsCount = useRef(0);

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
    answeredQuestionsCount.current = 0;
  }, [items]);

  const currentQuestion = questionQueue[currentQuestionIndex];
  const isComplete = completedItemCount >= totalItemCount;

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
  const handleInputChange = currentQuestion?.type === 'reading'
    ? handleReadingInputChange
    : handleMeaningInputChange;

  // Advance to next question (clearing input and feedback)
  const advanceToNextQuestion = useCallback(() => {
    setCurrentQuestionIndex(prev => prev + 1);
    setInputValue('');
    setDisplayValue('');
    setPendingRomaji('');
    setIncorrectFeedback(null);
    setShowCorrectFeedback(false);
  }, []);

  // Handle tap to continue after incorrect answer
  const handleContinue = useCallback(() => {
    advanceToNextQuestion();
  }, [advanceToNextQuestion]);

  // Check if an item is fully completed (both meaning and reading correct)
  const isItemComplete = useCallback((progress: ItemProgress): boolean => {
    return progress.meaningCorrect && progress.readingCorrect;
  }, []);

  // Handle answer submission
  const handleSubmit = useCallback(() => {
    if (!currentQuestion || showCorrectFeedback || incorrectFeedback) return;

    const { item, type } = currentQuestion;

    // Get the final answer
    const answer = type === 'reading'
      ? romajiToHiragana(inputValue)
      : inputValue.trim();

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
    const correctAnswer = type === 'meaning'
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
    const willMeaningBeCorrect = type === 'meaning' && isCorrect ? true : currentProgress.meaningCorrect;
    const willReadingBeCorrect = type === 'reading' && isCorrect ? true : currentProgress.readingCorrect;
    const itemWillBeComplete = willMeaningBeCorrect && willReadingBeCorrect;
    const itemWasComplete = isItemComplete(currentProgress);
    const itemJustCompleted = itemWillBeComplete && !itemWasComplete;
    const newCompletedCount = itemJustCompleted ? completedItemCount + 1 : completedItemCount;
    const sessionWillComplete = newCompletedCount >= totalItemCount;

    // Build the new progress for callback (needs to be done before state update for proper value)
    let newProgressForCallback: Map<number, ItemProgress> | null = null;
    if (sessionWillComplete && itemJustCompleted) {
      // Pre-compute the new progress map for the callback
      newProgressForCallback = new Map(_itemProgress);
      const updatedItemProgress = { ...newProgressForCallback.get(item.id)! };
      if (isCorrect) {
        if (type === 'meaning') {
          updatedItemProgress.meaningCorrect = true;
        } else {
          updatedItemProgress.readingCorrect = true;
        }
      }
      newProgressForCallback.set(item.id, updatedItemProgress);
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
      const mnemonic = type === 'meaning'
        ? item.meaningMnemonic
        : (item.readingMnemonic ?? item.meaningMnemonic);

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
    // Calculate progress: completed items out of total items
    const progressPercentage = (completedItemCount / totalItemCount) * 100;
    const remainingCount = totalItemCount - completedItemCount;

    return (
      <View style={styles.container} testID="review-session-incorrect-feedback">
        {/* Progress indicator */}
        <View style={styles.progressContainer} testID="review-session-progress">
          <View style={styles.progressTextRow}>
            <Text style={styles.progressText} testID="review-session-progress-text">
              {completedItemCount} / {totalItemCount}
            </Text>
            <Text style={styles.remainingText} testID="review-session-remaining-text">
              {remainingCount} remaining
            </Text>
          </View>
          <View style={styles.progressBar}>
            <View
              style={[
                styles.progressFill,
                { width: `${progressPercentage}%` },
              ]}
              testID="review-session-progress-fill"
            />
          </View>
        </View>

        {/* Character display with red tint for incorrect */}
        <View style={[styles.characterContainer, styles.incorrectHeader]} testID="review-session-character-container">
          <Text style={styles.characters} testID="review-session-characters">
            {incorrectFeedback.question.item.characters ?? '?'}
          </Text>
          <Text style={styles.incorrectLabel} testID="review-session-incorrect-label">
            Incorrect
          </Text>
        </View>

        {/* Feedback content */}
        <ScrollView style={styles.feedbackContainer} contentContainerStyle={styles.feedbackContent}>
          {/* User's answer */}
          <View style={styles.feedbackSection}>
            <Text style={styles.feedbackLabel} testID="review-session-your-answer-label">Your Answer:</Text>
            <Text style={styles.userAnswer} testID="review-session-your-answer">
              {incorrectFeedback.userAnswer || '(empty)'}
            </Text>
          </View>

          {/* Correct answer */}
          <View style={styles.feedbackSection}>
            <Text style={styles.feedbackLabel} testID="review-session-correct-answer-label">Correct Answer:</Text>
            <Text style={styles.correctAnswerText} testID="review-session-correct-answer">
              {incorrectFeedback.correctAnswer}
            </Text>
          </View>

          {/* Mnemonic */}
          <View style={styles.feedbackSection}>
            <Text style={styles.feedbackLabel} testID="review-session-mnemonic-label">
              {incorrectFeedback.question.type === 'meaning' ? 'Meaning Mnemonic:' : 'Reading Mnemonic:'}
            </Text>
            <Text style={styles.mnemonicText} testID="review-session-mnemonic">
              {incorrectFeedback.mnemonic}
            </Text>
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
  const placeholder = type === 'meaning' ? 'Enter meaning...' : 'Type reading (romaji)...';

  // For reading input, show the converted hiragana + any pending romaji
  const displayText = type === 'reading'
    ? displayValue + pendingRomaji
    : displayValue;

  // Calculate progress: completed items out of total items
  const progressPercentage = (completedItemCount / totalItemCount) * 100;
  const remainingCount = totalItemCount - completedItemCount;

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      testID="review-session"
    >
      {/* Progress indicator */}
      <View style={styles.progressContainer} testID="review-session-progress">
        <View style={styles.progressTextRow}>
          <Text style={styles.progressText} testID="review-session-progress-text">
            {completedItemCount} / {totalItemCount}
          </Text>
          <Text style={styles.remainingText} testID="review-session-remaining-text">
            {remainingCount} remaining
          </Text>
        </View>
        <View style={styles.progressBar}>
          <View
            style={[
              styles.progressFill,
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
          <Text style={styles.correctLabel} testID="review-session-correct-label">
            Correct!
          </Text>
        ) : (
          <Text style={styles.subjectType} testID="review-session-subject-type">
            {item.subjectType.replace('_', ' ')}
          </Text>
        )}
      </View>

      {/* Question prompt */}
      <View style={styles.questionContainer}>
        <Text style={styles.questionPrompt} testID="review-session-prompt">
          {questionPrompt}
        </Text>
        <Text style={styles.questionType} testID="review-session-question-type">
          {type === 'meaning' ? 'MEANING' : 'READING'}
        </Text>
      </View>

      {/* Input area */}
      <View style={styles.inputContainer}>
        {/* For reading questions, show the converted display */}
        {type === 'reading' && displayText && (
          <Text style={styles.convertedDisplay} testID="review-session-converted-display">
            {displayText}
          </Text>
        )}
        <TextInput
          style={[
            styles.input,
            { borderColor: backgroundColor },
          ]}
          value={inputValue}
          onChangeText={handleInputChange}
          placeholder={placeholder}
          placeholderTextColor="#999"
          autoCapitalize="none"
          autoCorrect={false}
          autoComplete="off"
          keyboardType={type === 'reading' ? 'ascii-capable' : 'default'}
          editable={!showCorrectFeedback}
          testID="review-session-input"
        />
      </View>

      {/* Submit button */}
      <TouchableOpacity
        style={[styles.submitButton, { backgroundColor }]}
        onPress={handleSubmit}
        disabled={showCorrectFeedback}
        activeOpacity={0.8}
        testID="review-session-submit"
      >
        <Text style={styles.submitButtonText}>Submit</Text>
      </TouchableOpacity>
    </KeyboardAvoidingView>
  );
}

// ============================================
// Styles
// ============================================

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  progressContainer: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 8,
    backgroundColor: '#f8f8f8',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  progressTextRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  progressText: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
  remainingText: {
    fontSize: 14,
    color: '#888',
  },
  progressBar: {
    height: 4,
    backgroundColor: '#e0e0e0',
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#4caf50',
    borderRadius: 2,
  },
  characterContainer: {
    paddingVertical: 48,
    paddingHorizontal: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  characters: {
    fontSize: 72,
    fontWeight: 'bold',
    color: '#fff',
    textAlign: 'center',
  },
  subjectType: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.8)',
    marginTop: 8,
    textTransform: 'capitalize',
  },
  // Correct feedback styles
  correctHeader: {
    backgroundColor: '#4caf50',
  },
  correctLabel: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
    marginTop: 8,
  },
  questionContainer: {
    paddingVertical: 16,
    paddingHorizontal: 16,
    alignItems: 'center',
  },
  questionPrompt: {
    fontSize: 20,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  questionType: {
    fontSize: 12,
    fontWeight: '700',
    color: '#888',
    letterSpacing: 2,
  },
  inputContainer: {
    flex: 1,
    paddingHorizontal: 16,
    justifyContent: 'center',
  },
  convertedDisplay: {
    fontSize: 32,
    fontWeight: '500',
    color: '#333',
    textAlign: 'center',
    marginBottom: 16,
    minHeight: 40,
  },
  input: {
    borderWidth: 2,
    borderRadius: 8,
    paddingVertical: 16,
    paddingHorizontal: 16,
    fontSize: 18,
    textAlign: 'center',
    backgroundColor: '#fafafa',
  },
  submitButton: {
    margin: 16,
    paddingVertical: 16,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  submitButtonText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
  },
  emptyText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginTop: 32,
  },
  completeText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    textAlign: 'center',
    marginTop: 32,
  },
  completeSubtext: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginTop: 8,
  },
  // Incorrect feedback styles
  incorrectHeader: {
    backgroundColor: '#f44336',
  },
  incorrectLabel: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
    marginTop: 8,
  },
  feedbackContainer: {
    flex: 1,
  },
  feedbackContent: {
    padding: 16,
  },
  feedbackSection: {
    marginBottom: 20,
  },
  feedbackLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
    marginBottom: 4,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  userAnswer: {
    fontSize: 20,
    color: '#f44336',
    fontWeight: '500',
  },
  correctAnswerText: {
    fontSize: 24,
    color: '#4caf50',
    fontWeight: 'bold',
  },
  mnemonicText: {
    fontSize: 16,
    color: '#333',
    lineHeight: 24,
  },
  continueButton: {
    backgroundColor: '#666',
  },
});
