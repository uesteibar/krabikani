import type {
  User,
  ApiErrorCode,
  ApiErrorDetails,
  Summary,
  Subject,
  Assignment,
  CreateReviewResponse,
  CreateReviewParams,
  WaniKaniCollection,
  SubjectData,
  AssignmentData,
  StudyMaterial,
  StudyMaterialData,
  CreateStudyMaterialParams,
  UpdateStudyMaterialParams,
} from './types';

const WANIKANI_API_BASE = 'https://api.wanikani.com/v2';
const WANIKANI_REVISION = '20170710';

// Retry configuration
const DEFAULT_MAX_RETRIES = 3;
const INITIAL_RETRY_DELAY_MS = 1000;

// Type alias for collections
export type SubjectCollection = WaniKaniCollection<SubjectData>;
export type AssignmentCollection = WaniKaniCollection<AssignmentData>;
export type StudyMaterialCollection = WaniKaniCollection<StudyMaterialData>;

// ============================================
// Error Handling
// ============================================

export class WaniKaniApiError extends Error {
  public readonly code: ApiErrorCode;
  public readonly statusCode: number;
  public readonly retryable: boolean;

  constructor(details: ApiErrorDetails) {
    super(details.message);
    this.name = 'WaniKaniApiError';
    this.code = details.code;
    this.statusCode = details.statusCode;
    this.retryable = details.retryable;
  }

  static fromHttpStatus(status: number): WaniKaniApiError {
    const details = getErrorDetailsForStatus(status);
    return new WaniKaniApiError(details);
  }

  static networkError(originalError?: Error): WaniKaniApiError {
    return new WaniKaniApiError({
      code: 'NETWORK_ERROR',
      statusCode: 0,
      message: originalError?.message || 'Network error. Please check your internet connection.',
      retryable: true,
    });
  }
}

function getErrorDetailsForStatus(status: number): ApiErrorDetails {
  switch (status) {
    case 401:
      return {
        code: 'UNAUTHORIZED',
        statusCode: 401,
        message: 'Invalid API key',
        retryable: false,
      };
    case 403:
      return {
        code: 'FORBIDDEN',
        statusCode: 403,
        message: 'API key does not have required permissions',
        retryable: false,
      };
    case 404:
      return {
        code: 'NOT_FOUND',
        statusCode: 404,
        message: 'Resource not found',
        retryable: false,
      };
    case 422:
      return {
        code: 'UNPROCESSABLE_ENTITY',
        statusCode: 422,
        message: 'Invalid request data',
        retryable: false,
      };
    case 429:
      return {
        code: 'TOO_MANY_REQUESTS',
        statusCode: 429,
        message: 'Too many requests. Please wait and try again.',
        retryable: true,
      };
    case 500:
      return {
        code: 'INTERNAL_SERVER_ERROR',
        statusCode: 500,
        message: 'Server error. Please try again later.',
        retryable: true,
      };
    case 503:
      return {
        code: 'SERVICE_UNAVAILABLE',
        statusCode: 503,
        message: 'Service temporarily unavailable. Please try again later.',
        retryable: true,
      };
    default:
      if (status >= 500) {
        return {
          code: 'INTERNAL_SERVER_ERROR',
          statusCode: status,
          message: 'Server error. Please try again later.',
          retryable: true,
        };
      }
      return {
        code: 'UNKNOWN_ERROR',
        statusCode: status,
        message: 'An unexpected error occurred. Please try again.',
        retryable: false,
      };
  }
}

// ============================================
// Helpers
// ============================================

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function buildQueryString(params: Record<string, string | undefined>): string {
  const parts: string[] = [];
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined) {
      parts.push(`${encodeURIComponent(key)}=${encodeURIComponent(value)}`);
    }
  }
  return parts.join('&');
}

// ============================================
// API Client
// ============================================

export interface RetryOptions {
  maxRetries?: number;
  initialDelayMs?: number;
}

export class WaniKaniClient {
  private apiKey: string;
  private baseUrl: string;
  private revision: string;
  private maxRetries: number;
  private initialDelayMs: number;

  constructor(apiKey: string, options?: RetryOptions) {
    this.apiKey = apiKey;
    this.baseUrl = WANIKANI_API_BASE;
    this.revision = WANIKANI_REVISION;
    this.maxRetries = options?.maxRetries ?? DEFAULT_MAX_RETRIES;
    this.initialDelayMs = options?.initialDelayMs ?? INITIAL_RETRY_DELAY_MS;
  }

  private getHeaders(): Record<string, string> {
    return {
      'Wanikani-Revision': this.revision,
      'Authorization': `Bearer ${this.apiKey}`,
      'Content-Type': 'application/json',
    };
  }

  private buildUrl(endpoint: string): string {
    return endpoint.startsWith('http')
      ? endpoint
      : `${this.baseUrl}${endpoint}`;
  }

  /**
   * Executes a request with exponential backoff retry for transient failures
   */
  private async executeWithRetry<T>(
    requestFn: () => Promise<Response>,
  ): Promise<T> {
    let lastError: WaniKaniApiError | null = null;

    for (let attempt = 0; attempt <= this.maxRetries; attempt++) {
      try {
        const response = await requestFn();

        if (!response.ok) {
          const error = WaniKaniApiError.fromHttpStatus(response.status);
          if (error.retryable && attempt < this.maxRetries) {
            lastError = error;
            const delay = this.initialDelayMs * Math.pow(2, attempt);
            await sleep(delay);
            continue;
          }
          throw error;
        }

        return (await response.json()) as T;
      } catch (error) {
        if (error instanceof WaniKaniApiError) {
          if (error.retryable && attempt < this.maxRetries) {
            lastError = error;
            const delay = this.initialDelayMs * Math.pow(2, attempt);
            await sleep(delay);
            continue;
          }
          throw error;
        }

        const networkError = WaniKaniApiError.networkError(
          error instanceof Error ? error : undefined,
        );
        if (attempt < this.maxRetries) {
          lastError = networkError;
          const delay = this.initialDelayMs * Math.pow(2, attempt);
          await sleep(delay);
          continue;
        }
        throw networkError;
      }
    }

    // This should not be reached, but just in case
    throw lastError || WaniKaniApiError.networkError();
  }

  /**
   * Makes a GET request to the WaniKani API
   */
  async get<T>(endpoint: string): Promise<T> {
    const url = this.buildUrl(endpoint);
    return this.executeWithRetry<T>(() =>
      fetch(url, {
        method: 'GET',
        headers: this.getHeaders(),
      }),
    );
  }

  /**
   * Makes a POST request to the WaniKani API
   */
  async post<T>(endpoint: string, body: unknown): Promise<T> {
    const url = this.buildUrl(endpoint);
    return this.executeWithRetry<T>(() =>
      fetch(url, {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify(body),
      }),
    );
  }

  /**
   * Makes a PUT request to the WaniKani API
   */
  async put<T>(endpoint: string, body?: unknown): Promise<T> {
    const url = this.buildUrl(endpoint);
    return this.executeWithRetry<T>(() =>
      fetch(url, {
        method: 'PUT',
        headers: this.getHeaders(),
        body: body ? JSON.stringify(body) : undefined,
      }),
    );
  }

  /**
   * Gets the current user information
   */
  async getUser(): Promise<User> {
    return this.get<User>('/user');
  }

  /**
   * Gets the summary of available lessons and reviews
   */
  async getSummary(): Promise<Summary> {
    return this.get<Summary>('/summary');
  }

  /**
   * Gets subjects with optional filters
   */
  async getSubjects(params?: {
    ids?: number[];
    types?: ('radical' | 'kanji' | 'vocabulary' | 'kana_vocabulary')[];
    slugs?: string[];
    levels?: number[];
    hidden?: boolean;
    updated_after?: string;
  }): Promise<SubjectCollection> {
    const queryParams: Record<string, string | undefined> = {
      ids: params?.ids?.length ? params.ids.join(',') : undefined,
      types: params?.types?.length ? params.types.join(',') : undefined,
      slugs: params?.slugs?.length ? params.slugs.join(',') : undefined,
      levels: params?.levels?.length ? params.levels.join(',') : undefined,
      hidden: params?.hidden !== undefined ? String(params.hidden) : undefined,
      updated_after: params?.updated_after,
    };

    const queryString = buildQueryString(queryParams);
    const endpoint = queryString ? `/subjects?${queryString}` : '/subjects';
    return this.get<SubjectCollection>(endpoint);
  }

  /**
   * Gets a single subject by ID
   */
  async getSubject(id: number): Promise<Subject> {
    return this.get<Subject>(`/subjects/${id}`);
  }

  /**
   * Gets assignments with optional filters
   */
  async getAssignments(params?: {
    ids?: number[];
    subject_ids?: number[];
    subject_types?: ('radical' | 'kanji' | 'vocabulary' | 'kana_vocabulary')[];
    levels?: number[];
    available_before?: string;
    available_after?: string;
    srs_stages?: number[];
    unlocked?: boolean;
    started?: boolean;
    passed?: boolean;
    burned?: boolean;
    resurrected?: boolean;
    hidden?: boolean;
    updated_after?: string;
    immediately_available_for_lessons?: boolean;
    immediately_available_for_review?: boolean;
    in_review?: boolean;
  }): Promise<AssignmentCollection> {
    const queryParams: Record<string, string | undefined> = {
      ids: params?.ids?.length ? params.ids.join(',') : undefined,
      subject_ids: params?.subject_ids?.length
        ? params.subject_ids.join(',')
        : undefined,
      subject_types: params?.subject_types?.length
        ? params.subject_types.join(',')
        : undefined,
      levels: params?.levels?.length ? params.levels.join(',') : undefined,
      available_before: params?.available_before,
      available_after: params?.available_after,
      srs_stages: params?.srs_stages?.length
        ? params.srs_stages.join(',')
        : undefined,
      unlocked:
        params?.unlocked !== undefined ? String(params.unlocked) : undefined,
      started:
        params?.started !== undefined ? String(params.started) : undefined,
      passed: params?.passed !== undefined ? String(params.passed) : undefined,
      burned: params?.burned !== undefined ? String(params.burned) : undefined,
      resurrected:
        params?.resurrected !== undefined
          ? String(params.resurrected)
          : undefined,
      hidden: params?.hidden !== undefined ? String(params.hidden) : undefined,
      updated_after: params?.updated_after,
      immediately_available_for_lessons:
        params?.immediately_available_for_lessons !== undefined
          ? String(params.immediately_available_for_lessons)
          : undefined,
      immediately_available_for_review:
        params?.immediately_available_for_review !== undefined
          ? String(params.immediately_available_for_review)
          : undefined,
      in_review:
        params?.in_review !== undefined ? String(params.in_review) : undefined,
    };

    const queryString = buildQueryString(queryParams);
    const endpoint = queryString
      ? `/assignments?${queryString}`
      : '/assignments';
    return this.get<AssignmentCollection>(endpoint);
  }

  /**
   * Gets a single assignment by ID
   */
  async getAssignment(id: number): Promise<Assignment> {
    return this.get<Assignment>(`/assignments/${id}`);
  }

  /**
   * Starts an assignment (marks lesson as completed)
   */
  async startAssignment(
    id: number,
    params?: { started_at?: string },
  ): Promise<Assignment> {
    return this.put<Assignment>(`/assignments/${id}/start`, params);
  }

  /**
   * Creates a review for an assignment
   */
  async createReview(params: CreateReviewParams): Promise<CreateReviewResponse> {
    return this.post<CreateReviewResponse>('/reviews', { review: params });
  }

  /**
   * Gets study materials with optional filters
   */
  async getStudyMaterials(params?: {
    ids?: number[];
    subject_ids?: number[];
    subject_types?: ('radical' | 'kanji' | 'vocabulary' | 'kana_vocabulary')[];
    hidden?: boolean;
    updated_after?: string;
  }): Promise<StudyMaterialCollection> {
    const queryParams: Record<string, string | undefined> = {
      ids: params?.ids?.length ? params.ids.join(',') : undefined,
      subject_ids: params?.subject_ids?.length
        ? params.subject_ids.join(',')
        : undefined,
      subject_types: params?.subject_types?.length
        ? params.subject_types.join(',')
        : undefined,
      hidden: params?.hidden !== undefined ? String(params.hidden) : undefined,
      updated_after: params?.updated_after,
    };

    const queryString = buildQueryString(queryParams);
    const endpoint = queryString
      ? `/study_materials?${queryString}`
      : '/study_materials';
    return this.get<StudyMaterialCollection>(endpoint);
  }

  /**
   * Gets a single study material by ID
   */
  async getStudyMaterial(id: number): Promise<StudyMaterial> {
    return this.get<StudyMaterial>(`/study_materials/${id}`);
  }

  /**
   * Creates a study material for a subject
   */
  async createStudyMaterial(params: CreateStudyMaterialParams): Promise<StudyMaterial> {
    return this.post<StudyMaterial>('/study_materials', { study_material: params });
  }

  /**
   * Updates an existing study material
   */
  async updateStudyMaterial(
    id: number,
    params: UpdateStudyMaterialParams,
  ): Promise<StudyMaterial> {
    return this.put<StudyMaterial>(`/study_materials/${id}`, { study_material: params });
  }

  /**
   * Fetches the next page of a paginated collection
   */
  async getNextPage<T>(collection: WaniKaniCollection<T>): Promise<WaniKaniCollection<T> | null> {
    const nextUrl = collection.pages.next_url;
    if (!nextUrl) {
      return null;
    }
    return this.get<WaniKaniCollection<T>>(nextUrl);
  }

  /**
   * Updates the API key used by this client
   */
  setApiKey(apiKey: string): void {
    this.apiKey = apiKey;
  }
}

// ============================================
// Legacy Support (for existing validateApiKey usage)
// ============================================

export interface WaniKaniUser {
  id: number;
  username: string;
  level: number;
}

export interface WaniKaniUserResponse {
  object: string;
  url: string;
  data_updated_at: string;
  data: WaniKaniUser;
}

export interface ValidationResult {
  success: boolean;
  user?: WaniKaniUser;
  error?: string;
}

/**
 * Validates a WaniKani API key by making a test request to the /user endpoint.
 * @param apiKey The WaniKani API key to validate
 * @returns ValidationResult with success status and user data or error message
 */
export async function validateApiKey(apiKey: string): Promise<ValidationResult> {
  // Use no retries for validation - we want fast feedback on invalid keys
  const client = new WaniKaniClient(apiKey, { maxRetries: 0 });

  try {
    const userResponse = await client.getUser();
    const userData = userResponse.data;

    return {
      success: true,
      user: {
        id: parseInt(userData.id, 10),
        username: userData.username,
        level: userData.level,
      },
    };
  } catch (error) {
    if (error instanceof WaniKaniApiError) {
      return {
        success: false,
        error: error.message,
      };
    }
    return {
      success: false,
      error: 'Network error. Please check your internet connection.',
    };
  }
}
