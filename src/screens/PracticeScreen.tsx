import React, {
  useState,
  useEffect,
  useCallback,
  useRef,
  useMemo,
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
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import type { RootStackParamList } from '../navigation/types';
import type {
  Meaning,
  Reading,
  KanjiReading,
  AuxiliaryMeaning,
} from '../api/types';
import type {
  ReviewItem,
  ReviewComponentRadical,
  ReviewComponentKanji,
} from '../components/ReviewSession';
import {
  getPracticeItems,
  getPracticeItemCount,
  getSubjectsByIds,
  getUserSynonymsBySubjectId,
  type DatabaseAssignment,
  type DatabaseSubject,
} from '../storage';
import {
  romajiToHiragana,
  isValidReadingInput,
} from '../utils/romajiToHiragana';
import {
  validateMeaningAnswer,
  validateReadingAnswer,
} from '../utils/answerValidation';
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
import { shuffleArray } from '../components/ReviewSession';
import { useShakeAnimation } from '../hooks/useShakeAnimation';
import { useAutoFocus } from '../hooks/useAutoFocus';
import { useQuestionInput } from '../hooks/useQuestionInput';
import { QuestionTypeLabel } from '../components/QuestionTypeLabel';

type PracticeScreenNavigationProp = NativeStackNavigationProp<
  RootStackParamList,
  'Practice'
>;

interface PracticeQuestion {
  item: ReviewItem;
  type: 'meaning' | 'reading';
  key: string;
}

interface PracticeIncorrectFeedback {
  question: PracticeQuestion;
  userAnswer: string;
  correctAnswer: string;
  mnemonic: string;
}

const PRACTICE_BATCH_SIZE = 10;
const REFILL_THRESHOLD = 3;

function subjectToReviewItem(
  subject: DatabaseSubject,
  assignment: DatabaseAssignment,
  componentRadicalsMap: Map<number, ReviewComponentRadical>,
  componentKanjiMap: Map<number, ReviewComponentKanji>,
  synonymsMap: Map<number, string[]>,
): ReviewItem {
  const meanings: Meaning[] = JSON.parse(subject.meanings);
  const readings: Reading[] | KanjiReading[] | null = subject.readings
    ? JSON.parse(subject.readings)
    : null;

  const componentSubjectIds: number[] | undefined =
    subject.component_subject_ids
      ? JSON.parse(subject.component_subject_ids)
      : undefined;

  const componentRadicals =
    subject.object_type === 'kanji' && componentSubjectIds
      ? componentSubjectIds
          .map(id => componentRadicalsMap.get(id))
          .filter((r): r is ReviewComponentRadical => r !== undefined)
      : undefined;

  const componentKanji =
    (subject.object_type === 'vocabulary' ||
      subject.object_type === 'kana_vocabulary') &&
    componentSubjectIds
      ? componentSubjectIds
          .map(id => componentKanjiMap.get(id))
          .filter((k): k is ReviewComponentKanji => k !== undefined)
      : undefined;

  const auxiliaryMeanings: AuxiliaryMeaning[] = subject.auxiliary_meanings
    ? JSON.parse(subject.auxiliary_meanings)
    : [];

  return {
    id: subject.id,
    assignmentId: assignment.id,
    subjectType: subject.object_type as ReviewItem['subjectType'],
    srsStage: assignment.srs_stage,
    characters: subject.characters,
    meanings,
    readings,
    meaningMnemonic: subject.meaning_mnemonic,
    readingMnemonic: subject.reading_mnemonic,
    auxiliaryMeanings,
    componentRadicals,
    componentKanji,
    userSynonyms: synonymsMap.get(subject.id) ?? [],
  };
}

function generatePracticeQuestions(items: ReviewItem[]): PracticeQuestion[] {
  const shuffledItems = shuffleArray(items);
  const questions: PracticeQuestion[] = [];

  for (const item of shuffledItems) {
    const meaningFirst = Math.random() < 0.5;

    if (item.subjectType === 'radical') {
      questions.push({
        item,
        type: 'meaning',
        key: `${item.id}-meaning-${Date.now()}-${Math.random()}`,
      });
    } else if (meaningFirst) {
      questions.push({
        item,
        type: 'meaning',
        key: `${item.id}-meaning-${Date.now()}-${Math.random()}`,
      });
      questions.push({
        item,
        type: 'reading',
        key: `${item.id}-reading-${Date.now()}-${Math.random()}`,
      });
    } else {
      questions.push({
        item,
        type: 'reading',
        key: `${item.id}-reading-${Date.now()}-${Math.random()}`,
      });
      questions.push({
        item,
        type: 'meaning',
        key: `${item.id}-meaning-${Date.now()}-${Math.random()}`,
      });
    }
  }

  return shuffleArray(questions);
}

function getAcceptedMeaningsDisplay(meanings: Meaning[]): string {
  const accepted = meanings.filter(m => m.accepted_answer);
  return accepted.map(m => m.meaning).join(', ');
}

function getAcceptedReadingsDisplay(
  readings: Reading[] | KanjiReading[] | null,
): string {
  if (!readings) return '';
  const accepted = readings.filter(r => r.accepted_answer);
  return accepted.map(r => r.reading).join(', ');
}

async function loadPracticeItems(): Promise<ReviewItem[]> {
  const assignments = await getPracticeItems(PRACTICE_BATCH_SIZE);
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

  const radicalComponentIds = new Set<number>();
  const kanjiComponentIds = new Set<number>();

  for (const subject of validSubjects) {
    if (subject.object_type === 'kanji' && subject.component_subject_ids) {
      const ids: number[] = JSON.parse(subject.component_subject_ids);
      ids.forEach(id => radicalComponentIds.add(id));
    }
    if (
      (subject.object_type === 'vocabulary' ||
        subject.object_type === 'kana_vocabulary') &&
      subject.component_subject_ids
    ) {
      const ids: number[] = JSON.parse(subject.component_subject_ids);
      ids.forEach(id => kanjiComponentIds.add(id));
    }
  }

  const allComponentIds = new Set([
    ...radicalComponentIds,
    ...kanjiComponentIds,
  ]);

  let componentRadicals = new Map<number, ReviewComponentRadical>();
  let componentKanji = new Map<number, ReviewComponentKanji>();

  if (allComponentIds.size > 0) {
    const componentSubjects = await getSubjectsByIds(
      Array.from(allComponentIds),
    );

    for (const subject of componentSubjects) {
      if (
        subject.object_type === 'radical' &&
        radicalComponentIds.has(subject.id)
      ) {
        const meanings: Meaning[] = JSON.parse(subject.meanings);
        const primaryMeaning =
          meanings.find(m => m.primary)?.meaning ?? meanings[0]?.meaning ?? '';
        componentRadicals.set(subject.id, {
          id: subject.id,
          characters: subject.characters,
          meaning: primaryMeaning,
          characterImages: subject.character_images,
        });
      }
      if (
        subject.object_type === 'kanji' &&
        kanjiComponentIds.has(subject.id)
      ) {
        const meanings: Meaning[] = JSON.parse(subject.meanings);
        const readings: KanjiReading[] = subject.readings
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
    subjectToReviewItem(
      subject,
      validAssignments[index],
      componentRadicals,
      componentKanji,
      synonymsMap,
    ),
  );
}

export function PracticeScreen() {
  const navigation = useNavigation<PracticeScreenNavigationProp>();

  const [phase, setPhase] = useState<'loading' | 'practicing' | 'empty'>(
    'loading',
  );
  const [questionQueue, setQuestionQueue] = useState<PracticeQuestion[]>([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [showCorrectFeedback, setShowCorrectFeedback] = useState(false);
  const [isFuzzyMatch, setIsFuzzyMatch] = useState(false);
  const [incorrectFeedback, setIncorrectFeedback] =
    useState<PracticeIncorrectFeedback | null>(null);
  const isRefilling = useRef(false);
  const inputRef = useRef<TextInputType>(null);

  const currentQuestion = questionQueue[currentQuestionIndex];

  const { shakeStyle, triggerShake } = useShakeAnimation();
  const { inputValue, displayValue, handleTextChange, clearInput } =
    useQuestionInput(currentQuestion?.type ?? 'meaning');

  useAutoFocus(inputRef, [
    currentQuestionIndex,
    incorrectFeedback,
    showCorrectFeedback,
    phase,
  ]);

  const practicePhrase = useMemo(() => {
    const phrases = [
      'Practice makes progress',
      'Building muscle memory',
      'Sharpen your recall',
      'No pressure, just practice',
      'Repetition is mastery',
      'Train at your own pace',
      'Every rep counts',
      'Keep the rhythm going',
    ];
    return phrases[Math.floor(Math.random() * phrases.length)];
  }, []);

  // Initial load
  useEffect(() => {
    const init = async () => {
      const count = await getPracticeItemCount();
      if (count === 0) {
        setPhase('empty');
        return;
      }

      const items = await loadPracticeItems();
      if (items.length === 0) {
        setPhase('empty');
        return;
      }

      const questions = generatePracticeQuestions(items);
      setQuestionQueue(questions);
      setPhase('practicing');
    };

    init();
  }, []);

  // Refill queue when running low
  const maybeRefillQueue = useCallback(
    async (currentIndex: number, queue: PracticeQuestion[]) => {
      const remaining = queue.length - currentIndex;
      if (remaining <= REFILL_THRESHOLD && !isRefilling.current) {
        isRefilling.current = true;
        try {
          const newItems = await loadPracticeItems();
          if (newItems.length > 0) {
            const newQuestions = generatePracticeQuestions(newItems);
            setQuestionQueue(prev => [...prev, ...newQuestions]);
          }
        } finally {
          isRefilling.current = false;
        }
      }
    },
    [],
  );

  const advanceToNextQuestion = useCallback(() => {
    const nextIndex = currentQuestionIndex + 1;
    setCurrentQuestionIndex(nextIndex);
    clearInput();
    setIncorrectFeedback(null);
    setShowCorrectFeedback(false);
    setIsFuzzyMatch(false);
    maybeRefillQueue(nextIndex, questionQueue);
  }, [currentQuestionIndex, questionQueue, maybeRefillQueue, clearInput]);

  const handleContinue = useCallback(() => {
    advanceToNextQuestion();
  }, [advanceToNextQuestion]);

  const handleSubmit = useCallback(() => {
    if (!currentQuestion || showCorrectFeedback || incorrectFeedback) return;

    const { item, type } = currentQuestion;

    if (type === 'reading') {
      if (!isValidReadingInput(inputValue)) {
        triggerShake();
        return;
      }
    }

    const answer =
      type === 'reading' ? romajiToHiragana(inputValue) : inputValue.trim();

    let isCorrect = false;
    let fuzzyMatch = false;
    if (type === 'meaning') {
      const validationResult = validateMeaningAnswer(
        answer,
        item.meanings,
        item.auxiliaryMeanings ?? [],
        item.userSynonyms ?? [],
      );
      isCorrect = validationResult.isCorrect;
      fuzzyMatch = validationResult.isFuzzyMatch ?? false;
    } else {
      const validationResult = validateReadingAnswer(
        answer,
        item.readings ?? [],
      );
      isCorrect = validationResult.isCorrect;
    }

    const correctAnswer =
      type === 'meaning'
        ? getAcceptedMeaningsDisplay(item.meanings)
        : getAcceptedReadingsDisplay(item.readings);

    if (isCorrect) {
      setShowCorrectFeedback(true);
      setIsFuzzyMatch(fuzzyMatch);
      setTimeout(() => {
        setShowCorrectFeedback(false);
        setIsFuzzyMatch(false);
        advanceToNextQuestion();
      }, 500);
    } else {
      const mnemonic =
        type === 'meaning'
          ? item.meaningMnemonic
          : item.readingMnemonic ?? item.meaningMnemonic;

      setIncorrectFeedback({
        question: currentQuestion,
        userAnswer: answer,
        correctAnswer,
        mnemonic,
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

  const handleComponentPress = useCallback(
    (subjectId: number) => {
      navigation.push('ItemDetail', { subjectId });
    },
    [navigation],
  );

  // Empty state
  if (phase === 'empty') {
    return (
      <View style={styles.centerContainer} testID="practice-screen-empty">
        <Text style={styles.emptyTitle}>No Practice Items</Text>
        <Text style={styles.emptyMessage}>
          Items become available for practice once they reach Guru level or
          above. Keep doing your reviews!
        </Text>
      </View>
    );
  }

  // Loading
  if (phase === 'loading' || !currentQuestion) {
    return (
      <LoadingView
        message="Loading practice items..."
        testID="practice-screen-loading"
      />
    );
  }

  // Incorrect feedback view
  if (incorrectFeedback) {
    return (
      <View
        style={styles.container}
        testID="practice-session-incorrect-feedback"
      >
        <ProgressHeader
          mode="practice"
          phrase={practicePhrase}
          icon="weight-lifter"
        />

        <IncorrectFeedbackView
          subjectType={incorrectFeedback.question.item.subjectType}
          displayText={incorrectFeedback.question.item.characters ?? '?'}
          displayMode="characters"
          userAnswer={incorrectFeedback.userAnswer}
          correctAnswer={incorrectFeedback.correctAnswer}
          mnemonic={incorrectFeedback.mnemonic}
          mnemonicLabel={
            incorrectFeedback.question.type === 'meaning'
              ? 'Meaning Mnemonic:'
              : 'Reading Mnemonic:'
          }
          onContinue={handleContinue}
          detailsContent={
            <ExpandableDetails
              resetKey={incorrectFeedback.question.key}
              testID="practice-session-expandable-details"
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
                componentRadicals={
                  incorrectFeedback.question.item.componentRadicals
                }
                componentKanji={
                  incorrectFeedback.question.item.componentKanji
                }
                onComponentPress={handleComponentPress}
                hideMnemonicType={incorrectFeedback.question.type}
                testID="practice-session-item-details"
              />
            </ExpandableDetails>
          }
          testID="practice-session"
        />
      </View>
    );
  }

  // Active question view
  const { item, type } = currentQuestion;
  const backgroundColor = getSubjectColor(item.subjectType);
  const placeholder =
    type === 'meaning' ? 'Enter meaning...' : 'Type reading (romaji)...';

  // Correct feedback overlay
  if (showCorrectFeedback) {
    return (
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        testID="practice-session"
      >
        <ProgressHeader
          mode="practice"
          phrase={practicePhrase}
          icon="weight-lifter"
        />

        <CorrectFeedbackView
          subjectType={item.subjectType}
          displayText={item.characters ?? '?'}
          displayMode="characters"
          feedbackState={isFuzzyMatch ? 'fuzzyMatch' : 'correct'}
          questionType={type}
          inputValue={displayValue}
          testID="practice-session-correct-feedback"
        />
      </KeyboardAvoidingView>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      testID="practice-session"
    >
      <ProgressHeader
        mode="practice"
        phrase={practicePhrase}
        icon="weight-lifter"
      />

      <SubjectDisplay
        subjectType={item.subjectType}
        displayMode="characters"
        displayText={item.characters ?? '?'}
        testID="practice-session-subject-display"
      />

      <QuestionTypeLabel
        type={type}
        testID="practice-session-question-type"
      />

      <Animated.View
        style={[styles.inputContainer, shakeStyle]}
        testID="practice-session-input-container"
      >
        <TextInput
          ref={inputRef}
          style={[styles.input, { borderColor: backgroundColor }]}
          value={type === 'reading' ? displayValue : inputValue}
          onChangeText={handleTextChange}
          onSubmitEditing={handleSubmit}
          placeholder={placeholder}
          placeholderTextColor="#999"
          autoCapitalize="none"
          autoCorrect={false}
          autoComplete="off"
          keyboardType={type === 'reading' ? 'ascii-capable' : 'default'}
          returnKeyType="done"
          blurOnSubmit={false}
          caretHidden={true}
          testID="practice-session-input"
        />
      </Animated.View>

      <View style={styles.spacer} />

      <View style={styles.buttonRow}>
        <Button
          label="Submit"
          onPress={handleSubmit}
          disabled={showCorrectFeedback}
          style={[styles.submitButtonFlex, { backgroundColor }]}
          testID="practice-session-submit"
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
