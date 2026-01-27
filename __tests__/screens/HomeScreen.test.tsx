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
import {
  initializeDatabase,
  _resetDatabaseInstance,
  upsertSubject,
  upsertAssignment,
  updateSyncStatus,
} from '../../src/storage/database';
import type { RootStackParamList } from '../../src/navigation/types';

// Get mock helpers from the mocked modules
const { __setMockNetworkState, __resetMock } = jest.requireMock(
  '@react-native-community/netinfo',
);

const { __resetMockDatabase } = jest.requireMock('@op-engineering/op-sqlite');

const { __setStoredApiKey, __resetMock: __resetKeychainMock } =
  jest.requireMock('react-native-keychain');

const { syncSubjects, syncAssignments } = jest.requireMock(
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

describe('HomeScreen', () => {
  beforeEach(async () => {
    // Reset all state before each test
    __resetMock();
    __resetMockDatabase();
    _resetNetworkStatus();
    _resetDatabaseInstance();

    // Initialize fresh database
    await initializeDatabase();

    // Default to online state
    __setMockNetworkState({ isConnected: true });
    initializeNetworkMonitoring();
  });

  afterEach(() => {
    stopNetworkMonitoring();
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
        expect(getByText('Last synced: Never synced')).toBeTruthy();
      });
    });

    it('shows relative time when sync has occurred', async () => {
      const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();
      await updateSyncStatus({ last_subjects_sync: fiveMinutesAgo });

      const { getByText } = renderWithNavigation(<HomeScreen />);

      await waitFor(() => {
        expect(getByText('Last synced: 5 minutes ago')).toBeTruthy();
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
      const { getByTestId } = renderWithNavigation(<HomeScreen />);

      await waitFor(() => {
        expect(getByTestId('lessons-count').props.children).toBe(0);
        expect(getByTestId('reviews-count').props.children).toBe(0);
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

      const { getByTestId } = renderWithNavigation(<HomeScreen />);

      await waitFor(() => {
        expect(getByTestId('lessons-count').props.children).toBe(1);
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

      const { getByTestId } = renderWithNavigation(<HomeScreen />);

      await waitFor(() => {
        expect(getByTestId('reviews-count').props.children).toBe(1);
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
          getByText(/Please connect to the internet to download your data/i),
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

      const { getByTestId, findByTestId } = renderWithFullNavigator();

      await waitFor(() => {
        expect(getByTestId('lessons-count').props.children).toBe(1);
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

      const { getByTestId, findByTestId } = renderWithFullNavigator();

      await waitFor(() => {
        expect(getByTestId('reviews-count').props.children).toBe(1);
      });

      await act(async () => {
        fireEvent.press(getByTestId('reviews-button'));
      });

      await findByTestId('reviews-screen');
    });

    it('does not navigate when lessons count is 0', async () => {
      const { getByTestId, queryByTestId } = renderWithFullNavigator();

      await waitFor(() => {
        expect(getByTestId('lessons-count').props.children).toBe(0);
      });

      await act(async () => {
        fireEvent.press(getByTestId('lessons-button'));
      });

      // Should still be on home screen
      expect(queryByTestId('lessons-screen')).toBeNull();
      expect(getByTestId('dashboard-stats')).toBeTruthy();
    });

    it('does not navigate when reviews count is 0', async () => {
      const { getByTestId, queryByTestId } = renderWithFullNavigator();

      await waitFor(() => {
        expect(getByTestId('reviews-count').props.children).toBe(0);
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

  describe('pull-to-refresh', () => {
    beforeEach(async () => {
      __resetKeychainMock();
      jest.clearAllMocks();
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

    it('shows syncing indicator when pull-to-refresh is in progress', async () => {
      __setStoredApiKey('test-api-key-123');

      // Make sync take time so we can see the syncing state
      let resolveSyncSubjects: () => void;
      const syncSubjectsPromise = new Promise<{
        success: boolean;
        syncedCount: number;
      }>(resolve => {
        resolveSyncSubjects = () => resolve({ success: true, syncedCount: 10 });
      });
      syncSubjects.mockReturnValueOnce(syncSubjectsPromise);

      const { getByTestId, queryByTestId } = renderWithNavigation(
        <HomeScreen />,
      );

      await waitFor(() => {
        expect(getByTestId('home-scroll-view')).toBeTruthy();
      });

      // Syncing indicator should not be visible initially
      expect(queryByTestId('syncing-indicator')).toBeNull();

      // Get the refresh control and trigger onRefresh (don't await)
      const scrollView = getByTestId('home-scroll-view');
      const refreshControl = scrollView.props.refreshControl;

      // Start the refresh without awaiting
      act(() => {
        refreshControl.props.onRefresh();
      });

      // Syncing indicator should be visible during refresh
      await waitFor(() => {
        expect(getByTestId('syncing-indicator')).toBeTruthy();
      });

      // Complete the sync
      await act(async () => {
        resolveSyncSubjects!();
      });

      // Syncing indicator should disappear after refresh
      await waitFor(() => {
        expect(queryByTestId('syncing-indicator')).toBeNull();
      });
    });

    it('hides syncing indicator when sync fails', async () => {
      __setStoredApiKey('test-api-key-123');

      // Make sync fail
      let rejectSync: (err: Error) => void;
      const syncSubjectsPromise = new Promise<{
        success: boolean;
        syncedCount: number;
      }>((_, reject) => {
        rejectSync = reject;
      });
      syncSubjects.mockReturnValueOnce(syncSubjectsPromise);

      const { getByTestId, queryByTestId } = renderWithNavigation(
        <HomeScreen />,
      );

      await waitFor(() => {
        expect(getByTestId('home-scroll-view')).toBeTruthy();
      });

      // Get the refresh control and trigger onRefresh (don't await)
      const scrollView = getByTestId('home-scroll-view');
      const refreshControl = scrollView.props.refreshControl;

      // Start the refresh without awaiting
      act(() => {
        refreshControl.props.onRefresh();
      });

      // Syncing indicator should be visible during refresh
      await waitFor(() => {
        expect(getByTestId('syncing-indicator')).toBeTruthy();
      });

      // Fail the sync
      await act(async () => {
        rejectSync!(new Error('Sync failed'));
      });

      // Syncing indicator should disappear after failure
      await waitFor(() => {
        expect(queryByTestId('syncing-indicator')).toBeNull();
      });
    });

    it('shows "Syncing..." text during pull-to-refresh', async () => {
      __setStoredApiKey('test-api-key-123');

      // Make sync never complete for this test
      syncSubjects.mockReturnValueOnce(new Promise(() => {}));

      const { getByTestId, getByText } = renderWithNavigation(<HomeScreen />);

      await waitFor(() => {
        expect(getByTestId('home-scroll-view')).toBeTruthy();
      });

      // Get the refresh control and trigger onRefresh
      const scrollView = getByTestId('home-scroll-view');
      const refreshControl = scrollView.props.refreshControl;

      act(() => {
        refreshControl.props.onRefresh();
      });

      // Should show syncing text
      await waitFor(() => {
        expect(getByText('Syncing...')).toBeTruthy();
      });
    });
  });
});
