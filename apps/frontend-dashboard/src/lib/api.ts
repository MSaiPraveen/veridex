/**
 * Veridex API Client
 * 
 * All API calls go through a single API Gateway.
 * 
 * SERVICE ROUTE MAPPING (via API Gateway):
 * ─────────────────────────────────────────
 * /auth/*          → Auth Service (3001)
 * /users/*         → User & Org Service (3003)
 * /organizations/* → User & Org Service (3003)
 * /products/*      → Product Service (3004)
 * /documents/*     → Document Service (3005)
 * /compliance/*    → Compliance Service (3006)
 * /notifications/* → Notification Service (3007)
 * /admin/audits/*  → Audit Log Service (3008)
 * /health          → API Gateway health check
 * 
 * ARCHITECTURE:
 * - Consumer/Merchant: Use NEXT_PUBLIC_API_URL (public gateway)
 * - Admin: Uses same gateway but with stricter role checks
 * - All protected endpoints require valid JWT with role claim
 */

// API Configuration - Environment-based URLs
export const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3002';

// Admin-specific API URL (can be different in production for extra isolation)
export const ADMIN_API_URL = process.env.NEXT_PUBLIC_ADMIN_API_URL || API_BASE_URL;

// Debug mode for development
const DEBUG_MODE = process.env.NODE_ENV === 'development';

// Toast notification callback (set by UI layer)
let showToastCallback: ((message: string, type: 'error' | 'warning' | 'info' | 'success') => void) | null = null;

export function setToastCallback(callback: typeof showToastCallback) {
  showToastCallback = callback;
}

function showToast(message: string, type: 'error' | 'warning' | 'info' | 'success' = 'error') {
  if (showToastCallback) {
    showToastCallback(message, type);
  } else if (DEBUG_MODE) {
    console.log(`[Toast ${type}] ${message}`);
  }
}

function debugLog(message: string, data?: unknown) {
  if (DEBUG_MODE) {
    console.log(`[Veridex API] ${message}`, data || '');
  }
}

export interface ApiError {
  error: string;
  message: string;
  statusCode?: number;
  details?: Array<{ path: string; message: string }>;
}

export interface ApiResponse<T> {
  success?: boolean;
  message?: string;
  data: T;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

// Token storage - prefer sessionStorage for security, fallback to memory
let accessToken: string | null = null;
let refreshToken: string | null = null;
let tokenRefreshPromise: Promise<boolean> | null = null;

// Track if we're currently redirecting to prevent loops
let isRedirecting = false;

/**
 * Store tokens securely
 * Uses both sessionStorage AND cookies for middleware access
 */
export function setTokens(access: string, refresh: string) {
  accessToken = access;
  refreshToken = refresh;
  if (typeof window !== 'undefined') {
    // Use sessionStorage for client-side access (cleared on tab close)
    sessionStorage.setItem('veridex_access_token', access);
    sessionStorage.setItem('veridex_refresh_token', refresh);
    
    // Also set as cookies for middleware access (httpOnly would be better but needs server)
    // These are accessible by middleware for route protection
    document.cookie = `veridex_access_token=${access}; path=/; max-age=900; SameSite=Strict`;
    document.cookie = `veridex_refresh_token=${refresh}; path=/; max-age=604800; SameSite=Strict`;
    
    debugLog('Tokens stored');
  }
}

export function getAccessToken(): string | null {
  if (typeof window !== 'undefined' && !accessToken) {
    accessToken = sessionStorage.getItem('veridex_access_token');
  }
  return accessToken;
}

export function getRefreshToken(): string | null {
  if (typeof window !== 'undefined' && !refreshToken) {
    refreshToken = sessionStorage.getItem('veridex_refresh_token');
  }
  return refreshToken;
}

/**
 * Clear all auth tokens and state
 */
export function clearTokens() {
  accessToken = null;
  refreshToken = null;
  tokenRefreshPromise = null;
  if (typeof window !== 'undefined') {
    sessionStorage.removeItem('veridex_access_token');
    sessionStorage.removeItem('veridex_refresh_token');
    // Also clear any potential localStorage remnants
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    // Clear cookies
    document.cookie = 'veridex_access_token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT';
    document.cookie = 'veridex_refresh_token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT';
    debugLog('Tokens cleared');
  }
}

/**
 * Get the appropriate login URL based on current path
 */
function getLoginUrl(): string {
  if (typeof window === 'undefined') return '/login';
  
  const path = window.location.pathname;
  if (path.startsWith('/admin')) return '/admin/login';
  if (path.startsWith('/merchant')) return '/auth/merchant/login';
  if (path.startsWith('/consumer')) return '/auth/consumer/login';
  return '/login';
}

/**
 * Redirect to login page (with protection against redirect loops)
 */
function redirectToLogin() {
  if (typeof window === 'undefined' || isRedirecting) return;
  
  isRedirecting = true;
  const loginUrl = getLoginUrl();
  const currentPath = window.location.pathname;
  
  // Don't redirect if already on login page
  if (currentPath.includes('login')) {
    isRedirecting = false;
    return;
  }
  
  debugLog('Redirecting to login', loginUrl);
  window.location.href = `${loginUrl}?redirect=${encodeURIComponent(currentPath)}`;
}

/**
 * Check if user has valid auth tokens
 */
export function hasValidTokens(): boolean {
  return !!getAccessToken();
}

/**
 * Refresh access token using refresh token
 * Uses a singleton promise to prevent multiple simultaneous refresh attempts
 */
async function refreshAccessToken(): Promise<boolean> {
  // Return existing refresh promise if one is in progress
  if (tokenRefreshPromise) {
    return tokenRefreshPromise;
  }

  const token = getRefreshToken();
  if (!token) {
    debugLog('No refresh token available');
    return false;
  }

  tokenRefreshPromise = (async () => {
    try {
      debugLog('Attempting token refresh');
      const response = await fetch(`${API_BASE_URL}/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken: token }),
        credentials: 'include',
      });

      if (!response.ok) {
        debugLog('Token refresh failed', response.status);
        clearTokens();
        return false;
      }

      const data = await response.json();
      if (data.data?.tokens) {
        setTokens(data.data.tokens.accessToken, data.data.tokens.refreshToken);
        debugLog('Token refresh successful');
        return true;
      }
      return false;
    } catch (error) {
      debugLog('Token refresh error', error);
      clearTokens();
      return false;
    } finally {
      tokenRefreshPromise = null;
    }
  })();

  return tokenRefreshPromise;
}

/**
 * Custom API Error class with status code
 */
export class ApiRequestError extends Error {
  statusCode: number;
  details?: Array<{ path: string; message: string }>;

  constructor(message: string, statusCode: number, details?: Array<{ path: string; message: string }>) {
    super(message);
    this.name = 'ApiRequestError';
    this.statusCode = statusCode;
    this.details = details;
  }
}

/**
 * Base fetch wrapper with automatic auth and error handling
 * 
 * Features:
 * - Automatic token attachment
 * - 401 handling with token refresh
 * - Automatic redirect to login on auth failure
 * - Network error handling with toast notifications
 * - Correlation ID tracking for 5xx errors
 */
async function apiFetch<T>(
  endpoint: string,
  options: RequestInit = {},
  retryCount = 0
): Promise<T> {
  const url = `${API_BASE_URL}${endpoint}`;
  const token = getAccessToken();

  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...options.headers,
  };

  if (token) {
    (headers as Record<string, string>)['Authorization'] = `Bearer ${token}`;
  } else {
    // No token available - if this is a protected endpoint, redirect to login
    const isProtectedEndpoint = !endpoint.startsWith('/auth/') && 
                                 endpoint !== '/health' &&
                                 !endpoint.includes('/public/');
    if (isProtectedEndpoint) {
      debugLog('No token for protected endpoint', endpoint);
      showToast('Please log in to continue', 'warning');
      redirectToLogin();
      throw new ApiRequestError('Authentication required', 401);
    }
  }

  debugLog(`${options.method || 'GET'} ${endpoint}`);

  try {
    const response = await fetch(url, {
      ...options,
      headers,
      credentials: 'include',
    });

    // Handle 401 - try to refresh token (only once)
    if (response.status === 401 && retryCount === 0) {
      debugLog('Received 401, attempting token refresh');
      
      if (getRefreshToken()) {
        const refreshed = await refreshAccessToken();
        if (refreshed) {
          return apiFetch<T>(endpoint, options, retryCount + 1);
        }
      }
      
      // Refresh failed or no refresh token - clear auth and redirect
      clearTokens();
      showToast('Session expired. Please log in again.', 'warning');
      redirectToLogin();
      throw new ApiRequestError('Session expired. Please log in again.', 401);
    }

    // Handle 401 on retry (refresh also failed)
    if (response.status === 401 && retryCount > 0) {
      clearTokens();
      showToast('Session expired. Please log in again.', 'warning');
      redirectToLogin();
      throw new ApiRequestError('Session expired. Please log in again.', 401);
    }

    // Handle 403 - Forbidden (role violation)
    if (response.status === 403) {
      debugLog('Access forbidden', endpoint);
      showToast('You do not have permission to access this resource.', 'error');
      throw new ApiRequestError('You do not have permission to access this resource.', 403);
    }

    // Handle 4xx client errors (except 401/403 handled above)
    if (response.status >= 400 && response.status < 500) {
      const errorData = await response.json().catch(() => ({ message: 'Request failed' }));
      // Handle nested error format from backend: { error: { message, details } }
      const errorObj = errorData.error || errorData;
      const message = errorObj.message || errorData.message || `Request failed (${response.status})`;
      const details = errorObj.details || errorData.details;
      showToast(message, 'error');
      throw new ApiRequestError(message, response.status, details);
    }

    // Handle 5xx server errors
    if (response.status >= 500) {
      const correlationId = response.headers.get('x-correlation-id') || 'unknown';
      const message = `Server error. Reference: ${correlationId}`;
      debugLog('Server error', { status: response.status, correlationId });
      showToast(message, 'error');
      throw new ApiRequestError(message, response.status);
    }

    // Handle empty responses (204, etc.)
    if (response.status === 204) {
      return {} as T;
    }

    return response.json();
  } catch (error) {
    if (error instanceof ApiRequestError) {
      throw error;
    }
    // Network error or other fetch failure
    debugLog('Network error', error);
    showToast('Cannot reach server. Please check your connection.', 'error');
    throw new ApiRequestError(
      'Unable to connect to server. Please check your connection.',
      0
    );
  }
}

/**
 * Upload file with multipart/form-data
 */
async function apiUpload<T>(
  endpoint: string,
  formData: FormData
): Promise<T> {
  const url = `${API_BASE_URL}${endpoint}`;
  const token = getAccessToken();

  const headers: HeadersInit = {};
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  // Don't set Content-Type - browser will set it with boundary

  debugLog(`UPLOAD ${endpoint}`);

  const response = await fetch(url, {
    method: 'POST',
    headers,
    body: formData,
    credentials: 'include',
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ message: 'Upload failed' }));
    throw new ApiRequestError(
      errorData.message || 'Upload failed',
      response.status,
      errorData.details
    );
  }

  return response.json();
}

// ============================================
// API Methods
// ============================================

export const api = {
  get: <T>(endpoint: string) => apiFetch<T>(endpoint, { method: 'GET' }),
  
  post: <T>(endpoint: string, body?: unknown) =>
    apiFetch<T>(endpoint, {
      method: 'POST',
      body: body ? JSON.stringify(body) : undefined,
    }),
  
  put: <T>(endpoint: string, body?: unknown) =>
    apiFetch<T>(endpoint, {
      method: 'PUT',
      body: body ? JSON.stringify(body) : undefined,
    }),
  
  patch: <T>(endpoint: string, body?: unknown) =>
    apiFetch<T>(endpoint, {
      method: 'PATCH',
      body: body ? JSON.stringify(body) : undefined,
    }),
  
  delete: <T>(endpoint: string) => apiFetch<T>(endpoint, { method: 'DELETE' }),

  upload: <T>(endpoint: string, formData: FormData) => apiUpload<T>(endpoint, formData),
};

// ============================================
// Health Check
// ============================================

export interface HealthStatus {
  status: 'ok' | 'error';
  service: string;
  timestamp: string;
}

export async function checkApiHealth(): Promise<HealthStatus> {
  try {
    const response = await fetch(`${API_BASE_URL}/health`);
    if (response.ok) {
      return response.json();
    }
    return { status: 'error', service: 'api-gateway', timestamp: new Date().toISOString() };
  } catch {
    return { status: 'error', service: 'api-gateway', timestamp: new Date().toISOString() };
  }
}
