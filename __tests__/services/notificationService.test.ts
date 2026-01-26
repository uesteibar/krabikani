import notifee, {
  AuthorizationStatus,
  TriggerType,
} from '@notifee/react-native';
import {
  requestPermissions,
  checkPermissions,
  setBadgeCount,
  clearBadge,
  getNextHourTimestamp,
  scheduleHourlyNotification,
  cancelAllNotifications,
} from '../../src/services/notificationService';

jest.mock('react-native', () => ({
  Platform: {OS: 'ios'},
}));

jest.mock('@notifee/react-native');

describe('notificationService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('requestPermissions', () => {
    it('returns "granted" when permission is authorized', async () => {
      (notifee.requestPermission as jest.Mock).mockResolvedValue({
        authorizationStatus: AuthorizationStatus.AUTHORIZED,
      });

      const result = await requestPermissions();

      expect(result).toBe('granted');
      expect(notifee.requestPermission).toHaveBeenCalled();
    });

    it('returns "granted" when permission is provisional', async () => {
      (notifee.requestPermission as jest.Mock).mockResolvedValue({
        authorizationStatus: AuthorizationStatus.PROVISIONAL,
      });

      const result = await requestPermissions();

      expect(result).toBe('granted');
    });

    it('returns "denied" when permission is denied', async () => {
      (notifee.requestPermission as jest.Mock).mockResolvedValue({
        authorizationStatus: AuthorizationStatus.DENIED,
      });

      const result = await requestPermissions();

      expect(result).toBe('denied');
    });

    it('returns "not_determined" when permission is not determined', async () => {
      (notifee.requestPermission as jest.Mock).mockResolvedValue({
        authorizationStatus: AuthorizationStatus.NOT_DETERMINED,
      });

      const result = await requestPermissions();

      expect(result).toBe('not_determined');
    });
  });

  describe('checkPermissions', () => {
    it('returns "granted" when permission is authorized', async () => {
      (notifee.getNotificationSettings as jest.Mock).mockResolvedValue({
        authorizationStatus: AuthorizationStatus.AUTHORIZED,
      });

      const result = await checkPermissions();

      expect(result).toBe('granted');
      expect(notifee.getNotificationSettings).toHaveBeenCalled();
    });

    it('returns "granted" when permission is provisional', async () => {
      (notifee.getNotificationSettings as jest.Mock).mockResolvedValue({
        authorizationStatus: AuthorizationStatus.PROVISIONAL,
      });

      const result = await checkPermissions();

      expect(result).toBe('granted');
    });

    it('returns "denied" when permission is denied', async () => {
      (notifee.getNotificationSettings as jest.Mock).mockResolvedValue({
        authorizationStatus: AuthorizationStatus.DENIED,
      });

      const result = await checkPermissions();

      expect(result).toBe('denied');
    });

    it('returns "not_determined" when permission is not determined', async () => {
      (notifee.getNotificationSettings as jest.Mock).mockResolvedValue({
        authorizationStatus: AuthorizationStatus.NOT_DETERMINED,
      });

      const result = await checkPermissions();

      expect(result).toBe('not_determined');
    });

    it('does not trigger permission request dialog', async () => {
      await checkPermissions();

      expect(notifee.requestPermission).not.toHaveBeenCalled();
    });
  });

  describe('setBadgeCount', () => {
    it('sets the badge count to the specified number', async () => {
      await setBadgeCount(47);

      expect(notifee.setBadgeCount).toHaveBeenCalledWith(47);
    });

    it('sets the badge count to 0', async () => {
      await setBadgeCount(0);

      expect(notifee.setBadgeCount).toHaveBeenCalledWith(0);
    });

    it('handles large badge counts', async () => {
      await setBadgeCount(999);

      expect(notifee.setBadgeCount).toHaveBeenCalledWith(999);
    });
  });

  describe('clearBadge', () => {
    it('clears the badge by setting count to 0', async () => {
      await clearBadge();

      expect(notifee.setBadgeCount).toHaveBeenCalledWith(0);
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

  describe('scheduleHourlyNotification', () => {
    it('schedules a notification with the correct message', async () => {
      await scheduleHourlyNotification(42);

      expect(notifee.createTriggerNotification).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'UnaiNikani',
          body: '42 reviews ready! Time to level up your Japanese',
        }),
        expect.objectContaining({
          type: TriggerType.TIMESTAMP,
        }),
      );
    });

    it('schedules notification for the next top of the hour', async () => {
      const beforeCall = getNextHourTimestamp();
      await scheduleHourlyNotification(10);
      const afterCall = getNextHourTimestamp();

      expect(notifee.createTriggerNotification).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          type: TriggerType.TIMESTAMP,
          timestamp: expect.any(Number),
        }),
      );

      const call = (notifee.createTriggerNotification as jest.Mock).mock
        .calls[0];
      const trigger = call[1];

      // Timestamp should be for the next hour
      expect(trigger.timestamp).toBeGreaterThanOrEqual(beforeCall);
      expect(trigger.timestamp).toBeLessThanOrEqual(afterCall);
    });

    it('includes correct iOS configuration (no sound)', async () => {
      await scheduleHourlyNotification(5);

      expect(notifee.createTriggerNotification).toHaveBeenCalledWith(
        expect.objectContaining({
          ios: {
            sound: undefined,
          },
        }),
        expect.anything(),
      );
    });

    it('includes correct Android configuration', async () => {
      await scheduleHourlyNotification(20);

      expect(notifee.createTriggerNotification).toHaveBeenCalledWith(
        expect.objectContaining({
          android: {
            channelId: 'review-reminders',
            pressAction: {
              id: 'default',
            },
          },
        }),
        expect.anything(),
      );
    });
  });

  describe('cancelAllNotifications', () => {
    it('cancels all scheduled notifications', async () => {
      await cancelAllNotifications();

      expect(notifee.cancelAllNotifications).toHaveBeenCalled();
    });
  });
});
