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
  BORDER_RADIUS,
  SPACING,
  FONT_SIZES,
} from '../theme';
import { ComponentDisplay } from './ComponentDisplay';
import { SubjectDisplay } from './SubjectDisplay';
import { QuestionTypeLabel } from './QuestionTypeLabel';
import { IncorrectFeedbackView } from './IncorrectFeedbackView';
import { CorrectFeedbackView } from './CorrectFeedbackView';
import { ProgressHeader } from './ProgressHeader';
import { Button } from './Button';
import { useShakeAnimation } from '../hooks/useShakeAnimation';
import { useAutoFocus } from '../hooks/useAutoFocus';
import { useQuestionInput } from '../hooks/useQuestionInput';

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
 * The final question array is shuffled so users don't memorize answers by position.
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

  return shuffleArray(questions);
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

  // Shared hooks
  const { shakeStyle, triggerShake } = useShakeAnimation();

  const currentQuestion = questionQueue[currentQuestionIndex];
  const totalOriginalQuestions = initialQuestions.length;
  const isComplete = completedQuestionKeys.size >= totalOriginalQuestions;

  // Use shared input hook
  const { inputValue, displayValue, clearInput, handleTextChange } =
    useQuestionInput(currentQuestion?.type ?? 'meaning');

  // Auto-focus input when question changes or during correct feedback
  useAutoFocus(inputRef, [
    currentQuestionIndex,
    incorrectFeedback,
    showCorrectFeedback,
    isComplete,
  ]);

  // Disable auto-focus during incorrect feedback or completion
  // The useAutoFocus hook runs on dependency changes, but we prevent focus
  // in the component by conditionally rendering the input only when appropriate

  // Reset state when items change
  useEffect(() => {
    const newQuestions = generateQuizQuestions(items);
    setQuestionQueue(newQuestions);
    setCurrentQuestionIndex(0);
    clearInput();
    setResults([]);
    setIncorrectFeedback(null);
    setShowCorrectFeedback(false);
    setIsFuzzyMatch(false);
    setCompletedQuestionKeys(new Set());
    answeredQuestionsCount.current = 0;
  }, [items, clearInput]);

  // Advance to next question (clearing input and feedback)
  const advanceToNextQuestion = useCallback(() => {
    setCurrentQuestionIndex(prev => prev + 1);
    clearInput();
    setIncorrectFeedback(null);
    setShowCorrectFeedback(false);
    setIsFuzzyMatch(false);
  }, [clearInput]);

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
  const inputDisplayText = type === 'reading' ? displayValue : inputValue;

  // Calculate progress: completed questions out of total original questions
  const progressCount = completedQuestionKeys.size + 1; // +1 for current question being worked on

  // Build details content for incorrect feedback (component radicals/kanji)
  const renderIncorrectDetailsContent = () => {
    if (!incorrectFeedback) return undefined;
    const feedbackItem = incorrectFeedback.question.item;
    const feedbackType = incorrectFeedback.question.type;

    const sections: React.ReactNode[] = [];

    // Component radicals for kanji items
    if (
      feedbackItem.subjectType === 'kanji' &&
      feedbackItem.componentRadicals &&
      feedbackItem.componentRadicals.length > 0
    ) {
      sections.push(
        <View
          key="component-radicals"
          style={styles.feedbackSection}
          testID="lesson-quiz-component-radicals"
        >
          <Text style={styles.feedbackLabel}>Made up of:</Text>
          <View style={styles.componentsRow}>
            {feedbackItem.componentRadicals.map(radical => (
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
            ))}
          </View>
        </View>,
      );
    }

    // Component kanji for vocabulary items
    if (
      (feedbackItem.subjectType === 'vocabulary' ||
        feedbackItem.subjectType === 'kana_vocabulary') &&
      feedbackItem.componentKanji &&
      feedbackItem.componentKanji.length > 0
    ) {
      sections.push(
        <View
          key="component-kanji"
          style={styles.feedbackSection}
          testID="lesson-quiz-component-kanji"
        >
          <Text style={styles.feedbackLabel}>Made up of:</Text>
          <View style={styles.componentsRow}>
            {feedbackItem.componentKanji.map(kanji => (
              <ComponentDisplay
                key={kanji.id}
                subjectType="kanji"
                characters={kanji.characters}
                meaning={kanji.meaning}
                displayText={
                  feedbackType === 'reading' ? kanji.reading : undefined
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
        </View>,
      );
    }

    return sections.length > 0 ? <>{sections}</> : undefined;
  };

  // If showing incorrect feedback, render the feedback view
  if (incorrectFeedback) {
    const feedbackItem = incorrectFeedback.question.item;

    return (
      <View style={styles.container} testID="lesson-quiz-incorrect-feedback">
        <ProgressHeader
          mode="progress"
          current={completedQuestionKeys.size}
          total={totalOriginalQuestions}
        />

        <IncorrectFeedbackView
          subjectType={feedbackItem.subjectType}
          displayText={feedbackItem.characters ?? '?'}
          displayMode="characters"
          userAnswer={incorrectFeedback.userAnswer}
          correctAnswer={incorrectFeedback.correctAnswer}
          mnemonic={incorrectFeedback.mnemonic}
          mnemonicLabel={
            incorrectFeedback.question.type === 'meaning'
              ? 'Meaning Mnemonic:'
              : 'Reading Mnemonic:'
          }
          onContinue={handleContinue}
          onMarkCorrect={handleMarkAsCorrect}
          detailsContent={renderIncorrectDetailsContent()}
          testID="lesson-quiz"
        />
      </View>
    );
  }

  // If showing correct feedback, render CorrectFeedbackView
  if (showCorrectFeedback) {
    return (
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        testID="lesson-quiz"
      >
        <ProgressHeader
          mode="progress"
          current={
            progressCount > totalOriginalQuestions
              ? totalOriginalQuestions
              : progressCount
          }
          total={totalOriginalQuestions}
        />

        <CorrectFeedbackView
          subjectType={item.subjectType}
          displayText={item.characters ?? '?'}
          displayMode="characters"
          feedbackState={isFuzzyMatch ? 'fuzzyMatch' : 'correct'}
          questionType={type}
          inputValue={inputDisplayText}
        />

        {/* Spacer to push submit button to bottom */}
        <View style={styles.spacer} />

        <Button
          label="Submit"
          onPress={handleSubmit}
          disabled={true}
          style={[styles.submitButtonStyle, { backgroundColor }]}
          testID="lesson-quiz-submit"
        />
      </KeyboardAvoidingView>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      testID="lesson-quiz"
    >
      <ProgressHeader
        mode="progress"
        current={
          progressCount > totalOriginalQuestions
            ? totalOriginalQuestions
            : progressCount
        }
        total={totalOriginalQuestions}
      />

      {/* Character display */}
      <SubjectDisplay
        subjectType={item.subjectType}
        displayMode="characters"
        displayText={item.characters ?? '?'}
        subjectTypeLabel={item.subjectType.replace('_', ' ')}
        testID="lesson-quiz-character-container"
      />

      {/* Question type label */}
      <QuestionTypeLabel
        type={type}
        testID="lesson-quiz-question-type"
      />

      {/* Input area */}
      <Animated.View
        style={[styles.inputContainer, shakeStyle]}
        testID="lesson-quiz-input-container"
      >
        <TextInput
          ref={inputRef}
          style={[styles.input, { borderColor: backgroundColor }]}
          value={inputDisplayText}
          onChangeText={handleTextChange}
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
          testID="lesson-quiz-input"
        />
      </Animated.View>

      {/* Spacer to push submit button to bottom */}
      <View style={styles.spacer} />

      {/* Submit button */}
      <Button
        label="Submit"
        onPress={handleSubmit}
        disabled={showCorrectFeedback || isSubmitting}
        style={[styles.submitButtonStyle, { backgroundColor }]}
        testID="lesson-quiz-submit"
      />
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
  inputContainer: {
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.md,
    paddingBottom: SPACING.sm,
  },
  spacer: {
    flex: 1,
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
  submitButtonStyle: {
    margin: SPACING.lg,
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
  componentsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.md,
  },
});
