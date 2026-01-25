// Mock the module
jest.mock('@react-native-community/netinfo');

import {
  initializeNetworkMonitoring,
  stopNetworkMonitoring,
  getNetworkStatus,
  isOnline,
  fetchNetworkState,
  addNetworkStatusListener,
  getListenerCount,
  _resetNetworkStatus,
} from '../../src/utils/networkStatus';

// Get mock helpers from the mocked module
const {
  __setMockNetworkState,
  __triggerNetworkChange,
  __resetMock,
} = jest.requireMock('@react-native-community/netinfo');

describe('networkStatus', () => {
  beforeEach(() => {
    __resetMock();
    _resetNetworkStatus();
  });

  afterEach(() => {
    stopNetworkMonitoring();
  });

  describe('getNetworkStatus', () => {
    it('returns default status before initialization', () => {
      const status = getNetworkStatus();
      expect(status.isConnected).toBe(true);
      expect(status.type).toBe('unknown');
    });

    it('returns current status after initialization', () => {
      __setMockNetworkState({
        type: 'wifi',
        isConnected: true,
        isInternetReachable: true,
      });

      initializeNetworkMonitoring();

      const status = getNetworkStatus();
      expect(status.isConnected).toBe(true);
      expect(status.type).toBe('wifi');
      expect(status.isInternetReachable).toBe(true);
    });
  });

  describe('isOnline', () => {
    it('returns true when connected', () => {
      __setMockNetworkState({ isConnected: true });
      initializeNetworkMonitoring();
      expect(isOnline()).toBe(true);
    });

    it('returns false when disconnected', () => {
      __setMockNetworkState({ isConnected: false });
      initializeNetworkMonitoring();
      expect(isOnline()).toBe(false);
    });
  });

  describe('initializeNetworkMonitoring', () => {
    it('subscribes to network changes', () => {
      initializeNetworkMonitoring();
      // The mock calls the handler immediately, so status should be updated
      const status = getNetworkStatus();
      expect(status.type).toBe('wifi');
    });

    it('does not create duplicate subscriptions', () => {
      const NetInfo = require('@react-native-community/netinfo').default;
      const callCountBefore = NetInfo.addEventListener.mock.calls.length;

      initializeNetworkMonitoring();
      initializeNetworkMonitoring();
      initializeNetworkMonitoring();

      // Should only have been called once more
      expect(NetInfo.addEventListener.mock.calls.length - callCountBefore).toBe(1);
    });
  });

  describe('stopNetworkMonitoring', () => {
    it('clears all listeners', () => {
      initializeNetworkMonitoring();

      const listener = jest.fn();
      addNetworkStatusListener(listener);
      expect(getListenerCount()).toBe(1);

      stopNetworkMonitoring();
      expect(getListenerCount()).toBe(0);
    });

    it('allows re-initialization after stopping', () => {
      const NetInfo = require('@react-native-community/netinfo').default;
      const callCountBefore = NetInfo.addEventListener.mock.calls.length;

      initializeNetworkMonitoring();
      stopNetworkMonitoring();
      initializeNetworkMonitoring();

      // Should have been called twice more
      expect(NetInfo.addEventListener.mock.calls.length - callCountBefore).toBe(2);
    });
  });

  describe('fetchNetworkState', () => {
    it('fetches current state from NetInfo', async () => {
      __setMockNetworkState({
        type: 'cellular',
        isConnected: true,
        isInternetReachable: true,
      });

      const status = await fetchNetworkState();
      expect(status.type).toBe('cellular');
      expect(status.isConnected).toBe(true);
    });

    it('updates internal state', async () => {
      __setMockNetworkState({
        type: 'cellular',
        isConnected: true,
      });

      await fetchNetworkState();
      expect(isOnline()).toBe(true);
      expect(getNetworkStatus().type).toBe('cellular');
    });

    it('handles offline state', async () => {
      __setMockNetworkState({
        type: 'none',
        isConnected: false,
        isInternetReachable: false,
      });

      const status = await fetchNetworkState();
      expect(status.isConnected).toBe(false);
      expect(isOnline()).toBe(false);
    });
  });

  describe('addNetworkStatusListener', () => {
    beforeEach(() => {
      initializeNetworkMonitoring();
    });

    it('adds a listener that is called on status change', () => {
      const listener = jest.fn();
      addNetworkStatusListener(listener);

      __triggerNetworkChange({ isConnected: false });
      expect(listener).toHaveBeenCalledWith(false);

      __triggerNetworkChange({ isConnected: true });
      expect(listener).toHaveBeenCalledWith(true);
    });

    it('returns an unsubscribe function', () => {
      const listener = jest.fn();
      const unsubscribe = addNetworkStatusListener(listener);

      expect(getListenerCount()).toBe(1);
      unsubscribe();
      expect(getListenerCount()).toBe(0);
    });

    it('does not call listener if connectivity does not change', () => {
      __setMockNetworkState({ isConnected: true });
      initializeNetworkMonitoring();

      const listener = jest.fn();
      addNetworkStatusListener(listener);

      // Trigger change with same connectivity status
      __triggerNetworkChange({ isConnected: true, type: 'cellular' });
      expect(listener).not.toHaveBeenCalled();
    });

    it('supports multiple listeners', () => {
      const listener1 = jest.fn();
      const listener2 = jest.fn();

      addNetworkStatusListener(listener1);
      addNetworkStatusListener(listener2);

      expect(getListenerCount()).toBe(2);

      __triggerNetworkChange({ isConnected: false });
      expect(listener1).toHaveBeenCalledWith(false);
      expect(listener2).toHaveBeenCalledWith(false);
    });

    it('handles listener errors gracefully', () => {
      const errorListener = jest.fn(() => {
        throw new Error('Listener error');
      });
      const goodListener = jest.fn();

      addNetworkStatusListener(errorListener);
      addNetworkStatusListener(goodListener);

      // Should not throw and should still call other listeners
      expect(() => {
        __triggerNetworkChange({ isConnected: false });
      }).not.toThrow();

      expect(goodListener).toHaveBeenCalledWith(false);
    });
  });

  describe('getListenerCount', () => {
    it('returns 0 when no listeners', () => {
      expect(getListenerCount()).toBe(0);
    });

    it('returns correct count after adding listeners', () => {
      addNetworkStatusListener(jest.fn());
      addNetworkStatusListener(jest.fn());
      expect(getListenerCount()).toBe(2);
    });

    it('returns correct count after removing listeners', () => {
      const unsub1 = addNetworkStatusListener(jest.fn());
      addNetworkStatusListener(jest.fn());

      unsub1();
      expect(getListenerCount()).toBe(1);
    });
  });

  describe('_resetNetworkStatus', () => {
    it('resets to default state', () => {
      __setMockNetworkState({ isConnected: false, type: 'cellular' });
      initializeNetworkMonitoring();
      addNetworkStatusListener(jest.fn());

      _resetNetworkStatus();

      expect(getListenerCount()).toBe(0);
      expect(isOnline()).toBe(true);
      expect(getNetworkStatus().type).toBe('unknown');
    });
  });
});
