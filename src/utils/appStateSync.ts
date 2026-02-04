/**
 * App state management for background sync.
 * This module handles detecting when the app comes to the foreground
 * and triggers background sync operations.
 */
import { AppState, AppStateStatus } from 'react-native';

import { WaniKaniClient } from '../api/wanikaniApi';
import { getSyncStatus } from '../storage/database';
import { getApiKey } from '../storage/secureStorage';
import { backgroundSync, type BackgroundSyncResult } from '../sync';
import { isOnline } from './networkStatus';
import { isSessionActive } from './sessionState';

export type AppStateChangeListener = (
  nextState: AppStateStatus,
  previousState: AppStateStatus,
) => void;

export type BackgroundSyncListener = (result: BackgroundSyncResult) => void;

export type SyncStatusListener = (syncing: boolean) => void;

export type SyncErrorListener = (error: Error) => void;

/** Minimum time between foreground syncs in milliseconds (5 minutes) */
const SYNC_THROTTLE_MS = 5 * 60 * 1000;

let currentAppState: AppStateStatus = AppState.currentState;
let subscription: ReturnType<typeof AppState.addEventListener> | null = null;
let isSyncing = false;
let hasColdStartSynced = false;

const appStateListeners: Set<AppStateChangeListener> = new Set();
const backgroundSyncListeners: Set<BackgroundSyncListener> = new Set();
const syncStatusListeners: Set<SyncStatusListener> = new Set();
const syncErrorListeners: Set<SyncErrorListener> = new Set();

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
 * Gets the timestamp of the most recent sync from the database.
 */
async function getLastSyncTime(): Promise<Date | null> {
  try {
    const status = await getSyncStatus();
    if (!status) return null;

    // Use the most recent sync time across all sync types
    const times = [
      status.last_subjects_sync,
      status.last_assignments_sync,
      status.last_study_materials_sync,
    ]
      .filter((t): t is string => t !== null)
      .map(t => new Date(t).getTime());

    if (times.length === 0) return null;

    return new Date(Math.max(...times));
  } catch {
    return null;
  }
}

/**
 * Checks if enough time has passed since the last sync to allow a new sync.
 * Cold start syncs are always allowed.
 */
async function shouldThrottleSync(isColdStart: boolean): Promise<boolean> {
  // Cold start syncs are never throttled
  if (isColdStart) {
    return false;
  }

  const lastSync = await getLastSyncTime();
  if (!lastSync) {
    // No previous sync, don't throttle
    return false;
  }

  const timeSinceLastSync = Date.now() - lastSync.getTime();
  return timeSinceLastSync < SYNC_THROTTLE_MS;
}

/**
 * Notifies sync status listeners of sync state changes.
 */
function notifySyncStatusListeners(syncing: boolean): void {
  syncStatusListeners.forEach(listener => {
    try {
      listener(syncing);
    } catch {
      // Ignore listener errors
    }
  });
}

/**
 * Notifies sync error listeners of sync failures.
 */
function notifySyncErrorListeners(error: Error): void {
  syncErrorListeners.forEach(listener => {
    try {
      listener(error);
    } catch {
      // Ignore listener errors
    }
  });
}

/**
 * Triggers a background sync if conditions are met.
 * @param isColdStart Whether this is a cold start sync (bypasses throttle)
 */
async function triggerBackgroundSync(isColdStart = false): Promise<void> {
  // Prevent concurrent syncs
  if (isSyncing) {
    return;
  }

  // Check if we're online
  if (!isOnline()) {
    return;
  }

  // Check throttle for foreground syncs
  if (await shouldThrottleSync(isColdStart)) {
    return;
  }

  // Get API key
  const apiKey = await getApiKey();
  if (!apiKey) {
    return;
  }

  try {
    isSyncing = true;
    notifySyncStatusListeners(true);

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
  } catch (error) {
    // Notify error listeners
    notifySyncErrorListeners(
      error instanceof Error ? error : new Error('Sync failed'),
    );
  } finally {
    isSyncing = false;
    notifySyncStatusListeners(false);
  }
}

/**
 * Initializes app state monitoring for background sync.
 * Call this once when the app starts.
 * Triggers a cold start sync immediately.
 */
export function initializeAppStateSync(): void {
  if (subscription !== null) {
    return; // Already initialized
  }

  currentAppState = AppState.currentState;
  subscription = AppState.addEventListener('change', handleAppStateChange);

  // Trigger cold start sync (bypasses throttle)
  if (!hasColdStartSynced) {
    hasColdStartSynced = true;
    // Use setImmediate to allow initialization to complete first
    setImmediate(() => {
      triggerBackgroundSync(true);
    });
  }
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
  syncStatusListeners.clear();
  syncErrorListeners.clear();
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
 * Adds a listener for sync status changes (started/stopped).
 * @param listener Function to call when sync status changes
 * @returns Function to remove the listener
 */
export function addSyncStatusListener(listener: SyncStatusListener): () => void {
  syncStatusListeners.add(listener);
  return () => {
    syncStatusListeners.delete(listener);
  };
}

/**
 * Adds a listener for sync errors.
 * @param listener Function to call when sync fails
 * @returns Function to remove the listener
 */
export function addSyncErrorListener(listener: SyncErrorListener): () => void {
  syncErrorListeners.add(listener);
  return () => {
    syncErrorListeners.delete(listener);
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
 * Gets the count of sync status listeners (for testing).
 */
export function getSyncStatusListenerCount(): number {
  return syncStatusListeners.size;
}

/**
 * Gets the count of sync error listeners (for testing).
 */
export function getSyncErrorListenerCount(): number {
  return syncErrorListeners.size;
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
  syncStatusListeners.clear();
  syncErrorListeners.clear();
  currentAppState = 'active';
  isSyncing = false;
  hasColdStartSynced = false;
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

/**
 * Sets the cold start synced flag (for testing).
 */
export function _setHasColdStartSynced(value: boolean): void {
  hasColdStartSynced = value;
}

/**
 * Gets the throttle duration in milliseconds (for testing).
 */
export function _getSyncThrottleMs(): number {
  return SYNC_THROTTLE_MS;
}
