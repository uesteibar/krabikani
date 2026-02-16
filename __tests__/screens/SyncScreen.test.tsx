import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';

import { SyncScreen } from '../../src/screens/SyncScreen';
import { ThemeProvider } from '../../src/theme';

const mockNavigate = jest.fn();
const mockReset = jest.fn();

jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({
    navigate: mockNavigate,
    reset: mockReset,
  }),
}));

const mockGetApiKey = jest.fn();
jest.mock('../../src/storage', () => ({
  getApiKey: (...args: unknown[]) => mockGetApiKey(...args),
}));

const mockGetUserLevel = jest.fn();
const mockSyncSubjects = jest.fn();
const mockSyncAssignments = jest.fn();
jest.mock('../../src/sync', () => ({
  getUserLevel: (...args: unknown[]) => mockGetUserLevel(...args),
  syncSubjects: (...args: unknown[]) => mockSyncSubjects(...args),
  syncAssignments: (...args: unknown[]) => mockSyncAssignments(...args),
}));

jest.mock('../../src/api', () => ({
  WaniKaniClient: jest.fn().mockImplementation(() => ({})),
}));

function renderWithTheme(
  ui: React.ReactElement,
  colorScheme: 'light' | 'dark' = 'light',
) {
  return render(
    <ThemeProvider forcedColorScheme={colorScheme}>{ui}</ThemeProvider>,
  );
}

describe('SyncScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetApiKey.mockResolvedValue('test-api-key');
    mockGetUserLevel.mockResolvedValue(5);
    mockSyncSubjects.mockResolvedValue({ success: true, syncedCount: 100 });
    mockSyncAssignments.mockResolvedValue({ success: true, syncedCount: 50 });
  });

  it('renders the screen', () => {
    const { getByTestId } = renderWithTheme(<SyncScreen />);
    expect(getByTestId('sync-screen')).toBeTruthy();
  });

  it('displays syncing status text', () => {
    const { getByText } = renderWithTheme(<SyncScreen />);
    expect(getByText('Syncing your data...')).toBeTruthy();
  });

  it('shows a loading indicator', () => {
    const { getByTestId } = renderWithTheme(<SyncScreen />);
    expect(getByTestId('sync-loading-indicator')).toBeTruthy();
  });

  it('navigates to WizardNotification on successful sync', async () => {
    renderWithTheme(<SyncScreen />);

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('WizardNotification');
    });
  });

  it('shows error with retry on sync failure', async () => {
    mockGetUserLevel.mockRejectedValue(new Error('Sync failed'));

    const { findByTestId, findByText } = renderWithTheme(<SyncScreen />);

    await findByText('Sync failed. Check your connection and try again.');
    const retryButton = await findByTestId('retry-button');
    expect(retryButton).toBeTruthy();
  });

  it('retries sync when retry button is pressed', async () => {
    mockGetUserLevel.mockRejectedValue(new Error('fail'));

    const { findByTestId } = renderWithTheme(<SyncScreen />);

    // Wait for first failure to show retry button
    const retryButton = await findByTestId('retry-button');
    const callsBefore = mockGetUserLevel.mock.calls.length;

    // Press retry — should trigger another sync attempt
    fireEvent.press(retryButton);

    await waitFor(() => {
      expect(mockGetUserLevel.mock.calls.length).toBeGreaterThan(callsBefore);
    });
  });

  describe('Theme-aware styling', () => {
    it('should use light retry button text color in light mode', async () => {
      mockGetUserLevel.mockRejectedValue(new Error('Sync failed'));
      const { getByText } = renderWithTheme(<SyncScreen />);
      await waitFor(() => {
        const retryText = getByText('Retry');
        const flatStyle = Array.isArray(retryText.props.style)
          ? Object.assign({}, ...retryText.props.style.flat())
          : retryText.props.style;
        expect(flatStyle.color).toBe('#FFFFFF');
      });
    });

    it('should use dark retry button text color in dark mode', async () => {
      mockGetUserLevel.mockRejectedValue(new Error('Sync failed'));
      const { getByText } = renderWithTheme(<SyncScreen />, 'dark');
      await waitFor(() => {
        const retryText = getByText('Retry');
        const flatStyle = Array.isArray(retryText.props.style)
          ? Object.assign({}, ...retryText.props.style.flat())
          : retryText.props.style;
        expect(flatStyle.color).toBe('#121212');
      });
    });
  });
});
