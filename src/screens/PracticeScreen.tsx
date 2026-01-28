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
  TouchableOpacity,
  ScrollView,
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
  processRomajiInput,
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
  SHADOW,
  BORDER_RADIUS,
  SPACING,
  FONT_SIZES,
  MIN_TOUCH_TARGET,
  TEXT_STYLES,
} from '../theme';
import { MaterialDesignIcons } from '@react-native-vector-icons/material-design-icons';
import { MnemonicText } from '../components/MnemonicText';
import { ExpandableDetails } from '../components/ExpandableDetails';
import { ItemDetails } from '../components/ItemDetails';
import { shuffleArray } from '../components/ReviewSession';

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

  // Parse auxiliary_meanings from stored JSON
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

  // Collect component IDs
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
  const [inputValue, setInputValue] = useState('');
  const [displayValue, setDisplayValue] = useState('');
  const [pendingRomaji, setPendingRomaji] = useState('');
  const [showCorrectFeedback, setShowCorrectFeedback] = useState(false);
  const [isFuzzyMatch, setIsFuzzyMatch] = useState(false);
  const [incorrectFeedback, setIncorrectFeedback] =
    useState<PracticeIncorrectFeedback | null>(null);
  const isRefilling = useRef(false);
  const inputRef = useRef<TextInputType>(null);
  const shakeAnimation = useRef(new Animated.Value(0)).current;

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

  const currentQuestion = questionQueue[currentQuestionIndex];

  const handleReadingInputChange = useCallback((text: string) => {
    const state = processRomajiInput(text, false);
    setInputValue(text);
    setDisplayValue(state.hiragana);
    setPendingRomaji(state.pending);
  }, []);

  const handleMeaningInputChange = useCallback((text: string) => {
    setInputValue(text);
    setDisplayValue(text);
    setPendingRomaji('');
  }, []);

  const handleInputChange =
    currentQuestion?.type === 'reading'
      ? handleReadingInputChange
      : handleMeaningInputChange;

  const triggerShake = useCallback(() => {
    shakeAnimation.setValue(0);
    Animated.sequence([
      Animated.timing(shakeAnimation, {
        toValue: 10,
        duration: 50,
        useNativeDriver: true,
      }),
      Animated.timing(shakeAnimation, {
        toValue: -10,
        duration: 50,
        useNativeDriver: true,
      }),
      Animated.timing(shakeAnimation, {
        toValue: 10,
        duration: 50,
        useNativeDriver: true,
      }),
      Animated.timing(shakeAnimation, {
        toValue: -10,
        duration: 50,
        useNativeDriver: true,
      }),
      Animated.timing(shakeAnimation, {
        toValue: 0,
        duration: 50,
        useNativeDriver: true,
      }),
    ]).start();
  }, [shakeAnimation]);

  const advanceToNextQuestion = useCallback(() => {
    const nextIndex = currentQuestionIndex + 1;
    setCurrentQuestionIndex(nextIndex);
    setInputValue('');
    setDisplayValue('');
    setPendingRomaji('');
    setIncorrectFeedback(null);
    setShowCorrectFeedback(false);
    setIsFuzzyMatch(false);
    maybeRefillQueue(nextIndex, questionQueue);
  }, [currentQuestionIndex, questionQueue, maybeRefillQueue]);

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
      <View style={styles.centerContainer} testID="practice-screen-loading">
        <Text style={styles.loadingText}>Loading practice items...</Text>
      </View>
    );
  }

  // Incorrect feedback view
  if (incorrectFeedback) {
    return (
      <View
        style={styles.container}
        testID="practice-session-incorrect-feedback"
      >
        <View style={styles.modeBanner} testID="practice-session-banner">
          <MaterialDesignIcons
            name="weight-lifter"
            size={FONT_SIZES.base}
            color={COLORS.text.tertiary}
          />
          <Text style={styles.modeBannerText}>{practicePhrase}</Text>
        </View>

        <View
          style={[styles.characterContainer, styles.incorrectHeader]}
          testID="practice-session-character-container"
        >
          <Text style={styles.characters} testID="practice-session-characters">
            {incorrectFeedback.question.item.characters ?? '?'}
          </Text>
          <Text
            style={styles.incorrectLabel}
            testID="practice-session-incorrect-label"
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
              testID="practice-session-your-answer-label"
            >
              Your Answer:
            </Text>
            <Text
              style={styles.userAnswer}
              testID="practice-session-your-answer"
            >
              {incorrectFeedback.userAnswer || '(empty)'}
            </Text>
          </View>

          <View style={styles.feedbackSection}>
            <Text
              style={styles.feedbackLabel}
              testID="practice-session-correct-answer-label"
            >
              Correct Answer:
            </Text>
            <Text
              style={styles.correctAnswerText}
              testID="practice-session-correct-answer"
            >
              {incorrectFeedback.correctAnswer}
            </Text>
          </View>

          <View style={styles.feedbackSection}>
            <Text
              style={styles.feedbackLabel}
              testID="practice-session-mnemonic-label"
            >
              {incorrectFeedback.question.type === 'meaning'
                ? 'Meaning Mnemonic:'
                : 'Reading Mnemonic:'}
            </Text>
            <MnemonicText
              text={incorrectFeedback.mnemonic}
              style={styles.mnemonicText}
              testID="practice-session-mnemonic"
            />
          </View>

          <ExpandableDetails
            resetKey={incorrectFeedback.question.key}
            testID="practice-session-expandable-details"
          >
            <ItemDetails
              subjectType={incorrectFeedback.question.item.subjectType}
              meanings={incorrectFeedback.question.item.meanings}
              readings={incorrectFeedback.question.item.readings}
              meaningMnemonic={incorrectFeedback.question.item.meaningMnemonic}
              readingMnemonic={incorrectFeedback.question.item.readingMnemonic}
              componentRadicals={
                incorrectFeedback.question.item.componentRadicals
              }
              componentKanji={incorrectFeedback.question.item.componentKanji}
              onComponentPress={handleComponentPress}
              hideMnemonicType={incorrectFeedback.question.type}
              testID="practice-session-item-details"
            />
          </ExpandableDetails>
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
            testID="practice-session-continue"
          >
            <Text style={styles.submitButtonText}>Continue</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  // Active question view
  const { item, type } = currentQuestion;
  const backgroundColor = getSubjectColor(item.subjectType);
  const placeholder =
    type === 'meaning' ? 'Enter meaning...' : 'Type reading (romaji)...';
  const displayText =
    type === 'reading' ? displayValue + pendingRomaji : displayValue;

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      testID="practice-session"
    >
      <View style={styles.modeBanner} testID="practice-session-banner">
        <MaterialDesignIcons
          name="weight-lifter"
          size={FONT_SIZES.base}
          color={COLORS.text.tertiary}
        />
        <Text style={styles.modeBannerText}>{practicePhrase}</Text>
      </View>

      <View
        style={[
          styles.characterContainer,
          showCorrectFeedback
            ? isFuzzyMatch
              ? styles.fuzzyMatchHeader
              : styles.correctHeader
            : { backgroundColor },
        ]}
        testID="practice-session-character-container"
      >
        <Text style={styles.characters} testID="practice-session-characters">
          {item.characters ?? '?'}
        </Text>
        {showCorrectFeedback && (
          <Text
            style={styles.correctLabel}
            testID={
              isFuzzyMatch
                ? 'practice-session-fuzzy-match-label'
                : 'practice-session-correct-label'
            }
          >
            {isFuzzyMatch ? 'Close enough!' : 'Correct!'}
          </Text>
        )}
      </View>

      <View
        style={[
          styles.questionContainer,
          type === 'reading'
            ? styles.questionContainerReading
            : styles.questionContainerMeaning,
        ]}
      >
        <Text
          style={[
            styles.questionType,
            type === 'reading' && styles.questionTypeReading,
          ]}
          testID="practice-session-question-type"
        >
          {type === 'meaning' ? 'MEANING' : 'READING'}
        </Text>
      </View>

      <Animated.View
        style={[
          styles.inputContainer,
          { transform: [{ translateX: shakeAnimation }] },
        ]}
        testID="practice-session-input-container"
      >
        <TextInput
          ref={inputRef}
          style={[styles.input, { borderColor: backgroundColor }]}
          value={type === 'reading' ? displayText : inputValue}
          onChangeText={handleInputChange}
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
        <TouchableOpacity
          style={[
            styles.submitButton,
            styles.submitButtonFlex,
            { backgroundColor },
          ]}
          onPress={handleSubmit}
          disabled={showCorrectFeedback}
          activeOpacity={0.8}
          testID="practice-session-submit"
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
  characterContainer: {
    paddingVertical: 64,
    paddingHorizontal: SPACING.lg,
    alignItems: 'center',
    justifyContent: 'center',
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
  fuzzyMatchHeader: {
    backgroundColor: COLORS.feedback.fuzzyMatch,
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
  },
  questionContainerReading: {
    backgroundColor: COLORS.neutral.black,
  },
  questionContainerMeaning: {
    backgroundColor: COLORS.neutral.white,
  },
  questionType: {
    fontSize: FONT_SIZES.sm,
    fontWeight: '700',
    color: COLORS.text.tertiary,
    letterSpacing: 2,
  },
  questionTypeReading: {
    color: COLORS.text.inverse,
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
