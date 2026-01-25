/**
 * Mock for @react-native-community/netinfo
 */

type NetInfoStateType =
  | 'unknown'
  | 'none'
  | 'wifi'
  | 'cellular'
  | 'bluetooth'
  | 'ethernet'
  | 'wimax'
  | 'vpn'
  | 'other';

interface NetInfoState {
  type: NetInfoStateType;
  isConnected: boolean | null;
  isInternetReachable: boolean | null;
  details: unknown;
}

type NetInfoChangeHandler = (state: NetInfoState) => void;
type NetInfoSubscription = () => void;

let mockState: NetInfoState = {
  type: 'wifi',
  isConnected: true,
  isInternetReachable: true,
  details: null,
};

const listeners: Set<NetInfoChangeHandler> = new Set();

/**
 * Sets the mock network state for testing.
 */
export function __setMockNetworkState(state: Partial<NetInfoState>): void {
  mockState = { ...mockState, ...state };
}

/**
 * Simulates a network state change.
 */
export function __triggerNetworkChange(state: Partial<NetInfoState>): void {
  mockState = { ...mockState, ...state };
  listeners.forEach(listener => listener(mockState));
}

/**
 * Resets the mock to default state.
 */
export function __resetMock(): void {
  mockState = {
    type: 'wifi',
    isConnected: true,
    isInternetReachable: true,
    details: null,
  };
  listeners.clear();
  // Reset mock function call counts and restore implementations
  NetInfo.fetch.mockClear().mockImplementation(fetchImpl);
  NetInfo.addEventListener.mockClear().mockImplementation(addEventListenerImpl);
  NetInfo.useNetInfo.mockClear().mockImplementation(useNetInfoImpl);
  NetInfo.configure.mockClear();
  NetInfo.refresh.mockClear().mockImplementation(refreshImpl);
}

/**
 * Gets the number of active listeners (for testing).
 */
export function __getListenerCount(): number {
  return listeners.size;
}

function fetchImpl(): Promise<NetInfoState> {
  return Promise.resolve({ ...mockState });
}

function addEventListenerImpl(handler: NetInfoChangeHandler): NetInfoSubscription {
  listeners.add(handler);
  // Immediately call the handler with current state (like real NetInfo)
  handler({ ...mockState });
  return () => {
    listeners.delete(handler);
  };
}

function useNetInfoImpl() {
  return { ...mockState };
}

function refreshImpl(): Promise<NetInfoState> {
  return Promise.resolve({ ...mockState });
}

const NetInfo = {
  fetch: jest.fn(fetchImpl),
  addEventListener: jest.fn(addEventListenerImpl),
  useNetInfo: jest.fn(useNetInfoImpl),
  configure: jest.fn(),
  refresh: jest.fn(refreshImpl),
};

export default NetInfo;
export type { NetInfoState, NetInfoStateType, NetInfoSubscription };
