export const AndroidImportance = {
  DEFAULT: 3,
  HIGH: 4,
  LOW: 2,
  MIN: 1,
  NONE: 0,
};

export const AndroidVisibility = {
  PRIVATE: 0,
  PUBLIC: 1,
  SECRET: -1,
};

export const AuthorizationStatus = {
  NOT_DETERMINED: -1,
  DENIED: 0,
  AUTHORIZED: 1,
  PROVISIONAL: 2,
};

export const TriggerType = {
  TIMESTAMP: 0,
  INTERVAL: 1,
};

export const EventType = {
  UNKNOWN: -1,
  DISMISSED: 0,
  PRESS: 1,
  ACTION_PRESS: 2,
  DELIVERED: 3,
  APP_BLOCKED: 4,
  CHANNEL_BLOCKED: 5,
  CHANNEL_GROUP_BLOCKED: 6,
  TRIGGER_NOTIFICATION_CREATED: 7,
};

const mockNotifee = {
  createChannel: jest.fn().mockResolvedValue('review-reminders'),
  displayNotification: jest.fn().mockResolvedValue('notification-id'),
  cancelAllNotifications: jest.fn().mockResolvedValue(undefined),
  cancelNotification: jest.fn().mockResolvedValue(undefined),
  cancelTriggerNotifications: jest.fn().mockResolvedValue(undefined),
  setBadgeCount: jest.fn().mockResolvedValue(undefined),
  getBadgeCount: jest.fn().mockResolvedValue(0),
  requestPermission: jest.fn().mockResolvedValue({
    authorizationStatus: AuthorizationStatus.AUTHORIZED,
  }),
  getNotificationSettings: jest.fn().mockResolvedValue({
    authorizationStatus: AuthorizationStatus.AUTHORIZED,
  }),
  createTriggerNotification: jest.fn().mockResolvedValue('trigger-notification-id'),
  getTriggerNotifications: jest.fn().mockResolvedValue([]),
  openNotificationSettings: jest.fn().mockResolvedValue(undefined),
};

export const __resetMock = () => {
  mockNotifee.createChannel.mockClear();
  mockNotifee.displayNotification.mockClear();
  mockNotifee.cancelAllNotifications.mockClear();
  mockNotifee.cancelNotification.mockClear();
  mockNotifee.cancelTriggerNotifications.mockClear();
  mockNotifee.setBadgeCount.mockClear();
  mockNotifee.getBadgeCount.mockClear();
  mockNotifee.requestPermission.mockClear();
  mockNotifee.getNotificationSettings.mockClear();
  mockNotifee.createTriggerNotification.mockClear();
  mockNotifee.getTriggerNotifications.mockClear();
  mockNotifee.openNotificationSettings.mockClear();
};

export default mockNotifee;
