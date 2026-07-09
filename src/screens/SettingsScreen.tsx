import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useNavigation } from '@react-navigation/native';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Linking,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

import { validateApiKey, WaniKaniClient } from '../api';
import type { RootStackParamList } from '../navigation/types';
import {
  clearApiKey,
  getApiKey,
  saveApiKey,
  clearAllData,
  getSetting,
  setSetting,
} from '../storage';
import { getUserLevel, syncSubjects, syncAssignments } from '../sync';
import { COLORS, SPACING, FONT_SIZES, BORDER_RADIUS } from '../theme';
import { useTheme } from '../theme/ThemeContext';
import type { ThemePreference } from '../theme/ThemeContext';
import {
  checkPermissions,
  hasAskedForPermissions,
  getNotificationsEnabled,
  setNotificationsEnabled,
  openNotificationSettings,
  cancelAllNotifications,
  clearBadge,
} from '../services/notificationService';
import { scheduleNextHourlyCheck } from '../services/reviewNotificationScheduler';
import { addAppStateChangeListener } from '../utils/appStateSync';
import {
  DEFAULT_REVIEW_BATCH_SIZE,
  normalizeReviewBatchSize,
  type ReviewBatchSize,
} from '../utils/reviewBatch';

type SettingsScreenNavigationProp = NativeStackNavigationProp<
  RootStackParamList,
  'Settings'
>;

export type SettingsScreenState =
  | 'loading'
  | 'idle'
  | 'validating'
  | 'syncing'
  | 'syncError';

export function SettingsScreen() {
  const navigation = useNavigation<SettingsScreenNavigationProp>();
  const { colors, themePreference, setThemePreference } = useTheme();
  const [apiKey, setApiKey] = useState('');
  const [hasStoredKey, setHasStoredKey] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [storedApiKey, setStoredApiKey] = useState('');
  const [syncError, setSyncError] = useState<string | null>(null);
  const [zenModeEnabled, setZenModeEnabled] = useState(false);
  const [notificationsEnabled, setNotificationsEnabledState] = useState(false);
  const [notificationPermissionGranted, setNotificationPermissionGranted] =
    useState(false);
  const [reviewBatchSize, setReviewBatchSize] = useState<ReviewBatchSize>(
    DEFAULT_REVIEW_BATCH_SIZE,
  );

  const dynamicStyles = useMemo(
    () => ({
      container: {
        backgroundColor: colors.background.primary,
      },
      syncingContainer: {
        backgroundColor: colors.background.primary,
      },
      syncingText: {
        color: colors.text.secondary,
      },
      errorMessage: {
        color: colors.text.secondary,
      },
      label: {
        color: colors.text.primary,
      },
      hint: {
        color: colors.text.secondary,
      },
      input: {
        borderColor: colors.border.medium,
        color: colors.text.primary,
        backgroundColor: colors.background.input,
      },
      clearButton: {
        backgroundColor: colors.background.primary,
      },
      buttonText: {
        color: colors.text.inverse,
      },
      sectionDivider: {
        backgroundColor: colors.border.light,
      },
      sectionTitle: {
        color: colors.text.primary,
      },
      settingLabel: {
        color: colors.text.primary,
      },
      settingDescription: {
        color: colors.text.secondary,
      },
      settingDescriptionDisabled: {
        color: colors.text.tertiary,
      },
      themeSegment: {
        borderColor: colors.border.medium,
        backgroundColor: colors.background.input,
      },
      themeSegmentActive: {
        backgroundColor: COLORS.subject.vocabulary,
      },
      themeSegmentText: {
        color: colors.text.secondary,
      },
      themeSegmentActiveText: {
        color: COLORS.neutral.white,
      },
    }),
    [colors],
  );

  const switchTrackColor = useMemo(
    () => ({ false: colors.border.medium, true: COLORS.subject.vocabulary }),
    [colors.border.medium],
  );

  const loadStoredKey = useCallback(async () => {
    setIsLoading(true);
    try {
      const [
        storedKey,
        zenModeSetting,
        notificationsSetting,
        reviewBatchSetting,
        permissionStatus,
      ] = await Promise.all([
        getApiKey(),
        getSetting('zenMode'),
        getNotificationsEnabled(),
        getSetting('reviewBatchSize'),
        checkPermissions(),
      ]);
      if (storedKey) {
        setApiKey(storedKey);
        setStoredApiKey(storedKey);
        setHasStoredKey(true);
      } else {
        setApiKey('');
        setStoredApiKey('');
        setHasStoredKey(false);
      }
      setZenModeEnabled(zenModeSetting === true);
      setNotificationsEnabledState(notificationsSetting);
      setReviewBatchSize(normalizeReviewBatchSize(reviewBatchSetting));
      setNotificationPermissionGranted(permissionStatus === 'granted');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadStoredKey();
  }, [loadStoredKey]);

  // Listen for app state changes to refresh permission status when returning from system settings
  useEffect(() => {
    const unsubscribe = addAppStateChangeListener(
      async (nextState, previousState) => {
        // Check if coming to foreground from background/inactive
        const isComingToForeground =
          (previousState === 'background' || previousState === 'inactive') &&
          nextState === 'active';

        if (isComingToForeground) {
          // Refresh permission status when returning to the app
          const permissionStatus = await checkPermissions();
          setNotificationPermissionGranted(permissionStatus === 'granted');
        }
      },
    );

    return () => {
      unsubscribe();
    };
  }, []);

  const performSync = useCallback(
    async (keyToUse: string) => {
      setIsSyncing(true);
      setSyncError(null);

      try {
        const client = new WaniKaniClient(keyToUse);
        const userLevel = await getUserLevel(client);

        // Sync subjects and assignments in parallel
        await Promise.all([
          syncSubjects(client, { maxLevel: userLevel }),
          syncAssignments(client),
        ]);

        // Check if we should show the notification permission screen
        const [permissionStatus, alreadyAsked] = await Promise.all([
          checkPermissions(),
          hasAskedForPermissions(),
        ]);

        // Show permission screen if:
        // - We haven't asked before AND
        // - Permissions are not already granted
        if (!alreadyAsked && permissionStatus !== 'granted') {
          navigation.reset({
            index: 0,
            routes: [
              {
                name: 'NotificationPermission',
                params: { isInitialSetup: true },
              },
            ],
          });
        } else {
          // Navigate to Home screen after successful sync
          navigation.reset({
            index: 0,
            routes: [{ name: 'Home' }],
          });
        }
      } catch (error) {
        setIsSyncing(false);
        const errorMessage =
          error instanceof Error ? error.message : 'An unknown error occurred';
        setSyncError(errorMessage);
      }
    },
    [navigation],
  );

  const handleRetry = useCallback(() => {
    const trimmedKey = apiKey.trim();
    performSync(trimmedKey);
  }, [apiKey, performSync]);

  const handleZenModeToggle = useCallback(async (value: boolean) => {
    setZenModeEnabled(value);
    await setSetting('zenMode', value);
  }, []);

  const handleReviewBatchSizeChange = useCallback(async (value: ReviewBatchSize) => {
    setReviewBatchSize(value);
    await setSetting('reviewBatchSize', value);
  }, []);

  const handleNotificationsToggle = useCallback(async (value: boolean) => {
    setNotificationsEnabledState(value);
    await setNotificationsEnabled(value);

    if (value) {
      // When toggled ON: schedule next hourly notification check
      await scheduleNextHourlyCheck();
    } else {
      // When toggled OFF: cancel all scheduled notifications and clear badge
      await cancelAllNotifications();
      await clearBadge();
    }
  }, []);

  const handleDisabledNotificationsPress = useCallback(() => {
    openNotificationSettings();
  }, []);

  const handleSave = async () => {
    const trimmedKey = apiKey.trim();
    if (!trimmedKey) {
      Alert.alert('Missing API Key', 'Enter your API key to continue.');
      return;
    }

    setIsSaving(true);
    try {
      // Validate the API key first
      const validationResult = await validateApiKey(trimmedKey);
      if (!validationResult.success) {
        Alert.alert(
          'Invalid API Key',
          validationResult.error ||
            "That key didn't work. Double-check and try again.",
        );
        setIsSaving(false);
        return;
      }

      // Save the validated API key
      const saveResult = await saveApiKey(trimmedKey);
      if (saveResult.success) {
        setHasStoredKey(true);
        setIsSaving(false);
        // Perform the actual sync
        await performSync(trimmedKey);
      } else {
        Alert.alert(
          'Save Failed',
          saveResult.error || "Couldn't save your API key. Try again.",
        );
        setIsSaving(false);
      }
    } catch {
      setIsSaving(false);
    }
  };

  const handleClear = () => {
    Alert.alert(
      'Remove API Key?',
      'This will sign you out and delete all downloaded data. You can reconnect later with a new key.',
      [
        { text: 'Keep', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            const result = await clearApiKey();
            if (result.success) {
              await clearAllData();
              navigation.reset({
                index: 0,
                routes: [{ name: 'Welcome' }],
              });
            } else {
              Alert.alert(
                'Remove Failed',
                result.error || "Couldn't remove your API key. Try again.",
              );
            }
          },
        },
      ],
    );
  };

  if (isLoading) {
    return (
      <View style={[styles.container, dynamicStyles.container]}>
        <ActivityIndicator size="large" color={COLORS.subject.vocabulary} />
      </View>
    );
  }

  // Show syncing UI after successful API key validation and save
  if (isSyncing) {
    return (
      <View style={[styles.syncingContainer, dynamicStyles.syncingContainer]} testID="syncing-view">
        <ActivityIndicator
          size="large"
          color={COLORS.subject.vocabulary}
          testID="syncing-spinner"
        />
        <Text style={[styles.syncingText, dynamicStyles.syncingText]} testID="syncing-message">
          Syncing your WaniKani data...
        </Text>
      </View>
    );
  }

  // Show sync error UI with retry option
  if (syncError) {
    return (
      <View style={[styles.syncingContainer, dynamicStyles.syncingContainer]} testID="sync-error-view">
        <Text style={styles.errorTitle} testID="sync-error-title">
          Sync Failed
        </Text>
        <Text style={[styles.errorMessage, dynamicStyles.errorMessage]} testID="sync-error-message">
          {syncError}
        </Text>
        <TouchableOpacity
          style={[styles.button, styles.retryButton]}
          onPress={handleRetry}
          testID="retry-button"
        >
          <Text style={[styles.buttonText, dynamicStyles.buttonText]}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={[styles.container, dynamicStyles.container]}>
      <View style={styles.content}>
        <Text style={[styles.label, dynamicStyles.label]}>WaniKani API Key</Text>
        <Text
          style={[styles.hint, dynamicStyles.hint]}
          onPress={() =>
            Linking.openURL(
              'https://www.wanikani.com/settings/personal_access_tokens',
            )
          }
        >
          Find your key at{' '}
          <Text style={styles.hintLink}>
            wanikani.com/settings/personal_access_tokens
          </Text>
        </Text>
        <TextInput
          style={[styles.input, dynamicStyles.input]}
          value={apiKey}
          onChangeText={setApiKey}
          placeholder="Enter your API key"
          placeholderTextColor={colors.text.placeholder}
          cursorColor={colors.text.primary}
          autoCapitalize="none"
          autoCorrect={false}
          secureTextEntry
          testID="api-key-input"
        />

        <TouchableOpacity
          style={[
            styles.button,
            styles.saveButton,
            (isSaving || apiKey.trim() === storedApiKey) &&
              styles.buttonDisabled,
          ]}
          onPress={handleSave}
          disabled={isSaving || apiKey.trim() === storedApiKey}
          testID="save-button"
        >
          {isSaving ? (
            <ActivityIndicator color={colors.text.inverse} />
          ) : (
            <Text style={[styles.buttonText, dynamicStyles.buttonText]}>Save API Key</Text>
          )}
        </TouchableOpacity>

        {hasStoredKey && (
          <TouchableOpacity
            style={[styles.button, styles.clearButton, dynamicStyles.clearButton]}
            onPress={handleClear}
            testID="clear-button"
          >
            <Text style={[styles.buttonText, styles.clearButtonText]}>
              Clear API Key
            </Text>
          </TouchableOpacity>
        )}

        <View style={[styles.sectionDivider, dynamicStyles.sectionDivider]} />

        <Text style={[styles.sectionTitle, dynamicStyles.sectionTitle]}>Appearance</Text>

        <View style={styles.settingRow} testID="appearance-setting">
          <View style={styles.settingInfo}>
            <Text style={[styles.settingLabel, dynamicStyles.settingLabel]}>Theme</Text>
            <Text style={[styles.settingDescription, dynamicStyles.settingDescription]}>
              Choose light, dark, or follow system
            </Text>
          </View>
          <View style={styles.themeSegmentedControl} testID="theme-segmented-control">
            {(['system', 'light', 'dark'] as ThemePreference[]).map(pref => (
              <TouchableOpacity
                key={pref}
                style={[
                  styles.themeSegment,
                  dynamicStyles.themeSegment,
                  themePreference === pref && dynamicStyles.themeSegmentActive,
                ]}
                onPress={() => setThemePreference(pref)}
                testID={`theme-option-${pref}`}
              >
                <Text
                  style={[
                    styles.themeSegmentText,
                    dynamicStyles.themeSegmentText,
                    themePreference === pref && dynamicStyles.themeSegmentActiveText,
                  ]}
                >
                  {pref.charAt(0).toUpperCase() + pref.slice(1)}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <View style={[styles.sectionDivider, dynamicStyles.sectionDivider]} />

        <Text style={[styles.sectionTitle, dynamicStyles.sectionTitle]}>Review Settings</Text>

        <View style={styles.settingRow} testID="review-batch-size-setting">
          <View style={styles.settingInfo}>
            <Text style={[styles.settingLabel, dynamicStyles.settingLabel]}>Review Batch Size</Text>
            <Text style={[styles.settingDescription, dynamicStyles.settingDescription]}>Reviews loaded at a time</Text>
          </View>
          <View style={styles.themeSegmentedControl} testID="review-batch-size-selector">
            {([10, 25, 50, 'all'] as ReviewBatchSize[]).map(value => (
              <TouchableOpacity
                key={String(value)}
                style={[styles.themeSegment, dynamicStyles.themeSegment, reviewBatchSize === value && dynamicStyles.themeSegmentActive]}
                onPress={() => handleReviewBatchSizeChange(value)}
                testID={`review-batch-size-${value}`}
              >
                <Text style={[styles.themeSegmentText, dynamicStyles.themeSegmentText, reviewBatchSize === value && dynamicStyles.themeSegmentActiveText]}>
                  {value === 'all' ? 'All' : value}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <View style={styles.settingRow} testID="zen-mode-setting">
          <View style={styles.settingInfo}>
            <Text style={[styles.settingLabel, dynamicStyles.settingLabel]}>Zen Mode</Text>
            <Text style={[styles.settingDescription, dynamicStyles.settingDescription]}>
              Hide progress bar and stats during reviews
            </Text>
          </View>
          <Switch
            value={zenModeEnabled}
            onValueChange={handleZenModeToggle}
            trackColor={switchTrackColor}
            thumbColor={COLORS.neutral.white}
            testID="zen-mode-toggle"
          />
        </View>

        {notificationPermissionGranted ? (
          <View style={styles.settingRow} testID="notifications-setting">
            <View style={styles.settingInfo}>
              <Text style={[styles.settingLabel, dynamicStyles.settingLabel]}>Review Notifications</Text>
              <Text style={[styles.settingDescription, dynamicStyles.settingDescription]}>
                Get notified when you have reviews waiting
              </Text>
            </View>
            <Switch
              value={notificationsEnabled}
              onValueChange={handleNotificationsToggle}
              trackColor={switchTrackColor}
              thumbColor={COLORS.neutral.white}
              testID="notifications-toggle"
            />
          </View>
        ) : (
          <TouchableOpacity
            style={styles.settingRow}
            onPress={handleDisabledNotificationsPress}
            testID="notifications-setting-disabled"
          >
            <View style={styles.settingInfo}>
              <Text style={[styles.settingLabel, dynamicStyles.settingLabel]}>Review Notifications</Text>
              <Text style={[styles.settingDescriptionDisabled, dynamicStyles.settingDescriptionDisabled]}>
                Tap to open system settings
              </Text>
            </View>
            <Switch
              value={false}
              disabled
              trackColor={switchTrackColor}
              thumbColor={COLORS.neutral.white}
              testID="notifications-toggle-disabled"
            />
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  syncingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: SPACING.lg,
  },
  syncingText: {
    marginTop: SPACING.lg,
    fontSize: FONT_SIZES.lg,
    textAlign: 'center',
  },
  errorTitle: {
    fontSize: FONT_SIZES.xl,
    fontWeight: '600',
    color: COLORS.feedback.incorrect,
    marginBottom: SPACING.md,
    textAlign: 'center',
  },
  errorMessage: {
    fontSize: FONT_SIZES.base,
    textAlign: 'center',
    marginBottom: SPACING.xl,
    paddingHorizontal: SPACING.lg,
  },
  retryButton: {
    backgroundColor: COLORS.subject.vocabulary,
    minWidth: 150,
  },
  content: {
    padding: 20,
    paddingTop: 40,
  },
  label: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 8,
  },
  hint: {
    fontSize: 14,
    marginBottom: 16,
  },
  hintLink: {
    color: COLORS.subject.vocabulary,
    textDecorationLine: 'underline',
  },
  input: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    marginBottom: 16,
  },
  button: {
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 12,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  saveButton: {
    backgroundColor: COLORS.subject.vocabulary,
  },
  clearButton: {
    borderWidth: 1,
    borderColor: '#e74c3c',
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  clearButtonText: {
    color: '#e74c3c',
  },
  sectionDivider: {
    height: 1,
    marginVertical: SPACING.lg,
  },
  sectionTitle: {
    fontSize: FONT_SIZES.lg,
    fontWeight: '600',
    marginBottom: SPACING.md,
  },
  settingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: SPACING.md,
  },
  settingInfo: {
    flex: 1,
    marginRight: SPACING.md,
  },
  settingLabel: {
    fontSize: FONT_SIZES.base,
    fontWeight: '500',
    marginBottom: 4,
  },
  settingDescription: {
    fontSize: FONT_SIZES.sm,
  },
  settingDescriptionDisabled: {
    fontSize: FONT_SIZES.sm,
    fontStyle: 'italic',
  },
  themeSegmentedControl: {
    flexDirection: 'row',
    borderRadius: BORDER_RADIUS.md,
    overflow: 'hidden',
  },
  themeSegment: {
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.xs,
    borderWidth: 1,
  },
  themeSegmentText: {
    fontSize: FONT_SIZES.sm,
    fontWeight: '500',
  },
});
