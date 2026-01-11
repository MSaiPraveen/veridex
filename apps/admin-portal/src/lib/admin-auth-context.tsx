'use client';

import { createContext, useContext, useState, useEffect, useCallback, ReactNode, useRef } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { adminApi, setAdminTokens, clearAdminTokens, hasValidAdminToken } from '@/lib/admin-api';
import { AdminRole } from '@/lib/admin-rbac';

/**
 * Admin-specific user type
 * Uses AdminRole enum for type safety
 */
export interface AdminUser {
  id: string;
  email: string;
  firstName?: string;
  lastName?: string;
  role: AdminRole;
  permissions?: string[];
}

interface AdminAuthContextType {
  user: AdminUser | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AdminAuthContext = createContext<AdminAuthContextType | undefined>(undefined);

const PUBLIC_PATHS = ['/login', '/forgot-password'];

export function AdminAuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AdminUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [hasInitialized, setHasInitialized] = useState(false);
  const isRedirecting = useRef(false);
  const router = useRouter();
  const pathname = usePathname();

  const refreshUser = useCallback(async () => {
    try {
      if (!hasValidAdminToken()) {
        setUser(null);
        return;
      }

      const response = await adminApi.get<{ user: AdminUser }>('/auth/me');
      const userData = response.data?.user;
      
      // CRITICAL: Verify this is actually an admin user
      if (userData && Object.values(AdminRole).includes(userData.role as AdminRole)) {
        setUser(userData);
      } else if (response.error?.code === 'UNAUTHORIZED') {
        // Token invalid - clear and let redirect happen
        clearAdminTokens();
        setUser(null);
      } else {
        // API error (network, server down, etc.) - DON'T clear tokens
        // User might still be valid, just can't verify right now
        console.warn('[Admin Auth] Could not verify user, keeping session');
        // Keep user null but don't clear tokens
        setUser(null);
      }
    } catch (error) {
      console.error('[Admin Auth] Failed to refresh user:', error);
      // Network error - don't clear tokens aggressively
      setUser(null);
    }
  }, []);

  // Initialize auth on mount
  useEffect(() => {
    const initAuth = async () => {
      setIsLoading(true);
      await refreshUser();
      setIsLoading(false);
      setHasInitialized(true);
    };
    initAuth();
  }, [refreshUser]);

  // Redirect logic - only runs after initialization
  useEffect(() => {
    // Don't redirect during initial load
    if (isLoading || !hasInitialized) return;
    
    // Prevent redirect loops
    if (isRedirecting.current) return;

    const isPublicPath = PUBLIC_PATHS.some(p => pathname.startsWith(p));

    if (!user && !isPublicPath && hasValidAdminToken() === false) {
      // Only redirect to login if there's NO token at all
      isRedirecting.current = true;
      router.push('/login');
      setTimeout(() => { isRedirecting.current = false; }, 1000);
    } else if (user && isPublicPath) {
      // User is logged in but on login page - go to dashboard
      isRedirecting.current = true;
      router.push('/dashboard');
      setTimeout(() => { isRedirecting.current = false; }, 1000);
    }
  }, [user, isLoading, hasInitialized, pathname, router]);

  const login = async (email: string, password: string) => {
    const response = await adminApi.post<{
      user: AdminUser;
      tokens: { accessToken: string; refreshToken: string };
    }>('/auth/login', { email, password });

    const userData = response.data?.user;
    const tokens = response.data?.tokens;

    // CRITICAL: Verify admin role before allowing login
    if (!userData || !Object.values(AdminRole).includes(userData.role as AdminRole)) {
      throw new Error('Access denied. Admin credentials required.');
    }

    if (!tokens) {
      throw new Error('Login failed. No tokens received.');
    }

    setAdminTokens(tokens.accessToken, tokens.refreshToken);
    setUser(userData);
    router.push('/dashboard');
  };

  const logout = async () => {
    try {
      await adminApi.post('/auth/logout', { allDevices: false });
    } catch {
      // Ignore errors - always clear local state
    } finally {
      clearAdminTokens();
      setUser(null);
      router.push('/login');
    }
  };

  return (
    <AdminAuthContext.Provider
      value={{
        user,
        isLoading,
        isAuthenticated: !!user,
        login,
        logout,
        refreshUser,
      }}
    >
      {children}
    </AdminAuthContext.Provider>
  );
}

export function useAdminAuth() {
  const context = useContext(AdminAuthContext);
  if (!context) {
    throw new Error('useAdminAuth must be used within AdminAuthProvider');
  }
  return context;
}
