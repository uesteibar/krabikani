import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { StyleSheet, Text, View, ActivityIndicator } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import type { RootStackParamList } from '../navigation/types';
import type {
  Meaning,
  Reading,
  KanjiReading,
  AuxiliaryMeaning,
} from '../api/types';
import {
  LessonBatch,
  LessonQuiz,
  LessonCompletion,
  LESSON_BATCH_SIZE,
  type LessonItem,
  type LessonResultItem,
  type ComponentRadical,
  type QuizItem,
  type QuizComponentKanji,
} from '../components';
import {
  getAvailableLessons,
  getSubjectsByIds,
  type DatabaseAssignment,
  type DatabaseSubject,
} from '../storage';
import { WaniKaniClient } from '../api/wanikaniApi';
import { getApiKey } from '../storage/secureStorage';
import { isOnline, startSession, endSession } from '../utils';
import { completeLessons, type LessonToComplete } from '../sync';

type LessonsScreenNavigationProp = NativeStackNavigationProp<
  RootStackParamList,
  'Lessons'
>;

type LessonPhase = 'loading' | 'learning' | 'quiz' | 'complete' | 'error';

interface LessonSession {
  assignments: DatabaseAssignment[];
  subjects: DatabaseSubject[];
  currentBatchIndex: number;
  /** Pre-fetched component radicals for all kanji in the session */
  componentRadicalsMap: Map<number, ComponentRadical>;
  /** Pre-fetched component kanji for all vocabulary in the session */
  componentKanjiMap: Map<number, QuizComponentKanji>;
}

/**
 * Converts a DatabaseSubject to a LessonItem for the learning phase.
 */
function subjectToLessonItem(
  subject: DatabaseSubject,
  _assignment: DatabaseAssignment,
): LessonItem {
  const meanings: Meaning[] = JSON.parse(subject.meanings);
  const readings: Reading[] | KanjiReading[] | null = subject.readings
    ? JSON.parse(subject.readings)
    : null;
  const componentSubjectIds: number[] | undefined =
    subject.component_subject_ids
      ? JSON.parse(subject.component_subject_ids)
      : undefined;

  return {
    id: subject.id,
    subjectType: subject.object_type as LessonItem['subjectType'],
    characters: subject.characters,
    meanings,
    readings,
    meaningMnemonic: subject.meaning_mnemonic,
    readingMnemonic: subject.reading_mnemonic,
    componentSubjectIds,
  };
}

/**
 * Converts a LessonItem to a QuizItem for the quiz phase.
 */
function lessonItemToQuizItem(
  item: LessonItem,
  componentRadicals: Map<number, ComponentRadical>,
  componentKanjiMap: Map<number, QuizComponentKanji>,
): QuizItem {
  // For QuizItem, we need to include auxiliaryMeanings if available
  // but our database doesn't store them separately, so we pass empty array
  // Also include component radicals for kanji items
  const itemComponentRadicals =
    item.subjectType === 'kanji' && item.componentSubjectIds
      ? item.componentSubjectIds
          .map(id => componentRadicals.get(id))
          .filter((r): r is ComponentRadical => r !== undefined)
      : undefined;

  // Include component kanji for vocabulary items
  const itemComponentKanji =
    (item.subjectType === 'vocabulary' ||
      item.subjectType === 'kana_vocabulary') &&
    item.componentSubjectIds
      ? item.componentSubjectIds
          .map(id => componentKanjiMap.get(id))
          .filter((k): k is QuizComponentKanji => k !== undefined)
      : undefined;

  return {
    id: item.id,
    subjectType: item.subjectType,
    characters: item.characters,
    meanings: item.meanings,
    readings: item.readings,
    meaningMnemonic: item.meaningMnemonic,
    readingMnemonic: item.readingMnemonic,
    auxiliaryMeanings: [] as AuxiliaryMeaning[],
    componentRadicals: itemComponentRadicals,
    componentKanji: itemComponentKanji,
  };
}

/**
 * LessonsScreen manages the full lesson flow:
 * 1. Loading available lessons
 * 2. Learning phase (view batch of 5 items)
 * 3. Quiz phase (test knowledge)
 * 4. Completion (sync with WaniKani and show summary)
 */
export function LessonsScreen() {
  const navigation = useNavigation<LessonsScreenNavigationProp>();

  const [phase, setPhase] = useState<LessonPhase>('loading');
  const [session, setSession] = useState<LessonSession | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [syncedOnline, setSyncedOnline] = useState(false);

  const loadLessons = useCallback(async () => {
    try {
      setPhase('loading');
      setErrorMessage(null);

      // Get available lessons from local database
      const assignments = await getAvailableLessons();

      if (assignments.length === 0) {
        setErrorMessage(
          'No lessons right now. Check back after your next review.',
        );
        setPhase('error');
        return;
      }

      // Get subject data for the assignments
      const subjectIds = assignments.map(a => a.subject_id);
      const subjects = await getSubjectsByIds(subjectIds);

      // Create a map for quick lookup
      const subjectMap = new Map(subjects.map(s => [s.id, s]));

      // Filter assignments to only those with matching subjects
      const validAssignments = assignments.filter(a =>
        subjectMap.has(a.subject_id),
      );
      const validSubjects = validAssignments.map(
        a => subjectMap.get(a.subject_id)!,
      );

      if (validAssignments.length === 0) {
        setErrorMessage(
          "Couldn't load lesson data. Try syncing from the home screen.",
        );
        setPhase('error');
        return;
      }

      // Collect all component subject IDs from kanji (for radicals)
      const radicalComponentIds = new Set<number>();
      for (const subject of validSubjects) {
        if (subject.object_type === 'kanji' && subject.component_subject_ids) {
          const ids: number[] = JSON.parse(subject.component_subject_ids);
          ids.forEach(id => radicalComponentIds.add(id));
        }
      }

      // Collect all component subject IDs from vocabulary (for kanji)
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

      // Fetch all component subjects from database
      const allComponentIds = new Set([
        ...radicalComponentIds,
        ...kanjiComponentIds,
      ]);

      const componentRadicalsMap = new Map<number, ComponentRadical>();
      const componentKanjiMap = new Map<number, QuizComponentKanji>();

      if (allComponentIds.size > 0) {
        const componentSubjects = await getSubjectsByIds(
          Array.from(allComponentIds),
        );

        for (const compSubject of componentSubjects) {
          if (
            compSubject.object_type === 'radical' &&
            radicalComponentIds.has(compSubject.id)
          ) {
            const meanings: Meaning[] = JSON.parse(compSubject.meanings);
            const primaryMeaning =
              meanings.find(m => m.primary)?.meaning ??
              meanings[0]?.meaning ??
              '';
            componentRadicalsMap.set(compSubject.id, {
              id: compSubject.id,
              characters: compSubject.characters,
              meaning: primaryMeaning,
              characterImages: compSubject.character_images,
            });
          }
          if (
            compSubject.object_type === 'kanji' &&
            kanjiComponentIds.has(compSubject.id)
          ) {
            const meanings: Meaning[] = JSON.parse(compSubject.meanings);
            const readings: KanjiReading[] = compSubject.readings
              ? JSON.parse(compSubject.readings)
              : [];
            const primaryMeaning =
              meanings.find(m => m.primary)?.meaning ??
              meanings[0]?.meaning ??
              '';
            const primaryReading =
              readings.find(r => r.primary)?.reading ??
              readings[0]?.reading ??
              '';
            componentKanjiMap.set(compSubject.id, {
              id: compSubject.id,
              characters: compSubject.characters ?? '?',
              meaning: primaryMeaning,
              reading: primaryReading,
            });
          }
        }
      }

      setSession({
        assignments: validAssignments,
        subjects: validSubjects,
        currentBatchIndex: 0,
        componentRadicalsMap,
        componentKanjiMap,
      });
      setPhase('learning');
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Couldn't load lessons. Try again.";
      setErrorMessage(message);
      setPhase('error');
    }
  }, []);

  // Load available lessons on mount and track session state
  useEffect(() => {
    startSession('lesson');
    loadLessons();

    // End session when component unmounts
    return () => {
      endSession();
    };
  }, [loadLessons]);

  // Get the current batch of items
  const currentBatch = useMemo(() => {
    if (!session) return { items: [], assignments: [] };

    const startIndex = session.currentBatchIndex * LESSON_BATCH_SIZE;
    const endIndex = Math.min(
      startIndex + LESSON_BATCH_SIZE,
      session.assignments.length,
    );

    const batchAssignments = session.assignments.slice(startIndex, endIndex);
    const batchSubjects = session.subjects.slice(startIndex, endIndex);

    const items: LessonItem[] = batchSubjects.map((subject, index) =>
      subjectToLessonItem(subject, batchAssignments[index]),
    );

    return { items, assignments: batchAssignments };
  }, [session]);

  // Get component radicals for kanji items (pre-fetched during session load)
  const componentRadicals = useMemo(() => {
    if (!session) return new Map<number, ComponentRadical>();
    return session.componentRadicalsMap;
  }, [session]);

  // Get component kanji for vocabulary items (pre-fetched during session load)
  const componentKanji = useMemo(() => {
    if (!session) return new Map<number, QuizComponentKanji>();
    return session.componentKanjiMap;
  }, [session]);

  // Calculate remaining lessons after current batch
  const moreLessonsAvailable = useMemo(() => {
    if (!session) return 0;
    const nextStartIndex = (session.currentBatchIndex + 1) * LESSON_BATCH_SIZE;
    return Math.max(0, session.assignments.length - nextStartIndex);
  }, [session]);

  // Build result items for the completion screen
  const resultItems: LessonResultItem[] = useMemo(() => {
    return currentBatch.items.map(item => {
      const primaryMeaning =
        item.meanings.find(m => m.primary)?.meaning ??
        item.meanings[0]?.meaning ??
        '';
      const primaryReading =
        item.readings?.find(r => r.primary)?.reading ??
        item.readings?.[0]?.reading ??
        '';
      return {
        id: item.id,
        characters: item.characters,
        primaryMeaning,
        primaryReading,
        subjectType: item.subjectType,
      };
    });
  }, [currentBatch.items]);

  // Handle completion of learning phase (proceed to quiz)
  const handleBatchComplete = useCallback(() => {
    setPhase('quiz');
  }, []);

  // Handle completion of quiz phase (show completion immediately, sync in background)
  const handleQuizComplete = useCallback(async () => {
    if (!session) return;

    // Show completion immediately — don't block on sync
    setPhase('complete');

    try {
      // Prepare lessons to complete
      const lessonsToComplete: LessonToComplete[] =
        currentBatch.assignments.map(assignment => ({
          assignmentId: assignment.id,
          subjectId: assignment.subject_id,
        }));

      // Get API key and check if online
      const apiKey = await getApiKey();
      const online = isOnline();

      // Create client if online and have API key
      const client =
        online && apiKey ? new WaniKaniClient(apiKey, { maxRetries: 3 }) : null;

      // Complete the lessons
      const result = await completeLessons(client, lessonsToComplete);

      if (
        result.success ||
        result.completedCount > 0 ||
        result.queuedCount > 0
      ) {
        setSyncedOnline(result.completedCount > 0);
      }
    } catch {
      // Sync failure is not critical — lessons are queued locally
      setSyncedOnline(false);
    }
  }, [session, currentBatch.assignments]);

  // Handle return to dashboard
  const handleReturnToDashboard = useCallback(() => {
    navigation.goBack();
  }, [navigation]);

  // Handle component press (navigate to item detail)
  const handleComponentPress = useCallback(
    (subjectId: number) => {
      navigation.push('ItemDetail', { subjectId });
    },
    [navigation],
  );

  // Handle continue to next batch
  const handleContinueLessons = useCallback(() => {
    if (!session) return;

    setSession(prev => {
      if (!prev) return prev;
      return {
        ...prev,
        currentBatchIndex: prev.currentBatchIndex + 1,
      };
    });
    setPhase('learning');
  }, [session]);

  // Render loading state
  if (phase === 'loading') {
    return (
      <View style={styles.centerContainer} testID="lessons-screen-loading">
        <ActivityIndicator size="large" color="#e8a4c9" />
        <Text style={styles.loadingText}>Loading lessons...</Text>
      </View>
    );
  }

  // Render error state
  if (phase === 'error') {
    return (
      <View style={styles.centerContainer} testID="lessons-screen-error">
        <Text style={styles.errorText}>
          {errorMessage ?? 'An error occurred'}
        </Text>
        <Text
          style={styles.backLink}
          onPress={handleReturnToDashboard}
          testID="lessons-screen-back"
        >
          Return to Dashboard
        </Text>
      </View>
    );
  }

  // Render learning phase
  if (phase === 'learning' && session) {
    return (
      <View style={styles.container} testID="lessons-screen">
        <LessonBatch
          items={currentBatch.items}
          componentRadicals={componentRadicals}
          componentKanji={componentKanji}
          onBatchComplete={handleBatchComplete}
          onComponentPress={handleComponentPress}
        />
      </View>
    );
  }

  // Render quiz phase
  if (phase === 'quiz' && session) {
    const quizItems = currentBatch.items.map(item =>
      lessonItemToQuizItem(item, componentRadicals, componentKanji),
    );

    return (
      <View style={styles.container} testID="lessons-screen">
        <LessonQuiz
          items={quizItems}
          onQuizComplete={handleQuizComplete}
          onComponentPress={handleComponentPress}
        />
      </View>
    );
  }

  // Render completion phase
  if (phase === 'complete' && session) {
    return (
      <View style={styles.container} testID="lessons-screen">
        <LessonCompletion
          itemsLearned={currentBatch.items.length}
          syncedOnline={syncedOnline}
          moreLessonsAvailable={moreLessonsAvailable}
          onReturnToDashboard={handleReturnToDashboard}
          onContinueLessons={
            moreLessonsAvailable > 0 ? handleContinueLessons : undefined
          }
          resultItems={resultItems}
        />
      </View>
    );
  }

  // Fallback (shouldn't reach here)
  return (
    <View style={styles.centerContainer} testID="lessons-screen">
      <Text style={styles.errorText}>Unexpected state</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  centerContainer: {
    flex: 1,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  loadingText: {
    fontSize: 16,
    color: '#666',
    marginTop: 16,
  },
  errorText: {
    fontSize: 16,
    color: '#f44336',
    textAlign: 'center',
    marginBottom: 16,
  },
  backLink: {
    fontSize: 16,
    color: '#007AFF',
    textDecorationLine: 'underline',
  },
});
