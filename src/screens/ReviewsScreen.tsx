import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ActivityIndicator,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import type { RootStackParamList } from '../navigation/types';
import type { Meaning, Reading, KanjiReading, AuxiliaryMeaning } from '../api/types';
import {
  ReviewSession,
  type ReviewItem,
  type ItemProgress,
} from '../components';
import {
  getAvailableReviews,
  getSubjectsByIds,
  type DatabaseAssignment,
  type DatabaseSubject,
} from '../storage';

type ReviewsScreenNavigationProp = NativeStackNavigationProp<
  RootStackParamList,
  'Reviews'
>;

type ReviewPhase = 'loading' | 'reviewing' | 'complete' | 'error';

interface ReviewSessionData {
  assignments: DatabaseAssignment[];
  subjects: DatabaseSubject[];
}

/**
 * Converts a DatabaseSubject and DatabaseAssignment to a ReviewItem.
 */
function subjectToReviewItem(
  subject: DatabaseSubject,
  assignment: DatabaseAssignment,
): ReviewItem {
  const meanings: Meaning[] = JSON.parse(subject.meanings);
  const readings: Reading[] | KanjiReading[] | null = subject.readings
    ? JSON.parse(subject.readings)
    : null;

  return {
    id: subject.id,
    assignmentId: assignment.id,
    subjectType: subject.object_type as ReviewItem['subjectType'],
    characters: subject.characters,
    meanings,
    readings,
    meaningMnemonic: subject.meaning_mnemonic,
    readingMnemonic: subject.reading_mnemonic,
    auxiliaryMeanings: [] as AuxiliaryMeaning[],
  };
}

/**
 * ReviewsScreen manages the review session flow:
 * 1. Loading available reviews from local cache
 * 2. Presenting review questions in random order
 * 3. Tracking progress and completion
 */
export function ReviewsScreen() {
  const navigation = useNavigation<ReviewsScreenNavigationProp>();

  const [phase, setPhase] = useState<ReviewPhase>('loading');
  const [sessionData, setSessionData] = useState<ReviewSessionData | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [sessionResults, setSessionResults] = useState<Map<number, ItemProgress> | null>(null);

  const loadReviews = useCallback(async () => {
    try {
      setPhase('loading');
      setErrorMessage(null);

      // Get available reviews from local database
      const assignments = await getAvailableReviews();

      if (assignments.length === 0) {
        setErrorMessage('No reviews available');
        setPhase('error');
        return;
      }

      // Get subject data for the assignments
      const subjectIds = assignments.map(a => a.subject_id);
      const subjects = await getSubjectsByIds(subjectIds);

      // Create a map for quick lookup
      const subjectMap = new Map(subjects.map(s => [s.id, s]));

      // Filter assignments to only those with matching subjects
      const validAssignments = assignments.filter(a => subjectMap.has(a.subject_id));
      const validSubjects = validAssignments.map(a => subjectMap.get(a.subject_id)!);

      if (validAssignments.length === 0) {
        setErrorMessage('No valid reviews found');
        setPhase('error');
        return;
      }

      setSessionData({
        assignments: validAssignments,
        subjects: validSubjects,
      });
      setPhase('reviewing');
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Failed to load reviews';
      setErrorMessage(message);
      setPhase('error');
    }
  }, []);

  // Load available reviews on mount
  useEffect(() => {
    loadReviews();
  }, [loadReviews]);

  // Convert session data to review items
  const reviewItems = useMemo(() => {
    if (!sessionData) return [];

    return sessionData.subjects.map((subject, index) =>
      subjectToReviewItem(subject, sessionData.assignments[index]),
    );
  }, [sessionData]);

  // Handle session completion
  const handleSessionComplete = useCallback((itemProgress: Map<number, ItemProgress>) => {
    setSessionResults(itemProgress);
    setPhase('complete');
  }, []);

  // Handle return to dashboard
  const handleReturnToDashboard = useCallback(() => {
    navigation.goBack();
  }, [navigation]);

  // Render loading state
  if (phase === 'loading') {
    return (
      <View style={styles.centerContainer} testID="reviews-screen-loading">
        <ActivityIndicator size="large" color="#8f5bc4" />
        <Text style={styles.loadingText}>Loading reviews...</Text>
      </View>
    );
  }

  // Render error state
  if (phase === 'error') {
    return (
      <View style={styles.centerContainer} testID="reviews-screen-error">
        <Text style={styles.errorText}>{errorMessage ?? 'An error occurred'}</Text>
        <Text
          style={styles.backLink}
          onPress={handleReturnToDashboard}
          testID="reviews-screen-back"
        >
          Return to Dashboard
        </Text>
      </View>
    );
  }

  // Render completion state
  if (phase === 'complete') {
    const totalItems = sessionResults?.size ?? 0;
    let totalIncorrect = 0;
    sessionResults?.forEach(progress => {
      totalIncorrect += progress.incorrectMeaningAnswers + progress.incorrectReadingAnswers;
    });

    return (
      <View style={styles.centerContainer} testID="reviews-screen-complete">
        <Text style={styles.completeTitle}>Session Complete!</Text>
        <Text style={styles.completeStats}>
          {totalItems} {totalItems === 1 ? 'item' : 'items'} reviewed
        </Text>
        {totalIncorrect > 0 && (
          <Text style={styles.incorrectStats}>
            {totalIncorrect} incorrect {totalIncorrect === 1 ? 'answer' : 'answers'}
          </Text>
        )}
        <Text
          style={styles.backLink}
          onPress={handleReturnToDashboard}
          testID="reviews-screen-back"
        >
          Return to Dashboard
        </Text>
      </View>
    );
  }

  // Render review session
  if (phase === 'reviewing' && sessionData) {
    return (
      <View style={styles.container} testID="reviews-screen">
        <ReviewSession
          items={reviewItems}
          onSessionComplete={handleSessionComplete}
        />
      </View>
    );
  }

  // Fallback (shouldn't reach here)
  return (
    <View style={styles.centerContainer} testID="reviews-screen">
      <Text style={styles.errorText}>Unexpected state</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  centerContainer: {
    flex: 1,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  loadingText: {
    fontSize: 16,
    color: '#666',
    marginTop: 16,
  },
  errorText: {
    fontSize: 16,
    color: '#f44336',
    textAlign: 'center',
    marginBottom: 16,
  },
  backLink: {
    fontSize: 16,
    color: '#007AFF',
    textDecorationLine: 'underline',
    marginTop: 16,
  },
  completeTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 12,
  },
  completeStats: {
    fontSize: 18,
    color: '#666',
    marginBottom: 4,
  },
  incorrectStats: {
    fontSize: 16,
    color: '#f44336',
  },
});
