import React, { useState, useEffect, useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import type { Meaning, Reading, AuxiliaryMeaning } from '../api/types';
import type { ReviewComponentKanji } from '../components/ReviewSession';
import {
  getReversePracticeItems,
  getReversePracticeItemCount,
  getSubjectsByIds,
  getUserSynonymsBySubjectId,
  type DatabaseAssignment,
  type DatabaseSubject,
} from '../storage';
import { COLORS, SPACING, FONT_SIZES } from '../theme';

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

const REVERSE_PRACTICE_BATCH_SIZE = 10;

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

export function ReversePracticeScreen() {
  const [phase, setPhase] = useState<'loading' | 'practicing' | 'empty'>(
    'loading',
  );
  const [items, setItems] = useState<ReversePracticeItem[]>([]);

  const practicePhrase = useMemo(() => {
    const phrases = [
      'Reverse your recall',
      'Meaning to reading',
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

      setItems(loadedItems);
      setPhase('practicing');
    };

    init();
  }, []);

  // Empty state
  if (phase === 'empty') {
    return (
      <View style={styles.centerContainer} testID="reverse-practice-screen-empty">
        <Text style={styles.emptyTitle}>No Vocabulary Items</Text>
        <Text style={styles.emptyMessage}>
          Vocabulary items become available for reverse practice once they reach
          Guru level or above. Keep doing your reviews!
        </Text>
      </View>
    );
  }

  // Loading state
  if (phase === 'loading') {
    return (
      <View style={styles.centerContainer} testID="reverse-practice-screen-loading">
        <Text style={styles.loadingText}>Loading vocabulary items...</Text>
      </View>
    );
  }

  // Practicing state - placeholder for US-007
  return (
    <View style={styles.container} testID="reverse-practice-session">
      <View style={styles.placeholderContent}>
        <Text style={styles.placeholderTitle}>{practicePhrase}</Text>
        <Text style={styles.placeholderMessage}>
          {items.length} vocabulary item{items.length !== 1 ? 's' : ''} loaded
        </Text>
      </View>
    </View>
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
  placeholderContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: SPACING.xxxl,
  },
  placeholderTitle: {
    fontSize: FONT_SIZES.xl,
    fontWeight: '600',
    fontStyle: 'italic',
    color: COLORS.text.secondary,
    marginBottom: SPACING.md,
  },
  placeholderMessage: {
    fontSize: FONT_SIZES.base,
    color: COLORS.text.tertiary,
    textAlign: 'center',
  },
});
