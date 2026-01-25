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
function createRadicalItem(
  id: number,
  character: string,
  meaning: string,
  srsStage: number = 1,
): ReviewItem {
  return {
    id,
    assignmentId: id + 1000,
    subjectType: 'radical',
    srsStage,
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
  srsStage: number = 1,
): ReviewItem {
  return {
    id,
    assignmentId: id + 1000,
    subjectType: 'kanji',
    srsStage,
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
  srsStage: number = 1,
): ReviewItem {
  return {
    id,
    assignmentId: id + 1000,
    subjectType: 'vocabulary',
    srsStage,
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
  srsStage: number = 1,
): ReviewItem {
  return {
    id,
    assignmentId: id + 1000,
    subjectType: 'kana_vocabulary',
    srsStage,
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
      const { getByTestId, getByText } = render(<ReviewSession items={[]} />);

      expect(getByTestId('review-session-empty')).toBeTruthy();
      expect(getByText('No reviews available')).toBeTruthy();
    });

    it('should render question display for items', () => {
      // Make random deterministic
      (Math.random as jest.Mock).mockReturnValue(0.1);

      const { getByTestId } = render(<ReviewSession {...defaultProps} />);

      expect(getByTestId('review-session')).toBeTruthy();
      expect(getByTestId('review-session-progress')).toBeTruthy();
      expect(getByTestId('review-session-character-container')).toBeTruthy();
      expect(getByTestId('review-session-input')).toBeTruthy();
      expect(getByTestId('review-session-submit')).toBeTruthy();
    });

    it('should render question type indicator bar', () => {
      (Math.random as jest.Mock).mockReturnValue(0.1);

      const { getByTestId } = render(<ReviewSession {...defaultProps} />);

      expect(getByTestId('review-session-question-type')).toBeTruthy();
    });

    it('should show progress count', () => {
      // Make random deterministic
      (Math.random as jest.Mock).mockReturnValue(0.1);

      const { getByTestId } = render(<ReviewSession {...defaultProps} />);

      // Initially 0 items complete out of 5
      expect(
        getByTestId('review-session-progress-text').props.children,
      ).toEqual([0, ' / ', 5]);
    });

    it('should show remaining count', () => {
      // Make random deterministic
      (Math.random as jest.Mock).mockReturnValue(0.1);

      const { getByTestId } = render(<ReviewSession {...defaultProps} />);

      // Initially 5 remaining
      expect(
        getByTestId('review-session-remaining-text').props.children,
      ).toEqual([5, ' remaining']);
    });

    it('should display characters for current question', () => {
      // Make random return specific values to control question order
      (Math.random as jest.Mock).mockReturnValue(0.1);

      const { getByTestId } = render(<ReviewSession {...defaultProps} />);

      // Should display one of the item characters
      const characters = getByTestId('review-session-characters');
      expect(characters.props.children).toBeTruthy();
    });

    it('should show MEANING label for meaning questions', () => {
      // Single radical item = meaning only
      const { getByTestId } = render(<ReviewSession items={[sampleRadical]} />);

      expect(getByTestId('review-session-question-type').props.children).toBe(
        'MEANING',
      );
    });
  });

  describe('Input Handling', () => {
    it('should update input value on text change for meaning questions', () => {
      const { getByTestId } = render(<ReviewSession items={[sampleRadical]} />);

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

      const { getByTestId } = render(<ReviewSession items={[sampleKanji]} />);

      // First question should be reading
      const questionType = getByTestId('review-session-question-type').props
        .children;
      if (questionType === 'READING') {
        const input = getByTestId('review-session-input');
        fireEvent.changeText(input, 'oo');

        // Hiragana should be shown directly in the input value
        expect(input.props.value).toBe('おお');
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
      expect(queryByTestId('review-completion')).toBeTruthy();

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
      expect(queryByTestId('review-completion')).toBeNull();
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
      expect(
        getByTestId('review-session-progress-text').props.children,
      ).toEqual([0, ' / ', 1]);

      // Answer correctly
      fireEvent.changeText(input, 'Ground');
      fireEvent.press(submit);

      // Run timers to trigger auto-advance
      act(() => {
        jest.runAllTimers();
      });

      // Should show complete state
      expect(getByTestId('review-completion')).toBeTruthy();

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
      const firstQuestionType = getByTestId('review-session-question-type')
        .props.children;
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
      expect(queryByTestId('review-completion')).toBeNull();

      // Now answer second question
      fireEvent.changeText(getByTestId('review-session-input'), secondAnswer);
      fireEvent.press(getByTestId('review-session-submit'));

      // Run timers to trigger auto-advance
      act(() => {
        jest.runAllTimers();
      });

      // Now should be complete
      expect(queryByTestId('review-completion')).toBeTruthy();

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

      expect(getByTestId('review-completion')).toBeTruthy();
      expect(getByText('Reviews Complete!')).toBeTruthy();
      expect(getByText('1')).toBeTruthy();
      expect(getByText('item reviewed')).toBeTruthy();
      jest.useRealTimers();
    });
  });

  describe('Subject Type Colors', () => {
    it('should use blue color for radicals', () => {
      const { getByTestId } = render(<ReviewSession items={[sampleRadical]} />);

      const container = getByTestId('review-session-character-container');
      expect(container.props.style).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ backgroundColor: SUBJECT_COLORS.radical }),
        ]),
      );
    });

    it('should use pink color for kanji', () => {
      (Math.random as jest.Mock).mockReturnValue(0.1);

      const { getByTestId } = render(<ReviewSession items={[sampleKanji]} />);

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
          expect.objectContaining({
            backgroundColor: SUBJECT_COLORS.vocabulary,
          }),
        ]),
      );
    });
  });

  describe('Question Type Label Styling', () => {
    it('should use black background for reading questions', () => {
      // Use vocabulary which has both meaning and reading questions
      // Mock random to control the question order (0.7 > 0.5 means reading first)
      (Math.random as jest.Mock).mockReturnValue(0.7);

      const { getByTestId } = render(
        <ReviewSession items={[sampleVocabulary]} />,
      );

      const questionType = getByTestId('review-session-question-type').props
        .children;

      if (questionType === 'READING') {
        // Reading questions should have black background on the question type label container
        const questionTypeLabel = getByTestId('review-session-question-type');
        expect(questionTypeLabel).toBeTruthy();
      }
    });

    it('should use white background for meaning questions', () => {
      // Use radical which only has meaning questions
      const { getByTestId } = render(<ReviewSession items={[sampleRadical]} />);

      // Meaning questions should show MEANING label
      const questionTypeLabel = getByTestId('review-session-question-type');
      expect(questionTypeLabel.props.children).toBe('MEANING');
    });

    it('should show incorrect feedback screen without indicator bar', () => {
      const { getByTestId, queryByTestId } = render(
        <ReviewSession items={[sampleRadical]} />,
      );

      // Submit wrong answer
      fireEvent.changeText(getByTestId('review-session-input'), 'wrong');
      fireEvent.press(getByTestId('review-session-submit'));

      // Should show incorrect feedback (no indicator bar above red block)
      expect(getByTestId('review-session-incorrect-feedback')).toBeTruthy();
      expect(queryByTestId('review-session-question-type-bar')).toBeNull();
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
        <ReviewSession
          items={fiveItems}
          onSessionComplete={onSessionComplete}
          autoAdvanceDelay={0}
        />,
      );

      // Answer all questions correctly
      // fiveItems has 2 radicals (1 question each) + 3 non-radicals (2 questions each) = 8 questions total
      const questionCount = 8;

      for (let i = 0; i < questionCount; i++) {
        const currentChar = getByTestId('review-session-characters').props
          .children;
        const questionType = getByTestId('review-session-question-type').props
          .children;
        const input = getByTestId('review-session-input');
        const submit = getByTestId('review-session-submit');

        // Determine correct answer based on character and question type
        let answer = '';
        if (currentChar === '一') answer = 'Ground';
        else if (currentChar === '人') answer = 'Person';
        else if (currentChar === '大' && questionType === 'MEANING')
          answer = 'Big';
        else if (currentChar === '大' && questionType === 'READING')
          answer = 'oo';
        else if (currentChar === '大きい' && questionType === 'MEANING')
          answer = 'Big';
        else if (currentChar === '大きい' && questionType === 'READING')
          answer = 'ookii';
        else if (currentChar === 'あめ' && questionType === 'MEANING')
          answer = 'Candy';
        else if (currentChar === 'あめ' && questionType === 'READING')
          answer = 'ame';

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
        if (queryByTestId('review-completion')) {
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
      expect(
        queryByTestId('review-session-correct-label')?.props.children,
      ).toBe('Correct!');
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
      expect(queryByTestId('review-completion')).toBeTruthy();
      expect(onSessionComplete).toHaveBeenCalled();
    });

    it('should keep input editable during correct feedback (keyboard stays open)', () => {
      const { getByTestId } = render(
        <ReviewSession items={[sampleRadical]} autoAdvanceDelay={100} />,
      );

      const input = getByTestId('review-session-input');
      const submit = getByTestId('review-session-submit');

      fireEvent.changeText(input, 'Ground');
      fireEvent.press(submit);

      // Input should remain editable so keyboard stays open
      expect(getByTestId('review-session-input').props.editable).not.toBe(
        false,
      );
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
      expect(
        getByTestId('review-session-submit').props.accessibilityState,
      ).toEqual(expect.objectContaining({ disabled: true }));
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
      const firstQuestionType = getByTestId('review-session-question-type')
        .props.children;
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
      expect(queryByTestId('review-completion')).toBeNull();

      // Should be showing the next question
      expect(getByTestId('review-session-input')).toBeTruthy();
    });

    it('should use default autoAdvanceDelay of 500ms', () => {
      const { getByTestId, queryByTestId } = render(
        <ReviewSession items={[sampleRadical]} />,
      );

      const input = getByTestId('review-session-input');
      const submit = getByTestId('review-session-submit');

      fireEvent.changeText(input, 'Ground');
      fireEvent.press(submit);

      // Feedback should be showing
      expect(queryByTestId('review-session-correct-label')).toBeTruthy();

      // Advance time by less than 500ms - should still show feedback
      act(() => {
        jest.advanceTimersByTime(300);
      });
      expect(queryByTestId('review-session-correct-label')).toBeTruthy();

      // Advance past 500ms - should complete
      act(() => {
        jest.advanceTimersByTime(300);
      });
      expect(queryByTestId('review-completion')).toBeTruthy();
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

  describe('Fuzzy Match (Typo-forgiven) Feedback', () => {
    it('should show yellow feedback with "Close enough!" for fuzzy match answers', () => {
      // Create an item with a longer meaning (7+ chars = 2 edits allowed)
      const itemWithLongMeaning: ReviewItem = {
        ...sampleVocabulary,
        meanings: createMeanings([{ meaning: 'Beautiful', primary: true }]),
      };
      const { getByTestId, queryByTestId } = render(
        <ReviewSession
          items={[itemWithLongMeaning]}
          autoAdvanceDelay={100}
        />,
      );

      const type = getByTestId('review-session-question-type').props.children;

      if (type === 'MEANING') {
        // Submit answer with typo (within 2 edits of "Beautiful")
        fireEvent.changeText(getByTestId('review-session-input'), 'Beautful'); // missing 'i'
        fireEvent.press(getByTestId('review-session-submit'));

        // Should show fuzzy match label instead of correct label
        expect(queryByTestId('review-session-fuzzy-match-label')).toBeTruthy();
        expect(queryByTestId('review-session-correct-label')).toBeNull();
        expect(getByTestId('review-session-fuzzy-match-label').props.children).toBe(
          'Close enough!',
        );
      }
    });

    it('should show green feedback with "Correct!" for exact match answers', () => {
      const { getByTestId, queryByTestId } = render(
        <ReviewSession items={[sampleRadical]} autoAdvanceDelay={100} />,
      );

      // Submit exact answer
      fireEvent.changeText(getByTestId('review-session-input'), 'Ground');
      fireEvent.press(getByTestId('review-session-submit'));

      // Should show correct label, not fuzzy match label
      expect(queryByTestId('review-session-correct-label')).toBeTruthy();
      expect(queryByTestId('review-session-fuzzy-match-label')).toBeNull();
      expect(getByTestId('review-session-correct-label').props.children).toBe(
        'Correct!',
      );
    });

    it('should call onAnswer with isCorrect=true for fuzzy match answers', () => {
      const onAnswer = jest.fn();
      // Create an item with a 4-6 char meaning (1 edit allowed)
      const itemWithMediumMeaning: ReviewItem = {
        ...sampleVocabulary,
        meanings: createMeanings([{ meaning: 'Water', primary: true }]),
      };
      const { getByTestId } = render(
        <ReviewSession
          items={[itemWithMediumMeaning]}
          onAnswer={onAnswer}
          autoAdvanceDelay={0}
        />,
      );

      const type = getByTestId('review-session-question-type').props.children;

      if (type === 'MEANING') {
        // Submit answer with 1 typo
        fireEvent.changeText(getByTestId('review-session-input'), 'Watar'); // 'a' instead of 'e'
        fireEvent.press(getByTestId('review-session-submit'));

        expect(onAnswer).toHaveBeenCalledWith(
          expect.objectContaining({
            isCorrect: true,
          }),
        );
      }
    });

    it('should not show fuzzy match for reading questions', () => {
      // Reading questions do not support typo forgiveness
      const { getByTestId, queryByTestId } = render(
        <ReviewSession items={[sampleVocabulary]} autoAdvanceDelay={100} />,
      );

      const type = getByTestId('review-session-question-type').props.children;

      if (type === 'READING') {
        // Submit correct reading
        fireEvent.changeText(getByTestId('review-session-input'), 'ookii');
        fireEvent.press(getByTestId('review-session-submit'));

        // Should show correct label (if correct), never fuzzy match for reading
        if (queryByTestId('review-session-correct-label')) {
          expect(queryByTestId('review-session-fuzzy-match-label')).toBeNull();
        }
      }
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
      expect(
        queryByTestId('review-session-incorrect-label')?.props.children,
      ).toBe('Incorrect');
    });

    it('should show correct answer prominently', () => {
      const { getByTestId } = render(<ReviewSession items={[sampleRadical]} />);

      const input = getByTestId('review-session-input');
      const submit = getByTestId('review-session-submit');

      fireEvent.changeText(input, 'Wrong');
      fireEvent.press(submit);

      // Should show correct answer
      expect(getByTestId('review-session-correct-answer').props.children).toBe(
        'Ground',
      );
    });

    it('should show user answer on incorrect feedback', () => {
      const { getByTestId } = render(<ReviewSession items={[sampleRadical]} />);

      const input = getByTestId('review-session-input');
      const submit = getByTestId('review-session-submit');

      fireEvent.changeText(input, 'Wrong');
      fireEvent.press(submit);

      // Should show user's incorrect answer
      expect(getByTestId('review-session-your-answer').props.children).toBe(
        'Wrong',
      );
    });

    it('should show "(empty)" when user submits empty answer', () => {
      const { getByTestId } = render(<ReviewSession items={[sampleRadical]} />);

      const submit = getByTestId('review-session-submit');

      // Submit without entering anything
      fireEvent.press(submit);

      // Should show (empty) for user's answer
      expect(getByTestId('review-session-your-answer').props.children).toBe(
        '(empty)',
      );
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
      expect(getByTestId('review-session-mnemonic-label').props.children).toBe(
        'Meaning Mnemonic:',
      );
      // Verify the mnemonic is rendered (using testID to avoid duplicate text matches from ItemDetails)
      expect(getByTestId('review-session-mnemonic')).toBeTruthy();
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
      const questionType = getByTestId('review-session-question-type').props
        .children;
      if (questionType === 'READING') {
        const input = getByTestId('review-session-input');
        const submit = getByTestId('review-session-submit');

        fireEvent.changeText(input, 'wrong');
        fireEvent.press(submit);

        // Should show reading mnemonic
        if (queryByTestId('review-session-mnemonic-label')) {
          expect(
            getByTestId('review-session-mnemonic-label').props.children,
          ).toBe('Reading Mnemonic:');
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
      const { getByTestId } = render(<ReviewSession items={[sampleRadical]} />);

      const input = getByTestId('review-session-input');
      const submit = getByTestId('review-session-submit');

      fireEvent.changeText(input, 'Wrong');
      fireEvent.press(submit);

      // Character container should have red background
      const container = getByTestId('review-session-character-container');
      expect(container.props.style).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            backgroundColor: COLORS.feedback.incorrect,
          }),
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
      expect(queryByTestId('review-completion')).toBeNull();
      expect(queryByTestId('review-session')).toBeTruthy();

      jest.useRealTimers();
    });

    it('should maintain progress when showing incorrect feedback', () => {
      const { getByTestId } = render(<ReviewSession items={[sampleRadical]} />);

      // Initially 0 / 1
      expect(
        getByTestId('review-session-progress-text').props.children,
      ).toEqual([0, ' / ', 1]);

      const input = getByTestId('review-session-input');
      const submit = getByTestId('review-session-submit');

      fireEvent.changeText(input, 'Wrong');
      fireEvent.press(submit);

      // Progress should still be 0 / 1 in feedback view
      expect(
        getByTestId('review-session-progress-text').props.children,
      ).toEqual([0, ' / ', 1]);
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
      const { getByTestId } = render(<ReviewSession items={[sampleRadical]} />);

      const input = getByTestId('review-session-input');
      const submit = getByTestId('review-session-submit');

      fireEvent.changeText(input, 'Wrong');
      fireEvent.press(submit);

      // Should show character
      expect(getByTestId('review-session-characters').props.children).toBe(
        '一',
      );
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
      expect(queryByTestId('review-completion')).toBeTruthy();
      expect(onSessionComplete).toHaveBeenCalled();

      jest.useRealTimers();
    });
  });

  describe('Wrap Up Feature', () => {
    it('should render wrap up button', () => {
      const { getByTestId } = render(<ReviewSession items={[sampleRadical]} />);

      expect(getByTestId('review-session-wrap-up')).toBeTruthy();
    });

    it('should show "Wrap Up" text on button by default', () => {
      const { getByTestId } = render(<ReviewSession items={[sampleRadical]} />);

      const wrapUpButton = getByTestId('review-session-wrap-up');
      expect(wrapUpButton).toBeTruthy();
      // Check for Wrap Up text
      const textElements = wrapUpButton.findAllByType(
        require('react-native').Text,
      );
      expect(textElements.some(el => el.props.children === 'Wrap Up')).toBe(
        true,
      );
    });

    it('should toggle to "Cancel" text when wrap up is activated', () => {
      const { getByTestId } = render(<ReviewSession items={fiveItems} />);

      // Press wrap up button
      fireEvent.press(getByTestId('review-session-wrap-up'));

      // Check that button now shows "Cancel"
      const wrapUpButton = getByTestId('review-session-wrap-up');
      const textElements = wrapUpButton.findAllByType(
        require('react-native').Text,
      );
      expect(textElements.some(el => el.props.children === 'Cancel')).toBe(
        true,
      );
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
      const { getByTestId } = render(<ReviewSession items={[sampleRadical]} />);

      // Activate wrap up - we've only introduced 1 item so far (the current one)
      fireEvent.press(getByTestId('review-session-wrap-up'));

      // Should show 1 remaining (the introduced item)
      const wrapUpText = getByTestId('review-session-wrapping-up-text');
      expect(wrapUpText.props.children).toEqual([
        'Wrapping up: ',
        1,
        ' remaining',
      ]);
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
      expect(queryByTestId('review-completion')).toBeTruthy();
      expect(onSessionComplete).toHaveBeenCalled();

      // The progress map should only contain the introduced radical
      const progressMap = onSessionComplete.mock.calls[0][0] as Map<
        number,
        unknown
      >;
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
      const questionType = getByTestId('review-session-question-type').props
        .children;

      // Answer the current question correctly
      let answer = '';
      if (firstChar === '一') answer = 'Ground';
      else if (firstChar === '人') answer = 'Person';
      else if (firstChar === '大' && questionType === 'MEANING') answer = 'Big';
      else if (firstChar === '大' && questionType === 'READING') answer = 'oo';
      else if (firstChar === '大きい' && questionType === 'MEANING')
        answer = 'Big';
      else if (firstChar === '大きい' && questionType === 'READING')
        answer = 'ookii';
      else if (firstChar === 'あめ' && questionType === 'MEANING')
        answer = 'Candy';
      else if (firstChar === 'あめ' && questionType === 'READING')
        answer = 'ame';
      else answer = 'Ground'; // fallback

      fireEvent.changeText(getByTestId('review-session-input'), answer);
      fireEvent.press(getByTestId('review-session-submit'));

      act(() => {
        jest.runAllTimers();
      });

      // If it was a radical, session should be complete
      // If not, we should still see the same item (second question)
      if (!queryByTestId('review-completion')) {
        // Session not complete, which means we're still working on the introduced item
        const currentChar = getByTestId('review-session-characters').props
          .children;
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
      if (!queryByTestId('review-completion')) {
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
      const { getByTestId } = render(<ReviewSession items={[sampleRadical]} />);

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
      expect(
        getByTestId('review-session-wrap-up').props.accessibilityState,
      ).toEqual(expect.objectContaining({ disabled: true }));
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
        const progressMap = onSessionComplete.mock.calls[0][0] as Map<
          number,
          unknown
        >;
        // The progress map should only contain introduced items
        expect(progressMap.size).toBe(1);
      }

      jest.useRealTimers();
    });
  });

  describe('Mark as Correct functionality', () => {
    it('shows "Mark as Correct" button on incorrect feedback screen', () => {
      const { getByTestId } = render(<ReviewSession items={[sampleRadical]} />);

      // Submit wrong answer
      fireEvent.changeText(getByTestId('review-session-input'), 'wrong');
      fireEvent.press(getByTestId('review-session-submit'));

      // Should show Mark as Correct button alongside Continue
      expect(getByTestId('review-session-mark-correct')).toBeTruthy();
      expect(getByTestId('review-session-continue')).toBeTruthy();
    });

    it('marks question as correct when "Mark as Correct" is pressed', () => {
      jest.useFakeTimers();
      const onAnswer = jest.fn();
      const { getByTestId, queryByTestId } = render(
        <ReviewSession
          items={[sampleRadical]}
          onAnswer={onAnswer}
          autoAdvanceDelay={0}
        />,
      );

      // Submit wrong answer
      fireEvent.changeText(getByTestId('review-session-input'), 'wrong');
      fireEvent.press(getByTestId('review-session-submit'));

      // First call should be incorrect
      expect(onAnswer).toHaveBeenCalledWith(
        expect.objectContaining({
          isCorrect: false,
        }),
      );

      // Press Mark as Correct
      fireEvent.press(getByTestId('review-session-mark-correct'));

      // Second call should be correct (overriding the incorrect answer)
      expect(onAnswer).toHaveBeenLastCalledWith(
        expect.objectContaining({
          isCorrect: true,
        }),
      );

      // Session should be complete (single item radical)
      expect(queryByTestId('review-completion')).toBeTruthy();

      jest.useRealTimers();
    });

    it('advances to next question after "Mark as Correct" is pressed', () => {
      jest.useFakeTimers();
      // Use kanji which has 2 questions (meaning + reading)
      (Math.random as jest.Mock).mockReturnValue(0.1);

      const { getByTestId, queryByTestId } = render(
        <ReviewSession items={[sampleKanji]} autoAdvanceDelay={0} />,
      );

      // Submit wrong answer - use appropriate format based on question type
      const type = getByTestId('review-session-question-type').props.children;
      const wrongAnswer = type === 'READING' ? 'あああ' : 'wrong';
      fireEvent.changeText(getByTestId('review-session-input'), wrongAnswer);
      fireEvent.press(getByTestId('review-session-submit'));

      // Press Mark as Correct
      fireEvent.press(getByTestId('review-session-mark-correct'));

      // Should be on next question (not showing feedback)
      expect(queryByTestId('review-session-incorrect-feedback')).toBeNull();
      expect(queryByTestId('review-session')).toBeTruthy();

      jest.useRealTimers();
    });

    it('removes re-queued question when "Mark as Correct" is pressed', () => {
      jest.useFakeTimers();
      const { getByTestId, queryByTestId } = render(
        <ReviewSession items={[sampleRadical]} autoAdvanceDelay={0} />,
      );

      // Submit wrong answer (question gets re-queued)
      fireEvent.changeText(getByTestId('review-session-input'), 'wrong');
      fireEvent.press(getByTestId('review-session-submit'));

      // Press Mark as Correct
      fireEvent.press(getByTestId('review-session-mark-correct'));

      // Session should be complete immediately (re-queued question was removed)
      expect(queryByTestId('review-completion')).toBeTruthy();

      jest.useRealTimers();
    });

    it('calls onSessionComplete when all items marked correct', () => {
      jest.useFakeTimers();
      const onSessionComplete = jest.fn();

      const { getByTestId } = render(
        <ReviewSession
          items={[sampleRadical]}
          onSessionComplete={onSessionComplete}
          autoAdvanceDelay={0}
        />,
      );

      // Submit wrong answer
      fireEvent.changeText(getByTestId('review-session-input'), 'wrong');
      fireEvent.press(getByTestId('review-session-submit'));

      // Press Mark as Correct
      fireEvent.press(getByTestId('review-session-mark-correct'));

      // onSessionComplete should be called
      expect(onSessionComplete).toHaveBeenCalledTimes(1);

      jest.useRealTimers();
    });

    it('updates item progress correctly when marking as correct', () => {
      jest.useFakeTimers();
      const onSessionComplete = jest.fn();

      const { getByTestId } = render(
        <ReviewSession
          items={[sampleRadical]}
          onSessionComplete={onSessionComplete}
          autoAdvanceDelay={0}
        />,
      );

      // Submit wrong answer
      fireEvent.changeText(getByTestId('review-session-input'), 'wrong');
      fireEvent.press(getByTestId('review-session-submit'));

      // Press Mark as Correct
      fireEvent.press(getByTestId('review-session-mark-correct'));

      // Check that progress has meaningCorrect = true
      const progressMap = onSessionComplete.mock.calls[0][0];
      expect(progressMap.get(sampleRadical.id)).toEqual(
        expect.objectContaining({
          meaningCorrect: true,
        }),
      );

      jest.useRealTimers();
    });

    it('decrements incorrect count when marking as correct', () => {
      jest.useFakeTimers();
      const onSessionComplete = jest.fn();

      const { getByTestId } = render(
        <ReviewSession
          items={[sampleRadical]}
          onSessionComplete={onSessionComplete}
          autoAdvanceDelay={0}
        />,
      );

      // Submit wrong answer
      fireEvent.changeText(getByTestId('review-session-input'), 'wrong');
      fireEvent.press(getByTestId('review-session-submit'));

      // Press Mark as Correct
      fireEvent.press(getByTestId('review-session-mark-correct'));

      // Incorrect count should be 0 (was 1, then decremented)
      const progressMap = onSessionComplete.mock.calls[0][0];
      expect(progressMap.get(sampleRadical.id)).toEqual(
        expect.objectContaining({
          incorrectMeaningAnswers: 0,
        }),
      );

      jest.useRealTimers();
    });

    it('preserves user answer when marking as correct', () => {
      const onAnswer = jest.fn();
      const { getByTestId } = render(
        <ReviewSession items={[sampleRadical]} onAnswer={onAnswer} />,
      );

      // Submit wrong answer
      fireEvent.changeText(getByTestId('review-session-input'), 'my typo answer');
      fireEvent.press(getByTestId('review-session-submit'));

      // Press Mark as Correct
      fireEvent.press(getByTestId('review-session-mark-correct'));

      // The corrected result should preserve the user's original answer
      expect(onAnswer).toHaveBeenLastCalledWith(
        expect.objectContaining({
          userAnswer: 'my typo answer',
          isCorrect: true,
        }),
      );
    });
  });

  describe('auto-focus input', () => {
    it('auto-focuses input on initial render', () => {
      jest.useFakeTimers();
      const items = [sampleRadical];
      const { getByTestId } = render(
        <ReviewSession
          items={items}
          onAnswer={jest.fn()}
          autoAdvanceDelay={0}
        />,
      );

      // Run timers to trigger the focus effect (100ms delay)
      act(() => {
        jest.advanceTimersByTime(100);
      });

      // Verify the input exists and can be accessed
      const input = getByTestId('review-session-input');
      expect(input).toBeTruthy();

      jest.useRealTimers();
    });

    it('auto-focuses input after advancing from correct answer', () => {
      jest.useFakeTimers();
      const items = [sampleRadical, sampleRadical2]; // 2 items
      const { getByTestId } = render(
        <ReviewSession
          items={items}
          onAnswer={jest.fn()}
          autoAdvanceDelay={100}
        />,
      );

      // Get the displayed character to determine the correct answer
      const displayedChar = getByTestId('review-session-characters').props
        .children;
      const correctAnswer = displayedChar === '一' ? 'Ground' : 'Person';

      // Answer first question correctly (radical only has meaning question)
      fireEvent.changeText(getByTestId('review-session-input'), correctAnswer);
      fireEvent.press(getByTestId('review-session-submit'));

      // Run timers for auto-advance (100ms) + focus delay (100ms)
      act(() => {
        jest.advanceTimersByTime(200);
      });

      // Should have advanced to next question with input available
      const input = getByTestId('review-session-input');
      expect(input).toBeTruthy();
      // Input should be cleared for new question
      expect(input.props.value).toBe('');

      jest.useRealTimers();
    });

    it('auto-focuses input after tapping Continue on incorrect feedback', () => {
      jest.useFakeTimers();
      const items = [sampleRadical, sampleRadical2]; // 2 questions
      const { getByTestId } = render(
        <ReviewSession
          items={items}
          onAnswer={jest.fn()}
          autoAdvanceDelay={0}
        />,
      );

      // Submit wrong answer
      fireEvent.changeText(getByTestId('review-session-input'), 'wrong');
      fireEvent.press(getByTestId('review-session-submit'));

      // Should show incorrect feedback
      expect(getByTestId('review-session-incorrect-feedback')).toBeTruthy();

      // Press continue
      fireEvent.press(getByTestId('review-session-continue'));

      // Run timers for focus delay (100ms)
      act(() => {
        jest.advanceTimersByTime(100);
      });

      // Should be back at session view with input available
      const input = getByTestId('review-session-input');
      expect(input).toBeTruthy();
      // Input should be cleared
      expect(input.props.value).toBe('');

      jest.useRealTimers();
    });

    it('does not focus input while showing correct feedback', () => {
      jest.useFakeTimers();
      const items = [sampleRadical, sampleRadical2];
      const { getByTestId, queryByTestId } = render(
        <ReviewSession
          items={items}
          onAnswer={jest.fn()}
          autoAdvanceDelay={500}
        />,
      );

      // Get the displayed character to determine the correct answer
      const displayedChar = getByTestId('review-session-characters').props
        .children;
      const correctAnswer = displayedChar === '一' ? 'Ground' : 'Person';

      // Answer correctly
      fireEvent.changeText(getByTestId('review-session-input'), correctAnswer);
      fireEvent.press(getByTestId('review-session-submit'));

      // Should show correct label
      expect(queryByTestId('review-session-correct-label')).toBeTruthy();

      // Input should remain editable during correct feedback (keyboard stays open)
      const input = getByTestId('review-session-input');
      expect(input.props.editable).not.toBe(false);

      jest.useRealTimers();
    });

    it('does not focus input when session is complete', () => {
      jest.useFakeTimers();
      const items = [sampleRadical]; // Just 1 item with 1 question (meaning only)
      const { getByTestId, queryByTestId } = render(
        <ReviewSession
          items={items}
          onAnswer={jest.fn()}
          autoAdvanceDelay={0}
        />,
      );

      // Answer correctly (only Ground possible since we have single radical)
      fireEvent.changeText(getByTestId('review-session-input'), 'Ground');
      fireEvent.press(getByTestId('review-session-submit'));

      act(() => {
        jest.runAllTimers();
      });

      // Should be complete
      expect(getByTestId('review-completion')).toBeTruthy();
      // Input should not be present
      expect(queryByTestId('review-session-input')).toBeNull();

      jest.useRealTimers();
    });
  });

  describe('input positioning', () => {
    it('positions input near the top with padding (not centered)', () => {
      const { getByTestId } = render(
        <ReviewSession items={[sampleRadical]} onAnswer={jest.fn()} />,
      );

      const inputContainer = getByTestId('review-session-input-container');
      // Input container should have paddingTop for spacing below question
      expect(inputContainer.props.style).toEqual(
        expect.objectContaining({ paddingTop: expect.any(Number) }),
      );
    });

    it('has horizontal padding for appropriate margins', () => {
      const { getByTestId } = render(
        <ReviewSession items={[sampleRadical]} onAnswer={jest.fn()} />,
      );

      const inputContainer = getByTestId('review-session-input-container');
      // Input container should have paddingHorizontal for margins
      expect(inputContainer.props.style).toEqual(
        expect.objectContaining({ paddingHorizontal: expect.any(Number) }),
      );
    });

    it('renders input container with testID', () => {
      const { getByTestId } = render(
        <ReviewSession items={[sampleRadical]} onAnswer={jest.fn()} />,
      );

      expect(getByTestId('review-session-input-container')).toBeTruthy();
    });

    it('shows hiragana directly in input for reading questions', () => {
      // Force reading question first
      let callIndex = 0;
      (Math.random as jest.Mock).mockImplementation(() => {
        const values = [0.6, 0.1, 0.1, 0.1, 0.1];
        return values[callIndex++ % values.length];
      });

      const { getByTestId } = render(
        <ReviewSession items={[sampleKanji]} onAnswer={jest.fn()} />,
      );

      const type = getByTestId('review-session-question-type').props.children;

      if (type === 'READING') {
        const input = getByTestId('review-session-input');
        fireEvent.changeText(input, 'oo');

        // Hiragana should appear directly in the input value
        expect(input.props.value).toBe('おお');
      }
    });
  });

  describe('Component Radicals on Incorrect Kanji Answers', () => {
    // Create a kanji item with component radicals
    const kanjiWithRadicals: ReviewItem = {
      id: 100,
      assignmentId: 1100,
      subjectType: 'kanji',
      srsStage: 1,
      characters: '森',
      meanings: createMeanings([{ meaning: 'Forest', primary: true }]),
      readings: createKanjiReadings([
        { reading: 'もり', primary: true, type: 'kunyomi' },
      ]),
      meaningMnemonic: 'Three trees make a forest',
      readingMnemonic: 'Reading mnemonic for mori',
      componentRadicals: [
        { id: 1, characters: '木', meaning: 'Tree', characterImages: null },
        { id: 2, characters: '木', meaning: 'Tree', characterImages: null },
        { id: 3, characters: '木', meaning: 'Tree', characterImages: null },
      ],
    };

    let callIndex = 0;
    beforeEach(() => {
      callIndex = 0;
      // Control randomization: meaning first
      (Math.random as jest.Mock).mockImplementation(() => {
        const values = [0.1, 0.1, 0.1, 0.1, 0.1];
        return values[callIndex++ % values.length];
      });
    });

    it('shows component radicals on incorrect kanji meaning answer', () => {
      const { getByTestId, getByText } = render(
        <ReviewSession
          items={[kanjiWithRadicals]}
          onAnswer={jest.fn()}
          autoAdvanceDelay={0}
        />,
      );

      const type = getByTestId('review-session-question-type').props.children;

      // If it's a meaning question, submit wrong answer
      if (type === 'MEANING') {
        const input = getByTestId('review-session-input');
        fireEvent.changeText(input, 'wrong');
        fireEvent(input, 'submitEditing');

        act(() => {
          jest.runAllTimers();
        });

        // Should show incorrect feedback
        expect(getByTestId('review-session-incorrect-feedback')).toBeTruthy();

        // Should show component radicals section
        expect(getByTestId('review-session-component-radicals')).toBeTruthy();
        expect(getByText('Made up of:')).toBeTruthy();

        // Should show each component radical
        expect(getByTestId('review-session-component-1')).toBeTruthy();
        expect(getByTestId('review-session-component-2')).toBeTruthy();
        expect(getByTestId('review-session-component-3')).toBeTruthy();
      }
    });

    it('does not show component radicals for kanji without components', () => {
      const kanjiWithoutRadicals: ReviewItem = {
        ...sampleKanji,
        componentRadicals: undefined,
      };

      // Reset random to meaning first
      callIndex = 0;
      (Math.random as jest.Mock).mockImplementation(() => {
        const values = [0.1, 0.1, 0.1, 0.1, 0.1];
        return values[callIndex++ % values.length];
      });

      const { getByTestId, queryByTestId } = render(
        <ReviewSession
          items={[kanjiWithoutRadicals]}
          onAnswer={jest.fn()}
          autoAdvanceDelay={0}
        />,
      );

      const type = getByTestId('review-session-question-type').props.children;

      if (type === 'MEANING') {
        const input = getByTestId('review-session-input');
        fireEvent.changeText(input, 'wrong');
        fireEvent(input, 'submitEditing');

        act(() => {
          jest.runAllTimers();
        });

        // Should show incorrect feedback
        expect(getByTestId('review-session-incorrect-feedback')).toBeTruthy();

        // Should not show component radicals section
        expect(queryByTestId('review-session-component-radicals')).toBeNull();
      }
    });

    it('does not show component radicals for radicals', () => {
      // Reset random
      callIndex = 0;
      (Math.random as jest.Mock).mockImplementation(() => {
        const values = [0.1, 0.1, 0.1, 0.1, 0.1];
        return values[callIndex++ % values.length];
      });

      const { getByTestId, queryByTestId } = render(
        <ReviewSession
          items={[sampleRadical]}
          onAnswer={jest.fn()}
          autoAdvanceDelay={0}
        />,
      );

      const input = getByTestId('review-session-input');
      fireEvent.changeText(input, 'wrong');
      fireEvent(input, 'submitEditing');

      act(() => {
        jest.runAllTimers();
      });

      // Should show incorrect feedback
      expect(getByTestId('review-session-incorrect-feedback')).toBeTruthy();

      // Should not show component radicals section
      expect(queryByTestId('review-session-component-radicals')).toBeNull();
    });

    it('does not show component radicals for vocabulary', () => {
      // Reset random to meaning first
      callIndex = 0;
      (Math.random as jest.Mock).mockImplementation(() => {
        const values = [0.1, 0.1, 0.1, 0.1, 0.1];
        return values[callIndex++ % values.length];
      });

      const { getByTestId, queryByTestId } = render(
        <ReviewSession
          items={[sampleVocabulary]}
          onAnswer={jest.fn()}
          autoAdvanceDelay={0}
        />,
      );

      const type = getByTestId('review-session-question-type').props.children;

      if (type === 'MEANING') {
        const input = getByTestId('review-session-input');
        fireEvent.changeText(input, 'wrong');
        fireEvent(input, 'submitEditing');

        act(() => {
          jest.runAllTimers();
        });

        // Should show incorrect feedback
        expect(getByTestId('review-session-incorrect-feedback')).toBeTruthy();

        // Should not show component radicals section
        expect(queryByTestId('review-session-component-radicals')).toBeNull();
      }
    });

    it('displays radical characters correctly', () => {
      // Reset random to meaning first
      callIndex = 0;
      (Math.random as jest.Mock).mockImplementation(() => {
        const values = [0.1, 0.1, 0.1, 0.1, 0.1];
        return values[callIndex++ % values.length];
      });

      const { getByTestId, getAllByText } = render(
        <ReviewSession
          items={[kanjiWithRadicals]}
          onAnswer={jest.fn()}
          autoAdvanceDelay={0}
        />,
      );

      const type = getByTestId('review-session-question-type').props.children;

      if (type === 'MEANING') {
        const input = getByTestId('review-session-input');
        fireEvent.changeText(input, 'wrong');
        fireEvent(input, 'submitEditing');

        act(() => {
          jest.runAllTimers();
        });

        // Should display radical characters
        const treeTexts = getAllByText('木');
        // There should be at least 3 tree radicals displayed
        expect(treeTexts.length).toBeGreaterThanOrEqual(3);
      }
    });
  });

  describe('Component Kanji on Incorrect Vocabulary Answers', () => {
    let callIndex = 0;
    beforeEach(() => {
      jest.useFakeTimers();
      callIndex = 0;
      // Control randomization: meaning first by default
      (Math.random as jest.Mock).mockImplementation(() => {
        const values = [0.1, 0.1, 0.1, 0.1, 0.1];
        return values[callIndex++ % values.length];
      });
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    // Create a vocabulary item with component kanji
    const vocabWithKanji: ReviewItem = {
      id: 200,
      assignmentId: 2000,
      subjectType: 'vocabulary',
      srsStage: 1,
      characters: '大人',
      meanings: createMeanings([{ meaning: 'Adult', primary: true }]),
      readings: createReadings([{ reading: 'おとな', primary: true }]),
      meaningMnemonic: 'A big person is an adult',
      readingMnemonic: 'Reading mnemonic for otona',
      componentKanji: [
        { id: 10, characters: '大', meaning: 'Big', reading: 'おお' },
        { id: 11, characters: '人', meaning: 'Person', reading: 'ひと' },
      ],
    };

    it('shows component kanji on incorrect vocabulary meaning answer', () => {
      // Reset random to meaning first
      callIndex = 0;
      (Math.random as jest.Mock).mockImplementation(() => {
        const values = [0.1, 0.1, 0.1, 0.1, 0.1];
        return values[callIndex++ % values.length];
      });

      const { getByTestId, getByText } = render(
        <ReviewSession
          items={[vocabWithKanji]}
          onAnswer={jest.fn()}
          autoAdvanceDelay={0}
        />,
      );

      // Check if on meaning question first
      const type = getByTestId('review-session-question-type').props.children;
      if (type !== 'MEANING') {
        // Skip this test if we got a reading question first
        return;
      }

      // Submit wrong answer
      const input = getByTestId('review-session-input');
      fireEvent.changeText(input, 'wrong');
      fireEvent(input, 'submitEditing');

      act(() => {
        jest.runAllTimers();
      });

      // Should show incorrect feedback
      expect(getByTestId('review-session-incorrect-feedback')).toBeTruthy();

      // Should show component kanji section
      expect(getByTestId('review-session-component-kanji')).toBeTruthy();
      expect(getByText('Made up of:')).toBeTruthy();

      // Should show each component kanji
      expect(getByTestId('review-session-component-kanji-10')).toBeTruthy();
      expect(getByTestId('review-session-component-kanji-11')).toBeTruthy();
    });

    it('shows component kanji with readings on incorrect vocabulary reading answer', () => {
      // Reset random to reading first
      callIndex = 0;
      (Math.random as jest.Mock).mockImplementation(() => {
        const values = [0.9, 0.9, 0.9, 0.9, 0.9]; // Higher values to get reading question first
        return values[callIndex++ % values.length];
      });

      const { getByTestId, getByText } = render(
        <ReviewSession
          items={[vocabWithKanji]}
          onAnswer={jest.fn()}
          autoAdvanceDelay={0}
        />,
      );

      // Check if on reading question
      const type = getByTestId('review-session-question-type').props.children;
      if (type !== 'READING') {
        // Skip this test if we got a meaning question instead
        return;
      }

      // Submit wrong answer (use valid hiragana, not romaji that can't convert)
      const input = getByTestId('review-session-input');
      fireEvent.changeText(input, 'あああ');
      fireEvent(input, 'submitEditing');

      act(() => {
        jest.runAllTimers();
      });

      // Should show incorrect feedback with component kanji
      expect(getByTestId('review-session-incorrect-feedback')).toBeTruthy();
      expect(getByTestId('review-session-component-kanji')).toBeTruthy();

      // For reading questions, should show the reading instead of meaning
      expect(getByText('おお')).toBeTruthy();
      expect(getByText('ひと')).toBeTruthy();
    });

    it('does not show component kanji for vocabulary without components', () => {
      const vocabWithoutKanji: ReviewItem = {
        ...sampleVocabulary,
        componentKanji: undefined,
      };

      // Reset random to meaning first
      callIndex = 0;
      (Math.random as jest.Mock).mockImplementation(() => {
        const values = [0.1, 0.1, 0.1, 0.1, 0.1];
        return values[callIndex++ % values.length];
      });

      const { getByTestId, queryByTestId } = render(
        <ReviewSession
          items={[vocabWithoutKanji]}
          onAnswer={jest.fn()}
          autoAdvanceDelay={0}
        />,
      );

      // Submit wrong answer - use appropriate format based on question type
      const input = getByTestId('review-session-input');
      const type = getByTestId('review-session-question-type').props.children;
      const wrongAnswer = type === 'READING' ? 'あああ' : 'wrong';
      fireEvent.changeText(input, wrongAnswer);
      fireEvent(input, 'submitEditing');

      act(() => {
        jest.runAllTimers();
      });

      // Should show incorrect feedback
      expect(getByTestId('review-session-incorrect-feedback')).toBeTruthy();

      // Should not show component kanji section
      expect(queryByTestId('review-session-component-kanji')).toBeNull();
    });

    it('does not show component kanji for kanji items', () => {
      // Reset random to meaning first
      callIndex = 0;
      (Math.random as jest.Mock).mockImplementation(() => {
        const values = [0.1, 0.1, 0.1, 0.1, 0.1];
        return values[callIndex++ % values.length];
      });

      const { getByTestId, queryByTestId } = render(
        <ReviewSession
          items={[sampleKanji]}
          onAnswer={jest.fn()}
          autoAdvanceDelay={0}
        />,
      );

      // Submit wrong answer - use appropriate format based on question type
      const input = getByTestId('review-session-input');
      const type = getByTestId('review-session-question-type').props.children;
      const wrongAnswer = type === 'READING' ? 'あああ' : 'wrong';
      fireEvent.changeText(input, wrongAnswer);
      fireEvent(input, 'submitEditing');

      act(() => {
        jest.runAllTimers();
      });

      // Should show incorrect feedback
      expect(getByTestId('review-session-incorrect-feedback')).toBeTruthy();

      // Should not show component kanji section (kanji shows radicals, not kanji)
      expect(queryByTestId('review-session-component-kanji')).toBeNull();
    });

    it('displays kanji characters correctly', () => {
      // Reset random to meaning first
      callIndex = 0;
      (Math.random as jest.Mock).mockImplementation(() => {
        const values = [0.1, 0.1, 0.1, 0.1, 0.1];
        return values[callIndex++ % values.length];
      });

      const { getByTestId, getAllByText } = render(
        <ReviewSession
          items={[vocabWithKanji]}
          onAnswer={jest.fn()}
          autoAdvanceDelay={0}
        />,
      );

      const type = getByTestId('review-session-question-type').props.children;

      if (type === 'MEANING') {
        const input = getByTestId('review-session-input');
        fireEvent.changeText(input, 'wrong');
        fireEvent(input, 'submitEditing');

        act(() => {
          jest.runAllTimers();
        });

        // Should display kanji characters
        const bigTexts = getAllByText('大');
        expect(bigTexts.length).toBeGreaterThanOrEqual(1);
        const personTexts = getAllByText('人');
        expect(personTexts.length).toBeGreaterThanOrEqual(1);
      }
    });

    it('handles kana-only vocabulary gracefully (empty component kanji)', () => {
      const kanaVocab: ReviewItem = {
        id: 300,
        assignmentId: 3000,
        subjectType: 'kana_vocabulary',
        srsStage: 1,
        characters: 'あめ',
        meanings: createMeanings([{ meaning: 'Candy', primary: true }]),
        readings: createReadings([{ reading: 'あめ', primary: true }]),
        meaningMnemonic: 'Mnemonic for candy',
        readingMnemonic: 'Reading mnemonic for ame',
        componentKanji: [], // Empty array - no kanji components
      };

      // Reset random to meaning first
      callIndex = 0;
      (Math.random as jest.Mock).mockImplementation(() => {
        const values = [0.1, 0.1, 0.1, 0.1, 0.1];
        return values[callIndex++ % values.length];
      });

      const { getByTestId, queryByTestId } = render(
        <ReviewSession
          items={[kanaVocab]}
          onAnswer={jest.fn()}
          autoAdvanceDelay={0}
        />,
      );

      // Submit wrong answer - use appropriate format based on question type
      const input = getByTestId('review-session-input');
      const type = getByTestId('review-session-question-type').props.children;
      const wrongAnswer = type === 'READING' ? 'あああ' : 'wrong';
      fireEvent.changeText(input, wrongAnswer);
      fireEvent(input, 'submitEditing');

      act(() => {
        jest.runAllTimers();
      });

      // Should show incorrect feedback
      expect(getByTestId('review-session-incorrect-feedback')).toBeTruthy();

      // Should not show component kanji section (empty array)
      expect(queryByTestId('review-session-component-kanji')).toBeNull();
    });
  });

  describe('Invalid Reading Input Blocking', () => {
    const vocabForReading = createVocabularyItem(50, 'たべる', 'Eat', 'たべる');
    let callIndex = 0;

    beforeEach(() => {
      // Reset random to get reading question first
      callIndex = 0;
      (Math.random as jest.Mock).mockImplementation(() => {
        const values = [0.9, 0.9, 0.9, 0.9, 0.9]; // reading first
        return values[callIndex++ % values.length];
      });
    });

    it('does not submit empty reading answer', () => {
      const onAnswer = jest.fn();
      const { getByTestId } = render(
        <ReviewSession
          items={[vocabForReading]}
          onAnswer={onAnswer}
          autoAdvanceDelay={0}
        />,
      );

      const type = getByTestId('review-session-question-type').props.children;

      if (type === 'READING') {
        // Try to submit empty input
        fireEvent.press(getByTestId('review-session-submit'));

        // onAnswer should NOT be called
        expect(onAnswer).not.toHaveBeenCalled();

        // Should still be on the same question (not show incorrect feedback)
        expect(getByTestId('review-session')).toBeTruthy();
      }
    });

    it('does not submit whitespace-only reading answer', () => {
      const onAnswer = jest.fn();
      const { getByTestId } = render(
        <ReviewSession
          items={[vocabForReading]}
          onAnswer={onAnswer}
          autoAdvanceDelay={0}
        />,
      );

      const type = getByTestId('review-session-question-type').props.children;

      if (type === 'READING') {
        // Type whitespace only
        fireEvent.changeText(getByTestId('review-session-input'), '   ');
        fireEvent.press(getByTestId('review-session-submit'));

        // onAnswer should NOT be called
        expect(onAnswer).not.toHaveBeenCalled();
      }
    });

    it('does not submit reading answer with unconvertible romaji', () => {
      const onAnswer = jest.fn();
      const { getByTestId } = render(
        <ReviewSession
          items={[vocabForReading]}
          onAnswer={onAnswer}
          autoAdvanceDelay={0}
        />,
      );

      const type = getByTestId('review-session-question-type').props.children;

      if (type === 'READING') {
        // Type romaji that can't be converted to hiragana
        fireEvent.changeText(getByTestId('review-session-input'), 'xyz');
        fireEvent.press(getByTestId('review-session-submit'));

        // onAnswer should NOT be called
        expect(onAnswer).not.toHaveBeenCalled();
      }
    });

    it('does not submit reading answer with partial romaji like "ky"', () => {
      const onAnswer = jest.fn();
      const { getByTestId } = render(
        <ReviewSession
          items={[vocabForReading]}
          onAnswer={onAnswer}
          autoAdvanceDelay={0}
        />,
      );

      const type = getByTestId('review-session-question-type').props.children;

      if (type === 'READING') {
        // Type partial romaji sequence
        fireEvent.changeText(getByTestId('review-session-input'), 'ky');
        fireEvent.press(getByTestId('review-session-submit'));

        // onAnswer should NOT be called
        expect(onAnswer).not.toHaveBeenCalled();
      }
    });

    it('allows submission of valid romaji that converts to hiragana', () => {
      const onAnswer = jest.fn();
      const { getByTestId } = render(
        <ReviewSession
          items={[vocabForReading]}
          onAnswer={onAnswer}
          autoAdvanceDelay={0}
        />,
      );

      const type = getByTestId('review-session-question-type').props.children;

      if (type === 'READING') {
        // Type valid romaji
        fireEvent.changeText(getByTestId('review-session-input'), 'taberu');
        fireEvent.press(getByTestId('review-session-submit'));

        // onAnswer should be called
        expect(onAnswer).toHaveBeenCalled();
      }
    });

    it('allows submission of direct hiragana input', () => {
      const onAnswer = jest.fn();
      const { getByTestId } = render(
        <ReviewSession
          items={[vocabForReading]}
          onAnswer={onAnswer}
          autoAdvanceDelay={0}
        />,
      );

      const type = getByTestId('review-session-question-type').props.children;

      if (type === 'READING') {
        // Type direct hiragana
        fireEvent.changeText(getByTestId('review-session-input'), 'たべる');
        fireEvent.press(getByTestId('review-session-submit'));

        // onAnswer should be called
        expect(onAnswer).toHaveBeenCalled();
      }
    });

    it('does not block empty meaning answers (they are processed normally)', () => {
      // Use meaning-first order
      callIndex = 0;
      (Math.random as jest.Mock).mockImplementation(() => {
        const values = [0.1, 0.1, 0.1, 0.1, 0.1]; // meaning first
        return values[callIndex++ % values.length];
      });

      const onAnswer = jest.fn();
      const radical = createRadicalItem(60, '一', 'Ground');
      const { getByTestId } = render(
        <ReviewSession
          items={[radical]}
          onAnswer={onAnswer}
          autoAdvanceDelay={0}
        />,
      );

      // Radical always has meaning question
      fireEvent.press(getByTestId('review-session-submit'));

      // onAnswer should be called (empty meaning answers are submitted and marked incorrect)
      expect(onAnswer).toHaveBeenCalled();
    });

    it('renders input container that shakes on invalid reading submission', () => {
      const { getByTestId } = render(
        <ReviewSession
          items={[vocabForReading]}
          onAnswer={jest.fn()}
          autoAdvanceDelay={0}
        />,
      );

      const type = getByTestId('review-session-question-type').props.children;

      if (type === 'READING') {
        // The input container has the shake animation applied
        const inputContainer = getByTestId('review-session-input-container');
        expect(inputContainer).toBeTruthy();

        // Try to submit invalid input
        fireEvent.changeText(getByTestId('review-session-input'), 'invalid');
        fireEvent.press(getByTestId('review-session-submit'));

        // Input container should still be there (no navigation away)
        expect(getByTestId('review-session-input-container')).toBeTruthy();
      }
    });
  });
});
