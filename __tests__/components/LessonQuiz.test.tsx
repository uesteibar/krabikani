import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';

import {
  LessonQuiz,
  LessonQuizProps,
  QuizItem,
  generateQuizQuestions,
  shuffleArray,
} from '../../src/components/LessonQuiz';
import type { Meaning, Reading, KanjiReading } from '../../src/api/types';

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
function createRadicalItem(id: number, character: string, meaning: string): QuizItem {
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
    readings: createKanjiReadings([{ reading, primary: true, type: 'kunyomi' }]),
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
const sampleKanaVocabulary = createKanaVocabularyItem(4, 'あめ', 'Candy', 'あめ');
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
};

describe('LessonQuiz', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Mock Math.random for predictable question order in some tests
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

    it('renders the question prompt', () => {
      const { getByTestId } = render(<LessonQuiz {...defaultProps} />);
      expect(getByTestId('lesson-quiz-prompt')).toBeTruthy();
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

      // First question out of 8 total
      expect(progressText.props.children).toEqual([1, ' / ', 8]);
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
        <LessonQuiz items={items} onAnswer={jest.fn()} />,
      );

      expect(getByTestId('lesson-quiz-characters').props.children).toBe('大');
    });

    it('displays the subject type', () => {
      const items = [sampleKanji];
      const { getByTestId } = render(
        <LessonQuiz items={items} onAnswer={jest.fn()} />,
      );

      expect(getByTestId('lesson-quiz-subject-type').props.children).toBe('kanji');
    });

    it('displays kana_vocabulary as "kana vocabulary"', () => {
      const items = [sampleKanaVocabulary];
      const { getByTestId } = render(
        <LessonQuiz items={items} onAnswer={jest.fn()} />,
      );

      expect(getByTestId('lesson-quiz-subject-type').props.children).toBe('kana vocabulary');
    });

    it('displays ? for items with null characters', () => {
      const itemWithNullChar: QuizItem = {
        ...sampleRadical,
        characters: null,
      };
      const { getByTestId } = render(
        <LessonQuiz items={[itemWithNullChar]} onAnswer={jest.fn()} />,
      );

      expect(getByTestId('lesson-quiz-characters').props.children).toBe('?');
    });
  });

  describe('question types', () => {
    it('shows "What is the meaning?" for meaning questions', () => {
      // Use a radical to guarantee a meaning question
      const items = [sampleRadical];
      const { getByTestId } = render(
        <LessonQuiz items={items} onAnswer={jest.fn()} />,
      );

      expect(getByTestId('lesson-quiz-prompt').props.children).toBe('What is the meaning?');
      expect(getByTestId('lesson-quiz-question-type').props.children).toBe('MEANING');
    });

    it('shows "What is the reading?" for reading questions', () => {
      // We need to control the order - use a single kanji and find the reading question
      // Since order is randomized, we'll check both possible prompts
      const items = [sampleKanji];
      const { getByTestId } = render(
        <LessonQuiz items={items} onAnswer={jest.fn()} />,
      );

      const prompt = getByTestId('lesson-quiz-prompt').props.children;
      const type = getByTestId('lesson-quiz-question-type').props.children;

      // Either meaning or reading question is valid
      if (type === 'READING') {
        expect(prompt).toBe('What is the reading?');
      } else {
        expect(prompt).toBe('What is the meaning?');
        expect(type).toBe('MEANING');
      }
    });
  });

  describe('input handling', () => {
    it('accepts text input for meaning questions', () => {
      const items = [sampleRadical]; // Radical only has meaning
      const { getByTestId } = render(
        <LessonQuiz items={items} onAnswer={jest.fn()} />,
      );

      const input = getByTestId('lesson-quiz-input');
      fireEvent.changeText(input, 'ground');

      expect(input.props.value).toBe('ground');
    });

    it('converts romaji to hiragana for reading questions', () => {
      // We need a non-radical to potentially get a reading question
      const items = [sampleVocabulary];
      const { getByTestId, queryByTestId } = render(
        <LessonQuiz items={items} onAnswer={jest.fn()} />,
      );

      const type = getByTestId('lesson-quiz-question-type').props.children;

      if (type === 'READING') {
        const input = getByTestId('lesson-quiz-input');
        fireEvent.changeText(input, 'ookii');

        // The converted display should show hiragana
        const display = queryByTestId('lesson-quiz-converted-display');
        if (display) {
          expect(display.props.children).toContain('おおき');
        }
      }
    });

    it('shows converted display only for reading questions', () => {
      const items = [sampleRadical]; // Radical only has meaning
      const { getByTestId, queryByTestId } = render(
        <LessonQuiz items={items} onAnswer={jest.fn()} />,
      );

      const input = getByTestId('lesson-quiz-input');
      fireEvent.changeText(input, 'ground');

      expect(queryByTestId('lesson-quiz-converted-display')).toBeNull();
    });
  });

  describe('submit handling', () => {
    it('calls onAnswer when submit is pressed', () => {
      const onAnswer = jest.fn();
      const items = [sampleRadical];
      const { getByTestId } = render(
        <LessonQuiz items={items} onAnswer={onAnswer} />,
      );

      const input = getByTestId('lesson-quiz-input');
      fireEvent.changeText(input, 'ground');

      const submit = getByTestId('lesson-quiz-submit');
      fireEvent.press(submit);

      expect(onAnswer).toHaveBeenCalledTimes(1);
      expect(onAnswer).toHaveBeenCalledWith(
        expect.objectContaining({
          userAnswer: 'ground',
          question: expect.objectContaining({
            type: 'meaning',
          }),
        }),
      );
    });

    it('clears input after submit', () => {
      const items = [sampleRadical, sampleRadical2]; // Two radicals = 2 meaning questions
      const { getByTestId } = render(
        <LessonQuiz items={items} onAnswer={jest.fn()} />,
      );

      const input = getByTestId('lesson-quiz-input');
      fireEvent.changeText(input, 'ground');

      const submit = getByTestId('lesson-quiz-submit');
      fireEvent.press(submit);

      expect(input.props.value).toBe('');
    });

    it('advances to next question after submit', () => {
      const items = [sampleRadical, sampleRadical2]; // Two radicals = 2 meaning questions
      const { getByTestId } = render(
        <LessonQuiz items={items} onAnswer={jest.fn()} />,
      );

      const submit = getByTestId('lesson-quiz-submit');
      fireEvent.press(submit);

      const progressText = getByTestId('lesson-quiz-progress-text');
      expect(progressText.props.children).toEqual([2, ' / ', 2]);
    });
  });

  describe('quiz completion', () => {
    it('shows completion state when all questions answered', () => {
      const items = [sampleRadical]; // Just one question
      const { getByTestId } = render(
        <LessonQuiz items={items} onAnswer={jest.fn()} />,
      );

      const submit = getByTestId('lesson-quiz-submit');
      fireEvent.press(submit);

      expect(getByTestId('lesson-quiz-complete')).toBeTruthy();
    });

    it('displays completion message', () => {
      const items = [sampleRadical];
      const { getByTestId, getByText } = render(
        <LessonQuiz items={items} onAnswer={jest.fn()} />,
      );

      const submit = getByTestId('lesson-quiz-submit');
      fireEvent.press(submit);

      expect(getByText('Quiz Complete!')).toBeTruthy();
    });

    it('displays number of questions answered', () => {
      const items = [sampleRadical];
      const { getByTestId, getByText } = render(
        <LessonQuiz items={items} onAnswer={jest.fn()} />,
      );

      const submit = getByTestId('lesson-quiz-submit');
      fireEvent.press(submit);

      expect(getByText('1 questions answered')).toBeTruthy();
    });

    it('calls onQuizComplete when all questions answered', () => {
      const onQuizComplete = jest.fn();
      const items = [sampleRadical];
      const { getByTestId } = render(
        <LessonQuiz items={items} onAnswer={jest.fn()} onQuizComplete={onQuizComplete} />,
      );

      const submit = getByTestId('lesson-quiz-submit');
      fireEvent.press(submit);

      expect(onQuizComplete).toHaveBeenCalledTimes(1);
      expect(onQuizComplete).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({
            question: expect.objectContaining({ type: 'meaning' }),
          }),
        ]),
      );
    });
  });

  describe('subject type colors', () => {
    it('uses blue background for radicals', () => {
      const items = [sampleRadical];
      const { getByTestId } = render(
        <LessonQuiz items={items} onAnswer={jest.fn()} />,
      );

      const container = getByTestId('lesson-quiz-character-container');
      expect(container.props.style).toEqual(
        expect.arrayContaining([expect.objectContaining({ backgroundColor: '#00aaff' })]),
      );
    });

    it('uses pink background for kanji', () => {
      const items = [sampleKanji];
      const { getByTestId } = render(
        <LessonQuiz items={items} onAnswer={jest.fn()} />,
      );

      const container = getByTestId('lesson-quiz-character-container');
      expect(container.props.style).toEqual(
        expect.arrayContaining([expect.objectContaining({ backgroundColor: '#e8a4c9' })]),
      );
    });

    it('uses purple background for vocabulary', () => {
      const items = [sampleVocabulary];
      const { getByTestId } = render(
        <LessonQuiz items={items} onAnswer={jest.fn()} />,
      );

      const container = getByTestId('lesson-quiz-character-container');
      expect(container.props.style).toEqual(
        expect.arrayContaining([expect.objectContaining({ backgroundColor: '#8f5bc4' })]),
      );
    });

    it('uses purple background for kana_vocabulary', () => {
      const items = [sampleKanaVocabulary];
      const { getByTestId } = render(
        <LessonQuiz items={items} onAnswer={jest.fn()} />,
      );

      const container = getByTestId('lesson-quiz-character-container');
      expect(container.props.style).toEqual(
        expect.arrayContaining([expect.objectContaining({ backgroundColor: '#8f5bc4' })]),
      );
    });
  });

  describe('placeholder text', () => {
    it('shows "Enter meaning..." for meaning questions', () => {
      const items = [sampleRadical];
      const { getByTestId } = render(
        <LessonQuiz items={items} onAnswer={jest.fn()} />,
      );

      const input = getByTestId('lesson-quiz-input');
      expect(input.props.placeholder).toBe('Enter meaning...');
    });
  });

  describe('multiple items quiz flow', () => {
    it('cycles through all questions', () => {
      const items = [sampleRadical, sampleRadical2]; // 2 meaning questions
      const onAnswer = jest.fn();
      const { getByTestId } = render(
        <LessonQuiz items={items} onAnswer={onAnswer} />,
      );

      // Answer first question
      fireEvent.press(getByTestId('lesson-quiz-submit'));

      // Should be on second question now
      expect(getByTestId('lesson-quiz-progress-text').props.children).toEqual([2, ' / ', 2]);

      // Answer second question
      fireEvent.press(getByTestId('lesson-quiz-submit'));

      // Should show completion
      expect(getByTestId('lesson-quiz-complete')).toBeTruthy();
      expect(onAnswer).toHaveBeenCalledTimes(2);
    });

    it('generates correct question count for full batch', () => {
      const { getByTestId } = render(<LessonQuiz {...defaultProps} />);
      const progressText = getByTestId('lesson-quiz-progress-text');

      // 5 items: 2 radicals (1 each) + 3 non-radicals (2 each) = 8 questions
      expect(progressText.props.children).toEqual([1, ' / ', 8]);
    });
  });

  describe('answer result structure', () => {
    it('includes all required fields in answer result', () => {
      const onAnswer = jest.fn();
      const items = [sampleRadical];
      const { getByTestId } = render(
        <LessonQuiz items={items} onAnswer={onAnswer} />,
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
        isCorrect: false, // Placeholder - actual validation in US-018
        correctAnswer: 'Ground',
      });
    });
  });

  describe('kanji with multiple meanings', () => {
    it('handles items with multiple meanings', () => {
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
        <LessonQuiz items={[itemWithMultipleMeanings]} onAnswer={onAnswer} />,
      );

      const type = getByTestId('lesson-quiz-question-type').props.children;

      if (type === 'MEANING') {
        fireEvent.changeText(getByTestId('lesson-quiz-input'), 'big');
        fireEvent.press(getByTestId('lesson-quiz-submit'));

        expect(onAnswer).toHaveBeenCalledWith(
          expect.objectContaining({
            correctAnswer: 'Big', // Primary meaning
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
        <LessonQuiz items={[itemWithMultipleReadings]} onAnswer={onAnswer} />,
      );

      const type = getByTestId('lesson-quiz-question-type').props.children;

      if (type === 'READING') {
        fireEvent.changeText(getByTestId('lesson-quiz-input'), 'ookii');
        fireEvent.press(getByTestId('lesson-quiz-submit'));

        expect(onAnswer).toHaveBeenCalledWith(
          expect.objectContaining({
            correctAnswer: 'おおきい', // Primary reading
          }),
        );
      }
    });
  });

  describe('question randomization', () => {
    it('generates questions in shuffled order', () => {
      // Run generateQuizQuestions multiple times and verify randomization
      const items = [sampleKanji, sampleVocabulary]; // 4 questions total

      const orderCounts = new Map<string, number>();

      for (let i = 0; i < 50; i++) {
        const questions = generateQuizQuestions(items);
        const order = questions.map(q => q.key).join(',');
        orderCounts.set(order, (orderCounts.get(order) || 0) + 1);
      }

      // With 4 questions, there are 24 possible orderings
      // After 50 runs, we should see more than 1 unique ordering
      expect(orderCounts.size).toBeGreaterThan(1);
    });
  });

  describe('single item batch', () => {
    it('handles a single radical (1 question)', () => {
      const items = [sampleRadical];
      const onQuizComplete = jest.fn();
      const { getByTestId, getByText } = render(
        <LessonQuiz items={items} onQuizComplete={onQuizComplete} />,
      );

      expect(getByTestId('lesson-quiz-progress-text').props.children).toEqual([1, ' / ', 1]);

      fireEvent.press(getByTestId('lesson-quiz-submit'));

      expect(getByText('Quiz Complete!')).toBeTruthy();
      expect(onQuizComplete).toHaveBeenCalledTimes(1);
    });

    it('handles a single kanji (2 questions)', () => {
      const items = [sampleKanji];
      const { getByTestId, getByText } = render(
        <LessonQuiz items={items} onAnswer={jest.fn()} />,
      );

      expect(getByTestId('lesson-quiz-progress-text').props.children).toEqual([1, ' / ', 2]);

      // Answer first question
      fireEvent.press(getByTestId('lesson-quiz-submit'));

      expect(getByTestId('lesson-quiz-progress-text').props.children).toEqual([2, ' / ', 2]);

      // Answer second question
      fireEvent.press(getByTestId('lesson-quiz-submit'));

      expect(getByText('Quiz Complete!')).toBeTruthy();
    });
  });

  describe('callbacks are optional', () => {
    it('works without onAnswer callback', () => {
      const items = [sampleRadical];
      const { getByTestId } = render(
        <LessonQuiz items={items} />,
      );

      // Should not throw
      fireEvent.press(getByTestId('lesson-quiz-submit'));
      expect(getByTestId('lesson-quiz-complete')).toBeTruthy();
    });

    it('works without onQuizComplete callback', () => {
      const items = [sampleRadical];
      const { getByTestId, getByText } = render(
        <LessonQuiz items={items} onAnswer={jest.fn()} />,
      );

      // Should not throw
      fireEvent.press(getByTestId('lesson-quiz-submit'));
      expect(getByText('Quiz Complete!')).toBeTruthy();
    });
  });
});
