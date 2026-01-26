import notifee, {
  AndroidImportance,
  AndroidVisibility,
} from '@notifee/react-native';
import { Platform } from 'react-native';

export const NOTIFICATION_CHANNEL_ID = 'review-reminders';
export const NOTIFICATION_CHANNEL_NAME = 'Review Reminders';

export async function setupNotificationChannel(): Promise<void> {
  if (Platform.OS === 'android') {
    await notifee.createChannel({
      id: NOTIFICATION_CHANNEL_ID,
      name: NOTIFICATION_CHANNEL_NAME,
      importance: AndroidImportance.HIGH,
      visibility: AndroidVisibility.PUBLIC,
      vibration: true,
      sound: undefined, // No sound, vibration only
    });
  }
}

export async function displayTestNotification(): Promise<string> {
  // Ensure channel exists on Android
  if (Platform.OS === 'android') {
    await setupNotificationChannel();
  }

  return notifee.displayNotification({
    title: 'UnaiNikani',
    body: 'Test notification - everything is working!',
    android: {
      channelId: NOTIFICATION_CHANNEL_ID,
      pressAction: {
        id: 'default',
      },
    },
  });
}
