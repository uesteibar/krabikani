import React, { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import {
  COLORS,
  DASHBOARD_COLORS,
  SPACING,
  FONT_SIZES,
  BORDER_RADIUS,
} from '../theme';
import type { UpcomingReviewsHourBucket } from '../storage';

export interface UpcomingReviewsChartProps {
  /** Array of hourly review buckets (should be 12 items) */
  data: UpcomingReviewsHourBucket[];
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

const CHART_HEIGHT = 100;
const BAR_MIN_HEIGHT = 4;

/**
 * Displays a bar chart showing upcoming reviews for the next 12 hours.
 * Each bar represents one hour's worth of new reviews (not cumulative).
 */
export function UpcomingReviewsChart({ data }: UpcomingReviewsChartProps) {
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

  return (
    <View style={styles.container} testID="upcoming-reviews-chart">
      <Text style={styles.title}>Upcoming Reviews</Text>
      <View style={styles.chartContainer}>
        <View style={styles.barsContainer}>
          {bars.map((bar, index) => (
            <View
              key={index}
              style={styles.barColumn}
              testID={`chart-bar-${index}`}
            >
              <View style={styles.barWrapper}>
                {bar.count > 0 ? (
                  <View
                    style={[
                      styles.barOuter,
                      bar.isCurrent && styles.barCurrentBorder,
                      { height: bar.height },
                    ]}
                  >
                    <View style={styles.barFill} />
                    <View style={styles.barGradientOverlay} />
                  </View>
                ) : (
                  <View style={styles.emptyBar} />
                )}
              </View>
              <Text
                style={[styles.hourLabel, bar.isCurrent && styles.currentLabel]}
                numberOfLines={1}
              >
                {bar.label}
              </Text>
            </View>
          ))}
        </View>
      </View>
    </View>
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
});
