const WANIKANI_API_BASE = 'https://api.wanikani.com/v2';
const WANIKANI_REVISION = '20170710';

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

export class WaniKaniApiError extends Error {
  constructor(
    public statusCode: number,
    message: string,
  ) {
    super(message);
    this.name = 'WaniKaniApiError';
  }
}

function getHeaders(apiKey: string): Record<string, string> {
  return {
    'Wanikani-Revision': WANIKANI_REVISION,
    Authorization: `Bearer ${apiKey}`,
  };
}

function getErrorMessageForStatus(status: number): string {
  switch (status) {
    case 401:
      return 'Invalid API key';
    case 403:
      return 'API key does not have required permissions';
    case 429:
      return 'Too many requests. Please wait and try again.';
    case 500:
    case 502:
    case 503:
    case 504:
      return 'Server error. Please try again later.';
    default:
      return 'An unexpected error occurred. Please try again.';
  }
}

/**
 * Validates a WaniKani API key by making a test request to the /user endpoint.
 * @param apiKey The WaniKani API key to validate
 * @returns ValidationResult with success status and user data or error message
 */
export async function validateApiKey(apiKey: string): Promise<ValidationResult> {
  try {
    const response = await fetch(`${WANIKANI_API_BASE}/user`, {
      method: 'GET',
      headers: getHeaders(apiKey),
    });

    if (!response.ok) {
      return {
        success: false,
        error: getErrorMessageForStatus(response.status),
      };
    }

    const data: WaniKaniUserResponse = await response.json();
    return {
      success: true,
      user: data.data,
    };
  } catch {
    return {
      success: false,
      error: 'Network error. Please check your internet connection.',
    };
  }
}
