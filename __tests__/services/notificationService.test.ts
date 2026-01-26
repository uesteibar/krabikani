import notifee, {AuthorizationStatus} from '@notifee/react-native';
import {
  requestPermissions,
  checkPermissions,
} from '../../src/services/notificationService';

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
});
