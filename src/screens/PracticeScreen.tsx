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
  View,
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
import { hasReadingQuestion } from '../utils/subjectHelpers';
import type {
  ReviewItem,
  ReviewComponentRadical,
  ReviewComponentKanji,
} from '../components/ReviewSession';
import { shuffleArray } from '../components/ReviewSession';
import {
  getPracticeItems,
  getPracticeItemCount,
  getSubjectsByIds,
  getUserSynonymsBySubjectId,
  type DatabaseAssignment,
  type DatabaseSubject,
} from '../storage';
import {
  COLORS,
  SPACING,
  FONT_SIZES,
} from '../theme';
import { LoadingView } from '../components';
import { ExpandableDetails } from '../components/ExpandableDetails';
import { ItemDetails } from '../components/ItemDetails';
import { QuizEngine } from '../components/quiz/QuizEngine';
import type {
  Question,
  QuizEngineConfig,
  ProgressMode,
} from '../components/quiz/types';

type PracticeScreenNavigationProp = NativeStackNavigationProp<
  RootStackParamList,
  'Practice'
>;

interface PracticeQuestion {
  item: ReviewItem;
  type: 'meaning' | 'reading';
  key: string;
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

    if (!hasReadingQuestion(item.subjectType)) {
      // Radicals and kana vocabulary only have meaning questions
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

function practiceQuestionToQuestion(pq: PracticeQuestion): Question {
  const { item, type, key } = pq;
  const mnemonic =
    type === 'meaning'
      ? item.meaningMnemonic
      : item.readingMnemonic ?? item.meaningMnemonic;
  const mnemonicLabel =
    type === 'meaning' ? 'Meaning Mnemonic:' : 'Reading Mnemonic:';

  return {
    id: key,
    subjectId: item.id,
    subjectType: item.subjectType,
    displayText: item.characters ?? '?',
    displayMode: 'characters',
    correctAnswers: [],
    questionType: type,
    mnemonic,
    mnemonicLabel,
    meanings: item.meanings,
    readings: item.readings ?? [],
    auxiliaryMeanings: item.auxiliaryMeanings ?? [],
    userSynonyms: item.userSynonyms ?? [],
  };
}

function buildQuestionMap(
  practiceQuestions: PracticeQuestion[],
): Map<string, PracticeQuestion> {
  const map = new Map<string, PracticeQuestion>();
  for (const pq of practiceQuestions) {
    map.set(pq.key, pq);
  }
  return map;
}

export function PracticeScreen() {
  const navigation = useNavigation<PracticeScreenNavigationProp>();

  const [phase, setPhase] = useState<'loading' | 'practicing' | 'empty'>(
    'loading',
  );
  const [practiceQuestions, setPracticeQuestions] = useState<
    PracticeQuestion[]
  >([]);

  const questionMapRef = useRef<Map<string, PracticeQuestion>>(new Map());

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
      questionMapRef.current = buildQuestionMap(questions);
      setPracticeQuestions(questions);
      setPhase('practicing');
    };

    init();
  }, []);

  // Convert practice questions to unified Questions for QuizEngine
  const initialQuestions = useMemo(
    () => practiceQuestions.map(practiceQuestionToQuestion),
    [practiceQuestions],
  );

  // Auto-refill: load more questions when queue runs low
  const loadMoreQuestions = useCallback(async (): Promise<Question[]> => {
    const newItems = await loadPracticeItems();
    if (newItems.length === 0) return [];
    const newPracticeQuestions = generatePracticeQuestions(newItems);
    // Update the question map with new questions
    for (const pq of newPracticeQuestions) {
      questionMapRef.current.set(pq.key, pq);
    }
    return newPracticeQuestions.map(practiceQuestionToQuestion);
  }, []);

  const handleComponentPress = useCallback(
    (subjectId: number) => {
      navigation.push('ItemDetail', { subjectId });
    },
    [navigation],
  );

  // Render details content for incorrect feedback
  const renderDetailsContent = useCallback(
    (question: Question): React.ReactNode | undefined => {
      const pq = questionMapRef.current.get(question.id);
      if (!pq) return undefined;

      const feedbackItem = pq.item;

      return (
        <ExpandableDetails
          resetKey={question.id}
          testID="practice-session-expandable-details"
        >
          <ItemDetails
            subjectType={feedbackItem.subjectType}
            meanings={feedbackItem.meanings}
            readings={feedbackItem.readings}
            meaningMnemonic={feedbackItem.meaningMnemonic}
            readingMnemonic={feedbackItem.readingMnemonic}
            componentRadicals={feedbackItem.componentRadicals}
            componentKanji={feedbackItem.componentKanji}
            onComponentPress={handleComponentPress}
            hideMnemonicType={pq.type}
            testID="practice-session-item-details"
          />
        </ExpandableDetails>
      );
    },
    [handleComponentPress],
  );

  // Progress mode
  const progressMode: ProgressMode = useMemo(
    () => ({
      mode: 'practice' as const,
      phrase: practicePhrase,
      icon: 'weight-lifter' as const,
    }),
    [practicePhrase],
  );

  // Build QuizEngine config
  const quizConfig: QuizEngineConfig = useMemo(
    () => ({
      questions: initialQuestions,
      progressMode,
      completionMode: 'never',
      allowMarkCorrect: false,
      allowAddSynonym: false,
      requeueIncorrect: false,
      showSrsBadge: false,
      showSubjectTypeLabel: false,
      autoRefill: {
        threshold: REFILL_THRESHOLD,
        loadMore: loadMoreQuestions,
      },
      renderDetailsContent,
      testID: 'practice-session',
    }),
    [initialQuestions, progressMode, loadMoreQuestions, renderDetailsContent],
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
  if (phase === 'loading' || initialQuestions.length === 0) {
    return (
      <LoadingView
        message="Loading practice items..."
        testID="practice-screen-loading"
      />
    );
  }

  return <QuizEngine config={quizConfig} />;
}

const styles = StyleSheet.create({
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
});
