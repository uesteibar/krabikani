/**
 * App state management for background sync.
 * This module handles detecting when the app comes to the foreground
 * and triggers background sync operations.
 */
import { AppState, AppStateStatus } from 'react-native';

import { WaniKaniClient } from '../api/wanikaniApi';
import { getApiKey } from '../storage/secureStorage';
import { backgroundSync, type BackgroundSyncResult } from '../sync';
import { isOnline } from './networkStatus';
import { isSessionActive } from './sessionState';

export type AppStateChangeListener = (
  nextState: AppStateStatus,
  previousState: AppStateStatus,
) => void;

export type BackgroundSyncListener = (result: BackgroundSyncResult) => void;

let currentAppState: AppStateStatus = AppState.currentState;
let subscription: ReturnType<typeof AppState.addEventListener> | null = null;
let isSyncing = false;

const appStateListeners: Set<AppStateChangeListener> = new Set();
const backgroundSyncListeners: Set<BackgroundSyncListener> = new Set();

/**
 * Handles app state changes and triggers background sync when appropriate.
 */
async function handleAppStateChange(nextAppState: AppStateStatus): Promise<void> {
  const previousState = currentAppState;
  currentAppState = nextAppState;

  // Notify app state listeners
  appStateListeners.forEach(listener => {
    try {
      listener(nextAppState, previousState);
    } catch {
      // Ignore listener errors
    }
  });

  // Check if we're coming to foreground from background/inactive
  const isComingToForeground =
    (previousState === 'background' || previousState === 'inactive') &&
    nextAppState === 'active';

  if (isComingToForeground) {
    await triggerBackgroundSync();
  }
}

/**
 * Triggers a background sync if conditions are met.
 */
async function triggerBackgroundSync(): Promise<void> {
  // Prevent concurrent syncs
  if (isSyncing) {
    return;
  }

  // Check if we're online
  if (!isOnline()) {
    return;
  }

  // Get API key
  const apiKey = await getApiKey();
  if (!apiKey) {
    return;
  }

  try {
    isSyncing = true;

    const client = new WaniKaniClient(apiKey);
    const result = await backgroundSync(client, {
      shouldSkip: isSessionActive,
      skipReason: 'Active lesson or review session',
    });

    // Notify background sync listeners
    backgroundSyncListeners.forEach(listener => {
      try {
        listener(result);
      } catch {
        // Ignore listener errors
      }
    });
  } catch {
    // Background sync failed silently
  } finally {
    isSyncing = false;
  }
}

/**
 * Initializes app state monitoring for background sync.
 * Call this once when the app starts.
 */
export function initializeAppStateSync(): void {
  if (subscription !== null) {
    return; // Already initialized
  }

  currentAppState = AppState.currentState;
  subscription = AppState.addEventListener('change', handleAppStateChange);
}

/**
 * Stops app state monitoring.
 * Call this when the app is being terminated.
 */
export function stopAppStateSync(): void {
  if (subscription !== null) {
    subscription.remove();
    subscription = null;
  }
  appStateListeners.clear();
  backgroundSyncListeners.clear();
}

/**
 * Returns the current app state.
 */
export function getCurrentAppState(): AppStateStatus {
  return currentAppState;
}

/**
 * Returns whether a background sync is currently in progress.
 */
export function isBackgroundSyncInProgress(): boolean {
  return isSyncing;
}

/**
 * Adds a listener for app state changes.
 * @param listener Function to call when app state changes
 * @returns Function to remove the listener
 */
export function addAppStateChangeListener(
  listener: AppStateChangeListener,
): () => void {
  appStateListeners.add(listener);
  return () => {
    appStateListeners.delete(listener);
  };
}

/**
 * Adds a listener for background sync completion.
 * @param listener Function to call when background sync completes
 * @returns Function to remove the listener
 */
export function addBackgroundSyncListener(
  listener: BackgroundSyncListener,
): () => void {
  backgroundSyncListeners.add(listener);
  return () => {
    backgroundSyncListeners.delete(listener);
  };
}

/**
 * Manually triggers a background sync.
 * Useful for testing or forcing a sync from UI.
 */
export async function manualBackgroundSync(): Promise<void> {
  await triggerBackgroundSync();
}

/**
 * Gets the count of active listeners (for testing).
 */
export function getAppStateListenerCount(): number {
  return appStateListeners.size;
}

/**
 * Gets the count of background sync listeners (for testing).
 */
export function getBackgroundSyncListenerCount(): number {
  return backgroundSyncListeners.size;
}

/**
 * Resets the app state sync module (for testing).
 */
export function _resetAppStateSync(): void {
  if (subscription !== null) {
    subscription.remove();
    subscription = null;
  }
  appStateListeners.clear();
  backgroundSyncListeners.clear();
  currentAppState = 'active';
  isSyncing = false;
}

/**
 * Sets the current app state (for testing).
 */
export function _setCurrentAppState(state: AppStateStatus): void {
  currentAppState = state;
}

/**
 * Sets the syncing state (for testing).
 */
export function _setSyncingState(syncing: boolean): void {
  isSyncing = syncing;
}
