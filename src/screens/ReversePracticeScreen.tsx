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

interface ReversePracticeItem {
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

function reversePracticeQuestionToQuestion(
  rpq: ReversePracticeQuestion,
): Question {
  const { item, key } = rpq;
  return {
    id: key,
    subjectId: item.id,
    subjectType: item.subjectType,
    displayText: getPrimaryMeaning(item.meanings),
    displayMode: 'meaning',
    correctAnswers: [item.characters],
    questionType: 'reverse',
    mnemonic: item.meaningMnemonic,
    mnemonicLabel: 'Meaning Mnemonic:',
    meanings: item.meanings,
    readings: item.readings,
    auxiliaryMeanings: item.auxiliaryMeanings,
    userSynonyms: item.userSynonyms,
  };
}

function buildQuestionMap(
  reverseQuestions: ReversePracticeQuestion[],
): Map<string, ReversePracticeQuestion> {
  const map = new Map<string, ReversePracticeQuestion>();
  for (const rq of reverseQuestions) {
    map.set(rq.key, rq);
  }
  return map;
}

export function ReversePracticeScreen() {
  const [phase, setPhase] = useState<'loading' | 'practicing' | 'empty'>(
    'loading',
  );
  const [reverseQuestions, setReverseQuestions] = useState<
    ReversePracticeQuestion[]
  >([]);

  const questionMapRef = useRef<Map<string, ReversePracticeQuestion>>(
    new Map(),
  );

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
      questionMapRef.current = buildQuestionMap(questions);
      setReverseQuestions(questions);
      setPhase('practicing');
    };

    init();
  }, []);

  // Convert reverse practice questions to unified Questions for QuizEngine
  const initialQuestions = useMemo(
    () => reverseQuestions.map(reversePracticeQuestionToQuestion),
    [reverseQuestions],
  );

  // Auto-refill: load more questions when queue runs low
  const loadMoreQuestions = useCallback(async (): Promise<Question[]> => {
    const newItems = await loadReversePracticeItems();
    if (newItems.length === 0) return [];
    const newReverseQuestions = generateReverseQuestions(newItems);
    // Update the question map with new questions
    for (const rq of newReverseQuestions) {
      questionMapRef.current.set(rq.key, rq);
    }
    return newReverseQuestions.map(reversePracticeQuestionToQuestion);
  }, []);

  // Render details content for incorrect feedback
  const renderDetailsContent = useCallback(
    (question: Question): React.ReactNode | undefined => {
      const rq = questionMapRef.current.get(question.id);
      if (!rq) return undefined;

      const feedbackItem = rq.item;

      return (
        <ExpandableDetails
          resetKey={question.id}
          testID="reverse-practice-expandable-details"
        >
          <ItemDetails
            subjectType={feedbackItem.subjectType}
            meanings={feedbackItem.meanings}
            readings={feedbackItem.readings}
            meaningMnemonic={feedbackItem.meaningMnemonic}
            readingMnemonic={feedbackItem.readingMnemonic}
            componentKanji={feedbackItem.componentKanji}
            hideMnemonicType="meaning"
            testID="reverse-practice-item-details"
          />
        </ExpandableDetails>
      );
    },
    [],
  );

  // Progress mode
  const progressMode: ProgressMode = useMemo(
    () => ({
      mode: 'practice' as const,
      phrase: practicePhrase,
      icon: 'swap-horizontal' as const,
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
      testID: 'reverse-practice-session',
    }),
    [initialQuestions, progressMode, loadMoreQuestions, renderDetailsContent],
  );

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
  if (phase === 'loading' || initialQuestions.length === 0) {
    return (
      <LoadingView
        message="Loading vocabulary items..."
        testID="reverse-practice-screen-loading"
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
