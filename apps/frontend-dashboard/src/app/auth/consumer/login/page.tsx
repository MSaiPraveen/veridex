'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Icons } from '@/components/ui/icons';
import { useTheme } from '@/components/providers/theme-provider';
import { useAuth } from '@/lib/auth-context';
import { GuestRoute } from '@/components/auth/protected-route';

function ConsumerLoginForm() {
  const { theme, toggleTheme } = useTheme();
  const { login, isLoading } = useAuth();
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      // Pass 'CONSUMER' as expected role for validation
      await login(email, password, 'CONSUMER');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSocialLogin = (provider: string) => {
    // TODO: Implement social login
    console.log(`Login with ${provider}`);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--background)]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[var(--primary)]" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[var(--background)] flex flex-col">
      {/* Header */}
      <header className="p-4 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2 text-[var(--foreground-muted)] hover:text-[var(--foreground)] transition-colors">
          <Icons.chevronLeft size={20} />
          <span className="text-sm">Back to home</span>
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
      </header>

      {/* Main Content */}
      <div className="flex-1 flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          {/* Card */}
          <div className="card p-8">
            {/* Header */}
            <div className="text-center mb-8">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center mx-auto mb-4">
                <Icons.user size={32} className="text-white" />
              </div>
              <h1 className="text-2xl font-bold text-[var(--foreground)]">
                Consumer Login
              </h1>
              <p className="text-sm text-[var(--foreground-muted)] mt-2">
                Access verified products and compliance information
              </p>
            </div>

            {/* Social Login Buttons */}
            <div className="space-y-3 mb-6">
              <button
                type="button"
                onClick={() => handleSocialLogin('google')}
                className="w-full flex items-center justify-center gap-3 px-4 py-3 rounded-xl border border-[var(--border)] hover:bg-[var(--muted)] transition-colors"
              >
                <svg className="w-5 h-5" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                </svg>
                <span className="text-sm font-medium text-[var(--foreground)]">Continue with Google</span>
              </button>
              <button
                type="button"
                onClick={() => handleSocialLogin('github')}
                className="w-full flex items-center justify-center gap-3 px-4 py-3 rounded-xl border border-[var(--border)] hover:bg-[var(--muted)] transition-colors"
              >
                <Icons.github size={20} className="text-[var(--foreground)]" />
                <span className="text-sm font-medium text-[var(--foreground)]">Continue with GitHub</span>
              </button>
            </div>

            {/* Divider */}
            <div className="relative mb-6">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-[var(--border)]" />
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-4 bg-[var(--card-bg)] text-[var(--foreground-muted)]">or continue with email</span>
              </div>
            </div>

            {/* Error Message */}
            {error && (
              <div className="mb-4 p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-600 text-sm">
                {error}
              </div>
            )}

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-[var(--foreground)] mb-1.5">
                  Email address
                </label>
                <input
                  id="email"
                  type="email"
                  placeholder="you@example.com"
                  className="input"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={isSubmitting}
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label htmlFor="password" className="block text-sm font-medium text-[var(--foreground)]">
                    Password
                  </label>
                  <Link href="/auth/consumer/forgot-password" className="text-sm text-[var(--primary)] hover:underline">
                    Forgot password?
                  </Link>
                </div>
                <input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  className="input"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={isSubmitting}
                />
              </div>

              <button
                type="submit"
                className="btn btn-primary w-full py-3"
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <span className="flex items-center justify-center gap-2">
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Signing in...
                  </span>
                ) : (
                  'Sign in'
                )}
              </button>
            </form>

            {/* Footer */}
            <p className="text-center text-sm text-[var(--foreground-muted)] mt-6">
              Don&apos;t have an account?{' '}
              <Link href="/auth/consumer/register" className="text-[var(--primary)] hover:underline font-medium">
                Create one
              </Link>
            </p>
          </div>

          {/* Switch Role */}
          <p className="text-center text-sm text-[var(--foreground-muted)] mt-6">
            Are you a merchant?{' '}
            <Link href="/auth/merchant/login" className="text-[var(--foreground)] hover:underline font-medium">
              Login as Merchant
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}

export default function ConsumerLoginPage() {
  return (
    <GuestRoute>
      <ConsumerLoginForm />
    </GuestRoute>
  );
}
