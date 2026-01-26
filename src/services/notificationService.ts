import notifee, {AuthorizationStatus, TriggerType} from '@notifee/react-native';
import {Platform} from 'react-native';
import {
  NOTIFICATION_CHANNEL_ID,
  setupNotificationChannel,
} from './notificationConfig';
import {getSetting, setSetting} from '../storage';

// Settings keys for notification preferences
const NOTIFICATIONS_ENABLED_KEY = 'notifications_enabled';
const NOTIFICATIONS_PERMISSION_ASKED_KEY = 'notifications_permission_asked';

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

/**
 * Gets the notifications enabled setting.
 * Default is true (notifications enabled by default if permissions granted).
 * @returns Whether notifications are enabled
 */
export async function getNotificationsEnabled(): Promise<boolean> {
  const value = await getSetting(NOTIFICATIONS_ENABLED_KEY);
  // Default to true if setting doesn't exist
  return value === null ? true : value === true;
}

/**
 * Sets the notifications enabled setting.
 * @param enabled - Whether notifications should be enabled
 */
export async function setNotificationsEnabled(enabled: boolean): Promise<void> {
  await setSetting(NOTIFICATIONS_ENABLED_KEY, enabled);
}

/**
 * Checks if we have already asked the user for notification permissions.
 * @returns Whether we have asked for permissions before
 */
export async function hasAskedForPermissions(): Promise<boolean> {
  const value = await getSetting(NOTIFICATIONS_PERMISSION_ASKED_KEY);
  return value === true;
}

/**
 * Sets whether we have asked the user for notification permissions.
 * @param asked - Whether we have asked for permissions
 */
export async function setHasAskedForPermissions(asked: boolean): Promise<void> {
  await setSetting(NOTIFICATIONS_PERMISSION_ASKED_KEY, asked);
}

/**
 * Opens the system notification settings for the app.
 * This allows users to enable/disable notifications at the OS level.
 */
export async function openNotificationSettings(): Promise<void> {
  await notifee.openNotificationSettings();
}
