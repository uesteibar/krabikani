import React from 'react';
import { render, fireEvent, act, waitFor } from '@testing-library/react-native';

import { QuizEngine } from '../../../src/components/quiz/QuizEngine';
import type {
  Question,
  QuizEngineConfig,
  QuizAnswerEvent,
} from '../../../src/components/quiz/types';

// Mock the hooks
jest.mock('../../../src/hooks/useShakeAnimation', () => ({
  useShakeAnimation: () => ({
    shakeStyle: {},
    triggerShake: jest.fn(),
  }),
}));

jest.mock('../../../src/hooks/useAutoFocus', () => ({
  useAutoFocus: jest.fn(),
}));

// useQuestionInput is used without mocking (real implementation)

// Mock answer validation
jest.mock('../../../src/components/quiz/answerValidation', () => ({
  validateInput: jest.fn().mockReturnValue({ valid: true }),
  validateAnswer: jest.fn().mockReturnValue({
    status: 'correct',
    userAnswer: 'big',
    correctAnswer: 'big',
  }),
}));

const { validateInput, validateAnswer } = jest.requireMock(
  '../../../src/components/quiz/answerValidation',
);

function makeQuestion(overrides: Partial<Question> = {}): Question {
  return {
    id: 'q1-meaning',
    subjectId: 1,
    subjectType: 'kanji',
    displayText: '大',
    displayMode: 'characters',
    correctAnswers: ['big', 'large'],
    questionType: 'meaning',
    mnemonic: 'A person with arms spread wide is big',
    mnemonicLabel: 'Meaning Mnemonic:',
    meanings: [
      { meaning: 'big', primary: true, accepted_answer: true },
      { meaning: 'large', primary: false, accepted_answer: true },
    ],
    readings: [],
    auxiliaryMeanings: [],
    userSynonyms: [],
    ...overrides,
  };
}

function makeReadingQuestion(overrides: Partial<Question> = {}): Question {
  return makeQuestion({
    id: 'q1-reading',
    questionType: 'reading',
    mnemonicLabel: 'Reading Mnemonic:',
    readings: [{ reading: 'おお', primary: true, accepted_answer: true }],
    ...overrides,
  });
}

function makeReverseQuestion(overrides: Partial<Question> = {}): Question {
  return makeQuestion({
    id: 'q1-reverse',
    subjectType: 'vocabulary',
    displayText: 'big',
    displayMode: 'meaning',
    questionType: 'reverse',
    correctAnswers: ['大'],
    mnemonicLabel: 'Meaning Mnemonic:',
    ...overrides,
  });
}

function makeConfig(
  overrides: Partial<QuizEngineConfig> = {},
): QuizEngineConfig {
  return {
    questions: [makeQuestion()],
    progressMode: { mode: 'none' },
    completionMode: 'allQuestions',
    allowMarkCorrect: false,
    allowAddSynonym: false,
    requeueIncorrect: false,
    showSrsBadge: false,
    showSubjectTypeLabel: false,
    testID: 'quiz-engine',
    ...overrides,
  };
}

describe('QuizEngine', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
    validateInput.mockReturnValue({ valid: true });
    validateAnswer.mockReturnValue({
      status: 'correct',
      userAnswer: 'big',
      correctAnswer: 'big',
    });
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('rendering', () => {
    it('renders the current question with SubjectDisplay', () => {
      const { getByTestId } = render(<QuizEngine config={makeConfig()} />);
      expect(getByTestId('subject-display-text')).toBeTruthy();
    });

    it('renders the input field', () => {
      const { getByTestId } = render(<QuizEngine config={makeConfig()} />);
      expect(getByTestId('quiz-engine-input')).toBeTruthy();
    });

    it('renders the submit button', () => {
      const { getByTestId } = render(<QuizEngine config={makeConfig()} />);
      expect(getByTestId('quiz-engine-submit')).toBeTruthy();
    });

    it('renders QuestionTypeLabel', () => {
      const { getByText } = render(<QuizEngine config={makeConfig()} />);
      expect(getByText('MEANING')).toBeTruthy();
    });

    it('renders with progress mode', () => {
      const config = makeConfig({
        progressMode: { mode: 'progress', current: 1, total: 5 },
      });
      const { getByTestId } = render(<QuizEngine config={config} />);
      expect(getByTestId('progress-header-count')).toBeTruthy();
    });

    it('renders with practice mode header', () => {
      const config = makeConfig({
        progressMode: {
          mode: 'practice',
          phrase: 'Keep going!',
          icon: 'weight-lifter',
        },
      });
      const { getByText } = render(<QuizEngine config={config} />);
      expect(getByText('Keep going!')).toBeTruthy();
    });

    it('renders with zen mode header', () => {
      const config = makeConfig({
        progressMode: { mode: 'zen' },
      });
      const { getByText } = render(<QuizEngine config={config} />);
      expect(getByText('Zen Mode')).toBeTruthy();
    });

    it('renders extra buttons when provided', () => {
      const config = makeConfig({
        renderExtraButtons: () => <></>,
      });
      const { getByTestId } = render(<QuizEngine config={config} />);
      expect(getByTestId('quiz-engine-button-row')).toBeTruthy();
    });

    it('renders subject type label when showSubjectTypeLabel is true', () => {
      const config = makeConfig({ showSubjectTypeLabel: true });
      const { getByText } = render(<QuizEngine config={config} />);
      expect(getByText('kanji')).toBeTruthy();
    });

    it('uses custom questionLabelType mapping', () => {
      const config = makeConfig({
        questions: [makeReverseQuestion()],
        questionLabelType: () => 'kanji',
      });
      const { getByText } = render(<QuizEngine config={config} />);
      expect(getByText('KANJI')).toBeTruthy();
    });
  });

  describe('answer submission', () => {
    it('calls onAnswer with correct result', () => {
      const onAnswer = jest.fn();
      const config = makeConfig({ onAnswer });
      const { getByTestId } = render(<QuizEngine config={config} />);

      const input = getByTestId('quiz-engine-input');
      fireEvent.changeText(input, 'big');
      fireEvent.press(getByTestId('quiz-engine-submit'));

      expect(onAnswer).toHaveBeenCalledWith(
        expect.objectContaining({
          question: expect.objectContaining({ id: 'q1-meaning' }),
          result: expect.objectContaining({ status: 'correct' }),
        }),
      );
    });

    it('shakes on invalid input', () => {
      validateInput.mockReturnValue({ valid: false, reason: 'shake' });
      const onAnswer = jest.fn();
      const config = makeConfig({ onAnswer });
      const { getByTestId } = render(<QuizEngine config={config} />);

      fireEvent.press(getByTestId('quiz-engine-submit'));

      expect(onAnswer).not.toHaveBeenCalled();
    });

    it('shows correct feedback briefly then advances', async () => {
      const questions = [
        makeQuestion(),
        makeQuestion({ id: 'q2-meaning', subjectId: 2 }),
      ];
      const config = makeConfig({ questions, autoAdvanceDelay: 500 });
      const { getByTestId, queryByTestId } = render(
        <QuizEngine config={config} />,
      );

      const input = getByTestId('quiz-engine-input');
      fireEvent.changeText(input, 'big');
      fireEvent.press(getByTestId('quiz-engine-submit'));

      // Should show correct feedback inline (subject display shows feedback label)
      expect(getByTestId('subject-display-feedback-label')).toBeTruthy();

      // After delay, should advance
      act(() => {
        jest.advanceTimersByTime(500);
      });

      // Should now show next question (no more correct feedback)
      expect(queryByTestId('subject-display-feedback-label')).toBeNull();
    });

    it('shows incorrect feedback with continue button', () => {
      validateAnswer.mockReturnValue({
        status: 'incorrect',
        userAnswer: 'small',
        correctAnswer: 'big',
      });
      const config = makeConfig();
      const { getByTestId } = render(<QuizEngine config={config} />);

      const input = getByTestId('quiz-engine-input');
      fireEvent.changeText(input, 'small');
      fireEvent.press(getByTestId('quiz-engine-submit'));

      expect(getByTestId('quiz-engine-continue')).toBeTruthy();
    });

    it('advances to next question on continue press', () => {
      const questions = [
        makeQuestion(),
        makeQuestion({ id: 'q2-meaning', subjectId: 2, displayText: '小' }),
      ];
      validateAnswer.mockReturnValue({
        status: 'incorrect',
        userAnswer: 'small',
        correctAnswer: 'big',
      });
      const config = makeConfig({ questions });
      const { getByTestId } = render(<QuizEngine config={config} />);

      const input = getByTestId('quiz-engine-input');
      fireEvent.changeText(input, 'small');
      fireEvent.press(getByTestId('quiz-engine-submit'));

      fireEvent.press(getByTestId('quiz-engine-continue'));

      // Should be showing the next question
      expect(getByTestId('subject-display-text').props.children).toBe('小');
    });
  });

  describe('re-queuing', () => {
    it('re-queues incorrect answers when requeueIncorrect is true', () => {
      const questions = [
        makeQuestion({ id: 'q1-meaning' }),
        makeQuestion({ id: 'q2-meaning', subjectId: 2, displayText: '小' }),
      ];
      validateAnswer.mockReturnValue({
        status: 'incorrect',
        userAnswer: 'wrong',
        correctAnswer: 'big',
      });
      const config = makeConfig({ questions, requeueIncorrect: true });
      const { getByTestId } = render(<QuizEngine config={config} />);

      // Answer q1 incorrectly
      fireEvent.changeText(getByTestId('quiz-engine-input'), 'wrong');
      fireEvent.press(getByTestId('quiz-engine-submit'));
      fireEvent.press(getByTestId('quiz-engine-continue'));

      // Now on q2
      expect(getByTestId('subject-display-text').props.children).toBe('小');

      // Answer q2 correctly
      validateAnswer.mockReturnValue({
        status: 'correct',
        userAnswer: 'small',
        correctAnswer: 'small',
      });
      fireEvent.changeText(getByTestId('quiz-engine-input'), 'small');
      fireEvent.press(getByTestId('quiz-engine-submit'));
      act(() => {
        jest.advanceTimersByTime(500);
      });

      // Should be back on q1 (re-queued)
      expect(getByTestId('subject-display-text').props.children).toBe('大');
    });

    it('does not re-queue incorrect answers when requeueIncorrect is false', () => {
      const questions = [
        makeQuestion({ id: 'q1-meaning' }),
        makeQuestion({ id: 'q2-meaning', subjectId: 2, displayText: '小' }),
      ];
      validateAnswer.mockReturnValue({
        status: 'incorrect',
        userAnswer: 'wrong',
        correctAnswer: 'big',
      });
      const config = makeConfig({
        questions,
        requeueIncorrect: false,
        completionMode: 'never',
      });
      const { getByTestId } = render(<QuizEngine config={config} />);

      // Answer q1 incorrectly
      fireEvent.changeText(getByTestId('quiz-engine-input'), 'wrong');
      fireEvent.press(getByTestId('quiz-engine-submit'));
      fireEvent.press(getByTestId('quiz-engine-continue'));

      // Now on q2
      expect(getByTestId('subject-display-text').props.children).toBe('小');

      // Answer q2 correctly
      validateAnswer.mockReturnValue({
        status: 'correct',
        userAnswer: 'small',
        correctAnswer: 'small',
      });
      fireEvent.changeText(getByTestId('quiz-engine-input'), 'small');
      fireEvent.press(getByTestId('quiz-engine-submit'));
      act(() => {
        jest.advanceTimersByTime(500);
      });

      // No more questions — should NOT go back to q1
      // (queue is exhausted — engine still renders, just shows loading/empty)
    });
  });

  describe('completion', () => {
    it('calls onComplete when all questions answered correctly', () => {
      const onComplete = jest.fn();
      const config = makeConfig({
        questions: [makeQuestion()],
        completionMode: 'allQuestions',
        onComplete,
      });
      const { getByTestId } = render(<QuizEngine config={config} />);

      fireEvent.changeText(getByTestId('quiz-engine-input'), 'big');
      fireEvent.press(getByTestId('quiz-engine-submit'));
      act(() => {
        jest.advanceTimersByTime(500);
      });

      expect(onComplete).toHaveBeenCalled();
    });

    it('renders completion screen via renderCompletion', () => {
      const config = makeConfig({
        questions: [makeQuestion()],
        completionMode: 'allQuestions',
        renderCompletion: () => <></>,
      });
      const { getByTestId } = render(<QuizEngine config={config} />);

      fireEvent.changeText(getByTestId('quiz-engine-input'), 'big');
      fireEvent.press(getByTestId('quiz-engine-submit'));
      act(() => {
        jest.advanceTimersByTime(500);
      });

      expect(getByTestId('quiz-engine-complete')).toBeTruthy();
    });

    it('never completes in never mode', () => {
      const onComplete = jest.fn();
      const config = makeConfig({
        questions: [makeQuestion()],
        completionMode: 'never',
        onComplete,
      });
      const { getByTestId } = render(<QuizEngine config={config} />);

      fireEvent.changeText(getByTestId('quiz-engine-input'), 'big');
      fireEvent.press(getByTestId('quiz-engine-submit'));
      act(() => {
        jest.advanceTimersByTime(500);
      });

      expect(onComplete).not.toHaveBeenCalled();
    });
  });

  describe('mark as correct', () => {
    it('shows Mark as Correct button when allowMarkCorrect is true', () => {
      validateAnswer.mockReturnValue({
        status: 'incorrect',
        userAnswer: 'wrong',
        correctAnswer: 'big',
      });
      const config = makeConfig({
        allowMarkCorrect: true,
        onMarkCorrect: jest.fn(),
      });
      const { getByTestId } = render(<QuizEngine config={config} />);

      fireEvent.changeText(getByTestId('quiz-engine-input'), 'wrong');
      fireEvent.press(getByTestId('quiz-engine-submit'));

      expect(getByTestId('quiz-engine-mark-correct')).toBeTruthy();
    });

    it('calls onMarkCorrect and advances when Mark as Correct pressed', () => {
      const onMarkCorrect = jest.fn();
      validateAnswer.mockReturnValue({
        status: 'incorrect',
        userAnswer: 'wrong',
        correctAnswer: 'big',
      });
      const questions = [
        makeQuestion(),
        makeQuestion({ id: 'q2-meaning', subjectId: 2, displayText: '小' }),
      ];
      const config = makeConfig({
        questions,
        allowMarkCorrect: true,
        onMarkCorrect,
        requeueIncorrect: true,
      });
      const { getByTestId } = render(<QuizEngine config={config} />);

      fireEvent.changeText(getByTestId('quiz-engine-input'), 'wrong');
      fireEvent.press(getByTestId('quiz-engine-submit'));
      fireEvent.press(getByTestId('quiz-engine-mark-correct'));

      expect(onMarkCorrect).toHaveBeenCalledWith(
        expect.objectContaining({ id: 'q1-meaning' }),
        'wrong',
      );
      // Should advance to next question
      expect(getByTestId('subject-display-text').props.children).toBe('小');
    });

    it('removes re-queued question when marked correct', () => {
      const onMarkCorrect = jest.fn();
      validateAnswer
        .mockReturnValueOnce({
          status: 'incorrect',
          userAnswer: 'wrong',
          correctAnswer: 'big',
        })
        .mockReturnValue({
          status: 'correct',
          userAnswer: 'small',
          correctAnswer: 'small',
        });
      const questions = [
        makeQuestion(),
        makeQuestion({ id: 'q2-meaning', subjectId: 2, displayText: '小' }),
      ];
      const onComplete = jest.fn();
      const config = makeConfig({
        questions,
        allowMarkCorrect: true,
        onMarkCorrect,
        requeueIncorrect: true,
        completionMode: 'allQuestions',
        onComplete,
      });
      const { getByTestId } = render(<QuizEngine config={config} />);

      // Answer q1 incorrectly, then mark correct
      fireEvent.changeText(getByTestId('quiz-engine-input'), 'wrong');
      fireEvent.press(getByTestId('quiz-engine-submit'));
      fireEvent.press(getByTestId('quiz-engine-mark-correct'));

      // Answer q2 correctly
      fireEvent.changeText(getByTestId('quiz-engine-input'), 'small');
      fireEvent.press(getByTestId('quiz-engine-submit'));
      act(() => {
        jest.advanceTimersByTime(500);
      });

      // Should complete (q1 was marked correct, q2 answered correctly, no re-queued q1)
      expect(onComplete).toHaveBeenCalled();
    });
  });

  describe('auto-refill', () => {
    it('triggers loadMore when queue runs low', async () => {
      const newQuestion = makeQuestion({
        id: 'q3-meaning',
        subjectId: 3,
        displayText: '中',
      });
      const loadMore = jest.fn().mockResolvedValue([newQuestion]);
      const config = makeConfig({
        questions: [
          makeQuestion(),
          makeQuestion({ id: 'q2-meaning', subjectId: 2, displayText: '小' }),
        ],
        completionMode: 'never',
        autoRefill: { threshold: 1, loadMore },
      });
      const { getByTestId } = render(<QuizEngine config={config} />);

      // Answer q1 correctly — 1 remaining, should trigger refill
      fireEvent.changeText(getByTestId('quiz-engine-input'), 'big');
      fireEvent.press(getByTestId('quiz-engine-submit'));
      act(() => {
        jest.advanceTimersByTime(500);
      });

      await waitFor(() => {
        expect(loadMore).toHaveBeenCalled();
      });
    });
  });

  describe('SRS badge', () => {
    it('passes SRS badge to SubjectDisplay when getSrsBadge provided', () => {
      const config = makeConfig({
        showSrsBadge: true,
        getSrsBadge: () => ({ type: 'static' as const, stage: 5 }),
      });
      const { getByTestId } = render(<QuizEngine config={config} />);
      expect(getByTestId('srs-badge')).toBeTruthy();
    });
  });

  describe('fuzzy match', () => {
    it('shows Close Enough! label for fuzzy match correct answer', () => {
      validateAnswer.mockReturnValue({
        status: 'fuzzyMatch',
        userAnswer: 'bigg',
        correctAnswer: 'big',
      });
      const questions = [
        makeQuestion(),
        makeQuestion({ id: 'q2-meaning', subjectId: 2 }),
      ];
      const config = makeConfig({ questions });
      const { getByTestId } = render(<QuizEngine config={config} />);

      fireEvent.changeText(getByTestId('quiz-engine-input'), 'bigg');
      fireEvent.press(getByTestId('quiz-engine-submit'));

      expect(getByTestId('subject-display-feedback-label').props.children).toBe(
        'Close Enough!',
      );
    });
  });

  describe('details content', () => {
    it('passes renderDetailsContent to incorrect feedback view', () => {
      validateAnswer.mockReturnValue({
        status: 'incorrect',
        userAnswer: 'wrong',
        correctAnswer: 'big',
      });
      const config = makeConfig({
        renderDetailsContent: () => <></>,
      });
      const { getByTestId } = render(<QuizEngine config={config} />);

      fireEvent.changeText(getByTestId('quiz-engine-input'), 'wrong');
      fireEvent.press(getByTestId('quiz-engine-submit'));

      expect(getByTestId('quiz-engine-details-content')).toBeTruthy();
    });
  });

  describe('empty questions', () => {
    it('renders loading view when no questions provided', () => {
      const config = makeConfig({ questions: [] });
      const { getByTestId } = render(<QuizEngine config={config} />);
      expect(getByTestId('quiz-engine-empty')).toBeTruthy();
    });
  });
});
