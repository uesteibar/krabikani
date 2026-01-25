// Mock the module
jest.mock('@react-native-community/netinfo');

import React from 'react';
import { render, act } from '@testing-library/react-native';

import { OfflineIndicator } from '../../src/components/OfflineIndicator';
import {
  initializeNetworkMonitoring,
  stopNetworkMonitoring,
  _resetNetworkStatus,
} from '../../src/utils/networkStatus';

// Get mock helpers from the mocked module
const {
  __setMockNetworkState,
  __triggerNetworkChange,
  __resetMock,
} = jest.requireMock('@react-native-community/netinfo');

describe('OfflineIndicator', () => {
  beforeEach(() => {
    __resetMock();
    _resetNetworkStatus();
  });

  afterEach(() => {
    stopNetworkMonitoring();
  });

  it('does not render when online', () => {
    __setMockNetworkState({ isConnected: true });
    initializeNetworkMonitoring();

    const { queryByTestId } = render(<OfflineIndicator />);
    expect(queryByTestId('offline-indicator')).toBeNull();
  });

  it('renders when offline', () => {
    __setMockNetworkState({ isConnected: false });
    initializeNetworkMonitoring();

    const { getByTestId, getByText } = render(<OfflineIndicator />);
    expect(getByTestId('offline-indicator')).toBeTruthy();
    expect(getByText('No Internet Connection')).toBeTruthy();
  });

  it('shows indicator when going offline', async () => {
    __setMockNetworkState({ isConnected: true });
    initializeNetworkMonitoring();

    const { queryByTestId, getByTestId, rerender } = render(<OfflineIndicator />);
    expect(queryByTestId('offline-indicator')).toBeNull();

    // Go offline
    await act(async () => {
      __triggerNetworkChange({ isConnected: false });
    });
    rerender(<OfflineIndicator />);

    expect(getByTestId('offline-indicator')).toBeTruthy();
  });

  it('hides indicator when coming back online', async () => {
    __setMockNetworkState({ isConnected: false });
    initializeNetworkMonitoring();

    const { queryByTestId, getByTestId, rerender } = render(<OfflineIndicator />);
    expect(getByTestId('offline-indicator')).toBeTruthy();

    // Come back online
    await act(async () => {
      __triggerNetworkChange({ isConnected: true });
    });
    rerender(<OfflineIndicator />);

    expect(queryByTestId('offline-indicator')).toBeNull();
  });

  it('accepts custom testID', () => {
    __setMockNetworkState({ isConnected: false });
    initializeNetworkMonitoring();

    const { getByTestId } = render(
      <OfflineIndicator testID="custom-offline" />,
    );
    expect(getByTestId('custom-offline')).toBeTruthy();
  });

  it('cleans up listener on unmount', () => {
    __setMockNetworkState({ isConnected: false });
    initializeNetworkMonitoring();

    const { unmount } = render(<OfflineIndicator />);

    // Should not throw when unmounting
    expect(() => unmount()).not.toThrow();
  });
});
