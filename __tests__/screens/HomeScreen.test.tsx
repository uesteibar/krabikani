// Mock the modules
jest.mock('@react-native-community/netinfo');
jest.mock('react-native-sqlite-storage');

import React from 'react';
import { render, waitFor } from '@testing-library/react-native';
import { NavigationContainer } from '@react-navigation/native';

import { HomeScreen } from '../../src/screens/HomeScreen';
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

// Get mock helpers from the mocked modules
const {
  __setMockNetworkState,
  __resetMock,
} = jest.requireMock('@react-native-community/netinfo');

const {
  __resetMockDatabase,
} = jest.requireMock('react-native-sqlite-storage');

// Wrapper component for navigation context
function renderWithNavigation(component: React.ReactElement) {
  return render(
    <NavigationContainer>
      {component}
    </NavigationContainer>,
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
    it('renders the title and subtitle', async () => {
      const { getByText } = renderWithNavigation(<HomeScreen />);

      await waitFor(() => {
        expect(getByText('UnaiNikani')).toBeTruthy();
        expect(getByText('WaniKani Android Client')).toBeTruthy();
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

    it('renders the next review indicator component', async () => {
      const { getByTestId } = renderWithNavigation(<HomeScreen />);

      await waitFor(() => {
        expect(getByTestId('next-review-indicator')).toBeTruthy();
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
        meanings: JSON.stringify([{ meaning: 'one', primary: true, accepted_answer: true }]),
        readings: null,
        meaning_mnemonic: 'Test mnemonic',
        reading_mnemonic: null,
        level: 1,
        component_subject_ids: null,
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
        meanings: JSON.stringify([{ meaning: 'one', primary: true, accepted_answer: true }]),
        readings: JSON.stringify([{ reading: 'いち', primary: true, accepted_answer: true }]),
        meaning_mnemonic: 'Test mnemonic',
        reading_mnemonic: 'Reading mnemonic',
        level: 1,
        component_subject_ids: null,
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

    it('shows "No upcoming reviews" when no future reviews', async () => {
      const { getByText } = renderWithNavigation(<HomeScreen />);

      await waitFor(() => {
        expect(getByText('No upcoming reviews')).toBeTruthy();
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
        meanings: JSON.stringify([{ meaning: 'one', primary: true, accepted_answer: true }]),
        readings: null,
        meaning_mnemonic: 'Test mnemonic',
        reading_mnemonic: null,
        level: 1,
        component_subject_ids: null,
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
      const { getByText, queryByText } = renderWithNavigation(<HomeScreen />);

      await waitFor(() => {
        expect(getByText('UnaiNikani')).toBeTruthy();
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
});
