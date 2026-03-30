// Mock WearDataModule
const mockSendReviewData = jest.fn().mockResolvedValue(undefined);
jest.mock('../../src/native/WearDataModule', () => ({
  sendReviewData: (...args: unknown[]) => mockSendReviewData(...args),
}));

// Mock the modules
jest.mock('@react-native-community/netinfo');
jest.mock('@op-engineering/op-sqlite');
jest.mock('react-native-keychain');

// Mock the sync module
jest.mock('../../src/sync/syncService', () => ({
  syncSubjects: jest.fn().mockResolvedValue({ success: true, syncedCount: 10 }),
  syncAssignments: jest
    .fn()
    .mockResolvedValue({ success: true, syncedCount: 5 }),
  getUserLevel: jest.fn().mockResolvedValue(5),
}));

// Mock the API client
jest.mock('../../src/api/wanikaniApi', () => ({
  WaniKaniClient: jest.fn().mockImplementation(() => ({})),
}));

import React from 'react';
import { render, waitFor, fireEvent, act } from '@testing-library/react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import { HomeScreen } from '../../src/screens/HomeScreen';
import { LessonsScreen } from '../../src/screens/LessonsScreen';
import { ReviewsScreen } from '../../src/screens/ReviewsScreen';
import { ThemeProvider } from '../../src/theme';
import {
  initializeNetworkMonitoring,
  stopNetworkMonitoring,
  _resetNetworkStatus,
} from '../../src/utils/networkStatus';
import { _resetAppStateSync } from '../../src/utils/appStateSync';

// Mock appStateSync module to control listener behavior
const mockSyncStatusListeners: Set<(syncing: boolean) => void> = new Set();
const mockSyncErrorListeners: Set<(error: Error) => void> = new Set();
const mockBackgroundSyncListeners: Set<() => void> = new Set();

jest.mock('../../src/utils/appStateSync', () => ({
  addSyncStatusListener: jest.fn((listener: (syncing: boolean) => void) => {
    mockSyncStatusListeners.add(listener);
    return () => mockSyncStatusListeners.delete(listener);
  }),
  addSyncErrorListener: jest.fn((listener: (error: Error) => void) => {
    mockSyncErrorListeners.add(listener);
    return () => mockSyncErrorListeners.delete(listener);
  }),
  addBackgroundSyncListener: jest.fn((listener: () => void) => {
    mockBackgroundSyncListeners.add(listener);
    return () => mockBackgroundSyncListeners.delete(listener);
  }),
  _resetAppStateSync: jest.fn(() => {
    mockSyncStatusListeners.clear();
    mockSyncErrorListeners.clear();
    mockBackgroundSyncListeners.clear();
  }),
}));
import {
  initializeDatabase,
  _resetDatabaseInstance,
  upsertSubject,
  upsertAssignment,
  updateSyncStatus,
  insertPendingReview,
  insertPendingLesson,
  saveVacationStartedAt,
} from '../../src/storage/database';
import type { RootStackParamList } from '../../src/navigation/types';

// Get mock helpers from the mocked modules
const { __setMockNetworkState, __resetMock } = jest.requireMock(
  '@react-native-community/netinfo',
);

const { __resetMockDatabase } = jest.requireMock('@op-engineering/op-sqlite');

const { __setStoredApiKey, __resetMock: __resetKeychainMock } =
  jest.requireMock('react-native-keychain');

const { syncSubjects, syncAssignments, getUserLevel } = jest.requireMock(
  '../../src/sync/syncService',
);

const Stack = createNativeStackNavigator<RootStackParamList>();

// Wrapper component for navigation context with full navigator
function renderWithNavigation(component: React.ReactElement) {
  return render(
    <ThemeProvider forcedColorScheme="light">
      <NavigationContainer>{component}</NavigationContainer>
    </ThemeProvider>,
  );
}

// Full navigator for testing navigation
function renderWithFullNavigator() {
  return render(
    <ThemeProvider forcedColorScheme="light">
      <NavigationContainer>
        <Stack.Navigator initialRouteName="Home">
          <Stack.Screen name="Home" component={HomeScreen} />
          <Stack.Screen name="Lessons" component={LessonsScreen} />
          <Stack.Screen name="Reviews" component={ReviewsScreen} />
        </Stack.Navigator>
      </NavigationContainer>
    </ThemeProvider>,
  );
}

// Helper to simulate sync status change
function simulateSyncStatusChange(syncing: boolean) {
  mockSyncStatusListeners.forEach(listener => listener(syncing));
}

// Helper to simulate sync error
function simulateSyncError(error: Error) {
  mockSyncErrorListeners.forEach(listener => listener(error));
}

describe('HomeScreen', () => {
  beforeEach(async () => {
    // Reset all state before each test
    __resetMock();
    __resetMockDatabase();
    _resetNetworkStatus();
    _resetDatabaseInstance();
    _resetAppStateSync();
    mockSendReviewData.mockClear();

    // Initialize fresh database
    await initializeDatabase();

    // Default to online state
    __setMockNetworkState({ isConnected: true });
    initializeNetworkMonitoring();
  });

  afterEach(() => {
    stopNetworkMonitoring();
    _resetAppStateSync();
  });

  describe('normal state (online with or without data)', () => {
    it('renders the logo', async () => {
      const { getByTestId } = renderWithNavigation(<HomeScreen />);

      await waitFor(() => {
        expect(getByTestId('home-logo')).toBeTruthy();
      });
    });

    it('renders the settings button', async () => {
      const { getByTestId } = renderWithNavigation(<HomeScreen />);

      await waitFor(() => {
        expect(getByTestId('settings-button')).toBeTruthy();
      });
    });

    it('renders the last synced indicator', async () => {
      const { getByTestId } = renderWithNavigation(<HomeScreen />);

      await waitFor(() => {
        expect(getByTestId('last-synced-indicator')).toBeTruthy();
      });
    });

    it('shows "Never synced" when no sync has occurred', async () => {
      const { getByText } = renderWithNavigation(<HomeScreen />);

      await waitFor(() => {
        expect(getByText('Last synced:')).toBeTruthy();
        expect(getByText('Never synced')).toBeTruthy();
      });
    });

    it('shows relative time when sync has occurred', async () => {
      const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();
      await updateSyncStatus({ last_subjects_sync: fiveMinutesAgo });

      const { getByText } = renderWithNavigation(<HomeScreen />);

      await waitFor(() => {
        expect(getByText('Last synced:')).toBeTruthy();
        expect(getByText('5 minutes ago')).toBeTruthy();
      });
    });

    it('does not show offline indicator when online', async () => {
      const { queryByTestId } = renderWithNavigation(<HomeScreen />);

      await waitFor(() => {
        expect(queryByTestId('offline-indicator')).toBeNull();
      });
    });

    it('renders the dashboard stats component', async () => {
      const { getByTestId } = renderWithNavigation(<HomeScreen />);

      await waitFor(() => {
        expect(getByTestId('dashboard-stats')).toBeTruthy();
      });
    });

    it('renders the level indicator when level is cached', async () => {
      await updateSyncStatus({ user_level: 5 });

      const { getByTestId, getByText } = renderWithNavigation(<HomeScreen />);

      await waitFor(() => {
        expect(getByTestId('level-indicator')).toBeTruthy();
        expect(getByText('LEVEL')).toBeTruthy();
        expect(getByText('5')).toBeTruthy();
      });
    });

    it('does not render level indicator when no level is cached', async () => {
      const { queryByTestId } = renderWithNavigation(<HomeScreen />);

      await waitFor(() => {
        // Level indicator should not render when level is null
        expect(queryByTestId('level-indicator')).toBeNull();
      });
    });

    it('shows zero counts when no lessons or reviews available', async () => {
      const { getByText } = renderWithNavigation(<HomeScreen />);

      await waitFor(() => {
        expect(getByText(/0.*available lessons/)).toBeTruthy();
        expect(getByText(/0.*pending reviews/)).toBeTruthy();
      });
    });

    it('shows lessons count from local cache', async () => {
      // Add a subject first
      await upsertSubject({
        id: 100,
        object_type: 'radical',
        characters: '一',
        meanings: JSON.stringify([
          { meaning: 'one', primary: true, accepted_answer: true },
        ]),
        readings: null,
        meaning_mnemonic: 'Test mnemonic',
        reading_mnemonic: null,
        level: 1,
        component_subject_ids: null,
        character_images: null,
        auxiliary_meanings: null,
        data_updated_at: null,
      });

      // Add an assignment that is a lesson (unlocked but not started)
      await upsertAssignment({
        id: 1,
        subject_id: 100,
        srs_stage: 0,
        available_at: null,
        started_at: null,
        unlocked_at: new Date().toISOString(),
        data_updated_at: null,
      });

      const { getByText } = renderWithNavigation(<HomeScreen />);

      await waitFor(() => {
        expect(getByText(/1.*available lessons/)).toBeTruthy();
      });
    });

    it('shows reviews count from local cache', async () => {
      // Add a subject first
      await upsertSubject({
        id: 100,
        object_type: 'kanji',
        characters: '一',
        meanings: JSON.stringify([
          { meaning: 'one', primary: true, accepted_answer: true },
        ]),
        readings: JSON.stringify([
          { reading: 'いち', primary: true, accepted_answer: true },
        ]),
        meaning_mnemonic: 'Test mnemonic',
        reading_mnemonic: 'Reading mnemonic',
        level: 1,
        component_subject_ids: null,
        character_images: null,
        auxiliary_meanings: null,
        data_updated_at: null,
      });

      // Add an assignment that is a review (started, available now)
      const pastTime = new Date(Date.now() - 60000).toISOString();
      await upsertAssignment({
        id: 1,
        subject_id: 100,
        srs_stage: 5,
        available_at: pastTime,
        started_at: pastTime,
        unlocked_at: pastTime,
        data_updated_at: null,
      });

      const { getByText } = renderWithNavigation(<HomeScreen />);

      await waitFor(() => {
        expect(getByText(/1.*pending reviews/)).toBeTruthy();
      });
    });
  });

  describe('offline state with cached data', () => {
    beforeEach(async () => {
      // Add some cached data
      await upsertSubject({
        id: 1,
        object_type: 'radical',
        characters: '一',
        meanings: JSON.stringify([
          { meaning: 'one', primary: true, accepted_answer: true },
        ]),
        readings: null,
        meaning_mnemonic: 'Test mnemonic',
        reading_mnemonic: null,
        level: 1,
        component_subject_ids: null,
        character_images: null,
        auxiliary_meanings: null,
        data_updated_at: null,
      });

      // Go offline
      __setMockNetworkState({ isConnected: false });
      _resetNetworkStatus();
      initializeNetworkMonitoring();
    });

    it('shows offline indicator', async () => {
      const { getByTestId } = renderWithNavigation(<HomeScreen />);

      await waitFor(() => {
        expect(getByTestId('offline-indicator')).toBeTruthy();
      });
    });

    it('shows normal content (not error state)', async () => {
      const { getByTestId, queryByText } = renderWithNavigation(<HomeScreen />);

      await waitFor(() => {
        expect(getByTestId('home-logo')).toBeTruthy();
        expect(queryByText('No Connection')).toBeNull();
      });
    });

    it('shows last synced indicator', async () => {
      const { getByTestId } = renderWithNavigation(<HomeScreen />);

      await waitFor(() => {
        expect(getByTestId('last-synced-indicator')).toBeTruthy();
      });
    });
  });

  describe('offline state without cached data', () => {
    beforeEach(async () => {
      // Reset database to ensure no cached data
      __resetMockDatabase();
      _resetDatabaseInstance();
      await initializeDatabase();

      __setMockNetworkState({ isConnected: false });
      _resetNetworkStatus();
      initializeNetworkMonitoring();
    });

    it('shows error state', async () => {
      const { getByText } = renderWithNavigation(<HomeScreen />);

      await waitFor(() => {
        expect(getByText('No Connection')).toBeTruthy();
      });
    });

    it('shows helpful error message', async () => {
      const { getByText } = renderWithNavigation(<HomeScreen />);

      await waitFor(() => {
        expect(
          getByText(/Connect to the internet to download your WaniKani data/i),
        ).toBeTruthy();
      });
    });

    it('shows offline indicator', async () => {
      const { getByTestId } = renderWithNavigation(<HomeScreen />);

      await waitFor(() => {
        expect(getByTestId('offline-indicator')).toBeTruthy();
      });
    });

    it('does not show settings button', async () => {
      const { queryByTestId } = renderWithNavigation(<HomeScreen />);

      await waitFor(() => {
        expect(queryByTestId('settings-button')).toBeNull();
      });
    });

    it('does not show last synced indicator', async () => {
      const { queryByTestId } = renderWithNavigation(<HomeScreen />);

      await waitFor(() => {
        expect(queryByTestId('last-synced-indicator')).toBeNull();
      });
    });
  });

  describe('navigation', () => {
    beforeEach(async () => {
      __resetKeychainMock();
    });

    it('renders lessons and reviews buttons', async () => {
      const { getByTestId } = renderWithNavigation(<HomeScreen />);

      await waitFor(() => {
        expect(getByTestId('lessons-button')).toBeTruthy();
        expect(getByTestId('reviews-button')).toBeTruthy();
      });
    });

    it('navigates to Lessons screen when lessons button is pressed with lessons available', async () => {
      // Add a subject first
      await upsertSubject({
        id: 100,
        object_type: 'radical',
        characters: '一',
        meanings: JSON.stringify([
          { meaning: 'one', primary: true, accepted_answer: true },
        ]),
        readings: null,
        meaning_mnemonic: 'Test mnemonic',
        reading_mnemonic: null,
        level: 1,
        component_subject_ids: null,
        character_images: null,
        auxiliary_meanings: null,
        data_updated_at: null,
      });

      // Add an assignment that is a lesson
      await upsertAssignment({
        id: 1,
        subject_id: 100,
        srs_stage: 0,
        available_at: null,
        started_at: null,
        unlocked_at: new Date().toISOString(),
        data_updated_at: null,
      });

      const { getByText, getByTestId, findByTestId } = renderWithFullNavigator();

      await waitFor(() => {
        expect(getByText(/1.*available lessons/)).toBeTruthy();
      });

      await act(async () => {
        fireEvent.press(getByTestId('lessons-button'));
      });

      await findByTestId('lessons-screen');
    });

    it('navigates to Reviews screen when reviews button is pressed with reviews available', async () => {
      // Add a subject first
      await upsertSubject({
        id: 100,
        object_type: 'kanji',
        characters: '一',
        meanings: JSON.stringify([
          { meaning: 'one', primary: true, accepted_answer: true },
        ]),
        readings: JSON.stringify([
          { reading: 'いち', primary: true, accepted_answer: true },
        ]),
        meaning_mnemonic: 'Test mnemonic',
        reading_mnemonic: 'Reading mnemonic',
        level: 1,
        component_subject_ids: null,
        character_images: null,
        auxiliary_meanings: null,
        data_updated_at: null,
      });

      // Add an assignment that is a review
      const pastTime = new Date(Date.now() - 60000).toISOString();
      await upsertAssignment({
        id: 1,
        subject_id: 100,
        srs_stage: 5,
        available_at: pastTime,
        started_at: pastTime,
        unlocked_at: pastTime,
        data_updated_at: null,
      });

      const { getByText, getByTestId, findByTestId } = renderWithFullNavigator();

      await waitFor(() => {
        expect(getByText(/1.*pending reviews/)).toBeTruthy();
      });

      await act(async () => {
        fireEvent.press(getByTestId('reviews-button'));
      });

      await findByTestId('reviews-screen');
    });

    it('does not navigate when lessons count is 0', async () => {
      const { getByText, getByTestId, queryByTestId } = renderWithFullNavigator();

      await waitFor(() => {
        expect(getByText(/0.*available lessons/)).toBeTruthy();
      });

      await act(async () => {
        fireEvent.press(getByTestId('lessons-button'));
      });

      // Should still be on home screen
      expect(queryByTestId('lessons-screen')).toBeNull();
      expect(getByTestId('dashboard-stats')).toBeTruthy();
    });

    it('does not navigate when reviews count is 0', async () => {
      const { getByText, getByTestId, queryByTestId } = renderWithFullNavigator();

      await waitFor(() => {
        expect(getByText(/0.*pending reviews/)).toBeTruthy();
      });

      await act(async () => {
        fireEvent.press(getByTestId('reviews-button'));
      });

      // Should still be on home screen
      expect(queryByTestId('reviews-screen')).toBeNull();
      expect(getByTestId('dashboard-stats')).toBeTruthy();
    });
  });

  describe('animated crab', () => {
    it('wraps the logo in a pressable element', async () => {
      const { getByTestId } = renderWithNavigation(<HomeScreen />);

      await waitFor(() => {
        expect(getByTestId('home-logo-pressable')).toBeTruthy();
        expect(getByTestId('home-logo')).toBeTruthy();
      });
    });

    it('triggers animation when crab is tapped', async () => {
      const { withSequence } = jest.requireMock('react-native-reanimated');

      const { getByTestId } = renderWithNavigation(<HomeScreen />);

      await waitFor(() => {
        expect(getByTestId('home-logo-pressable')).toBeTruthy();
      });

      await act(async () => {
        fireEvent.press(getByTestId('home-logo-pressable'));
      });

      expect(withSequence).toHaveBeenCalled();
    });
  });

  describe('background sync integration', () => {
    it('shows sync progress bar when background sync starts', async () => {
      const { queryByTestId } = renderWithNavigation(<HomeScreen />);

      // Initially, progress bar should not be visible
      await waitFor(() => {
        expect(queryByTestId('sync-progress-bar')).toBeNull();
      });

      // Simulate sync starting
      await act(async () => {
        simulateSyncStatusChange(true);
      });

      // Progress bar should now be visible
      await waitFor(() => {
        expect(queryByTestId('sync-progress-bar')).toBeTruthy();
      });
    });

    it('hides sync progress bar when background sync completes', async () => {
      const { queryByTestId } = renderWithNavigation(<HomeScreen />);

      // Start sync
      await act(async () => {
        simulateSyncStatusChange(true);
      });

      await waitFor(() => {
        expect(queryByTestId('sync-progress-bar')).toBeTruthy();
      });

      // Complete sync
      await act(async () => {
        simulateSyncStatusChange(false);
      });

      // Progress bar should be hidden
      await waitFor(() => {
        expect(queryByTestId('sync-progress-bar')).toBeNull();
      });
    });

    it('shows sync error toast when sync fails', async () => {
      const { queryByTestId, getByText } = renderWithNavigation(<HomeScreen />);

      // Initially, error toast should not be visible
      await waitFor(() => {
        expect(queryByTestId('sync-error-toast')).toBeNull();
      });

      // Simulate sync error
      await act(async () => {
        simulateSyncError(new Error('Network error'));
      });

      // Error toast should now be visible
      await waitFor(() => {
        expect(queryByTestId('sync-error-toast')).toBeTruthy();
        expect(getByText('Sync failed')).toBeTruthy();
      });
    });
  });

  describe('pull-to-refresh', () => {
    beforeEach(async () => {
      __resetKeychainMock();
      jest.clearAllMocks();
      // Re-setup sync mock return values after clearAllMocks
      syncSubjects.mockResolvedValue({ success: true, syncedCount: 10 });
      syncAssignments.mockResolvedValue({ success: true, syncedCount: 5 });
      getUserLevel.mockResolvedValue(5);
    });

    it('renders scroll view with refresh control', async () => {
      const { getByTestId } = renderWithNavigation(<HomeScreen />);

      await waitFor(() => {
        expect(getByTestId('home-scroll-view')).toBeTruthy();
      });
    });

    it('calls sync functions when pulled to refresh while online with API key', async () => {
      __setStoredApiKey('test-api-key-123');

      const { getByTestId } = renderWithNavigation(<HomeScreen />);

      await waitFor(() => {
        expect(getByTestId('home-scroll-view')).toBeTruthy();
      });

      // Get the refresh control and trigger onRefresh
      const scrollView = getByTestId('home-scroll-view');
      const refreshControl = scrollView.props.refreshControl;

      await act(async () => {
        await refreshControl.props.onRefresh();
      });

      expect(syncSubjects).toHaveBeenCalled();
      expect(syncAssignments).toHaveBeenCalled();
    });

    it('does not call sync functions when pulled to refresh while offline', async () => {
      // Add cached data so we don't get the offline error state
      await upsertSubject({
        id: 1,
        object_type: 'radical',
        characters: '一',
        meanings: JSON.stringify([
          { meaning: 'one', primary: true, accepted_answer: true },
        ]),
        readings: null,
        meaning_mnemonic: 'Test mnemonic',
        reading_mnemonic: null,
        level: 1,
        component_subject_ids: null,
        character_images: null,
        auxiliary_meanings: null,
        data_updated_at: null,
      });

      // Go offline
      __setMockNetworkState({ isConnected: false });
      _resetNetworkStatus();
      initializeNetworkMonitoring();

      const { getByTestId } = renderWithNavigation(<HomeScreen />);

      await waitFor(() => {
        expect(getByTestId('home-scroll-view')).toBeTruthy();
      });

      // Get the refresh control and trigger onRefresh
      const scrollView = getByTestId('home-scroll-view');
      const refreshControl = scrollView.props.refreshControl;

      await act(async () => {
        await refreshControl.props.onRefresh();
      });

      expect(syncSubjects).not.toHaveBeenCalled();
      expect(syncAssignments).not.toHaveBeenCalled();
    });

    it('does not call sync functions when no API key is stored', async () => {
      // No API key set
      __resetKeychainMock();

      const { getByTestId } = renderWithNavigation(<HomeScreen />);

      await waitFor(() => {
        expect(getByTestId('home-scroll-view')).toBeTruthy();
      });

      // Get the refresh control and trigger onRefresh
      const scrollView = getByTestId('home-scroll-view');
      const refreshControl = scrollView.props.refreshControl;

      await act(async () => {
        await refreshControl.props.onRefresh();
      });

      expect(syncSubjects).not.toHaveBeenCalled();
      expect(syncAssignments).not.toHaveBeenCalled();
    });
  });

  describe('timer-based review refresh', () => {
    beforeEach(() => {
      jest.useFakeTimers();
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it('refreshes available reviews every minute while screen is focused', async () => {
      // Add a subject
      await upsertSubject({
        id: 100,
        object_type: 'kanji',
        characters: '一',
        meanings: JSON.stringify([
          { meaning: 'one', primary: true, accepted_answer: true },
        ]),
        readings: JSON.stringify([
          { reading: 'いち', primary: true, accepted_answer: true },
        ]),
        meaning_mnemonic: 'Test mnemonic',
        reading_mnemonic: 'Reading mnemonic',
        level: 1,
        component_subject_ids: null,
        character_images: null,
        auxiliary_meanings: null,
        data_updated_at: null,
      });

      // Add an assignment that will become available in 30 seconds
      const futureTime = new Date(Date.now() + 30 * 1000).toISOString();
      await upsertAssignment({
        id: 1,
        subject_id: 100,
        srs_stage: 5,
        available_at: futureTime,
        started_at: new Date().toISOString(),
        unlocked_at: new Date().toISOString(),
        data_updated_at: null,
      });

      const { getByText } = renderWithNavigation(<HomeScreen />);

      // Initially, the review is not available (available_at is in the future)
      await waitFor(() => {
        expect(getByText(/0.*pending reviews/)).toBeTruthy();
      });

      // Update the assignment to make it available now
      await upsertAssignment({
        id: 1,
        subject_id: 100,
        srs_stage: 5,
        available_at: new Date(Date.now() - 1000).toISOString(), // Now available
        started_at: new Date().toISOString(),
        unlocked_at: new Date().toISOString(),
        data_updated_at: null,
      });

      // Advance timer by 1 minute to trigger refresh
      await act(async () => {
        jest.advanceTimersByTime(60 * 1000);
      });

      // Now the review should be shown
      await waitFor(() => {
        expect(getByText(/1.*pending reviews/)).toBeTruthy();
      });
    });

    it('shows reviews that become available based on device time', async () => {
      // Add a subject
      await upsertSubject({
        id: 100,
        object_type: 'kanji',
        characters: '二',
        meanings: JSON.stringify([
          { meaning: 'two', primary: true, accepted_answer: true },
        ]),
        readings: JSON.stringify([
          { reading: 'に', primary: true, accepted_answer: true },
        ]),
        meaning_mnemonic: 'Test mnemonic',
        reading_mnemonic: 'Reading mnemonic',
        level: 1,
        component_subject_ids: null,
        character_images: null,
        auxiliary_meanings: null,
        data_updated_at: null,
      });

      // Add an assignment that is already available (past time)
      const pastTime = new Date(Date.now() - 60 * 1000).toISOString();
      await upsertAssignment({
        id: 1,
        subject_id: 100,
        srs_stage: 5,
        available_at: pastTime,
        started_at: pastTime,
        unlocked_at: pastTime,
        data_updated_at: null,
      });

      const { getByText } = renderWithNavigation(<HomeScreen />);

      // Review should be shown immediately based on device time
      await waitFor(() => {
        expect(getByText(/1.*pending reviews/)).toBeTruthy();
      });
    });

    it('cleans up interval when screen loses focus', async () => {
      const clearIntervalSpy = jest.spyOn(globalThis, 'clearInterval');

      const { unmount } = renderWithNavigation(<HomeScreen />);

      await waitFor(() => {
        // Wait for initial render
      });

      // Unmount triggers cleanup (simulates losing focus)
      unmount();

      // Verify clearInterval was called
      expect(clearIntervalSpy).toHaveBeenCalled();

      clearIntervalSpy.mockRestore();
    });

    it('refreshes upcoming reviews chart every minute while screen is focused', async () => {
      // Add a subject
      await upsertSubject({
        id: 100,
        object_type: 'kanji',
        characters: '三',
        meanings: JSON.stringify([
          { meaning: 'three', primary: true, accepted_answer: true },
        ]),
        readings: JSON.stringify([
          { reading: 'さん', primary: true, accepted_answer: true },
        ]),
        meaning_mnemonic: 'Test mnemonic',
        reading_mnemonic: 'Reading mnemonic',
        level: 1,
        component_subject_ids: null,
        character_images: null,
        auxiliary_meanings: null,
        data_updated_at: null,
      });

      // Add an assignment with available_at in the future (next hour)
      const now = new Date();
      const nextHour = new Date(now);
      nextHour.setHours(now.getHours() + 1);
      nextHour.setMinutes(0, 0, 0);
      const futureTime = nextHour.toISOString();

      await upsertAssignment({
        id: 1,
        subject_id: 100,
        srs_stage: 5,
        available_at: futureTime,
        started_at: new Date().toISOString(),
        unlocked_at: new Date().toISOString(),
        data_updated_at: null,
      });

      const { queryByTestId } = renderWithNavigation(<HomeScreen />);

      // Wait for initial render - chart should be present
      await waitFor(() => {
        expect(queryByTestId('upcoming-reviews-chart')).toBeTruthy();
      });

      // Advance timer by 1 minute to trigger refresh
      await act(async () => {
        jest.advanceTimersByTime(60 * 1000);
      });

      // Chart should still be rendered after timer refresh
      await waitFor(() => {
        expect(queryByTestId('upcoming-reviews-chart')).toBeTruthy();
      });
    });
  });

  describe('pending sync indicator', () => {
    it('shows pending reviews count when there are pending reviews', async () => {
      // Insert pending reviews
      await insertPendingReview({
        assignment_id: 1,
        subject_id: 100,
        incorrect_meaning_answers: 0,
        incorrect_reading_answers: 0,
      });
      await insertPendingReview({
        assignment_id: 2,
        subject_id: 101,
        incorrect_meaning_answers: 1,
        incorrect_reading_answers: 0,
      });
      await insertPendingReview({
        assignment_id: 3,
        subject_id: 102,
        incorrect_meaning_answers: 0,
        incorrect_reading_answers: 1,
      });

      const { getByTestId, getByText } = renderWithNavigation(<HomeScreen />);

      await waitFor(() => {
        expect(getByTestId('pending-sync-indicator')).toBeTruthy();
        expect(getByText('3 reviews pending sync')).toBeTruthy();
      });
    });

    it('shows pending lessons count when there are pending lessons', async () => {
      // Insert pending lessons
      await insertPendingLesson({
        assignment_id: 1,
        subject_id: 100,
        started_at: new Date().toISOString(),
      });
      await insertPendingLesson({
        assignment_id: 2,
        subject_id: 101,
        started_at: new Date().toISOString(),
      });

      const { getByTestId, getByText } = renderWithNavigation(<HomeScreen />);

      await waitFor(() => {
        expect(getByTestId('pending-sync-indicator')).toBeTruthy();
        expect(getByText('2 lessons pending sync')).toBeTruthy();
      });
    });

    it('shows both lessons and reviews when both are pending', async () => {
      // Insert pending reviews
      await insertPendingReview({
        assignment_id: 1,
        subject_id: 100,
        incorrect_meaning_answers: 0,
        incorrect_reading_answers: 0,
      });

      // Insert pending lessons
      await insertPendingLesson({
        assignment_id: 2,
        subject_id: 101,
        started_at: new Date().toISOString(),
      });

      const { getByTestId, getByText } = renderWithNavigation(<HomeScreen />);

      await waitFor(() => {
        expect(getByTestId('pending-sync-indicator')).toBeTruthy();
        expect(getByText('1 lesson and 1 review pending sync')).toBeTruthy();
      });
    });

    it('hides indicator when no pending items', async () => {
      // No pending items inserted - table is empty
      const { queryByTestId } = renderWithNavigation(<HomeScreen />);

      await waitFor(() => {
        expect(queryByTestId('pending-sync-indicator')).toBeNull();
      });
    });

    it('shows indicator with correct styling in sync status area', async () => {
      await insertPendingReview({
        assignment_id: 1,
        subject_id: 100,
        incorrect_meaning_answers: 0,
        incorrect_reading_answers: 0,
      });

      const { getByTestId, getByText } = renderWithNavigation(<HomeScreen />);

      await waitFor(() => {
        const indicator = getByTestId('pending-sync-indicator');
        expect(indicator).toBeTruthy();
        expect(getByText('Will sync automatically when online')).toBeTruthy();
      });
    });
  });

  describe('vacation mode', () => {
    it('shows VacationModeCallout when vacation status is set', async () => {
      await saveVacationStartedAt('2026-03-15T10:00:00.000Z');

      const { getByTestId, queryByTestId } = renderWithNavigation(
        <HomeScreen />,
      );

      await waitFor(() => {
        expect(getByTestId('vacation-mode-callout')).toBeTruthy();
      });

      // Stats should be hidden
      expect(queryByTestId('dashboard-stats')).toBeNull();
    });

    it('hides DashboardStats, LevelIndicator, LearnedCounts when on vacation', async () => {
      await saveVacationStartedAt('2026-03-15T10:00:00.000Z');
      await updateSyncStatus({ user_level: 5 });

      const { getByTestId, queryByTestId } = renderWithNavigation(
        <HomeScreen />,
      );

      await waitFor(() => {
        expect(getByTestId('vacation-mode-callout')).toBeTruthy();
      });

      expect(queryByTestId('dashboard-stats')).toBeNull();
      expect(queryByTestId('level-indicator')).toBeNull();
      expect(queryByTestId('learned-counts')).toBeNull();
    });

    it('keeps bottom navigation buttons visible during vacation mode', async () => {
      await saveVacationStartedAt('2026-03-15T10:00:00.000Z');

      const { getByTestId } = renderWithNavigation(<HomeScreen />);

      await waitFor(() => {
        expect(getByTestId('vacation-mode-callout')).toBeTruthy();
      });

      expect(getByTestId('search-button')).toBeTruthy();
      expect(getByTestId('practice-button')).toBeTruthy();
      expect(getByTestId('reverse-practice-button')).toBeTruthy();
      expect(getByTestId('settings-button')).toBeTruthy();
    });

    it('shows normal dashboard when vacation status is null', async () => {
      await saveVacationStartedAt(null);

      const { getByTestId, queryByTestId } = renderWithNavigation(
        <HomeScreen />,
      );

      await waitFor(() => {
        expect(getByTestId('dashboard-stats')).toBeTruthy();
      });

      expect(queryByTestId('vacation-mode-callout')).toBeNull();
    });

    it('updates vacation display on pull-to-refresh', async () => {
      // Start without vacation mode
      const { getByTestId, queryByTestId } = renderWithNavigation(
        <HomeScreen />,
      );

      await waitFor(() => {
        expect(getByTestId('dashboard-stats')).toBeTruthy();
      });

      // Simulate vacation mode being set during sync
      await saveVacationStartedAt('2026-03-20T08:00:00.000Z');

      // Trigger a data reload (simulating what happens after pull-to-refresh sync completes)
      const scrollView = getByTestId('home-scroll-view');
      const refreshControl = scrollView.props.refreshControl;

      await act(async () => {
        // refreshData calls loadDashboardData after sync, but since we're offline
        // by default in this test and the mock sync won't save vacation status,
        // we directly call loadDashboardData by triggering a background sync complete
        mockBackgroundSyncListeners.forEach(listener => listener());
      });

      await waitFor(() => {
        expect(getByTestId('vacation-mode-callout')).toBeTruthy();
        expect(queryByTestId('dashboard-stats')).toBeNull();
      });
    });
  });

  describe('wear data push', () => {
    it('calls sendReviewData after loadDashboardData with review count and next review time', async () => {
      // Add a review-ready assignment
      await upsertSubject({
        id: 100,
        object_type: 'kanji',
        characters: '一',
        meanings: JSON.stringify([
          { meaning: 'one', primary: true, accepted_answer: true },
        ]),
        readings: JSON.stringify([
          { reading: 'いち', primary: true, accepted_answer: true },
        ]),
        meaning_mnemonic: 'Test mnemonic',
        reading_mnemonic: 'Reading mnemonic',
        level: 1,
        component_subject_ids: null,
        character_images: null,
        auxiliary_meanings: null,
        data_updated_at: null,
      });

      const pastTime = new Date(Date.now() - 60000).toISOString();
      await upsertAssignment({
        id: 1,
        subject_id: 100,
        srs_stage: 5,
        available_at: pastTime,
        started_at: pastTime,
        unlocked_at: pastTime,
        data_updated_at: null,
      });

      renderWithNavigation(<HomeScreen />);

      await waitFor(() => {
        expect(mockSendReviewData).toHaveBeenCalledWith(
          1,
          expect.anything(),
          expect.any(Number),
        );
      });
    });

    it('calls sendReviewData with zero count when no reviews', async () => {
      renderWithNavigation(<HomeScreen />);

      await waitFor(() => {
        expect(mockSendReviewData).toHaveBeenCalledWith(0, null, 0);
      });
    });

    it('does not crash when sendReviewData fails', async () => {
      mockSendReviewData.mockRejectedValue(new Error('Wearable not connected'));

      const { getByTestId } = renderWithNavigation(<HomeScreen />);

      // Dashboard should still render normally
      await waitFor(() => {
        expect(getByTestId('dashboard-stats')).toBeTruthy();
      });
    });
  });
});
