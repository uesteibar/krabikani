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
import { WaniKaniClient } from '../api/wanikaniApi';
import {
  ReviewSession,
  type ReviewItem,
  type ReviewComponentRadical,
  type ItemProgress,
} from '../components';
import {
  getAvailableReviews,
  getSubjectsByIds,
  getApiKey,
  type DatabaseAssignment,
  type DatabaseSubject,
} from '../storage';
import { submitReviews, type ReviewToSubmit } from '../sync';
import { isOnline, startSession, endSession } from '../utils';

type ReviewsScreenNavigationProp = NativeStackNavigationProp<
  RootStackParamList,
  'Reviews'
>;

type ReviewPhase = 'loading' | 'reviewing' | 'syncing' | 'complete' | 'error';

interface ReviewSessionData {
  assignments: DatabaseAssignment[];
  subjects: DatabaseSubject[];
  componentRadicals: Map<number, ReviewComponentRadical>;
}

interface SyncResult {
  submittedCount: number;
  queuedCount: number;
  wasOnline: boolean;
}

/**
 * Converts a DatabaseSubject and DatabaseAssignment to a ReviewItem.
 */
function subjectToReviewItem(
  subject: DatabaseSubject,
  assignment: DatabaseAssignment,
  componentRadicalsMap: Map<number, ReviewComponentRadical>,
): ReviewItem {
  const meanings: Meaning[] = JSON.parse(subject.meanings);
  const readings: Reading[] | KanjiReading[] | null = subject.readings
    ? JSON.parse(subject.readings)
    : null;

  // Parse component_subject_ids and get component radicals for kanji items
  const componentSubjectIds: number[] | undefined = subject.component_subject_ids
    ? JSON.parse(subject.component_subject_ids)
    : undefined;

  const componentRadicals =
    subject.object_type === 'kanji' && componentSubjectIds
      ? componentSubjectIds
          .map(id => componentRadicalsMap.get(id))
          .filter((r): r is ReviewComponentRadical => r !== undefined)
      : undefined;

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
    componentRadicals,
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
  const [syncResult, setSyncResult] = useState<SyncResult | null>(null);

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

      // Collect all component subject IDs from kanji items
      const componentIds = new Set<number>();
      for (const subject of validSubjects) {
        if (subject.object_type === 'kanji' && subject.component_subject_ids) {
          const ids: number[] = JSON.parse(subject.component_subject_ids);
          ids.forEach(id => componentIds.add(id));
        }
      }

      // Fetch component radicals if any kanji items have components
      let componentRadicals = new Map<number, ReviewComponentRadical>();
      if (componentIds.size > 0) {
        const componentSubjects = await getSubjectsByIds(Array.from(componentIds));
        for (const subject of componentSubjects) {
          if (subject.object_type === 'radical') {
            const meanings: Meaning[] = JSON.parse(subject.meanings);
            const primaryMeaning =
              meanings.find(m => m.primary)?.meaning ?? meanings[0]?.meaning ?? '';
            componentRadicals.set(subject.id, {
              id: subject.id,
              characters: subject.characters,
              meaning: primaryMeaning,
              characterImages: subject.character_images,
            });
          }
        }
      }

      setSessionData({
        assignments: validAssignments,
        subjects: validSubjects,
        componentRadicals,
      });
      setPhase('reviewing');
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Failed to load reviews';
      setErrorMessage(message);
      setPhase('error');
    }
  }, []);

  // Load available reviews on mount and track session state
  useEffect(() => {
    startSession('review');
    loadReviews();

    // End session when component unmounts
    return () => {
      endSession();
    };
  }, [loadReviews]);

  // Convert session data to review items
  const reviewItems = useMemo(() => {
    if (!sessionData) return [];

    return sessionData.subjects.map((subject, index) =>
      subjectToReviewItem(
        subject,
        sessionData.assignments[index],
        sessionData.componentRadicals,
      ),
    );
  }, [sessionData]);

  // Handle session completion - submit reviews to WaniKani API
  const handleSessionComplete = useCallback(async (itemProgress: Map<number, ItemProgress>) => {
    setSessionResults(itemProgress);
    setPhase('syncing');

    // Build reviews to submit from the item progress
    const reviewsToSubmit: ReviewToSubmit[] = [];
    if (sessionData) {
      for (const [subjectId, progress] of itemProgress) {
        // Find the assignment for this subject
        const assignment = sessionData.assignments.find(
          a => a.subject_id === subjectId,
        );
        if (assignment) {
          reviewsToSubmit.push({
            assignmentId: assignment.id,
            subjectId,
            incorrectMeaningAnswers: progress.incorrectMeaningAnswers,
            incorrectReadingAnswers: progress.incorrectReadingAnswers,
          });
        }
      }
    }

    try {
      // Check if online and get API key
      const online = await isOnline();
      const apiKey = await getApiKey();

      // Create client if online with valid API key
      const client = online && apiKey ? new WaniKaniClient(apiKey) : null;

      // Submit reviews (will queue if offline)
      const result = await submitReviews(client, reviewsToSubmit);

      if (result.success) {
        setSyncResult({
          submittedCount: result.submittedCount,
          queuedCount: result.queuedCount,
          wasOnline: client !== null,
        });
        setPhase('complete');
      } else {
        // Submission failed but we still show completion (reviews may be partially submitted)
        setSyncResult({
          submittedCount: result.submittedCount,
          queuedCount: result.queuedCount,
          wasOnline: client !== null,
        });
        setPhase('complete');
      }
    } catch {
      // Even on error, try to queue reviews for later
      try {
        const queueResult = await submitReviews(null, reviewsToSubmit);
        setSyncResult({
          submittedCount: 0,
          queuedCount: queueResult.queuedCount,
          wasOnline: false,
        });
      } catch {
        // Complete without sync result
        setSyncResult(null);
      }
      setPhase('complete');
    }
  }, [sessionData]);

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

  // Render syncing state
  if (phase === 'syncing') {
    return (
      <View style={styles.centerContainer} testID="reviews-screen-syncing">
        <ActivityIndicator size="large" color="#8f5bc4" />
        <Text style={styles.loadingText}>Submitting reviews...</Text>
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

    // Determine sync status message
    let syncStatusMessage: string | null = null;
    if (syncResult) {
      if (syncResult.wasOnline && syncResult.submittedCount > 0) {
        syncStatusMessage = 'Synced with WaniKani';
      } else if (!syncResult.wasOnline && syncResult.queuedCount > 0) {
        syncStatusMessage = 'Queued for sync when online';
      }
    }

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
        {syncStatusMessage && (
          <Text style={styles.syncStatus} testID="reviews-screen-sync-status">
            {syncStatusMessage}
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
  syncStatus: {
    fontSize: 14,
    color: '#4caf50',
    marginTop: 8,
  },
});
