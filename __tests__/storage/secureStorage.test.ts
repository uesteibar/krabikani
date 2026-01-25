import * as Keychain from 'react-native-keychain';

import {
  clearApiKey,
  getApiKey,
  hasApiKey,
  saveApiKey,
} from '../../src/storage/secureStorage';

jest.mock('react-native-keychain');

const mockKeychain = Keychain as jest.Mocked<typeof Keychain> & {
  __clearMockStorage: () => void;
};

describe('secureStorage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockKeychain.__clearMockStorage();
  });

  describe('saveApiKey', () => {
    it('should save an API key successfully', async () => {
      const result = await saveApiKey('test-api-key');

      expect(result.success).toBe(true);
      expect(result.error).toBeUndefined();
      expect(Keychain.setGenericPassword).toHaveBeenCalledWith(
        'wanikani',
        'test-api-key',
        { service: 'com.unainikani.apikey' },
      );
    });

    it('should return an error when save fails', async () => {
      (Keychain.setGenericPassword as jest.Mock).mockRejectedValueOnce(
        new Error('Storage error'),
      );

      const result = await saveApiKey('test-api-key');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Storage error');
    });
  });

  describe('getApiKey', () => {
    it('should return the stored API key', async () => {
      await saveApiKey('stored-key');

      const apiKey = await getApiKey();

      expect(apiKey).toBe('stored-key');
    });

    it('should return null when no key is stored', async () => {
      const apiKey = await getApiKey();

      expect(apiKey).toBeNull();
    });

    it('should return null when getGenericPassword fails', async () => {
      (Keychain.getGenericPassword as jest.Mock).mockRejectedValueOnce(
        new Error('Read error'),
      );

      const apiKey = await getApiKey();

      expect(apiKey).toBeNull();
    });
  });

  describe('clearApiKey', () => {
    it('should clear the stored API key', async () => {
      await saveApiKey('key-to-clear');
      const result = await clearApiKey();

      expect(result.success).toBe(true);
      expect(Keychain.resetGenericPassword).toHaveBeenCalledWith({
        service: 'com.unainikani.apikey',
      });
    });

    it('should return an error when clear fails', async () => {
      (Keychain.resetGenericPassword as jest.Mock).mockRejectedValueOnce(
        new Error('Clear error'),
      );

      const result = await clearApiKey();

      expect(result.success).toBe(false);
      expect(result.error).toBe('Clear error');
    });
  });

  describe('hasApiKey', () => {
    it('should return true when an API key is stored', async () => {
      await saveApiKey('some-key');

      const result = await hasApiKey();

      expect(result).toBe(true);
    });

    it('should return false when no API key is stored', async () => {
      const result = await hasApiKey();

      expect(result).toBe(false);
    });

    it('should return false when the stored key is empty', async () => {
      await saveApiKey('');

      const result = await hasApiKey();

      expect(result).toBe(false);
    });
  });
});
