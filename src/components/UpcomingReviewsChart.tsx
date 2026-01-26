import React, { useMemo, useEffect, useState, useCallback } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  AccessibilityInfo,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withDelay,
  withTiming,
  Easing,
} from 'react-native-reanimated';

import {
  COLORS,
  DASHBOARD_COLORS,
  SPACING,
  FONT_SIZES,
  BORDER_RADIUS,
} from '../theme';
import type { UpcomingReviewsHourBucket } from '../storage';

// Animation constants
const BAR_ANIMATION_DURATION = 300;
const BAR_STAGGER_DELAY = 50;

export interface UpcomingReviewsChartProps {
  /** Array of hourly review buckets (should be 12 items) */
  data: UpcomingReviewsHourBucket[];
  /** Next review time (for empty state display) */
  nextReviewAt?: Date | null;
}

/**
 * Format hour for display (e.g., "2pm", "12am")
 */
function formatHour(date: Date): string {
  const hours = date.getHours();
  if (hours === 0) return '12am';
  if (hours === 12) return '12pm';
  if (hours < 12) return `${hours}am`;
  return `${hours - 12}pm`;
}

/**
 * Check if an hour is the current hour
 */
function isCurrentHour(date: Date): boolean {
  const now = new Date();
  return (
    date.getFullYear() === now.getFullYear() &&
    date.getMonth() === now.getMonth() &&
    date.getDate() === now.getDate() &&
    date.getHours() === now.getHours()
  );
}

/**
 * Format relative time for empty state (e.g., "in 2 hours", "in 2 days")
 */
function formatRelativeTime(date: Date): string {
  const now = new Date();
  const diffMs = date.getTime() - now.getTime();
  const diffMinutes = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffMinutes < 1) return 'soon';
  if (diffMinutes < 60) return `in ${diffMinutes} ${diffMinutes === 1 ? 'minute' : 'minutes'}`;
  if (diffHours < 24) return `in ${diffHours} ${diffHours === 1 ? 'hour' : 'hours'}`;
  return `in ${diffDays} ${diffDays === 1 ? 'day' : 'days'}`;
}

const CHART_HEIGHT = 100;
const BAR_MIN_HEIGHT = 4;

interface AnimatedBarProps {
  height: number;
  index: number;
  isCurrent: boolean;
  label: string;
  count: number;
  reduceMotion: boolean;
  onPress: (index: number, count: number, label: string) => void;
}

/**
 * Individual animated bar component
 */
function AnimatedBar({
  height,
  index,
  isCurrent,
  label,
  count,
  reduceMotion,
  onPress,
}: AnimatedBarProps) {
  const animatedHeight = useSharedValue(reduceMotion ? height : 0);

  useEffect(() => {
    if (reduceMotion) {
      animatedHeight.value = height;
      return;
    }

    // Animate with staggered delay
    animatedHeight.value = withDelay(
      index * BAR_STAGGER_DELAY,
      withTiming(height, {
        duration: BAR_ANIMATION_DURATION,
        easing: Easing.out(Easing.ease),
      }),
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [height, index, reduceMotion]);

  const animatedStyle = useAnimatedStyle(() => ({
    height: animatedHeight.value,
  }));

  const handlePress = useCallback(() => {
    onPress(index, count, label);
  }, [index, count, label, onPress]);

  return (
    <TouchableOpacity
      style={styles.barColumn}
      testID={`chart-bar-${index}`}
      onPress={handlePress}
      activeOpacity={0.7}
    >
      <View style={styles.barWrapper}>
        {count > 0 ? (
          <Animated.View
            style={[
              styles.barOuter,
              isCurrent && styles.barCurrentBorder,
              animatedStyle,
            ]}
            testID={`chart-bar-fill-${index}`}
          >
            <View style={styles.barFill} />
            <View style={styles.barGradientOverlay} />
          </Animated.View>
        ) : (
          <View style={styles.emptyBar} />
        )}
      </View>
      <Text
        style={[styles.hourLabel, isCurrent && styles.currentLabel]}
        numberOfLines={1}
      >
        {label}
      </Text>
    </TouchableOpacity>
  );
}

/**
 * Displays a bar chart showing upcoming reviews for the next 12 hours.
 * Each bar represents one hour's worth of new reviews (not cumulative).
 *
 * Features:
 * - Staggered bar growth animations
 * - Tooltip on bar tap showing exact count
 * - Empty state when no reviews in next 12 hours
 * - Respects reduced motion accessibility settings
 */
export function UpcomingReviewsChart({
  data,
  nextReviewAt,
}: UpcomingReviewsChartProps) {
  // Track reduced motion preference
  const [reduceMotion, setReduceMotion] = useState(false);

  // Track selected bar for tooltip
  const [selectedBar, setSelectedBar] = useState<{
    index: number;
    count: number;
    label: string;
  } | null>(null);

  useEffect(() => {
    // Check initial reduced motion setting
    AccessibilityInfo.isReduceMotionEnabled().then(setReduceMotion);

    // Listen for changes to reduced motion setting
    const subscription = AccessibilityInfo.addEventListener(
      'reduceMotionChanged',
      setReduceMotion,
    );

    return () => {
      subscription.remove();
    };
  }, []);

  // Find the maximum count for scaling
  const maxCount = useMemo(() => {
    const max = Math.max(...data.map(bucket => bucket.count), 1);
    return max;
  }, [data]);

  // Calculate bar heights as percentages
  const bars = useMemo(() => {
    return data.map(bucket => {
      const heightPercent =
        bucket.count > 0 ? (bucket.count / maxCount) * 100 : 0;
      const height = Math.max(
        bucket.count > 0 ? (heightPercent / 100) * CHART_HEIGHT : 0,
        bucket.count > 0 ? BAR_MIN_HEIGHT : 0,
      );
      return {
        ...bucket,
        height,
        label: formatHour(bucket.hour),
        isCurrent: isCurrentHour(bucket.hour),
      };
    });
  }, [data, maxCount]);

  // Check if there are any reviews in the next 12 hours
  const hasUpcomingReviews = useMemo(() => {
    return data.some(bucket => bucket.count > 0);
  }, [data]);

  const handleBarPress = useCallback(
    (index: number, count: number, label: string) => {
      if (count > 0) {
        setSelectedBar(prev =>
          prev?.index === index ? null : { index, count, label },
        );
      } else {
        setSelectedBar(null);
      }
    },
    [],
  );

  // Dismiss tooltip when tapping outside
  const handleContainerPress = useCallback(() => {
    setSelectedBar(null);
  }, []);

  // Empty state - no reviews in next 12 hours
  if (!hasUpcomingReviews && data.length > 0) {
    return (
      <View style={styles.container} testID="upcoming-reviews-chart">
        <Text style={styles.title}>Upcoming Reviews</Text>
        <View style={styles.emptyStateContainer}>
          <Text style={styles.emptyStateIcon}>🎉</Text>
          <Text style={styles.emptyStateTitle}>All caught up!</Text>
          <Text style={styles.emptyStateMessage}>
            No reviews in the next 12 hours
          </Text>
          {nextReviewAt && (
            <Text
              style={styles.nextReviewText}
              testID="next-review-time"
            >
              Next review {formatRelativeTime(nextReviewAt)}
            </Text>
          )}
        </View>
      </View>
    );
  }

  return (
    <TouchableOpacity
      style={styles.container}
      testID="upcoming-reviews-chart"
      onPress={handleContainerPress}
      activeOpacity={1}
    >
      <Text style={styles.title}>Upcoming Reviews</Text>

      {/* Tooltip */}
      {selectedBar && (
        <View style={styles.tooltipContainer} testID="chart-tooltip">
          <Text style={styles.tooltipText}>
            {selectedBar.count} {selectedBar.count === 1 ? 'review' : 'reviews'}{' '}
            at {selectedBar.label}
          </Text>
        </View>
      )}

      <View style={styles.chartContainer}>
        <View style={styles.barsContainer}>
          {bars.map((bar, index) => (
            <AnimatedBar
              key={index}
              index={index}
              height={bar.height}
              isCurrent={bar.isCurrent}
              label={bar.label}
              count={bar.count}
              reduceMotion={reduceMotion}
              onPress={handleBarPress}
            />
          ))}
        </View>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.lg,
  },
  title: {
    fontSize: FONT_SIZES.sm,
    fontWeight: '600',
    color: COLORS.text.secondary,
    marginBottom: SPACING.sm,
    textAlign: 'center',
  },
  chartContainer: {
    backgroundColor: COLORS.background.secondary,
    borderRadius: BORDER_RADIUS.md,
    padding: SPACING.md,
  },
  barsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    height: CHART_HEIGHT + 24, // Chart height + label space
  },
  barColumn: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'flex-end',
    height: '100%',
  },
  barWrapper: {
    flex: 1,
    justifyContent: 'flex-end',
    alignItems: 'center',
    width: '100%',
    paddingHorizontal: 2,
  },
  barOuter: {
    width: '80%',
    borderRadius: BORDER_RADIUS.sm,
    overflow: 'hidden',
  },
  barCurrentBorder: {
    borderWidth: 2,
    borderColor: COLORS.neutral.white,
    shadowColor: DASHBOARD_COLORS.reviews,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 4,
    elevation: 4,
  },
  barFill: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: DASHBOARD_COLORS.reviews,
  },
  barGradientOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.15)',
    top: '50%',
  },
  emptyBar: {
    width: '80%',
    height: 2,
    backgroundColor: COLORS.neutral.gray300,
    borderRadius: 1,
  },
  hourLabel: {
    fontSize: FONT_SIZES.xs - 2, // 10px for compact labels
    color: COLORS.text.tertiary,
    marginTop: SPACING.xs,
  },
  currentLabel: {
    color: DASHBOARD_COLORS.reviews,
    fontWeight: '600',
  },
  tooltipContainer: {
    position: 'absolute',
    top: SPACING.md + SPACING.sm + 16, // Below title
    left: 0,
    right: 0,
    zIndex: 10,
    alignItems: 'center',
  },
  tooltipText: {
    backgroundColor: COLORS.neutral.gray800,
    color: COLORS.text.inverse,
    fontSize: FONT_SIZES.sm,
    fontWeight: '500',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: BORDER_RADIUS.md,
    overflow: 'hidden',
  },
  emptyStateContainer: {
    backgroundColor: COLORS.background.secondary,
    borderRadius: BORDER_RADIUS.md,
    padding: SPACING.xl,
    alignItems: 'center',
  },
  emptyStateIcon: {
    fontSize: 32,
    marginBottom: SPACING.sm,
  },
  emptyStateTitle: {
    fontSize: FONT_SIZES.lg,
    fontWeight: '600',
    color: COLORS.text.primary,
    marginBottom: SPACING.xs,
  },
  emptyStateMessage: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.text.secondary,
    textAlign: 'center',
  },
  nextReviewText: {
    fontSize: FONT_SIZES.sm,
    color: DASHBOARD_COLORS.reviews,
    fontWeight: '500',
    marginTop: SPACING.md,
  },
});
