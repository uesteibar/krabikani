import React from 'react';
import { StyleSheet, Text, View, TouchableOpacity } from 'react-native';

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
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  iconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#4caf50',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
  },
  icon: {
    fontSize: 40,
    color: '#fff',
    fontWeight: 'bold',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 24,
    textAlign: 'center',
  },
  summaryContainer: {
    alignItems: 'center',
    marginBottom: 16,
  },
  summaryNumber: {
    fontSize: 64,
    fontWeight: 'bold',
    color: '#e8a4c9', // WaniKani pink for lessons
    lineHeight: 72,
  },
  summaryLabel: {
    fontSize: 18,
    color: '#666',
    marginTop: 4,
  },
  syncStatusContainer: {
    marginBottom: 32,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 16,
    backgroundColor: '#f5f5f5',
  },
  syncStatusOnline: {
    fontSize: 14,
    color: '#4caf50',
    fontWeight: '500',
  },
  syncStatusOffline: {
    fontSize: 14,
    color: '#ff9800',
    fontWeight: '500',
  },
  actionsContainer: {
    width: '100%',
    gap: 12,
  },
  continueButton: {
    backgroundColor: '#e8a4c9', // WaniKani pink for lessons
    paddingVertical: 16,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  continueButtonText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
  },
  dashboardButton: {
    backgroundColor: '#666',
    paddingVertical: 16,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  dashboardButtonSecondary: {
    backgroundColor: 'transparent',
    shadowOpacity: 0,
    elevation: 0,
    borderWidth: 2,
    borderColor: '#ddd',
  },
  dashboardButtonText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
  },
  dashboardButtonTextSecondary: {
    color: '#666',
  },
});
