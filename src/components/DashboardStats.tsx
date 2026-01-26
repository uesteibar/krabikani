import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import {
  DASHBOARD_COLORS,
  COLORS,
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

const BORDER_WIDTH = 2;

/**
 * Displays the lessons and reviews counts prominently on the dashboard.
 * Uses a minimalistic outlined style with WaniKani-inspired border colors:
 * - Pink/magenta border for lessons (kanji color - associated with new learning)
 * - Purple border for reviews (vocabulary color - associated with practice)
 */
export function DashboardStats({
  lessonsCount,
  reviewsCount,
  onLessonsPress,
  onReviewsPress,
}: DashboardStatsProps) {
  const lessonsEmpty = lessonsCount === 0;
  const reviewsEmpty = reviewsCount === 0;

  return (
    <View style={styles.container} testID="dashboard-stats">
      <TouchableOpacity
        style={[
          styles.statBox,
          styles.lessonsBox,
          lessonsEmpty && styles.emptyBox,
        ]}
        onPress={onLessonsPress}
        disabled={!onLessonsPress || lessonsEmpty}
        activeOpacity={!lessonsEmpty && onLessonsPress ? 0.7 : 1}
        testID="lessons-button"
      >
        <Text
          style={[
            styles.countText,
            styles.lessonsCountText,
            lessonsEmpty && styles.emptyCountText,
          ]}
          testID="lessons-count"
        >
          {lessonsCount}
        </Text>
        <Text
          style={[styles.labelText, lessonsEmpty && styles.emptyLabelText]}
        >
          Lessons
        </Text>
      </TouchableOpacity>
      <TouchableOpacity
        style={[
          styles.statBox,
          styles.reviewsBox,
          reviewsEmpty && styles.emptyBox,
        ]}
        onPress={onReviewsPress}
        disabled={!onReviewsPress || reviewsEmpty}
        activeOpacity={!reviewsEmpty && onReviewsPress ? 0.7 : 1}
        testID="reviews-button"
      >
        <Text
          style={[
            styles.countText,
            styles.reviewsCountText,
            reviewsEmpty && styles.emptyCountText,
          ]}
          testID="reviews-count"
        >
          {reviewsCount}
        </Text>
        <Text
          style={[styles.labelText, reviewsEmpty && styles.emptyLabelText]}
        >
          Reviews
        </Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: SPACING.md,
    paddingVertical: SPACING.lg,
    paddingHorizontal: SPACING.lg,
    width: '100%',
  },
  statBox: {
    flex: 1,
    height: 100,
    minHeight: MIN_TOUCH_TARGET,
    borderRadius: BORDER_RADIUS.lg,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.background.primary,
    borderWidth: BORDER_WIDTH,
  },
  lessonsBox: {
    borderColor: DASHBOARD_COLORS.lessons,
  },
  reviewsBox: {
    borderColor: DASHBOARD_COLORS.reviews,
  },
  emptyBox: {
    borderColor: COLORS.border.medium,
  },
  countText: {
    fontSize: FONT_SIZES.xxxl + 4, // 36px
    fontWeight: 'bold',
  },
  lessonsCountText: {
    color: DASHBOARD_COLORS.lessons,
  },
  reviewsCountText: {
    color: DASHBOARD_COLORS.reviews,
  },
  emptyCountText: {
    color: COLORS.text.tertiary,
  },
  labelText: {
    fontSize: FONT_SIZES.sm,
    fontWeight: '600',
    color: COLORS.text.secondary,
    marginTop: SPACING.xs,
  },
  emptyLabelText: {
    color: COLORS.text.tertiary,
  },
});
