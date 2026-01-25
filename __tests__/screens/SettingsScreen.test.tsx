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

jest.mock('../../src/storage/secureStorage');
jest.mock('../../src/api/wanikaniApi');
jest.spyOn(Alert, 'alert');

const mockSecureStorage = secureStorage as jest.Mocked<typeof secureStorage>;
const mockWanikaniApi = wanikaniApi as jest.Mocked<typeof wanikaniApi>;

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

  it('should validate and save API key when save button is pressed', async () => {
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

    expect(Alert.alert).toHaveBeenCalledWith(
      'Success',
      'API key validated and saved!\nWelcome, happyuser!',
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
});
