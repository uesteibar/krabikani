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
      // Use no retries for basic tests to keep them fast and deterministic
      client = new WaniKaniClient('test-api-key', { maxRetries: 0 });
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

    describe('getSummary', () => {
      it('should fetch summary data', async () => {
        const mockSummary = {
          object: 'report',
          url: 'https://api.wanikani.com/v2/summary',
          data_updated_at: '2024-01-01T00:00:00.000000Z',
          data: {
            lessons: [
              {
                available_at: '2024-01-01T00:00:00.000000Z',
                subject_ids: [1, 2, 3],
              },
            ],
            next_reviews_at: '2024-01-01T01:00:00.000000Z',
            reviews: [
              {
                available_at: '2024-01-01T00:00:00.000000Z',
                subject_ids: [4, 5, 6],
              },
            ],
          },
        };

        mockFetch.mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: async () => mockSummary,
        });

        const result = await client.getSummary();

        expect(result).toEqual(mockSummary);
        expect(mockFetch).toHaveBeenCalledWith(
          'https://api.wanikani.com/v2/summary',
          expect.any(Object),
        );
      });
    });

    describe('getSubjects', () => {
      it('should fetch subjects without filters', async () => {
        const mockSubjects = {
          object: 'collection',
          url: 'https://api.wanikani.com/v2/subjects',
          pages: {
            per_page: 500,
            next_url: null,
            previous_url: null,
          },
          total_count: 2,
          data_updated_at: '2024-01-01T00:00:00.000000Z',
          data: [
            { id: 1, object: 'radical', data: {} },
            { id: 2, object: 'kanji', data: {} },
          ],
        };

        mockFetch.mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: async () => mockSubjects,
        });

        const result = await client.getSubjects();

        expect(result).toEqual(mockSubjects);
        expect(mockFetch).toHaveBeenCalledWith(
          'https://api.wanikani.com/v2/subjects',
          expect.any(Object),
        );
      });

      it('should fetch subjects with filters', async () => {
        mockFetch.mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: async () => ({ data: [] }),
        });

        await client.getSubjects({
          ids: [1, 2, 3],
          types: ['radical', 'kanji'],
          levels: [1, 2],
          hidden: false,
          updated_after: '2024-01-01T00:00:00.000000Z',
        });

        expect(mockFetch).toHaveBeenCalledWith(
          expect.stringContaining('/subjects?'),
          expect.any(Object),
        );
        const calledUrl = mockFetch.mock.calls[0][0] as string;
        expect(calledUrl).toContain('ids=1%2C2%2C3');
        expect(calledUrl).toContain('types=radical%2Ckanji');
        expect(calledUrl).toContain('levels=1%2C2');
        expect(calledUrl).toContain('hidden=false');
        expect(calledUrl).toContain('updated_after=2024-01-01T00%3A00%3A00.000000Z');
      });

      it('should fetch a single subject by ID', async () => {
        const mockSubject = {
          id: 1,
          object: 'radical',
          data: { characters: '一' },
        };

        mockFetch.mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: async () => mockSubject,
        });

        const result = await client.getSubject(1);

        expect(result).toEqual(mockSubject);
        expect(mockFetch).toHaveBeenCalledWith(
          'https://api.wanikani.com/v2/subjects/1',
          expect.any(Object),
        );
      });
    });

    describe('getAssignments', () => {
      it('should fetch assignments without filters', async () => {
        const mockAssignments = {
          object: 'collection',
          url: 'https://api.wanikani.com/v2/assignments',
          pages: {
            per_page: 500,
            next_url: null,
            previous_url: null,
          },
          total_count: 1,
          data_updated_at: '2024-01-01T00:00:00.000000Z',
          data: [{ id: 1, object: 'assignment', data: { subject_id: 1 } }],
        };

        mockFetch.mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: async () => mockAssignments,
        });

        const result = await client.getAssignments();

        expect(result).toEqual(mockAssignments);
        expect(mockFetch).toHaveBeenCalledWith(
          'https://api.wanikani.com/v2/assignments',
          expect.any(Object),
        );
      });

      it('should fetch assignments with filters', async () => {
        mockFetch.mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: async () => ({ data: [] }),
        });

        await client.getAssignments({
          subject_ids: [1, 2],
          srs_stages: [1, 2, 3],
          immediately_available_for_review: true,
          burned: false,
        });

        expect(mockFetch).toHaveBeenCalledWith(
          expect.stringContaining('/assignments?'),
          expect.any(Object),
        );
        const calledUrl = mockFetch.mock.calls[0][0] as string;
        expect(calledUrl).toContain('subject_ids=1%2C2');
        expect(calledUrl).toContain('srs_stages=1%2C2%2C3');
        expect(calledUrl).toContain('immediately_available_for_review=true');
        expect(calledUrl).toContain('burned=false');
      });

      it('should fetch a single assignment by ID', async () => {
        const mockAssignment = {
          id: 1,
          object: 'assignment',
          data: { subject_id: 1, srs_stage: 1 },
        };

        mockFetch.mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: async () => mockAssignment,
        });

        const result = await client.getAssignment(1);

        expect(result).toEqual(mockAssignment);
        expect(mockFetch).toHaveBeenCalledWith(
          'https://api.wanikani.com/v2/assignments/1',
          expect.any(Object),
        );
      });
    });

    describe('startAssignment', () => {
      it('should start an assignment', async () => {
        const mockAssignment = {
          id: 1,
          object: 'assignment',
          data: {
            subject_id: 1,
            srs_stage: 1,
            started_at: '2024-01-01T00:00:00.000000Z',
          },
        };

        mockFetch.mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: async () => mockAssignment,
        });

        const result = await client.startAssignment(1);

        expect(result).toEqual(mockAssignment);
        expect(mockFetch).toHaveBeenCalledWith(
          'https://api.wanikani.com/v2/assignments/1/start',
          expect.objectContaining({
            method: 'PUT',
          }),
        );
      });

      it('should start an assignment with custom started_at', async () => {
        mockFetch.mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: async () => ({ id: 1 }),
        });

        await client.startAssignment(1, {
          started_at: '2024-01-01T00:00:00.000000Z',
        });

        expect(mockFetch).toHaveBeenCalledWith(
          'https://api.wanikani.com/v2/assignments/1/start',
          expect.objectContaining({
            method: 'PUT',
            body: JSON.stringify({
              started_at: '2024-01-01T00:00:00.000000Z',
            }),
          }),
        );
      });
    });

    describe('createReview', () => {
      it('should create a review with assignment_id', async () => {
        const mockResponse = {
          id: 1,
          object: 'review',
          url: 'https://api.wanikani.com/v2/reviews/1',
          data_updated_at: '2024-01-01T00:00:00.000000Z',
          data: {
            assignment_id: 123,
            created_at: '2024-01-01T00:00:00.000000Z',
            ending_srs_stage: 2,
            incorrect_meaning_answers: 0,
            incorrect_reading_answers: 1,
            spaced_repetition_system_id: 1,
            starting_srs_stage: 1,
            subject_id: 456,
          },
          resources_updated: {
            assignment: { id: 123, object: 'assignment', data: {} },
            review_statistic: { id: 789, object: 'review_statistic', data: {} },
          },
        };

        mockFetch.mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: async () => mockResponse,
        });

        const result = await client.createReview({
          assignment_id: 123,
          incorrect_meaning_answers: 0,
          incorrect_reading_answers: 1,
        });

        expect(result).toEqual(mockResponse);
        expect(mockFetch).toHaveBeenCalledWith(
          'https://api.wanikani.com/v2/reviews',
          expect.objectContaining({
            method: 'POST',
            body: JSON.stringify({
              review: {
                assignment_id: 123,
                incorrect_meaning_answers: 0,
                incorrect_reading_answers: 1,
              },
            }),
          }),
        );
      });

      it('should create a review with subject_id', async () => {
        mockFetch.mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: async () => ({ id: 1 }),
        });

        await client.createReview({
          subject_id: 456,
          incorrect_meaning_answers: 2,
          incorrect_reading_answers: 0,
        });

        expect(mockFetch).toHaveBeenCalledWith(
          'https://api.wanikani.com/v2/reviews',
          expect.objectContaining({
            body: JSON.stringify({
              review: {
                subject_id: 456,
                incorrect_meaning_answers: 2,
                incorrect_reading_answers: 0,
              },
            }),
          }),
        );
      });
    });

    describe('getStudyMaterials', () => {
      it('should fetch study materials without filters', async () => {
        const mockStudyMaterials = {
          object: 'collection',
          url: 'https://api.wanikani.com/v2/study_materials',
          pages: {
            per_page: 500,
            next_url: null,
            previous_url: null,
          },
          total_count: 1,
          data_updated_at: '2024-01-01T00:00:00.000000Z',
          data: [
            {
              id: 1,
              object: 'study_material',
              data: {
                subject_id: 1,
                meaning_synonyms: ['test'],
              },
            },
          ],
        };

        mockFetch.mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: async () => mockStudyMaterials,
        });

        const result = await client.getStudyMaterials();

        expect(result).toEqual(mockStudyMaterials);
        expect(mockFetch).toHaveBeenCalledWith(
          'https://api.wanikani.com/v2/study_materials',
          expect.any(Object),
        );
      });

      it('should fetch study materials with subject_ids filter', async () => {
        mockFetch.mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: async () => ({ data: [] }),
        });

        await client.getStudyMaterials({
          subject_ids: [1, 2, 3],
        });

        expect(mockFetch).toHaveBeenCalledWith(
          expect.stringContaining('/study_materials?'),
          expect.any(Object),
        );
        const calledUrl = mockFetch.mock.calls[0][0] as string;
        expect(calledUrl).toContain('subject_ids=1%2C2%2C3');
      });

      it('should fetch a single study material by ID', async () => {
        const mockStudyMaterial = {
          id: 1,
          object: 'study_material',
          data: {
            subject_id: 1,
            meaning_synonyms: ['test'],
          },
        };

        mockFetch.mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: async () => mockStudyMaterial,
        });

        const result = await client.getStudyMaterial(1);

        expect(result).toEqual(mockStudyMaterial);
        expect(mockFetch).toHaveBeenCalledWith(
          'https://api.wanikani.com/v2/study_materials/1',
          expect.any(Object),
        );
      });
    });

    describe('createStudyMaterial', () => {
      it('should create a study material', async () => {
        const mockResponse = {
          id: 1,
          object: 'study_material',
          url: 'https://api.wanikani.com/v2/study_materials/1',
          data_updated_at: '2024-01-01T00:00:00.000000Z',
          data: {
            created_at: '2024-01-01T00:00:00.000000Z',
            hidden: false,
            meaning_note: null,
            meaning_synonyms: ['synonym1', 'synonym2'],
            reading_note: null,
            subject_id: 42,
            subject_type: 'vocabulary',
          },
        };

        mockFetch.mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: async () => mockResponse,
        });

        const result = await client.createStudyMaterial({
          subject_id: 42,
          meaning_synonyms: ['synonym1', 'synonym2'],
        });

        expect(result).toEqual(mockResponse);
        expect(mockFetch).toHaveBeenCalledWith(
          'https://api.wanikani.com/v2/study_materials',
          expect.objectContaining({
            method: 'POST',
            body: JSON.stringify({
              study_material: {
                subject_id: 42,
                meaning_synonyms: ['synonym1', 'synonym2'],
              },
            }),
          }),
        );
      });
    });

    describe('updateStudyMaterial', () => {
      it('should update a study material', async () => {
        const mockResponse = {
          id: 1,
          object: 'study_material',
          url: 'https://api.wanikani.com/v2/study_materials/1',
          data_updated_at: '2024-01-01T00:00:00.000000Z',
          data: {
            created_at: '2024-01-01T00:00:00.000000Z',
            hidden: false,
            meaning_note: null,
            meaning_synonyms: ['synonym1', 'synonym2', 'synonym3'],
            reading_note: null,
            subject_id: 42,
            subject_type: 'vocabulary',
          },
        };

        mockFetch.mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: async () => mockResponse,
        });

        const result = await client.updateStudyMaterial(1, {
          meaning_synonyms: ['synonym1', 'synonym2', 'synonym3'],
        });

        expect(result).toEqual(mockResponse);
        expect(mockFetch).toHaveBeenCalledWith(
          'https://api.wanikani.com/v2/study_materials/1',
          expect.objectContaining({
            method: 'PUT',
            body: JSON.stringify({
              study_material: {
                meaning_synonyms: ['synonym1', 'synonym2', 'synonym3'],
              },
            }),
          }),
        );
      });
    });

    describe('getNextPage', () => {
      it('should fetch the next page of a collection', async () => {
        const nextPageData = {
          object: 'collection',
          url: 'https://api.wanikani.com/v2/subjects?page_after_id=100',
          pages: { per_page: 500, next_url: null, previous_url: null },
          total_count: 100,
          data_updated_at: '2024-01-01T00:00:00.000000Z',
          data: [],
        };

        mockFetch.mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: async () => nextPageData,
        });

        const collection = {
          object: 'collection' as const,
          url: 'https://api.wanikani.com/v2/subjects',
          pages: {
            per_page: 500,
            next_url: 'https://api.wanikani.com/v2/subjects?page_after_id=100',
            previous_url: null,
          },
          total_count: 100,
          data_updated_at: '2024-01-01T00:00:00.000000Z',
          data: [],
        };

        const result = await client.getNextPage(collection);

        expect(result).toEqual(nextPageData);
        expect(mockFetch).toHaveBeenCalledWith(
          'https://api.wanikani.com/v2/subjects?page_after_id=100',
          expect.any(Object),
        );
      });

      it('should return null when there is no next page', async () => {
        const collection = {
          object: 'collection' as const,
          url: 'https://api.wanikani.com/v2/subjects',
          pages: {
            per_page: 500,
            next_url: null,
            previous_url: null,
          },
          total_count: 100,
          data_updated_at: '2024-01-01T00:00:00.000000Z',
          data: [],
        };

        const result = await client.getNextPage(collection);

        expect(result).toBeNull();
        expect(mockFetch).not.toHaveBeenCalled();
      });
    });

    describe('retry logic', () => {
      it('should retry on 500 error with exponential backoff', async () => {
        // Using very small delays for testing
        const clientWithRetry = new WaniKaniClient('test-api-key', {
          maxRetries: 2,
          initialDelayMs: 10,
        });

        mockFetch
          .mockResolvedValueOnce({ ok: false, status: 500 })
          .mockResolvedValueOnce({ ok: false, status: 500 })
          .mockResolvedValueOnce({
            ok: true,
            status: 200,
            json: async () => ({ data: 'success' }),
          });

        const result = await clientWithRetry.get('/test');

        expect(result).toEqual({ data: 'success' });
        expect(mockFetch).toHaveBeenCalledTimes(3);
      });

      it('should retry on 429 (rate limit) error', async () => {
        const clientWithRetry = new WaniKaniClient('test-api-key', {
          maxRetries: 1,
          initialDelayMs: 10,
        });

        mockFetch
          .mockResolvedValueOnce({ ok: false, status: 429 })
          .mockResolvedValueOnce({
            ok: true,
            status: 200,
            json: async () => ({ data: 'success' }),
          });

        const result = await clientWithRetry.get('/test');

        expect(result).toEqual({ data: 'success' });
        expect(mockFetch).toHaveBeenCalledTimes(2);
      });

      it('should retry on network errors', async () => {
        const clientWithRetry = new WaniKaniClient('test-api-key', {
          maxRetries: 1,
          initialDelayMs: 10,
        });

        mockFetch
          .mockRejectedValueOnce(new Error('Network failed'))
          .mockResolvedValueOnce({
            ok: true,
            status: 200,
            json: async () => ({ data: 'success' }),
          });

        const result = await clientWithRetry.get('/test');

        expect(result).toEqual({ data: 'success' });
        expect(mockFetch).toHaveBeenCalledTimes(2);
      });

      it('should not retry on 401 (unauthorized)', async () => {
        const clientWithRetry = new WaniKaniClient('test-api-key', {
          maxRetries: 3,
          initialDelayMs: 10,
        });

        mockFetch.mockResolvedValueOnce({ ok: false, status: 401 });

        await expect(clientWithRetry.get('/test')).rejects.toMatchObject({
          code: 'UNAUTHORIZED',
          retryable: false,
        });

        expect(mockFetch).toHaveBeenCalledTimes(1);
      });

      it('should not retry on 404 (not found)', async () => {
        const clientWithRetry = new WaniKaniClient('test-api-key', {
          maxRetries: 3,
          initialDelayMs: 10,
        });

        mockFetch.mockResolvedValueOnce({ ok: false, status: 404 });

        await expect(clientWithRetry.get('/test')).rejects.toMatchObject({
          code: 'NOT_FOUND',
          retryable: false,
        });

        expect(mockFetch).toHaveBeenCalledTimes(1);
      });

      it('should throw after max retries exceeded', async () => {
        const clientWithRetry = new WaniKaniClient('test-api-key', {
          maxRetries: 2,
          initialDelayMs: 10,
        });

        mockFetch
          .mockResolvedValueOnce({ ok: false, status: 500 })
          .mockResolvedValueOnce({ ok: false, status: 500 })
          .mockResolvedValueOnce({ ok: false, status: 500 });

        await expect(clientWithRetry.get('/test')).rejects.toMatchObject({
          code: 'INTERNAL_SERVER_ERROR',
        });

        expect(mockFetch).toHaveBeenCalledTimes(3);
      });

      it('should apply exponential backoff pattern', async () => {
        // We verify the pattern by tracking time between retries
        const startTimes: number[] = [];
        const clientWithRetry = new WaniKaniClient('test-api-key', {
          maxRetries: 2,
          initialDelayMs: 50,
        });

        mockFetch.mockImplementation(() => {
          startTimes.push(Date.now());
          return Promise.resolve({ ok: false, status: 500 });
        });

        await expect(clientWithRetry.get('/test')).rejects.toThrow();

        // Verify we had 3 attempts (initial + 2 retries)
        expect(startTimes.length).toBe(3);

        // Second delay should be roughly 2x the first
        const delay1 = startTimes[1] - startTimes[0];
        const delay2 = startTimes[2] - startTimes[1];

        // Allow some tolerance for timing
        expect(delay1).toBeGreaterThanOrEqual(40);
        expect(delay1).toBeLessThan(150);
        expect(delay2).toBeGreaterThanOrEqual(90);
        expect(delay2).toBeLessThan(250);
      });

      it('should retry POST requests on transient failures', async () => {
        const clientWithRetry = new WaniKaniClient('test-api-key', {
          maxRetries: 1,
          initialDelayMs: 10,
        });

        mockFetch
          .mockResolvedValueOnce({ ok: false, status: 503 })
          .mockResolvedValueOnce({
            ok: true,
            status: 200,
            json: async () => ({ id: 1 }),
          });

        const result = await clientWithRetry.createReview({
          assignment_id: 123,
          incorrect_meaning_answers: 0,
          incorrect_reading_answers: 0,
        });

        expect(result).toEqual({ id: 1 });
        expect(mockFetch).toHaveBeenCalledTimes(2);
      });

      it('should retry PUT requests on transient failures', async () => {
        const clientWithRetry = new WaniKaniClient('test-api-key', {
          maxRetries: 1,
          initialDelayMs: 10,
        });

        mockFetch
          .mockRejectedValueOnce(new Error('Connection reset'))
          .mockResolvedValueOnce({
            ok: true,
            status: 200,
            json: async () => ({ id: 1 }),
          });

        const result = await clientWithRetry.startAssignment(123);

        expect(result).toEqual({ id: 1 });
        expect(mockFetch).toHaveBeenCalledTimes(2);
      });
    });
  });
});
