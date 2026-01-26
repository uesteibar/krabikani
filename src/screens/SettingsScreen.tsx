import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useNavigation } from '@react-navigation/native';
import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

import { validateApiKey, WaniKaniClient } from '../api';
import type { RootStackParamList } from '../navigation/types';
import { clearApiKey, getApiKey, saveApiKey, clearAllData } from '../storage';
import { getUserLevel, syncSubjects, syncAssignments } from '../sync';
import { COLORS, SPACING, FONT_SIZES } from '../theme';

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
  const [apiKey, setApiKey] = useState('');
  const [hasStoredKey, setHasStoredKey] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncError, setSyncError] = useState<string | null>(null);

  const loadStoredKey = useCallback(async () => {
    setIsLoading(true);
    try {
      const storedKey = await getApiKey();
      if (storedKey) {
        setApiKey(storedKey);
        setHasStoredKey(true);
      } else {
        setApiKey('');
        setHasStoredKey(false);
      }
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadStoredKey();
  }, [loadStoredKey]);

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

        // Navigate to Home screen after successful sync
        navigation.reset({
          index: 0,
          routes: [{ name: 'Home' }],
        });
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

  const handleSave = async () => {
    const trimmedKey = apiKey.trim();
    if (!trimmedKey) {
      Alert.alert('Error', 'Please enter an API key');
      return;
    }

    setIsSaving(true);
    try {
      // Validate the API key first
      const validationResult = await validateApiKey(trimmedKey);
      if (!validationResult.success) {
        Alert.alert(
          'Validation Failed',
          validationResult.error || 'Invalid API key',
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
        Alert.alert('Error', saveResult.error || 'Failed to save API key');
        setIsSaving(false);
      }
    } catch {
      setIsSaving(false);
    }
  };

  const handleClear = () => {
    Alert.alert(
      'Clear API Key',
      'Are you sure you want to remove your API key? This will also delete all synced data.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear',
          style: 'destructive',
          onPress: async () => {
            const result = await clearApiKey();
            if (result.success) {
              // Clear all synced data from the database
              await clearAllData();
              setApiKey('');
              setHasStoredKey(false);
            } else {
              Alert.alert('Error', result.error || 'Failed to clear API key');
            }
          },
        },
      ],
    );
  };

  if (isLoading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color="#8f5bc4" />
      </View>
    );
  }

  // Show syncing UI after successful API key validation and save
  if (isSyncing) {
    return (
      <View style={styles.syncingContainer} testID="syncing-view">
        <ActivityIndicator
          size="large"
          color={COLORS.subject.vocabulary}
          testID="syncing-spinner"
        />
        <Text style={styles.syncingText} testID="syncing-message">
          Syncing your WaniKani data...
        </Text>
      </View>
    );
  }

  // Show sync error UI with retry option
  if (syncError) {
    return (
      <View style={styles.syncingContainer} testID="sync-error-view">
        <Text style={styles.errorTitle} testID="sync-error-title">
          Sync Failed
        </Text>
        <Text style={styles.errorMessage} testID="sync-error-message">
          {syncError}
        </Text>
        <TouchableOpacity
          style={[styles.button, styles.retryButton]}
          onPress={handleRetry}
          testID="retry-button"
        >
          <Text style={styles.buttonText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.label}>WaniKani API Key</Text>
        <Text style={styles.hint}>
          Get your API key from wanikani.com/settings/personal_access_tokens
        </Text>
        <TextInput
          style={styles.input}
          value={apiKey}
          onChangeText={setApiKey}
          placeholder="Enter your API key"
          placeholderTextColor="#999"
          autoCapitalize="none"
          autoCorrect={false}
          secureTextEntry
          testID="api-key-input"
        />

        <TouchableOpacity
          style={[
            styles.button,
            styles.saveButton,
            isSaving && styles.buttonDisabled,
          ]}
          onPress={handleSave}
          disabled={isSaving}
          testID="save-button"
        >
          {isSaving ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.buttonText}>Save API Key</Text>
          )}
        </TouchableOpacity>

        {hasStoredKey && (
          <TouchableOpacity
            style={[styles.button, styles.clearButton]}
            onPress={handleClear}
            testID="clear-button"
          >
            <Text style={[styles.buttonText, styles.clearButtonText]}>
              Clear API Key
            </Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  syncingContainer: {
    flex: 1,
    backgroundColor: COLORS.background.primary,
    justifyContent: 'center',
    alignItems: 'center',
    padding: SPACING.lg,
  },
  syncingText: {
    marginTop: SPACING.lg,
    fontSize: FONT_SIZES.lg,
    color: COLORS.text.secondary,
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
    color: COLORS.text.secondary,
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
    color: '#333',
    marginBottom: 8,
  },
  hint: {
    fontSize: 14,
    color: '#666',
    marginBottom: 16,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: '#333',
    backgroundColor: '#f9f9f9',
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
    backgroundColor: '#8f5bc4',
  },
  clearButton: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#e74c3c',
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  clearButtonText: {
    color: '#e74c3c',
  },
});
