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

// ============================================
// Types
// ============================================

/** Data for a quiz item (same as LessonItem but reused for clarity) */
export interface QuizItem {
  /** Unique identifier for the item */
  id: number;
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
export type QuestionType = 'meaning' | 'reading';

/** A single quiz question */
export interface QuizQuestion {
  /** The item being quizzed */
  item: QuizItem;
  /** The type of question (meaning or reading) */
  type: QuestionType;
  /** Unique key for React rendering */
  key: string;
}

/** Result of answering a question */
export interface AnswerResult {
  question: QuizQuestion;
  userAnswer: string;
  isCorrect: boolean;
  correctAnswer: string;
}

/** Feedback state when showing incorrect answer */
export interface IncorrectFeedback {
  question: QuizQuestion;
  userAnswer: string;
  correctAnswer: string;
  mnemonic: string;
}

export interface LessonQuizProps {
  /** The items to quiz (typically 5 from the learning phase) */
  items: QuizItem[];
  /** Callback when a question is answered (for external tracking) */
  onAnswer?: (result: AnswerResult) => void;
  /** Callback when the quiz is complete (all questions answered correctly) */
  onQuizComplete?: (results: AnswerResult[]) => void;
  /** Auto-advance delay in ms for correct answers (default: 300) */
  autoAdvanceDelay?: number;
}

/**
 * Get the prompt text based on question type.
 */
function getQuestionPrompt(type: QuestionType): string {
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
 * Generates quiz questions for a set of items.
 * Each item gets a meaning question (and reading question if not a radical).
 * Questions are kept in order (not shuffled) - meaning first, then reading for each item.
 * This preserves the lesson order, unlike reviews which are randomized.
 */
export function generateQuizQuestions(items: QuizItem[]): QuizQuestion[] {
  const questions: QuizQuestion[] = [];

  for (const item of items) {
    // Every item has a meaning question
    questions.push({
      item,
      type: 'meaning',
      key: `${item.id}-meaning`,
    });

    // Non-radicals also have a reading question
    if (item.subjectType !== 'radical') {
      questions.push({
        item,
        type: 'reading',
        key: `${item.id}-reading`,
      });
    }
  }

  // Lessons maintain order - do not shuffle
  return questions;
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

// ============================================
// Component
// ============================================

/**
 * LessonQuiz presents quiz questions for items from the learning phase.
 * Shows characters prominently with an input field for answers.
 * Meaning questions expect English text; reading questions use romaji-to-hiragana conversion.
 *
 * Answer handling:
 * - Correct answers: auto-advance to next question
 * - Incorrect answers: show correct answer + mnemonic, tap to continue
 * - Incorrect items are re-queued and return later until answered correctly
 */
export function LessonQuiz({
  items,
  onAnswer,
  onQuizComplete,
  autoAdvanceDelay = 300,
}: LessonQuizProps) {
  // Generate initial questions once when items change
  const initialQuestions = useMemo(() => generateQuizQuestions(items), [items]);

  // Question queue: includes initial questions + re-queued incorrect ones
  const [questionQueue, setQuestionQueue] =
    useState<QuizQuestion[]>(initialQuestions);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [inputValue, setInputValue] = useState('');
  const [displayValue, setDisplayValue] = useState('');
  const [pendingRomaji, setPendingRomaji] = useState('');
  const [results, setResults] = useState<AnswerResult[]>([]);
  const [incorrectFeedback, setIncorrectFeedback] =
    useState<IncorrectFeedback | null>(null);
  const [showCorrectFeedback, setShowCorrectFeedback] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Track completed questions (answered correctly)
  const [completedQuestionKeys, setCompletedQuestionKeys] = useState<
    Set<string>
  >(new Set());

  // Track answer counts to report in final results
  const answeredQuestionsCount = useRef(0);

  // Reset state when items change
  useEffect(() => {
    const newQuestions = generateQuizQuestions(items);
    setQuestionQueue(newQuestions);
    setCurrentQuestionIndex(0);
    setInputValue('');
    setDisplayValue('');
    setPendingRomaji('');
    setResults([]);
    setIncorrectFeedback(null);
    setShowCorrectFeedback(false);
    setCompletedQuestionKeys(new Set());
    answeredQuestionsCount.current = 0;
  }, [items]);

  const currentQuestion = questionQueue[currentQuestionIndex];
  const totalOriginalQuestions = initialQuestions.length;
  const isComplete = completedQuestionKeys.size >= totalOriginalQuestions;

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

  // Handle answer submission
  const handleSubmit = useCallback(() => {
    if (!currentQuestion || isSubmitting) return;

    setIsSubmitting(true);

    const { item, type } = currentQuestion;

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

    const result: AnswerResult = {
      question: currentQuestion,
      userAnswer: answer,
      isCorrect,
      correctAnswer,
    };

    // Notify parent
    onAnswer?.(result);
    setResults(prev => [...prev, result]);
    answeredQuestionsCount.current++;

    if (isCorrect) {
      // Mark question as completed
      setCompletedQuestionKeys(prev => new Set(prev).add(currentQuestion.key));

      // Show brief correct feedback then auto-advance
      setShowCorrectFeedback(true);
      setTimeout(() => {
        setShowCorrectFeedback(false);
        setIsSubmitting(false);

        // Check if quiz is now complete
        const newCompletedCount = completedQuestionKeys.size + 1;
        if (newCompletedCount >= totalOriginalQuestions) {
          // Quiz complete
          onQuizComplete?.([...results, result]);
        } else {
          advanceToNextQuestion();
        }
      }, autoAdvanceDelay);
    } else {
      // Show incorrect feedback
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

      // Re-queue the question to appear later
      setQuestionQueue(prev => [...prev, currentQuestion]);
      setIsSubmitting(false);
    }
  }, [
    currentQuestion,
    inputValue,
    isSubmitting,
    onAnswer,
    onQuizComplete,
    results,
    completedQuestionKeys.size,
    totalOriginalQuestions,
    autoAdvanceDelay,
    advanceToNextQuestion,
  ]);

  // Handle edge case of empty items array
  if (items.length === 0) {
    return (
      <View style={styles.container} testID="lesson-quiz-empty">
        <Text style={styles.emptyText}>No quiz questions available</Text>
      </View>
    );
  }

  // Handle quiz completion
  if (isComplete) {
    return (
      <View style={styles.container} testID="lesson-quiz-complete">
        <Text style={styles.completeText}>Quiz Complete!</Text>
        <Text style={styles.completeSubtext}>
          {answeredQuestionsCount.current} questions answered
        </Text>
      </View>
    );
  }

  // Handle case where we've gone past the queue (shouldn't happen, but be safe)
  if (!currentQuestion) {
    return (
      <View style={styles.container} testID="lesson-quiz-empty">
        <Text style={styles.emptyText}>Loading...</Text>
      </View>
    );
  }

  const { item, type } = currentQuestion;
  const backgroundColor = getSubjectColor(item.subjectType);
  const questionPrompt = getQuestionPrompt(type);
  const placeholder =
    type === 'meaning' ? 'Enter meaning...' : 'Type reading (romaji)...';

  // For reading input, show the converted hiragana + any pending romaji
  const displayText =
    type === 'reading' ? displayValue + pendingRomaji : displayValue;

  // Calculate progress: completed questions out of total original questions
  const progressCount = completedQuestionKeys.size + 1; // +1 for current question being worked on

  // If showing incorrect feedback, render the feedback view
  if (incorrectFeedback) {
    return (
      <View style={styles.container} testID="lesson-quiz-incorrect-feedback">
        {/* Progress indicator */}
        <View style={styles.progressContainer} testID="lesson-quiz-progress">
          <Text style={styles.progressText} testID="lesson-quiz-progress-text">
            {completedQuestionKeys.size} / {totalOriginalQuestions}
          </Text>
          <View style={styles.progressBar}>
            <View
              style={[
                styles.progressFill,
                {
                  width: `${
                    (completedQuestionKeys.size / totalOriginalQuestions) * 100
                  }%`,
                },
              ]}
              testID="lesson-quiz-progress-fill"
            />
          </View>
        </View>

        {/* Question type indicator bar */}
        <View
          style={[
            styles.questionTypeBar,
            incorrectFeedback.question.type === 'reading'
              ? styles.questionTypeBarReading
              : styles.questionTypeBarMeaning,
          ]}
          testID="lesson-quiz-question-type-bar"
        />

        {/* Character display with red tint for incorrect */}
        <View
          style={[styles.characterContainer, styles.incorrectHeader]}
          testID="lesson-quiz-character-container"
        >
          <Text style={styles.characters} testID="lesson-quiz-characters">
            {incorrectFeedback.question.item.characters ?? '?'}
          </Text>
          <Text
            style={styles.incorrectLabel}
            testID="lesson-quiz-incorrect-label"
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
              testID="lesson-quiz-your-answer-label"
            >
              Your Answer:
            </Text>
            <Text style={styles.userAnswer} testID="lesson-quiz-your-answer">
              {incorrectFeedback.userAnswer || '(empty)'}
            </Text>
          </View>

          {/* Correct answer */}
          <View style={styles.feedbackSection}>
            <Text
              style={styles.feedbackLabel}
              testID="lesson-quiz-correct-answer-label"
            >
              Correct Answer:
            </Text>
            <Text
              style={styles.correctAnswerText}
              testID="lesson-quiz-correct-answer"
            >
              {incorrectFeedback.correctAnswer}
            </Text>
          </View>

          {/* Mnemonic */}
          <View style={styles.feedbackSection}>
            <Text
              style={styles.feedbackLabel}
              testID="lesson-quiz-mnemonic-label"
            >
              {incorrectFeedback.question.type === 'meaning'
                ? 'Meaning Mnemonic:'
                : 'Reading Mnemonic:'}
            </Text>
            <Text style={styles.mnemonicText} testID="lesson-quiz-mnemonic">
              {incorrectFeedback.mnemonic}
            </Text>
          </View>
        </ScrollView>

        {/* Continue button */}
        <TouchableOpacity
          style={[styles.submitButton, styles.continueButton]}
          onPress={handleContinue}
          activeOpacity={0.8}
          testID="lesson-quiz-continue"
        >
          <Text style={styles.submitButtonText}>Continue</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      testID="lesson-quiz"
    >
      {/* Progress indicator */}
      <View style={styles.progressContainer} testID="lesson-quiz-progress">
        <Text style={styles.progressText} testID="lesson-quiz-progress-text">
          {progressCount > totalOriginalQuestions
            ? totalOriginalQuestions
            : progressCount}{' '}
          / {totalOriginalQuestions}
        </Text>
        <View style={styles.progressBar}>
          <View
            style={[
              styles.progressFill,
              {
                width: `${
                  (Math.min(progressCount, totalOriginalQuestions) /
                    totalOriginalQuestions) *
                  100
                }%`,
              },
            ]}
            testID="lesson-quiz-progress-fill"
          />
        </View>
      </View>

      {/* Question type indicator bar */}
      <View
        style={[
          styles.questionTypeBar,
          type === 'reading'
            ? styles.questionTypeBarReading
            : styles.questionTypeBarMeaning,
        ]}
        testID="lesson-quiz-question-type-bar"
      />

      {/* Character display - with green tint if showing correct feedback */}
      <View
        style={[
          styles.characterContainer,
          showCorrectFeedback ? styles.correctHeader : { backgroundColor },
        ]}
        testID="lesson-quiz-character-container"
      >
        <Text style={styles.characters} testID="lesson-quiz-characters">
          {item.characters ?? '?'}
        </Text>
        {showCorrectFeedback ? (
          <Text style={styles.correctLabel} testID="lesson-quiz-correct-label">
            Correct!
          </Text>
        ) : (
          <Text style={styles.subjectType} testID="lesson-quiz-subject-type">
            {item.subjectType.replace('_', ' ')}
          </Text>
        )}
      </View>

      {/* Question prompt */}
      <View style={styles.questionContainer}>
        <Text style={styles.questionPrompt} testID="lesson-quiz-prompt">
          {questionPrompt}
        </Text>
        <Text style={styles.questionType} testID="lesson-quiz-question-type">
          {type === 'meaning' ? 'MEANING' : 'READING'}
        </Text>
      </View>

      {/* Input area */}
      <View style={styles.inputContainer}>
        {/* For reading questions, show the converted display */}
        {type === 'reading' && displayText && (
          <Text
            style={styles.convertedDisplay}
            testID="lesson-quiz-converted-display"
          >
            {displayText}
          </Text>
        )}
        <TextInput
          style={[styles.input, { borderColor: backgroundColor }]}
          value={inputValue}
          onChangeText={handleInputChange}
          onSubmitEditing={handleSubmit}
          placeholder={placeholder}
          placeholderTextColor="#999"
          autoCapitalize={type === 'meaning' ? 'none' : 'none'}
          autoCorrect={false}
          autoComplete="off"
          keyboardType={type === 'reading' ? 'ascii-capable' : 'default'}
          returnKeyType="done"
          editable={!showCorrectFeedback}
          testID="lesson-quiz-input"
        />
      </View>

      {/* Submit button */}
      <TouchableOpacity
        style={[styles.submitButton, { backgroundColor }]}
        onPress={handleSubmit}
        disabled={showCorrectFeedback || isSubmitting}
        activeOpacity={0.8}
        testID="lesson-quiz-submit"
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
  progressText: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.text.secondary,
    fontWeight: '500',
    marginBottom: SPACING.sm,
    textAlign: 'center',
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
  questionContainer: {
    paddingVertical: SPACING.lg,
    paddingHorizontal: SPACING.lg,
    alignItems: 'center',
  },
  questionPrompt: {
    fontSize: FONT_SIZES.xl,
    fontWeight: '600',
    color: COLORS.text.primary,
    marginBottom: SPACING.xs,
  },
  questionType: {
    fontSize: FONT_SIZES.xs,
    fontWeight: '700',
    color: COLORS.text.tertiary,
    letterSpacing: 2,
  },
  inputContainer: {
    flex: 1,
    paddingHorizontal: SPACING.lg,
    justifyContent: 'center',
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
  // Correct feedback styles
  correctHeader: {
    backgroundColor: COLORS.feedback.correct,
  },
  correctLabel: {
    fontSize: FONT_SIZES.lg,
    fontWeight: 'bold',
    color: COLORS.text.inverse,
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
});
