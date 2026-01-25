import React, { useState, useCallback, useMemo, useRef } from 'react';
import { StyleSheet, Text, View, PanResponder, GestureResponderEvent, PanResponderGestureState } from 'react-native';

import type { SubjectType, Meaning, Reading, KanjiReading } from '../api/types';
import { LessonCard } from './LessonCard';
import { RadicalImage } from './RadicalImage';
import {
  getSubjectColor,
  SUBJECT_COLORS,
  COLORS,
  SPACING,
  FONT_SIZES,
  BORDER_RADIUS,
} from '../theme';

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
  /** JSON string of character images (for radicals without Unicode characters) */
  characterImages?: string | null;
}

/** Data for a component radical */
export interface ComponentRadical {
  /** Subject ID */
  id: number;
  /** Radical characters (null for image-only radicals) */
  characters: string | null;
  /** Primary meaning of the radical */
  meaning: string;
  /** JSON string of character images (for radicals without Unicode characters) */
  characterImages?: string | null;
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

/** Minimum horizontal distance in pixels required to trigger a swipe */
export const SWIPE_THRESHOLD = 50;

/** Maximum vertical distance allowed during a swipe (to distinguish from vertical scrolls) */
const SWIPE_VERTICAL_THRESHOLD = 100;

/** Unvisited dot color */
const UNVISITED_DOT_COLOR = COLORS.neutral.gray300;

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
  const isFirstItem = currentIndex === 0;

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

  const handleBack = useCallback(() => {
    if (!isFirstItem) {
      setCurrentIndex(prev => prev - 1);
    }
  }, [isFirstItem]);

  // Store refs for swipe handlers to avoid stale closures in PanResponder
  const handleNextRef = useRef(handleNext);
  const handleBackRef = useRef(handleBack);
  handleNextRef.current = handleNext;
  handleBackRef.current = handleBack;

  // Pan responder for swipe gestures
  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => false,
      onMoveShouldSetPanResponder: (
        _evt: GestureResponderEvent,
        gestureState: PanResponderGestureState,
      ) => {
        // Only capture horizontal swipes (not vertical scrolls)
        const { dx, dy } = gestureState;
        return Math.abs(dx) > Math.abs(dy) && Math.abs(dx) > 10;
      },
      onPanResponderRelease: (
        _evt: GestureResponderEvent,
        gestureState: PanResponderGestureState,
      ) => {
        const { dx, dy } = gestureState;

        // Ignore if vertical movement is too large (user is scrolling)
        if (Math.abs(dy) > SWIPE_VERTICAL_THRESHOLD) {
          return;
        }

        // Swipe left (negative dx) -> advance to next
        if (dx < -SWIPE_THRESHOLD) {
          handleNextRef.current();
        }
        // Swipe right (positive dx) -> go back to previous
        else if (dx > SWIPE_THRESHOLD) {
          handleBackRef.current();
        }
      },
    }),
  ).current;

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
                {radical.characters === null && radical.characterImages ? (
                  <RadicalImage
                    characterImages={radical.characterImages}
                    fallbackText={radical.meaning}
                    size={FONT_SIZES.xxl}
                    testID={`lesson-batch-component-${radical.id}-image`}
                  />
                ) : (
                  <Text style={styles.componentCharacter}>
                    {radical.characters ?? '?'}
                  </Text>
                )}
                <Text style={styles.componentMeaning}>{radical.meaning}</Text>
              </View>
            ))}
          </View>
        </View>
      )}

      {/* Lesson card with swipe gesture support */}
      <View style={styles.cardContainer} {...panResponder.panHandlers} testID="lesson-batch-swipe-area">
        <LessonCard
          subjectType={currentItem.subjectType}
          characters={currentItem.characters}
          meanings={currentItem.meanings}
          readings={currentItem.readings}
          meaningMnemonic={currentItem.meaningMnemonic}
          readingMnemonic={currentItem.readingMnemonic}
          characterImages={currentItem.characterImages}
          onNext={handleNext}
          onBack={isFirstItem ? undefined : handleBack}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background.primary,
  },
  progressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.md,
    paddingBottom: SPACING.sm,
    backgroundColor: COLORS.background.secondary,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border.light,
  },
  progressDots: {
    flexDirection: 'row',
    gap: SPACING.sm,
  },
  progressDot: {
    width: 12,
    height: 12,
    borderRadius: BORDER_RADIUS.full,
  },
  progressText: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.text.secondary,
    fontWeight: '500',
  },
  componentsContainer: {
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    backgroundColor: '#E8F4FF', // Light blue tint for radical components
    borderBottomWidth: 1,
    borderBottomColor: '#B8D4F0',
  },
  componentsTitle: {
    fontSize: FONT_SIZES.xs,
    color: COLORS.text.secondary,
    marginBottom: SPACING.sm,
    fontWeight: '500',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  componentsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.md,
  },
  componentItem: {
    alignItems: 'center',
    minWidth: 60,
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.md,
    backgroundColor: SUBJECT_COLORS.radical,
    borderRadius: BORDER_RADIUS.md,
  },
  componentCharacter: {
    fontSize: FONT_SIZES.xxl,
    fontWeight: 'bold',
    color: COLORS.text.inverse,
  },
  componentMeaning: {
    fontSize: 10,
    color: 'rgba(255, 255, 255, 0.9)',
    marginTop: SPACING.xs,
    textAlign: 'center',
  },
  cardContainer: {
    flex: 1,
  },
  emptyText: {
    fontSize: FONT_SIZES.base,
    color: COLORS.text.secondary,
    textAlign: 'center',
    marginTop: SPACING.xxxl,
  },
});
