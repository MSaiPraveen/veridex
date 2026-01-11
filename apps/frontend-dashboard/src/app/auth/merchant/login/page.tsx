'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Icons } from '@/components/ui/icons';
import { useTheme } from '@/components/providers/theme-provider';
import { useAuth } from '@/lib/auth-context';
import { GuestRoute } from '@/components/auth/protected-route';

function MerchantLoginForm() {
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
      // Pass 'MERCHANT' as expected role for validation
      await login(email, password, 'MERCHANT');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed. Please check your credentials.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--background)]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-500" />
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
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-emerald-500 to-emerald-600 flex items-center justify-center mx-auto mb-4">
                <Icons.building size={32} className="text-white" />
              </div>
              <h1 className="text-2xl font-bold text-[var(--foreground)]">
                Merchant Portal
              </h1>
              <p className="text-sm text-[var(--foreground-muted)] mt-2">
                Sign in to manage your products and compliance
              </p>
            </div>

            {/* Security Notice */}
            <div className="flex items-start gap-3 p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 mb-6">
              <Icons.shield size={20} className="text-emerald-600 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-sm font-medium text-emerald-700 dark:text-emerald-400">Secure Business Login</p>
                <p className="text-xs text-emerald-600/80 dark:text-emerald-400/80 mt-0.5">
                  Use your registered company email and password
                </p>
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
                  Company email
                </label>
                <input
                  id="email"
                  type="email"
                  placeholder="you@company.com"
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
                  <Link href="/auth/merchant/forgot-password" className="text-sm text-emerald-600 hover:underline">
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
                className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-emerald-500 to-emerald-600 text-white font-semibold hover:from-emerald-600 hover:to-emerald-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <span className="flex items-center justify-center gap-2">
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Signing in...
                  </span>
                ) : (
                  'Sign in to Portal'
                )}
              </button>
            </form>

            {/* Footer */}
            <p className="text-center text-sm text-[var(--foreground-muted)] mt-6">
              Need a merchant account?{' '}
              <Link href="/auth/merchant/register" className="text-emerald-600 hover:underline font-medium">
                Register your company
              </Link>
            </p>
          </div>

          {/* Switch Role */}
          <p className="text-center text-sm text-[var(--foreground-muted)] mt-6">
            Looking for consumer access?{' '}
            <Link href="/auth/consumer/login" className="text-[var(--foreground)] hover:underline font-medium">
              Login as Consumer
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}

export default function MerchantLoginPage() {
  return (
    <GuestRoute>
      <MerchantLoginForm />
    </GuestRoute>
  );
}
