import React, { useState, useCallback, useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import type { SubjectType, Meaning, Reading, KanjiReading } from '../api/types';
import { LessonCard } from './LessonCard';

/** Data for a single lesson item */
export interface LessonItem {
  /** Unique identifier for the item */
  id: number;
  /** The subject type (radical, kanji, vocabulary, kana_vocabulary) */
  subjectType: SubjectType;
  /** The characters to display (e.g., "大", "たべる") - null for some radicals */
  characters: string | null;
  /** Array of meanings for the subject */
  meanings: Meaning[];
  /** Array of readings (null for radicals) */
  readings: Reading[] | KanjiReading[] | null;
  /** Mnemonic for remembering the meaning */
  meaningMnemonic: string;
  /** Mnemonic for remembering the reading (null for radicals) */
  readingMnemonic: string | null;
  /** Component radical subject IDs (only for kanji) */
  componentSubjectIds?: number[];
}

/** Data for a component radical */
export interface ComponentRadical {
  /** Subject ID */
  id: number;
  /** Radical characters (null for image-only radicals) */
  characters: string | null;
  /** Primary meaning of the radical */
  meaning: string;
}

export interface LessonBatchProps {
  /** The lesson items in this batch (up to 5) */
  items: LessonItem[];
  /** Component radicals lookup map (for kanji items) */
  componentRadicals?: Map<number, ComponentRadical>;
  /** Callback when the batch learning phase is complete (all items viewed) */
  onBatchComplete: () => void;
}

/** Default batch size for lessons */
export const LESSON_BATCH_SIZE = 5;

/**
 * Get the background color based on subject type.
 * Uses WaniKani-inspired colors.
 */
function getSubjectColor(subjectType: SubjectType): string {
  switch (subjectType) {
    case 'radical':
      return '#00aaff'; // WaniKani blue for radicals
    case 'kanji':
      return '#e8a4c9'; // Pink for kanji
    case 'vocabulary':
    case 'kana_vocabulary':
      return '#8f5bc4'; // Purple for vocabulary
    default:
      return '#888';
  }
}

/** Unvisited dot color */
const UNVISITED_DOT_COLOR = '#ddd';

/**
 * Get the dot color based on whether it's been visited.
 */
function getDotColor(
  isVisited: boolean,
  subjectType: SubjectType,
): string {
  return isVisited ? getSubjectColor(subjectType) : UNVISITED_DOT_COLOR;
}

/**
 * LessonBatch presents lesson items in batches of 5.
 * After viewing all items, it triggers onBatchComplete to proceed to the quiz.
 */
export function LessonBatch({
  items,
  componentRadicals,
  onBatchComplete,
}: LessonBatchProps) {
  const [currentIndex, setCurrentIndex] = useState(0);

  const currentItem = items[currentIndex];
  const totalItems = items.length;
  const isLastItem = currentIndex === totalItems - 1;

  // Get component radicals for the current item (if kanji)
  const currentComponentRadicals = useMemo(() => {
    if (
      !currentItem ||
      currentItem.subjectType !== 'kanji' ||
      !currentItem.componentSubjectIds ||
      !componentRadicals
    ) {
      return [];
    }
    return currentItem.componentSubjectIds
      .map(id => componentRadicals.get(id))
      .filter((r): r is ComponentRadical => r !== undefined);
  }, [currentItem, componentRadicals]);

  const handleNext = useCallback(() => {
    if (isLastItem) {
      onBatchComplete();
    } else {
      setCurrentIndex(prev => prev + 1);
    }
  }, [isLastItem, onBatchComplete]);

  // Handle edge case of empty items array
  if (!currentItem) {
    return (
      <View style={styles.container} testID="lesson-batch-empty">
        <Text style={styles.emptyText}>No lessons available</Text>
      </View>
    );
  }

  return (
    <View style={styles.container} testID="lesson-batch">
      {/* Progress indicator */}
      <View style={styles.progressContainer} testID="lesson-batch-progress">
        <View style={styles.progressDots}>
          {items.map((item, index) => (
            <View
              key={item.id}
              style={[
                styles.progressDot,
                {
                  backgroundColor: getDotColor(
                    index <= currentIndex,
                    item.subjectType,
                  ),
                },
              ]}
              testID={`lesson-batch-dot-${index}`}
            />
          ))}
        </View>
        <Text style={styles.progressText} testID="lesson-batch-progress-text">
          {currentIndex + 1} / {totalItems}
        </Text>
      </View>

      {/* Component radicals display for kanji */}
      {currentComponentRadicals.length > 0 && (
        <View
          style={styles.componentsContainer}
          testID="lesson-batch-components">
          <Text style={styles.componentsTitle}>Made up of:</Text>
          <View style={styles.componentsRow}>
            {currentComponentRadicals.map(radical => (
              <View
                key={radical.id}
                style={styles.componentItem}
                testID={`lesson-batch-component-${radical.id}`}>
                <Text style={styles.componentCharacter}>
                  {radical.characters ?? '?'}
                </Text>
                <Text style={styles.componentMeaning}>{radical.meaning}</Text>
              </View>
            ))}
          </View>
        </View>
      )}

      {/* Lesson card */}
      <View style={styles.cardContainer}>
        <LessonCard
          subjectType={currentItem.subjectType}
          characters={currentItem.characters}
          meanings={currentItem.meanings}
          readings={currentItem.readings}
          meaningMnemonic={currentItem.meaningMnemonic}
          readingMnemonic={currentItem.readingMnemonic}
          onNext={handleNext}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  progressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 8,
    backgroundColor: '#f8f8f8',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  progressDots: {
    flexDirection: 'row',
    gap: 8,
  },
  progressDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  progressText: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
  componentsContainer: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#f0f4ff',
    borderBottomWidth: 1,
    borderBottomColor: '#d0d8f0',
  },
  componentsTitle: {
    fontSize: 12,
    color: '#666',
    marginBottom: 8,
    fontWeight: '500',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  componentsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  componentItem: {
    alignItems: 'center',
    minWidth: 60,
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: '#00aaff',
    borderRadius: 8,
  },
  componentCharacter: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
  },
  componentMeaning: {
    fontSize: 10,
    color: 'rgba(255, 255, 255, 0.9)',
    marginTop: 4,
    textAlign: 'center',
  },
  cardContainer: {
    flex: 1,
  },
  emptyText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginTop: 32,
  },
});
