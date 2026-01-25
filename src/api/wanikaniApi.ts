import type { User, ApiErrorCode, ApiErrorDetails } from './types';

const WANIKANI_API_BASE = 'https://api.wanikani.com/v2';
const WANIKANI_REVISION = '20170710';

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
// API Client
// ============================================

export class WaniKaniClient {
  private apiKey: string;
  private baseUrl: string;
  private revision: string;

  constructor(apiKey: string) {
    this.apiKey = apiKey;
    this.baseUrl = WANIKANI_API_BASE;
    this.revision = WANIKANI_REVISION;
  }

  private getHeaders(): Record<string, string> {
    return {
      'Wanikani-Revision': this.revision,
      'Authorization': `Bearer ${this.apiKey}`,
      'Content-Type': 'application/json',
    };
  }

  /**
   * Makes a GET request to the WaniKani API
   */
  async get<T>(endpoint: string): Promise<T> {
    const url = endpoint.startsWith('http')
      ? endpoint
      : `${this.baseUrl}${endpoint}`;

    try {
      const response = await fetch(url, {
        method: 'GET',
        headers: this.getHeaders(),
      });

      if (!response.ok) {
        throw WaniKaniApiError.fromHttpStatus(response.status);
      }

      return await response.json() as T;
    } catch (error) {
      if (error instanceof WaniKaniApiError) {
        throw error;
      }
      throw WaniKaniApiError.networkError(
        error instanceof Error ? error : undefined,
      );
    }
  }

  /**
   * Gets the current user information
   */
  async getUser(): Promise<User> {
    return this.get<User>('/user');
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
  const client = new WaniKaniClient(apiKey);

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
