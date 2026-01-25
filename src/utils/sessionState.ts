/**
 * Session state management for tracking active lesson/review sessions.
 * This module provides a simple way to track when the user is in an active
 * study session, so that background sync can be skipped during these times.
 */

export type SessionType = 'lesson' | 'review' | null;

interface SessionState {
  activeSession: SessionType;
  sessionStartedAt: Date | null;
}

let currentState: SessionState = {
  activeSession: null,
  sessionStartedAt: null,
};

const listeners: Set<(sessionType: SessionType) => void> = new Set();

/**
 * Starts a new session of the specified type.
 * This should be called when entering a lesson or review screen.
 */
export function startSession(type: 'lesson' | 'review'): void {
  currentState = {
    activeSession: type,
    sessionStartedAt: new Date(),
  };
  notifyListeners(type);
}

/**
 * Ends the current session.
 * This should be called when exiting a lesson or review screen.
 */
export function endSession(): void {
  currentState = {
    activeSession: null,
    sessionStartedAt: null,
  };
  notifyListeners(null);
}

/**
 * Returns true if there is an active session (lesson or review).
 */
export function isSessionActive(): boolean {
  return currentState.activeSession !== null;
}

/**
 * Returns the current session type, or null if no session is active.
 */
export function getActiveSessionType(): SessionType {
  return currentState.activeSession;
}

/**
 * Returns the time when the current session started, or null if no session is active.
 */
export function getSessionStartTime(): Date | null {
  return currentState.sessionStartedAt;
}

/**
 * Notifies all listeners about session state changes.
 */
function notifyListeners(sessionType: SessionType): void {
  listeners.forEach(listener => {
    try {
      listener(sessionType);
    } catch {
      // Ignore listener errors
    }
  });
}

/**
 * Adds a listener for session state changes.
 * @param listener Function to call when session state changes
 * @returns Function to remove the listener
 */
export function addSessionStateListener(
  listener: (sessionType: SessionType) => void,
): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/**
 * Gets the count of active listeners (for testing).
 */
export function getSessionListenerCount(): number {
  return listeners.size;
}

/**
 * Resets the session state (for testing).
 */
export function _resetSessionState(): void {
  currentState = {
    activeSession: null,
    sessionStartedAt: null,
  };
  listeners.clear();
}
