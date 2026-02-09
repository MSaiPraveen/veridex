/**
 * Admin-specific API client
 * 
 * Uses localStorage (persistent) + cookie for middleware.
 * This ensures tokens survive page refreshes and navigation.
 * 
 * IMPORTANT: All auth flows must use these functions for token management.
 */

const ADMIN_TOKEN_KEY = 'admin_access_token';
const ADMIN_REFRESH_KEY = 'admin_refresh_token';

// Admin portal API base URL - connects to API Gateway (port 3002 in Docker)
const API_BASE_URL = process.env.NEXT_PUBLIC_ADMIN_API_URL || 'http://localhost:3002';

/**
 * Store tokens in localStorage (persistent) and cookie (for middleware)
 */
export function setAdminTokens(accessToken: string, refreshToken: string) {
  if (typeof window !== 'undefined') {
    // Use localStorage for persistence across tabs and page refreshes
    localStorage.setItem(ADMIN_TOKEN_KEY, accessToken);
    localStorage.setItem(ADMIN_REFRESH_KEY, refreshToken);
    
    // Set cookie for middleware auth check (expires in 24h)
    // In production, add Secure flag
    const isSecure = window.location.protocol === 'https:';
    const secureFlag = isSecure ? '; Secure' : '';
    document.cookie = `${ADMIN_TOKEN_KEY}=${accessToken}; path=/; max-age=86400; SameSite=Strict${secureFlag}`;
  }
}

/**
 * Get access token from localStorage
 */
export function getAdminAccessToken(): string | null {
  if (typeof window !== 'undefined') {
    return localStorage.getItem(ADMIN_TOKEN_KEY);
  }
  return null;
}

/**
 * Get refresh token from localStorage
 */
export function getAdminRefreshToken(): string | null {
  if (typeof window !== 'undefined') {
    return localStorage.getItem(ADMIN_REFRESH_KEY);
  }
  return null;
}

/**
 * Clear all tokens from storage and cookie
 */
export function clearAdminTokens() {
  if (typeof window !== 'undefined') {
    localStorage.removeItem(ADMIN_TOKEN_KEY);
    localStorage.removeItem(ADMIN_REFRESH_KEY);
    document.cookie = `${ADMIN_TOKEN_KEY}=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT`;
  }
}

/**
 * Check if a valid token exists
 */
export function hasValidAdminToken(): boolean {
  return !!getAdminAccessToken();
}

interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
  };
}

type HttpMethod = 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';

async function request<T>(
  method: HttpMethod,
  endpoint: string,
  body?: Record<string, unknown>,
  customHeaders?: Record<string, string>
): Promise<ApiResponse<T>> {
  const token = getAdminAccessToken();
  
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'X-Admin-Portal': 'true', // Marker header for backend to identify admin requests
    ...customHeaders,
  };
  
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const config: RequestInit = {
    method,
    headers,
    credentials: 'include',
  };

  if (body && method !== 'GET') {
    config.body = JSON.stringify(body);
  }

  try {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, config);
    
    // Handle 401 - Unauthorized
    // DON'T redirect immediately - let the auth context handle it
    // This prevents logout loops during navigation
    if (response.status === 401) {
      // Only clear tokens, don't force redirect
      // The auth context will detect missing user and redirect properly
      return { 
        success: false, 
        error: { code: 'UNAUTHORIZED', message: 'Session expired or invalid' } 
      };
    }

    // Handle 403 - Forbidden (not an admin)
    if (response.status === 403) {
      return { 
        success: false, 
        error: { code: 'FORBIDDEN', message: 'Access denied - insufficient permissions' } 
      };
    }

    // Handle 404 - Resource not found (don't treat as auth error)
    if (response.status === 404) {
      return {
        success: false,
        error: { code: 'NOT_FOUND', message: 'Resource not found' },
      };
    }

    const data = await response.json();
    
    if (!response.ok) {
      return {
        success: false,
        error: data.error || { code: 'API_ERROR', message: 'Request failed' },
      };
    }

    // If response has pagination info (total, totalPages), pass the whole object
    // Otherwise unwrap the nested data if the API response has a data property
    if (data.total !== undefined || data.totalPages !== undefined) {
      return { success: true, data };
    }
    return { success: true, data: data.data ?? data };
  } catch (error) {
    console.error('[Admin API] Request failed:', error);
    return {
      success: false,
      error: { code: 'NETWORK_ERROR', message: 'Network request failed' },
    };
  }
}

export const adminApi = {
  get: <T>(endpoint: string, headers?: Record<string, string>) => 
    request<T>('GET', endpoint, undefined, headers),
  
  post: <T>(endpoint: string, body?: Record<string, unknown>, headers?: Record<string, string>) => 
    request<T>('POST', endpoint, body, headers),
  
  put: <T>(endpoint: string, body?: Record<string, unknown>, headers?: Record<string, string>) => 
    request<T>('PUT', endpoint, body, headers),
  
  patch: <T>(endpoint: string, body?: Record<string, unknown>, headers?: Record<string, string>) => 
    request<T>('PATCH', endpoint, body, headers),
  
  delete: <T>(endpoint: string, headers?: Record<string, string>) => 
    request<T>('DELETE', endpoint, undefined, headers),
};
