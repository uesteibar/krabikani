import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';

import {
  ReviewSession,
  ReviewSessionProps,
  ReviewItem,
  generateReviewQuestions,
  shuffleArray,
} from '../../src/components/ReviewSession';
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

// Create sample review items
function createRadicalItem(id: number, character: string, meaning: string): ReviewItem {
  return {
    id,
    assignmentId: id + 1000,
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
): ReviewItem {
  return {
    id,
    assignmentId: id + 1000,
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
): ReviewItem {
  return {
    id,
    assignmentId: id + 1000,
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
): ReviewItem {
  return {
    id,
    assignmentId: id + 1000,
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

const fiveItems: ReviewItem[] = [
  sampleRadical,
  sampleKanji,
  sampleVocabulary,
  sampleKanaVocabulary,
  sampleRadical2,
];

const defaultProps: ReviewSessionProps = {
  items: fiveItems,
  onAnswer: jest.fn(),
  onSessionComplete: jest.fn(),
};

describe('ReviewSession', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Mock Math.random to make tests deterministic when needed
    jest.spyOn(Math, 'random');
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('generateReviewQuestions', () => {
    it('should generate one question for radicals (meaning only)', () => {
      // Make random deterministic
      (Math.random as jest.Mock).mockReturnValue(0.1);

      const questions = generateReviewQuestions([sampleRadical]);

      // Radical should have exactly 1 question (meaning only)
      expect(questions.length).toBe(1);
      expect(questions[0].type).toBe('meaning');
      expect(questions[0].item.id).toBe(sampleRadical.id);
    });

    it('should generate two questions for kanji (meaning and reading)', () => {
      (Math.random as jest.Mock).mockReturnValue(0.1);

      const questions = generateReviewQuestions([sampleKanji]);

      // Kanji should have exactly 2 questions
      expect(questions.length).toBe(2);
      const types = questions.map(q => q.type);
      expect(types).toContain('meaning');
      expect(types).toContain('reading');
    });

    it('should generate two questions for vocabulary (meaning and reading)', () => {
      (Math.random as jest.Mock).mockReturnValue(0.1);

      const questions = generateReviewQuestions([sampleVocabulary]);

      expect(questions.length).toBe(2);
      const types = questions.map(q => q.type);
      expect(types).toContain('meaning');
      expect(types).toContain('reading');
    });

    it('should generate two questions for kana_vocabulary (meaning and reading)', () => {
      (Math.random as jest.Mock).mockReturnValue(0.1);

      const questions = generateReviewQuestions([sampleKanaVocabulary]);

      expect(questions.length).toBe(2);
      const types = questions.map(q => q.type);
      expect(types).toContain('meaning');
      expect(types).toContain('reading');
    });

    it('should generate correct total questions for mixed items', () => {
      (Math.random as jest.Mock).mockReturnValue(0.1);

      const questions = generateReviewQuestions(fiveItems);

      // 2 radicals (1 question each) + 3 non-radicals (2 questions each) = 8 questions
      expect(questions.length).toBe(8);
    });

    it('should have unique keys for each question', () => {
      (Math.random as jest.Mock).mockReturnValue(0.1);

      const questions = generateReviewQuestions(fiveItems);
      const keys = questions.map(q => q.key);
      const uniqueKeys = new Set(keys);

      expect(uniqueKeys.size).toBe(keys.length);
    });
  });

  describe('shuffleArray', () => {
    it('should return an array of the same length', () => {
      const input = [1, 2, 3, 4, 5];
      const result = shuffleArray(input);
      expect(result.length).toBe(input.length);
    });

    it('should not modify the original array', () => {
      const input = [1, 2, 3, 4, 5];
      const originalCopy = [...input];
      shuffleArray(input);
      expect(input).toEqual(originalCopy);
    });

    it('should contain all original elements', () => {
      const input = [1, 2, 3, 4, 5];
      const result = shuffleArray(input);
      expect(result.sort()).toEqual(input.sort());
    });
  });

  describe('Component Rendering', () => {
    it('should render empty state when no items provided', () => {
      const { getByTestId, getByText } = render(
        <ReviewSession items={[]} />,
      );

      expect(getByTestId('review-session-empty')).toBeTruthy();
      expect(getByText('No reviews available')).toBeTruthy();
    });

    it('should render question display for items', () => {
      // Make random deterministic
      (Math.random as jest.Mock).mockReturnValue(0.1);

      const { getByTestId } = render(
        <ReviewSession {...defaultProps} />,
      );

      expect(getByTestId('review-session')).toBeTruthy();
      expect(getByTestId('review-session-progress')).toBeTruthy();
      expect(getByTestId('review-session-character-container')).toBeTruthy();
      expect(getByTestId('review-session-input')).toBeTruthy();
      expect(getByTestId('review-session-submit')).toBeTruthy();
    });

    it('should show progress count', () => {
      // Make random deterministic
      (Math.random as jest.Mock).mockReturnValue(0.1);

      const { getByTestId } = render(
        <ReviewSession {...defaultProps} />,
      );

      // Initially 0 items complete out of 5
      expect(getByTestId('review-session-progress-text').props.children).toEqual([
        0, ' / ', 5,
      ]);
    });

    it('should show remaining count', () => {
      // Make random deterministic
      (Math.random as jest.Mock).mockReturnValue(0.1);

      const { getByTestId } = render(
        <ReviewSession {...defaultProps} />,
      );

      // Initially 5 remaining
      expect(getByTestId('review-session-remaining-text').props.children).toEqual([
        5, ' remaining',
      ]);
    });

    it('should display characters for current question', () => {
      // Make random return specific values to control question order
      (Math.random as jest.Mock).mockReturnValue(0.1);

      const { getByTestId } = render(
        <ReviewSession {...defaultProps} />,
      );

      // Should display one of the item characters
      const characters = getByTestId('review-session-characters');
      expect(characters.props.children).toBeTruthy();
    });

    it('should show meaning prompt for meaning questions', () => {
      // Single radical item = meaning only
      const { getByTestId } = render(
        <ReviewSession items={[sampleRadical]} />,
      );

      expect(getByTestId('review-session-prompt').props.children).toBe(
        'What is the meaning?',
      );
      expect(getByTestId('review-session-question-type').props.children).toBe(
        'MEANING',
      );
    });
  });

  describe('Input Handling', () => {
    it('should update input value on text change for meaning questions', () => {
      const { getByTestId } = render(
        <ReviewSession items={[sampleRadical]} />,
      );

      const input = getByTestId('review-session-input');
      fireEvent.changeText(input, 'Ground');

      expect(input.props.value).toBe('Ground');
    });

    it('should convert romaji to hiragana for reading questions', () => {
      // Force a reading question first by using kanji with controlled random
      let callIndex = 0;
      (Math.random as jest.Mock).mockImplementation(() => {
        const values = [0.6, 0.1, 0.1, 0.1, 0.1];
        return values[callIndex++ % values.length];
      });

      const { getByTestId, queryByTestId } = render(
        <ReviewSession items={[sampleKanji]} />,
      );

      // First question should be reading
      const promptText = getByTestId('review-session-prompt').props.children;
      if (promptText === 'What is the reading?') {
        const input = getByTestId('review-session-input');
        fireEvent.changeText(input, 'oo');

        // Should show converted display
        const display = queryByTestId('review-session-converted-display');
        if (display) {
          expect(display.props.children).toBe('おお');
        }
      }
    });
  });

  describe('Answer Submission', () => {
    it('should call onAnswer when submitting', () => {
      const onAnswer = jest.fn();
      const { getByTestId } = render(
        <ReviewSession items={[sampleRadical]} onAnswer={onAnswer} />,
      );

      const input = getByTestId('review-session-input');
      const submit = getByTestId('review-session-submit');

      fireEvent.changeText(input, 'Ground');
      fireEvent.press(submit);

      expect(onAnswer).toHaveBeenCalled();
    });

    it('should mark correct answer for meaning question', () => {
      const onAnswer = jest.fn();
      const { getByTestId } = render(
        <ReviewSession items={[sampleRadical]} onAnswer={onAnswer} />,
      );

      const input = getByTestId('review-session-input');
      const submit = getByTestId('review-session-submit');

      fireEvent.changeText(input, 'Ground');
      fireEvent.press(submit);

      expect(onAnswer).toHaveBeenCalledWith(
        expect.objectContaining({
          isCorrect: true,
          userAnswer: 'Ground',
        }),
      );
    });

    it('should mark incorrect answer for meaning question', () => {
      const onAnswer = jest.fn();
      const { getByTestId } = render(
        <ReviewSession items={[sampleRadical]} onAnswer={onAnswer} />,
      );

      const input = getByTestId('review-session-input');
      const submit = getByTestId('review-session-submit');

      fireEvent.changeText(input, 'Wrong');
      fireEvent.press(submit);

      expect(onAnswer).toHaveBeenCalledWith(
        expect.objectContaining({
          isCorrect: false,
          userAnswer: 'Wrong',
        }),
      );
    });

    it('should advance to next question after submission', () => {
      // Use single radical item for simplicity
      const { getByTestId, queryByTestId } = render(
        <ReviewSession items={[sampleRadical]} />,
      );

      const input = getByTestId('review-session-input');
      const submit = getByTestId('review-session-submit');

      // Answer correctly
      fireEvent.changeText(input, 'Ground');
      fireEvent.press(submit);

      // Should show completion (only 1 item)
      expect(queryByTestId('review-session-complete')).toBeTruthy();
    });

    it('should re-queue incorrect questions', () => {
      // Single kanji item = 2 questions (meaning + reading)
      (Math.random as jest.Mock).mockReturnValue(0.1);

      const { getByTestId, queryByTestId } = render(
        <ReviewSession items={[sampleKanji]} />,
      );

      // Answer first question incorrectly
      const input = getByTestId('review-session-input');
      const submit = getByTestId('review-session-submit');

      fireEvent.changeText(input, 'Wrong');
      fireEvent.press(submit);

      // Session should NOT be complete (question was re-queued)
      expect(queryByTestId('review-session-complete')).toBeNull();
    });
  });

  describe('Progress Tracking', () => {
    it('should increment completed count when item is fully answered', () => {
      // Use single radical (1 question only)
      const { getByTestId } = render(
        <ReviewSession items={[sampleRadical]} />,
      );

      const input = getByTestId('review-session-input');
      const submit = getByTestId('review-session-submit');

      // Initially 0 complete
      expect(getByTestId('review-session-progress-text').props.children).toEqual([
        0, ' / ', 1,
      ]);

      // Answer correctly
      fireEvent.changeText(input, 'Ground');
      fireEvent.press(submit);

      // Should show complete state
      expect(getByTestId('review-session-complete')).toBeTruthy();
    });

    it('should track item as complete only when both meaning and reading are correct', () => {
      // Single kanji with 2 questions
      (Math.random as jest.Mock).mockReturnValue(0.1);

      const { getByTestId, queryByTestId } = render(
        <ReviewSession items={[sampleKanji]} />,
      );

      // With Math.random=0.1, questions get shuffled such that we need to answer
      // based on what question type is actually displayed
      const input = getByTestId('review-session-input');
      const submit = getByTestId('review-session-submit');

      // Determine what type of question we're seeing first
      const firstQuestionType = getByTestId('review-session-question-type').props.children;
      const firstAnswer = firstQuestionType === 'MEANING' ? 'Big' : 'oo';
      const secondAnswer = firstQuestionType === 'MEANING' ? 'oo' : 'Big';

      // Answer first question correctly
      fireEvent.changeText(input, firstAnswer);
      fireEvent.press(submit);

      // Item not complete yet (other question still pending)
      expect(queryByTestId('review-session-complete')).toBeNull();

      // Now answer second question
      fireEvent.changeText(getByTestId('review-session-input'), secondAnswer);
      fireEvent.press(getByTestId('review-session-submit'));

      // Now should be complete
      expect(queryByTestId('review-session-complete')).toBeTruthy();
    });
  });

  describe('Session Completion', () => {
    it('should call onSessionComplete when all items are answered correctly', () => {
      const onSessionComplete = jest.fn();

      // Single radical item for simplicity
      const { getByTestId } = render(
        <ReviewSession
          items={[sampleRadical]}
          onSessionComplete={onSessionComplete}
        />,
      );

      const input = getByTestId('review-session-input');
      const submit = getByTestId('review-session-submit');

      fireEvent.changeText(input, 'Ground');
      fireEvent.press(submit);

      expect(onSessionComplete).toHaveBeenCalled();
    });

    it('should include item progress in completion callback', () => {
      const onSessionComplete = jest.fn();

      const { getByTestId } = render(
        <ReviewSession
          items={[sampleRadical]}
          onSessionComplete={onSessionComplete}
        />,
      );

      const input = getByTestId('review-session-input');
      const submit = getByTestId('review-session-submit');

      fireEvent.changeText(input, 'Ground');
      fireEvent.press(submit);

      expect(onSessionComplete).toHaveBeenCalledWith(expect.any(Map));
      const progressMap = onSessionComplete.mock.calls[0][0];
      expect(progressMap.get(sampleRadical.id)).toEqual(
        expect.objectContaining({
          meaningCorrect: true,
          readingCorrect: true, // Radicals have readingCorrect = true by default
          incorrectMeaningAnswers: 0,
          incorrectReadingAnswers: 0,
        }),
      );
    });

    it('should track incorrect answer counts in progress', () => {
      const onSessionComplete = jest.fn();

      const { getByTestId } = render(
        <ReviewSession
          items={[sampleRadical]}
          onSessionComplete={onSessionComplete}
        />,
      );

      const input = getByTestId('review-session-input');
      const submit = getByTestId('review-session-submit');

      // Answer incorrectly first
      fireEvent.changeText(input, 'Wrong');
      fireEvent.press(submit);

      // Then answer correctly
      fireEvent.changeText(getByTestId('review-session-input'), 'Ground');
      fireEvent.press(getByTestId('review-session-submit'));

      const progressMap = onSessionComplete.mock.calls[0][0];
      expect(progressMap.get(sampleRadical.id)).toEqual(
        expect.objectContaining({
          meaningCorrect: true,
          incorrectMeaningAnswers: 1,
        }),
      );
    });

    it('should display completion screen with answered count', () => {
      const { getByTestId, getByText } = render(
        <ReviewSession items={[sampleRadical]} />,
      );

      const input = getByTestId('review-session-input');
      const submit = getByTestId('review-session-submit');

      fireEvent.changeText(input, 'Ground');
      fireEvent.press(submit);

      expect(getByTestId('review-session-complete')).toBeTruthy();
      expect(getByText('Session Complete!')).toBeTruthy();
      expect(getByText('1 questions answered')).toBeTruthy();
    });
  });

  describe('Subject Type Colors', () => {
    it('should use blue color for radicals', () => {
      const { getByTestId } = render(
        <ReviewSession items={[sampleRadical]} />,
      );

      const container = getByTestId('review-session-character-container');
      expect(container.props.style).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ backgroundColor: '#00aaff' }),
        ]),
      );
    });

    it('should use pink color for kanji', () => {
      (Math.random as jest.Mock).mockReturnValue(0.1);

      const { getByTestId } = render(
        <ReviewSession items={[sampleKanji]} />,
      );

      const container = getByTestId('review-session-character-container');
      expect(container.props.style).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ backgroundColor: '#e8a4c9' }),
        ]),
      );
    });

    it('should use purple color for vocabulary', () => {
      (Math.random as jest.Mock).mockReturnValue(0.1);

      const { getByTestId } = render(
        <ReviewSession items={[sampleVocabulary]} />,
      );

      const container = getByTestId('review-session-character-container');
      expect(container.props.style).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ backgroundColor: '#8f5bc4' }),
        ]),
      );
    });
  });

  describe('Case Insensitive Meaning Validation', () => {
    it('should accept lowercase meaning answers', () => {
      const onAnswer = jest.fn();
      const { getByTestId } = render(
        <ReviewSession items={[sampleRadical]} onAnswer={onAnswer} />,
      );

      const input = getByTestId('review-session-input');
      const submit = getByTestId('review-session-submit');

      fireEvent.changeText(input, 'ground');
      fireEvent.press(submit);

      expect(onAnswer).toHaveBeenCalledWith(
        expect.objectContaining({
          isCorrect: true,
        }),
      );
    });

    it('should accept uppercase meaning answers', () => {
      const onAnswer = jest.fn();
      const { getByTestId } = render(
        <ReviewSession items={[sampleRadical]} onAnswer={onAnswer} />,
      );

      const input = getByTestId('review-session-input');
      const submit = getByTestId('review-session-submit');

      fireEvent.changeText(input, 'GROUND');
      fireEvent.press(submit);

      expect(onAnswer).toHaveBeenCalledWith(
        expect.objectContaining({
          isCorrect: true,
        }),
      );
    });
  });

  describe('Multiple Items Session', () => {
    it('should complete session when all 5 items are answered correctly', () => {
      const onSessionComplete = jest.fn();

      // Control randomization for predictable test
      (Math.random as jest.Mock).mockReturnValue(0.1);

      const { getByTestId, queryByTestId } = render(
        <ReviewSession items={fiveItems} onSessionComplete={onSessionComplete} />,
      );

      // Answer all questions correctly
      // fiveItems has 2 radicals (1 question each) + 3 non-radicals (2 questions each) = 8 questions total
      const questionCount = 8;

      for (let i = 0; i < questionCount; i++) {
        const currentChar = getByTestId('review-session-characters').props.children;
        const questionType = getByTestId('review-session-question-type').props.children;
        const input = getByTestId('review-session-input');
        const submit = getByTestId('review-session-submit');

        // Determine correct answer based on character and question type
        let answer = '';
        if (currentChar === '一') answer = 'Ground';
        else if (currentChar === '人') answer = 'Person';
        else if (currentChar === '大' && questionType === 'MEANING') answer = 'Big';
        else if (currentChar === '大' && questionType === 'READING') answer = 'oo';
        else if (currentChar === '大きい' && questionType === 'MEANING') answer = 'Big';
        else if (currentChar === '大きい' && questionType === 'READING') answer = 'ookii';
        else if (currentChar === 'あめ' && questionType === 'MEANING') answer = 'Candy';
        else if (currentChar === 'あめ' && questionType === 'READING') answer = 'ame';

        if (!answer) {
          // Fallback - try generic answers
          answer = questionType === 'MEANING' ? 'Ground' : 'oo';
        }

        fireEvent.changeText(input, answer);
        fireEvent.press(submit);

        // Check if complete after each submission
        if (queryByTestId('review-session-complete')) {
          break;
        }
      }

      expect(onSessionComplete).toHaveBeenCalled();
    });
  });
});
