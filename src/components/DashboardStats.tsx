import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

export interface DashboardStatsProps {
  lessonsCount: number;
  reviewsCount: number;
  onLessonsPress?: () => void;
  onReviewsPress?: () => void;
}

/**
 * Displays the lessons and reviews counts prominently on the dashboard.
 * Uses WaniKani-inspired colors:
 * - Pink/magenta for lessons (associated with new learning)
 * - Blue for reviews (associated with vocabulary)
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
    gap: 24,
    paddingVertical: 16,
  },
  statCard: {
    alignItems: 'center',
  },
  statBox: {
    width: 100,
    height: 100,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
    // Shadow for elevation
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  lessonsBox: {
    backgroundColor: '#e8a4c9', // Pink/magenta for lessons
  },
  reviewsBox: {
    backgroundColor: '#8f5bc4', // Purple for reviews
  },
  emptyBox: {
    opacity: 0.5,
  },
  countText: {
    fontSize: 36,
    fontWeight: 'bold',
    color: '#fff',
  },
  labelText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
});
