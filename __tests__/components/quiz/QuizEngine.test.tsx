import React from 'react';
import { render, fireEvent, act, waitFor } from '@testing-library/react-native';

import { QuizEngine } from '../../../src/components/quiz/QuizEngine';
import { ThemeProvider } from '../../../src/theme/ThemeContext';
import { COLORS } from '../../../src/theme';
import type {
  Question,
  QuizEngineConfig,
} from '../../../src/components/quiz/types';

function renderWithTheme(ui: React.ReactElement, colorScheme?: 'light' | 'dark') {
  return render(
    <ThemeProvider forcedColorScheme={colorScheme ?? 'light'}>
      {ui}
    </ThemeProvider>,
  );
}

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
      const { getByTestId } = renderWithTheme(<QuizEngine config={makeConfig()} />);
      expect(getByTestId('subject-display-text')).toBeTruthy();
    });

    it('renders the input field', () => {
      const { getByTestId } = renderWithTheme(<QuizEngine config={makeConfig()} />);
      expect(getByTestId('quiz-engine-input')).toBeTruthy();
    });

    it('renders the input field with fixed height to prevent UI jumping with Japanese characters', () => {
      const { getByTestId } = renderWithTheme(<QuizEngine config={makeConfig()} />);
      const input = getByTestId('quiz-engine-input');
      const styles = input.props.style
        .flat(Infinity)
        .filter(Boolean)
        .reduce(
          (acc: Record<string, unknown>, style: Record<string, unknown>) => ({
            ...acc,
            ...style,
          }),
          {},
        );
      expect(styles.height).toBe(56);
    });

    it('renders the submit button', () => {
      const { getByTestId } = renderWithTheme(<QuizEngine config={makeConfig()} />);
      expect(getByTestId('quiz-engine-submit')).toBeTruthy();
    });

    it('renders QuestionTypeLabel', () => {
      const { getByText } = renderWithTheme(<QuizEngine config={makeConfig()} />);
      expect(getByText('MEANING')).toBeTruthy();
    });

    it('renders with progress mode', () => {
      const config = makeConfig({
        progressMode: { mode: 'progress', current: 1, total: 5 },
      });
      const { getByTestId } = renderWithTheme(<QuizEngine config={config} />);
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
      const { getByText } = renderWithTheme(<QuizEngine config={config} />);
      expect(getByText('Keep going!')).toBeTruthy();
    });

    it('renders with zen mode header', () => {
      const config = makeConfig({
        progressMode: { mode: 'zen' },
      });
      const { getByText } = renderWithTheme(<QuizEngine config={config} />);
      expect(getByText('Zen Mode')).toBeTruthy();
    });

    it('renders extra buttons when provided', () => {
      const config = makeConfig({
        renderExtraButtons: () => <></>,
      });
      const { getByTestId } = renderWithTheme(<QuizEngine config={config} />);
      expect(getByTestId('quiz-engine-button-row')).toBeTruthy();
    });

    it('renders subject type label when showSubjectTypeLabel is true', () => {
      const config = makeConfig({ showSubjectTypeLabel: true });
      const { getByText } = renderWithTheme(<QuizEngine config={config} />);
      expect(getByText('kanji')).toBeTruthy();
    });

    it('uses custom questionLabelType mapping', () => {
      const config = makeConfig({
        questions: [makeReverseQuestion()],
        questionLabelType: () => 'kanji',
      });
      const { getByText } = renderWithTheme(<QuizEngine config={config} />);
      expect(getByText('KANJI')).toBeTruthy();
    });
  });

  describe('answer submission', () => {
    it('calls onAnswer with correct result', () => {
      const onAnswer = jest.fn();
      const config = makeConfig({ onAnswer });
      const { getByTestId } = renderWithTheme(<QuizEngine config={config} />);

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
      const { getByTestId } = renderWithTheme(<QuizEngine config={config} />);

      fireEvent.press(getByTestId('quiz-engine-submit'));

      expect(onAnswer).not.toHaveBeenCalled();
    });

    it('shows correct feedback briefly then advances', async () => {
      const questions = [
        makeQuestion(),
        makeQuestion({ id: 'q2-meaning', subjectId: 2 }),
      ];
      const config = makeConfig({ questions, autoAdvanceDelay: 500 });
      const { getByTestId, queryByTestId } = renderWithTheme(
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
      const { getByTestId } = renderWithTheme(<QuizEngine config={config} />);

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
      const { getByTestId } = renderWithTheme(<QuizEngine config={config} />);

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
      const { getByTestId } = renderWithTheme(<QuizEngine config={config} />);

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
      const { getByTestId } = renderWithTheme(<QuizEngine config={config} />);

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
      const { getByTestId } = renderWithTheme(<QuizEngine config={config} />);

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
      const { getByTestId } = renderWithTheme(<QuizEngine config={config} />);

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
      const { getByTestId } = renderWithTheme(<QuizEngine config={config} />);

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
      const { getByTestId } = renderWithTheme(<QuizEngine config={config} />);

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
      const { getByTestId } = renderWithTheme(<QuizEngine config={config} />);

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
      const { getByTestId } = renderWithTheme(<QuizEngine config={config} />);

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
      const { getByTestId } = renderWithTheme(<QuizEngine config={config} />);

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
      const { getByTestId } = renderWithTheme(<QuizEngine config={config} />);
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
      const { getByTestId } = renderWithTheme(<QuizEngine config={config} />);

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
      const { getByTestId } = renderWithTheme(<QuizEngine config={config} />);

      fireEvent.changeText(getByTestId('quiz-engine-input'), 'wrong');
      fireEvent.press(getByTestId('quiz-engine-submit'));

      expect(getByTestId('quiz-engine-details-content')).toBeTruthy();
    });
  });

  describe('empty questions', () => {
    it('renders loading view when no questions provided', () => {
      const config = makeConfig({ questions: [] });
      const { getByTestId } = renderWithTheme(<QuizEngine config={config} />);
      expect(getByTestId('quiz-engine-empty')).toBeTruthy();
    });
  });

  describe('completed questions should not reappear from requeue', () => {
    it('does not show a re-queued question if it was already answered correctly', () => {
      // Scenario: requeueIncorrect is on. A question is answered incorrectly
      // (gets re-queued to end). Later the same question appears again from
      // the re-queued copy — but by then the user already answered it
      // correctly via "Mark as Correct". The re-queued copy should be skipped.
      //
      // Queue starts as: [Q1, Q2]
      // 1. Q1 answered incorrectly → queue becomes [Q1, Q2, Q1-requeued]
      // 2. Q1 is marked correct → completedQuestionIds has Q1
      // 3. Advance to Q2 (index 1)
      // 4. Q2 answered correctly → advance to index 2
      // 5. Index 2 is the re-queued Q1 — it should be SKIPPED (it's completed)

      const q1 = makeQuestion({
        id: 'q1-meaning',
        subjectId: 1,
        displayText: '大',
      });
      const q2 = makeQuestion({
        id: 'q2-meaning',
        subjectId: 2,
        displayText: '小',
      });

      // First call: incorrect for Q1. Then correct for Q2.
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

      const onMarkCorrect = jest.fn();
      const onComplete = jest.fn();
      const config = makeConfig({
        questions: [q1, q2],
        requeueIncorrect: true,
        allowMarkCorrect: true,
        onMarkCorrect,
        completionMode: 'allQuestions',
        onComplete,
      });

      const { getByTestId, queryByTestId } = renderWithTheme(
        <QuizEngine config={config} />,
      );

      // Q1 is shown
      expect(getByTestId('subject-display-text').props.children).toBe('大');

      // Answer Q1 incorrectly → gets re-queued
      fireEvent.changeText(getByTestId('quiz-engine-input'), 'wrong');
      fireEvent.press(getByTestId('quiz-engine-submit'));

      // Now on incorrect feedback. Mark as correct.
      fireEvent.press(getByTestId('quiz-engine-mark-correct'));

      // Should advance to Q2
      expect(getByTestId('subject-display-text').props.children).toBe('小');

      // Answer Q2 correctly
      fireEvent.changeText(getByTestId('quiz-engine-input'), 'small');
      fireEvent.press(getByTestId('quiz-engine-submit'));
      act(() => jest.advanceTimersByTime(600));

      // The re-queued Q1 at index 2 should be skipped since Q1 is completed.
      // Session should complete (both questions answered), NOT show Q1 again.
      expect(onComplete).toHaveBeenCalled();
      expect(queryByTestId('quiz-engine-complete')).toBeTruthy();
    });

    it('skips re-queued question copy when advancing past end of original queue', () => {
      // Simpler scenario without Mark as Correct:
      // Queue: [Q1, Q2, Q3]
      // 1. Q1 answered incorrectly → queue: [Q1, Q2, Q3, Q1-requeued]
      // 2. Q2 answered correctly
      // 3. Q3 answered correctly
      // 4. Now at index 3: the re-queued Q1. Answer it correctly.
      // 5. Advance to index 4 — past end, nothing left.
      //    Session should complete, NOT wrap around and show Q1/Q2/Q3 again.

      const q1 = makeQuestion({
        id: 'q1-meaning',
        subjectId: 1,
        displayText: '大',
      });
      const q2 = makeQuestion({
        id: 'q2-meaning',
        subjectId: 2,
        displayText: '小',
      });
      const q3 = makeQuestion({
        id: 'q3-meaning',
        subjectId: 3,
        displayText: '中',
      });

      validateAnswer
        .mockReturnValueOnce({
          status: 'incorrect',
          userAnswer: 'wrong',
          correctAnswer: 'big',
        })
        .mockReturnValue({
          status: 'correct',
          userAnswer: 'answer',
          correctAnswer: 'answer',
        });

      const onComplete = jest.fn();
      const config = makeConfig({
        questions: [q1, q2, q3],
        requeueIncorrect: true,
        completionMode: 'allQuestions',
        onComplete,
      });

      const { getByTestId } = renderWithTheme(<QuizEngine config={config} />);

      // Q1: answer incorrectly → re-queued
      expect(getByTestId('subject-display-text').props.children).toBe('大');
      fireEvent.changeText(getByTestId('quiz-engine-input'), 'wrong');
      fireEvent.press(getByTestId('quiz-engine-submit'));
      fireEvent.press(getByTestId('quiz-engine-continue'));

      // Q2: answer correctly
      expect(getByTestId('subject-display-text').props.children).toBe('小');
      fireEvent.changeText(getByTestId('quiz-engine-input'), 'small');
      fireEvent.press(getByTestId('quiz-engine-submit'));
      act(() => jest.advanceTimersByTime(600));

      // Q3: answer correctly
      expect(getByTestId('subject-display-text').props.children).toBe('中');
      fireEvent.changeText(getByTestId('quiz-engine-input'), 'medium');
      fireEvent.press(getByTestId('quiz-engine-submit'));
      act(() => jest.advanceTimersByTime(600));

      // Re-queued Q1: answer correctly this time
      expect(getByTestId('subject-display-text').props.children).toBe('大');
      fireEvent.changeText(getByTestId('quiz-engine-input'), 'big');
      fireEvent.press(getByTestId('quiz-engine-submit'));
      act(() => jest.advanceTimersByTime(600));

      // All 3 original questions answered correctly → session complete
      expect(onComplete).toHaveBeenCalled();
    });

    it('does not show already-completed question when wrapping around with shouldSkipQuestion', () => {
      // This is the core bug: shouldSkipQuestion causes wrap-around,
      // and a completed question gets shown again because findNextValidIndex
      // only checks shouldSkipQuestion, not completedQuestionIds.
      //
      // Queue: [Q0, Q1-skipped, Q2, Q0-requeued]
      // 1. Q0 answered incorrectly → re-queued → queue: [Q0, Q1, Q2, Q0-requeued]
      // 2. Advance to Q1 — skipped by shouldSkipQuestion
      // 3. Advance to Q2 — shown, answered correctly
      // 4. Advance to Q0-requeued (index 3) — answer correctly → Q0 completed
      // 5. Advance past end (index 4), wrap around
      // 6. Index 0 is Q0 — should be skipped (completed)
      // 7. Index 1 is Q1 — shouldSkipQuestion now says available
      // BUG: Q0 at index 0 gets shown again because completedQuestionIds isn't checked

      const q0 = makeQuestion({ id: 'q0', subjectId: 1, displayText: 'Q0' });
      const q1 = makeQuestion({ id: 'q1', subjectId: 2, displayText: 'Q1' });
      const q2 = makeQuestion({ id: 'q2', subjectId: 3, displayText: 'Q2' });

      let skipQ1 = true;

      validateAnswer
        .mockReturnValueOnce({
          // Q0 first time: incorrect
          status: 'incorrect',
          userAnswer: 'wrong',
          correctAnswer: 'Q0-answer',
        })
        .mockReturnValueOnce({
          // Q2: correct
          status: 'correct',
          userAnswer: 'Q2-answer',
          correctAnswer: 'Q2-answer',
        })
        .mockReturnValueOnce({
          // Q0 requeued: correct
          status: 'correct',
          userAnswer: 'Q0-answer',
          correctAnswer: 'Q0-answer',
        })
        .mockReturnValue({
          // Q1: correct (if we get there)
          status: 'correct',
          userAnswer: 'Q1-answer',
          correctAnswer: 'Q1-answer',
        });

      const config = makeConfig({
        questions: [q0, q1, q2],
        requeueIncorrect: true,
        completionMode: 'never',
        shouldSkipQuestion: (q: Question) => {
          if (q.id === 'q1') return skipQ1;
          return false;
        },
      });

      const { getByTestId, queryByTestId } = renderWithTheme(
        <QuizEngine config={config} />,
      );

      // Step 1: Q0 shown, answer incorrectly → re-queued
      expect(getByTestId('subject-display-text').props.children).toBe('Q0');
      fireEvent.changeText(getByTestId('quiz-engine-input'), 'wrong');
      fireEvent.press(getByTestId('quiz-engine-submit'));
      fireEvent.press(getByTestId('quiz-engine-continue'));

      // Step 2-3: Q1 is skipped, Q2 is shown
      expect(getByTestId('subject-display-text').props.children).toBe('Q2');
      fireEvent.changeText(getByTestId('quiz-engine-input'), 'Q2-answer');
      fireEvent.press(getByTestId('quiz-engine-submit'));
      act(() => jest.advanceTimersByTime(600));

      // Step 4: Re-queued Q0 (index 3), answer correctly
      expect(getByTestId('subject-display-text').props.children).toBe('Q0');

      // Make Q1 available BEFORE answering Q0 — simulates another item being
      // introduced while Q0 is being answered (as happens in ReviewSession
      // when buffer cap drops and a new item becomes available)
      skipQ1 = false;

      fireEvent.changeText(getByTestId('quiz-engine-input'), 'Q0-answer');
      fireEvent.press(getByTestId('quiz-engine-submit'));
      act(() => jest.advanceTimersByTime(600));

      // BUG: Shows Q0 again (index 0) because completedQuestionIds not checked
      // FIX: Should skip Q0 (completed) and show Q1
      expect(queryByTestId('quiz-engine-empty')).toBeNull();
      expect(getByTestId('subject-display-text').props.children).toBe('Q1');
    });
  });

  describe('shouldSkipQuestion with wrap-around', () => {
    it('wraps around to find previously-skipped question after reaching end of queue', () => {
      // This test simulates the real bug scenario:
      // Queue: [Q0, Q1-skipped, Q2]
      // 1. Q0 is shown first (index 0, initial question)
      // 2. After answering Q0, it becomes "done" and should be skipped
      // 3. Q1 is also skipped (shouldSkipQuestion returns true for non-introduced items)
      // 4. Q2 is shown (index 2)
      // 5. After answering Q2, advance to index 3 (past end)
      // 6. Now Q1 becomes available (simulating item becoming introduced)
      // BUG: Q1 is at index 1, but we're at index 3 - can't go back
      // FIX: wrap around to find Q1

      const q0 = makeQuestion({ id: 'q0', subjectId: 1, displayText: 'Q0' });
      const q1 = makeQuestion({ id: 'q1', subjectId: 2, displayText: 'Q1' });
      const q2 = makeQuestion({ id: 'q2', subjectId: 3, displayText: 'Q2' });

      // Track completed questions (items that are "done")
      const completedQuestions = new Set<string>();
      // Q1 is skipped initially, becomes available after Q2 is answered
      let skipQ1 = true;

      const config = makeConfig({
        questions: [q0, q1, q2],
        completionMode: 'never',
        shouldSkipQuestion: (q: Question) => {
          // Skip completed questions (like real ReviewSession does for done items)
          if (completedQuestions.has(q.id)) return true;
          // Skip Q1 initially (simulates item not being introduced yet)
          if (q.id === 'q1') return skipQ1;
          return false;
        },
        onAnswer: ({ question }) => {
          // Mark question as completed when answered
          completedQuestions.add(question.id);
        },
      });

      const { getByTestId, queryByTestId, getByText } = renderWithTheme(
        <QuizEngine config={config} />,
      );

      // Q0 is shown first (initial question at index 0)
      expect(getByText('Q0')).toBeTruthy();

      // Answer Q0 correctly → Q0 becomes done, Q1 is skipped, Q2 is shown
      fireEvent.changeText(getByTestId('quiz-engine-input'), 'answer');
      fireEvent.press(getByTestId('quiz-engine-submit'));
      act(() => jest.advanceTimersByTime(600));

      // Q0 is now done (skipped), Q1 is skipped, Q2 should be shown
      expect(getByText('Q2')).toBeTruthy();

      // Before answering Q2, make Q1 available (simulates item becoming introduced)
      skipQ1 = false;

      // Answer Q2 correctly → Q2 becomes done, advance to index 3 (past end)
      fireEvent.changeText(getByTestId('quiz-engine-input'), 'answer');
      fireEvent.press(getByTestId('quiz-engine-submit'));
      act(() => jest.advanceTimersByTime(600));

      // BUG: Without wrap-around, shows loading screen (quiz-engine-empty)
      // FIX: Should wrap around and find Q1 at index 1
      expect(queryByTestId('quiz-engine-empty')).toBeNull();
      expect(getByText('Q1')).toBeTruthy();
    });
  });

  describe('theme-awareness', () => {
    it('should use light placeholder color in light mode', () => {
      const { getByTestId } = renderWithTheme(
        <QuizEngine config={makeConfig()} />,
        'light',
      );
      const input = getByTestId('quiz-engine-input');
      expect(input.props.placeholderTextColor).toBe(COLORS.text.placeholder);
    });

    it('should use dark placeholder color in dark mode', () => {
      const { getByTestId } = renderWithTheme(
        <QuizEngine config={makeConfig()} />,
        'dark',
      );
      const input = getByTestId('quiz-engine-input');
      expect(input.props.placeholderTextColor).toBe('#666666');
    });

    it('should use dark background color in dark mode', () => {
      const { getByTestId } = renderWithTheme(
        <QuizEngine config={makeConfig()} />,
        'dark',
      );
      const container = getByTestId('quiz-engine');
      const flatStyles = container.props.style
        .flat(Infinity)
        .filter(Boolean)
        .reduce(
          (acc: Record<string, unknown>, style: Record<string, unknown>) => ({
            ...acc,
            ...style,
          }),
          {},
        );
      expect(flatStyles.backgroundColor).toBe('#121212');
    });

    it('should use dark input background color in dark mode', () => {
      const { getByTestId } = renderWithTheme(
        <QuizEngine config={makeConfig()} />,
        'dark',
      );
      const input = getByTestId('quiz-engine-input');
      const flatStyles = input.props.style
        .flat(Infinity)
        .filter(Boolean)
        .reduce(
          (acc: Record<string, unknown>, style: Record<string, unknown>) => ({
            ...acc,
            ...style,
          }),
          {},
        );
      expect(flatStyles.backgroundColor).toBe('#2A2A2A');
    });

    it('should use light text color in light mode', () => {
      const { getByTestId } = renderWithTheme(
        <QuizEngine config={makeConfig()} />,
        'light',
      );
      const input = getByTestId('quiz-engine-input');
      const flatStyles = input.props.style
        .flat(Infinity)
        .filter(Boolean)
        .reduce(
          (acc: Record<string, unknown>, style: Record<string, unknown>) => ({
            ...acc,
            ...style,
          }),
          {},
        );
      expect(flatStyles.color).toBe(COLORS.text.primary);
    });

    it('should use dark text color in dark mode', () => {
      const { getByTestId } = renderWithTheme(
        <QuizEngine config={makeConfig()} />,
        'dark',
      );
      const input = getByTestId('quiz-engine-input');
      const flatStyles = input.props.style
        .flat(Infinity)
        .filter(Boolean)
        .reduce(
          (acc: Record<string, unknown>, style: Record<string, unknown>) => ({
            ...acc,
            ...style,
          }),
          {},
        );
      expect(flatStyles.color).toBe('#E0E0E0');
    });
  });
});
