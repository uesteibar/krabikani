import { act, fireEvent, render, waitFor } from '@testing-library/react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import React from 'react';
import { Alert, View, Text } from 'react-native';

import { SettingsScreen } from '../../src/screens/SettingsScreen';
import * as wanikaniApi from '../../src/api/wanikaniApi';
import * as secureStorage from '../../src/storage/secureStorage';
import * as database from '../../src/storage/database';
import * as syncService from '../../src/sync/syncService';
import * as notificationService from '../../src/services/notificationService';
import type { RootStackParamList } from '../../src/navigation/types';

jest.mock('../../src/storage/secureStorage');
jest.mock('../../src/storage/database');
jest.mock('../../src/api/wanikaniApi');
jest.mock('../../src/sync/syncService');
jest.mock('../../src/services/notificationService');
jest.spyOn(Alert, 'alert');

const Stack = createNativeStackNavigator<RootStackParamList>();

// Mock Home screen for navigation tests
function MockHomeScreen() {
  return (
    <View testID="home-screen">
      <Text>Home Screen</Text>
    </View>
  );
}

// Mock NotificationPermission screen for navigation tests
function MockNotificationPermissionScreen() {
  return (
    <View testID="notification-permission-screen">
      <Text>Notification Permission Screen</Text>
    </View>
  );
}

// Wrapper for tests that need navigation
function renderWithNavigation(
  initialRouteName: keyof RootStackParamList = 'Settings',
) {
  return render(
    <NavigationContainer>
      <Stack.Navigator initialRouteName={initialRouteName}>
        <Stack.Screen name="Home" component={MockHomeScreen} />
        <Stack.Screen name="Settings" component={SettingsScreen} />
        <Stack.Screen
          name="NotificationPermission"
          component={MockNotificationPermissionScreen}
        />
      </Stack.Navigator>
    </NavigationContainer>,
  );
}

const mockSecureStorage = secureStorage as jest.Mocked<typeof secureStorage>;
const mockDatabase = database as jest.Mocked<typeof database>;
const mockWanikaniApi = wanikaniApi as jest.Mocked<typeof wanikaniApi>;
const mockSyncService = syncService as jest.Mocked<typeof syncService>;
const mockNotificationService = notificationService as jest.Mocked<
  typeof notificationService
>;

describe('SettingsScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockSecureStorage.getApiKey.mockResolvedValue(null);
    mockSecureStorage.saveApiKey.mockResolvedValue({ success: true });
    mockSecureStorage.clearApiKey.mockResolvedValue({ success: true });
    mockWanikaniApi.validateApiKey.mockResolvedValue({
      success: true,
      user: { id: 1, username: 'testuser', level: 10 },
    });
    // Default mock for database settings
    mockDatabase.getSetting.mockResolvedValue(null);
    mockDatabase.setSetting.mockResolvedValue(undefined);
    // Default mock for sync service
    mockSyncService.getUserLevel.mockResolvedValue(10);
    mockSyncService.syncSubjects.mockResolvedValue({
      success: true,
      syncedCount: 100,
    });
    mockSyncService.syncAssignments.mockResolvedValue({
      success: true,
      syncedCount: 50,
    });
    // Default mock for notification service - permissions already granted
    mockNotificationService.checkPermissions.mockResolvedValue('granted');
    mockNotificationService.hasAskedForPermissions.mockResolvedValue(false);
  });

  it('should render loading state initially', async () => {
    mockSecureStorage.getApiKey.mockImplementation(
      () => new Promise(() => {}), // Never resolves
    );

    const { getByTestId } = renderWithNavigation();

    // While loading, the input should not be visible
    expect(() => getByTestId('api-key-input')).toThrow();
  });

  it('should render empty input when no API key is stored', async () => {
    mockSecureStorage.getApiKey.mockResolvedValue(null);

    const { getByTestId, queryByTestId } = renderWithNavigation();

    await waitFor(() => {
      expect(getByTestId('api-key-input')).toBeTruthy();
    });

    expect(getByTestId('api-key-input').props.value).toBe('');
    expect(queryByTestId('clear-button')).toBeNull();
  });

  it('should render stored API key and show clear button', async () => {
    mockSecureStorage.getApiKey.mockResolvedValue('existing-api-key');

    const { getByTestId } = renderWithNavigation();

    await waitFor(() => {
      expect(getByTestId('api-key-input')).toBeTruthy();
    });

    expect(getByTestId('api-key-input').props.value).toBe('existing-api-key');
    expect(getByTestId('clear-button')).toBeTruthy();
  });

  it('should validate, save API key, and show syncing UI when save button is pressed', async () => {
    mockSecureStorage.getApiKey.mockResolvedValue(null);
    mockWanikaniApi.validateApiKey.mockResolvedValue({
      success: true,
      user: { id: 123, username: 'happyuser', level: 15 },
    });
    // Make sync never complete so we can see syncing UI
    mockSyncService.getUserLevel.mockImplementation(
      () => new Promise(() => {}),
    );

    const { getByTestId } = renderWithNavigation();

    await waitFor(() => {
      expect(getByTestId('api-key-input')).toBeTruthy();
    });

    fireEvent.changeText(getByTestId('api-key-input'), 'new-api-key');
    fireEvent.press(getByTestId('save-button'));

    await waitFor(() => {
      expect(mockWanikaniApi.validateApiKey).toHaveBeenCalledWith(
        'new-api-key',
      );
    });

    await waitFor(() => {
      expect(mockSecureStorage.saveApiKey).toHaveBeenCalledWith('new-api-key');
    });

    // After successful validation and save, should show syncing UI instead of Alert
    await waitFor(() => {
      expect(getByTestId('syncing-view')).toBeTruthy();
    });

    expect(getByTestId('syncing-spinner')).toBeTruthy();
    expect(getByTestId('syncing-message').props.children).toBe(
      'Syncing your WaniKani data...',
    );

    // Should NOT show success Alert anymore
    expect(Alert.alert).not.toHaveBeenCalledWith('Success', expect.any(String));
  });

  it('should show error when API key validation fails', async () => {
    mockSecureStorage.getApiKey.mockResolvedValue(null);
    mockWanikaniApi.validateApiKey.mockResolvedValue({
      success: false,
      error: 'Invalid API key',
    });

    const { getByTestId } = renderWithNavigation();

    await waitFor(() => {
      expect(getByTestId('api-key-input')).toBeTruthy();
    });

    fireEvent.changeText(getByTestId('api-key-input'), 'bad-api-key');
    fireEvent.press(getByTestId('save-button'));

    await waitFor(() => {
      expect(mockWanikaniApi.validateApiKey).toHaveBeenCalledWith(
        'bad-api-key',
      );
    });

    await waitFor(() => {
      expect(Alert.alert).toHaveBeenCalledWith(
        'Validation Failed',
        'Invalid API key',
      );
    });

    // Should not save the invalid key
    expect(mockSecureStorage.saveApiKey).not.toHaveBeenCalled();
  });

  it('should show network error when validation fails due to network', async () => {
    mockSecureStorage.getApiKey.mockResolvedValue(null);
    mockWanikaniApi.validateApiKey.mockResolvedValue({
      success: false,
      error: 'Network error. Please check your internet connection.',
    });

    const { getByTestId } = renderWithNavigation();

    await waitFor(() => {
      expect(getByTestId('api-key-input')).toBeTruthy();
    });

    fireEvent.changeText(getByTestId('api-key-input'), 'some-api-key');
    fireEvent.press(getByTestId('save-button'));

    await waitFor(() => {
      expect(Alert.alert).toHaveBeenCalledWith(
        'Validation Failed',
        'Network error. Please check your internet connection.',
      );
    });

    expect(mockSecureStorage.saveApiKey).not.toHaveBeenCalled();
  });

  it('should show error when saving empty API key', async () => {
    mockSecureStorage.getApiKey.mockResolvedValue(null);

    const { getByTestId } = renderWithNavigation();

    await waitFor(() => {
      expect(getByTestId('api-key-input')).toBeTruthy();
    });

    fireEvent.press(getByTestId('save-button'));

    await waitFor(() => {
      expect(Alert.alert).toHaveBeenCalledWith(
        'Error',
        'Please enter an API key',
      );
    });

    expect(mockWanikaniApi.validateApiKey).not.toHaveBeenCalled();
    expect(mockSecureStorage.saveApiKey).not.toHaveBeenCalled();
  });

  it('should show error when save fails after successful validation', async () => {
    mockSecureStorage.getApiKey.mockResolvedValue(null);
    mockWanikaniApi.validateApiKey.mockResolvedValue({
      success: true,
      user: { id: 1, username: 'testuser', level: 10 },
    });
    mockSecureStorage.saveApiKey.mockResolvedValue({
      success: false,
      error: 'Storage unavailable',
    });

    const { getByTestId } = renderWithNavigation();

    await waitFor(() => {
      expect(getByTestId('api-key-input')).toBeTruthy();
    });

    fireEvent.changeText(getByTestId('api-key-input'), 'test-key');
    fireEvent.press(getByTestId('save-button'));

    await waitFor(() => {
      expect(Alert.alert).toHaveBeenCalledWith('Error', 'Storage unavailable');
    });
  });

  it('should confirm before clearing API key', async () => {
    mockSecureStorage.getApiKey.mockResolvedValue('existing-key');

    const { getByTestId } = renderWithNavigation();

    await waitFor(() => {
      expect(getByTestId('clear-button')).toBeTruthy();
    });

    fireEvent.press(getByTestId('clear-button'));

    expect(Alert.alert).toHaveBeenCalledWith(
      'Clear API Key',
      'Are you sure you want to remove your API key? This will also delete all synced data.',
      expect.arrayContaining([
        expect.objectContaining({ text: 'Cancel' }),
        expect.objectContaining({ text: 'Clear' }),
      ]),
    );
  });

  it('should clear API key when confirmed', async () => {
    mockSecureStorage.getApiKey.mockResolvedValue('existing-key');

    const { getByTestId, queryByTestId } = renderWithNavigation();

    await waitFor(() => {
      expect(getByTestId('clear-button')).toBeTruthy();
    });

    fireEvent.press(getByTestId('clear-button'));

    // Get the Clear button callback from Alert.alert
    const alertCalls = (Alert.alert as jest.Mock).mock.calls;
    const clearAlertCall = alertCalls.find(call => call[0] === 'Clear API Key');
    const clearButton = clearAlertCall?.[2]?.find(
      (btn: { text: string }) => btn.text === 'Clear',
    );

    await act(async () => {
      await clearButton?.onPress?.();
    });

    expect(mockSecureStorage.clearApiKey).toHaveBeenCalled();

    await waitFor(() => {
      expect(queryByTestId('clear-button')).toBeNull();
    });
  });

  it('should trim whitespace from API key when validating and saving', async () => {
    mockSecureStorage.getApiKey.mockResolvedValue(null);

    const { getByTestId } = renderWithNavigation();

    await waitFor(() => {
      expect(getByTestId('api-key-input')).toBeTruthy();
    });

    fireEvent.changeText(getByTestId('api-key-input'), '  trimmed-key  ');
    fireEvent.press(getByTestId('save-button'));

    await waitFor(() => {
      expect(mockWanikaniApi.validateApiKey).toHaveBeenCalledWith(
        'trimmed-key',
      );
    });

    await waitFor(() => {
      expect(mockSecureStorage.saveApiKey).toHaveBeenCalledWith('trimmed-key');
    });
  });

  describe('Syncing UI', () => {
    it('should hide input form when in syncing state', async () => {
      mockSecureStorage.getApiKey.mockResolvedValue(null);
      mockWanikaniApi.validateApiKey.mockResolvedValue({
        success: true,
        user: { id: 1, username: 'testuser', level: 10 },
      });
      // Make sync never complete so we can see syncing UI
      mockSyncService.getUserLevel.mockImplementation(
        () => new Promise(() => {}),
      );

      const { getByTestId, queryByTestId } = renderWithNavigation();

      await waitFor(() => {
        expect(getByTestId('api-key-input')).toBeTruthy();
      });

      fireEvent.changeText(getByTestId('api-key-input'), 'valid-api-key');
      fireEvent.press(getByTestId('save-button'));

      // Wait for syncing view to appear
      await waitFor(() => {
        expect(getByTestId('syncing-view')).toBeTruthy();
      });

      // Input form should not be visible during syncing
      expect(queryByTestId('api-key-input')).toBeNull();
      expect(queryByTestId('save-button')).toBeNull();
    });

    it('should show correct syncing message text', async () => {
      mockSecureStorage.getApiKey.mockResolvedValue(null);
      mockWanikaniApi.validateApiKey.mockResolvedValue({
        success: true,
        user: { id: 1, username: 'testuser', level: 10 },
      });
      // Make sync never complete so we can see syncing UI
      mockSyncService.getUserLevel.mockImplementation(
        () => new Promise(() => {}),
      );

      const { getByTestId } = renderWithNavigation();

      await waitFor(() => {
        expect(getByTestId('api-key-input')).toBeTruthy();
      });

      fireEvent.changeText(getByTestId('api-key-input'), 'valid-api-key');
      fireEvent.press(getByTestId('save-button'));

      await waitFor(() => {
        expect(getByTestId('syncing-message')).toBeTruthy();
      });

      expect(getByTestId('syncing-message').props.children).toBe(
        'Syncing your WaniKani data...',
      );
    });

    it('should not show syncing UI when validation fails', async () => {
      mockSecureStorage.getApiKey.mockResolvedValue(null);
      mockWanikaniApi.validateApiKey.mockResolvedValue({
        success: false,
        error: 'Invalid API key',
      });

      const { getByTestId, queryByTestId } = renderWithNavigation();

      await waitFor(() => {
        expect(getByTestId('api-key-input')).toBeTruthy();
      });

      fireEvent.changeText(getByTestId('api-key-input'), 'bad-api-key');
      fireEvent.press(getByTestId('save-button'));

      await waitFor(() => {
        expect(Alert.alert).toHaveBeenCalledWith(
          'Validation Failed',
          'Invalid API key',
        );
      });

      // Should still show the input form, not syncing view
      expect(queryByTestId('syncing-view')).toBeNull();
      expect(getByTestId('api-key-input')).toBeTruthy();
    });

    it('should not show syncing UI when save fails', async () => {
      mockSecureStorage.getApiKey.mockResolvedValue(null);
      mockWanikaniApi.validateApiKey.mockResolvedValue({
        success: true,
        user: { id: 1, username: 'testuser', level: 10 },
      });
      mockSecureStorage.saveApiKey.mockResolvedValue({
        success: false,
        error: 'Storage unavailable',
      });

      const { getByTestId, queryByTestId } = renderWithNavigation();

      await waitFor(() => {
        expect(getByTestId('api-key-input')).toBeTruthy();
      });

      fireEvent.changeText(getByTestId('api-key-input'), 'valid-api-key');
      fireEvent.press(getByTestId('save-button'));

      await waitFor(() => {
        expect(Alert.alert).toHaveBeenCalledWith(
          'Error',
          'Storage unavailable',
        );
      });

      // Should still show the input form, not syncing view
      expect(queryByTestId('syncing-view')).toBeNull();
      expect(getByTestId('api-key-input')).toBeTruthy();
    });
  });

  describe('Sync after API key save', () => {
    it('should fetch user level after API key save', async () => {
      mockSecureStorage.getApiKey.mockResolvedValue(null);
      mockWanikaniApi.validateApiKey.mockResolvedValue({
        success: true,
        user: { id: 1, username: 'testuser', level: 15 },
      });
      mockSyncService.getUserLevel.mockResolvedValue(15);

      const { getByTestId } = renderWithNavigation();

      await waitFor(() => {
        expect(getByTestId('api-key-input')).toBeTruthy();
      });

      fireEvent.changeText(getByTestId('api-key-input'), 'valid-api-key');
      fireEvent.press(getByTestId('save-button'));

      await waitFor(() => {
        expect(mockSyncService.getUserLevel).toHaveBeenCalled();
      });

      // Verify client was created with the correct API key
      const getUserLevelCall = mockSyncService.getUserLevel.mock.calls[0];
      expect(getUserLevelCall[0]).toBeInstanceOf(wanikaniApi.WaniKaniClient);
    });

    it('should call syncSubjects with user level after API key save', async () => {
      mockSecureStorage.getApiKey.mockResolvedValue(null);
      mockWanikaniApi.validateApiKey.mockResolvedValue({
        success: true,
        user: { id: 1, username: 'testuser', level: 10 },
      });
      mockSyncService.getUserLevel.mockResolvedValue(12);

      const { getByTestId } = renderWithNavigation();

      await waitFor(() => {
        expect(getByTestId('api-key-input')).toBeTruthy();
      });

      fireEvent.changeText(getByTestId('api-key-input'), 'valid-api-key');
      fireEvent.press(getByTestId('save-button'));

      await waitFor(() => {
        expect(mockSyncService.syncSubjects).toHaveBeenCalled();
      });

      // Verify syncSubjects was called with correct maxLevel
      const syncSubjectsCall = mockSyncService.syncSubjects.mock.calls[0];
      expect(syncSubjectsCall[0]).toBeInstanceOf(wanikaniApi.WaniKaniClient);
      expect(syncSubjectsCall[1]).toEqual({ maxLevel: 12 });
    });

    it('should call syncAssignments after API key save', async () => {
      mockSecureStorage.getApiKey.mockResolvedValue(null);
      mockWanikaniApi.validateApiKey.mockResolvedValue({
        success: true,
        user: { id: 1, username: 'testuser', level: 10 },
      });

      const { getByTestId } = renderWithNavigation();

      await waitFor(() => {
        expect(getByTestId('api-key-input')).toBeTruthy();
      });

      fireEvent.changeText(getByTestId('api-key-input'), 'valid-api-key');
      fireEvent.press(getByTestId('save-button'));

      await waitFor(() => {
        expect(mockSyncService.syncAssignments).toHaveBeenCalled();
      });

      // Verify syncAssignments was called with a client
      const syncAssignmentsCall = mockSyncService.syncAssignments.mock.calls[0];
      expect(syncAssignmentsCall[0]).toBeInstanceOf(wanikaniApi.WaniKaniClient);
    });

    it('should call syncSubjects and syncAssignments in parallel', async () => {
      mockSecureStorage.getApiKey.mockResolvedValue(null);
      mockWanikaniApi.validateApiKey.mockResolvedValue({
        success: true,
        user: { id: 1, username: 'testuser', level: 10 },
      });
      mockSyncService.getUserLevel.mockResolvedValue(5);

      // Track call order using timestamps
      const callOrder: string[] = [];

      mockSyncService.syncSubjects.mockImplementation(async () => {
        callOrder.push('syncSubjects-start');
        // Simulate async work
        await new Promise<void>(resolve => setTimeout(resolve, 10));
        callOrder.push('syncSubjects-end');
        return { success: true, syncedCount: 100 };
      });

      mockSyncService.syncAssignments.mockImplementation(async () => {
        callOrder.push('syncAssignments-start');
        // Simulate async work
        await new Promise<void>(resolve => setTimeout(resolve, 10));
        callOrder.push('syncAssignments-end');
        return { success: true, syncedCount: 50 };
      });

      const { getByTestId } = renderWithNavigation();

      await waitFor(() => {
        expect(getByTestId('api-key-input')).toBeTruthy();
      });

      fireEvent.changeText(getByTestId('api-key-input'), 'valid-api-key');
      fireEvent.press(getByTestId('save-button'));

      await waitFor(() => {
        expect(mockSyncService.syncSubjects).toHaveBeenCalled();
        expect(mockSyncService.syncAssignments).toHaveBeenCalled();
      });

      // Both should start before either ends (parallel execution)
      await waitFor(() => {
        expect(callOrder).toContain('syncSubjects-start');
        expect(callOrder).toContain('syncAssignments-start');
      });

      // Verify parallel execution: both starts should happen before any end
      const subjectsStartIndex = callOrder.indexOf('syncSubjects-start');
      const assignmentsStartIndex = callOrder.indexOf('syncAssignments-start');
      const firstEndIndex = Math.min(
        callOrder.indexOf('syncSubjects-end'),
        callOrder.indexOf('syncAssignments-end'),
      );

      expect(subjectsStartIndex).toBeLessThan(firstEndIndex);
      expect(assignmentsStartIndex).toBeLessThan(firstEndIndex);
    });

    it('should not call sync functions when API key validation fails', async () => {
      mockSecureStorage.getApiKey.mockResolvedValue(null);
      mockWanikaniApi.validateApiKey.mockResolvedValue({
        success: false,
        error: 'Invalid API key',
      });

      const { getByTestId } = renderWithNavigation();

      await waitFor(() => {
        expect(getByTestId('api-key-input')).toBeTruthy();
      });

      fireEvent.changeText(getByTestId('api-key-input'), 'invalid-api-key');
      fireEvent.press(getByTestId('save-button'));

      await waitFor(() => {
        expect(Alert.alert).toHaveBeenCalledWith(
          'Validation Failed',
          'Invalid API key',
        );
      });

      expect(mockSyncService.getUserLevel).not.toHaveBeenCalled();
      expect(mockSyncService.syncSubjects).not.toHaveBeenCalled();
      expect(mockSyncService.syncAssignments).not.toHaveBeenCalled();
    });

    it('should not call sync functions when save fails', async () => {
      mockSecureStorage.getApiKey.mockResolvedValue(null);
      mockWanikaniApi.validateApiKey.mockResolvedValue({
        success: true,
        user: { id: 1, username: 'testuser', level: 10 },
      });
      mockSecureStorage.saveApiKey.mockResolvedValue({
        success: false,
        error: 'Storage unavailable',
      });

      const { getByTestId } = renderWithNavigation();

      await waitFor(() => {
        expect(getByTestId('api-key-input')).toBeTruthy();
      });

      fireEvent.changeText(getByTestId('api-key-input'), 'valid-api-key');
      fireEvent.press(getByTestId('save-button'));

      await waitFor(() => {
        expect(Alert.alert).toHaveBeenCalledWith(
          'Error',
          'Storage unavailable',
        );
      });

      expect(mockSyncService.getUserLevel).not.toHaveBeenCalled();
      expect(mockSyncService.syncSubjects).not.toHaveBeenCalled();
      expect(mockSyncService.syncAssignments).not.toHaveBeenCalled();
    });

    it('should navigate to Home screen after successful sync', async () => {
      mockSecureStorage.getApiKey.mockResolvedValue(null);
      mockWanikaniApi.validateApiKey.mockResolvedValue({
        success: true,
        user: { id: 1, username: 'testuser', level: 10 },
      });
      mockSyncService.getUserLevel.mockResolvedValue(10);
      mockSyncService.syncSubjects.mockResolvedValue({
        success: true,
        syncedCount: 100,
      });
      mockSyncService.syncAssignments.mockResolvedValue({
        success: true,
        syncedCount: 50,
      });

      const { getByTestId, queryByTestId } = renderWithNavigation('Settings');

      await waitFor(() => {
        expect(getByTestId('api-key-input')).toBeTruthy();
      });

      fireEvent.changeText(getByTestId('api-key-input'), 'valid-api-key');
      fireEvent.press(getByTestId('save-button'));

      // After sync completes, should navigate to Home screen
      await waitFor(() => {
        expect(getByTestId('home-screen')).toBeTruthy();
      });

      // Settings screen should no longer be visible
      expect(queryByTestId('syncing-view')).toBeNull();
      expect(queryByTestId('api-key-input')).toBeNull();
    });
  });

  describe('Sync error handling', () => {
    it('should show error UI when sync fails', async () => {
      mockSecureStorage.getApiKey.mockResolvedValue(null);
      mockWanikaniApi.validateApiKey.mockResolvedValue({
        success: true,
        user: { id: 1, username: 'testuser', level: 10 },
      });
      mockSyncService.getUserLevel.mockRejectedValue(
        new Error('Network request failed'),
      );

      const { getByTestId } = renderWithNavigation();

      await waitFor(() => {
        expect(getByTestId('api-key-input')).toBeTruthy();
      });

      fireEvent.changeText(getByTestId('api-key-input'), 'valid-api-key');
      fireEvent.press(getByTestId('save-button'));

      // Should show error UI
      await waitFor(() => {
        expect(getByTestId('sync-error-view')).toBeTruthy();
      });

      expect(getByTestId('sync-error-title').props.children).toBe(
        'Sync Failed',
      );
      expect(getByTestId('sync-error-message').props.children).toBe(
        'Network request failed',
      );
      expect(getByTestId('retry-button')).toBeTruthy();
    });

    it('should show error UI when syncSubjects fails', async () => {
      mockSecureStorage.getApiKey.mockResolvedValue(null);
      mockWanikaniApi.validateApiKey.mockResolvedValue({
        success: true,
        user: { id: 1, username: 'testuser', level: 10 },
      });
      mockSyncService.getUserLevel.mockResolvedValue(10);
      mockSyncService.syncSubjects.mockRejectedValue(
        new Error('Failed to sync subjects'),
      );

      const { getByTestId } = renderWithNavigation();

      await waitFor(() => {
        expect(getByTestId('api-key-input')).toBeTruthy();
      });

      fireEvent.changeText(getByTestId('api-key-input'), 'valid-api-key');
      fireEvent.press(getByTestId('save-button'));

      await waitFor(() => {
        expect(getByTestId('sync-error-view')).toBeTruthy();
      });

      expect(getByTestId('sync-error-message').props.children).toBe(
        'Failed to sync subjects',
      );
    });

    it('should show error UI when syncAssignments fails', async () => {
      mockSecureStorage.getApiKey.mockResolvedValue(null);
      mockWanikaniApi.validateApiKey.mockResolvedValue({
        success: true,
        user: { id: 1, username: 'testuser', level: 10 },
      });
      mockSyncService.getUserLevel.mockResolvedValue(10);
      mockSyncService.syncSubjects.mockResolvedValue({
        success: true,
        syncedCount: 100,
      });
      mockSyncService.syncAssignments.mockRejectedValue(
        new Error('Failed to sync assignments'),
      );

      const { getByTestId } = renderWithNavigation();

      await waitFor(() => {
        expect(getByTestId('api-key-input')).toBeTruthy();
      });

      fireEvent.changeText(getByTestId('api-key-input'), 'valid-api-key');
      fireEvent.press(getByTestId('save-button'));

      await waitFor(() => {
        expect(getByTestId('sync-error-view')).toBeTruthy();
      });

      expect(getByTestId('sync-error-message').props.children).toBe(
        'Failed to sync assignments',
      );
    });

    it('should show generic error message for non-Error exceptions', async () => {
      mockSecureStorage.getApiKey.mockResolvedValue(null);
      mockWanikaniApi.validateApiKey.mockResolvedValue({
        success: true,
        user: { id: 1, username: 'testuser', level: 10 },
      });
      mockSyncService.getUserLevel.mockRejectedValue('string error');

      const { getByTestId } = renderWithNavigation();

      await waitFor(() => {
        expect(getByTestId('api-key-input')).toBeTruthy();
      });

      fireEvent.changeText(getByTestId('api-key-input'), 'valid-api-key');
      fireEvent.press(getByTestId('save-button'));

      await waitFor(() => {
        expect(getByTestId('sync-error-view')).toBeTruthy();
      });

      expect(getByTestId('sync-error-message').props.children).toBe(
        'An unknown error occurred',
      );
    });

    it('should retry sync when retry button is pressed', async () => {
      mockSecureStorage.getApiKey.mockResolvedValue(null);
      mockWanikaniApi.validateApiKey.mockResolvedValue({
        success: true,
        user: { id: 1, username: 'testuser', level: 10 },
      });
      // First call fails, second succeeds
      mockSyncService.getUserLevel
        .mockRejectedValueOnce(new Error('Network error'))
        .mockResolvedValueOnce(10);
      mockSyncService.syncSubjects.mockResolvedValue({
        success: true,
        syncedCount: 100,
      });
      mockSyncService.syncAssignments.mockResolvedValue({
        success: true,
        syncedCount: 50,
      });

      const { getByTestId, queryByTestId } = renderWithNavigation();

      await waitFor(() => {
        expect(getByTestId('api-key-input')).toBeTruthy();
      });

      fireEvent.changeText(getByTestId('api-key-input'), 'valid-api-key');
      fireEvent.press(getByTestId('save-button'));

      // Should show error UI first
      await waitFor(() => {
        expect(getByTestId('sync-error-view')).toBeTruthy();
      });

      // Press retry
      fireEvent.press(getByTestId('retry-button'));

      // Should navigate to Home after successful retry
      await waitFor(() => {
        expect(getByTestId('home-screen')).toBeTruthy();
      });

      // Error view should be gone
      expect(queryByTestId('sync-error-view')).toBeNull();

      // getUserLevel should have been called twice (initial + retry)
      expect(mockSyncService.getUserLevel).toHaveBeenCalledTimes(2);
    });

    it('should show syncing UI during retry', async () => {
      mockSecureStorage.getApiKey.mockResolvedValue(null);
      mockWanikaniApi.validateApiKey.mockResolvedValue({
        success: true,
        user: { id: 1, username: 'testuser', level: 10 },
      });
      // First call fails
      mockSyncService.getUserLevel.mockRejectedValueOnce(
        new Error('Network error'),
      );

      const { getByTestId, queryByTestId } = renderWithNavigation();

      await waitFor(() => {
        expect(getByTestId('api-key-input')).toBeTruthy();
      });

      fireEvent.changeText(getByTestId('api-key-input'), 'valid-api-key');
      fireEvent.press(getByTestId('save-button'));

      // Should show error UI
      await waitFor(() => {
        expect(getByTestId('sync-error-view')).toBeTruthy();
      });

      // Make retry never complete so we can see syncing UI
      mockSyncService.getUserLevel.mockImplementation(
        () => new Promise(() => {}),
      );

      // Press retry
      fireEvent.press(getByTestId('retry-button'));

      // Should show syncing UI during retry
      await waitFor(() => {
        expect(getByTestId('syncing-view')).toBeTruthy();
      });

      // Error view should be hidden during syncing
      expect(queryByTestId('sync-error-view')).toBeNull();
    });

    it('should preserve API key after sync failure', async () => {
      mockSecureStorage.getApiKey.mockResolvedValue(null);
      mockWanikaniApi.validateApiKey.mockResolvedValue({
        success: true,
        user: { id: 1, username: 'testuser', level: 10 },
      });
      mockSyncService.getUserLevel.mockRejectedValue(new Error('Sync failed'));

      const { getByTestId } = renderWithNavigation();

      await waitFor(() => {
        expect(getByTestId('api-key-input')).toBeTruthy();
      });

      fireEvent.changeText(getByTestId('api-key-input'), 'valid-api-key');
      fireEvent.press(getByTestId('save-button'));

      await waitFor(() => {
        expect(getByTestId('sync-error-view')).toBeTruthy();
      });

      // API key should have been saved before sync attempt
      expect(mockSecureStorage.saveApiKey).toHaveBeenCalledWith(
        'valid-api-key',
      );

      // clearApiKey should NOT have been called - key remains saved
      expect(mockSecureStorage.clearApiKey).not.toHaveBeenCalled();
    });

    it('should show error UI again if retry also fails', async () => {
      mockSecureStorage.getApiKey.mockResolvedValue(null);
      mockWanikaniApi.validateApiKey.mockResolvedValue({
        success: true,
        user: { id: 1, username: 'testuser', level: 10 },
      });
      // Both calls fail
      mockSyncService.getUserLevel
        .mockRejectedValueOnce(new Error('First error'))
        .mockRejectedValueOnce(new Error('Second error'));

      const { getByTestId } = renderWithNavigation();

      await waitFor(() => {
        expect(getByTestId('api-key-input')).toBeTruthy();
      });

      fireEvent.changeText(getByTestId('api-key-input'), 'valid-api-key');
      fireEvent.press(getByTestId('save-button'));

      // Should show first error
      await waitFor(() => {
        expect(getByTestId('sync-error-message').props.children).toBe(
          'First error',
        );
      });

      // Press retry
      fireEvent.press(getByTestId('retry-button'));

      // Should show second error after retry fails
      await waitFor(() => {
        expect(getByTestId('sync-error-message').props.children).toBe(
          'Second error',
        );
      });

      // Retry button should still be available
      expect(getByTestId('retry-button')).toBeTruthy();
    });

    it('should not have a skip option on error UI', async () => {
      mockSecureStorage.getApiKey.mockResolvedValue(null);
      mockWanikaniApi.validateApiKey.mockResolvedValue({
        success: true,
        user: { id: 1, username: 'testuser', level: 10 },
      });
      mockSyncService.getUserLevel.mockRejectedValue(new Error('Sync failed'));

      const { getByTestId, queryByTestId } = renderWithNavigation();

      await waitFor(() => {
        expect(getByTestId('api-key-input')).toBeTruthy();
      });

      fireEvent.changeText(getByTestId('api-key-input'), 'valid-api-key');
      fireEvent.press(getByTestId('save-button'));

      await waitFor(() => {
        expect(getByTestId('sync-error-view')).toBeTruthy();
      });

      // There should be no skip button - user must retry
      expect(queryByTestId('skip-button')).toBeNull();
      // Only retry button should be available
      expect(getByTestId('retry-button')).toBeTruthy();
    });
  });

  describe('Zen Mode Settings', () => {
    it('should render zen mode toggle', async () => {
      mockSecureStorage.getApiKey.mockResolvedValue(null);

      const { getByTestId } = renderWithNavigation();

      await waitFor(() => {
        expect(getByTestId('zen-mode-setting')).toBeTruthy();
      });

      expect(getByTestId('zen-mode-toggle')).toBeTruthy();
    });

    it('should load zen mode setting as off by default', async () => {
      mockSecureStorage.getApiKey.mockResolvedValue(null);
      mockDatabase.getSetting.mockResolvedValue(null);

      const { getByTestId } = renderWithNavigation();

      await waitFor(() => {
        expect(getByTestId('zen-mode-toggle')).toBeTruthy();
      });

      // Switch should be off
      expect(getByTestId('zen-mode-toggle').props.value).toBe(false);
    });

    it('should load zen mode setting as on when stored as true', async () => {
      mockSecureStorage.getApiKey.mockResolvedValue(null);
      mockDatabase.getSetting.mockResolvedValue(true);

      const { getByTestId } = renderWithNavigation();

      await waitFor(() => {
        expect(getByTestId('zen-mode-toggle')).toBeTruthy();
      });

      // Switch should be on
      expect(getByTestId('zen-mode-toggle').props.value).toBe(true);
    });

    it('should save zen mode setting when toggled on', async () => {
      mockSecureStorage.getApiKey.mockResolvedValue(null);
      mockDatabase.getSetting.mockResolvedValue(false);

      const { getByTestId } = renderWithNavigation();

      await waitFor(() => {
        expect(getByTestId('zen-mode-toggle')).toBeTruthy();
      });

      // Toggle zen mode on
      await act(async () => {
        fireEvent(getByTestId('zen-mode-toggle'), 'valueChange', true);
      });

      expect(mockDatabase.setSetting).toHaveBeenCalledWith('zenMode', true);
    });

    it('should save zen mode setting when toggled off', async () => {
      mockSecureStorage.getApiKey.mockResolvedValue(null);
      mockDatabase.getSetting.mockResolvedValue(true);

      const { getByTestId } = renderWithNavigation();

      await waitFor(() => {
        expect(getByTestId('zen-mode-toggle')).toBeTruthy();
      });

      // Toggle zen mode off
      await act(async () => {
        fireEvent(getByTestId('zen-mode-toggle'), 'valueChange', false);
      });

      expect(mockDatabase.setSetting).toHaveBeenCalledWith('zenMode', false);
    });

    it('should update toggle state when toggled', async () => {
      mockSecureStorage.getApiKey.mockResolvedValue(null);
      mockDatabase.getSetting.mockResolvedValue(false);

      const { getByTestId } = renderWithNavigation();

      await waitFor(() => {
        expect(getByTestId('zen-mode-toggle')).toBeTruthy();
      });

      // Initially off
      expect(getByTestId('zen-mode-toggle').props.value).toBe(false);

      // Toggle on
      await act(async () => {
        fireEvent(getByTestId('zen-mode-toggle'), 'valueChange', true);
      });

      // Should now be on
      expect(getByTestId('zen-mode-toggle').props.value).toBe(true);
    });

    it('should load zen mode setting with getSetting call', async () => {
      mockSecureStorage.getApiKey.mockResolvedValue(null);

      renderWithNavigation();

      await waitFor(() => {
        expect(mockDatabase.getSetting).toHaveBeenCalledWith('zenMode');
      });
    });
  });

  describe('Notification Permission Flow', () => {
    it('should navigate to Home when permissions already granted', async () => {
      mockSecureStorage.getApiKey.mockResolvedValue(null);
      mockWanikaniApi.validateApiKey.mockResolvedValue({
        success: true,
        user: { id: 1, username: 'testuser', level: 10 },
      });
      mockSyncService.getUserLevel.mockResolvedValue(10);
      mockSyncService.syncSubjects.mockResolvedValue({
        success: true,
        syncedCount: 100,
      });
      mockSyncService.syncAssignments.mockResolvedValue({
        success: true,
        syncedCount: 50,
      });
      // Permissions already granted
      mockNotificationService.checkPermissions.mockResolvedValue('granted');
      mockNotificationService.hasAskedForPermissions.mockResolvedValue(false);

      const { getByTestId } = renderWithNavigation('Settings');

      await waitFor(() => {
        expect(getByTestId('api-key-input')).toBeTruthy();
      });

      fireEvent.changeText(getByTestId('api-key-input'), 'valid-api-key');
      fireEvent.press(getByTestId('save-button'));

      // Should navigate directly to Home since permissions already granted
      await waitFor(() => {
        expect(getByTestId('home-screen')).toBeTruthy();
      });
    });

    it('should navigate to NotificationPermission when permissions not granted and not asked before', async () => {
      mockSecureStorage.getApiKey.mockResolvedValue(null);
      mockWanikaniApi.validateApiKey.mockResolvedValue({
        success: true,
        user: { id: 1, username: 'testuser', level: 10 },
      });
      mockSyncService.getUserLevel.mockResolvedValue(10);
      mockSyncService.syncSubjects.mockResolvedValue({
        success: true,
        syncedCount: 100,
      });
      mockSyncService.syncAssignments.mockResolvedValue({
        success: true,
        syncedCount: 50,
      });
      // Permissions not granted and not asked
      mockNotificationService.checkPermissions.mockResolvedValue(
        'not_determined',
      );
      mockNotificationService.hasAskedForPermissions.mockResolvedValue(false);

      const { getByTestId, queryByTestId } = renderWithNavigation('Settings');

      await waitFor(() => {
        expect(getByTestId('api-key-input')).toBeTruthy();
      });

      fireEvent.changeText(getByTestId('api-key-input'), 'valid-api-key');
      fireEvent.press(getByTestId('save-button'));

      // Should navigate to NotificationPermission screen
      await waitFor(() => {
        expect(getByTestId('notification-permission-screen')).toBeTruthy();
      });

      // Home should not be visible yet
      expect(queryByTestId('home-screen')).toBeNull();
    });

    it('should navigate to Home when already asked for permissions', async () => {
      mockSecureStorage.getApiKey.mockResolvedValue(null);
      mockWanikaniApi.validateApiKey.mockResolvedValue({
        success: true,
        user: { id: 1, username: 'testuser', level: 10 },
      });
      mockSyncService.getUserLevel.mockResolvedValue(10);
      mockSyncService.syncSubjects.mockResolvedValue({
        success: true,
        syncedCount: 100,
      });
      mockSyncService.syncAssignments.mockResolvedValue({
        success: true,
        syncedCount: 50,
      });
      // Permissions denied but already asked before
      mockNotificationService.checkPermissions.mockResolvedValue('denied');
      mockNotificationService.hasAskedForPermissions.mockResolvedValue(true);

      const { getByTestId } = renderWithNavigation('Settings');

      await waitFor(() => {
        expect(getByTestId('api-key-input')).toBeTruthy();
      });

      fireEvent.changeText(getByTestId('api-key-input'), 'valid-api-key');
      fireEvent.press(getByTestId('save-button'));

      // Should navigate directly to Home since we already asked
      await waitFor(() => {
        expect(getByTestId('home-screen')).toBeTruthy();
      });
    });

    it('should check permissions after successful sync', async () => {
      mockSecureStorage.getApiKey.mockResolvedValue(null);
      mockWanikaniApi.validateApiKey.mockResolvedValue({
        success: true,
        user: { id: 1, username: 'testuser', level: 10 },
      });
      mockSyncService.getUserLevel.mockResolvedValue(10);
      mockSyncService.syncSubjects.mockResolvedValue({
        success: true,
        syncedCount: 100,
      });
      mockSyncService.syncAssignments.mockResolvedValue({
        success: true,
        syncedCount: 50,
      });

      const { getByTestId } = renderWithNavigation('Settings');

      await waitFor(() => {
        expect(getByTestId('api-key-input')).toBeTruthy();
      });

      fireEvent.changeText(getByTestId('api-key-input'), 'valid-api-key');
      fireEvent.press(getByTestId('save-button'));

      await waitFor(() => {
        expect(mockNotificationService.checkPermissions).toHaveBeenCalled();
      });

      await waitFor(() => {
        expect(
          mockNotificationService.hasAskedForPermissions,
        ).toHaveBeenCalled();
      });
    });

    it('should navigate to NotificationPermission when permissions denied and not asked before', async () => {
      mockSecureStorage.getApiKey.mockResolvedValue(null);
      mockWanikaniApi.validateApiKey.mockResolvedValue({
        success: true,
        user: { id: 1, username: 'testuser', level: 10 },
      });
      mockSyncService.getUserLevel.mockResolvedValue(10);
      mockSyncService.syncSubjects.mockResolvedValue({
        success: true,
        syncedCount: 100,
      });
      mockSyncService.syncAssignments.mockResolvedValue({
        success: true,
        syncedCount: 50,
      });
      // Permissions denied and never asked
      mockNotificationService.checkPermissions.mockResolvedValue('denied');
      mockNotificationService.hasAskedForPermissions.mockResolvedValue(false);

      const { getByTestId } = renderWithNavigation('Settings');

      await waitFor(() => {
        expect(getByTestId('api-key-input')).toBeTruthy();
      });

      fireEvent.changeText(getByTestId('api-key-input'), 'valid-api-key');
      fireEvent.press(getByTestId('save-button'));

      // Should navigate to NotificationPermission screen
      await waitFor(() => {
        expect(getByTestId('notification-permission-screen')).toBeTruthy();
      });
    });
  });

  describe('Notification Settings Toggle', () => {
    it('should render enabled notifications toggle when permissions granted', async () => {
      mockSecureStorage.getApiKey.mockResolvedValue(null);
      mockNotificationService.checkPermissions.mockResolvedValue('granted');
      mockNotificationService.getNotificationsEnabled.mockResolvedValue(true);

      const { getByTestId, queryByTestId } = renderWithNavigation();

      await waitFor(() => {
        expect(getByTestId('notifications-setting')).toBeTruthy();
      });

      expect(getByTestId('notifications-toggle')).toBeTruthy();
      expect(queryByTestId('notifications-setting-disabled')).toBeNull();
    });

    it('should render disabled notifications toggle when permissions not granted', async () => {
      mockSecureStorage.getApiKey.mockResolvedValue(null);
      mockNotificationService.checkPermissions.mockResolvedValue('denied');
      mockNotificationService.getNotificationsEnabled.mockResolvedValue(false);

      const { getByTestId, queryByTestId } = renderWithNavigation();

      await waitFor(() => {
        expect(getByTestId('notifications-setting-disabled')).toBeTruthy();
      });

      expect(getByTestId('notifications-toggle-disabled')).toBeTruthy();
      expect(queryByTestId('notifications-setting')).toBeNull();
    });

    it('should load notifications enabled setting as on when stored as true', async () => {
      mockSecureStorage.getApiKey.mockResolvedValue(null);
      mockNotificationService.checkPermissions.mockResolvedValue('granted');
      mockNotificationService.getNotificationsEnabled.mockResolvedValue(true);

      const { getByTestId } = renderWithNavigation();

      await waitFor(() => {
        expect(getByTestId('notifications-toggle')).toBeTruthy();
      });

      expect(getByTestId('notifications-toggle').props.value).toBe(true);
    });

    it('should load notifications enabled setting as off when stored as false', async () => {
      mockSecureStorage.getApiKey.mockResolvedValue(null);
      mockNotificationService.checkPermissions.mockResolvedValue('granted');
      mockNotificationService.getNotificationsEnabled.mockResolvedValue(false);

      const { getByTestId } = renderWithNavigation();

      await waitFor(() => {
        expect(getByTestId('notifications-toggle')).toBeTruthy();
      });

      expect(getByTestId('notifications-toggle').props.value).toBe(false);
    });

    it('should save notification setting when toggled on', async () => {
      mockSecureStorage.getApiKey.mockResolvedValue(null);
      mockNotificationService.checkPermissions.mockResolvedValue('granted');
      mockNotificationService.getNotificationsEnabled.mockResolvedValue(false);

      const { getByTestId } = renderWithNavigation();

      await waitFor(() => {
        expect(getByTestId('notifications-toggle')).toBeTruthy();
      });

      await act(async () => {
        fireEvent(getByTestId('notifications-toggle'), 'valueChange', true);
      });

      expect(
        mockNotificationService.setNotificationsEnabled,
      ).toHaveBeenCalledWith(true);
    });

    it('should save notification setting when toggled off', async () => {
      mockSecureStorage.getApiKey.mockResolvedValue(null);
      mockNotificationService.checkPermissions.mockResolvedValue('granted');
      mockNotificationService.getNotificationsEnabled.mockResolvedValue(true);

      const { getByTestId } = renderWithNavigation();

      await waitFor(() => {
        expect(getByTestId('notifications-toggle')).toBeTruthy();
      });

      await act(async () => {
        fireEvent(getByTestId('notifications-toggle'), 'valueChange', false);
      });

      expect(
        mockNotificationService.setNotificationsEnabled,
      ).toHaveBeenCalledWith(false);
    });

    it('should update toggle state when toggled', async () => {
      mockSecureStorage.getApiKey.mockResolvedValue(null);
      mockNotificationService.checkPermissions.mockResolvedValue('granted');
      mockNotificationService.getNotificationsEnabled.mockResolvedValue(false);

      const { getByTestId } = renderWithNavigation();

      await waitFor(() => {
        expect(getByTestId('notifications-toggle')).toBeTruthy();
      });

      // Initially off
      expect(getByTestId('notifications-toggle').props.value).toBe(false);

      // Toggle on
      await act(async () => {
        fireEvent(getByTestId('notifications-toggle'), 'valueChange', true);
      });

      // Should now be on
      expect(getByTestId('notifications-toggle').props.value).toBe(true);
    });

    it('should open system notification settings when disabled toggle is pressed', async () => {
      mockSecureStorage.getApiKey.mockResolvedValue(null);
      mockNotificationService.checkPermissions.mockResolvedValue('denied');
      mockNotificationService.getNotificationsEnabled.mockResolvedValue(false);

      const { getByTestId } = renderWithNavigation();

      await waitFor(() => {
        expect(getByTestId('notifications-setting-disabled')).toBeTruthy();
      });

      await act(async () => {
        fireEvent.press(getByTestId('notifications-setting-disabled'));
      });

      expect(
        mockNotificationService.openNotificationSettings,
      ).toHaveBeenCalled();
    });

    it('should check permissions on load', async () => {
      mockSecureStorage.getApiKey.mockResolvedValue(null);
      mockNotificationService.checkPermissions.mockResolvedValue('granted');
      mockNotificationService.getNotificationsEnabled.mockResolvedValue(true);

      renderWithNavigation();

      await waitFor(() => {
        expect(mockNotificationService.checkPermissions).toHaveBeenCalled();
      });
    });

    it('should load notifications enabled setting on mount', async () => {
      mockSecureStorage.getApiKey.mockResolvedValue(null);
      mockNotificationService.checkPermissions.mockResolvedValue('granted');
      mockNotificationService.getNotificationsEnabled.mockResolvedValue(true);

      renderWithNavigation();

      await waitFor(() => {
        expect(
          mockNotificationService.getNotificationsEnabled,
        ).toHaveBeenCalled();
      });
    });

    it('should show disabled toggle for not_determined permission status', async () => {
      mockSecureStorage.getApiKey.mockResolvedValue(null);
      mockNotificationService.checkPermissions.mockResolvedValue(
        'not_determined',
      );
      mockNotificationService.getNotificationsEnabled.mockResolvedValue(false);

      const { getByTestId, queryByTestId } = renderWithNavigation();

      await waitFor(() => {
        expect(getByTestId('notifications-setting-disabled')).toBeTruthy();
      });

      expect(queryByTestId('notifications-setting')).toBeNull();
    });

    it('should persist notifications setting across restarts', async () => {
      mockSecureStorage.getApiKey.mockResolvedValue(null);
      mockNotificationService.checkPermissions.mockResolvedValue('granted');
      mockNotificationService.getNotificationsEnabled.mockResolvedValue(true);

      const { getByTestId } = renderWithNavigation();

      await waitFor(() => {
        expect(getByTestId('notifications-toggle')).toBeTruthy();
      });

      // Verify the toggle shows the stored value
      expect(getByTestId('notifications-toggle').props.value).toBe(true);

      // Verify getNotificationsEnabled was called to load the setting
      expect(
        mockNotificationService.getNotificationsEnabled,
      ).toHaveBeenCalled();
    });
  });
});
