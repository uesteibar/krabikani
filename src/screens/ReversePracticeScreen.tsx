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
  TouchableOpacity,
  ScrollView,
  type TextInput as TextInputType,
} from 'react-native';

import type { Meaning, Reading, AuxiliaryMeaning } from '../api/types';
import type { ReviewComponentKanji } from '../components/ReviewSession';
import { shuffleArray } from '../components/ReviewSession';
import { MnemonicText } from '../components/MnemonicText';
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
  SHADOW,
  BORDER_RADIUS,
  SPACING,
  FONT_SIZES,
  MIN_TOUCH_TARGET,
  TEXT_STYLES,
} from '../theme';
import { MaterialDesignIcons } from '@react-native-vector-icons/material-design-icons';

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
  const assignments = await getReversePracticeItems(REVERSE_PRACTICE_BATCH_SIZE);
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
  const [inputValue, setInputValue] = useState('');
  const [showCorrectFeedback, setShowCorrectFeedback] = useState(false);
  const [incorrectFeedback, setIncorrectFeedback] =
    useState<ReverseIncorrectFeedback | null>(null);
  const isRefilling = useRef(false);
  const inputRef = useRef<TextInputType>(null);

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
  useEffect(() => {
    if (!incorrectFeedback && phase === 'practicing') {
      const timer = setTimeout(() => {
        inputRef.current?.focus();
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [currentQuestionIndex, incorrectFeedback, showCorrectFeedback, phase]);

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

  const handleInputChange = useCallback((text: string) => {
    setInputValue(text);
  }, []);

  const advanceToNextQuestion = useCallback(() => {
    const nextIndex = currentQuestionIndex + 1;
    setCurrentQuestionIndex(nextIndex);
    setInputValue('');
    setIncorrectFeedback(null);
    setShowCorrectFeedback(false);
    maybeRefillQueue(nextIndex, questionQueue);
  }, [currentQuestionIndex, questionQueue, maybeRefillQueue]);

  const handleContinue = useCallback(() => {
    advanceToNextQuestion();
  }, [advanceToNextQuestion]);

  const handleSubmit = useCallback(() => {
    if (!currentQuestion || showCorrectFeedback || incorrectFeedback) return;

    const { item } = currentQuestion;
    const answer = inputValue.trim();
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
      <View
        style={styles.centerContainer}
        testID="reverse-practice-screen-loading"
      >
        <Text style={styles.loadingText}>Loading vocabulary items...</Text>
      </View>
    );
  }

  // Incorrect feedback view
  if (incorrectFeedback) {
    return (
      <View style={styles.container} testID="reverse-practice-incorrect-feedback">
        <View style={styles.modeBanner} testID="reverse-practice-banner">
          <MaterialDesignIcons
            name="swap-horizontal"
            size={FONT_SIZES.base}
            color={COLORS.text.tertiary}
          />
          <Text style={styles.modeBannerText}>{practicePhrase}</Text>
        </View>

        <View
          style={[styles.characterContainer, styles.incorrectHeader]}
          testID="reverse-practice-character-container"
        >
          <Text
            style={styles.characters}
            testID="reverse-practice-characters"
          >
            {incorrectFeedback.question.item.characters}
          </Text>
          <Text
            style={styles.incorrectLabel}
            testID="reverse-practice-incorrect-label"
          >
            Incorrect
          </Text>
        </View>

        <ScrollView
          style={styles.feedbackContainer}
          contentContainerStyle={styles.feedbackContent}
        >
          <View style={styles.feedbackSection}>
            <Text
              style={styles.feedbackLabel}
              testID="reverse-practice-your-answer-label"
            >
              Your Answer:
            </Text>
            <Text
              style={styles.userAnswer}
              testID="reverse-practice-your-answer"
            >
              {incorrectFeedback.userAnswer || '(empty)'}
            </Text>
          </View>

          <View style={styles.feedbackSection}>
            <Text
              style={styles.feedbackLabel}
              testID="reverse-practice-correct-answer-label"
            >
              Correct Answer:
            </Text>
            <Text
              style={[styles.correctAnswerText, TEXT_STYLES.japaneseDisplay]}
              testID="reverse-practice-correct-answer"
            >
              {incorrectFeedback.correctAnswer}
            </Text>
          </View>

          <View style={styles.feedbackSection}>
            <Text
              style={styles.feedbackLabel}
              testID="reverse-practice-mnemonic-label"
            >
              Meaning Mnemonic:
            </Text>
            <MnemonicText
              text={incorrectFeedback.mnemonic}
              style={styles.mnemonicText}
              testID="reverse-practice-mnemonic"
            />
          </View>
        </ScrollView>

        <View style={styles.buttonRow}>
          <TouchableOpacity
            style={[
              styles.submitButton,
              styles.continueButton,
              styles.submitButtonFlex,
            ]}
            onPress={handleContinue}
            activeOpacity={0.8}
            testID="reverse-practice-continue"
          >
            <Text style={styles.submitButtonText}>Continue</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  // Active question view
  const { item } = currentQuestion;
  const backgroundColor = getSubjectColor(item.subjectType);
  const primaryMeaning = getPrimaryMeaning(item.meanings);

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      testID="reverse-practice-session"
    >
      <View style={styles.modeBanner} testID="reverse-practice-banner">
        <MaterialDesignIcons
          name="swap-horizontal"
          size={FONT_SIZES.base}
          color={COLORS.text.tertiary}
        />
        <Text style={styles.modeBannerText}>{practicePhrase}</Text>
      </View>

      <View
        style={[
          styles.meaningContainer,
          showCorrectFeedback ? styles.correctHeader : { backgroundColor },
        ]}
        testID="reverse-practice-meaning-container"
      >
        <Text style={styles.meaningText} testID="reverse-practice-meaning">
          {primaryMeaning}
        </Text>
        {showCorrectFeedback && (
          <Text style={styles.correctLabel} testID="reverse-practice-correct-label">
            Correct!
          </Text>
        )}
      </View>

      <View style={styles.questionContainer}>
        <Text style={styles.questionType} testID="reverse-practice-question-type">
          WRITE THE JAPANESE
        </Text>
      </View>

      <View style={styles.inputContainer} testID="reverse-practice-input-container">
        <TextInput
          ref={inputRef}
          style={[styles.input, { borderColor: backgroundColor }]}
          value={inputValue}
          onChangeText={handleInputChange}
          onSubmitEditing={handleSubmit}
          placeholder="Enter Japanese..."
          placeholderTextColor="#999"
          autoCapitalize="none"
          autoCorrect={false}
          spellCheck={false}
          autoComplete="off"
          returnKeyType="done"
          blurOnSubmit={false}
          testID="reverse-practice-input"
        />
      </View>

      <View style={styles.spacer} />

      <View style={styles.buttonRow}>
        <TouchableOpacity
          style={[
            styles.submitButton,
            styles.submitButtonFlex,
            { backgroundColor },
          ]}
          onPress={handleSubmit}
          disabled={showCorrectFeedback}
          activeOpacity={0.8}
          testID="reverse-practice-submit"
        >
          <Text style={styles.submitButtonText}>Submit</Text>
        </TouchableOpacity>
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
  loadingText: {
    fontSize: FONT_SIZES.base,
    color: COLORS.text.secondary,
    marginTop: SPACING.lg,
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
  modeBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.sm,
    paddingTop: SPACING.md,
    paddingBottom: SPACING.sm,
    minHeight: 50,
    backgroundColor: COLORS.background.secondary,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border.light,
  },
  modeBannerText: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.text.secondary,
    fontWeight: '600',
    fontStyle: 'italic',
  },
  meaningContainer: {
    paddingVertical: 64,
    paddingHorizontal: SPACING.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  characterContainer: {
    paddingVertical: 64,
    paddingHorizontal: SPACING.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  meaningText: {
    fontSize: FONT_SIZES.display,
    fontWeight: 'bold',
    color: COLORS.text.inverse,
    textAlign: 'center',
  },
  characters: {
    fontSize: FONT_SIZES.display,
    ...TEXT_STYLES.japaneseDisplay,
    color: COLORS.text.inverse,
    textAlign: 'center',
  },
  correctHeader: {
    backgroundColor: COLORS.feedback.correct,
  },
  correctLabel: {
    position: 'absolute',
    bottom: SPACING.md,
    fontSize: FONT_SIZES.sm,
    fontWeight: 'bold',
    color: COLORS.text.inverse,
  },
  incorrectHeader: {
    backgroundColor: COLORS.feedback.incorrect,
  },
  incorrectLabel: {
    fontSize: FONT_SIZES.lg,
    fontWeight: 'bold',
    color: COLORS.text.inverse,
    marginTop: SPACING.sm,
  },
  questionContainer: {
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.lg,
    alignItems: 'center',
    backgroundColor: COLORS.neutral.white,
  },
  questionType: {
    fontSize: FONT_SIZES.sm,
    fontWeight: '700',
    color: COLORS.text.tertiary,
    letterSpacing: 2,
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
  submitButton: {
    margin: SPACING.lg,
    paddingVertical: SPACING.lg,
    minHeight: MIN_TOUCH_TARGET,
    borderRadius: BORDER_RADIUS.md,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: SHADOW.color,
    shadowOffset: SHADOW.offset,
    shadowOpacity: SHADOW.opacity,
    shadowRadius: SHADOW.radius,
    elevation: SHADOW.elevation,
  },
  submitButtonFlex: {
    flex: 1,
    margin: 0,
  },
  submitButtonText: {
    fontSize: FONT_SIZES.lg,
    fontWeight: 'bold',
    color: COLORS.text.inverse,
  },
  continueButton: {
    backgroundColor: COLORS.neutral.gray600,
  },
  feedbackContainer: {
    flex: 1,
  },
  feedbackContent: {
    padding: SPACING.lg,
  },
  feedbackSection: {
    marginBottom: SPACING.xl,
  },
  feedbackLabel: {
    fontSize: FONT_SIZES.sm,
    fontWeight: '600',
    color: COLORS.text.secondary,
    marginBottom: SPACING.xs,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  userAnswer: {
    fontSize: FONT_SIZES.xl,
    color: COLORS.feedback.incorrect,
    fontWeight: '500',
  },
  correctAnswerText: {
    fontSize: FONT_SIZES.xxl,
    color: COLORS.feedback.correct,
    fontWeight: 'bold',
  },
  mnemonicText: {
    fontSize: FONT_SIZES.base,
    color: COLORS.text.primary,
    lineHeight: FONT_SIZES.xxl,
  },
});
