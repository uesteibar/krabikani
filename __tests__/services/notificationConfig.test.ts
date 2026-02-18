import { Platform } from 'react-native';
import notifee, {
  AndroidImportance,
  AndroidVisibility,
} from '@notifee/react-native';
import {
  setupNotificationChannel,
  setupTriggerChannel,
  displayTestNotification,
  NOTIFICATION_CHANNEL_ID,
  NOTIFICATION_CHANNEL_NAME,
  TRIGGER_CHANNEL_ID,
  TRIGGER_CHANNEL_NAME,
} from '../../src/services/notificationConfig';

jest.mock('@notifee/react-native');

describe('notificationConfig', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('setupNotificationChannel', () => {
    it('creates Android channel with correct configuration', async () => {
      Platform.OS = 'android';

      await setupNotificationChannel();

      expect(notifee.createChannel).toHaveBeenCalledWith({
        id: NOTIFICATION_CHANNEL_ID,
        name: NOTIFICATION_CHANNEL_NAME,
        importance: AndroidImportance.HIGH,
        visibility: AndroidVisibility.PUBLIC,
        vibration: true,
        sound: undefined,
      });
    });
  });

  describe('displayTestNotification', () => {
    it('displays notification with correct content', async () => {
      Platform.OS = 'android';

      const notificationId = await displayTestNotification();

      expect(notificationId).toBe('notification-id');
      expect(notifee.displayNotification).toHaveBeenCalledWith({
        title: 'Krabikani',
        body: 'Test notification - everything is working!',
        android: {
          channelId: NOTIFICATION_CHANNEL_ID,
          pressAction: {
            id: 'default',
          },
        },
      });
    });

    it('sets up channel before displaying on Android', async () => {
      Platform.OS = 'android';

      await displayTestNotification();

      expect(notifee.createChannel).toHaveBeenCalled();
    });
  });

  describe('setupTriggerChannel', () => {
    it('creates Android channel with NONE importance and SECRET visibility', async () => {
      Platform.OS = 'android';

      await setupTriggerChannel();

      expect(notifee.createChannel).toHaveBeenCalledWith({
        id: TRIGGER_CHANNEL_ID,
        name: TRIGGER_CHANNEL_NAME,
        importance: AndroidImportance.NONE,
        visibility: AndroidVisibility.SECRET,
        vibration: false,
      });
    });

    it('does nothing on iOS', async () => {
      Platform.OS = 'ios';

      await setupTriggerChannel();

      expect(notifee.createChannel).not.toHaveBeenCalled();
    });
  });

  describe('constants', () => {
    it('has correct channel ID', () => {
      expect(NOTIFICATION_CHANNEL_ID).toBe('review-reminders');
    });

    it('has correct channel name', () => {
      expect(NOTIFICATION_CHANNEL_NAME).toBe('Review Reminders');
    });

    it('has correct trigger channel ID', () => {
      expect(TRIGGER_CHANNEL_ID).toBe('review-check-triggers');
    });

    it('has correct trigger channel name', () => {
      expect(TRIGGER_CHANNEL_NAME).toBe('Review Check Triggers');
    });
  });
});
