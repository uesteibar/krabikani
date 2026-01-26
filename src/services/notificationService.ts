import notifee, {AuthorizationStatus} from '@notifee/react-native';

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
