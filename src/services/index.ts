export {
  NOTIFICATION_CHANNEL_ID,
  NOTIFICATION_CHANNEL_NAME,
  setupNotificationChannel,
  displayTestNotification,
} from './notificationConfig';

export {
  requestPermissions,
  checkPermissions,
  setBadgeCount,
  clearBadge,
  getNextHourTimestamp,
  scheduleHourlyNotification,
  cancelAllNotifications,
  getNotificationsEnabled,
  setNotificationsEnabled,
  hasAskedForPermissions,
  setHasAskedForPermissions,
  openNotificationSettings,
  type PermissionStatus,
} from './notificationService';

export {
  getReviewCountAtHour,
  getNextHourTimestamp as getNextHourTimestampForScheduler,
  isAppInForeground,
  performHourlyReviewCheck,
  scheduleNextHourlyCheck,
  handleNotificationEvent,
  initializeReviewNotificationScheduler,
  stopReviewNotificationScheduler,
  getMinReviewsForNotification,
} from './reviewNotificationScheduler';
