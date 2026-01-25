import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import React, { useState, useCallback } from 'react';
import {
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  ScrollView,
  RefreshControl,
} from 'react-native';

import { WaniKaniClient } from '../api/wanikaniApi';
import {
  OfflineIndicator,
  LastSyncedIndicator,
  DashboardStats,
  NextReviewIndicator,
} from '../components';
import type { RootStackParamList } from '../navigation/types';
import { getApiKey } from '../storage/secureStorage';
import {
  getSyncStatus,
  getSubjectCount,
  getAvailableLessons,
  getAvailableReviews,
  getNextReviewTime,
} from '../storage';
import { syncSubjects, syncAssignments, getUserLevel } from '../sync';
import { isOnline } from '../utils';

type HomeScreenNavigationProp = NativeStackNavigationProp<
  RootStackParamList,
  'Home'
>;

export interface SyncStatusData {
  lastSyncedAt: Date | null;
  hasCachedData: boolean;
}

export interface DashboardData {
  lessonsCount: number;
  reviewsCount: number;
  nextReviewAt: Date | null;
}

export function HomeScreen() {
  const navigation = useNavigation<HomeScreenNavigationProp>();
  const [syncStatus, setSyncStatus] = useState<SyncStatusData>({
    lastSyncedAt: null,
    hasCachedData: false,
  });
  const [dashboardData, setDashboardData] = useState<DashboardData>({
    lessonsCount: 0,
    reviewsCount: 0,
    nextReviewAt: null,
  });
  const [showOfflineError, setShowOfflineError] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const loadDashboardData = useCallback(async () => {
    try {
      const [status, subjectCount, lessons, reviews, nextReviewTimeStr] =
        await Promise.all([
          getSyncStatus(),
          getSubjectCount(),
          getAvailableLessons(),
          getAvailableReviews(),
          getNextReviewTime(),
        ]);

      const lastSync =
        status?.last_subjects_sync ?? status?.last_assignments_sync;
      const lastSyncedAt = lastSync ? new Date(lastSync) : null;
      const hasCachedData = subjectCount > 0;

      setSyncStatus({ lastSyncedAt, hasCachedData });
      setDashboardData({
        lessonsCount: lessons.length,
        reviewsCount: reviews.length,
        nextReviewAt: nextReviewTimeStr ? new Date(nextReviewTimeStr) : null,
      });

      // Check if we're offline with no cached data
      const online = isOnline();
      setShowOfflineError(!online && !hasCachedData);
    } catch {
      // Database not initialized yet - show offline error if offline
      const online = isOnline();
      setShowOfflineError(!online);
    }
  }, []);

  const refreshData = useCallback(async () => {
    // Only refresh if online
    if (!isOnline()) {
      return;
    }

    setRefreshing(true);
    try {
      const apiKey = await getApiKey();
      if (!apiKey) {
        // No API key, can't refresh
        setRefreshing(false);
        return;
      }

      const client = new WaniKaniClient(apiKey);
      const userLevel = await getUserLevel(client);

      // Sync subjects and assignments in parallel
      await Promise.all([
        syncSubjects(client, { maxLevel: userLevel }),
        syncAssignments(client),
      ]);

      // Reload dashboard data after sync
      await loadDashboardData();
    } catch {
      // Sync failed, but dashboard data is already loaded from cache
    } finally {
      setRefreshing(false);
    }
  }, [loadDashboardData]);

  useFocusEffect(
    useCallback(() => {
      loadDashboardData();
    }, [loadDashboardData]),
  );

  const handleLessonsPress = useCallback(() => {
    if (dashboardData.lessonsCount > 0) {
      navigation.navigate('Lessons');
    }
  }, [navigation, dashboardData.lessonsCount]);

  const handleReviewsPress = useCallback(() => {
    if (dashboardData.reviewsCount > 0) {
      navigation.navigate('Reviews');
    }
  }, [navigation, dashboardData.reviewsCount]);

  if (showOfflineError) {
    return (
      <View style={styles.container}>
        <OfflineIndicator />
        <View style={styles.errorContainer}>
          <Text style={styles.errorTitle}>No Connection</Text>
          <Text style={styles.errorMessage}>
            Please connect to the internet to download your data. This app
            requires an initial sync before it can work offline.
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <OfflineIndicator />
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={refreshData}
            testID="refresh-control"
          />
        }
        testID="home-scroll-view">
        <View style={styles.content}>
          <Text style={styles.title}>UnaiNikani</Text>
          <Text style={styles.subtitle}>WaniKani Android Client</Text>
          <View style={styles.dashboardContainer}>
            <DashboardStats
              lessonsCount={dashboardData.lessonsCount}
              reviewsCount={dashboardData.reviewsCount}
              onLessonsPress={handleLessonsPress}
              onReviewsPress={handleReviewsPress}
            />
            <NextReviewIndicator
              nextReviewAt={dashboardData.nextReviewAt}
              reviewsAvailable={dashboardData.reviewsCount}
            />
          </View>
          <LastSyncedIndicator lastSyncedAt={syncStatus.lastSyncedAt} />
          <TouchableOpacity
            style={styles.settingsButton}
            onPress={() => navigation.navigate('Settings')}
            testID="settings-button">
            <Text style={styles.settingsButtonText}>Settings</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  scrollContent: {
    flexGrow: 1,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#333',
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    marginTop: 8,
  },
  dashboardContainer: {
    marginTop: 24,
    marginBottom: 16,
    alignItems: 'center',
  },
  settingsButton: {
    marginTop: 16,
    paddingVertical: 12,
    paddingHorizontal: 24,
    backgroundColor: '#8f5bc4',
    borderRadius: 8,
  },
  settingsButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  errorTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 16,
  },
  errorMessage: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    lineHeight: 24,
  },
});
