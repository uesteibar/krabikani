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
} from 'react-native';

import type {
  SubjectType,
  Meaning,
  Reading,
  KanjiReading,
  AuxiliaryMeaning,
} from '../api/types';
import {
  COLORS,
  SPACING,
  FONT_SIZES,
} from '../theme';
import { ComponentDisplay } from './ComponentDisplay';
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
type QuestionType = 'meaning' | 'reading';

/** A single quiz question */
interface QuizQuestion {
  /** The item being quizzed */
  item: QuizItem;
  /** The type of question (meaning or reading) */
  type: QuestionType;
  /** Unique key for React rendering */
  key: string;
}

/** Result of answering a question */
interface AnswerResult {
  question: QuizQuestion;
  userAnswer: string;
  isCorrect: boolean;
  correctAnswer: string;
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

/**
 * Convert a QuizQuestion to a unified Question for QuizEngine.
 */
function quizQuestionToQuestion(qq: QuizQuestion): Question {
  const { item, type, key } = qq;
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
 * Build a lookup map from question ID back to QuizQuestion.
 */
function buildQuestionMap(
  quizQuestions: QuizQuestion[],
): Map<string, QuizQuestion> {
  const map = new Map<string, QuizQuestion>();
  for (const qq of quizQuestions) {
    map.set(qq.key, qq);
  }
  return map;
}

// ============================================
// Component
// ============================================

/**
 * LessonQuiz presents quiz questions for items from the learning phase.
 * Uses QuizEngine internally for the quiz loop.
 */
export function LessonQuiz({
  items,
  onAnswer,
  onQuizComplete,
  autoAdvanceDelay = 500,
  onComponentPress,
}: LessonQuizProps) {
  // Generate initial questions once when items change
  const initialQuizQuestions = useMemo(
    () => generateQuizQuestions(items),
    [items],
  );

  // Convert to unified Questions for QuizEngine
  const initialQuestions = useMemo(
    () => initialQuizQuestions.map(quizQuestionToQuestion),
    [initialQuizQuestions],
  );

  // Build lookup map from question ID to QuizQuestion
  const questionMapRef = useRef(buildQuestionMap(initialQuizQuestions));
  useEffect(() => {
    questionMapRef.current = buildQuestionMap(initialQuizQuestions);
  }, [initialQuizQuestions]);

  // Track answer results for onQuizComplete callback
  const resultsRef = useRef<AnswerResult[]>([]);
  const answeredQuestionsCount = useRef(0);

  // Track completed question count for progress display
  const [completedCount, setCompletedCount] = useState(0);
  const totalQuestions = initialQuestions.length;

  // Reset state when items change
  useEffect(() => {
    resultsRef.current = [];
    setCompletedCount(0);
    answeredQuestionsCount.current = 0;
  }, [items]);

  // Handle answer from QuizEngine
  const handleAnswer = useCallback(
    (event: QuizAnswerEvent) => {
      const { question, result: quizResult } = event;
      const qq = questionMapRef.current.get(question.id);
      if (!qq) return;

      const isCorrect =
        quizResult.status === 'correct' || quizResult.status === 'fuzzyMatch';

      const answerResult: AnswerResult = {
        question: qq,
        userAnswer: quizResult.userAnswer,
        isCorrect,
        correctAnswer: quizResult.correctAnswer,
      };

      onAnswer?.(answerResult);
      resultsRef.current = [...resultsRef.current, answerResult];
      answeredQuestionsCount.current++;

      if (isCorrect) {
        setCompletedCount(prev => prev + 1);
      }
    },
    [onAnswer],
  );

  // Handle mark as correct from QuizEngine
  const handleMarkCorrect = useCallback(
    (question: Question, userAnswer: string) => {
      const qq = questionMapRef.current.get(question.id);
      if (!qq) return;

      const answerResult: AnswerResult = {
        question: qq,
        userAnswer,
        isCorrect: true,
        correctAnswer: '',
      };

      onAnswer?.(answerResult);
      resultsRef.current = [...resultsRef.current, answerResult];

      setCompletedCount(prev => prev + 1);
    },
    [onAnswer],
  );

  // Handle quiz completion
  const handleComplete = useCallback(() => {
    onQuizComplete?.(resultsRef.current);
  }, [onQuizComplete]);

  // Render details content (component radicals/kanji) for incorrect feedback
  const renderDetailsContent = useCallback(
    (question: Question): React.ReactNode | undefined => {
      const qq = questionMapRef.current.get(question.id);
      if (!qq) return undefined;

      const feedbackItem = qq.item;
      const feedbackType = qq.type;
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
            style={detailStyles.feedbackSection}
            testID="lesson-quiz-component-radicals"
          >
            <Text style={detailStyles.feedbackLabel}>Made up of:</Text>
            <View style={detailStyles.componentsRow}>
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
            style={detailStyles.feedbackSection}
            testID="lesson-quiz-component-kanji"
          >
            <Text style={detailStyles.feedbackLabel}>Made up of:</Text>
            <View style={detailStyles.componentsRow}>
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
    },
    [onComponentPress],
  );

  // Render empty state
  const renderEmpty = useCallback((): React.ReactNode => {
    return (
      <View style={styles.container} testID="lesson-quiz-empty">
        <Text style={styles.emptyText}>No quiz questions available</Text>
      </View>
    );
  }, []);

  // Render completion screen
  const renderCompletion = useCallback((): React.ReactNode => {
    return (
      <View style={styles.container}>
        <Text style={styles.completeText}>Quiz Complete!</Text>
        <Text style={styles.completeSubtext}>
          {answeredQuestionsCount.current} questions answered
        </Text>
      </View>
    );
  }, []);

  // Compute progress mode
  const progressMode: ProgressMode = useMemo(() => {
    const current = Math.min(completedCount + 1, totalQuestions);
    return {
      mode: 'progress',
      current: completedCount === totalQuestions ? totalQuestions : current,
      total: totalQuestions,
    };
  }, [completedCount, totalQuestions]);

  // Build QuizEngine config
  const quizConfig: QuizEngineConfig = useMemo(
    () => ({
      questions: initialQuestions,
      progressMode,
      completionMode: 'allQuestions',
      allowMarkCorrect: true,
      allowAddSynonym: false,
      requeueIncorrect: true,
      showSrsBadge: false,
      showSubjectTypeLabel: true,
      onAnswer: handleAnswer,
      onComplete: handleComplete,
      onMarkCorrect: handleMarkCorrect,
      renderDetailsContent,
      renderCompletion,
      renderEmpty,
      autoAdvanceDelay,
      testID: 'lesson-quiz',
      subjectDisplayTestIDSuffix: 'character-container',
    }),
    [
      initialQuestions,
      progressMode,
      handleAnswer,
      handleComplete,
      handleMarkCorrect,
      renderDetailsContent,
      renderCompletion,
      renderEmpty,
      autoAdvanceDelay,
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
});

const detailStyles = StyleSheet.create({
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
