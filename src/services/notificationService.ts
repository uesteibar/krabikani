import notifee, {AuthorizationStatus, TriggerType} from '@notifee/react-native';
import {Platform} from 'react-native';
import {
  NOTIFICATION_CHANNEL_ID,
  setupNotificationChannel,
} from './notificationConfig';

export type PermissionStatus = 'granted' | 'denied' | 'not_determined';

/**
 * Maps notifee AuthorizationStatus to simplified PermissionStatus
 */
function mapAuthorizationStatus(status: number): PermissionStatus {
  switch (status) {
    case AuthorizationStatus.AUTHORIZED:
    case AuthorizationStatus.PROVISIONAL:
      return 'granted';
    case AuthorizationStatus.DENIED:
      return 'denied';
    case AuthorizationStatus.NOT_DETERMINED:
    default:
      return 'not_determined';
  }
}

/**
 * Requests notification permissions from the OS.
 * On iOS, this shows the system permission dialog.
 * On Android, this requests POST_NOTIFICATIONS permission (Android 13+).
 * @returns The resulting permission status
 */
export async function requestPermissions(): Promise<PermissionStatus> {
  const settings = await notifee.requestPermission();
  return mapAuthorizationStatus(settings.authorizationStatus);
}

/**
 * Checks the current notification permission status without prompting.
 * @returns The current permission status
 */
export async function checkPermissions(): Promise<PermissionStatus> {
  const settings = await notifee.getNotificationSettings();
  return mapAuthorizationStatus(settings.authorizationStatus);
}

/**
 * Sets the app icon badge count.
 * Works on both iOS and Android (Android 8.0+ with launcher support).
 * @param count - The badge number to display. Use 0 to clear the badge.
 */
export async function setBadgeCount(count: number): Promise<void> {
  await notifee.setBadgeCount(count);
}

/**
 * Clears the app icon badge by setting count to 0.
 */
export async function clearBadge(): Promise<void> {
  await notifee.setBadgeCount(0);
}

/**
 * Calculates the timestamp for the next top of the hour.
 * @returns Unix timestamp in milliseconds for the next o'clock
 */
export function getNextHourTimestamp(): number {
  const now = new Date();
  const nextHour = new Date(now);
  nextHour.setHours(now.getHours() + 1, 0, 0, 0);
  return nextHour.getTime();
}

/**
 * Schedules a notification for the next top of the hour.
 * Notification message: '{count} reviews ready! Time to level up your Japanese'
 * Uses vibration only (no sound).
 * @param reviewCount - The number of reviews to display in the notification
 */
export async function scheduleHourlyNotification(
  reviewCount: number,
): Promise<void> {
  // Ensure channel exists on Android
  if (Platform.OS === 'android') {
    await setupNotificationChannel();
  }

  const triggerTimestamp = getNextHourTimestamp();

  await notifee.createTriggerNotification(
    {
      title: 'UnaiNikani',
      body: `${reviewCount} reviews ready! Time to level up your Japanese`,
      android: {
        channelId: NOTIFICATION_CHANNEL_ID,
        pressAction: {
          id: 'default',
        },
      },
      ios: {
        sound: undefined, // No sound for iOS
      },
    },
    {
      type: TriggerType.TIMESTAMP,
      timestamp: triggerTimestamp,
    },
  );
}

/**
 * Cancels all scheduled notifications.
 */
export async function cancelAllNotifications(): Promise<void> {
  await notifee.cancelAllNotifications();
}
