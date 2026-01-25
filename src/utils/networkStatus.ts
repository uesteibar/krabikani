import NetInfo, {
  NetInfoState,
  NetInfoSubscription,
} from '@react-native-community/netinfo';

export type NetworkStatusListener = (isConnected: boolean) => void;

export interface NetworkStatus {
  isConnected: boolean;
  isInternetReachable: boolean | null;
  type: string;
}

let currentStatus: NetworkStatus = {
  isConnected: true,
  isInternetReachable: null,
  type: 'unknown',
};

let subscription: NetInfoSubscription | null = null;
const listeners: Set<NetworkStatusListener> = new Set();

/**
 * Converts NetInfoState to our NetworkStatus type.
 */
function stateToNetworkStatus(state: NetInfoState): NetworkStatus {
  return {
    isConnected: state.isConnected ?? false,
    isInternetReachable: state.isInternetReachable,
    type: state.type,
  };
}

/**
 * Notifies all listeners about connectivity changes.
 */
function notifyListeners(isConnected: boolean): void {
  listeners.forEach(listener => {
    try {
      listener(isConnected);
    } catch {
      // Ignore listener errors
    }
  });
}

/**
 * Initializes network status monitoring.
 * Call this once when the app starts.
 */
export function initializeNetworkMonitoring(): void {
  if (subscription !== null) {
    return; // Already initialized
  }

  subscription = NetInfo.addEventListener(state => {
    const newStatus = stateToNetworkStatus(state);
    const wasConnected = currentStatus.isConnected;
    currentStatus = newStatus;

    if (wasConnected !== newStatus.isConnected) {
      notifyListeners(newStatus.isConnected);
    }
  });
}

/**
 * Stops network status monitoring.
 * Call this when the app is being terminated.
 */
export function stopNetworkMonitoring(): void {
  if (subscription !== null) {
    subscription();
    subscription = null;
  }
  listeners.clear();
}

/**
 * Returns the current network status.
 */
export function getNetworkStatus(): NetworkStatus {
  return { ...currentStatus };
}

/**
 * Returns true if the device is currently connected to the network.
 */
export function isOnline(): boolean {
  return currentStatus.isConnected;
}

/**
 * Fetches the current network state from the OS.
 * Useful for getting an accurate reading when needed.
 */
export async function fetchNetworkState(): Promise<NetworkStatus> {
  const state = await NetInfo.fetch();
  currentStatus = stateToNetworkStatus(state);
  return { ...currentStatus };
}

/**
 * Adds a listener for network connectivity changes.
 * @param listener Function to call when connectivity changes
 * @returns Function to remove the listener
 */
export function addNetworkStatusListener(
  listener: NetworkStatusListener,
): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/**
 * Gets the count of active listeners (for testing).
 */
export function getListenerCount(): number {
  return listeners.size;
}

/**
 * Resets the network status module (for testing).
 */
export function _resetNetworkStatus(): void {
  if (subscription !== null) {
    subscription();
    subscription = null;
  }
  listeners.clear();
  currentStatus = {
    isConnected: true,
    isInternetReachable: null,
    type: 'unknown',
  };
}
