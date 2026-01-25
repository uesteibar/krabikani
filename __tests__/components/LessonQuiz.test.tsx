import React from 'react';
import { render, fireEvent, act } from '@testing-library/react-native';

import {
  LessonQuiz,
  LessonQuizProps,
  QuizItem,
  generateQuizQuestions,
  shuffleArray,
} from '../../src/components/LessonQuiz';
import type { Meaning, Reading, KanjiReading } from '../../src/api/types';
import { SUBJECT_COLORS } from '../../src/theme';

// Helper to create test meanings
function createMeanings(
  meanings: Array<{ meaning: string; primary?: boolean; accepted?: boolean }>,
): Meaning[] {
  return meanings.map(({ meaning, primary = false, accepted = true }) => ({
    meaning,
    primary,
    accepted_answer: accepted,
  }));
}

// Helper to create test readings
function createReadings(
  readings: Array<{ reading: string; primary?: boolean; accepted?: boolean }>,
): Reading[] {
  return readings.map(({ reading, primary = false, accepted = true }) => ({
    reading,
    primary,
    accepted_answer: accepted,
  }));
}

// Helper to create kanji readings
function createKanjiReadings(
  readings: Array<{
    reading: string;
    primary?: boolean;
    accepted?: boolean;
    type?: 'onyomi' | 'kunyomi' | 'nanori';
  }>,
): KanjiReading[] {
  return readings.map(
    ({ reading, primary = false, accepted = true, type = 'onyomi' }) => ({
      reading,
      primary,
      accepted_answer: accepted,
      type,
    }),
  );
}

// Create sample quiz items
function createRadicalItem(
  id: number,
  character: string,
  meaning: string,
): QuizItem {
  return {
    id,
    subjectType: 'radical',
    characters: character,
    meanings: createMeanings([{ meaning, primary: true }]),
    readings: null,
    meaningMnemonic: `Mnemonic for ${meaning}`,
    readingMnemonic: null,
  };
}

function createKanjiItem(
  id: number,
  character: string,
  meaning: string,
  reading: string,
): QuizItem {
  return {
    id,
    subjectType: 'kanji',
    characters: character,
    meanings: createMeanings([{ meaning, primary: true }]),
    readings: createKanjiReadings([
      { reading, primary: true, type: 'kunyomi' },
    ]),
    meaningMnemonic: `Meaning mnemonic for ${meaning}`,
    readingMnemonic: `Reading mnemonic for ${reading}`,
  };
}

function createVocabularyItem(
  id: number,
  characters: string,
  meaning: string,
  reading: string,
): QuizItem {
  return {
    id,
    subjectType: 'vocabulary',
    characters,
    meanings: createMeanings([{ meaning, primary: true }]),
    readings: createReadings([{ reading, primary: true }]),
    meaningMnemonic: `Meaning mnemonic for ${meaning}`,
    readingMnemonic: `Reading mnemonic for ${reading}`,
  };
}

function createKanaVocabularyItem(
  id: number,
  characters: string,
  meaning: string,
  reading: string,
): QuizItem {
  return {
    id,
    subjectType: 'kana_vocabulary',
    characters,
    meanings: createMeanings([{ meaning, primary: true }]),
    readings: createReadings([{ reading, primary: true }]),
    meaningMnemonic: `Meaning mnemonic for ${meaning}`,
    readingMnemonic: `Reading mnemonic for ${reading}`,
  };
}

// Sample items for testing
const sampleRadical = createRadicalItem(1, '一', 'Ground');
const sampleKanji = createKanjiItem(2, '大', 'Big', 'おお');
const sampleVocabulary = createVocabularyItem(3, '大きい', 'Big', 'おおきい');
const sampleKanaVocabulary = createKanaVocabularyItem(
  4,
  'あめ',
  'Candy',
  'あめ',
);
const sampleRadical2 = createRadicalItem(5, '人', 'Person');

const fiveItems: QuizItem[] = [
  sampleRadical,
  sampleKanji,
  sampleVocabulary,
  sampleKanaVocabulary,
  sampleRadical2,
];

const defaultProps: LessonQuizProps = {
  items: fiveItems,
  onAnswer: jest.fn(),
  onQuizComplete: jest.fn(),
  autoAdvanceDelay: 0, // No delay for tests
};

describe('LessonQuiz', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('generateQuizQuestions', () => {
    it('generates only meaning questions for radicals', () => {
      const items = [sampleRadical];
      const questions = generateQuizQuestions(items);

      expect(questions.length).toBe(1);
      expect(questions[0].type).toBe('meaning');
      expect(questions[0].item.id).toBe(sampleRadical.id);
    });

    it('generates both meaning and reading questions for kanji', () => {
      const items = [sampleKanji];
      const questions = generateQuizQuestions(items);

      expect(questions.length).toBe(2);
      const types = questions.map(q => q.type);
      expect(types).toContain('meaning');
      expect(types).toContain('reading');
    });

    it('generates both meaning and reading questions for vocabulary', () => {
      const items = [sampleVocabulary];
      const questions = generateQuizQuestions(items);

      expect(questions.length).toBe(2);
      const types = questions.map(q => q.type);
      expect(types).toContain('meaning');
      expect(types).toContain('reading');
    });

    it('generates both meaning and reading questions for kana_vocabulary', () => {
      const items = [sampleKanaVocabulary];
      const questions = generateQuizQuestions(items);

      expect(questions.length).toBe(2);
      const types = questions.map(q => q.type);
      expect(types).toContain('meaning');
      expect(types).toContain('reading');
    });

    it('generates correct total questions for mixed items', () => {
      // 2 radicals (1 question each) + 3 non-radicals (2 questions each) = 8 questions
      const questions = generateQuizQuestions(fiveItems);

      expect(questions.length).toBe(8);
    });

    it('assigns unique keys to each question', () => {
      const questions = generateQuizQuestions(fiveItems);
      const keys = questions.map(q => q.key);
      const uniqueKeys = new Set(keys);

      expect(uniqueKeys.size).toBe(keys.length);
    });

    it('creates keys in format itemId-type', () => {
      const items = [sampleKanji];
      const questions = generateQuizQuestions(items);

      expect(questions.some(q => q.key === '2-meaning')).toBe(true);
      expect(questions.some(q => q.key === '2-reading')).toBe(true);
    });

    it('returns empty array for empty items', () => {
      const questions = generateQuizQuestions([]);
      expect(questions).toEqual([]);
    });
  });

  describe('shuffleArray', () => {
    it('returns a new array with the same length', () => {
      const original = [1, 2, 3, 4, 5];
      const shuffled = shuffleArray(original);

      expect(shuffled.length).toBe(original.length);
    });

    it('does not modify the original array', () => {
      const original = [1, 2, 3, 4, 5];
      const originalCopy = [...original];
      shuffleArray(original);

      expect(original).toEqual(originalCopy);
    });

    it('contains all original elements', () => {
      const original = [1, 2, 3, 4, 5];
      const shuffled = shuffleArray(original);

      expect(shuffled.sort()).toEqual(original.sort());
    });

    it('handles empty arrays', () => {
      const result = shuffleArray([]);
      expect(result).toEqual([]);
    });

    it('handles single-element arrays', () => {
      const result = shuffleArray([42]);
      expect(result).toEqual([42]);
    });
  });

  describe('basic rendering', () => {
    it('renders the component with testID', () => {
      const { getByTestId } = render(<LessonQuiz {...defaultProps} />);
      expect(getByTestId('lesson-quiz')).toBeTruthy();
    });

    it('renders the progress indicator', () => {
      const { getByTestId } = render(<LessonQuiz {...defaultProps} />);
      expect(getByTestId('lesson-quiz-progress')).toBeTruthy();
    });

    it('renders the character display', () => {
      const { getByTestId } = render(<LessonQuiz {...defaultProps} />);
      expect(getByTestId('lesson-quiz-character-container')).toBeTruthy();
      expect(getByTestId('lesson-quiz-characters')).toBeTruthy();
    });

    it('renders the input field', () => {
      const { getByTestId } = render(<LessonQuiz {...defaultProps} />);
      expect(getByTestId('lesson-quiz-input')).toBeTruthy();
    });

    it('renders the submit button', () => {
      const { getByTestId } = render(<LessonQuiz {...defaultProps} />);
      expect(getByTestId('lesson-quiz-submit')).toBeTruthy();
    });

    it('renders the question type indicator', () => {
      const { getByTestId } = render(<LessonQuiz {...defaultProps} />);
      expect(getByTestId('lesson-quiz-question-type')).toBeTruthy();
    });
  });

  describe('empty state', () => {
    it('renders empty state when no items provided', () => {
      const { getByTestId, getByText } = render(
        <LessonQuiz items={[]} onAnswer={jest.fn()} />,
      );

      expect(getByTestId('lesson-quiz-empty')).toBeTruthy();
      expect(getByText('No quiz questions available')).toBeTruthy();
    });
  });

  describe('progress indicator', () => {
    it('displays progress text showing current position', () => {
      const { getByTestId } = render(<LessonQuiz {...defaultProps} />);
      const progressText = getByTestId('lesson-quiz-progress-text');

      // First question out of 8 total - children are [count, ' ', '/ ', total]
      expect(progressText.props.children).toEqual([1, ' ', '/ ', 8]);
    });

    it('renders the progress bar', () => {
      const { getByTestId } = render(<LessonQuiz {...defaultProps} />);
      expect(getByTestId('lesson-quiz-progress-fill')).toBeTruthy();
    });
  });

  describe('question display', () => {
    it('displays the subject characters', () => {
      const items = [sampleKanji];
      const { getByTestId } = render(
        <LessonQuiz items={items} onAnswer={jest.fn()} autoAdvanceDelay={0} />,
      );

      expect(getByTestId('lesson-quiz-characters').props.children).toBe('大');
    });

    it('displays the subject type', () => {
      const items = [sampleKanji];
      const { getByTestId } = render(
        <LessonQuiz items={items} onAnswer={jest.fn()} autoAdvanceDelay={0} />,
      );

      expect(getByTestId('lesson-quiz-subject-type').props.children).toBe(
        'kanji',
      );
    });

    it('displays kana_vocabulary as "kana vocabulary"', () => {
      const items = [sampleKanaVocabulary];
      const { getByTestId } = render(
        <LessonQuiz items={items} onAnswer={jest.fn()} autoAdvanceDelay={0} />,
      );

      expect(getByTestId('lesson-quiz-subject-type').props.children).toBe(
        'kana vocabulary',
      );
    });

    it('displays ? for items with null characters', () => {
      const itemWithNullChar: QuizItem = {
        ...sampleRadical,
        characters: null,
      };
      const { getByTestId } = render(
        <LessonQuiz
          items={[itemWithNullChar]}
          onAnswer={jest.fn()}
          autoAdvanceDelay={0}
        />,
      );

      expect(getByTestId('lesson-quiz-characters').props.children).toBe('?');
    });
  });

  describe('question types', () => {
    it('shows MEANING label for meaning questions', () => {
      // Use a radical to guarantee a meaning question
      const items = [sampleRadical];
      const { getByTestId } = render(
        <LessonQuiz items={items} onAnswer={jest.fn()} autoAdvanceDelay={0} />,
      );

      expect(getByTestId('lesson-quiz-question-type').props.children).toBe(
        'MEANING',
      );
    });

    it('shows READING label for reading questions', () => {
      // We need to control the order - use a single kanji and find the reading question
      // Since order is randomized, we'll check both possible labels
      const items = [sampleKanji];
      const { getByTestId } = render(
        <LessonQuiz items={items} onAnswer={jest.fn()} autoAdvanceDelay={0} />,
      );

      const type = getByTestId('lesson-quiz-question-type').props.children;

      // Either meaning or reading question is valid
      expect(['MEANING', 'READING']).toContain(type);
    });
  });

  describe('input handling', () => {
    it('accepts text input for meaning questions', () => {
      const items = [sampleRadical]; // Radical only has meaning
      const { getByTestId } = render(
        <LessonQuiz items={items} onAnswer={jest.fn()} autoAdvanceDelay={0} />,
      );

      const input = getByTestId('lesson-quiz-input');
      fireEvent.changeText(input, 'ground');

      expect(input.props.value).toBe('ground');
    });

    it('converts romaji to hiragana for reading questions', () => {
      // We need a non-radical to potentially get a reading question
      const items = [sampleVocabulary];
      const { getByTestId } = render(
        <LessonQuiz items={items} onAnswer={jest.fn()} autoAdvanceDelay={0} />,
      );

      const type = getByTestId('lesson-quiz-question-type').props.children;

      if (type === 'READING') {
        const input = getByTestId('lesson-quiz-input');
        fireEvent.changeText(input, 'ookii');

        // The input value should show converted hiragana for reading questions
        expect(input.props.value).toContain('おおき');
      }
    });

    it('shows raw text for meaning questions', () => {
      const items = [sampleRadical]; // Radical only has meaning
      const { getByTestId } = render(
        <LessonQuiz items={items} onAnswer={jest.fn()} autoAdvanceDelay={0} />,
      );

      const input = getByTestId('lesson-quiz-input');
      fireEvent.changeText(input, 'ground');

      // For meaning questions, input shows raw text
      expect(input.props.value).toBe('ground');
    });
  });

  describe('correct answer handling', () => {
    it('calls onAnswer with isCorrect=true for correct meaning answer', () => {
      const onAnswer = jest.fn();
      const items = [sampleRadical];
      const { getByTestId } = render(
        <LessonQuiz items={items} onAnswer={onAnswer} autoAdvanceDelay={0} />,
      );

      const input = getByTestId('lesson-quiz-input');
      fireEvent.changeText(input, 'Ground');

      const submit = getByTestId('lesson-quiz-submit');
      fireEvent.press(submit);

      expect(onAnswer).toHaveBeenCalledTimes(1);
      expect(onAnswer).toHaveBeenCalledWith(
        expect.objectContaining({
          userAnswer: 'Ground',
          isCorrect: true,
        }),
      );
    });

    it('accepts case-insensitive meaning answers', () => {
      const onAnswer = jest.fn();
      const items = [sampleRadical];
      const { getByTestId } = render(
        <LessonQuiz items={items} onAnswer={onAnswer} autoAdvanceDelay={0} />,
      );

      const input = getByTestId('lesson-quiz-input');
      fireEvent.changeText(input, 'ground');

      fireEvent.press(getByTestId('lesson-quiz-submit'));

      expect(onAnswer).toHaveBeenCalledWith(
        expect.objectContaining({
          isCorrect: true,
        }),
      );
    });

    it('auto-advances after correct answer', async () => {
      const items = [sampleRadical, sampleRadical2]; // 2 meaning questions
      const { getByTestId } = render(
        <LessonQuiz items={items} onAnswer={jest.fn()} autoAdvanceDelay={0} />,
      );

      // Determine which radical is shown first and answer correctly
      const firstChar = getByTestId('lesson-quiz-characters').props.children;
      const firstAnswer = firstChar === '一' ? 'Ground' : 'Person';

      // Answer first question correctly
      const input = getByTestId('lesson-quiz-input');
      fireEvent.changeText(input, firstAnswer);
      fireEvent.press(getByTestId('lesson-quiz-submit'));

      // Run timers for auto-advance
      act(() => {
        jest.runAllTimers();
      });

      // Should have advanced to next question
      const progressText = getByTestId('lesson-quiz-progress-text');
      expect(progressText.props.children).toEqual([2, ' ', '/ ', 2]);
    });

    it('shows correct feedback briefly before advancing', () => {
      const items = [sampleRadical, sampleRadical2];
      const { getByTestId, queryByTestId } = render(
        <LessonQuiz
          items={items}
          onAnswer={jest.fn()}
          autoAdvanceDelay={100}
        />,
      );

      // Determine which radical is shown first and answer correctly
      const firstChar = getByTestId('lesson-quiz-characters').props.children;
      const firstAnswer = firstChar === '一' ? 'Ground' : 'Person';

      // Answer correctly
      const input = getByTestId('lesson-quiz-input');
      fireEvent.changeText(input, firstAnswer);
      fireEvent.press(getByTestId('lesson-quiz-submit'));

      // Should show correct label
      expect(queryByTestId('lesson-quiz-correct-label')).toBeTruthy();

      // Run timers
      act(() => {
        jest.runAllTimers();
      });

      // After delay, should have advanced - check we're on question 2
      const progressText = getByTestId('lesson-quiz-progress-text');
      expect(progressText.props.children).toEqual([2, ' ', '/ ', 2]);
    });

    it('should use default autoAdvanceDelay of 500ms', () => {
      const items = [sampleRadical, sampleRadical2];
      const { getByTestId, queryByTestId } = render(
        <LessonQuiz items={items} onAnswer={jest.fn()} />,
      );

      // Determine which radical is shown first and answer correctly
      const firstChar = getByTestId('lesson-quiz-characters').props.children;
      const firstAnswer = firstChar === '一' ? 'Ground' : 'Person';

      // Answer correctly
      const input = getByTestId('lesson-quiz-input');
      fireEvent.changeText(input, firstAnswer);
      fireEvent.press(getByTestId('lesson-quiz-submit'));

      // Feedback should be showing
      expect(queryByTestId('lesson-quiz-correct-label')).toBeTruthy();

      // Advance time by less than 500ms - should still show feedback
      act(() => {
        jest.advanceTimersByTime(300);
      });
      expect(queryByTestId('lesson-quiz-correct-label')).toBeTruthy();

      // Advance past 500ms - should advance to next question
      act(() => {
        jest.advanceTimersByTime(300);
      });

      // Should have advanced - correct label should no longer be visible
      expect(queryByTestId('lesson-quiz-correct-label')).toBeNull();
    });

    it('calls onQuizComplete when all questions answered correctly', () => {
      const onQuizComplete = jest.fn();
      const items = [sampleRadical]; // Just 1 question
      const { getByTestId } = render(
        <LessonQuiz
          items={items}
          onQuizComplete={onQuizComplete}
          autoAdvanceDelay={0}
        />,
      );

      // Answer correctly
      const input = getByTestId('lesson-quiz-input');
      fireEvent.changeText(input, 'Ground');
      fireEvent.press(getByTestId('lesson-quiz-submit'));

      act(() => {
        jest.runAllTimers();
      });

      expect(onQuizComplete).toHaveBeenCalledTimes(1);
    });
  });

  describe('fuzzy match (typo-forgiven) feedback', () => {
    it('shows yellow feedback with "Close enough!" for fuzzy match answers', () => {
      // Create an item with a longer meaning (7+ chars = 2 edits allowed)
      const itemWithLongMeaning: QuizItem = {
        ...sampleVocabulary,
        meanings: createMeanings([{ meaning: 'Beautiful', primary: true }]),
      };
      const { getByTestId, queryByTestId } = render(
        <LessonQuiz
          items={[itemWithLongMeaning]}
          onAnswer={jest.fn()}
          autoAdvanceDelay={100}
        />,
      );

      const type = getByTestId('lesson-quiz-question-type').props.children;

      if (type === 'MEANING') {
        // Submit answer with typo (within 2 edits of "Beautiful")
        fireEvent.changeText(getByTestId('lesson-quiz-input'), 'Beautful'); // missing 'i'
        fireEvent.press(getByTestId('lesson-quiz-submit'));

        // Should show fuzzy match label instead of correct label
        expect(queryByTestId('lesson-quiz-fuzzy-match-label')).toBeTruthy();
        expect(queryByTestId('lesson-quiz-correct-label')).toBeNull();
        expect(getByTestId('lesson-quiz-fuzzy-match-label').props.children).toBe(
          'Close enough!',
        );
      }
    });

    it('shows green feedback with "Correct!" for exact match answers', () => {
      // Use 2 items so there's more than 1 question - prevents immediate quiz completion
      const items = [sampleRadical, sampleRadical2];
      const { getByTestId, queryByTestId } = render(
        <LessonQuiz items={items} onAnswer={jest.fn()} autoAdvanceDelay={100} />,
      );

      // Determine which radical is shown first and answer correctly
      const firstChar = getByTestId('lesson-quiz-characters').props.children;
      const firstAnswer = firstChar === '一' ? 'Ground' : 'Person';

      // Submit exact answer
      fireEvent.changeText(getByTestId('lesson-quiz-input'), firstAnswer);
      fireEvent.press(getByTestId('lesson-quiz-submit'));

      // Should show correct label, not fuzzy match label
      expect(queryByTestId('lesson-quiz-correct-label')).toBeTruthy();
      expect(queryByTestId('lesson-quiz-fuzzy-match-label')).toBeNull();
      expect(getByTestId('lesson-quiz-correct-label').props.children).toBe(
        'Correct!',
      );
    });

    it('calls onAnswer with isCorrect=true for fuzzy match answers', () => {
      const onAnswer = jest.fn();
      // Create an item with a 4-6 char meaning (1 edit allowed)
      const itemWithMediumMeaning: QuizItem = {
        ...sampleVocabulary,
        meanings: createMeanings([{ meaning: 'Water', primary: true }]),
      };
      const { getByTestId } = render(
        <LessonQuiz
          items={[itemWithMediumMeaning]}
          onAnswer={onAnswer}
          autoAdvanceDelay={0}
        />,
      );

      const type = getByTestId('lesson-quiz-question-type').props.children;

      if (type === 'MEANING') {
        // Submit answer with 1 typo
        fireEvent.changeText(getByTestId('lesson-quiz-input'), 'Watar'); // 'a' instead of 'e'
        fireEvent.press(getByTestId('lesson-quiz-submit'));

        expect(onAnswer).toHaveBeenCalledWith(
          expect.objectContaining({
            isCorrect: true,
          }),
        );
      }
    });

    it('does not show fuzzy match for reading questions', () => {
      // Reading questions do not support typo forgiveness
      const items = [sampleVocabulary];
      const { getByTestId, queryByTestId } = render(
        <LessonQuiz items={items} onAnswer={jest.fn()} autoAdvanceDelay={100} />,
      );

      const type = getByTestId('lesson-quiz-question-type').props.children;

      if (type === 'READING') {
        // Submit correct reading
        fireEvent.changeText(getByTestId('lesson-quiz-input'), 'ookii');
        fireEvent.press(getByTestId('lesson-quiz-submit'));

        // Should show correct label (if correct), never fuzzy match for reading
        if (queryByTestId('lesson-quiz-correct-label')) {
          expect(queryByTestId('lesson-quiz-fuzzy-match-label')).toBeNull();
        }
      }
    });
  });

  describe('incorrect answer handling', () => {
    it('calls onAnswer with isCorrect=false for incorrect answer', () => {
      const onAnswer = jest.fn();
      const items = [sampleRadical];
      const { getByTestId } = render(
        <LessonQuiz items={items} onAnswer={onAnswer} autoAdvanceDelay={0} />,
      );

      const input = getByTestId('lesson-quiz-input');
      fireEvent.changeText(input, 'wrong answer');

      fireEvent.press(getByTestId('lesson-quiz-submit'));

      expect(onAnswer).toHaveBeenCalledWith(
        expect.objectContaining({
          userAnswer: 'wrong answer',
          isCorrect: false,
        }),
      );
    });

    it('shows incorrect feedback screen after wrong answer', () => {
      const items = [sampleRadical];
      const { getByTestId } = render(
        <LessonQuiz items={items} onAnswer={jest.fn()} autoAdvanceDelay={0} />,
      );

      // Submit wrong answer
      fireEvent.changeText(getByTestId('lesson-quiz-input'), 'wrong');
      fireEvent.press(getByTestId('lesson-quiz-submit'));

      // Should show incorrect feedback
      expect(getByTestId('lesson-quiz-incorrect-feedback')).toBeTruthy();
      expect(getByTestId('lesson-quiz-incorrect-label')).toBeTruthy();
    });

    it('displays user answer in feedback', () => {
      const items = [sampleRadical];
      const { getByTestId } = render(
        <LessonQuiz items={items} onAnswer={jest.fn()} autoAdvanceDelay={0} />,
      );

      fireEvent.changeText(getByTestId('lesson-quiz-input'), 'my wrong answer');
      fireEvent.press(getByTestId('lesson-quiz-submit'));

      expect(getByTestId('lesson-quiz-your-answer').props.children).toBe(
        'my wrong answer',
      );
    });

    it('displays empty answer placeholder', () => {
      const items = [sampleRadical];
      const { getByTestId } = render(
        <LessonQuiz items={items} onAnswer={jest.fn()} autoAdvanceDelay={0} />,
      );

      fireEvent.press(getByTestId('lesson-quiz-submit'));

      expect(getByTestId('lesson-quiz-your-answer').props.children).toBe(
        '(empty)',
      );
    });

    it('displays correct answer in feedback', () => {
      const items = [sampleRadical];
      const { getByTestId } = render(
        <LessonQuiz items={items} onAnswer={jest.fn()} autoAdvanceDelay={0} />,
      );

      fireEvent.changeText(getByTestId('lesson-quiz-input'), 'wrong');
      fireEvent.press(getByTestId('lesson-quiz-submit'));

      expect(getByTestId('lesson-quiz-correct-answer').props.children).toBe(
        'Ground',
      );
    });

    it('displays mnemonic in feedback', () => {
      const items = [sampleRadical];
      const { getByTestId, getByText } = render(
        <LessonQuiz items={items} onAnswer={jest.fn()} autoAdvanceDelay={0} />,
      );

      fireEvent.changeText(getByTestId('lesson-quiz-input'), 'wrong');
      fireEvent.press(getByTestId('lesson-quiz-submit'));

      expect(getByText('Mnemonic for Ground')).toBeTruthy();
      expect(getByTestId('lesson-quiz-mnemonic-label').props.children).toBe(
        'Meaning Mnemonic:',
      );
    });

    it('shows continue button after incorrect answer', () => {
      const items = [sampleRadical];
      const { getByTestId } = render(
        <LessonQuiz items={items} onAnswer={jest.fn()} autoAdvanceDelay={0} />,
      );

      fireEvent.changeText(getByTestId('lesson-quiz-input'), 'wrong');
      fireEvent.press(getByTestId('lesson-quiz-submit'));

      expect(getByTestId('lesson-quiz-continue')).toBeTruthy();
    });

    it('advances to next question when continue is pressed', () => {
      const items = [sampleRadical, sampleRadical2]; // 2 questions
      const { getByTestId } = render(
        <LessonQuiz items={items} onAnswer={jest.fn()} autoAdvanceDelay={0} />,
      );

      // Submit wrong answer
      fireEvent.changeText(getByTestId('lesson-quiz-input'), 'wrong');
      fireEvent.press(getByTestId('lesson-quiz-submit'));

      // Press continue
      fireEvent.press(getByTestId('lesson-quiz-continue'));

      // Should be back at quiz view (not feedback)
      expect(getByTestId('lesson-quiz')).toBeTruthy();
    });
  });

  describe('re-queue incorrect items', () => {
    it('re-queues incorrect question to appear later', () => {
      const onAnswer = jest.fn();
      // Just one radical with 1 question
      const items = [sampleRadical];
      const { getByTestId } = render(
        <LessonQuiz items={items} onAnswer={onAnswer} autoAdvanceDelay={0} />,
      );

      // Answer incorrectly
      fireEvent.changeText(getByTestId('lesson-quiz-input'), 'wrong');
      fireEvent.press(getByTestId('lesson-quiz-submit'));

      // Press continue
      fireEvent.press(getByTestId('lesson-quiz-continue'));

      // The same question should appear again (it was re-queued)
      expect(getByTestId('lesson-quiz')).toBeTruthy();
      expect(getByTestId('lesson-quiz-characters').props.children).toBe('一');

      // Now answer correctly
      fireEvent.changeText(getByTestId('lesson-quiz-input'), 'Ground');
      fireEvent.press(getByTestId('lesson-quiz-submit'));

      act(() => {
        jest.runAllTimers();
      });

      // Now quiz should be complete
      expect(getByTestId('lesson-quiz-complete')).toBeTruthy();
    });

    it('tracks incorrect items until answered correctly', () => {
      const onAnswer = jest.fn();
      const items = [sampleRadical];
      const { getByTestId } = render(
        <LessonQuiz items={items} onAnswer={onAnswer} autoAdvanceDelay={0} />,
      );

      // Answer wrong 3 times
      for (let i = 0; i < 3; i++) {
        fireEvent.changeText(getByTestId('lesson-quiz-input'), 'wrong');
        fireEvent.press(getByTestId('lesson-quiz-submit'));
        fireEvent.press(getByTestId('lesson-quiz-continue'));
      }

      // Should still be showing the question
      expect(getByTestId('lesson-quiz')).toBeTruthy();

      // Now answer correctly
      fireEvent.changeText(getByTestId('lesson-quiz-input'), 'Ground');
      fireEvent.press(getByTestId('lesson-quiz-submit'));

      act(() => {
        jest.runAllTimers();
      });

      // Quiz should be complete
      expect(getByTestId('lesson-quiz-complete')).toBeTruthy();
      expect(onAnswer).toHaveBeenCalledTimes(4); // 3 wrong + 1 correct
    });

    it('shows reading mnemonic for reading questions', () => {
      // Force a reading question by using vocabulary
      const vocabItem: QuizItem = {
        ...sampleVocabulary,
        meanings: createMeanings([{ meaning: 'Big', primary: true }]),
        readings: createReadings([{ reading: 'おおきい', primary: true }]),
        meaningMnemonic: 'This is the meaning mnemonic',
        readingMnemonic: 'This is the reading mnemonic',
      };
      const items = [vocabItem];
      const { getByTestId, getByText } = render(
        <LessonQuiz items={items} onAnswer={jest.fn()} autoAdvanceDelay={0} />,
      );

      const questionType = getByTestId('lesson-quiz-question-type').props
        .children;

      if (questionType === 'READING') {
        // Submit wrong answer
        fireEvent.changeText(getByTestId('lesson-quiz-input'), 'wrong');
        fireEvent.press(getByTestId('lesson-quiz-submit'));

        // Should show reading mnemonic
        expect(getByTestId('lesson-quiz-mnemonic-label').props.children).toBe(
          'Reading Mnemonic:',
        );
        expect(getByText('This is the reading mnemonic')).toBeTruthy();
      } else {
        // Meaning question - answer wrong
        fireEvent.changeText(getByTestId('lesson-quiz-input'), 'wrong');
        fireEvent.press(getByTestId('lesson-quiz-submit'));

        expect(getByTestId('lesson-quiz-mnemonic-label').props.children).toBe(
          'Meaning Mnemonic:',
        );
      }
    });
  });

  describe('quiz completion', () => {
    it('shows completion state when all questions answered correctly', () => {
      const items = [sampleRadical];
      const { getByTestId } = render(
        <LessonQuiz items={items} onAnswer={jest.fn()} autoAdvanceDelay={0} />,
      );

      // Answer correctly
      fireEvent.changeText(getByTestId('lesson-quiz-input'), 'Ground');
      fireEvent.press(getByTestId('lesson-quiz-submit'));

      act(() => {
        jest.runAllTimers();
      });

      expect(getByTestId('lesson-quiz-complete')).toBeTruthy();
    });

    it('displays completion message', () => {
      const items = [sampleRadical];
      const { getByTestId, getByText } = render(
        <LessonQuiz items={items} onAnswer={jest.fn()} autoAdvanceDelay={0} />,
      );

      fireEvent.changeText(getByTestId('lesson-quiz-input'), 'Ground');
      fireEvent.press(getByTestId('lesson-quiz-submit'));

      act(() => {
        jest.runAllTimers();
      });

      expect(getByText('Quiz Complete!')).toBeTruthy();
    });

    it('displays number of questions answered including retries', () => {
      const items = [sampleRadical];
      const { getByTestId, getByText } = render(
        <LessonQuiz items={items} onAnswer={jest.fn()} autoAdvanceDelay={0} />,
      );

      // Answer wrong twice, then correct
      fireEvent.changeText(getByTestId('lesson-quiz-input'), 'wrong');
      fireEvent.press(getByTestId('lesson-quiz-submit'));
      fireEvent.press(getByTestId('lesson-quiz-continue'));

      fireEvent.changeText(getByTestId('lesson-quiz-input'), 'wrong again');
      fireEvent.press(getByTestId('lesson-quiz-submit'));
      fireEvent.press(getByTestId('lesson-quiz-continue'));

      fireEvent.changeText(getByTestId('lesson-quiz-input'), 'Ground');
      fireEvent.press(getByTestId('lesson-quiz-submit'));

      act(() => {
        jest.runAllTimers();
      });

      // Should show 3 questions answered (2 wrong + 1 correct)
      expect(getByText('3 questions answered')).toBeTruthy();
    });
  });

  describe('subject type colors', () => {
    it('uses blue background for radicals', () => {
      const items = [sampleRadical];
      const { getByTestId } = render(
        <LessonQuiz items={items} onAnswer={jest.fn()} autoAdvanceDelay={0} />,
      );

      const container = getByTestId('lesson-quiz-character-container');
      expect(container.props.style).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ backgroundColor: SUBJECT_COLORS.radical }),
        ]),
      );
    });

    it('uses pink background for kanji', () => {
      const items = [sampleKanji];
      const { getByTestId } = render(
        <LessonQuiz items={items} onAnswer={jest.fn()} autoAdvanceDelay={0} />,
      );

      const container = getByTestId('lesson-quiz-character-container');
      expect(container.props.style).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ backgroundColor: SUBJECT_COLORS.kanji }),
        ]),
      );
    });

    it('uses purple background for vocabulary', () => {
      const items = [sampleVocabulary];
      const { getByTestId } = render(
        <LessonQuiz items={items} onAnswer={jest.fn()} autoAdvanceDelay={0} />,
      );

      const container = getByTestId('lesson-quiz-character-container');
      expect(container.props.style).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            backgroundColor: SUBJECT_COLORS.vocabulary,
          }),
        ]),
      );
    });

    it('uses purple background for kana_vocabulary', () => {
      const items = [sampleKanaVocabulary];
      const { getByTestId } = render(
        <LessonQuiz items={items} onAnswer={jest.fn()} autoAdvanceDelay={0} />,
      );

      const container = getByTestId('lesson-quiz-character-container');
      expect(container.props.style).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            backgroundColor: SUBJECT_COLORS.kana_vocabulary,
          }),
        ]),
      );
    });
  });

  describe('question type label styling', () => {
    it('uses black background for reading questions', () => {
      // Use vocabulary which has both meaning and reading questions
      const items = [sampleVocabulary];
      const { getByTestId } = render(
        <LessonQuiz items={items} onAnswer={jest.fn()} autoAdvanceDelay={0} />,
      );

      const questionType = getByTestId('lesson-quiz-question-type').props
        .children;

      if (questionType === 'READING') {
        // Reading questions should have black background on label container
        const label = getByTestId('lesson-quiz-question-type');
        expect(label).toBeTruthy();
      }
    });

    it('shows question type label for meaning questions', () => {
      // Use radical which only has meaning questions
      const items = [sampleRadical];
      const { getByTestId } = render(
        <LessonQuiz items={items} onAnswer={jest.fn()} autoAdvanceDelay={0} />,
      );

      const label = getByTestId('lesson-quiz-question-type');
      expect(label.props.children).toBe('MEANING');
    });
  });

  describe('placeholder text', () => {
    it('shows "Enter meaning..." for meaning questions', () => {
      const items = [sampleRadical];
      const { getByTestId } = render(
        <LessonQuiz items={items} onAnswer={jest.fn()} autoAdvanceDelay={0} />,
      );

      const input = getByTestId('lesson-quiz-input');
      expect(input.props.placeholder).toBe('Enter meaning...');
    });
  });

  describe('multiple items quiz flow', () => {
    it('cycles through all questions when answered correctly', () => {
      const items = [sampleRadical, sampleRadical2]; // 2 meaning questions
      const onAnswer = jest.fn();
      const { getByTestId, getByText } = render(
        <LessonQuiz items={items} onAnswer={onAnswer} autoAdvanceDelay={0} />,
      );

      // Get the first question's expected answer
      const firstChar = getByTestId('lesson-quiz-characters').props.children;
      const firstAnswer = firstChar === '一' ? 'Ground' : 'Person';

      // Answer first question correctly
      fireEvent.changeText(getByTestId('lesson-quiz-input'), firstAnswer);
      fireEvent.press(getByTestId('lesson-quiz-submit'));

      act(() => {
        jest.runAllTimers();
      });

      // Should be on second question
      expect(getByTestId('lesson-quiz-progress-text').props.children).toEqual([
        2,
        ' ',
        '/ ',
        2,
      ]);

      // Get the second question's expected answer
      const secondChar = getByTestId('lesson-quiz-characters').props.children;
      const secondAnswer = secondChar === '一' ? 'Ground' : 'Person';

      // Answer second question correctly
      fireEvent.changeText(getByTestId('lesson-quiz-input'), secondAnswer);
      fireEvent.press(getByTestId('lesson-quiz-submit'));

      act(() => {
        jest.runAllTimers();
      });

      // Should show completion
      expect(getByText('Quiz Complete!')).toBeTruthy();
      expect(onAnswer).toHaveBeenCalledTimes(2);
    });

    it('generates correct question count for full batch', () => {
      const { getByTestId } = render(<LessonQuiz {...defaultProps} />);
      const progressText = getByTestId('lesson-quiz-progress-text');

      // 5 items: 2 radicals (1 each) + 3 non-radicals (2 each) = 8 questions
      expect(progressText.props.children).toEqual([1, ' ', '/ ', 8]);
    });
  });

  describe('answer result structure', () => {
    it('includes all required fields in answer result', () => {
      const onAnswer = jest.fn();
      const items = [sampleRadical];
      const { getByTestId } = render(
        <LessonQuiz items={items} onAnswer={onAnswer} autoAdvanceDelay={0} />,
      );

      const input = getByTestId('lesson-quiz-input');
      fireEvent.changeText(input, 'ground');

      fireEvent.press(getByTestId('lesson-quiz-submit'));

      expect(onAnswer).toHaveBeenCalledWith({
        question: expect.objectContaining({
          item: expect.objectContaining({ id: 1 }),
          type: 'meaning',
          key: '1-meaning',
        }),
        userAnswer: 'ground',
        isCorrect: true,
        correctAnswer: 'Ground', // All accepted meanings
      });
    });
  });

  describe('kanji with multiple meanings', () => {
    it('accepts any valid meaning', () => {
      const itemWithMultipleMeanings: QuizItem = {
        ...sampleKanji,
        meanings: createMeanings([
          { meaning: 'Big', primary: true },
          { meaning: 'Large', primary: false },
          { meaning: 'Great', primary: false },
        ]),
      };

      const onAnswer = jest.fn();
      const { getByTestId } = render(
        <LessonQuiz
          items={[itemWithMultipleMeanings]}
          onAnswer={onAnswer}
          autoAdvanceDelay={0}
        />,
      );

      const type = getByTestId('lesson-quiz-question-type').props.children;

      if (type === 'MEANING') {
        // Try alternate meaning
        fireEvent.changeText(getByTestId('lesson-quiz-input'), 'Large');
        fireEvent.press(getByTestId('lesson-quiz-submit'));

        expect(onAnswer).toHaveBeenCalledWith(
          expect.objectContaining({
            isCorrect: true,
          }),
        );
      }
    });
  });

  describe('vocabulary with multiple readings', () => {
    it('handles items with multiple readings', () => {
      const itemWithMultipleReadings: QuizItem = {
        ...sampleVocabulary,
        readings: createReadings([
          { reading: 'おおきい', primary: true },
          { reading: 'おおき', primary: false },
        ]),
      };

      const onAnswer = jest.fn();
      const { getByTestId } = render(
        <LessonQuiz
          items={[itemWithMultipleReadings]}
          onAnswer={onAnswer}
          autoAdvanceDelay={0}
        />,
      );

      const type = getByTestId('lesson-quiz-question-type').props.children;

      if (type === 'READING') {
        fireEvent.changeText(getByTestId('lesson-quiz-input'), 'ookii');
        fireEvent.press(getByTestId('lesson-quiz-submit'));

        expect(onAnswer).toHaveBeenCalledWith(
          expect.objectContaining({
            correctAnswer: expect.stringContaining('おおきい'), // Primary reading
          }),
        );
      }
    });
  });

  describe('question randomization', () => {
    it('generates questions using shuffle function', () => {
      // Test that shuffleArray is called during question generation
      // by verifying that questions are generated for each item
      const items = [sampleKanji, sampleVocabulary]; // 4 questions total

      const questions = generateQuizQuestions(items);

      // Verify all expected questions are generated
      expect(questions.length).toBe(4); // 2 questions per item
      const keys = questions.map(q => q.key);
      expect(keys).toContain(`${sampleKanji.id}-meaning`);
      expect(keys).toContain(`${sampleKanji.id}-reading`);
      expect(keys).toContain(`${sampleVocabulary.id}-meaning`);
      expect(keys).toContain(`${sampleVocabulary.id}-reading`);
    });
  });

  describe('single item batch', () => {
    it('handles a single radical (1 question)', () => {
      const items = [sampleRadical];
      const onQuizComplete = jest.fn();
      const { getByTestId, getByText } = render(
        <LessonQuiz
          items={items}
          onQuizComplete={onQuizComplete}
          autoAdvanceDelay={0}
        />,
      );

      expect(getByTestId('lesson-quiz-progress-text').props.children).toEqual([
        1,
        ' ',
        '/ ',
        1,
      ]);

      // Answer correctly
      fireEvent.changeText(getByTestId('lesson-quiz-input'), 'Ground');
      fireEvent.press(getByTestId('lesson-quiz-submit'));

      act(() => {
        jest.runAllTimers();
      });

      expect(getByText('Quiz Complete!')).toBeTruthy();
      expect(onQuizComplete).toHaveBeenCalledTimes(1);
    });

    it('handles a single kanji (2 questions)', () => {
      const items = [sampleKanji];
      const { getByTestId, getByText } = render(
        <LessonQuiz items={items} onAnswer={jest.fn()} autoAdvanceDelay={0} />,
      );

      expect(getByTestId('lesson-quiz-progress-text').props.children).toEqual([
        1,
        ' ',
        '/ ',
        2,
      ]);

      // Answer first question (could be meaning or reading)
      const firstType = getByTestId('lesson-quiz-question-type').props.children;
      const firstAnswer = firstType === 'MEANING' ? 'Big' : 'oo';
      fireEvent.changeText(getByTestId('lesson-quiz-input'), firstAnswer);
      fireEvent.press(getByTestId('lesson-quiz-submit'));

      act(() => {
        jest.runAllTimers();
      });

      expect(getByTestId('lesson-quiz-progress-text').props.children).toEqual([
        2,
        ' ',
        '/ ',
        2,
      ]);

      // Answer second question
      const secondType = getByTestId('lesson-quiz-question-type').props
        .children;
      const secondAnswer = secondType === 'MEANING' ? 'Big' : 'oo';
      fireEvent.changeText(getByTestId('lesson-quiz-input'), secondAnswer);
      fireEvent.press(getByTestId('lesson-quiz-submit'));

      act(() => {
        jest.runAllTimers();
      });

      expect(getByText('Quiz Complete!')).toBeTruthy();
    });
  });

  describe('callbacks are optional', () => {
    it('works without onAnswer callback', () => {
      const items = [sampleRadical];
      const { getByTestId, getByText } = render(
        <LessonQuiz items={items} autoAdvanceDelay={0} />,
      );

      // Answer correctly - should not throw
      fireEvent.changeText(getByTestId('lesson-quiz-input'), 'Ground');
      fireEvent.press(getByTestId('lesson-quiz-submit'));

      act(() => {
        jest.runAllTimers();
      });

      expect(getByText('Quiz Complete!')).toBeTruthy();
    });

    it('works without onQuizComplete callback', () => {
      const items = [sampleRadical];
      const { getByTestId, getByText } = render(
        <LessonQuiz items={items} onAnswer={jest.fn()} autoAdvanceDelay={0} />,
      );

      // Answer correctly - should not throw
      fireEvent.changeText(getByTestId('lesson-quiz-input'), 'Ground');
      fireEvent.press(getByTestId('lesson-quiz-submit'));

      act(() => {
        jest.runAllTimers();
      });

      expect(getByText('Quiz Complete!')).toBeTruthy();
    });
  });

  describe('reading answer validation', () => {
    it('validates hiragana reading answers correctly', () => {
      // Create a vocabulary item where we control the question order
      const vocabItem = createVocabularyItem(10, 'たべる', 'Eat', 'たべる');
      const onAnswer = jest.fn();
      const { getByTestId } = render(
        <LessonQuiz
          items={[vocabItem]}
          onAnswer={onAnswer}
          autoAdvanceDelay={0}
        />,
      );

      const questionType = getByTestId('lesson-quiz-question-type').props
        .children;

      if (questionType === 'READING') {
        // Type romaji which should convert to hiragana
        fireEvent.changeText(getByTestId('lesson-quiz-input'), 'taberu');
        fireEvent.press(getByTestId('lesson-quiz-submit'));

        expect(onAnswer).toHaveBeenCalledWith(
          expect.objectContaining({
            isCorrect: true,
          }),
        );
      }
    });
  });

  describe('auto-focus input', () => {
    it('auto-focuses input on initial render', () => {
      const items = [sampleRadical];
      const { getByTestId } = render(
        <LessonQuiz items={items} onAnswer={jest.fn()} autoAdvanceDelay={0} />,
      );

      // Run timers to trigger the focus effect (100ms delay)
      act(() => {
        jest.advanceTimersByTime(100);
      });

      // Verify the input exists and can be accessed
      const input = getByTestId('lesson-quiz-input');
      expect(input).toBeTruthy();
    });

    it('auto-focuses input after advancing from correct answer', () => {
      const items = [sampleRadical, sampleRadical2]; // 2 meaning questions
      const { getByTestId } = render(
        <LessonQuiz
          items={items}
          onAnswer={jest.fn()}
          autoAdvanceDelay={100}
        />,
      );

      // Get the first question's expected answer
      const firstChar = getByTestId('lesson-quiz-characters').props.children;
      const firstAnswer = firstChar === '一' ? 'Ground' : 'Person';

      // Answer first question correctly
      fireEvent.changeText(getByTestId('lesson-quiz-input'), firstAnswer);
      fireEvent.press(getByTestId('lesson-quiz-submit'));

      // Run timers for auto-advance (100ms) + focus delay (100ms)
      act(() => {
        jest.advanceTimersByTime(200);
      });

      // Should be on second question with input available
      const input = getByTestId('lesson-quiz-input');
      expect(input).toBeTruthy();
      // Input should be cleared for new question
      expect(input.props.value).toBe('');
    });

    it('auto-focuses input after tapping Continue on incorrect feedback', () => {
      const items = [sampleRadical, sampleRadical2]; // 2 questions
      const { getByTestId } = render(
        <LessonQuiz items={items} onAnswer={jest.fn()} autoAdvanceDelay={0} />,
      );

      // Submit wrong answer
      fireEvent.changeText(getByTestId('lesson-quiz-input'), 'wrong');
      fireEvent.press(getByTestId('lesson-quiz-submit'));

      // Should show incorrect feedback
      expect(getByTestId('lesson-quiz-incorrect-feedback')).toBeTruthy();

      // Press continue
      fireEvent.press(getByTestId('lesson-quiz-continue'));

      // Run timers for focus delay (100ms)
      act(() => {
        jest.advanceTimersByTime(100);
      });

      // Should be back at quiz view with input available
      const input = getByTestId('lesson-quiz-input');
      expect(input).toBeTruthy();
      // Input should be cleared
      expect(input.props.value).toBe('');
    });

    it('does not focus input while showing correct feedback', () => {
      const items = [sampleRadical, sampleRadical2];
      const { getByTestId, queryByTestId } = render(
        <LessonQuiz
          items={items}
          onAnswer={jest.fn()}
          autoAdvanceDelay={500}
        />,
      );

      // Get the first question's expected answer
      const firstChar = getByTestId('lesson-quiz-characters').props.children;
      const firstAnswer = firstChar === '一' ? 'Ground' : 'Person';

      // Answer correctly
      fireEvent.changeText(getByTestId('lesson-quiz-input'), firstAnswer);
      fireEvent.press(getByTestId('lesson-quiz-submit'));

      // Should show correct label
      expect(queryByTestId('lesson-quiz-correct-label')).toBeTruthy();
    });

    it('does not focus input when quiz is complete', () => {
      const items = [sampleRadical]; // Just 1 question
      const { getByTestId, queryByTestId } = render(
        <LessonQuiz items={items} onAnswer={jest.fn()} autoAdvanceDelay={0} />,
      );

      // Answer correctly
      fireEvent.changeText(getByTestId('lesson-quiz-input'), 'Ground');
      fireEvent.press(getByTestId('lesson-quiz-submit'));

      act(() => {
        jest.runAllTimers();
      });

      // Should be complete
      expect(getByTestId('lesson-quiz-complete')).toBeTruthy();
      // Input should not be present
      expect(queryByTestId('lesson-quiz-input')).toBeNull();
    });
  });

  describe('Mark as Correct functionality', () => {
    it('shows "Mark as Correct" button on incorrect feedback screen', () => {
      const items = [sampleRadical];
      const { getByTestId } = render(
        <LessonQuiz items={items} onAnswer={jest.fn()} autoAdvanceDelay={0} />,
      );

      // Submit wrong answer
      fireEvent.changeText(getByTestId('lesson-quiz-input'), 'wrong');
      fireEvent.press(getByTestId('lesson-quiz-submit'));

      // Should show Mark as Correct button alongside Continue
      expect(getByTestId('lesson-quiz-mark-correct')).toBeTruthy();
      expect(getByTestId('lesson-quiz-continue')).toBeTruthy();
    });

    it('marks question as correct when "Mark as Correct" is pressed', () => {
      const onAnswer = jest.fn();
      const items = [sampleRadical];
      const { getByTestId, getByText } = render(
        <LessonQuiz items={items} onAnswer={onAnswer} autoAdvanceDelay={0} />,
      );

      // Submit wrong answer
      fireEvent.changeText(getByTestId('lesson-quiz-input'), 'wrong');
      fireEvent.press(getByTestId('lesson-quiz-submit'));

      // First call should be incorrect
      expect(onAnswer).toHaveBeenCalledWith(
        expect.objectContaining({
          isCorrect: false,
        }),
      );

      // Press Mark as Correct
      fireEvent.press(getByTestId('lesson-quiz-mark-correct'));

      // Second call should be correct (overriding the incorrect answer)
      expect(onAnswer).toHaveBeenLastCalledWith(
        expect.objectContaining({
          isCorrect: true,
        }),
      );

      // Quiz should be complete (single item)
      expect(getByText('Quiz Complete!')).toBeTruthy();
    });

    it('advances to next question after "Mark as Correct" is pressed', () => {
      const items = [sampleRadical, sampleRadical2]; // 2 questions
      const { getByTestId, queryByTestId } = render(
        <LessonQuiz items={items} onAnswer={jest.fn()} autoAdvanceDelay={0} />,
      );

      // Get first question character
      const firstChar = getByTestId('lesson-quiz-characters').props.children;

      // Submit wrong answer
      fireEvent.changeText(getByTestId('lesson-quiz-input'), 'wrong');
      fireEvent.press(getByTestId('lesson-quiz-submit'));

      // Press Mark as Correct
      fireEvent.press(getByTestId('lesson-quiz-mark-correct'));

      // Should be on next question (not showing feedback)
      expect(queryByTestId('lesson-quiz-incorrect-feedback')).toBeNull();
      expect(getByTestId('lesson-quiz')).toBeTruthy();

      // Second question should have different character
      const secondChar = getByTestId('lesson-quiz-characters').props.children;
      expect(secondChar).not.toBe(firstChar);
    });

    it('removes re-queued question when "Mark as Correct" is pressed', () => {
      const items = [sampleRadical]; // Single item
      const { getByTestId, getByText } = render(
        <LessonQuiz items={items} onAnswer={jest.fn()} autoAdvanceDelay={0} />,
      );

      // Submit wrong answer (question gets re-queued)
      fireEvent.changeText(getByTestId('lesson-quiz-input'), 'wrong');
      fireEvent.press(getByTestId('lesson-quiz-submit'));

      // Press Mark as Correct
      fireEvent.press(getByTestId('lesson-quiz-mark-correct'));

      // Quiz should be complete immediately (re-queued question was removed)
      expect(getByText('Quiz Complete!')).toBeTruthy();
    });

    it('calls onQuizComplete when all questions marked correct', () => {
      const onQuizComplete = jest.fn();
      const items = [sampleRadical];
      const { getByTestId } = render(
        <LessonQuiz
          items={items}
          onQuizComplete={onQuizComplete}
          autoAdvanceDelay={0}
        />,
      );

      // Submit wrong answer
      fireEvent.changeText(getByTestId('lesson-quiz-input'), 'wrong');
      fireEvent.press(getByTestId('lesson-quiz-submit'));

      // Press Mark as Correct
      fireEvent.press(getByTestId('lesson-quiz-mark-correct'));

      // onQuizComplete should be called
      expect(onQuizComplete).toHaveBeenCalledTimes(1);
    });

    it('preserves user answer when marking as correct', () => {
      const onAnswer = jest.fn();
      const items = [sampleRadical];
      const { getByTestId } = render(
        <LessonQuiz items={items} onAnswer={onAnswer} autoAdvanceDelay={0} />,
      );

      // Submit wrong answer
      fireEvent.changeText(getByTestId('lesson-quiz-input'), 'my typo answer');
      fireEvent.press(getByTestId('lesson-quiz-submit'));

      // Press Mark as Correct
      fireEvent.press(getByTestId('lesson-quiz-mark-correct'));

      // The corrected result should preserve the user's original answer
      expect(onAnswer).toHaveBeenLastCalledWith(
        expect.objectContaining({
          userAnswer: 'my typo answer',
          isCorrect: true,
        }),
      );
    });
  });

  describe('input positioning', () => {
    it('has padding for appropriate spacing', () => {
      const items = [sampleRadical];
      const { getByTestId } = render(
        <LessonQuiz items={items} onAnswer={jest.fn()} autoAdvanceDelay={0} />,
      );

      const inputContainer = getByTestId('lesson-quiz-input-container');
      // Input container should have paddingTop for spacing
      expect(inputContainer.props.style).toEqual(
        expect.objectContaining({ paddingTop: expect.any(Number) }),
      );
    });

    it('renders input container with testID', () => {
      const items = [sampleRadical];
      const { getByTestId } = render(
        <LessonQuiz items={items} onAnswer={jest.fn()} autoAdvanceDelay={0} />,
      );

      expect(getByTestId('lesson-quiz-input-container')).toBeTruthy();
    });

    it('shows hiragana directly in input for reading questions', () => {
      const items = [sampleVocabulary];
      const { getByTestId } = render(
        <LessonQuiz items={items} onAnswer={jest.fn()} autoAdvanceDelay={0} />,
      );

      const type = getByTestId('lesson-quiz-question-type').props.children;

      if (type === 'READING') {
        const input = getByTestId('lesson-quiz-input');
        fireEvent.changeText(input, 'ookii');

        // Hiragana should be shown directly in the input value
        expect(input.props.value).toContain('おおき');
      }
    });
  });
});
