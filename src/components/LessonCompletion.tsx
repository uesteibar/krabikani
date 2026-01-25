import React from 'react';
import { StyleSheet, Text, View, TouchableOpacity } from 'react-native';

import {
  DASHBOARD_COLORS,
  COLORS,
  SHADOW,
  BORDER_RADIUS,
  SPACING,
  FONT_SIZES,
  MIN_TOUCH_TARGET,
} from '../theme';

export interface LessonCompletionProps {
  /** Number of items learned in this session */
  itemsLearned: number;
  /** Whether the lessons were synced online or queued offline */
  syncedOnline: boolean;
  /** Number of lessons available in the next batch (0 if none) */
  moreLessonsAvailable: number;
  /** Callback when user wants to return to dashboard */
  onReturnToDashboard: () => void;
  /** Callback when user wants to continue with next batch */
  onContinueLessons?: () => void;
}

/**
 * LessonCompletion shows a summary after completing a lesson batch.
 * Displays the number of items learned and offers to continue or return to dashboard.
 */
export function LessonCompletion({
  itemsLearned,
  syncedOnline,
  moreLessonsAvailable,
  onReturnToDashboard,
  onContinueLessons,
}: LessonCompletionProps) {
  const showContinueButton = moreLessonsAvailable > 0 && onContinueLessons;

  return (
    <View style={styles.container} testID="lesson-completion">
      {/* Success icon */}
      <View style={styles.iconContainer} testID="lesson-completion-icon">
        <Text style={styles.icon}>✓</Text>
      </View>

      {/* Title */}
      <Text style={styles.title} testID="lesson-completion-title">
        Lessons Complete!
      </Text>

      {/* Summary */}
      <View style={styles.summaryContainer}>
        <Text style={styles.summaryNumber} testID="lesson-completion-count">
          {itemsLearned}
        </Text>
        <Text style={styles.summaryLabel} testID="lesson-completion-label">
          {itemsLearned === 1 ? 'item learned' : 'items learned'}
        </Text>
      </View>

      {/* Sync status */}
      <View style={styles.syncStatusContainer} testID="lesson-completion-sync-status">
        {syncedOnline ? (
          <Text style={styles.syncStatusOnline}>
            Synced with WaniKani
          </Text>
        ) : (
          <Text style={styles.syncStatusOffline}>
            Queued for sync when online
          </Text>
        )}
      </View>

      {/* Actions */}
      <View style={styles.actionsContainer}>
        {showContinueButton && (
          <TouchableOpacity
            style={styles.continueButton}
            onPress={onContinueLessons}
            activeOpacity={0.8}
            testID="lesson-completion-continue"
          >
            <Text style={styles.continueButtonText}>
              Continue ({moreLessonsAvailable} more)
            </Text>
          </TouchableOpacity>
        )}

        <TouchableOpacity
          style={[
            styles.dashboardButton,
            showContinueButton && styles.dashboardButtonSecondary,
          ]}
          onPress={onReturnToDashboard}
          activeOpacity={0.8}
          testID="lesson-completion-dashboard"
        >
          <Text
            style={[
              styles.dashboardButtonText,
              showContinueButton && styles.dashboardButtonTextSecondary,
            ]}
          >
            Return to Dashboard
          </Text>
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
    backgroundColor: COLORS.feedback.correct,
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
    color: DASHBOARD_COLORS.lessons,
    lineHeight: 72,
  },
  summaryLabel: {
    fontSize: FONT_SIZES.lg,
    color: COLORS.text.secondary,
    marginTop: SPACING.xs,
  },
  syncStatusContainer: {
    marginBottom: SPACING.xxxl,
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.sm,
    borderRadius: BORDER_RADIUS.lg,
    backgroundColor: COLORS.neutral.gray100,
  },
  syncStatusOnline: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.feedback.correct,
    fontWeight: '500',
  },
  syncStatusOffline: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.feedback.warning,
    fontWeight: '500',
  },
  actionsContainer: {
    width: '100%',
    gap: SPACING.md,
  },
  continueButton: {
    backgroundColor: DASHBOARD_COLORS.lessons,
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
  continueButtonText: {
    fontSize: FONT_SIZES.lg,
    fontWeight: 'bold',
    color: COLORS.text.inverse,
  },
  dashboardButton: {
    backgroundColor: COLORS.neutral.gray600,
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
  dashboardButtonSecondary: {
    backgroundColor: 'transparent',
    shadowOpacity: 0,
    elevation: 0,
    borderWidth: 2,
    borderColor: COLORS.border.medium,
  },
  dashboardButtonText: {
    fontSize: FONT_SIZES.lg,
    fontWeight: 'bold',
    color: COLORS.text.inverse,
  },
  dashboardButtonTextSecondary: {
    color: COLORS.text.secondary,
  },
});
