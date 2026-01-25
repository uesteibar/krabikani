import React, { useEffect } from 'react';
import { StyleSheet, Text, View, TouchableOpacity } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withTiming,
  withDelay,
  Easing,
} from 'react-native-reanimated';

import {
  DASHBOARD_COLORS,
  COLORS,
  SHADOW,
  BORDER_RADIUS,
  SPACING,
  FONT_SIZES,
  MIN_TOUCH_TARGET,
} from '../theme';

export interface ReviewCompletionProps {
  /** Number of items reviewed in this session */
  itemsReviewed: number;
  /** Number of incorrect answers */
  incorrectCount: number;
  /** Whether the reviews were synced online or queued offline */
  syncedOnline: boolean;
  /** Callback when user wants to return to dashboard */
  onReturnToDashboard: () => void;
}

/**
 * ReviewCompletion shows a summary after completing a review session.
 * Displays the number of items reviewed, incorrect count, sync status,
 * and offers to return to dashboard.
 */
export function ReviewCompletion({
  itemsReviewed,
  incorrectCount,
  syncedOnline,
  onReturnToDashboard,
}: ReviewCompletionProps) {
  // Animation shared values
  const iconScale = useSharedValue(0);
  const checkmarkProgress = useSharedValue(0);

  // Start animations on mount
  useEffect(() => {
    // Icon scale bounce: 0 → 1.1 → 1.0
    iconScale.value = withSequence(
      withTiming(1.15, { duration: 300, easing: Easing.out(Easing.back(1.5)) }),
      withTiming(1, { duration: 150, easing: Easing.out(Easing.ease) }),
    );

    // Checkmark stroke animation (starts slightly delayed)
    checkmarkProgress.value = withDelay(
      100,
      withTiming(1, { duration: 400, easing: Easing.out(Easing.ease) }),
    );
  }, [iconScale, checkmarkProgress]);

  // Animated styles for the icon container
  const iconAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: iconScale.value }],
  }));

  // Animated style for checkmark (simulating stroke drawing via opacity)
  const checkmarkAnimatedStyle = useAnimatedStyle(() => ({
    opacity: checkmarkProgress.value,
  }));

  const hasIncorrect = incorrectCount > 0;

  return (
    <View style={styles.container} testID="review-completion">
      {/* Animated success icon */}
      <Animated.View
        style={[styles.iconContainer, iconAnimatedStyle]}
        testID="review-completion-icon"
      >
        <Animated.Text style={[styles.icon, checkmarkAnimatedStyle]}>
          ✓
        </Animated.Text>
      </Animated.View>

      {/* Title */}
      <Text style={styles.title} testID="review-completion-title">
        Reviews Complete!
      </Text>

      {/* Items reviewed count - large 64px */}
      <View style={styles.summaryContainer}>
        <Text style={styles.summaryNumber} testID="review-completion-count">
          {itemsReviewed}
        </Text>
        <Text style={styles.summaryLabel} testID="review-completion-label">
          {itemsReviewed === 1 ? 'item reviewed' : 'items reviewed'}
        </Text>
      </View>

      {/* Incorrect count - only show if > 0, with red tint */}
      {hasIncorrect && (
        <View
          style={styles.incorrectContainer}
          testID="review-completion-incorrect"
        >
          <Text style={styles.incorrectCount}>{incorrectCount}</Text>
          <Text style={styles.incorrectLabel}>
            {incorrectCount === 1 ? 'incorrect answer' : 'incorrect answers'}
          </Text>
        </View>
      )}

      {/* Sync status badge */}
      <View
        style={[
          styles.syncStatusContainer,
          syncedOnline ? styles.syncStatusOnline : styles.syncStatusOffline,
        ]}
        testID="review-completion-sync-status"
      >
        <Text
          style={[
            styles.syncStatusText,
            syncedOnline
              ? styles.syncStatusTextOnline
              : styles.syncStatusTextOffline,
          ]}
        >
          {syncedOnline ? 'Synced' : 'Queued'}
        </Text>
      </View>

      {/* Return to Dashboard button */}
      <View style={styles.actionsContainer}>
        <TouchableOpacity
          style={styles.dashboardButton}
          onPress={onReturnToDashboard}
          activeOpacity={0.8}
          testID="review-completion-dashboard"
        >
          <Text style={styles.dashboardButtonText}>Return to Dashboard</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background.primary,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: SPACING.xxl,
  },
  iconContainer: {
    width: 80,
    height: 80,
    borderRadius: BORDER_RADIUS.full,
    backgroundColor: DASHBOARD_COLORS.reviews,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SPACING.xxl,
    shadowColor: SHADOW.color,
    shadowOffset: SHADOW.offset,
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
  },
  icon: {
    fontSize: 40,
    color: COLORS.text.inverse,
    fontWeight: 'bold',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: COLORS.text.primary,
    marginBottom: SPACING.xxl,
    textAlign: 'center',
  },
  summaryContainer: {
    alignItems: 'center',
    marginBottom: SPACING.lg,
  },
  summaryNumber: {
    fontSize: 64,
    fontWeight: 'bold',
    color: DASHBOARD_COLORS.reviews,
    lineHeight: 72,
  },
  summaryLabel: {
    fontSize: FONT_SIZES.lg,
    color: COLORS.text.secondary,
    marginTop: SPACING.xs,
  },
  incorrectContainer: {
    alignItems: 'center',
    marginBottom: SPACING.lg,
  },
  incorrectCount: {
    fontSize: FONT_SIZES.xxl,
    fontWeight: 'bold',
    color: COLORS.feedback.incorrect,
  },
  incorrectLabel: {
    fontSize: FONT_SIZES.base,
    color: COLORS.feedback.incorrect,
    marginTop: SPACING.xs,
  },
  syncStatusContainer: {
    marginBottom: SPACING.xxxl,
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.sm,
    borderRadius: BORDER_RADIUS.lg,
  },
  syncStatusOnline: {
    backgroundColor: 'rgba(76, 175, 80, 0.15)', // Green with low opacity
  },
  syncStatusOffline: {
    backgroundColor: 'rgba(230, 126, 34, 0.15)', // Amber with low opacity
  },
  syncStatusText: {
    fontSize: FONT_SIZES.sm,
    fontWeight: '600',
  },
  syncStatusTextOnline: {
    color: COLORS.feedback.correct,
  },
  syncStatusTextOffline: {
    color: COLORS.feedback.warning,
  },
  actionsContainer: {
    width: '100%',
    gap: SPACING.md,
  },
  dashboardButton: {
    backgroundColor: DASHBOARD_COLORS.reviews,
    paddingVertical: SPACING.lg,
    minHeight: MIN_TOUCH_TARGET,
    borderRadius: BORDER_RADIUS.md,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: SHADOW.color,
    shadowOffset: SHADOW.offset,
    shadowOpacity: SHADOW.opacity,
    shadowRadius: SHADOW.radius,
    elevation: SHADOW.elevation,
  },
  dashboardButtonText: {
    fontSize: FONT_SIZES.lg,
    fontWeight: 'bold',
    color: COLORS.text.inverse,
  },
});
