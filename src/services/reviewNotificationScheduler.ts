/**
 * Review notification scheduler.
 * Handles hourly checks for reviews and schedules notifications when appropriate.
 */
import notifee, {EventType, TriggerType} from '@notifee/react-native';
import {AppState, Platform} from 'react-native';

import {getAvailableReviews, getUpcomingReviewsByHour} from '../storage';
import {
  NOTIFICATION_CHANNEL_ID,
  setupNotificationChannel,
} from './notificationConfig';
import {
  checkPermissions,
  getNotificationsEnabled,
  setBadgeCount,
} from './notificationService';

// Notification ID for the hourly review check trigger
const HOURLY_CHECK_NOTIFICATION_ID = 'hourly-review-check';

// Minimum review count to trigger notification
const MIN_REVIEWS_FOR_NOTIFICATION = 20;

/**
 * Gets the total available review count at a specific hour.
 * This includes currently available reviews plus those becoming available at that hour.
 * @param targetHour The target Date to calculate reviews for
 */
export async function getReviewCountAtHour(targetHour: Date): Promise<number> {
  // Get current reviews (already available)
  const currentReviews = await getAvailableReviews();
  const currentCount = currentReviews.length;

  // Get upcoming reviews by hour to find how many become available at the target hour
  const hourlyBuckets = await getUpcomingReviewsByHour(24);

  // Find the bucket that matches the target hour
  let additionalReviews = 0;
  for (const bucket of hourlyBuckets) {
    // If the bucket hour is <= target hour, add those reviews
    if (bucket.hour <= targetHour) {
      additionalReviews += bucket.count;
    }
  }

  return currentCount + additionalReviews;
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
 * Checks if the app is currently in the foreground.
 */
export function isAppInForeground(): boolean {
  return AppState.currentState === 'active';
}

/**
 * Performs the hourly review check and displays a notification if appropriate.
 * This is called when the scheduled trigger fires.
 */
export async function performHourlyReviewCheck(): Promise<void> {
  // Skip if app is in foreground
  if (isAppInForeground()) {
    // Schedule next check and return
    await scheduleNextHourlyCheck();
    return;
  }

  // Check if notifications are enabled (both permission and user setting)
  const permissionStatus = await checkPermissions();
  if (permissionStatus !== 'granted') {
    await scheduleNextHourlyCheck();
    return;
  }

  const notificationsEnabled = await getNotificationsEnabled();
  if (!notificationsEnabled) {
    await scheduleNextHourlyCheck();
    return;
  }

  // Get current review count
  const currentReviews = await getAvailableReviews();
  const reviewCount = currentReviews.length;

  // Update app badge to current review count (0 clears the badge)
  await setBadgeCount(reviewCount);

  // Only show notification if count >= 20
  if (reviewCount >= MIN_REVIEWS_FOR_NOTIFICATION) {
    // Ensure channel exists on Android
    if (Platform.OS === 'android') {
      await setupNotificationChannel();
    }

    // Display the notification
    await notifee.displayNotification({
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
    });
  }

  // Schedule next hourly check
  await scheduleNextHourlyCheck();
}

/**
 * Schedules the next hourly review check.
 * Creates a silent trigger notification that will fire at the next top of the hour.
 */
export async function scheduleNextHourlyCheck(): Promise<void> {
  // Cancel any existing scheduled check
  await notifee.cancelTriggerNotifications([HOURLY_CHECK_NOTIFICATION_ID]);

  const triggerTimestamp = getNextHourTimestamp();

  // Ensure channel exists on Android
  if (Platform.OS === 'android') {
    await setupNotificationChannel();
  }

  // Schedule a trigger notification that will fire at the next hour
  // The notification itself won't be shown - we use it to trigger our check
  await notifee.createTriggerNotification(
    {
      id: HOURLY_CHECK_NOTIFICATION_ID,
      title: 'Review Check',
      body: 'Checking for reviews...',
      android: {
        channelId: NOTIFICATION_CHANNEL_ID,
        // Don't show heads-up notification for the trigger
        showTimestamp: false,
        pressAction: {
          id: 'default',
        },
      },
      ios: {
        sound: undefined,
      },
    },
    {
      type: TriggerType.TIMESTAMP,
      timestamp: triggerTimestamp,
    },
  );
}

/**
 * Handles notification events from notifee.
 * Called for both foreground and background events.
 */
export async function handleNotificationEvent(
  type: EventType,
  notificationId: string | undefined,
): Promise<void> {
  // Check if this is our hourly check notification trigger
  if (
    type === EventType.TRIGGER_NOTIFICATION_CREATED ||
    type === EventType.DELIVERED
  ) {
    if (notificationId === HOURLY_CHECK_NOTIFICATION_ID) {
      // Cancel the trigger notification immediately (it's just a trigger)
      await notifee.cancelNotification(HOURLY_CHECK_NOTIFICATION_ID);

      // Perform the actual review check
      await performHourlyReviewCheck();
    }
  }
}

/**
 * Initializes the review notification scheduler.
 * Sets up event handlers and schedules the first hourly check.
 */
export async function initializeReviewNotificationScheduler(): Promise<void> {
  // Check if notifications are enabled
  const permissionStatus = await checkPermissions();
  const notificationsEnabled = await getNotificationsEnabled();

  if (permissionStatus !== 'granted' || !notificationsEnabled) {
    return;
  }

  // Schedule the next hourly check
  await scheduleNextHourlyCheck();
}

/**
 * Stops the review notification scheduler.
 * Cancels all scheduled review check triggers.
 */
export async function stopReviewNotificationScheduler(): Promise<void> {
  await notifee.cancelTriggerNotifications([HOURLY_CHECK_NOTIFICATION_ID]);
}

/**
 * Gets the minimum review count required to trigger a notification.
 * Exported for testing purposes.
 */
export function getMinReviewsForNotification(): number {
  return MIN_REVIEWS_FOR_NOTIFICATION;
}
