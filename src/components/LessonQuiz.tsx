import React, { useState, useCallback, useMemo } from 'react';
import {
  StyleSheet,
  Text,
  TextInput,
  View,
  KeyboardAvoidingView,
  Platform,
  TouchableOpacity,
} from 'react-native';

import type { SubjectType, Meaning, Reading, KanjiReading, AuxiliaryMeaning } from '../api/types';
import { processRomajiInput, romajiToHiragana } from '../utils/romajiToHiragana';

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

export interface LessonQuizProps {
  /** The items to quiz (typically 5 from the learning phase) */
  items: QuizItem[];
  /** Callback when a question is answered (for external tracking) */
  onAnswer?: (result: AnswerResult) => void;
  /** Callback when the quiz is complete (all questions answered correctly) */
  onQuizComplete?: (results: AnswerResult[]) => void;
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
function getQuestionPrompt(type: QuestionType): string {
  return type === 'meaning' ? "What is the meaning?" : "What is the reading?";
}

/**
 * Get the primary meaning from the meanings array.
 */
function getPrimaryMeaning(meanings: Meaning[]): string {
  const primary = meanings.find(m => m.primary);
  return primary?.meaning ?? meanings[0]?.meaning ?? '';
}

/**
 * Get the primary reading from the readings array.
 */
function getPrimaryReading(readings: Reading[] | KanjiReading[] | null): string {
  if (!readings || readings.length === 0) return '';
  const primary = readings.find(r => r.primary);
  return primary?.reading ?? readings[0]?.reading ?? '';
}

/**
 * Generates quiz questions for a set of items.
 * Each item gets a meaning question (and reading question if not a radical).
 * The order of questions is randomized, and for each item, whether meaning
 * or reading comes first is also randomized.
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

  // Shuffle the questions using Fisher-Yates algorithm
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
 */
export function LessonQuiz({
  items,
  onAnswer,
  onQuizComplete,
}: LessonQuizProps) {
  // Generate questions once when items change
  const questions = useMemo(() => generateQuizQuestions(items), [items]);

  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [inputValue, setInputValue] = useState('');
  const [displayValue, setDisplayValue] = useState('');
  const [pendingRomaji, setPendingRomaji] = useState('');
  const [results, setResults] = useState<AnswerResult[]>([]);

  const currentQuestion = questions[currentQuestionIndex];
  const totalQuestions = questions.length;
  const isComplete = currentQuestionIndex >= totalQuestions;

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
          {results.length} questions answered
        </Text>
      </View>
    );
  }

  const { item, type } = currentQuestion;
  const backgroundColor = getSubjectColor(item.subjectType);
  const questionPrompt = getQuestionPrompt(type);
  const placeholder = type === 'meaning' ? 'Enter meaning...' : 'Type reading (romaji)...';

  // For reading input, show the converted hiragana + any pending romaji
  const displayText = type === 'reading'
    ? displayValue + pendingRomaji
    : displayValue;

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      testID="lesson-quiz"
    >
      {/* Progress indicator */}
      <View style={styles.progressContainer} testID="lesson-quiz-progress">
        <Text style={styles.progressText} testID="lesson-quiz-progress-text">
          {currentQuestionIndex + 1} / {totalQuestions}
        </Text>
        <View style={styles.progressBar}>
          <View
            style={[
              styles.progressFill,
              { width: `${((currentQuestionIndex + 1) / totalQuestions) * 100}%` },
            ]}
            testID="lesson-quiz-progress-fill"
          />
        </View>
      </View>

      {/* Character display */}
      <View style={[styles.characterContainer, { backgroundColor }]} testID="lesson-quiz-character-container">
        <Text style={styles.characters} testID="lesson-quiz-characters">
          {item.characters ?? '?'}
        </Text>
        <Text style={styles.subjectType} testID="lesson-quiz-subject-type">
          {item.subjectType.replace('_', ' ')}
        </Text>
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
          <Text style={styles.convertedDisplay} testID="lesson-quiz-converted-display">
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
          autoCapitalize={type === 'meaning' ? 'none' : 'none'}
          autoCorrect={false}
          autoComplete="off"
          keyboardType={type === 'reading' ? 'ascii-capable' : 'default'}
          testID="lesson-quiz-input"
        />
      </View>

      {/* Submit button */}
      <TouchableOpacity
        style={[styles.submitButton, { backgroundColor }]}
        onPress={() => {
          // Get the final answer
          const answer = type === 'reading'
            ? romajiToHiragana(inputValue)
            : inputValue.trim();

          // Get correct answer for display
          const correctAnswer = type === 'meaning'
            ? getPrimaryMeaning(item.meanings)
            : getPrimaryReading(item.readings);

          // Simple validation for now - will be enhanced in US-018
          const isCorrect = false; // Placeholder - actual validation comes in next story

          const result: AnswerResult = {
            question: currentQuestion,
            userAnswer: answer,
            isCorrect,
            correctAnswer,
          };

          // Notify parent
          onAnswer?.(result);
          setResults(prev => [...prev, result]);

          // Move to next question
          setCurrentQuestionIndex(prev => prev + 1);
          setInputValue('');
          setDisplayValue('');
          setPendingRomaji('');

          // Check if quiz is complete
          if (currentQuestionIndex + 1 >= totalQuestions) {
            onQuizComplete?.([...results, result]);
          }
        }}
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
  progressText: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
    marginBottom: 8,
    textAlign: 'center',
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
});
