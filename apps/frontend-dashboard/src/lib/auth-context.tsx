'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { api, setTokens, clearTokens, getAccessToken, hasValidTokens, ApiResponse, ApiRequestError, setToastCallback } from '@/lib/api';
import { useRouter, usePathname } from 'next/navigation';
import { useToast } from '@/components/ui/portal';

/**
 * User role type - strict role definitions
 */
export type UserRole = 'ADMIN' | 'MERCHANT' | 'CONSUMER' | 'SUPER_ADMIN';

export interface User {
  id: string;
  email: string;
  role: UserRole;
  firstName?: string;
  lastName?: string;
  organizationId?: string;
  permissions?: string[];
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string, expectedRole?: UserRole) => Promise<void>;
  register: (data: RegisterData) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
  hasPermission: (permission: string) => boolean;
  isRole: (...roles: UserRole[]) => boolean;
}

interface RegisterData {
  email: string;
  password: string;
  firstName?: string;
  lastName?: string;
  role?: 'MERCHANT' | 'CONSUMER';
  companyName?: string;
  industry?: string;
}

interface AuthResponse {
  user: User;
  tokens: AuthTokens;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

/**
 * Get the dashboard path for a given role
 */
export function getRoleDashboard(role: UserRole): string {
  switch (role) {
    case 'ADMIN':
    case 'SUPER_ADMIN':
      return '/admin';
    case 'MERCHANT':
      return '/merchant';
    case 'CONSUMER':
      return '/consumer';
    default:
      return '/';
  }
}

/**
 * Get the login path for a given role
 */
export function getRoleLoginPath(role: UserRole): string {
  switch (role) {
    case 'ADMIN':
    case 'SUPER_ADMIN':
      return '/admin/login';
    case 'MERCHANT':
      return '/auth/merchant/login';
    case 'CONSUMER':
      return '/auth/consumer/login';
    default:
      return '/';
  }
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();
  const pathname = usePathname();
  const { showToast } = useToast();

  // Connect API client to toast system
  useEffect(() => {
    setToastCallback(showToast);
  }, [showToast]);

  const refreshUser = useCallback(async () => {
    try {
      if (!hasValidTokens()) {
        setUser(null);
        return;
      }

      const response = await api.get<ApiResponse<{ user: User }>>('/auth/me');
      if (response.data?.user) {
        setUser(response.data.user);
      }
    } catch (error) {
      console.error('[Auth] Failed to refresh user:', error);
      setUser(null);
      clearTokens();
    }
  }, []);

  useEffect(() => {
    const initAuth = async () => {
      setIsLoading(true);
      await refreshUser();
      setIsLoading(false);
    };

    initAuth();
  }, [refreshUser]);

  const login = async (email: string, password: string, expectedRole?: UserRole) => {
    try {
      const response = await api.post<ApiResponse<AuthResponse>>('/auth/login', {
        email,
        password,
      });

      if (response.data) {
        const { user: loggedInUser, tokens } = response.data;
        
        // Role validation - ensure user is logging in through correct portal
        if (expectedRole && loggedInUser.role !== expectedRole) {
          // Admin trying to login through consumer portal, etc.
          const correctPath = getRoleLoginPath(loggedInUser.role);
          throw new Error(`Please login through the correct portal: ${correctPath}`);
        }

        setTokens(tokens.accessToken, tokens.refreshToken);
        setUser(loggedInUser);
        
        // Redirect to role-specific dashboard
        router.push(getRoleDashboard(loggedInUser.role));
      }
    } catch (error) {
      if (error instanceof ApiRequestError) {
        throw new Error(error.message);
      }
      throw error;
    }
  };

  const register = async (data: RegisterData) => {
    try {
      const response = await api.post<ApiResponse<AuthResponse>>('/auth/register', data);

      if (response.data) {
        const { user: registeredUser, tokens } = response.data;
        setTokens(tokens.accessToken, tokens.refreshToken);
        setUser(registeredUser);
        
        // Redirect to role-specific dashboard
        router.push(getRoleDashboard(registeredUser.role));
      }
    } catch (error) {
      if (error instanceof ApiRequestError) {
        throw new Error(error.message);
      }
      throw error;
    }
  };

  const logout = async () => {
    try {
      await api.post('/auth/logout', { allDevices: false });
    } catch {
      // Ignore logout errors - always clear local state
    } finally {
      clearTokens();
      setUser(null);
      // Redirect to landing page
      router.push('/');
    }
  };

  /**
   * Check if user has a specific permission
   */
  const hasPermission = useCallback((permission: string): boolean => {
    if (!user?.permissions) return false;
    return user.permissions.includes(permission);
  }, [user]);

  /**
   * Check if user is one of the specified roles
   */
  const isRole = useCallback((...roles: UserRole[]): boolean => {
    if (!user) return false;
    return roles.includes(user.role);
  }, [user]);

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        isAuthenticated: !!user,
        login,
        register,
        logout,
        refreshUser,
        hasPermission,
        isRole,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

/**
 * HOC for protected routes with role-based access control
 * Redirects to role-appropriate login page if not authenticated
 * Redirects to /unauthorized if authenticated but wrong role
 */
export function withAuth<P extends object>(
  Component: React.ComponentType<P>,
  allowedRoles?: UserRole[]
) {
  return function ProtectedRoute(props: P) {
    const { user, isLoading, isAuthenticated } = useAuth();
    const router = useRouter();

    useEffect(() => {
      if (!isLoading) {
        if (!isAuthenticated) {
          // Determine which login page to redirect to based on current path
          const path = window.location.pathname;
          if (path.startsWith('/admin')) {
            router.push('/admin/login');
          } else if (path.startsWith('/merchant')) {
            router.push('/auth/merchant/login');
          } else if (path.startsWith('/consumer')) {
            router.push('/auth/consumer/login');
          } else {
            router.push('/');
          }
        } else if (allowedRoles && user && !allowedRoles.includes(user.role)) {
          // User is authenticated but doesn't have the right role
          router.push('/unauthorized');
        }
      }
    }, [isLoading, isAuthenticated, user, router]);

    if (isLoading) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-[var(--background)]">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-4 border-[var(--primary)] border-t-transparent mx-auto mb-4" />
            <p className="text-[var(--muted-foreground)]">Loading...</p>
          </div>
        </div>
      );
    }

    if (!isAuthenticated) {
      return null;
    }

    if (allowedRoles && user && !allowedRoles.includes(user.role)) {
      return null;
    }

    return <Component {...props} />;
  };
}
