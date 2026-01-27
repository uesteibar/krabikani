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
  isValidReadingInput,
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
import { ComponentDisplay } from './ComponentDisplay';

// ============================================
// Types
// ============================================

/** Component radical data for kanji items */
export interface QuizComponentRadical {
  /** Subject ID */
  id: number;
  /** Radical characters (null for image-only radicals) */
  characters: string | null;
  /** Primary meaning of the radical */
  meaning: string;
  /** JSON string of character images (for radicals without Unicode characters) */
  characterImages?: string | null;
}

/** Component kanji data for vocabulary items */
export interface QuizComponentKanji {
  /** Subject ID */
  id: number;
  /** Kanji character */
  characters: string;
  /** Primary meaning of the kanji */
  meaning: string;
  /** Primary reading of the kanji */
  reading: string;
}

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
  /** User-defined synonyms for meaning validation (optional) */
  userSynonyms?: string[];
  /** Component radicals for kanji items (optional) */
  componentRadicals?: QuizComponentRadical[];
  /** Component kanji for vocabulary items (optional) */
  componentKanji?: QuizComponentKanji[];
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
  /** Auto-advance delay in ms for correct answers (default: 500) */
  autoAdvanceDelay?: number;
  /** Callback when a component is pressed (for navigation to item detail) */
  onComponentPress?: (subjectId: number) => void;
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
  autoAdvanceDelay = 500,
  onComponentPress,
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
  const [isFuzzyMatch, setIsFuzzyMatch] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Track completed questions (answered correctly)
  const [completedQuestionKeys, setCompletedQuestionKeys] = useState<
    Set<string>
  >(new Set());

  // Track answer counts to report in final results
  const answeredQuestionsCount = useRef(0);

  // Ref for TextInput to enable auto-focus
  const inputRef = useRef<TextInputType>(null);

  // Shake animation for invalid reading submission
  const shakeAnimation = useRef(new Animated.Value(0)).current;

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
    setIsFuzzyMatch(false);
    setCompletedQuestionKeys(new Set());
    answeredQuestionsCount.current = 0;
  }, [items]);

  const currentQuestion = questionQueue[currentQuestionIndex];
  const totalOriginalQuestions = initialQuestions.length;
  const isComplete = completedQuestionKeys.size >= totalOriginalQuestions;

  // Auto-focus input when question changes or during correct feedback
  useEffect(() => {
    // Don't focus if showing incorrect feedback (user needs to tap Continue) or quiz is complete
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
    setIsFuzzyMatch(false);
  }, []);

  // Handle tap to continue after incorrect answer
  const handleContinue = useCallback(() => {
    advanceToNextQuestion();
  }, [advanceToNextQuestion]);

  // Handle "Mark as Correct" - treat incorrect answer as correct
  const handleMarkAsCorrect = useCallback(() => {
    if (!incorrectFeedback) return;

    const question = incorrectFeedback.question;

    // Mark question as completed (same as if answered correctly)
    setCompletedQuestionKeys(prev => new Set(prev).add(question.key));

    // Create result as if it were correct
    const result: AnswerResult = {
      question,
      userAnswer: incorrectFeedback.userAnswer,
      isCorrect: true,
      correctAnswer: incorrectFeedback.correctAnswer,
    };

    // Notify parent of the corrected result
    onAnswer?.(result);
    setResults(prev => [...prev, result]);

    // Remove the re-queued question (it was added when marked incorrect)
    // The question should be at the end of the queue since it was just re-queued
    setQuestionQueue(prev => {
      const newQueue = [...prev];
      // Find and remove the last occurrence of this question
      for (let i = newQueue.length - 1; i >= 0; i--) {
        if (newQueue[i].key === question.key) {
          newQueue.splice(i, 1);
          break;
        }
      }
      return newQueue;
    });

    // Check if quiz is now complete
    const newCompletedCount = completedQuestionKeys.size + 1;
    if (newCompletedCount >= totalOriginalQuestions) {
      // Quiz complete
      onQuizComplete?.([...results, result]);
    }

    // Advance to next question
    advanceToNextQuestion();
  }, [
    incorrectFeedback,
    onAnswer,
    onQuizComplete,
    results,
    completedQuestionKeys.size,
    totalOriginalQuestions,
    advanceToNextQuestion,
  ]);

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

  // Handle answer submission
  const handleSubmit = useCallback(() => {
    if (!currentQuestion || isSubmitting) return;

    const { item, type } = currentQuestion;

    // For reading questions, validate that input is non-empty and valid hiragana
    if (type === 'reading') {
      if (!isValidReadingInput(inputValue)) {
        // Input is empty or contains invalid characters - shake and reject
        triggerShake();
        return;
      }
    }

    setIsSubmitting(true);

    // Get the final answer
    const answer =
      type === 'reading' ? romajiToHiragana(inputValue) : inputValue.trim();

    // Validate the answer
    let isCorrect = false;
    let fuzzyMatch = false;
    if (type === 'meaning') {
      const validationResult = validateMeaningAnswer(
        answer,
        item.meanings,
        item.auxiliaryMeanings ?? [],
        item.userSynonyms ?? [],
      );
      isCorrect = validationResult.isCorrect;
      fuzzyMatch = validationResult.isFuzzyMatch ?? false;
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
      setIsFuzzyMatch(fuzzyMatch);
      setTimeout(() => {
        setShowCorrectFeedback(false);
        setIsFuzzyMatch(false);
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
    triggerShake,
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
            <MnemonicText
              text={incorrectFeedback.mnemonic}
              style={styles.mnemonicText}
              testID="lesson-quiz-mnemonic"
            />
          </View>

          {/* Component radicals for kanji items */}
          {incorrectFeedback.question.item.subjectType === 'kanji' &&
            incorrectFeedback.question.item.componentRadicals &&
            incorrectFeedback.question.item.componentRadicals.length > 0 && (
              <View
                style={styles.feedbackSection}
                testID="lesson-quiz-component-radicals"
              >
                <Text style={styles.feedbackLabel}>Made up of:</Text>
                <View style={styles.componentsRow}>
                  {incorrectFeedback.question.item.componentRadicals.map(
                    radical => (
                      <ComponentDisplay
                        key={radical.id}
                        subjectType="radical"
                        characters={radical.characters}
                        meaning={radical.meaning}
                        characterImages={radical.characterImages}
                        onPress={
                          onComponentPress
                            ? () => onComponentPress(radical.id)
                            : undefined
                        }
                        testID={`lesson-quiz-component-${radical.id}`}
                      />
                    ),
                  )}
                </View>
              </View>
            )}

          {/* Component kanji for vocabulary items */}
          {(incorrectFeedback.question.item.subjectType === 'vocabulary' ||
            incorrectFeedback.question.item.subjectType ===
              'kana_vocabulary') &&
            incorrectFeedback.question.item.componentKanji &&
            incorrectFeedback.question.item.componentKanji.length > 0 && (
              <View
                style={styles.feedbackSection}
                testID="lesson-quiz-component-kanji"
              >
                <Text style={styles.feedbackLabel}>Made up of:</Text>
                <View style={styles.componentsRow}>
                  {incorrectFeedback.question.item.componentKanji.map(kanji => (
                    <ComponentDisplay
                      key={kanji.id}
                      subjectType="kanji"
                      characters={kanji.characters}
                      meaning={kanji.meaning}
                      displayText={
                        incorrectFeedback.question.type === 'reading'
                          ? kanji.reading
                          : undefined
                      }
                      onPress={
                        onComponentPress
                          ? () => onComponentPress(kanji.id)
                          : undefined
                      }
                      testID={`lesson-quiz-component-kanji-${kanji.id}`}
                    />
                  ))}
                </View>
              </View>
            )}
        </ScrollView>

        {/* Button row: Mark as Correct + Continue */}
        <View style={styles.incorrectButtonRow}>
          <TouchableOpacity
            style={styles.markCorrectButton}
            onPress={handleMarkAsCorrect}
            activeOpacity={0.8}
            testID="lesson-quiz-mark-correct"
          >
            <Text style={styles.markCorrectButtonText}>Mark as Correct</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.submitButton,
              styles.continueButton,
              styles.continueButtonFlex,
            ]}
            onPress={handleContinue}
            activeOpacity={0.8}
            testID="lesson-quiz-continue"
          >
            <Text style={styles.submitButtonText}>Continue</Text>
          </TouchableOpacity>
        </View>
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

      {/* Character display - with green/yellow tint if showing correct feedback */}
      <View
        style={[
          styles.characterContainer,
          showCorrectFeedback
            ? isFuzzyMatch
              ? styles.fuzzyMatchHeader
              : styles.correctHeader
            : { backgroundColor },
        ]}
        testID="lesson-quiz-character-container"
      >
        <Text style={styles.characters} testID="lesson-quiz-characters">
          {item.characters ?? '?'}
        </Text>
        {showCorrectFeedback ? (
          <Text
            style={styles.correctLabel}
            testID={
              isFuzzyMatch
                ? 'lesson-quiz-fuzzy-match-label'
                : 'lesson-quiz-correct-label'
            }
          >
            {isFuzzyMatch ? 'Close enough!' : 'Correct!'}
          </Text>
        ) : (
          <Text style={styles.subjectType} testID="lesson-quiz-subject-type">
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
          testID="lesson-quiz-question-type"
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
        testID="lesson-quiz-input-container"
      >
        <TextInput
          ref={inputRef}
          style={[styles.input, { borderColor: backgroundColor }]}
          value={type === 'reading' ? displayText : inputValue}
          onChangeText={handleInputChange}
          onSubmitEditing={handleSubmit}
          placeholder={placeholder}
          placeholderTextColor="#999"
          autoCapitalize={type === 'meaning' ? 'none' : 'none'}
          autoCorrect={false}
          autoComplete="off"
          keyboardType={type === 'reading' ? 'ascii-capable' : 'default'}
          returnKeyType="done"
          blurOnSubmit={false}
          caretHidden={true}
          testID="lesson-quiz-input"
        />
      </Animated.View>

      {/* Spacer to push submit button to bottom */}
      <View style={styles.spacer} />

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
    fontWeight: '600',
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
  // Fuzzy match (typo-forgiven) feedback styles
  fuzzyMatchHeader: {
    backgroundColor: COLORS.feedback.fuzzyMatch,
  },
  correctLabel: {
    fontSize: FONT_SIZES.sm,
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
  componentsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.md,
  },
  continueButton: {
    backgroundColor: COLORS.neutral.gray600,
  },
  // Incorrect feedback button row
  incorrectButtonRow: {
    flexDirection: 'row',
    paddingHorizontal: SPACING.lg,
    paddingBottom: SPACING.lg,
    gap: SPACING.md,
  },
  continueButtonFlex: {
    flex: 1,
    margin: 0,
  },
  markCorrectButton: {
    paddingVertical: SPACING.lg,
    paddingHorizontal: SPACING.xl,
    minHeight: MIN_TOUCH_TARGET,
    borderRadius: BORDER_RADIUS.md,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.neutral.gray100,
    borderWidth: 2,
    borderColor: COLORS.neutral.gray400,
  },
  markCorrectButtonText: {
    fontSize: FONT_SIZES.sm,
    fontWeight: 'bold',
    color: COLORS.text.secondary,
  },
});
