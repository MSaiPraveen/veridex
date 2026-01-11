'use client';

import { useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuth, User } from '@/lib/auth-context';

interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles?: User['role'][];
  redirectTo?: string;
}

/**
 * Get the login page for a specific role based on route
 */
function getRoleLoginPage(pathname: string): string {
  if (pathname.startsWith('/admin')) {
    return '/admin/login';
  }
  if (pathname.startsWith('/merchant')) {
    return '/auth/merchant/login';
  }
  return '/auth/consumer/login';
}

/**
 * Get the dashboard for a specific role
 */
function getRoleDashboard(role: User['role']): string {
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
 * Component wrapper for protected routes
 * Redirects to role-specific login if not authenticated
 * Redirects to unauthorized if role doesn't match
 */
export function ProtectedRoute({ 
  children, 
  allowedRoles, 
  redirectTo
}: ProtectedRouteProps) {
  const { user, isLoading, isAuthenticated } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (isLoading) return;

    if (!isAuthenticated) {
      const loginPage = redirectTo || getRoleLoginPage(pathname);
      router.push(loginPage);
      return;
    }

    if (allowedRoles && user && !allowedRoles.includes(user.role)) {
      // Redirect to unauthorized page instead of silently redirecting
      router.push('/unauthorized');
    }
  }, [isLoading, isAuthenticated, user, allowedRoles, router, redirectTo, pathname]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--background)]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[var(--primary)] mx-auto" />
          <p className="mt-4 text-[var(--foreground-muted)]">Loading...</p>
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

  return <>{children}</>;
}

/**
 * Component wrapper that redirects authenticated users away (for login/register pages)
 */
export function GuestRoute({ 
  children, 
  redirectTo 
}: { 
  children: React.ReactNode; 
  redirectTo?: string;
}) {
  const { user, isLoading, isAuthenticated } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (isLoading) return;

    if (isAuthenticated && user) {
      const destination = redirectTo || getRoleDashboard(user.role);
      router.push(destination);
    }
  }, [isLoading, isAuthenticated, user, router, redirectTo]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--background)]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[var(--primary)]" />
      </div>
    );
  }

  if (isAuthenticated) {
    return null;
  }

  return <>{children}</>;
}
