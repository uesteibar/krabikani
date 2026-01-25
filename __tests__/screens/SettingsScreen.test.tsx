import {
  act,
  fireEvent,
  render,
  waitFor,
} from '@testing-library/react-native';
import React from 'react';
import { Alert } from 'react-native';

import { SettingsScreen } from '../../src/screens/SettingsScreen';
import * as wanikaniApi from '../../src/api/wanikaniApi';
import * as secureStorage from '../../src/storage/secureStorage';
import * as syncService from '../../src/sync/syncService';

jest.mock('../../src/storage/secureStorage');
jest.mock('../../src/api/wanikaniApi');
jest.mock('../../src/sync/syncService');
jest.spyOn(Alert, 'alert');

const mockSecureStorage = secureStorage as jest.Mocked<typeof secureStorage>;
const mockWanikaniApi = wanikaniApi as jest.Mocked<typeof wanikaniApi>;
const mockSyncService = syncService as jest.Mocked<typeof syncService>;

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
  });

  it('should render loading state initially', async () => {
    mockSecureStorage.getApiKey.mockImplementation(
      () => new Promise(() => {}), // Never resolves
    );

    const { getByTestId } = render(<SettingsScreen />);

    // While loading, the input should not be visible
    expect(() => getByTestId('api-key-input')).toThrow();
  });

  it('should render empty input when no API key is stored', async () => {
    mockSecureStorage.getApiKey.mockResolvedValue(null);

    const { getByTestId, queryByTestId } = render(<SettingsScreen />);

    await waitFor(() => {
      expect(getByTestId('api-key-input')).toBeTruthy();
    });

    expect(getByTestId('api-key-input').props.value).toBe('');
    expect(queryByTestId('clear-button')).toBeNull();
  });

  it('should render stored API key and show clear button', async () => {
    mockSecureStorage.getApiKey.mockResolvedValue('existing-api-key');

    const { getByTestId } = render(<SettingsScreen />);

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

    const { getByTestId } = render(<SettingsScreen />);

    await waitFor(() => {
      expect(getByTestId('api-key-input')).toBeTruthy();
    });

    fireEvent.changeText(getByTestId('api-key-input'), 'new-api-key');
    fireEvent.press(getByTestId('save-button'));

    await waitFor(() => {
      expect(mockWanikaniApi.validateApiKey).toHaveBeenCalledWith('new-api-key');
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
    expect(Alert.alert).not.toHaveBeenCalledWith(
      'Success',
      expect.any(String),
    );
  });

  it('should show error when API key validation fails', async () => {
    mockSecureStorage.getApiKey.mockResolvedValue(null);
    mockWanikaniApi.validateApiKey.mockResolvedValue({
      success: false,
      error: 'Invalid API key',
    });

    const { getByTestId } = render(<SettingsScreen />);

    await waitFor(() => {
      expect(getByTestId('api-key-input')).toBeTruthy();
    });

    fireEvent.changeText(getByTestId('api-key-input'), 'bad-api-key');
    fireEvent.press(getByTestId('save-button'));

    await waitFor(() => {
      expect(mockWanikaniApi.validateApiKey).toHaveBeenCalledWith('bad-api-key');
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

    const { getByTestId } = render(<SettingsScreen />);

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

    const { getByTestId } = render(<SettingsScreen />);

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

    const { getByTestId } = render(<SettingsScreen />);

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

    const { getByTestId } = render(<SettingsScreen />);

    await waitFor(() => {
      expect(getByTestId('clear-button')).toBeTruthy();
    });

    fireEvent.press(getByTestId('clear-button'));

    expect(Alert.alert).toHaveBeenCalledWith(
      'Clear API Key',
      'Are you sure you want to remove your API key?',
      expect.arrayContaining([
        expect.objectContaining({ text: 'Cancel' }),
        expect.objectContaining({ text: 'Clear' }),
      ]),
    );
  });

  it('should clear API key when confirmed', async () => {
    mockSecureStorage.getApiKey.mockResolvedValue('existing-key');

    const { getByTestId, queryByTestId } = render(<SettingsScreen />);

    await waitFor(() => {
      expect(getByTestId('clear-button')).toBeTruthy();
    });

    fireEvent.press(getByTestId('clear-button'));

    // Get the Clear button callback from Alert.alert
    const alertCalls = (Alert.alert as jest.Mock).mock.calls;
    const clearAlertCall = alertCalls.find(
      call => call[0] === 'Clear API Key',
    );
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

    const { getByTestId } = render(<SettingsScreen />);

    await waitFor(() => {
      expect(getByTestId('api-key-input')).toBeTruthy();
    });

    fireEvent.changeText(getByTestId('api-key-input'), '  trimmed-key  ');
    fireEvent.press(getByTestId('save-button'));

    await waitFor(() => {
      expect(mockWanikaniApi.validateApiKey).toHaveBeenCalledWith('trimmed-key');
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

      const { getByTestId, queryByTestId } = render(<SettingsScreen />);

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

      const { getByTestId } = render(<SettingsScreen />);

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

      const { getByTestId, queryByTestId } = render(<SettingsScreen />);

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

      const { getByTestId, queryByTestId } = render(<SettingsScreen />);

      await waitFor(() => {
        expect(getByTestId('api-key-input')).toBeTruthy();
      });

      fireEvent.changeText(getByTestId('api-key-input'), 'valid-api-key');
      fireEvent.press(getByTestId('save-button'));

      await waitFor(() => {
        expect(Alert.alert).toHaveBeenCalledWith('Error', 'Storage unavailable');
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

      const { getByTestId } = render(<SettingsScreen />);

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

      const { getByTestId } = render(<SettingsScreen />);

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

      const { getByTestId } = render(<SettingsScreen />);

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

      const { getByTestId } = render(<SettingsScreen />);

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

      const { getByTestId } = render(<SettingsScreen />);

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

      const { getByTestId } = render(<SettingsScreen />);

      await waitFor(() => {
        expect(getByTestId('api-key-input')).toBeTruthy();
      });

      fireEvent.changeText(getByTestId('api-key-input'), 'valid-api-key');
      fireEvent.press(getByTestId('save-button'));

      await waitFor(() => {
        expect(Alert.alert).toHaveBeenCalledWith('Error', 'Storage unavailable');
      });

      expect(mockSyncService.getUserLevel).not.toHaveBeenCalled();
      expect(mockSyncService.syncSubjects).not.toHaveBeenCalled();
      expect(mockSyncService.syncAssignments).not.toHaveBeenCalled();
    });
  });
});
