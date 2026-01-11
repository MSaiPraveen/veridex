'use client';

import Link from 'next/link';
import { Icons } from '@/components/ui/icons';
import { useAuth } from '@/lib/auth-context';
import { useTheme } from '@/components/providers/theme-provider';

export default function UnauthorizedPage() {
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();

  const handleLogout = async () => {
    await logout();
  };

  const getDashboardHref = () => {
    if (!user) return '/';
    switch (user.role) {
      case 'ADMIN':
      case 'SUPER_ADMIN':
        return '/admin';
      case 'MERCHANT':
        return '/merchant';
      default:
        return '/consumer';
    }
  };

  return (
    <div className="min-h-screen bg-[var(--background)] flex flex-col">
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-[var(--background)]/80 backdrop-blur-xl border-b border-[var(--border)]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <Link href="/" className="flex items-center gap-3">
              <Icons.logo size={32} />
              <span className="text-xl font-semibold text-[var(--foreground)]">Veridex</span>
            </Link>
            <button
              onClick={toggleTheme}
              className="p-2 rounded-lg hover:bg-[var(--muted)] transition-colors"
              aria-label="Toggle theme"
            >
              {theme === 'light' ? (
                <Icons.moon size={20} className="text-[var(--foreground-muted)]" />
              ) : (
                <Icons.sun size={20} className="text-[var(--foreground-muted)]" />
              )}
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex items-center justify-center p-4 pt-20">
        <div className="max-w-md w-full text-center">
          {/* Animated Icon */}
          <div className="relative w-24 h-24 mx-auto mb-8">
            <div className="absolute inset-0 rounded-full bg-red-500/20 animate-ping" />
            <div className="relative w-24 h-24 rounded-full bg-gradient-to-br from-red-500 to-rose-600 flex items-center justify-center shadow-lg shadow-red-500/30">
              <Icons.shield size={40} className="text-white" />
            </div>
          </div>

          {/* Title */}
          <h1 className="text-3xl sm:text-4xl font-bold text-[var(--foreground)] mb-3">
            Access Denied
          </h1>

          {/* Description */}
          <p className="text-[var(--foreground-muted)] text-lg mb-4">
            You don&apos;t have permission to access this page.
          </p>

          {user && (
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[var(--muted)] border border-[var(--border)] mb-8">
              <div className="w-6 h-6 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
                <span className="text-[10px] font-bold text-white">
                  {user.firstName?.[0] || user.email?.[0]?.toUpperCase() || 'U'}
                </span>
              </div>
              <span className="text-sm text-[var(--foreground-muted)]">
                Signed in as <span className="font-medium text-[var(--foreground)]">{user.role?.replace('_', ' ')}</span>
              </span>
            </div>
          )}

          {/* Actions */}
          <div className="space-y-3">
            {user ? (
              <>
                <Link
                  href={getDashboardHref()}
                  className="flex items-center justify-center gap-2 w-full py-3 px-4 rounded-xl bg-gradient-to-r from-primary-600 to-primary-500 text-white font-medium shadow-lg shadow-primary-500/30 hover:shadow-primary-500/40 transition-all hover:-translate-y-0.5"
                >
                  <Icons.home size={18} />
                  Go to My Dashboard
                </Link>
                
                <button
                  onClick={handleLogout}
                  className="flex items-center justify-center gap-2 w-full py-3 px-4 rounded-xl bg-[var(--muted)] text-[var(--foreground)] font-medium border border-[var(--border)] hover:bg-[var(--background)] transition-colors"
                >
                  <Icons.logout size={18} />
                  Sign Out
                </button>
              </>
            ) : (
              <Link 
                href="/" 
                className="flex items-center justify-center gap-2 w-full py-3 px-4 rounded-xl bg-gradient-to-r from-primary-600 to-primary-500 text-white font-medium shadow-lg shadow-primary-500/30 hover:shadow-primary-500/40 transition-all hover:-translate-y-0.5"
              >
                <Icons.home size={18} />
                Go to Homepage
              </Link>
            )}
          </div>

          {/* Help Link */}
          <p className="text-sm text-[var(--foreground-muted)] mt-10">
            Need help?{' '}
            <Link href="/support" className="text-[var(--primary)] hover:underline font-medium">
              Contact Support
            </Link>
          </p>
        </div>
      </main>

      {/* Footer */}
      <footer className="py-6 border-t border-[var(--border)]">
        <div className="text-center text-sm text-[var(--foreground-muted)]">
          © 2025 Veridex. All rights reserved.
        </div>
      </footer>
    </div>
  );
}
