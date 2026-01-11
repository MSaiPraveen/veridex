/**
 * Admin Auth Hook
 * 
 * React hook for admin authentication, MFA, and session management.
 */

'use client';

import { useState, useCallback, useEffect, createContext, useContext, ReactNode } from 'react';
import { adminApi, ApiResponse } from '../lib/api-client';
import { AdminRole, hasPermission as checkPermission, AdminPermission } from '../lib/admin-rbac';

// ===================
// Types
// ===================

export interface AdminUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: AdminRole;
  permissions: AdminPermission[];
  mfaEnabled: boolean;
  lastLogin?: string;
  createdAt: string;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface MFAVerification {
  code: string;
  sessionToken: string;
}

export interface AuthState {
  user: AdminUser | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  mfaRequired: boolean;
  mfaSessionToken: string | null;
  error: string | null;
}

export interface AuthContextType extends AuthState {
  login: (credentials: LoginCredentials) => Promise<boolean>;
  verifyMFA: (code: string) => Promise<boolean>;
  logout: () => Promise<void>;
  refreshSession: () => Promise<void>;
  hasPermission: (permission: AdminPermission) => boolean;
  hasAnyPermission: (permissions: AdminPermission[]) => boolean;
  hasAllPermissions: (permissions: AdminPermission[]) => boolean;
  isRole: (role: AdminRole) => boolean;
  clearError: () => void;
}

// ===================
// Context
// ===================

const AuthContext = createContext<AuthContextType | null>(null);

// ===================
// Provider
// ===================

interface AuthProviderProps {
  children: ReactNode;
}

export function AdminAuthProvider({ children }: AuthProviderProps) {
  const [state, setState] = useState<AuthState>({
    user: null,
    isAuthenticated: false,
    isLoading: true,
    mfaRequired: false,
    mfaSessionToken: null,
    error: null,
  });

  // Check for existing session on mount
  useEffect(() => {
    const checkSession = async () => {
      const token = localStorage.getItem('admin_token');
      if (!token) {
        setState(prev => ({ ...prev, isLoading: false }));
        return;
      }

      try {
        const response = await adminApi.get<{ user: AdminUser }>('/admin/auth/me');
        
        if (response.success && response.data) {
          setState({
            user: response.data.user,
            isAuthenticated: true,
            isLoading: false,
            mfaRequired: false,
            mfaSessionToken: null,
            error: null,
          });
        } else {
          // Token invalid, clear it
          localStorage.removeItem('admin_token');
          localStorage.removeItem('admin_refresh_token');
          setState({
            user: null,
            isAuthenticated: false,
            isLoading: false,
            mfaRequired: false,
            mfaSessionToken: null,
            error: null,
          });
        }
      } catch {
        localStorage.removeItem('admin_token');
        localStorage.removeItem('admin_refresh_token');
        setState(prev => ({ ...prev, isLoading: false }));
      }
    };

    checkSession();
  }, []);

  const login = useCallback(async (credentials: LoginCredentials): Promise<boolean> => {
    setState(prev => ({ ...prev, isLoading: true, error: null }));

    const response = await adminApi.post<{
      success: boolean;
      mfaRequired?: boolean;
      mfaSessionToken?: string;
      accessToken?: string;
      refreshToken?: string;
      user?: AdminUser;
    }>('/admin/auth/login', credentials);

    if (response.success && response.data) {
      const data = response.data;

      // Check if MFA is required
      if (data.mfaRequired && data.mfaSessionToken) {
        setState({
          user: null,
          isAuthenticated: false,
          isLoading: false,
          mfaRequired: true,
          mfaSessionToken: data.mfaSessionToken,
          error: null,
        });
        return true; // Login successful, MFA pending
      }

      // Login complete (no MFA or MFA already verified)
      if (data.accessToken && data.user) {
        localStorage.setItem('admin_token', data.accessToken);
        if (data.refreshToken) {
          localStorage.setItem('admin_refresh_token', data.refreshToken);
        }

        setState({
          user: data.user,
          isAuthenticated: true,
          isLoading: false,
          mfaRequired: false,
          mfaSessionToken: null,
          error: null,
        });
        return true;
      }
    }

    setState(prev => ({
      ...prev,
      isLoading: false,
      error: response.error?.message || 'Login failed',
    }));
    return false;
  }, []);

  const verifyMFA = useCallback(async (code: string): Promise<boolean> => {
    if (!state.mfaSessionToken) {
      setState(prev => ({ ...prev, error: 'MFA session expired' }));
      return false;
    }

    setState(prev => ({ ...prev, isLoading: true, error: null }));

    const response = await adminApi.post<{
      accessToken: string;
      refreshToken?: string;
      user: AdminUser;
    }>('/admin/auth/mfa/verify', {
      code,
      sessionToken: state.mfaSessionToken,
    });

    if (response.success && response.data) {
      localStorage.setItem('admin_token', response.data.accessToken);
      if (response.data.refreshToken) {
        localStorage.setItem('admin_refresh_token', response.data.refreshToken);
      }

      setState({
        user: response.data.user,
        isAuthenticated: true,
        isLoading: false,
        mfaRequired: false,
        mfaSessionToken: null,
        error: null,
      });
      return true;
    }

    setState(prev => ({
      ...prev,
      isLoading: false,
      error: response.error?.message || 'MFA verification failed',
    }));
    return false;
  }, [state.mfaSessionToken]);

  const logout = useCallback(async (): Promise<void> => {
    try {
      await adminApi.post('/admin/auth/logout');
    } catch {
      // Ignore logout errors
    }

    localStorage.removeItem('admin_token');
    localStorage.removeItem('admin_refresh_token');

    setState({
      user: null,
      isAuthenticated: false,
      isLoading: false,
      mfaRequired: false,
      mfaSessionToken: null,
      error: null,
    });

    // Redirect to login
    if (typeof window !== 'undefined') {
      window.location.href = '/login';
    }
  }, []);

  const refreshSession = useCallback(async (): Promise<void> => {
    const refreshToken = localStorage.getItem('admin_refresh_token');
    if (!refreshToken) {
      await logout();
      return;
    }

    const response = await adminApi.post<{
      accessToken: string;
      refreshToken?: string;
    }>('/admin/auth/refresh', { refreshToken });

    if (response.success && response.data) {
      localStorage.setItem('admin_token', response.data.accessToken);
      if (response.data.refreshToken) {
        localStorage.setItem('admin_refresh_token', response.data.refreshToken);
      }
    } else {
      await logout();
    }
  }, [logout]);

  const hasPermissionFn = useCallback((permission: AdminPermission): boolean => {
    if (!state.user) return false;
    return checkPermission(state.user, permission);
  }, [state.user]);

  const hasAnyPermission = useCallback((permissions: AdminPermission[]): boolean => {
    if (!state.user) return false;
    return permissions.some(p => checkPermission(state.user!, p));
  }, [state.user]);

  const hasAllPermissions = useCallback((permissions: AdminPermission[]): boolean => {
    if (!state.user) return false;
    return permissions.every(p => checkPermission(state.user!, p));
  }, [state.user]);

  const isRole = useCallback((role: AdminRole): boolean => {
    if (!state.user) return false;
    return state.user.role === role;
  }, [state.user]);

  const clearError = useCallback(() => {
    setState(prev => ({ ...prev, error: null }));
  }, []);

  const value: AuthContextType = {
    ...state,
    login,
    verifyMFA,
    logout,
    refreshSession,
    hasPermission: hasPermissionFn,
    hasAnyPermission,
    hasAllPermissions,
    isRole,
    clearError,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

// ===================
// Hook
// ===================

export function useAdminAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAdminAuth must be used within an AdminAuthProvider');
  }
  return context;
}

// ===================
// Session Activity
// ===================

/**
 * Hook for tracking user activity and auto-logout
 */
export function useSessionActivity(timeoutMinutes: number = 30) {
  const { logout, isAuthenticated } = useAdminAuth();
  const [lastActivity, setLastActivity] = useState(Date.now());

  useEffect(() => {
    if (!isAuthenticated) return;

    const updateActivity = () => {
      setLastActivity(Date.now());
    };

    // Track user activity
    const events = ['mousedown', 'keydown', 'scroll', 'touchstart'];
    events.forEach(event => {
      window.addEventListener(event, updateActivity, { passive: true });
    });

    // Check for inactivity
    const interval = setInterval(() => {
      const inactiveTime = Date.now() - lastActivity;
      const timeoutMs = timeoutMinutes * 60 * 1000;

      if (inactiveTime >= timeoutMs) {
        logout();
      }
    }, 60000); // Check every minute

    return () => {
      events.forEach(event => {
        window.removeEventListener(event, updateActivity);
      });
      clearInterval(interval);
    };
  }, [isAuthenticated, lastActivity, logout, timeoutMinutes]);

  return { lastActivity };
}
