import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import React, {
  useState,
  useCallback,
  useEffect,
  useRef,
  useMemo,
} from 'react';
import {
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  ScrollView,
  RefreshControl,
  Image,
} from 'react-native';

import { WaniKaniClient } from '../api/wanikaniApi';
import {
  OfflineIndicator,
  LastSyncedIndicator,
  DashboardStats,

  PendingSyncIndicator,
  SyncingIndicator,
  LevelIndicator,
  LearnedCounts,
  UpcomingReviewsChart,
} from '../components';
import {
  COLORS,
  SPACING,
  FONT_SIZES,
  BORDER_RADIUS,
  MIN_TOUCH_TARGET,
  useTheme,
} from '../theme';
import type { RootStackParamList } from '../navigation/types';
import { getApiKey } from '../storage/secureStorage';
import {
  getSyncStatus,
  getSubjectCount,
  getAvailableLessons,
  getAvailableReviews,
  getNextReviewTime,
  getPendingReviewCount,
  getPendingLessonCount,
  getCachedUserLevel,
  getLearnedCount,
  getUpcomingReviewsByHour,
  type UpcomingReviewsHourBucket,
} from '../storage';
import {
  syncSubjects,
  syncAssignments,
  getUserLevel,
  syncPendingData,
} from '../sync';
import { isOnline, addNetworkStatusListener } from '../utils';

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

export interface PendingData {
  pendingLessonsCount: number;
  pendingReviewsCount: number;
}

export interface LearnedData {
  kanjiLearned: number;
  vocabularyLearned: number;
}

export interface UpcomingReviewsData {
  hourlyBuckets: UpcomingReviewsHourBucket[];
}

export function HomeScreen() {
  const navigation = useNavigation<HomeScreenNavigationProp>();
  const theme = useTheme();
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
  const [pendingData, setPendingData] = useState<PendingData>({
    pendingLessonsCount: 0,
    pendingReviewsCount: 0,
  });
  const [userLevel, setUserLevel] = useState<number | null>(null);
  const [learnedData, setLearnedData] = useState<LearnedData>({
    kanjiLearned: 0,
    vocabularyLearned: 0,
  });
  const [upcomingReviewsData, setUpcomingReviewsData] =
    useState<UpcomingReviewsData>({
      hourlyBuckets: [],
    });
  const isSyncingPending = useRef(false);

  const loadDashboardData = useCallback(async () => {
    try {
      const [
        status,
        subjectCount,
        lessons,
        reviews,
        nextReviewTimeStr,
        pendingLessonsCount,
        pendingReviewsCount,
        cachedLevel,
        kanjiLearned,
        vocabularyLearned,
        upcomingReviews,
      ] = await Promise.all([
        getSyncStatus(),
        getSubjectCount(),
        getAvailableLessons(),
        getAvailableReviews(),
        getNextReviewTime(),
        getPendingLessonCount(),
        getPendingReviewCount(),
        getCachedUserLevel(),
        getLearnedCount('kanji'),
        getLearnedCount('vocabulary'),
        getUpcomingReviewsByHour(12),
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
      setPendingData({
        pendingLessonsCount,
        pendingReviewsCount,
      });
      setUserLevel(cachedLevel);
      setLearnedData({
        kanjiLearned,
        vocabularyLearned,
      });
      setUpcomingReviewsData({
        hourlyBuckets: upcomingReviews,
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
      const fetchedLevel = await getUserLevel(client);

      // Sync subjects and assignments in parallel
      await Promise.all([
        syncSubjects(client, { maxLevel: fetchedLevel }),
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

  // Sync pending data (lessons and reviews) when coming back online
  const syncPendingDataOnReconnect = useCallback(async () => {
    // Prevent concurrent sync attempts
    if (isSyncingPending.current) {
      return;
    }

    // Check if there's anything to sync
    const hasPending =
      pendingData.pendingLessonsCount > 0 ||
      pendingData.pendingReviewsCount > 0;
    if (!hasPending) {
      return;
    }

    try {
      isSyncingPending.current = true;

      const apiKey = await getApiKey();
      if (!apiKey) {
        return;
      }

      const client = new WaniKaniClient(apiKey);
      await syncPendingData(client);

      // Reload dashboard data after successful sync
      await loadDashboardData();
    } catch {
      // Sync failed - items remain in queue for next attempt
    } finally {
      isSyncingPending.current = false;
    }
  }, [
    pendingData.pendingLessonsCount,
    pendingData.pendingReviewsCount,
    loadDashboardData,
  ]);

  // Listen for network status changes to sync pending data when coming online
  useEffect(() => {
    const unsubscribe = addNetworkStatusListener((isConnected: boolean) => {
      if (isConnected) {
        // Coming back online - sync pending data
        syncPendingDataOnReconnect();
      }
    });

    return () => {
      unsubscribe();
    };
  }, [syncPendingDataOnReconnect]);

  useFocusEffect(
    useCallback(() => {
      loadDashboardData();
    }, [loadDashboardData]),
  );

  // Also try to sync pending data when screen focuses (if online)
  useFocusEffect(
    useCallback(() => {
      if (isOnline()) {
        syncPendingDataOnReconnect();
      }
    }, [syncPendingDataOnReconnect]),
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

  // Dynamic styles based on theme
  const dynamicStyles = useMemo(
    () => ({
      container: {
        backgroundColor: theme.colors.background.primary,
      },
      errorTitle: {
        color: theme.colors.text.primary,
      },
      errorMessage: {
        color: theme.colors.text.secondary,
      },
    }),
    [theme],
  );

  if (showOfflineError) {
    return (
      <View style={[styles.container, dynamicStyles.container]}>
        <OfflineIndicator />
        <View style={styles.errorContainer}>
          <Text style={[styles.errorTitle, dynamicStyles.errorTitle]}>
            No Connection
          </Text>
          <Text style={[styles.errorMessage, dynamicStyles.errorMessage]}>
            Please connect to the internet to download your data. This app
            requires an initial sync before it can work offline.
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, dynamicStyles.container]}>
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
        testID="home-scroll-view"
      >
        <View style={styles.content}>
          <Image
            source={require('../../assets/cabrigator-icon.png')}
            style={styles.logo}
            testID="home-logo"
          />
          <View style={styles.dashboardContainer}>
            <LevelIndicator level={userLevel} />
            <DashboardStats
              lessonsCount={dashboardData.lessonsCount}
              reviewsCount={dashboardData.reviewsCount}
              onLessonsPress={handleLessonsPress}
              onReviewsPress={handleReviewsPress}
            />
            <LearnedCounts
              kanjiCount={learnedData.kanjiLearned}
              vocabularyCount={learnedData.vocabularyLearned}
            />
            {upcomingReviewsData.hourlyBuckets.length > 0 && (
              <UpcomingReviewsChart
                data={upcomingReviewsData.hourlyBuckets}
                nextReviewAt={dashboardData.nextReviewAt}
                currentPendingCount={dashboardData.reviewsCount}
              />
            )}
          </View>
          <LastSyncedIndicator lastSyncedAt={syncStatus.lastSyncedAt} />
          <SyncingIndicator isSyncing={refreshing} />
          <PendingSyncIndicator
            pendingLessonsCount={pendingData.pendingLessonsCount}
            pendingReviewsCount={pendingData.pendingReviewsCount}
          />
          <View style={styles.bottomButtons}>
            <TouchableOpacity
              style={[
                styles.outlineButton,
                { borderColor: theme.colors.text.tertiary },
              ]}
              onPress={() => navigation.navigate('Search')}
              activeOpacity={0.6}
              testID="search-button"
            >
              <Text
                style={[
                  styles.outlineButtonText,
                  { color: theme.colors.text.primary },
                ]}
              >
                Search
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.outlineButton,
                { borderColor: theme.colors.text.tertiary },
              ]}
              onPress={() => navigation.navigate('Practice')}
              activeOpacity={0.6}
              testID="practice-button"
            >
              <Text
                style={[
                  styles.outlineButtonText,
                  { color: theme.colors.text.primary },
                ]}
              >
                Practice
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.outlineButton,
                { borderColor: theme.colors.text.tertiary },
              ]}
              onPress={() => navigation.navigate('Settings')}
              activeOpacity={0.6}
              testID="settings-button"
            >
              <Text
                style={[
                  styles.outlineButtonText,
                  { color: theme.colors.text.primary },
                ]}
              >
                Settings
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background.primary,
  },
  scrollContent: {
    flexGrow: 1,
    paddingTop: MIN_TOUCH_TARGET + SPACING.lg, // Large top margin for safe area
    paddingBottom: MIN_TOUCH_TARGET + SPACING.lg, // Large bottom margin
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  logo: {
    width: 240,
    height: 240,
    marginTop: SPACING.xxl,
    marginBottom: SPACING.md,
  },
  dashboardContainer: {
    marginTop: SPACING.xxl,
    marginBottom: SPACING.lg,
    alignItems: 'center',
    width: '100%',
  },
  bottomButtons: {
    marginTop: MIN_TOUCH_TARGET,
    marginBottom: SPACING.xxl,
    width: '100%',
    paddingHorizontal: SPACING.xxl,
    gap: SPACING.md,
  },
  outlineButton: {
    width: '100%',
    paddingVertical: SPACING.md,
    minHeight: MIN_TOUCH_TARGET,
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderRadius: BORDER_RADIUS.md,
    justifyContent: 'center',
    alignItems: 'center',
  },
  outlineButtonText: {
    fontSize: FONT_SIZES.base,
    fontWeight: '600',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: SPACING.xxxl,
  },
  errorTitle: {
    fontSize: FONT_SIZES.xxl,
    fontWeight: 'bold',
    color: COLORS.text.primary,
    marginBottom: SPACING.lg,
  },
  errorMessage: {
    fontSize: FONT_SIZES.base,
    color: COLORS.text.secondary,
    textAlign: 'center',
    lineHeight: FONT_SIZES.xxl,
  },
});
