import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { COLORS, SPACING, FONT_SIZES } from '../theme';

export interface NextReviewIndicatorProps {
  /**
   * The timestamp of the next available review.
   * If null, no upcoming reviews are scheduled.
   */
  nextReviewAt: Date | null;
  /**
   * Current number of available reviews.
   * If > 0, shows "Reviews available now" instead of countdown.
   */
  reviewsAvailable?: number;
}

/**
 * Formats the time until the next review in a human-readable format.
 * Examples: "in 2 hours", "in 30 minutes", "in 1 day"
 */
export function formatTimeUntil(date: Date): string {
  const now = new Date();
  const diffMs = date.getTime() - now.getTime();

  // If the date is in the past, return immediately
  if (diffMs <= 0) {
    return 'now';
  }

  const diffMinutes = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays > 0) {
    return `in ${diffDays} ${diffDays === 1 ? 'day' : 'days'}`;
  }
  if (diffHours > 0) {
    return `in ${diffHours} ${diffHours === 1 ? 'hour' : 'hours'}`;
  }
  if (diffMinutes > 0) {
    return `in ${diffMinutes} ${diffMinutes === 1 ? 'minute' : 'minutes'}`;
  }
  return 'in less than a minute';
}

/**
 * Displays when the next review will be available.
 * Only shows countdown if no reviews are currently available.
 * Returns null when reviews are available (the count is shown elsewhere).
 */
export function NextReviewIndicator({
  nextReviewAt,
  reviewsAvailable = 0,
}: NextReviewIndicatorProps) {
  // Don't show anything when reviews are available now
  if (reviewsAvailable > 0) {
    return null;
  }

  const displayText =
    nextReviewAt === null
      ? 'No upcoming reviews'
      : `Next review ${formatTimeUntil(nextReviewAt)}`;

  return (
    <View style={styles.container} testID="next-review-indicator">
      <Text style={styles.text}>{displayText}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.lg,
  },
  text: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.text.secondary,
    textAlign: 'center',
  },
});
