import { buildUrl, buildDynamicUrl } from '../config/apiConfig';

// Types for API responses
export interface ApiResponse<T> {
  data: T;
  message?: string;
  success: boolean;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

// API Error class
export class ApiError extends Error {
  constructor(
    message: string,
    public statusCode: number,
    public response?: any
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

// Get auth token from localStorage OR cookie (hybrid approach with fallback)
const getAuthToken = (): string | null => {
  // Try localStorage first
  try {
    const localToken = localStorage.getItem('token');
    if (localToken) {

      return localToken;
    }
  } catch (error) {
    console.warn('⚠️ localStorage blocked, trying cookie fallback');
  }

  // Fallback to cookie if localStorage failed
  const cookieToken = document.cookie
    .split('; ')
    .find(row => row.startsWith('auth_token='))
    ?.split('=')[1];

  if (cookieToken) {
    console.log('🍪 Using token from cookie');
    return cookieToken;
  }

  console.warn('❌ No token found in localStorage or cookies');
  return null;
};

// Helper to get headers with auth
const getHeaders = (includeAuth = true): HeadersInit => {
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
  };

  if (includeAuth) {
    const token = getAuthToken();
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
  }

  return headers;
};

// Generic fetch wrapper with error handling
async function fetchApi<T>(
  endpoint: string,
  options: RequestInit = {},
  includeAuth = true,
  baseUrl?: string
): Promise<T> {
  const url = baseUrl ? `${baseUrl}${endpoint}` : buildUrl(endpoint);

  const config: RequestInit = {
    ...options,
    headers: {
      ...getHeaders(includeAuth),
      ...options.headers,
    },
    credentials: 'include', // ✅ Always send cookies with requests
  };

  try {
    const response = await fetch(url, config);

    // Handle non-JSON responses
    const contentType = response.headers.get('content-type');
    if (!contentType || !contentType.includes('application/json')) {
      if (!response.ok) {
        throw new ApiError(
          `HTTP Error: ${response.status} ${response.statusText}`,
          response.status
        );
      }
      return response.text() as unknown as T;
    }

    const data = await response.json();

    if (!response.ok) {
      throw new ApiError(
        data.message || `HTTP Error: ${response.status}`,
        response.status,
        data
      );
    }

    return data;
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }
    if (error instanceof TypeError && error.message === 'Failed to fetch') {
      throw new ApiError('Network error: Unable to connect to server', 0);
    }
    throw new ApiError(`Unexpected error: ${error}`, 0);
  }
}

// API Client methods
export const apiClient = {
  // GET request
  get: <T>(endpoint: string, includeAuth = true): Promise<T> => {
    console.log(`🌐 GET ${buildUrl(endpoint)}`);
    return fetchApi<T>(endpoint, { method: 'GET' }, includeAuth);
  },

  // POST request
  post: <T>(endpoint: string, body: any, includeAuth = true): Promise<T> => {
    console.log(`🌐 POST ${buildUrl(endpoint)}`, body);
    return fetchApi<T>(
      endpoint,
      {
        method: 'POST',
        body: JSON.stringify(body),
      },
      includeAuth
    );
  },

  // PUT request
  put: <T>(endpoint: string, body: any, includeAuth = true): Promise<T> => {
    return fetchApi<T>(
      endpoint,
      {
        method: 'PUT',
        body: JSON.stringify(body),
      },
      includeAuth
    );
  },

  // PATCH request
  patch: <T>(endpoint: string, body: any, includeAuth = true): Promise<T> => {
    return fetchApi<T>(
      endpoint,
      {
        method: 'PATCH',
        body: JSON.stringify(body),
      },
      includeAuth
    );
  },

  // DELETE request
  delete: <T>(endpoint: string, includeAuth = true): Promise<T> => {
    return fetchApi<T>(endpoint, { method: 'DELETE' }, includeAuth);
  },

  // POST with FormData (for file uploads) - uses direct fetch to avoid Content-Type override
  postFormData: async <T>(endpoint: string, formData: FormData, includeAuth = true): Promise<T> => {
    const url = buildUrl(endpoint);
    console.log(`🌐 POST FormData ${url}`);

    const headers: HeadersInit = {};
    // Get token if auth is needed
    if (includeAuth) {
      const token = (() => {
        try {
          const localToken = localStorage.getItem('token');
          if (localToken) return localToken;
        } catch { /* localStorage blocked */ }
        return document.cookie
          .split('; ')
          .find(row => row.startsWith('auth_token='))
          ?.split('=')[1] || null;
      })();
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }
    }
    // Note: Do NOT set Content-Type header - browser will auto-set multipart/form-data with boundary

    try {
      const response = await fetch(url, {
        method: 'POST',
        body: formData,
        headers,
        credentials: 'include',
      });

      const contentType = response.headers.get('content-type');
      let data: any;
      if (contentType?.includes('application/json')) {
        data = await response.json();
      } else {
        data = await response.text();
      }

      if (!response.ok) {
        throw new ApiError(
          data?.message || `HTTP Error: ${response.status}`,
          response.status,
          data
        );
      }

      return data as T;
    } catch (error) {
      if (error instanceof ApiError) {
        throw error;
      }
      if (error instanceof TypeError && error.message === 'Failed to fetch') {
        throw new ApiError('Network error: Unable to connect to server', 0);
      }
      throw new ApiError(`Unexpected error: ${error}`, 0);
    }
  },

  // Helper for dynamic endpoints
  getById: <T>(endpointTemplate: string, id: string, includeAuth = true): Promise<T> => {
    const endpoint = endpointTemplate.replace(':id', id);
    return fetchApi<T>(endpoint, { method: 'GET' }, includeAuth);
  },

  deleteById: <T>(endpointTemplate: string, id: string, includeAuth = true): Promise<T> => {
    const endpoint = endpointTemplate.replace(':id', id);
    return fetchApi<T>(endpoint, { method: 'DELETE' }, includeAuth);
  },
};

// Utility to check if user is authenticated
export const isAuthenticated = (): boolean => {
  return !!getAuthToken();
};

// Utility to logout (clear token)
export const logout = (): void => {
  try {
    localStorage.removeItem('token');
    localStorage.removeItem('userRole');
    localStorage.removeItem('user');
  } catch (error) {
    console.warn('⚠️ localStorage access denied during logout:', error);
  }
};

export default apiClient;
