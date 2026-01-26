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

const mockNotifee = {
  createChannel: jest.fn().mockResolvedValue('review-reminders'),
  displayNotification: jest.fn().mockResolvedValue('notification-id'),
  cancelAllNotifications: jest.fn().mockResolvedValue(undefined),
  cancelNotification: jest.fn().mockResolvedValue(undefined),
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
};

export const __resetMock = () => {
  mockNotifee.createChannel.mockClear();
  mockNotifee.displayNotification.mockClear();
  mockNotifee.cancelAllNotifications.mockClear();
  mockNotifee.cancelNotification.mockClear();
  mockNotifee.setBadgeCount.mockClear();
  mockNotifee.getBadgeCount.mockClear();
  mockNotifee.requestPermission.mockClear();
  mockNotifee.getNotificationSettings.mockClear();
  mockNotifee.createTriggerNotification.mockClear();
  mockNotifee.getTriggerNotifications.mockClear();
};

export default mockNotifee;
