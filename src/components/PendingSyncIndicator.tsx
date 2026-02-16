import React, { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { COLORS, SPACING, FONT_SIZES, BORDER_RADIUS } from '../theme';
import { useTheme } from '../theme/ThemeContext';

export interface PendingSyncIndicatorProps {
  pendingLessonsCount: number;
  pendingReviewsCount: number;
}

/**
 * Shows an indicator when there are pending lessons or reviews
 * waiting to be synced with WaniKani.
 */
export function PendingSyncIndicator({
  pendingLessonsCount,
  pendingReviewsCount,
}: PendingSyncIndicatorProps) {
  const { colors } = useTheme();
  const totalPending = pendingLessonsCount + pendingReviewsCount;

  const dynamicStyles = useMemo(
    () => ({
      text: {
        color: colors.status.pendingSyncText,
      },
    }),
    [colors],
  );

  if (totalPending === 0) {
    return null;
  }

  // Build descriptive text
  const parts: string[] = [];
  if (pendingLessonsCount > 0) {
    parts.push(
      `${pendingLessonsCount} ${pendingLessonsCount === 1 ? 'lesson' : 'lessons'}`,
    );
  }
  if (pendingReviewsCount > 0) {
    parts.push(
      `${pendingReviewsCount} ${pendingReviewsCount === 1 ? 'review' : 'reviews'}`,
    );
  }
  const itemsText = parts.join(' and ');

  return (
    <View style={styles.container} testID="pending-sync-indicator">
      <Text style={[styles.text, dynamicStyles.text]}>
        {itemsText} pending sync
      </Text>
      <Text style={styles.subtext}>
        Will sync automatically when online
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: COLORS.status.pendingSyncBackground,
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.lg,
    borderRadius: BORDER_RADIUS.md,
    marginTop: SPACING.md,
    alignItems: 'center',
  },
  text: {
    fontSize: FONT_SIZES.sm,
    fontWeight: '500',
  },
  subtext: {
    fontSize: FONT_SIZES.xs,
    color: COLORS.status.pendingSync,
    marginTop: 2,
  },
});
