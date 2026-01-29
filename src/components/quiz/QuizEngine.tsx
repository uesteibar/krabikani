import React, {
  useState,
  useCallback,
  useMemo,
  useEffect,
  useRef,
} from 'react';
import {
  StyleSheet,
  TextInput,
  View,
  KeyboardAvoidingView,
  Platform,
  Animated,
  type TextInput as TextInputType,
} from 'react-native';

import {
  getSubjectColor,
  COLORS,
  BORDER_RADIUS,
  SPACING,
  FONT_SIZES,
} from '../../theme';
import { SubjectDisplay } from '../SubjectDisplay';
import { QuestionTypeLabel, type QuestionTypeLabelType } from '../QuestionTypeLabel';
import { IncorrectFeedbackView } from '../IncorrectFeedbackView';
import { CorrectFeedbackView } from '../CorrectFeedbackView';
import { ProgressHeader } from '../ProgressHeader';
import { LoadingView } from '../LoadingView';
import { Button } from '../Button';
import { useShakeAnimation } from '../../hooks/useShakeAnimation';
import { useAutoFocus } from '../../hooks/useAutoFocus';
import { useQuestionInput } from '../../hooks/useQuestionInput';
import { validateInput, validateAnswer } from './answerValidation';
import type {
  Question,
  QuizEngineConfig,
  AnswerResult,
} from './types';

interface IncorrectFeedbackState {
  question: Question;
  userAnswer: string;
  correctAnswer: string;
}

export interface QuizEngineProps {
  config: QuizEngineConfig;
}

export function QuizEngine({ config }: QuizEngineProps) {
  const {
    questions: initialQuestions,
    questionLabelType,
    progressMode,
    completionMode,
    allowMarkCorrect,
    allowAddSynonym,
    requeueIncorrect,
    showSrsBadge,
    showSubjectTypeLabel,
    autoRefill,
    onAnswer,
    onComplete,
    renderCompletion,
    renderDetailsContent,
    getSrsBadge,
    onMarkCorrect,
    onAddSynonym,
    renderExtraButtons,
    autoAdvanceDelay = 500,
    testID = 'quiz-engine',
  } = config;

  // Question queue state
  const [questionQueue, setQuestionQueue] = useState<Question[]>(initialQuestions);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);

  // Track completed question IDs (for allQuestions completion mode)
  const [completedQuestionIds, setCompletedQuestionIds] = useState<Set<string>>(new Set());
  const originalQuestionCount = useMemo(() => initialQuestions.length, [initialQuestions]);

  // Feedback state
  const [showCorrectFeedback, setShowCorrectFeedback] = useState(false);
  const [isFuzzyMatch, setIsFuzzyMatch] = useState(false);
  const [incorrectFeedback, setIncorrectFeedback] = useState<IncorrectFeedbackState | null>(null);

  // Synonym state
  const [synonymAddState, setSynonymAddState] = useState<null | 'adding' | 'added'>(null);

  // Auto-refill guard
  const isRefilling = useRef(false);

  // Input ref
  const inputRef = useRef<TextInputType>(null);

  // Shared hooks
  const { shakeStyle, triggerShake } = useShakeAnimation();

  const currentQuestion = questionQueue[currentQuestionIndex];

  // Determine input type for useQuestionInput
  const inputType = currentQuestion?.questionType === 'reading'
    ? 'reading'
    : currentQuestion?.questionType === 'reverse'
      ? 'reverse'
      : 'meaning';

  const { inputValue, displayValue, handleTextChange, clearInput } =
    useQuestionInput(inputType);

  // Auto-focus on question change
  useAutoFocus(inputRef, [
    currentQuestionIndex,
    incorrectFeedback,
    showCorrectFeedback,
  ]);

  // Completion detection
  const isComplete = useMemo(() => {
    if (completionMode === 'never') return false;
    if (originalQuestionCount === 0) return false;
    return completedQuestionIds.size >= originalQuestionCount;
  }, [completionMode, completedQuestionIds.size, originalQuestionCount]);

  // Reset state when initial questions change
  useEffect(() => {
    setQuestionQueue(initialQuestions);
    setCurrentQuestionIndex(0);
    clearInput();
    setCompletedQuestionIds(new Set());
    setShowCorrectFeedback(false);
    setIsFuzzyMatch(false);
    setIncorrectFeedback(null);
    setSynonymAddState(null);
  }, [initialQuestions, clearInput]);

  // Auto-refill logic
  const maybeRefillQueue = useCallback(
    async (currentIndex: number, queue: Question[]) => {
      if (!autoRefill) return;
      const remaining = queue.length - currentIndex;
      if (remaining <= autoRefill.threshold && !isRefilling.current) {
        isRefilling.current = true;
        try {
          const newQuestions = await autoRefill.loadMore();
          if (newQuestions.length > 0) {
            setQuestionQueue(prev => [...prev, ...newQuestions]);
          }
        } finally {
          isRefilling.current = false;
        }
      }
    },
    [autoRefill],
  );

  // Advance to next question
  const advanceToNextQuestion = useCallback(() => {
    const nextIndex = currentQuestionIndex + 1;
    setCurrentQuestionIndex(nextIndex);
    clearInput();
    setIncorrectFeedback(null);
    setShowCorrectFeedback(false);
    setIsFuzzyMatch(false);
    setSynonymAddState(null);
    maybeRefillQueue(nextIndex, questionQueue);
  }, [currentQuestionIndex, questionQueue, maybeRefillQueue, clearInput]);

  // Handle continue after incorrect feedback
  const handleContinue = useCallback(() => {
    advanceToNextQuestion();
  }, [advanceToNextQuestion]);

  // Handle mark as correct
  const handleMarkAsCorrect = useCallback(() => {
    if (!incorrectFeedback) return;

    const question = incorrectFeedback.question;

    // Mark question as completed
    setCompletedQuestionIds(prev => new Set(prev).add(question.id));

    // Remove re-queued duplicate
    if (requeueIncorrect) {
      setQuestionQueue(prev => {
        const newQueue = [...prev];
        for (let i = newQueue.length - 1; i >= 0; i--) {
          if (newQueue[i].id === question.id && i > currentQuestionIndex) {
            newQueue.splice(i, 1);
            break;
          }
        }
        return newQueue;
      });
    }

    // Notify parent
    onMarkCorrect?.(question, incorrectFeedback.userAnswer);

    // Check completion
    const newCompletedCount = completedQuestionIds.size + 1;
    if (
      completionMode === 'allQuestions' &&
      newCompletedCount >= originalQuestionCount
    ) {
      onComplete?.();
    }

    advanceToNextQuestion();
  }, [
    incorrectFeedback,
    requeueIncorrect,
    currentQuestionIndex,
    onMarkCorrect,
    completedQuestionIds.size,
    completionMode,
    originalQuestionCount,
    onComplete,
    advanceToNextQuestion,
  ]);

  // Handle add as synonym
  const handleAddAsSynonym = useCallback(async () => {
    if (!incorrectFeedback || synonymAddState !== null) return;
    if (incorrectFeedback.question.questionType !== 'meaning') return;

    setSynonymAddState('adding');

    try {
      await onAddSynonym?.(incorrectFeedback.question, incorrectFeedback.userAnswer);
      setSynonymAddState('added');

      setTimeout(() => {
        handleMarkAsCorrect();
      }, 400);
    } catch {
      setSynonymAddState(null);
    }
  }, [incorrectFeedback, synonymAddState, onAddSynonym, handleMarkAsCorrect]);

  // Handle answer submission
  const handleSubmit = useCallback(() => {
    if (!currentQuestion || showCorrectFeedback || incorrectFeedback) return;

    // Pre-submission validation
    const inputValidation = validateInput(currentQuestion, inputValue);
    if (!inputValidation.valid) {
      triggerShake();
      return;
    }

    // Validate answer
    const result: AnswerResult = validateAnswer(currentQuestion, inputValue);

    // Notify parent
    onAnswer?.({ question: currentQuestion, result });

    if (result.status === 'correct' || result.status === 'fuzzyMatch') {
      // Mark completed
      setCompletedQuestionIds(prev => new Set(prev).add(currentQuestion.id));

      // Show brief correct feedback
      setShowCorrectFeedback(true);
      setIsFuzzyMatch(result.status === 'fuzzyMatch');

      setTimeout(() => {
        setShowCorrectFeedback(false);
        setIsFuzzyMatch(false);

        // Check completion
        const newCompletedCount = completedQuestionIds.size + 1;
        const sessionComplete =
          completionMode === 'allQuestions' &&
          newCompletedCount >= originalQuestionCount;

        if (sessionComplete) {
          onComplete?.();
        }

        if (!sessionComplete) {
          advanceToNextQuestion();
        }
      }, autoAdvanceDelay);
    } else {
      // Incorrect — show feedback
      if (requeueIncorrect) {
        setQuestionQueue(prev => [...prev, currentQuestion]);
      }

      setIncorrectFeedback({
        question: currentQuestion,
        userAnswer: result.userAnswer,
        correctAnswer: result.correctAnswer,
      });
    }
  }, [
    currentQuestion,
    inputValue,
    showCorrectFeedback,
    incorrectFeedback,
    onAnswer,
    completedQuestionIds.size,
    completionMode,
    originalQuestionCount,
    onComplete,
    requeueIncorrect,
    advanceToNextQuestion,
    autoAdvanceDelay,
    triggerShake,
  ]);

  // Render ProgressHeader
  const renderProgressHeader = () => {
    if (progressMode.mode === 'none') return null;
    if (progressMode.mode === 'progress') {
      return (
        <ProgressHeader
          mode="progress"
          current={progressMode.current}
          total={progressMode.total}
          wrapUpRemaining={progressMode.wrapUpRemaining}
        />
      );
    }
    if (progressMode.mode === 'zen') {
      return <ProgressHeader mode="zen" />;
    }
    return (
      <ProgressHeader
        mode="practice"
        phrase={progressMode.phrase}
        icon={progressMode.icon}
      />
    );
  };

  // Get question label type
  const getQuestionLabelType = (question: Question): QuestionTypeLabelType => {
    if (questionLabelType) return questionLabelType(question);
    if (question.questionType === 'reverse') return 'kanji';
    return question.questionType;
  };

  // Empty state
  if (initialQuestions.length === 0) {
    return <LoadingView testID={`${testID}-empty`} />;
  }

  // Completion state
  if (isComplete) {
    if (renderCompletion) {
      return (
        <View testID={`${testID}-complete`}>
          {renderCompletion()}
        </View>
      );
    }
    return <LoadingView testID={`${testID}-complete`} />;
  }

  // No current question (queue exhausted without completion)
  if (!currentQuestion) {
    return <LoadingView testID={`${testID}-empty`} />;
  }

  const backgroundColor = getSubjectColor(currentQuestion.subjectType);
  const labelType = getQuestionLabelType(currentQuestion);

  // Build SRS badge
  const srsBadge = showSrsBadge && getSrsBadge
    ? getSrsBadge(currentQuestion)
    : undefined;

  // Determine placeholder text
  const placeholder = currentQuestion.questionType === 'reverse'
    ? 'Enter Japanese...'
    : currentQuestion.questionType === 'reading'
      ? 'Type reading (romaji)...'
      : 'Enter meaning...';

  // Input display value
  const inputDisplayText = currentQuestion.questionType === 'reading'
    ? displayValue
    : currentQuestion.questionType === 'reverse'
      ? displayValue
      : inputValue;

  // Incorrect feedback view
  if (incorrectFeedback) {
    const feedbackQuestion = incorrectFeedback.question;
    const feedbackSrsBadge = showSrsBadge && getSrsBadge
      ? getSrsBadge(feedbackQuestion)
      : undefined;

    return (
      <View style={styles.container} testID={`${testID}-incorrect-feedback`}>
        {renderProgressHeader()}

        <IncorrectFeedbackView
          subjectType={feedbackQuestion.subjectType}
          displayText={feedbackQuestion.displayText}
          displayMode={feedbackQuestion.displayMode}
          userAnswer={incorrectFeedback.userAnswer}
          correctAnswer={incorrectFeedback.correctAnswer}
          mnemonic={feedbackQuestion.mnemonic}
          mnemonicLabel={feedbackQuestion.mnemonicLabel}
          onContinue={handleContinue}
          onMarkCorrect={allowMarkCorrect && onMarkCorrect ? handleMarkAsCorrect : undefined}
          onAddSynonym={
            allowAddSynonym && onAddSynonym && feedbackQuestion.questionType === 'meaning'
              ? handleAddAsSynonym
              : undefined
          }
          synonymAddState={synonymAddState}
          srsBadge={feedbackSrsBadge}
          detailsContent={
            renderDetailsContent ? (
              <View testID={`${testID}-details-content`}>
                {renderDetailsContent(feedbackQuestion)}
              </View>
            ) : undefined
          }
          testID={testID}
        />
      </View>
    );
  }

  // Correct feedback view
  if (showCorrectFeedback) {
    return (
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        testID={testID}
      >
        {renderProgressHeader()}

        <CorrectFeedbackView
          subjectType={currentQuestion.subjectType}
          displayText={currentQuestion.displayText}
          displayMode={currentQuestion.displayMode}
          feedbackState={isFuzzyMatch ? 'fuzzyMatch' : 'correct'}
          srsBadge={srsBadge}
          questionType={labelType}
          inputValue={inputDisplayText}
        />

        <View style={styles.spacer} />

        <View style={styles.buttonRow} testID={`${testID}-button-row`}>
          <Button
            label="Submit"
            onPress={handleSubmit}
            disabled={true}
            style={[styles.submitButtonFlex, { backgroundColor }]}
            testID={`${testID}-submit`}
          />
          {renderExtraButtons?.()}
        </View>
      </KeyboardAvoidingView>
    );
  }

  // Active question view
  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      testID={testID}
    >
      {renderProgressHeader()}

      <SubjectDisplay
        subjectType={currentQuestion.subjectType}
        displayMode={currentQuestion.displayMode}
        displayText={currentQuestion.displayText}
        srsBadge={srsBadge}
        subjectTypeLabel={showSubjectTypeLabel ? currentQuestion.subjectType.replace('_', ' ') : undefined}
        testID={`${testID}-subject-display`}
      />

      <QuestionTypeLabel
        type={labelType}
        testID={`${testID}-question-type`}
      />

      <Animated.View
        style={[styles.inputContainer, shakeStyle]}
        testID={`${testID}-input-container`}
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
          keyboardType={currentQuestion.questionType === 'reading' ? 'ascii-capable' : 'default'}
          returnKeyType="done"
          blurOnSubmit={false}
          caretHidden={true}
          testID={`${testID}-input`}
        />
      </Animated.View>

      <View style={styles.spacer} />

      <View style={styles.buttonRow} testID={`${testID}-button-row`}>
        <Button
          label="Submit"
          onPress={handleSubmit}
          disabled={showCorrectFeedback}
          style={[styles.submitButtonFlex, { backgroundColor }]}
          testID={`${testID}-submit`}
        />
        {renderExtraButtons?.()}
      </View>
    </KeyboardAvoidingView>
  );
}

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
  buttonRow: {
    flexDirection: 'row',
    paddingHorizontal: SPACING.lg,
    paddingBottom: SPACING.lg,
    gap: SPACING.md,
  },
  submitButtonFlex: {
    flex: 1,
  },
});
