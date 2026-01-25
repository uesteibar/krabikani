import {
  startSession,
  endSession,
  isSessionActive,
  getActiveSessionType,
  getSessionStartTime,
  addSessionStateListener,
  getSessionListenerCount,
  _resetSessionState,
} from '../../src/utils/sessionState';

describe('sessionState', () => {
  beforeEach(() => {
    _resetSessionState();
  });

  describe('startSession', () => {
    it('should start a lesson session', () => {
      startSession('lesson');

      expect(isSessionActive()).toBe(true);
      expect(getActiveSessionType()).toBe('lesson');
      expect(getSessionStartTime()).not.toBeNull();
    });

    it('should start a review session', () => {
      startSession('review');

      expect(isSessionActive()).toBe(true);
      expect(getActiveSessionType()).toBe('review');
      expect(getSessionStartTime()).not.toBeNull();
    });

    it('should overwrite previous session when starting a new one', () => {
      startSession('lesson');
      expect(getActiveSessionType()).toBe('lesson');

      startSession('review');

      // Session type should be updated to the new session
      expect(getActiveSessionType()).toBe('review');
      expect(getSessionStartTime()).not.toBeNull();
    });
  });

  describe('endSession', () => {
    it('should end an active session', () => {
      startSession('lesson');
      expect(isSessionActive()).toBe(true);

      endSession();

      expect(isSessionActive()).toBe(false);
      expect(getActiveSessionType()).toBeNull();
      expect(getSessionStartTime()).toBeNull();
    });

    it('should be safe to call when no session is active', () => {
      expect(isSessionActive()).toBe(false);

      endSession();

      expect(isSessionActive()).toBe(false);
    });
  });

  describe('isSessionActive', () => {
    it('should return false when no session is active', () => {
      expect(isSessionActive()).toBe(false);
    });

    it('should return true when a lesson session is active', () => {
      startSession('lesson');
      expect(isSessionActive()).toBe(true);
    });

    it('should return true when a review session is active', () => {
      startSession('review');
      expect(isSessionActive()).toBe(true);
    });
  });

  describe('getActiveSessionType', () => {
    it('should return null when no session is active', () => {
      expect(getActiveSessionType()).toBeNull();
    });

    it('should return "lesson" when a lesson session is active', () => {
      startSession('lesson');
      expect(getActiveSessionType()).toBe('lesson');
    });

    it('should return "review" when a review session is active', () => {
      startSession('review');
      expect(getActiveSessionType()).toBe('review');
    });
  });

  describe('getSessionStartTime', () => {
    it('should return null when no session is active', () => {
      expect(getSessionStartTime()).toBeNull();
    });

    it('should return a Date when a session is active', () => {
      const before = new Date();
      startSession('lesson');
      const after = new Date();

      const startTime = getSessionStartTime();
      expect(startTime).not.toBeNull();
      expect(startTime!.getTime()).toBeGreaterThanOrEqual(before.getTime());
      expect(startTime!.getTime()).toBeLessThanOrEqual(after.getTime());
    });
  });

  describe('addSessionStateListener', () => {
    it('should add a listener and return an unsubscribe function', () => {
      const listener = jest.fn();

      const unsubscribe = addSessionStateListener(listener);

      expect(getSessionListenerCount()).toBe(1);
      expect(typeof unsubscribe).toBe('function');
    });

    it('should notify listener when session starts', () => {
      const listener = jest.fn();
      addSessionStateListener(listener);

      startSession('lesson');

      expect(listener).toHaveBeenCalledWith('lesson');
    });

    it('should notify listener when session ends', () => {
      const listener = jest.fn();
      startSession('lesson');
      addSessionStateListener(listener);

      endSession();

      expect(listener).toHaveBeenCalledWith(null);
    });

    it('should allow multiple listeners', () => {
      const listener1 = jest.fn();
      const listener2 = jest.fn();
      addSessionStateListener(listener1);
      addSessionStateListener(listener2);

      startSession('review');

      expect(listener1).toHaveBeenCalledWith('review');
      expect(listener2).toHaveBeenCalledWith('review');
    });

    it('should remove listener when unsubscribe is called', () => {
      const listener = jest.fn();
      const unsubscribe = addSessionStateListener(listener);

      unsubscribe();
      startSession('lesson');

      expect(listener).not.toHaveBeenCalled();
      expect(getSessionListenerCount()).toBe(0);
    });

    it('should handle listener errors gracefully', () => {
      const errorListener = jest.fn(() => {
        throw new Error('Listener error');
      });
      const normalListener = jest.fn();
      addSessionStateListener(errorListener);
      addSessionStateListener(normalListener);

      // Should not throw and should still call the normal listener
      startSession('lesson');

      expect(normalListener).toHaveBeenCalledWith('lesson');
    });
  });

  describe('_resetSessionState', () => {
    it('should reset all state', () => {
      startSession('lesson');
      addSessionStateListener(() => {});
      expect(isSessionActive()).toBe(true);
      expect(getSessionListenerCount()).toBe(1);

      _resetSessionState();

      expect(isSessionActive()).toBe(false);
      expect(getActiveSessionType()).toBeNull();
      expect(getSessionStartTime()).toBeNull();
      expect(getSessionListenerCount()).toBe(0);
    });
  });
});
