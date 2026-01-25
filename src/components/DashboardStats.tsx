import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import {
  DASHBOARD_COLORS,
  COLORS,
  SHADOW,
  BORDER_RADIUS,
  SPACING,
  FONT_SIZES,
  MIN_TOUCH_TARGET,
} from '../theme';

export interface DashboardStatsProps {
  lessonsCount: number;
  reviewsCount: number;
  onLessonsPress?: () => void;
  onReviewsPress?: () => void;
}

/**
 * Displays the lessons and reviews counts prominently on the dashboard.
 * Uses WaniKani-inspired colors:
 * - Pink/magenta for lessons (kanji color - associated with new learning)
 * - Purple for reviews (vocabulary color - associated with practice)
 */
export function DashboardStats({
  lessonsCount,
  reviewsCount,
  onLessonsPress,
  onReviewsPress,
}: DashboardStatsProps) {
  return (
    <View style={styles.container} testID="dashboard-stats">
      <TouchableOpacity
        style={styles.statCard}
        onPress={onLessonsPress}
        disabled={!onLessonsPress || lessonsCount === 0}
        activeOpacity={lessonsCount > 0 && onLessonsPress ? 0.7 : 1}
        testID="lessons-button">
        <View style={[styles.statBox, styles.lessonsBox, lessonsCount === 0 && styles.emptyBox]}>
          <Text style={styles.countText} testID="lessons-count">
            {lessonsCount}
          </Text>
        </View>
        <Text style={styles.labelText}>Lessons</Text>
      </TouchableOpacity>
      <TouchableOpacity
        style={styles.statCard}
        onPress={onReviewsPress}
        disabled={!onReviewsPress || reviewsCount === 0}
        activeOpacity={reviewsCount > 0 && onReviewsPress ? 0.7 : 1}
        testID="reviews-button">
        <View style={[styles.statBox, styles.reviewsBox, reviewsCount === 0 && styles.emptyBox]}>
          <Text style={styles.countText} testID="reviews-count">
            {reviewsCount}
          </Text>
        </View>
        <Text style={styles.labelText}>Reviews</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: SPACING.xxl,
    paddingVertical: SPACING.lg,
  },
  statCard: {
    alignItems: 'center',
  },
  statBox: {
    width: 100,
    height: 100,
    minWidth: MIN_TOUCH_TARGET,
    minHeight: MIN_TOUCH_TARGET,
    borderRadius: BORDER_RADIUS.lg,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: SPACING.sm,
    // Shadow for elevation
    shadowColor: SHADOW.color,
    shadowOffset: SHADOW.offset,
    shadowOpacity: SHADOW.opacity,
    shadowRadius: SHADOW.radius,
    elevation: SHADOW.elevation,
  },
  lessonsBox: {
    backgroundColor: DASHBOARD_COLORS.lessons,
  },
  reviewsBox: {
    backgroundColor: DASHBOARD_COLORS.reviews,
  },
  emptyBox: {
    opacity: 0.5,
  },
  countText: {
    fontSize: FONT_SIZES.xxxl + 4, // 36px
    fontWeight: 'bold',
    color: COLORS.text.inverse,
  },
  labelText: {
    fontSize: FONT_SIZES.base,
    fontWeight: '600',
    color: COLORS.text.primary,
  },
});
