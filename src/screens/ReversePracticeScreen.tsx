import React, {
  useState,
  useEffect,
  useCallback,
  useMemo,
  useRef,
} from 'react';
import {
  StyleSheet,
  Text,
  TextInput,
  View,
  KeyboardAvoidingView,
  Platform,
  Animated,
  type TextInput as TextInputType,
} from 'react-native';

import type { Meaning, Reading, AuxiliaryMeaning } from '../api/types';
import type { ReviewComponentKanji } from '../components/ReviewSession';
import { shuffleArray } from '../components/ReviewSession';
import {
  getReversePracticeItems,
  getReversePracticeItemCount,
  getSubjectsByIds,
  getUserSynonymsBySubjectId,
  type DatabaseAssignment,
  type DatabaseSubject,
} from '../storage';
import {
  getSubjectColor,
  COLORS,
  SPACING,
  FONT_SIZES,
  BORDER_RADIUS,
} from '../theme';
import {
  SubjectDisplay,
  CorrectFeedbackView,
  IncorrectFeedbackView,
  ProgressHeader,
  LoadingView,
  Button,
} from '../components';
import { ExpandableDetails } from '../components/ExpandableDetails';
import { ItemDetails } from '../components/ItemDetails';
import { QuestionTypeLabel } from '../components/QuestionTypeLabel';
import { useShakeAnimation } from '../hooks/useShakeAnimation';
import { useAutoFocus } from '../hooks/useAutoFocus';
import { useQuestionInput } from '../hooks/useQuestionInput';

export interface ReversePracticeItem {
  id: number;
  assignmentId: number;
  subjectType: 'vocabulary' | 'kana_vocabulary';
  srsStage: number;
  characters: string;
  meanings: Meaning[];
  readings: Reading[];
  meaningMnemonic: string;
  readingMnemonic: string | null;
  auxiliaryMeanings: AuxiliaryMeaning[];
  componentKanji?: ReviewComponentKanji[];
  userSynonyms: string[];
}

interface ReversePracticeQuestion {
  item: ReversePracticeItem;
  key: string;
}

interface ReverseIncorrectFeedback {
  question: ReversePracticeQuestion;
  userAnswer: string;
  correctAnswer: string;
  mnemonic: string;
}

const REVERSE_PRACTICE_BATCH_SIZE = 10;
const REFILL_THRESHOLD = 3;

function subjectToReversePracticeItem(
  subject: DatabaseSubject,
  assignment: DatabaseAssignment,
  componentKanjiMap: Map<number, ReviewComponentKanji>,
  synonymsMap: Map<number, string[]>,
): ReversePracticeItem {
  const meanings: Meaning[] = JSON.parse(subject.meanings);
  const readings: Reading[] = subject.readings
    ? JSON.parse(subject.readings)
    : [];

  const componentSubjectIds: number[] | undefined =
    subject.component_subject_ids
      ? JSON.parse(subject.component_subject_ids)
      : undefined;

  const componentKanji =
    (subject.object_type === 'vocabulary' ||
      subject.object_type === 'kana_vocabulary') &&
    componentSubjectIds
      ? componentSubjectIds
          .map(id => componentKanjiMap.get(id))
          .filter((k): k is ReviewComponentKanji => k !== undefined)
      : undefined;

  // Parse auxiliary_meanings from stored JSON
  const auxiliaryMeanings: AuxiliaryMeaning[] = subject.auxiliary_meanings
    ? JSON.parse(subject.auxiliary_meanings)
    : [];

  return {
    id: subject.id,
    assignmentId: assignment.id,
    subjectType: subject.object_type as 'vocabulary' | 'kana_vocabulary',
    srsStage: assignment.srs_stage,
    characters: subject.characters ?? '',
    meanings,
    readings,
    meaningMnemonic: subject.meaning_mnemonic,
    readingMnemonic: subject.reading_mnemonic,
    auxiliaryMeanings,
    componentKanji,
    userSynonyms: synonymsMap.get(subject.id) ?? [],
  };
}

async function loadReversePracticeItems(): Promise<ReversePracticeItem[]> {
  const assignments = await getReversePracticeItems(
    REVERSE_PRACTICE_BATCH_SIZE,
  );
  if (assignments.length === 0) return [];

  const subjectIds = assignments.map(a => a.subject_id);
  const subjects = await getSubjectsByIds(subjectIds);
  const subjectMap = new Map(subjects.map(s => [s.id, s]));

  const validAssignments = assignments.filter(a =>
    subjectMap.has(a.subject_id),
  );
  const validSubjects = validAssignments.map(
    a => subjectMap.get(a.subject_id)!,
  );

  // Collect kanji component IDs for vocabulary items
  const kanjiComponentIds = new Set<number>();

  for (const subject of validSubjects) {
    if (
      (subject.object_type === 'vocabulary' ||
        subject.object_type === 'kana_vocabulary') &&
      subject.component_subject_ids
    ) {
      const ids: number[] = JSON.parse(subject.component_subject_ids);
      ids.forEach(id => kanjiComponentIds.add(id));
    }
  }

  let componentKanji = new Map<number, ReviewComponentKanji>();

  if (kanjiComponentIds.size > 0) {
    const componentSubjects = await getSubjectsByIds(
      Array.from(kanjiComponentIds),
    );

    for (const subject of componentSubjects) {
      if (
        subject.object_type === 'kanji' &&
        kanjiComponentIds.has(subject.id)
      ) {
        const meanings: Meaning[] = JSON.parse(subject.meanings);
        const readings: Reading[] = subject.readings
          ? JSON.parse(subject.readings)
          : [];
        const primaryMeaning =
          meanings.find(m => m.primary)?.meaning ?? meanings[0]?.meaning ?? '';
        const primaryReading =
          readings.find(r => r.primary)?.reading ?? readings[0]?.reading ?? '';
        componentKanji.set(subject.id, {
          id: subject.id,
          characters: subject.characters ?? '?',
          meaning: primaryMeaning,
          reading: primaryReading,
        });
      }
    }
  }

  // Load user synonyms
  const synonymsMap = new Map<number, string[]>();
  for (const subject of validSubjects) {
    const synonyms = await getUserSynonymsBySubjectId(subject.id);
    if (synonyms.length > 0) {
      synonymsMap.set(
        subject.id,
        synonyms.map(s => s.synonym),
      );
    }
  }

  return validSubjects.map((subject, index) =>
    subjectToReversePracticeItem(
      subject,
      validAssignments[index],
      componentKanji,
      synonymsMap,
    ),
  );
}

function generateReverseQuestions(
  items: ReversePracticeItem[],
): ReversePracticeQuestion[] {
  const shuffledItems = shuffleArray(items);
  return shuffledItems.map(item => ({
    item,
    key: `${item.id}-reverse-${Date.now()}-${Math.random()}`,
  }));
}

function getPrimaryMeaning(meanings: Meaning[]): string {
  const primary = meanings.find(m => m.primary);
  return primary?.meaning ?? meanings[0]?.meaning ?? '';
}

export function ReversePracticeScreen() {
  const [phase, setPhase] = useState<'loading' | 'practicing' | 'empty'>(
    'loading',
  );
  const [questionQueue, setQuestionQueue] = useState<ReversePracticeQuestion[]>(
    [],
  );
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [showCorrectFeedback, setShowCorrectFeedback] = useState(false);
  const [incorrectFeedback, setIncorrectFeedback] =
    useState<ReverseIncorrectFeedback | null>(null);
  const isRefilling = useRef(false);
  const inputRef = useRef<TextInputType>(null);

  const { shakeStyle, triggerShake } = useShakeAnimation();
  const { inputValue, displayValue, handleTextChange, clearInput } =
    useQuestionInput('reverse');

  const practicePhrase = useMemo(() => {
    const phrases = [
      'Reverse your recall',
      'Meaning to writing',
      'Test your production',
      'Write what you know',
      'From English to Japanese',
      'Output practice',
      'Active recall training',
      'Production over recognition',
    ];
    return phrases[Math.floor(Math.random() * phrases.length)];
  }, []);

  // Initial load
  useEffect(() => {
    const init = async () => {
      const count = await getReversePracticeItemCount();
      if (count === 0) {
        setPhase('empty');
        return;
      }

      const loadedItems = await loadReversePracticeItems();
      if (loadedItems.length === 0) {
        setPhase('empty');
        return;
      }

      const questions = generateReverseQuestions(loadedItems);
      setQuestionQueue(questions);
      setPhase('practicing');
    };

    init();
  }, []);

  // Auto-focus input
  useAutoFocus(inputRef, [
    currentQuestionIndex,
    incorrectFeedback,
    showCorrectFeedback,
    phase,
  ]);

  // Refill queue when running low
  const maybeRefillQueue = useCallback(
    async (currentIndex: number, queue: ReversePracticeQuestion[]) => {
      const remaining = queue.length - currentIndex;
      if (remaining <= REFILL_THRESHOLD && !isRefilling.current) {
        isRefilling.current = true;
        try {
          const newItems = await loadReversePracticeItems();
          if (newItems.length > 0) {
            const newQuestions = generateReverseQuestions(newItems);
            setQuestionQueue(prev => [...prev, ...newQuestions]);
          }
        } finally {
          isRefilling.current = false;
        }
      }
    },
    [],
  );

  const currentQuestion = questionQueue[currentQuestionIndex];

  const advanceToNextQuestion = useCallback(() => {
    const nextIndex = currentQuestionIndex + 1;
    setCurrentQuestionIndex(nextIndex);
    clearInput();
    setIncorrectFeedback(null);
    setShowCorrectFeedback(false);
    maybeRefillQueue(nextIndex, questionQueue);
  }, [currentQuestionIndex, questionQueue, maybeRefillQueue, clearInput]);

  const handleContinue = useCallback(() => {
    advanceToNextQuestion();
  }, [advanceToNextQuestion]);

  // Check if input contains latin letters (romaji)
  const containsRomaji = (text: string): boolean => {
    return /[a-zA-Z]/.test(text);
  };

  const handleSubmit = useCallback(() => {
    if (!currentQuestion || showCorrectFeedback || incorrectFeedback) return;

    const { item } = currentQuestion;
    const answer = inputValue.trim();

    // Reject if input contains romaji
    if (containsRomaji(answer) || answer.length === 0) {
      triggerShake();
      return;
    }

    const correctAnswer = item.characters;

    // Exact match required
    const isCorrect = answer === correctAnswer;

    if (isCorrect) {
      setShowCorrectFeedback(true);
      setTimeout(() => {
        setShowCorrectFeedback(false);
        advanceToNextQuestion();
      }, 500);
    } else {
      setIncorrectFeedback({
        question: currentQuestion,
        userAnswer: answer,
        correctAnswer,
        mnemonic: item.meaningMnemonic,
      });
    }
  }, [
    currentQuestion,
    inputValue,
    showCorrectFeedback,
    incorrectFeedback,
    advanceToNextQuestion,
    triggerShake,
  ]);

  // Empty state
  if (phase === 'empty') {
    return (
      <View
        style={styles.centerContainer}
        testID="reverse-practice-screen-empty"
      >
        <Text style={styles.emptyTitle}>No Vocabulary Items</Text>
        <Text style={styles.emptyMessage}>
          Vocabulary items become available for reverse practice once they reach
          Guru level or above. Keep doing your reviews!
        </Text>
      </View>
    );
  }

  // Loading state
  if (phase === 'loading' || !currentQuestion) {
    return (
      <LoadingView
        message="Loading vocabulary items..."
        testID="reverse-practice-screen-loading"
      />
    );
  }

  // Incorrect feedback view
  if (incorrectFeedback) {
    return (
      <View
        style={styles.container}
        testID="reverse-practice-incorrect-feedback"
      >
        <ProgressHeader
          mode="practice"
          phrase={practicePhrase}
          icon="swap-horizontal"
        />

        <IncorrectFeedbackView
          subjectType={incorrectFeedback.question.item.subjectType}
          displayText={getPrimaryMeaning(
            incorrectFeedback.question.item.meanings,
          )}
          displayMode="meaning"
          userAnswer={incorrectFeedback.userAnswer}
          correctAnswer={incorrectFeedback.correctAnswer}
          mnemonic={incorrectFeedback.mnemonic}
          mnemonicLabel="Meaning Mnemonic:"
          onContinue={handleContinue}
          detailsContent={
            <ExpandableDetails
              resetKey={incorrectFeedback.question.key}
              testID="reverse-practice-expandable-details"
            >
              <ItemDetails
                subjectType={incorrectFeedback.question.item.subjectType}
                meanings={incorrectFeedback.question.item.meanings}
                readings={incorrectFeedback.question.item.readings}
                meaningMnemonic={
                  incorrectFeedback.question.item.meaningMnemonic
                }
                readingMnemonic={
                  incorrectFeedback.question.item.readingMnemonic
                }
                componentKanji={
                  incorrectFeedback.question.item.componentKanji
                }
                hideMnemonicType="meaning"
                testID="reverse-practice-item-details"
              />
            </ExpandableDetails>
          }
          testID="reverse-practice"
        />
      </View>
    );
  }

  // Active question view
  const { item } = currentQuestion;
  const backgroundColor = getSubjectColor(item.subjectType);
  const primaryMeaning = getPrimaryMeaning(item.meanings);

  // Correct feedback overlay
  if (showCorrectFeedback) {
    return (
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        testID="reverse-practice-session"
      >
        <ProgressHeader
          mode="practice"
          phrase={practicePhrase}
          icon="swap-horizontal"
        />

        <CorrectFeedbackView
          subjectType={item.subjectType}
          displayText={primaryMeaning}
          displayMode="meaning"
          feedbackState="correct"
          questionType="kanji"
          inputValue={displayValue}
          testID="reverse-practice-correct-feedback"
        />
      </KeyboardAvoidingView>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      testID="reverse-practice-session"
    >
      <ProgressHeader
        mode="practice"
        phrase={practicePhrase}
        icon="swap-horizontal"
      />

      <SubjectDisplay
        subjectType={item.subjectType}
        displayMode="meaning"
        displayText={primaryMeaning}
        testID="reverse-practice-subject-display"
      />

      <QuestionTypeLabel
        type="kanji"
        testID="reverse-practice-question-type"
      />

      <Animated.View
        style={[styles.inputContainer, shakeStyle]}
        testID="reverse-practice-input-container"
      >
        <TextInput
          ref={inputRef}
          style={[styles.input, { borderColor: backgroundColor }]}
          value={displayValue}
          onChangeText={handleTextChange}
          onSubmitEditing={handleSubmit}
          placeholder="Enter Japanese..."
          placeholderTextColor="#999"
          autoCapitalize="none"
          autoCorrect={false}
          spellCheck={false}
          autoComplete="off"
          returnKeyType="done"
          blurOnSubmit={false}
          caretHidden={true}
          testID="reverse-practice-input"
        />
      </Animated.View>

      <View style={styles.spacer} />

      <View style={styles.buttonRow}>
        <Button
          label="Submit"
          onPress={handleSubmit}
          disabled={showCorrectFeedback}
          style={[styles.submitButtonFlex, { backgroundColor }]}
          testID="reverse-practice-submit"
        />
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background.primary,
  },
  centerContainer: {
    flex: 1,
    backgroundColor: COLORS.background.primary,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: SPACING.xxxl,
  },
  emptyTitle: {
    fontSize: FONT_SIZES.xxl,
    fontWeight: 'bold',
    color: COLORS.text.primary,
    marginBottom: SPACING.lg,
  },
  emptyMessage: {
    fontSize: FONT_SIZES.base,
    color: COLORS.text.secondary,
    textAlign: 'center',
    lineHeight: FONT_SIZES.xxl,
  },
  inputContainer: {
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.md,
    paddingBottom: SPACING.sm,
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
  spacer: {
    flex: 1,
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
