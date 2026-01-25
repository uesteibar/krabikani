import {
  validateApiKey,
  WaniKaniApiError,
  WaniKaniClient,
} from '../../src/api/wanikaniApi';

// Mock fetch globally
const mockFetch = jest.fn();
(globalThis as { fetch: typeof fetch }).fetch = mockFetch;

describe('wanikaniApi', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('validateApiKey', () => {
    it('should return user data when API key is valid', async () => {
      const mockUserData = {
        id: '12345',
        username: 'testuser',
        level: 10,
        profile_url: 'https://www.wanikani.com/users/testuser',
        started_at: '2020-01-01T00:00:00.000000Z',
        current_vacation_started_at: null,
        subscription: {
          active: true,
          type: 'recurring',
          max_level_granted: 60,
          period_ends_at: null,
        },
        preferences: {
          default_voice_actor_id: 1,
          extra_study_autoplay_audio: false,
          lessons_autoplay_audio: false,
          lessons_batch_size: 5,
          lessons_presentation_order: 'ascending_level_then_subject',
          reviews_autoplay_audio: false,
          reviews_display_srs_indicator: true,
          reviews_presentation_order: 'shuffled',
        },
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          object: 'user',
          url: 'https://api.wanikani.com/v2/user',
          data_updated_at: '2024-01-01T00:00:00.000000Z',
          data: mockUserData,
        }),
      });

      const result = await validateApiKey('valid-api-key');

      expect(result.success).toBe(true);
      expect(result.user).toEqual({
        id: 12345,
        username: 'testuser',
        level: 10,
      });
      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.wanikani.com/v2/user',
        {
          method: 'GET',
          headers: {
            'Wanikani-Revision': '20170710',
            Authorization: 'Bearer valid-api-key',
            'Content-Type': 'application/json',
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
      expect(result.error).toBe('Network request failed');
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
      expect(result.error).toBe('Invalid JSON');
    });
  });

  describe('WaniKaniApiError', () => {
    it('should create an error from HTTP status', () => {
      const error = WaniKaniApiError.fromHttpStatus(401);

      expect(error).toBeInstanceOf(Error);
      expect(error.statusCode).toBe(401);
      expect(error.code).toBe('UNAUTHORIZED');
      expect(error.message).toBe('Invalid API key');
      expect(error.name).toBe('WaniKaniApiError');
      expect(error.retryable).toBe(false);
    });

    it('should create a network error', () => {
      const originalError = new Error('Connection refused');
      const error = WaniKaniApiError.networkError(originalError);

      expect(error).toBeInstanceOf(Error);
      expect(error.statusCode).toBe(0);
      expect(error.code).toBe('NETWORK_ERROR');
      expect(error.message).toBe('Connection refused');
      expect(error.retryable).toBe(true);
    });

    it('should create a network error with default message', () => {
      const error = WaniKaniApiError.networkError();

      expect(error.message).toBe(
        'Network error. Please check your internet connection.',
      );
    });

    it('should mark 429 errors as retryable', () => {
      const error = WaniKaniApiError.fromHttpStatus(429);

      expect(error.code).toBe('TOO_MANY_REQUESTS');
      expect(error.retryable).toBe(true);
    });

    it('should mark 5xx errors as retryable', () => {
      const error500 = WaniKaniApiError.fromHttpStatus(500);
      const error503 = WaniKaniApiError.fromHttpStatus(503);
      const error502 = WaniKaniApiError.fromHttpStatus(502);

      expect(error500.retryable).toBe(true);
      expect(error503.retryable).toBe(true);
      expect(error502.retryable).toBe(true);
    });

    it('should not mark 4xx errors as retryable', () => {
      const error401 = WaniKaniApiError.fromHttpStatus(401);
      const error403 = WaniKaniApiError.fromHttpStatus(403);
      const error404 = WaniKaniApiError.fromHttpStatus(404);

      expect(error401.retryable).toBe(false);
      expect(error403.retryable).toBe(false);
      expect(error404.retryable).toBe(false);
    });
  });

  describe('WaniKaniClient', () => {
    let client: WaniKaniClient;

    beforeEach(() => {
      client = new WaniKaniClient('test-api-key');
    });

    describe('get', () => {
      it('should make GET request with proper headers', async () => {
        mockFetch.mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: async () => ({ data: 'test' }),
        });

        await client.get('/test');

        expect(mockFetch).toHaveBeenCalledWith(
          'https://api.wanikani.com/v2/test',
          {
            method: 'GET',
            headers: {
              'Wanikani-Revision': '20170710',
              Authorization: 'Bearer test-api-key',
              'Content-Type': 'application/json',
            },
          },
        );
      });

      it('should handle full URLs', async () => {
        mockFetch.mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: async () => ({ data: 'test' }),
        });

        await client.get('https://api.wanikani.com/v2/subjects?page=2');

        expect(mockFetch).toHaveBeenCalledWith(
          'https://api.wanikani.com/v2/subjects?page=2',
          expect.any(Object),
        );
      });

      it('should return parsed JSON response', async () => {
        const responseData = { object: 'user', data: { username: 'test' } };
        mockFetch.mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: async () => responseData,
        });

        const result = await client.get('/user');

        expect(result).toEqual(responseData);
      });

      it('should throw WaniKaniApiError on HTTP error', async () => {
        mockFetch.mockResolvedValueOnce({
          ok: false,
          status: 401,
        });

        await expect(client.get('/user')).rejects.toThrow(WaniKaniApiError);
        await mockFetch.mockResolvedValueOnce({
          ok: false,
          status: 401,
        });
        await expect(client.get('/user')).rejects.toMatchObject({
          statusCode: 401,
          code: 'UNAUTHORIZED',
        });
      });

      it('should throw WaniKaniApiError on network failure', async () => {
        mockFetch.mockRejectedValueOnce(new Error('Connection failed'));

        await expect(client.get('/user')).rejects.toThrow(WaniKaniApiError);
        await mockFetch.mockRejectedValueOnce(new Error('Connection failed'));
        await expect(client.get('/user')).rejects.toMatchObject({
          code: 'NETWORK_ERROR',
        });
      });
    });

    describe('getUser', () => {
      it('should fetch user data', async () => {
        const mockUser = {
          object: 'user',
          url: 'https://api.wanikani.com/v2/user',
          data_updated_at: '2024-01-01T00:00:00.000000Z',
          data: {
            id: '12345',
            username: 'testuser',
            level: 10,
          },
        };

        mockFetch.mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: async () => mockUser,
        });

        const result = await client.getUser();

        expect(result).toEqual(mockUser);
        expect(mockFetch).toHaveBeenCalledWith(
          'https://api.wanikani.com/v2/user',
          expect.any(Object),
        );
      });
    });

    describe('setApiKey', () => {
      it('should update the API key', async () => {
        mockFetch.mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: async () => ({}),
        });

        client.setApiKey('new-api-key');
        await client.get('/test');

        expect(mockFetch).toHaveBeenCalledWith(
          expect.any(String),
          expect.objectContaining({
            headers: expect.objectContaining({
              Authorization: 'Bearer new-api-key',
            }),
          }),
        );
      });
    });
  });
});
