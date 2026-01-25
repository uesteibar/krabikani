import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

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
  const totalPending = pendingLessonsCount + pendingReviewsCount;

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
      <Text style={styles.text}>
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
    backgroundColor: '#fff3e0',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
    marginTop: 12,
    alignItems: 'center',
  },
  text: {
    fontSize: 14,
    color: '#e65100',
    fontWeight: '500',
  },
  subtext: {
    fontSize: 12,
    color: '#f57c00',
    marginTop: 2,
  },
});
