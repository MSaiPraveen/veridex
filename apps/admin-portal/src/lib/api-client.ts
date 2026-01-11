/**
 * Admin API Client
 * 
 * Centralized API client for the Admin Portal.
 * Handles authentication, error handling, and request/response formatting.
 * 
 * IMPORTANT: Uses the same token storage as admin-api.ts
 */

import { getAdminAccessToken } from './admin-api';

// ===================
// Types
// ===================

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: unknown;
  };
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  hasMore: boolean;
}

export interface ApiClientOptions {
  baseUrl?: string;
  getToken?: () => string | null;
  onUnauthorized?: () => void;
  onError?: (error: Error) => void;
}

// ===================
// API Client
// ===================

class AdminApiClient {
  private baseUrl: string;
  private getToken: () => string | null;
  private onUnauthorized: () => void;
  private onError: (error: Error) => void;

  constructor(options: ApiClientOptions = {}) {
    this.baseUrl = options.baseUrl || process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3002';
    // Use the unified token getter from admin-api.ts
    this.getToken = options.getToken || (() => getAdminAccessToken());
    // Don't force redirect on 401 - let auth context handle it
    this.onUnauthorized = options.onUnauthorized || (() => {
      console.warn('[Admin API] Unauthorized request - auth context will handle redirect');
    });
    this.onError = options.onError || ((error) => {
      console.error('[Admin API Error]', error);
    });
  }

  private async request<T>(
    method: string,
    endpoint: string,
    options: {
      body?: unknown;
      params?: Record<string, string | number | boolean | undefined>;
      headers?: Record<string, string>;
    } = {}
  ): Promise<ApiResponse<T>> {
    const { body, params, headers = {} } = options;

    // Build URL with query params
    let url = `${this.baseUrl}${endpoint}`;
    if (params) {
      const searchParams = new URLSearchParams();
      for (const [key, value] of Object.entries(params)) {
        if (value !== undefined && value !== null && value !== '') {
          searchParams.append(key, String(value));
        }
      }
      const queryString = searchParams.toString();
      if (queryString) {
        url += `?${queryString}`;
      }
    }

    // Build headers
    const requestHeaders: Record<string, string> = {
      'Content-Type': 'application/json',
      'X-Admin-Portal': 'true',
      ...headers,
    };

    const token = this.getToken();
    if (token) {
      requestHeaders['Authorization'] = `Bearer ${token}`;
    }

    try {
      const response = await fetch(url, {
        method,
        headers: requestHeaders,
        body: body ? JSON.stringify(body) : undefined,
        credentials: 'include',
      });

      // Handle unauthorized
      if (response.status === 401) {
        this.onUnauthorized();
        return {
          success: false,
          error: { code: 'UNAUTHORIZED', message: 'Session expired' },
        };
      }

      const data = await response.json();

      // If response has success field, return as-is
      if ('success' in data) {
        return data as ApiResponse<T>;
      }

      // Wrap in standard format
      if (response.ok) {
        return { success: true, data: data as T };
      }

      return {
        success: false,
        error: data.error || { code: 'ERROR', message: data.message || 'Request failed' },
      };
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      this.onError(err);
      return {
        success: false,
        error: { code: 'NETWORK_ERROR', message: err.message },
      };
    }
  }

  // HTTP method shortcuts
  async get<T>(endpoint: string, params?: Record<string, string | number | boolean | undefined>): Promise<ApiResponse<T>> {
    return this.request<T>('GET', endpoint, { params });
  }

  async post<T>(endpoint: string, body?: unknown): Promise<ApiResponse<T>> {
    return this.request<T>('POST', endpoint, { body });
  }

  async put<T>(endpoint: string, body?: unknown): Promise<ApiResponse<T>> {
    return this.request<T>('PUT', endpoint, { body });
  }

  async patch<T>(endpoint: string, body?: unknown): Promise<ApiResponse<T>> {
    return this.request<T>('PATCH', endpoint, { body });
  }

  async delete<T>(endpoint: string): Promise<ApiResponse<T>> {
    return this.request<T>('DELETE', endpoint);
  }
}

// Singleton instance
export const adminApi = new AdminApiClient();

// Export class for custom instances
export { AdminApiClient };
