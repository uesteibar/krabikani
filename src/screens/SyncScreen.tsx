import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useNavigation } from '@react-navigation/native';
import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

import { WaniKaniClient } from '../api';
import type { RootStackParamList } from '../navigation/types';
import { getApiKey } from '../storage';
import { getUserLevel, syncSubjects, syncAssignments } from '../sync';
import {
  useTheme,
  COLORS,
  SPACING,
  FONT_SIZES,
  BORDER_RADIUS,
  MIN_TOUCH_TARGET,
} from '../theme';

type SyncNavigationProp = NativeStackNavigationProp<RootStackParamList, 'Sync'>;

export function SyncScreen() {
  const navigation = useNavigation<SyncNavigationProp>();
  const { colors, shadow } = useTheme();
  const [error, setError] = useState<string | null>(null);
  const [isSyncing, setIsSyncing] = useState(true);

  const performSync = useCallback(async () => {
    setIsSyncing(true);
    setError(null);

    try {
      const apiKey = await getApiKey();
      if (!apiKey) {
        setError('No API key found. Go back and enter your key to continue.');
        setIsSyncing(false);
        return;
      }

      const client = new WaniKaniClient(apiKey);
      const level = await getUserLevel(client);

      await Promise.all([
        syncSubjects(client, { maxLevel: level }),
        syncAssignments(client),
      ]);

      navigation.navigate('WizardNotification');
    } catch {
      setError('Sync failed. Check your connection and try again.');
    } finally {
      setIsSyncing(false);
    }
  }, [navigation]);

  useEffect(() => {
    performSync();
  }, [performSync]);

  return (
    <View
      style={[styles.container, { backgroundColor: colors.background.primary }]}
      testID="sync-screen"
    >
      <View style={styles.content}>
        {isSyncing && (
          <>
            <ActivityIndicator
              size="large"
              color={COLORS.subject.vocabulary}
              testID="sync-loading-indicator"
            />
            <Text style={[styles.statusText, { color: colors.text.primary }]}>
              Syncing your data...
            </Text>
          </>
        )}

        {error && (
          <>
            <Text
              style={[styles.errorText, { color: COLORS.feedback.incorrect }]}
            >
              {error}
            </Text>
            <TouchableOpacity
              style={[
                styles.retryButton,
                {
                  backgroundColor: COLORS.subject.vocabulary,
                  shadowColor: shadow.color,
                  shadowOffset: shadow.offset,
                  shadowOpacity: shadow.opacity,
                  shadowRadius: shadow.radius,
                },
              ]}
              onPress={performSync}
              activeOpacity={0.8}
              testID="retry-button"
            >
              <Text style={styles.retryButtonText}>Retry</Text>
            </TouchableOpacity>
          </>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: SPACING.xxl,
  },
  statusText: {
    fontSize: FONT_SIZES.xl,
    fontWeight: '600',
    marginTop: SPACING.xxl,
    textAlign: 'center',
  },
  errorText: {
    fontSize: FONT_SIZES.base,
    textAlign: 'center',
    marginBottom: SPACING.xxl,
  },
  retryButton: {
    paddingVertical: SPACING.lg,
    paddingHorizontal: SPACING.xxxl,
    minHeight: MIN_TOUCH_TARGET,
    borderRadius: BORDER_RADIUS.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  retryButtonText: {
    fontSize: FONT_SIZES.lg,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});
