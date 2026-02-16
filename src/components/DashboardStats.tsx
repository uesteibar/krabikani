import React, { useMemo } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { MaterialDesignIcons } from '@react-native-vector-icons/material-design-icons';

import {
  DASHBOARD_COLORS,
  BORDER_RADIUS,
  SPACING,
  FONT_SIZES,
  MIN_TOUCH_TARGET,
} from '../theme';
import { useTheme } from '../theme/ThemeContext';

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
  const { colors } = useTheme();
  const lessonsEmpty = lessonsCount === 0;
  const reviewsEmpty = reviewsCount === 0;

  const dynamicStyles = useMemo(
    () => ({
      statBox: {
        backgroundColor: colors.background.primary,
      },
      emptyBox: {
        borderColor: colors.border.medium,
      },
      emptyCountText: {
        color: colors.text.tertiary,
      },
      labelText: {
        color: colors.text.secondary,
      },
      emptyLabelText: {
        color: colors.text.tertiary,
      },
    }),
    [colors],
  );

  return (
    <View style={styles.container} testID="dashboard-stats">
      <TouchableOpacity
        style={[
          styles.statBox,
          dynamicStyles.statBox,
          styles.lessonsBox,
          lessonsEmpty && dynamicStyles.emptyBox,
        ]}
        onPress={onLessonsPress}
        disabled={!onLessonsPress || lessonsEmpty}
        activeOpacity={!lessonsEmpty && onLessonsPress ? 0.7 : 1}
        testID="lessons-button"
      >
        <Text
          style={[
            styles.labelText,
            dynamicStyles.labelText,
            lessonsEmpty && dynamicStyles.emptyLabelText,
          ]}
          testID="lessons-count"
        >
          <Text
            style={[
              styles.countText,
              lessonsEmpty
                ? dynamicStyles.emptyCountText
                : styles.lessonsCountText,
            ]}
          >
            {lessonsCount}
          </Text>
          {' available lessons'}
        </Text>
        {!lessonsEmpty && (
          <MaterialDesignIcons
            name="chevron-right"
            size={FONT_SIZES.xxxl}
            color={DASHBOARD_COLORS.lessons}
          />
        )}
      </TouchableOpacity>
      <TouchableOpacity
        style={[
          styles.statBox,
          dynamicStyles.statBox,
          styles.reviewsBox,
          reviewsEmpty && dynamicStyles.emptyBox,
        ]}
        onPress={onReviewsPress}
        disabled={!onReviewsPress || reviewsEmpty}
        activeOpacity={!reviewsEmpty && onReviewsPress ? 0.7 : 1}
        testID="reviews-button"
      >
        <Text
          style={[
            styles.labelText,
            dynamicStyles.labelText,
            reviewsEmpty && dynamicStyles.emptyLabelText,
          ]}
          testID="reviews-count"
        >
          <Text
            style={[
              styles.countText,
              reviewsEmpty
                ? dynamicStyles.emptyCountText
                : styles.reviewsCountText,
            ]}
          >
            {reviewsCount}
          </Text>
          {' pending reviews'}
        </Text>
        {!reviewsEmpty && (
          <MaterialDesignIcons
            name="chevron-right"
            size={FONT_SIZES.xxxl}
            color={DASHBOARD_COLORS.reviews}
          />
        )}
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'column',
    gap: SPACING.md,
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.lg,
    width: '100%',
  },
  statBox: {
    width: '100%',
    minHeight: MIN_TOUCH_TARGET,
    borderRadius: BORDER_RADIUS.lg,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: SPACING.xl,
    paddingVertical: SPACING.md,
    borderWidth: BORDER_WIDTH,
  },
  lessonsBox: {
    borderColor: DASHBOARD_COLORS.lessons,
  },
  reviewsBox: {
    borderColor: DASHBOARD_COLORS.reviews,
  },
  countText: {
    fontSize: FONT_SIZES.lg,
    fontWeight: 'bold',
  },
  lessonsCountText: {
    color: DASHBOARD_COLORS.lessons,
  },
  reviewsCountText: {
    color: DASHBOARD_COLORS.reviews,
  },
  labelText: {
    fontSize: FONT_SIZES.lg,
    fontWeight: '600',
  },
});
