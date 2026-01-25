import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import React, { useState, useCallback } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import { OfflineIndicator, LastSyncedIndicator } from '../components';
import type { RootStackParamList } from '../navigation/types';
import { getSyncStatus, getSubjectCount } from '../storage';
import { isOnline } from '../utils';

type HomeScreenNavigationProp = NativeStackNavigationProp<
  RootStackParamList,
  'Home'
>;

export interface SyncStatusData {
  lastSyncedAt: Date | null;
  hasCachedData: boolean;
}

export function HomeScreen() {
  const navigation = useNavigation<HomeScreenNavigationProp>();
  const [syncStatus, setSyncStatus] = useState<SyncStatusData>({
    lastSyncedAt: null,
    hasCachedData: false,
  });
  const [showOfflineError, setShowOfflineError] = useState(false);

  useFocusEffect(
    useCallback(() => {
      async function loadSyncStatus() {
        try {
          const [status, subjectCount] = await Promise.all([
            getSyncStatus(),
            getSubjectCount(),
          ]);

          const lastSync = status?.last_subjects_sync ?? status?.last_assignments_sync;
          const lastSyncedAt = lastSync ? new Date(lastSync) : null;
          const hasCachedData = subjectCount > 0;

          setSyncStatus({ lastSyncedAt, hasCachedData });

          // Check if we're offline with no cached data
          const online = isOnline();
          setShowOfflineError(!online && !hasCachedData);
        } catch {
          // Database not initialized yet - show offline error if offline
          const online = isOnline();
          setShowOfflineError(!online);
        }
      }

      loadSyncStatus();
    }, []),
  );

  if (showOfflineError) {
    return (
      <View style={styles.container}>
        <OfflineIndicator />
        <View style={styles.errorContainer}>
          <Text style={styles.errorTitle}>No Connection</Text>
          <Text style={styles.errorMessage}>
            Please connect to the internet to download your data. This app requires an initial sync before it can work offline.
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <OfflineIndicator />
      <View style={styles.content}>
        <Text style={styles.title}>UnaiNikani</Text>
        <Text style={styles.subtitle}>WaniKani Android Client</Text>
        <LastSyncedIndicator lastSyncedAt={syncStatus.lastSyncedAt} />
        <TouchableOpacity
          style={styles.settingsButton}
          onPress={() => navigation.navigate('Settings')}
          testID="settings-button">
          <Text style={styles.settingsButtonText}>Settings</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
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
  settingsButton: {
    marginTop: 32,
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
