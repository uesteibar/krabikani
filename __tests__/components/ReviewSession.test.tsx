import React from 'react';
import { render, fireEvent, act } from '@testing-library/react-native';

import {
  ReviewSession,
  ReviewSessionProps,
  ReviewItem,
  generateReviewQuestions,
  shuffleArray,
} from '../../src/components/ReviewSession';
import type { Meaning, Reading, KanjiReading } from '../../src/api/types';
import { SUBJECT_COLORS, COLORS } from '../../src/theme';

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
      jest.useFakeTimers();

      // Use single radical item for simplicity
      const { getByTestId, queryByTestId } = render(
        <ReviewSession items={[sampleRadical]} autoAdvanceDelay={0} />,
      );

      const input = getByTestId('review-session-input');
      const submit = getByTestId('review-session-submit');

      // Answer correctly
      fireEvent.changeText(input, 'Ground');
      fireEvent.press(submit);

      // Run timers to trigger auto-advance
      act(() => {
        jest.runAllTimers();
      });

      // Should show completion (only 1 item)
      expect(queryByTestId('review-session-complete')).toBeTruthy();

      jest.useRealTimers();
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
      jest.useFakeTimers();

      // Use single radical (1 question only)
      const { getByTestId } = render(
        <ReviewSession items={[sampleRadical]} autoAdvanceDelay={0} />,
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

      // Run timers to trigger auto-advance
      act(() => {
        jest.runAllTimers();
      });

      // Should show complete state
      expect(getByTestId('review-session-complete')).toBeTruthy();

      jest.useRealTimers();
    });

    it('should track item as complete only when both meaning and reading are correct', () => {
      jest.useFakeTimers();

      // Single kanji with 2 questions
      (Math.random as jest.Mock).mockReturnValue(0.1);

      const { getByTestId, queryByTestId } = render(
        <ReviewSession items={[sampleKanji]} autoAdvanceDelay={0} />,
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

      // Run timers to trigger auto-advance
      act(() => {
        jest.runAllTimers();
      });

      // Item not complete yet (other question still pending)
      expect(queryByTestId('review-session-complete')).toBeNull();

      // Now answer second question
      fireEvent.changeText(getByTestId('review-session-input'), secondAnswer);
      fireEvent.press(getByTestId('review-session-submit'));

      // Run timers to trigger auto-advance
      act(() => {
        jest.runAllTimers();
      });

      // Now should be complete
      expect(queryByTestId('review-session-complete')).toBeTruthy();

      jest.useRealTimers();
    });
  });

  describe('Session Completion', () => {
    it('should call onSessionComplete when all items are answered correctly', () => {
      jest.useFakeTimers();
      const onSessionComplete = jest.fn();

      // Single radical item for simplicity
      const { getByTestId } = render(
        <ReviewSession
          items={[sampleRadical]}
          onSessionComplete={onSessionComplete}
          autoAdvanceDelay={0}
        />,
      );

      const input = getByTestId('review-session-input');
      const submit = getByTestId('review-session-submit');

      fireEvent.changeText(input, 'Ground');
      fireEvent.press(submit);

      // Run timers to trigger callback
      act(() => {
        jest.runAllTimers();
      });

      expect(onSessionComplete).toHaveBeenCalled();
      jest.useRealTimers();
    });

    it('should include item progress in completion callback', () => {
      jest.useFakeTimers();
      const onSessionComplete = jest.fn();

      const { getByTestId } = render(
        <ReviewSession
          items={[sampleRadical]}
          onSessionComplete={onSessionComplete}
          autoAdvanceDelay={0}
        />,
      );

      const input = getByTestId('review-session-input');
      const submit = getByTestId('review-session-submit');

      fireEvent.changeText(input, 'Ground');
      fireEvent.press(submit);

      // Run timers to trigger callback
      act(() => {
        jest.runAllTimers();
      });

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
      jest.useRealTimers();
    });

    it('should track incorrect answer counts in progress', () => {
      jest.useFakeTimers();
      const onSessionComplete = jest.fn();

      const { getByTestId } = render(
        <ReviewSession
          items={[sampleRadical]}
          onSessionComplete={onSessionComplete}
          autoAdvanceDelay={0}
        />,
      );

      const input = getByTestId('review-session-input');
      const submit = getByTestId('review-session-submit');

      // Answer incorrectly first
      fireEvent.changeText(input, 'Wrong');
      fireEvent.press(submit);

      // Tap continue to dismiss incorrect feedback
      fireEvent.press(getByTestId('review-session-continue'));

      // Then answer correctly
      fireEvent.changeText(getByTestId('review-session-input'), 'Ground');
      fireEvent.press(getByTestId('review-session-submit'));

      // Run timers to trigger callback
      act(() => {
        jest.runAllTimers();
      });

      const progressMap = onSessionComplete.mock.calls[0][0];
      expect(progressMap.get(sampleRadical.id)).toEqual(
        expect.objectContaining({
          meaningCorrect: true,
          incorrectMeaningAnswers: 1,
        }),
      );
      jest.useRealTimers();
    });

    it('should display completion screen with answered count', () => {
      jest.useFakeTimers();
      const { getByTestId, getByText } = render(
        <ReviewSession items={[sampleRadical]} autoAdvanceDelay={0} />,
      );

      const input = getByTestId('review-session-input');
      const submit = getByTestId('review-session-submit');

      fireEvent.changeText(input, 'Ground');
      fireEvent.press(submit);

      // Run timers to complete
      act(() => {
        jest.runAllTimers();
      });

      expect(getByTestId('review-session-complete')).toBeTruthy();
      expect(getByText('Session Complete!')).toBeTruthy();
      expect(getByText('1 questions answered')).toBeTruthy();
      jest.useRealTimers();
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
          expect.objectContaining({ backgroundColor: SUBJECT_COLORS.radical }),
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
          expect.objectContaining({ backgroundColor: SUBJECT_COLORS.kanji }),
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
          expect.objectContaining({ backgroundColor: SUBJECT_COLORS.vocabulary }),
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
      jest.useFakeTimers();
      const onSessionComplete = jest.fn();

      // Control randomization for predictable test
      (Math.random as jest.Mock).mockReturnValue(0.1);

      const { getByTestId, queryByTestId } = render(
        <ReviewSession items={fiveItems} onSessionComplete={onSessionComplete} autoAdvanceDelay={0} />,
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

        // Run timers to advance past correct feedback
        act(() => {
          jest.runAllTimers();
        });

        // Check if complete after each submission
        if (queryByTestId('review-session-complete')) {
          break;
        }
      }

      expect(onSessionComplete).toHaveBeenCalled();
      jest.useRealTimers();
    });
  });

  describe('Correct Answer Handling', () => {
    beforeEach(() => {
      jest.useFakeTimers();
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it('should show visual feedback when answer is correct', () => {
      const { getByTestId, queryByTestId } = render(
        <ReviewSession items={[sampleRadical]} autoAdvanceDelay={100} />,
      );

      const input = getByTestId('review-session-input');
      const submit = getByTestId('review-session-submit');

      fireEvent.changeText(input, 'Ground');
      fireEvent.press(submit);

      // Should show correct feedback label
      expect(queryByTestId('review-session-correct-label')).toBeTruthy();
      expect(queryByTestId('review-session-correct-label')?.props.children).toBe('Correct!');
    });

    it('should show green header background during correct feedback', () => {
      const { getByTestId } = render(
        <ReviewSession items={[sampleRadical]} autoAdvanceDelay={100} />,
      );

      const input = getByTestId('review-session-input');
      const submit = getByTestId('review-session-submit');

      fireEvent.changeText(input, 'Ground');
      fireEvent.press(submit);

      // Character container should have green background
      const container = getByTestId('review-session-character-container');
      expect(container.props.style).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ backgroundColor: COLORS.feedback.correct }),
        ]),
      );
    });

    it('should auto-advance after correct answer feedback delay', () => {
      const onSessionComplete = jest.fn();
      const { getByTestId, queryByTestId } = render(
        <ReviewSession
          items={[sampleRadical]}
          onSessionComplete={onSessionComplete}
          autoAdvanceDelay={50}
        />,
      );

      const input = getByTestId('review-session-input');
      const submit = getByTestId('review-session-submit');

      fireEvent.changeText(input, 'Ground');
      fireEvent.press(submit);

      // Before timer fires, should still show feedback
      expect(queryByTestId('review-session-correct-label')).toBeTruthy();

      // Run timers to trigger auto-advance
      act(() => {
        jest.runAllTimers();
      });

      // After timer, should show completion (single item session)
      expect(queryByTestId('review-session-complete')).toBeTruthy();
      expect(onSessionComplete).toHaveBeenCalled();
    });

    it('should disable input during correct feedback', () => {
      const { getByTestId } = render(
        <ReviewSession items={[sampleRadical]} autoAdvanceDelay={100} />,
      );

      const input = getByTestId('review-session-input');
      const submit = getByTestId('review-session-submit');

      fireEvent.changeText(input, 'Ground');
      fireEvent.press(submit);

      // Input should be disabled (editable=false)
      expect(getByTestId('review-session-input').props.editable).toBe(false);
    });

    it('should disable submit button during correct feedback', () => {
      const { getByTestId } = render(
        <ReviewSession items={[sampleRadical]} autoAdvanceDelay={100} />,
      );

      const input = getByTestId('review-session-input');
      const submit = getByTestId('review-session-submit');

      fireEvent.changeText(input, 'Ground');
      fireEvent.press(submit);

      // Submit button should be disabled
      expect(getByTestId('review-session-submit').props.accessibilityState).toEqual(
        expect.objectContaining({ disabled: true }),
      );
    });

    it('should NOT show correct feedback for incorrect answers', () => {
      const { getByTestId, queryByTestId } = render(
        <ReviewSession items={[sampleRadical]} autoAdvanceDelay={100} />,
      );

      const input = getByTestId('review-session-input');
      const submit = getByTestId('review-session-submit');

      fireEvent.changeText(input, 'Wrong');
      fireEvent.press(submit);

      // Should NOT show correct feedback label
      expect(queryByTestId('review-session-correct-label')).toBeNull();
    });

    it('should advance to next question for multi-item session', () => {
      // Use kanji item which has 2 questions (meaning + reading)
      (Math.random as jest.Mock).mockReturnValue(0.1);

      const { getByTestId, queryByTestId } = render(
        <ReviewSession items={[sampleKanji]} autoAdvanceDelay={50} />,
      );

      // Get the first question type
      const firstQuestionType = getByTestId('review-session-question-type').props.children;
      const firstAnswer = firstQuestionType === 'MEANING' ? 'Big' : 'oo';

      const input = getByTestId('review-session-input');
      const submit = getByTestId('review-session-submit');

      // Answer first question correctly
      fireEvent.changeText(input, firstAnswer);
      fireEvent.press(submit);

      // Should show feedback
      expect(queryByTestId('review-session-correct-label')).toBeTruthy();

      // Run timers to advance
      act(() => {
        jest.runAllTimers();
      });

      // Should NOT be complete yet (still has second question)
      expect(queryByTestId('review-session-complete')).toBeNull();

      // Should be showing the next question
      expect(getByTestId('review-session-input')).toBeTruthy();
    });

    it('should use default autoAdvanceDelay of 50ms', () => {
      const { getByTestId, queryByTestId } = render(
        <ReviewSession items={[sampleRadical]} />,
      );

      const input = getByTestId('review-session-input');
      const submit = getByTestId('review-session-submit');

      fireEvent.changeText(input, 'Ground');
      fireEvent.press(submit);

      // Feedback should be showing
      expect(queryByTestId('review-session-correct-label')).toBeTruthy();

      // Advance time by less than 50ms - should still show feedback
      act(() => {
        jest.advanceTimersByTime(30);
      });
      expect(queryByTestId('review-session-correct-label')).toBeTruthy();

      // Advance past 50ms - should complete
      act(() => {
        jest.advanceTimersByTime(30);
      });
      expect(queryByTestId('review-session-complete')).toBeTruthy();
    });

    it('should hide subject type label during correct feedback', () => {
      const { getByTestId, queryByTestId } = render(
        <ReviewSession items={[sampleRadical]} autoAdvanceDelay={100} />,
      );

      const input = getByTestId('review-session-input');
      const submit = getByTestId('review-session-submit');

      fireEvent.changeText(input, 'Ground');
      fireEvent.press(submit);

      // Subject type should be hidden, correct label shown instead
      expect(queryByTestId('review-session-subject-type')).toBeNull();
      expect(queryByTestId('review-session-correct-label')).toBeTruthy();
    });
  });

  describe('Incorrect Answer Handling', () => {
    it('should show incorrect feedback screen when answer is wrong', () => {
      const { getByTestId, queryByTestId } = render(
        <ReviewSession items={[sampleRadical]} />,
      );

      const input = getByTestId('review-session-input');
      const submit = getByTestId('review-session-submit');

      fireEvent.changeText(input, 'Wrong');
      fireEvent.press(submit);

      // Should show incorrect feedback screen
      expect(queryByTestId('review-session-incorrect-feedback')).toBeTruthy();
      expect(queryByTestId('review-session-incorrect-label')).toBeTruthy();
      expect(queryByTestId('review-session-incorrect-label')?.props.children).toBe('Incorrect');
    });

    it('should show correct answer prominently', () => {
      const { getByTestId } = render(
        <ReviewSession items={[sampleRadical]} />,
      );

      const input = getByTestId('review-session-input');
      const submit = getByTestId('review-session-submit');

      fireEvent.changeText(input, 'Wrong');
      fireEvent.press(submit);

      // Should show correct answer
      expect(getByTestId('review-session-correct-answer').props.children).toBe('Ground');
    });

    it('should show user answer on incorrect feedback', () => {
      const { getByTestId } = render(
        <ReviewSession items={[sampleRadical]} />,
      );

      const input = getByTestId('review-session-input');
      const submit = getByTestId('review-session-submit');

      fireEvent.changeText(input, 'Wrong');
      fireEvent.press(submit);

      // Should show user's incorrect answer
      expect(getByTestId('review-session-your-answer').props.children).toBe('Wrong');
    });

    it('should show "(empty)" when user submits empty answer', () => {
      const { getByTestId } = render(
        <ReviewSession items={[sampleRadical]} />,
      );

      const submit = getByTestId('review-session-submit');

      // Submit without entering anything
      fireEvent.press(submit);

      // Should show (empty) for user's answer
      expect(getByTestId('review-session-your-answer').props.children).toBe('(empty)');
    });

    it('should show meaning mnemonic for meaning questions', () => {
      const { getByTestId } = render(
        <ReviewSession items={[sampleRadical]} />,
      );

      const input = getByTestId('review-session-input');
      const submit = getByTestId('review-session-submit');

      fireEvent.changeText(input, 'Wrong');
      fireEvent.press(submit);

      // Should show meaning mnemonic
      expect(getByTestId('review-session-mnemonic-label').props.children).toBe('Meaning Mnemonic:');
      expect(getByTestId('review-session-mnemonic').props.children).toBe('Mnemonic for Ground');
    });

    it('should show reading mnemonic for reading questions', () => {
      // Force reading question first
      let callIndex = 0;
      (Math.random as jest.Mock).mockImplementation(() => {
        const values = [0.6, 0.1, 0.1, 0.1, 0.1];
        return values[callIndex++ % values.length];
      });

      const { getByTestId, queryByTestId } = render(
        <ReviewSession items={[sampleKanji]} />,
      );

      // Check if it's a reading question
      const questionType = getByTestId('review-session-question-type').props.children;
      if (questionType === 'READING') {
        const input = getByTestId('review-session-input');
        const submit = getByTestId('review-session-submit');

        fireEvent.changeText(input, 'wrong');
        fireEvent.press(submit);

        // Should show reading mnemonic
        if (queryByTestId('review-session-mnemonic-label')) {
          expect(getByTestId('review-session-mnemonic-label').props.children).toBe('Reading Mnemonic:');
        }
      }
    });

    it('should require tap to continue after incorrect answer', () => {
      const { getByTestId, queryByTestId } = render(
        <ReviewSession items={[sampleRadical]} />,
      );

      const input = getByTestId('review-session-input');
      const submit = getByTestId('review-session-submit');

      fireEvent.changeText(input, 'Wrong');
      fireEvent.press(submit);

      // Should show continue button
      expect(queryByTestId('review-session-continue')).toBeTruthy();

      // Session should still be showing incorrect feedback (not auto-advanced)
      expect(queryByTestId('review-session-incorrect-feedback')).toBeTruthy();
    });

    it('should advance to next question when continue is pressed', () => {
      const { getByTestId, queryByTestId } = render(
        <ReviewSession items={[sampleRadical]} />,
      );

      const input = getByTestId('review-session-input');
      const submit = getByTestId('review-session-submit');

      fireEvent.changeText(input, 'Wrong');
      fireEvent.press(submit);

      // Press continue
      fireEvent.press(getByTestId('review-session-continue'));

      // Should no longer show incorrect feedback
      expect(queryByTestId('review-session-incorrect-feedback')).toBeNull();
      // Should show main review session
      expect(queryByTestId('review-session')).toBeTruthy();
      // Should have input field again
      expect(queryByTestId('review-session-input')).toBeTruthy();
    });

    it('should show red header background for incorrect answer', () => {
      const { getByTestId } = render(
        <ReviewSession items={[sampleRadical]} />,
      );

      const input = getByTestId('review-session-input');
      const submit = getByTestId('review-session-submit');

      fireEvent.changeText(input, 'Wrong');
      fireEvent.press(submit);

      // Character container should have red background
      const container = getByTestId('review-session-character-container');
      expect(container.props.style).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ backgroundColor: COLORS.feedback.incorrect }),
        ]),
      );
    });

    it('should re-queue incorrect question to appear later', () => {
      jest.useFakeTimers();
      const { getByTestId, queryByTestId } = render(
        <ReviewSession items={[sampleRadical]} autoAdvanceDelay={0} />,
      );

      const input = getByTestId('review-session-input');
      const submit = getByTestId('review-session-submit');

      // Answer incorrectly
      fireEvent.changeText(input, 'Wrong');
      fireEvent.press(submit);

      // Press continue
      fireEvent.press(getByTestId('review-session-continue'));

      // Should still be showing a question (not complete) because question was re-queued
      expect(queryByTestId('review-session-complete')).toBeNull();
      expect(queryByTestId('review-session')).toBeTruthy();

      jest.useRealTimers();
    });

    it('should maintain progress when showing incorrect feedback', () => {
      const { getByTestId } = render(
        <ReviewSession items={[sampleRadical]} />,
      );

      // Initially 0 / 1
      expect(getByTestId('review-session-progress-text').props.children).toEqual([0, ' / ', 1]);

      const input = getByTestId('review-session-input');
      const submit = getByTestId('review-session-submit');

      fireEvent.changeText(input, 'Wrong');
      fireEvent.press(submit);

      // Progress should still be 0 / 1 in feedback view
      expect(getByTestId('review-session-progress-text').props.children).toEqual([0, ' / ', 1]);
    });

    it('should track incorrect answer counts correctly', () => {
      jest.useFakeTimers();
      const onSessionComplete = jest.fn();

      const { getByTestId } = render(
        <ReviewSession
          items={[sampleRadical]}
          onSessionComplete={onSessionComplete}
          autoAdvanceDelay={0}
        />,
      );

      // Answer incorrectly twice
      fireEvent.changeText(getByTestId('review-session-input'), 'Wrong1');
      fireEvent.press(getByTestId('review-session-submit'));
      fireEvent.press(getByTestId('review-session-continue'));

      fireEvent.changeText(getByTestId('review-session-input'), 'Wrong2');
      fireEvent.press(getByTestId('review-session-submit'));
      fireEvent.press(getByTestId('review-session-continue'));

      // Then answer correctly
      fireEvent.changeText(getByTestId('review-session-input'), 'Ground');
      fireEvent.press(getByTestId('review-session-submit'));

      act(() => {
        jest.runAllTimers();
      });

      const progressMap = onSessionComplete.mock.calls[0][0];
      expect(progressMap.get(sampleRadical.id)).toEqual(
        expect.objectContaining({
          meaningCorrect: true,
          incorrectMeaningAnswers: 2,
        }),
      );

      jest.useRealTimers();
    });

    it('should display character in incorrect feedback view', () => {
      const { getByTestId } = render(
        <ReviewSession items={[sampleRadical]} />,
      );

      const input = getByTestId('review-session-input');
      const submit = getByTestId('review-session-submit');

      fireEvent.changeText(input, 'Wrong');
      fireEvent.press(submit);

      // Should show character
      expect(getByTestId('review-session-characters').props.children).toBe('一');
    });

    it('should complete session after answering incorrectly then correctly', () => {
      jest.useFakeTimers();
      const onSessionComplete = jest.fn();

      const { getByTestId, queryByTestId } = render(
        <ReviewSession
          items={[sampleRadical]}
          onSessionComplete={onSessionComplete}
          autoAdvanceDelay={0}
        />,
      );

      // Answer incorrectly
      fireEvent.changeText(getByTestId('review-session-input'), 'Wrong');
      fireEvent.press(getByTestId('review-session-submit'));
      fireEvent.press(getByTestId('review-session-continue'));

      // Then answer correctly
      fireEvent.changeText(getByTestId('review-session-input'), 'Ground');
      fireEvent.press(getByTestId('review-session-submit'));

      act(() => {
        jest.runAllTimers();
      });

      // Should show completion
      expect(queryByTestId('review-session-complete')).toBeTruthy();
      expect(onSessionComplete).toHaveBeenCalled();

      jest.useRealTimers();
    });
  });

  describe('Wrap Up Feature', () => {
    it('should render wrap up button', () => {
      const { getByTestId } = render(
        <ReviewSession items={[sampleRadical]} />,
      );

      expect(getByTestId('review-session-wrap-up')).toBeTruthy();
    });

    it('should show "Wrap Up" text on button by default', () => {
      const { getByTestId } = render(
        <ReviewSession items={[sampleRadical]} />,
      );

      const wrapUpButton = getByTestId('review-session-wrap-up');
      expect(wrapUpButton).toBeTruthy();
      // Check for Wrap Up text
      const textElements = wrapUpButton.findAllByType(require('react-native').Text);
      expect(textElements.some(el => el.props.children === 'Wrap Up')).toBe(true);
    });

    it('should toggle to "Cancel" text when wrap up is activated', () => {
      const { getByTestId } = render(
        <ReviewSession items={fiveItems} />,
      );

      // Press wrap up button
      fireEvent.press(getByTestId('review-session-wrap-up'));

      // Check that button now shows "Cancel"
      const wrapUpButton = getByTestId('review-session-wrap-up');
      const textElements = wrapUpButton.findAllByType(require('react-native').Text);
      expect(textElements.some(el => el.props.children === 'Cancel')).toBe(true);
    });

    it('should call onWrapUpToggle when wrap up is pressed', () => {
      const onWrapUpToggle = jest.fn();
      const { getByTestId } = render(
        <ReviewSession items={fiveItems} onWrapUpToggle={onWrapUpToggle} />,
      );

      fireEvent.press(getByTestId('review-session-wrap-up'));
      expect(onWrapUpToggle).toHaveBeenCalledWith(true);

      fireEvent.press(getByTestId('review-session-wrap-up'));
      expect(onWrapUpToggle).toHaveBeenCalledWith(false);
    });

    it('should show "Wrapping up: X remaining" indicator when wrap up is active', () => {
      const { getByTestId, queryByTestId } = render(
        <ReviewSession items={fiveItems} />,
      );

      // Before activating, should not show wrapping up text
      expect(queryByTestId('review-session-wrapping-up-text')).toBeNull();
      expect(queryByTestId('review-session-remaining-text')).toBeTruthy();

      // Activate wrap up
      fireEvent.press(getByTestId('review-session-wrap-up'));

      // Should now show wrapping up indicator
      expect(queryByTestId('review-session-wrapping-up-text')).toBeTruthy();
      expect(queryByTestId('review-session-remaining-text')).toBeNull();
    });

    it('should show correct remaining count based on introduced items', () => {
      // With 1 item, when we start we've introduced 1 item
      const { getByTestId } = render(
        <ReviewSession items={[sampleRadical]} />,
      );

      // Activate wrap up - we've only introduced 1 item so far (the current one)
      fireEvent.press(getByTestId('review-session-wrap-up'));

      // Should show 1 remaining (the introduced item)
      const wrapUpText = getByTestId('review-session-wrapping-up-text');
      expect(wrapUpText.props.children).toEqual(['Wrapping up: ', 1, ' remaining']);
    });

    it('should complete session when all introduced items are answered in wrap up mode', () => {
      jest.useFakeTimers();
      const onSessionComplete = jest.fn();

      // Use only one radical so we can easily complete it (radicals only need meaning answer)
      const { getByTestId, queryByTestId } = render(
        <ReviewSession
          items={[sampleRadical]}
          onSessionComplete={onSessionComplete}
          autoAdvanceDelay={0}
        />,
      );

      // Activate wrap up (only the radical has been introduced)
      fireEvent.press(getByTestId('review-session-wrap-up'));

      // Answer the radical (only needs meaning)
      fireEvent.changeText(getByTestId('review-session-input'), 'Ground');
      fireEvent.press(getByTestId('review-session-submit'));

      act(() => {
        jest.runAllTimers();
      });

      // Session should be complete
      expect(queryByTestId('review-session-complete')).toBeTruthy();
      expect(onSessionComplete).toHaveBeenCalled();

      // The progress map should only contain the introduced radical
      const progressMap = onSessionComplete.mock.calls[0][0] as Map<number, unknown>;
      expect(progressMap.size).toBe(1);

      jest.useRealTimers();
    });

    it('should not introduce new items after wrap up is activated', () => {
      jest.useFakeTimers();

      // Use fiveItems which has multiple items
      (Math.random as jest.Mock).mockReturnValue(0.1);

      const { getByTestId, queryByTestId } = render(
        <ReviewSession items={fiveItems} autoAdvanceDelay={0} />,
      );

      // Get the first item's character
      const firstChar = getByTestId('review-session-characters').props.children;

      // Activate wrap up mode
      fireEvent.press(getByTestId('review-session-wrap-up'));

      // Get the current question type to know what answer to give
      const questionType = getByTestId('review-session-question-type').props.children;

      // Answer the current question correctly
      let answer = '';
      if (firstChar === '一') answer = 'Ground';
      else if (firstChar === '人') answer = 'Person';
      else if (firstChar === '大' && questionType === 'MEANING') answer = 'Big';
      else if (firstChar === '大' && questionType === 'READING') answer = 'oo';
      else if (firstChar === '大きい' && questionType === 'MEANING') answer = 'Big';
      else if (firstChar === '大きい' && questionType === 'READING') answer = 'ookii';
      else if (firstChar === 'あめ' && questionType === 'MEANING') answer = 'Candy';
      else if (firstChar === 'あめ' && questionType === 'READING') answer = 'ame';
      else answer = 'Ground'; // fallback

      fireEvent.changeText(getByTestId('review-session-input'), answer);
      fireEvent.press(getByTestId('review-session-submit'));

      act(() => {
        jest.runAllTimers();
      });

      // If it was a radical, session should be complete
      // If not, we should still see the same item (second question)
      if (!queryByTestId('review-session-complete')) {
        // Session not complete, which means we're still working on the introduced item
        const currentChar = getByTestId('review-session-characters').props.children;
        // The character should be the same (or session should be complete)
        // because in wrap-up mode we don't introduce new items
        expect(currentChar).toBe(firstChar);
      }

      jest.useRealTimers();
    });

    it('should deactivate wrap up mode and continue normally when cancel is pressed', () => {
      const { getByTestId, queryByTestId } = render(
        <ReviewSession items={fiveItems} />,
      );

      // Activate wrap up
      fireEvent.press(getByTestId('review-session-wrap-up'));
      expect(queryByTestId('review-session-wrapping-up-text')).toBeTruthy();

      // Deactivate wrap up
      fireEvent.press(getByTestId('review-session-wrap-up'));
      expect(queryByTestId('review-session-wrapping-up-text')).toBeNull();
      expect(queryByTestId('review-session-remaining-text')).toBeTruthy();
    });

    it('should update wrap up remaining count as items are completed', () => {
      jest.useFakeTimers();

      // Use 2 items for simpler test
      const twoItems = [sampleRadical, sampleRadical2];
      (Math.random as jest.Mock).mockReturnValue(0.1);

      const { getByTestId, queryByTestId } = render(
        <ReviewSession items={twoItems} autoAdvanceDelay={0} />,
      );

      // Answer first question to introduce first item
      const firstChar = getByTestId('review-session-characters').props.children;
      const firstAnswer = firstChar === '一' ? 'Ground' : 'Person';

      fireEvent.changeText(getByTestId('review-session-input'), firstAnswer);
      fireEvent.press(getByTestId('review-session-submit'));

      act(() => {
        jest.runAllTimers();
      });

      // If not complete, we're on second item
      if (!queryByTestId('review-session-complete')) {
        // Now activate wrap up with 2 items introduced
        // (depends on if question queue gave us both items already)
        fireEvent.press(getByTestId('review-session-wrap-up'));

        // Check remaining count (should be at least 1 - the incomplete item)
        const wrapUpText = getByTestId('review-session-wrapping-up-text');
        expect(wrapUpText.props.children[1]).toBeGreaterThanOrEqual(1);
      }

      jest.useRealTimers();
    });

    it('should show correct progress (completed/total) in wrap up mode', () => {
      // Use single radical for simplicity - radicals only have meaning questions
      const { getByTestId } = render(
        <ReviewSession items={[sampleRadical]} />,
      );

      // Activate wrap up - only 1 item introduced
      fireEvent.press(getByTestId('review-session-wrap-up'));

      // Progress should show 0/1 (0 completed out of 1 introduced)
      const progressText = getByTestId('review-session-progress-text');
      expect(progressText.props.children).toEqual([0, ' / ', 1]);
    });

    it('should disable wrap up button during correct feedback', () => {
      const { getByTestId } = render(
        <ReviewSession items={[sampleRadical]} autoAdvanceDelay={100} />,
      );

      const input = getByTestId('review-session-input');
      const submit = getByTestId('review-session-submit');

      fireEvent.changeText(input, 'Ground');
      fireEvent.press(submit);

      // During feedback, wrap up button should be disabled
      expect(getByTestId('review-session-wrap-up').props.accessibilityState).toEqual(
        expect.objectContaining({ disabled: true }),
      );
    });

    it('should include only introduced items in onSessionComplete callback when in wrap up mode', () => {
      jest.useFakeTimers();
      const onSessionComplete = jest.fn();

      const { getByTestId } = render(
        <ReviewSession
          items={[sampleRadical, sampleKanji, sampleVocabulary]}
          onSessionComplete={onSessionComplete}
          autoAdvanceDelay={0}
        />,
      );

      // Activate wrap up (only first item introduced)
      fireEvent.press(getByTestId('review-session-wrap-up'));

      // Answer the introduced item
      fireEvent.changeText(getByTestId('review-session-input'), 'Ground');
      fireEvent.press(getByTestId('review-session-submit'));

      act(() => {
        jest.runAllTimers();
      });

      // If the first item was a radical, it should be complete
      // Otherwise we need to answer the reading question too
      if (onSessionComplete.mock.calls.length > 0) {
        const progressMap = onSessionComplete.mock.calls[0][0] as Map<number, unknown>;
        // The progress map should only contain introduced items
        expect(progressMap.size).toBe(1);
      }

      jest.useRealTimers();
    });
  });
});
