import notifee, {
  AndroidImportance,
  AuthorizationStatus,
  TriggerType,
  EventType,
} from '@notifee/react-native';
import { AppState } from 'react-native';
import {
  getReviewCountAtHour,
  getNextHourTimestamp,
  isAppInForeground,
  performHourlyReviewCheck,
  scheduleNextHourlyCheck,
  handleNotificationEvent,
  initializeReviewNotificationScheduler,
  stopReviewNotificationScheduler,
  getMinReviewsForNotification,
} from '../../src/services/reviewNotificationScheduler';
import {
  getAvailableReviews,
  getNewReviewCountThisHour,
  getUpcomingReviewsByHour,
} from '../../src/storage';
import {
  checkPermissions,
  getNotificationsEnabled,
  setBadgeCount,
} from '../../src/services/notificationService';

jest.mock('react-native', () => ({
  Platform: { OS: 'ios' },
  AppState: {
    currentState: 'active',
  },
}));

jest.mock('@notifee/react-native');
jest.mock('../../src/storage', () => ({
  getAvailableReviews: jest.fn(),
  getNewReviewCountThisHour: jest.fn(),
  getUpcomingReviewsByHour: jest.fn(),
}));
jest.mock('../../src/services/notificationService', () => ({
  checkPermissions: jest.fn(),
  getNotificationsEnabled: jest.fn(),
  setBadgeCount: jest.fn(),
}));
jest.mock('../../src/services/notificationConfig', () => ({
  NOTIFICATION_CHANNEL_ID: 'review-reminders',
  setupNotificationChannel: jest.fn(),
}));

describe('reviewNotificationScheduler', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Default mocks
    (checkPermissions as jest.Mock).mockResolvedValue('granted');
    (getNotificationsEnabled as jest.Mock).mockResolvedValue(true);
    (getAvailableReviews as jest.Mock).mockResolvedValue([]);
    (getNewReviewCountThisHour as jest.Mock).mockResolvedValue(1);
    (getUpcomingReviewsByHour as jest.Mock).mockResolvedValue([]);
    (notifee.getNotificationSettings as jest.Mock).mockResolvedValue({
      authorizationStatus: AuthorizationStatus.AUTHORIZED,
    });
  });

  describe('getNextHourTimestamp', () => {
    it('returns a timestamp for the next top of the hour', () => {
      const now = new Date();
      const timestamp = getNextHourTimestamp();
      const nextHour = new Date(timestamp);

      // Should be in the future
      expect(timestamp).toBeGreaterThan(now.getTime());

      // Should be at the top of the hour (minutes, seconds, ms = 0)
      expect(nextHour.getMinutes()).toBe(0);
      expect(nextHour.getSeconds()).toBe(0);
      expect(nextHour.getMilliseconds()).toBe(0);
    });

    it('returns timestamp at most 1 hour in the future', () => {
      const now = new Date();
      const timestamp = getNextHourTimestamp();
      const oneHourFromNow = now.getTime() + 60 * 60 * 1000;

      expect(timestamp).toBeLessThanOrEqual(oneHourFromNow);
    });
  });

  describe('isAppInForeground', () => {
    it('returns true when app state is active', () => {
      (AppState as any).currentState = 'active';
      expect(isAppInForeground()).toBe(true);
    });

    it('returns false when app state is background', () => {
      (AppState as any).currentState = 'background';
      expect(isAppInForeground()).toBe(false);
    });

    it('returns false when app state is inactive', () => {
      (AppState as any).currentState = 'inactive';
      expect(isAppInForeground()).toBe(false);
    });
  });

  describe('getReviewCountAtHour', () => {
    it('returns count of current reviews when no upcoming reviews', async () => {
      (getAvailableReviews as jest.Mock).mockResolvedValue([
        { id: 1 },
        { id: 2 },
        { id: 3 },
      ]);
      (getUpcomingReviewsByHour as jest.Mock).mockResolvedValue([]);

      const count = await getReviewCountAtHour(new Date());

      expect(count).toBe(3);
    });

    it('adds upcoming reviews at target hour to count', async () => {
      const now = new Date();
      const targetHour = new Date(now);
      targetHour.setHours(now.getHours() + 2);

      (getAvailableReviews as jest.Mock).mockResolvedValue([
        { id: 1 },
        { id: 2 },
      ]);
      (getUpcomingReviewsByHour as jest.Mock).mockResolvedValue([
        { hour: new Date(now.getTime() + 3600000), count: 5 }, // 1 hour from now
        { hour: new Date(now.getTime() + 7200000), count: 10 }, // 2 hours from now
      ]);

      const count = await getReviewCountAtHour(targetHour);

      // 2 current + 5 (1st hour) + 10 (2nd hour) = 17
      expect(count).toBe(17);
    });
  });

  describe('getMinReviewsForNotification', () => {
    it('returns 20', () => {
      expect(getMinReviewsForNotification()).toBe(20);
    });
  });

  describe('performHourlyReviewCheck', () => {
    beforeEach(() => {
      (AppState as any).currentState = 'background';
    });

    it('skips notification but still checks reviews when app is in foreground', async () => {
      (AppState as any).currentState = 'active';
      (getAvailableReviews as jest.Mock).mockResolvedValue(
        Array(25).fill({ id: 1 }),
      );

      await performHourlyReviewCheck();

      expect(getAvailableReviews).toHaveBeenCalled();
      expect(setBadgeCount).toHaveBeenCalledWith(25);
      expect(notifee.displayNotification).not.toHaveBeenCalled();
    });

    it('skips notification if permissions not granted', async () => {
      (checkPermissions as jest.Mock).mockResolvedValue('denied');
      (getAvailableReviews as jest.Mock).mockResolvedValue(
        Array(25).fill({ id: 1 }),
      );

      await performHourlyReviewCheck();

      expect(notifee.displayNotification).not.toHaveBeenCalled();
    });

    it('skips notification if notifications are disabled', async () => {
      (getNotificationsEnabled as jest.Mock).mockResolvedValue(false);
      (getAvailableReviews as jest.Mock).mockResolvedValue(
        Array(25).fill({ id: 1 }),
      );

      await performHourlyReviewCheck();

      expect(notifee.displayNotification).not.toHaveBeenCalled();
    });

    it('skips notification if no new reviews became available this hour', async () => {
      (getAvailableReviews as jest.Mock).mockResolvedValue(
        Array(25).fill({ id: 1 }),
      );
      (getNewReviewCountThisHour as jest.Mock).mockResolvedValue(0);

      await performHourlyReviewCheck();

      // Badge should still be updated
      expect(setBadgeCount).toHaveBeenCalledWith(25);
      // But no notification
      expect(notifee.displayNotification).not.toHaveBeenCalled();
      // Should still schedule next check
      expect(notifee.createTriggerNotification).toHaveBeenCalled();
    });

    it('skips notification if review count is less than 20', async () => {
      (getAvailableReviews as jest.Mock).mockResolvedValue(
        Array(19).fill({ id: 1 }),
      );

      await performHourlyReviewCheck();

      expect(notifee.displayNotification).not.toHaveBeenCalled();
    });

    it('displays notification if review count is 20 or more', async () => {
      (getAvailableReviews as jest.Mock).mockResolvedValue(
        Array(20).fill({ id: 1 }),
      );

      await performHourlyReviewCheck();

      expect(notifee.displayNotification).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'Krabikani',
          body: '20 reviews ready! Time to level up your Japanese',
        }),
      );
    });

    it('displays correct message with exact review count', async () => {
      (getAvailableReviews as jest.Mock).mockResolvedValue(
        Array(47).fill({ id: 1 }),
      );

      await performHourlyReviewCheck();

      expect(notifee.displayNotification).toHaveBeenCalledWith(
        expect.objectContaining({
          body: '47 reviews ready! Time to level up your Japanese',
        }),
      );
    });

    it('schedules next hourly check after performing check', async () => {
      (getAvailableReviews as jest.Mock).mockResolvedValue([]);

      await performHourlyReviewCheck();

      expect(notifee.cancelTriggerNotifications).toHaveBeenCalled();
      expect(notifee.createTriggerNotification).toHaveBeenCalled();
    });

    it('updates badge count to current review count', async () => {
      (getAvailableReviews as jest.Mock).mockResolvedValue(
        Array(47).fill({ id: 1 }),
      );

      await performHourlyReviewCheck();

      expect(setBadgeCount).toHaveBeenCalledWith(47);
    });

    it('sets badge count to 0 when no reviews (clears badge)', async () => {
      (getAvailableReviews as jest.Mock).mockResolvedValue([]);

      await performHourlyReviewCheck();

      expect(setBadgeCount).toHaveBeenCalledWith(0);
    });

    it('updates badge even when review count is below notification threshold', async () => {
      (getAvailableReviews as jest.Mock).mockResolvedValue(
        Array(15).fill({ id: 1 }),
      );

      await performHourlyReviewCheck();

      expect(setBadgeCount).toHaveBeenCalledWith(15);
      expect(notifee.displayNotification).not.toHaveBeenCalled();
    });

    it('schedules next check when app is in foreground', async () => {
      (AppState as any).currentState = 'active';
      (getAvailableReviews as jest.Mock).mockResolvedValue(
        Array(25).fill({ id: 1 }),
      );

      await performHourlyReviewCheck();

      expect(notifee.createTriggerNotification).toHaveBeenCalled();
    });

    it('updates badge when app is in foreground', async () => {
      (AppState as any).currentState = 'active';
      (getAvailableReviews as jest.Mock).mockResolvedValue(
        Array(25).fill({ id: 1 }),
      );

      await performHourlyReviewCheck();

      expect(setBadgeCount).toHaveBeenCalledWith(25);
    });

    it('does not update badge when permissions not granted', async () => {
      (checkPermissions as jest.Mock).mockResolvedValue('denied');
      (getAvailableReviews as jest.Mock).mockResolvedValue(
        Array(25).fill({ id: 1 }),
      );

      await performHourlyReviewCheck();

      expect(setBadgeCount).not.toHaveBeenCalled();
    });

    it('does not update badge when notifications are disabled', async () => {
      (getNotificationsEnabled as jest.Mock).mockResolvedValue(false);
      (getAvailableReviews as jest.Mock).mockResolvedValue(
        Array(25).fill({ id: 1 }),
      );

      await performHourlyReviewCheck();

      expect(setBadgeCount).not.toHaveBeenCalled();
    });
  });

  describe('scheduleNextHourlyCheck', () => {
    it('cancels existing scheduled check', async () => {
      await scheduleNextHourlyCheck();

      expect(notifee.cancelTriggerNotifications).toHaveBeenCalledWith([
        'hourly-review-check',
      ]);
    });

    it('creates a silent trigger notification with no visible content', async () => {
      await scheduleNextHourlyCheck();

      const call = (notifee.createTriggerNotification as jest.Mock).mock
        .calls[0];
      const notification = call[0];

      expect(notification.title).toBe('');
      expect(notification.body).toBeUndefined();
      expect(notification.android.importance).toBe(AndroidImportance.MIN);
      expect(notification.android.asForegroundService).toBe(false);
    });

    it('creates a trigger notification for next hour', async () => {
      const beforeCall = getNextHourTimestamp();
      await scheduleNextHourlyCheck();
      const afterCall = getNextHourTimestamp();

      expect(notifee.createTriggerNotification).toHaveBeenCalledWith(
        expect.objectContaining({
          id: 'hourly-review-check',
        }),
        expect.objectContaining({
          type: TriggerType.TIMESTAMP,
          timestamp: expect.any(Number),
        }),
      );

      const call = (notifee.createTriggerNotification as jest.Mock).mock
        .calls[0];
      const trigger = call[1];
      expect(trigger.timestamp).toBeGreaterThanOrEqual(beforeCall);
      expect(trigger.timestamp).toBeLessThanOrEqual(afterCall);
    });
  });

  describe('handleNotificationEvent', () => {
    beforeEach(() => {
      (AppState as any).currentState = 'background';
    });

    it('performs check when trigger notification is delivered', async () => {
      (getAvailableReviews as jest.Mock).mockResolvedValue(
        Array(25).fill({ id: 1 }),
      );

      await handleNotificationEvent(EventType.DELIVERED, 'hourly-review-check');

      expect(notifee.cancelNotification).toHaveBeenCalledWith(
        'hourly-review-check',
      );
      expect(notifee.displayNotification).toHaveBeenCalled();
    });

    it('ignores TRIGGER_NOTIFICATION_CREATED events (they fire when scheduled, not when triggered)', async () => {
      (getAvailableReviews as jest.Mock).mockResolvedValue(
        Array(25).fill({ id: 1 }),
      );

      await handleNotificationEvent(
        EventType.TRIGGER_NOTIFICATION_CREATED,
        'hourly-review-check',
      );

      // Should NOT perform check - TRIGGER_NOTIFICATION_CREATED fires when notification
      // is scheduled, not when it fires. We only handle DELIVERED.
      expect(notifee.cancelNotification).not.toHaveBeenCalled();
      expect(notifee.displayNotification).not.toHaveBeenCalled();
    });

    it('ignores events for other notifications', async () => {
      await handleNotificationEvent(
        EventType.DELIVERED,
        'some-other-notification',
      );

      expect(notifee.cancelNotification).not.toHaveBeenCalled();
    });

    it('ignores events with undefined notification id', async () => {
      await handleNotificationEvent(EventType.DELIVERED, undefined);

      expect(notifee.cancelNotification).not.toHaveBeenCalled();
    });
  });

  describe('initializeReviewNotificationScheduler', () => {
    it('schedules hourly check when permissions and setting are enabled', async () => {
      (checkPermissions as jest.Mock).mockResolvedValue('granted');
      (getNotificationsEnabled as jest.Mock).mockResolvedValue(true);

      await initializeReviewNotificationScheduler();

      expect(notifee.createTriggerNotification).toHaveBeenCalled();
    });

    it('does not schedule when permissions are not granted', async () => {
      (checkPermissions as jest.Mock).mockResolvedValue('denied');
      (getNotificationsEnabled as jest.Mock).mockResolvedValue(true);

      await initializeReviewNotificationScheduler();

      expect(notifee.createTriggerNotification).not.toHaveBeenCalled();
    });

    it('does not schedule when notifications are disabled', async () => {
      (checkPermissions as jest.Mock).mockResolvedValue('granted');
      (getNotificationsEnabled as jest.Mock).mockResolvedValue(false);

      await initializeReviewNotificationScheduler();

      expect(notifee.createTriggerNotification).not.toHaveBeenCalled();
    });
  });

  describe('stopReviewNotificationScheduler', () => {
    it('cancels the hourly check trigger', async () => {
      await stopReviewNotificationScheduler();

      expect(notifee.cancelTriggerNotifications).toHaveBeenCalledWith([
        'hourly-review-check',
      ]);
    });
  });
});
