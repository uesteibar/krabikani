export {
  initializeNetworkMonitoring,
  stopNetworkMonitoring,
  getNetworkStatus,
  isOnline,
  fetchNetworkState,
  addNetworkStatusListener,
  getListenerCount,
  _resetNetworkStatus,
  type NetworkStatus,
  type NetworkStatusListener,
} from './networkStatus';

export {
  romajiToHiragana,
  processRomajiInput,
  type RomajiInputState,
} from './romajiToHiragana';

export {
  validateMeaningAnswer,
  validateReadingAnswer,
  type MeaningValidationResult,
  type ReadingValidationResult,
} from './answerValidation';

export {
  startSession,
  endSession,
  isSessionActive,
  getActiveSessionType,
  getSessionStartTime,
  addSessionStateListener,
  getSessionListenerCount,
  _resetSessionState,
  type SessionType,
} from './sessionState';

export {
  initializeAppStateSync,
  stopAppStateSync,
  getCurrentAppState,
  isBackgroundSyncInProgress,
  addAppStateChangeListener,
  addBackgroundSyncListener,
  manualBackgroundSync,
  getAppStateListenerCount,
  getBackgroundSyncListenerCount,
  _resetAppStateSync,
  _setCurrentAppState,
  _setSyncingState,
  type AppStateChangeListener,
  type BackgroundSyncListener,
} from './appStateSync';

export {
  getPreferredImageUrl,
  prefetchImage,
  prefetchImages,
  parseCharacterImages,
  type CharacterImage,
} from './imageCache';
