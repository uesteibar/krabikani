import { Platform, NativeModules } from 'react-native';
import { sendReviewData } from '../../src/native/WearDataModule';

jest.mock('react-native', () => ({
  Platform: { OS: 'android' },
  NativeModules: {
    WearDataModule: {
      sendReviewData: jest.fn(() => Promise.resolve()),
    },
  },
}));

describe('WearDataModule', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    Platform.OS = 'android';
    NativeModules.WearDataModule.sendReviewData = jest.fn(() =>
      Promise.resolve(),
    );
  });

  describe('sendReviewData on Android', () => {
    it('calls NativeModules.WearDataModule.sendReviewData with count and nextReviewISO', async () => {
      await sendReviewData(5, '2026-01-01T00:00:00Z');
      expect(
        NativeModules.WearDataModule.sendReviewData,
      ).toHaveBeenCalledWith(5, '2026-01-01T00:00:00Z');
    });

    it('passes null nextReviewISO when not provided', async () => {
      await sendReviewData(3, null);
      expect(
        NativeModules.WearDataModule.sendReviewData,
      ).toHaveBeenCalledWith(3, null);
    });

    it('resolves without error on success', async () => {
      await expect(
        sendReviewData(5, '2026-01-01T00:00:00Z'),
      ).resolves.toBeUndefined();
    });

    it('does not throw when native module rejects', async () => {
      NativeModules.WearDataModule.sendReviewData = jest.fn(() =>
        Promise.reject(new Error('Wearable not connected')),
      );
      await expect(sendReviewData(5, null)).resolves.toBeUndefined();
    });
  });

  describe('sendReviewData on iOS', () => {
    beforeEach(() => {
      Platform.OS = 'ios' as any;
    });

    it('does not call NativeModules.WearDataModule', async () => {
      await sendReviewData(5, '2026-01-01T00:00:00Z');
      expect(
        NativeModules.WearDataModule.sendReviewData,
      ).not.toHaveBeenCalled();
    });

    it('resolves without error', async () => {
      await expect(sendReviewData(5, null)).resolves.toBeUndefined();
    });
  });
});
