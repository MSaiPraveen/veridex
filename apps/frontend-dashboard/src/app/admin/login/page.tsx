'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Icons } from '@/components/ui/icons';
import { useTheme } from '@/components/providers/theme-provider';
import { useAuth } from '@/lib/auth-context';
import { GuestRoute } from '@/components/auth/protected-route';

function AdminLoginForm() {
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
      // Pass 'ADMIN' as expected role for strict validation
      await login(email, password, 'ADMIN');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Authentication failed. Access denied.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-950">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-amber-500" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-950 flex flex-col">
      {/* Header */}
      <header className="p-4 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2 text-gray-500 hover:text-gray-400 transition-colors">
          <Icons.chevronLeft size={20} />
          <span className="text-sm">Exit Admin</span>
        </Link>
        <button
          onClick={toggleTheme}
          className="p-2 rounded-lg hover:bg-gray-800 transition-colors"
          aria-label="Toggle theme"
        >
          {theme === 'light' ? (
            <Icons.moon size={20} className="text-gray-500" />
          ) : (
            <Icons.sun size={20} className="text-gray-500" />
          )}
        </button>
      </header>

      {/* Main Content */}
      <div className="flex-1 flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          {/* Card */}
          <div className="bg-gray-900 border border-gray-800 rounded-2xl p-8">
            {/* Header */}
            <div className="text-center mb-8">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center mx-auto mb-4">
                <Icons.settings size={32} className="text-white" />
              </div>
              <h1 className="text-2xl font-bold text-white">
                Admin Portal
              </h1>
              <p className="text-sm text-gray-500 mt-2">
                Internal access only
              </p>
            </div>

            {/* Security Warning */}
            <div className="flex items-start gap-3 p-4 rounded-xl bg-amber-500/10 border border-amber-500/20 mb-6">
              <Icons.alertTriangle size={20} className="text-amber-500 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-sm font-medium text-amber-400">Restricted Access</p>
                <p className="text-xs text-amber-400/70 mt-0.5">
                  This portal is for authorized administrators only. Unauthorized access attempts are logged.
                </p>
              </div>
            </div>

            {/* Error Message */}
            {error && (
              <div className="mb-4 p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
                {error}
              </div>
            )}

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-300 mb-1.5">
                  Admin email
                </label>
                <input
                  id="email"
                  type="email"
                  placeholder="admin@veridex.com"
                  className="w-full px-4 py-3 rounded-xl bg-gray-800 border border-gray-700 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-amber-500/50 focus:border-amber-500 transition-colors"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={isSubmitting}
                />
              </div>

              <div>
                <label htmlFor="password" className="block text-sm font-medium text-gray-300 mb-1.5">
                  Password
                </label>
                <input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  className="w-full px-4 py-3 rounded-xl bg-gray-800 border border-gray-700 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-amber-500/50 focus:border-amber-500 transition-colors"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={isSubmitting}
                />
              </div>

              <button
                type="submit"
                className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-amber-500 to-orange-600 text-white font-semibold hover:from-amber-600 hover:to-orange-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <span className="flex items-center justify-center gap-2">
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Authenticating...
                  </span>
                ) : (
                  'Access Admin Portal'
                )}
              </button>
            </form>

            {/* Footer */}
            <div className="mt-8 pt-6 border-t border-gray-800">
              <p className="text-xs text-gray-600 text-center">
                Admin credentials are pre-provisioned. Contact system administrator if you need access.
              </p>
            </div>
          </div>

          {/* Version Info */}
          <p className="text-center text-xs text-gray-700 mt-6">
            Veridex Admin Portal v1.0.0
          </p>
        </div>
      </div>
    </div>
  );
}

export default function AdminLoginPage() {
  return (
    <GuestRoute>
      <AdminLoginForm />
    </GuestRoute>
  );
}
