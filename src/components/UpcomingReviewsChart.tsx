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
  /** Next review time (for empty state display) */
  nextReviewAt?: Date | null;
  /** Number of reviews currently pending (included in cumulative totals) */
  currentPendingCount?: number;
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
  if (diffMinutes < 60)
    return `in ${diffMinutes} ${diffMinutes === 1 ? 'minute' : 'minutes'}`;
  if (diffHours < 24)
    return `in ${diffHours} ${diffHours === 1 ? 'hour' : 'hours'}`;
  return `in ${diffDays} ${diffDays === 1 ? 'day' : 'days'}`;
}

interface RowData {
  hour: Date;
  label: string;
  newCount: number;
  totalCount: number;
  isCurrent: boolean;
}

/**
 * Displays a full-width grid showing upcoming reviews for the next 12 hours.
 * Three columns: time on left, "+X (Y)" in middle, and bar chart on right.
 *
 * Example: "2pm    +35 (50)    [████████░░░░░░]"
 */
export function UpcomingReviewsChart({
  data,
  nextReviewAt,
  currentPendingCount = 0,
}: UpcomingReviewsChartProps) {
  // Calculate rows with cumulative totals (starting from current pending reviews)
  const rows: RowData[] = useMemo(() => {
    let cumulative = currentPendingCount;
    return data.map(bucket => {
      cumulative += bucket.count;
      return {
        hour: bucket.hour,
        label: formatHour(bucket.hour),
        newCount: bucket.count,
        totalCount: cumulative,
        isCurrent: isCurrentHour(bucket.hour),
      };
    });
  }, [data, currentPendingCount]);

  // Find max new count for bar scaling (bars represent new reviews per hour, not cumulative)
  const maxNew = useMemo(() => {
    if (rows.length === 0) return 1;
    const max = Math.max(...rows.map(r => r.newCount));
    return max > 0 ? max : 1;
  }, [rows]);

  // Check if there are any reviews in the next 12 hours
  const hasUpcomingReviews = useMemo(() => {
    return data.some(bucket => bucket.count > 0);
  }, [data]);

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
            <Text style={styles.nextReviewText} testID="next-review-time">
              Next review {formatRelativeTime(nextReviewAt)}
            </Text>
          )}
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container} testID="upcoming-reviews-chart">
      <Text style={styles.title}>Upcoming Reviews</Text>
      <View style={styles.gridContainer}>
        {rows.map((row, index) => {
          // Bar width is based on new reviews per hour (not cumulative total)
          const barWidthPercent =
            row.newCount > 0 ? (row.newCount / maxNew) * 100 : 0;

          return (
            <View
              key={index}
              style={[styles.row, row.isCurrent && styles.currentRow]}
              testID={`review-row-${index}`}
            >
              {/* Time column */}
              <Text
                style={[styles.timeText, row.isCurrent && styles.currentText]}
              >
                {row.label}
              </Text>

              {/* Count column */}
              <View style={styles.countColumn}>
                {row.newCount > 0 ? (
                  <Text style={styles.countText}>
                    <Text
                      style={[
                        styles.newCount,
                        row.isCurrent && styles.currentText,
                      ]}
                    >
                      +{row.newCount}
                    </Text>
                    <Text style={styles.totalCount}> ({row.totalCount})</Text>
                  </Text>
                ) : (
                  <Text style={styles.noNewCount}>-</Text>
                )}
              </View>

              {/* Bar chart column */}
              <View style={styles.barContainer}>
                <View
                  style={[
                    styles.bar,
                    {
                      width: `${barWidthPercent}%`,
                      backgroundColor: row.isCurrent
                        ? DASHBOARD_COLORS.reviews
                        : DASHBOARD_COLORS.reviews + '80',
                    },
                  ]}
                  testID={`review-bar-${index}`}
                />
              </View>
            </View>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.lg,
    width: '100%',
  },
  title: {
    fontSize: FONT_SIZES.sm,
    fontWeight: '600',
    color: COLORS.text.secondary,
    marginBottom: SPACING.sm,
    textAlign: 'center',
  },
  gridContainer: {
    backgroundColor: COLORS.background.secondary,
    borderRadius: BORDER_RADIUS.md,
    padding: SPACING.sm,
    width: '100%',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: SPACING.xs,
    paddingHorizontal: SPACING.sm,
    borderRadius: BORDER_RADIUS.sm,
  },
  currentRow: {
    backgroundColor: DASHBOARD_COLORS.reviews + '15',
  },
  timeText: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.text.secondary,
    fontWeight: '500',
    width: 45,
  },
  countColumn: {
    width: 70,
    alignItems: 'flex-end',
    marginRight: SPACING.sm,
  },
  countText: {
    fontSize: FONT_SIZES.sm,
  },
  currentText: {
    color: DASHBOARD_COLORS.reviews,
    fontWeight: '600',
  },
  newCount: {
    fontWeight: '600',
    color: DASHBOARD_COLORS.reviews,
  },
  totalCount: {
    color: COLORS.text.tertiary,
    fontSize: FONT_SIZES.xs,
  },
  noNewCount: {
    color: COLORS.text.tertiary,
    fontSize: FONT_SIZES.sm,
  },
  barContainer: {
    flex: 1,
    height: 8,
    backgroundColor: '#E8E8E8', // Light gray for bar background
    borderRadius: 4,
    overflow: 'hidden',
  },
  bar: {
    height: '100%',
    borderRadius: 4,
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
