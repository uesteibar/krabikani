import * as Keychain from 'react-native-keychain';

const API_KEY_SERVICE = 'com.unainikani.apikey';

export interface SecureStorageResult {
  success: boolean;
  error?: string;
}

export async function saveApiKey(apiKey: string): Promise<SecureStorageResult> {
  try {
    await Keychain.setGenericPassword('wanikani', apiKey, {
      service: API_KEY_SERVICE,
    });
    return { success: true };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Failed to save API key';
    return { success: false, error: message };
  }
}

export async function getApiKey(): Promise<string | null> {
  try {
    const credentials = await Keychain.getGenericPassword({
      service: API_KEY_SERVICE,
    });
    if (credentials) {
      return credentials.password;
    }
    return null;
  } catch {
    return null;
  }
}

export async function clearApiKey(): Promise<SecureStorageResult> {
  try {
    await Keychain.resetGenericPassword({ service: API_KEY_SERVICE });
    return { success: true };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Failed to clear API key';
    return { success: false, error: message };
  }
}

export async function hasApiKey(): Promise<boolean> {
  const apiKey = await getApiKey();
  return apiKey !== null && apiKey.length > 0;
}
