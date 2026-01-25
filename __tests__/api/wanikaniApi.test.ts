import { validateApiKey, WaniKaniApiError } from '../../src/api/wanikaniApi';

// Mock fetch globally
const mockFetch = jest.fn();
(globalThis as { fetch: typeof fetch }).fetch = mockFetch;

describe('wanikaniApi', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('validateApiKey', () => {
    it('should return user data when API key is valid', async () => {
      const mockUser = {
        id: 12345,
        username: 'testuser',
        level: 10,
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          object: 'user',
          url: 'https://api.wanikani.com/v2/user',
          data_updated_at: '2024-01-01T00:00:00.000000Z',
          data: mockUser,
        }),
      });

      const result = await validateApiKey('valid-api-key');

      expect(result.success).toBe(true);
      expect(result.user).toEqual(mockUser);
      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.wanikani.com/v2/user',
        {
          method: 'GET',
          headers: {
            'Wanikani-Revision': '20170710',
            Authorization: 'Bearer valid-api-key',
          },
        },
      );
    });

    it('should return error when API key is invalid (401)', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 401,
        json: async () => ({
          error: 'Unauthorized',
          code: 401,
        }),
      });

      const result = await validateApiKey('invalid-api-key');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Invalid API key');
      expect(result.user).toBeUndefined();
    });

    it('should return error when API key is forbidden (403)', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 403,
        json: async () => ({
          error: 'Forbidden',
          code: 403,
        }),
      });

      const result = await validateApiKey('forbidden-api-key');

      expect(result.success).toBe(false);
      expect(result.error).toBe('API key does not have required permissions');
      expect(result.user).toBeUndefined();
    });

    it('should return error when server error occurs (500)', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        json: async () => ({
          error: 'Internal Server Error',
          code: 500,
        }),
      });

      const result = await validateApiKey('any-api-key');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Server error. Please try again later.');
      expect(result.user).toBeUndefined();
    });

    it('should return error when network request fails', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network request failed'));

      const result = await validateApiKey('any-api-key');

      expect(result.success).toBe(false);
      expect(result.error).toBe(
        'Network error. Please check your internet connection.',
      );
      expect(result.user).toBeUndefined();
    });

    it('should return error when response parsing fails', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => {
          throw new Error('Invalid JSON');
        },
      });

      const result = await validateApiKey('any-api-key');

      expect(result.success).toBe(false);
      expect(result.error).toBe(
        'Network error. Please check your internet connection.',
      );
    });
  });

  describe('WaniKaniApiError', () => {
    it('should create an error with status code and message', () => {
      const error = new WaniKaniApiError(401, 'Unauthorized');

      expect(error).toBeInstanceOf(Error);
      expect(error.statusCode).toBe(401);
      expect(error.message).toBe('Unauthorized');
      expect(error.name).toBe('WaniKaniApiError');
    });
  });
});
