'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Icons } from '@/components/ui/icons';
import { useTheme } from '@/components/providers/theme-provider';
import { useAuth } from '@/lib/auth-context';
import { GuestRoute } from '@/components/auth/protected-route';

function ConsumerRegisterForm() {
  const { theme, toggleTheme } = useTheme();
  const { register, isLoading } = useAuth();
  
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    confirmPassword: '',
  });
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (formData.password.length < 8) {
      setError('Password must be at least 8 characters');
      return;
    }

    // Validate password complexity
    const hasUppercase = /[A-Z]/.test(formData.password);
    const hasLowercase = /[a-z]/.test(formData.password);
    const hasNumber = /\d/.test(formData.password);
    
    if (!hasUppercase || !hasLowercase || !hasNumber) {
      setError('Password must contain at least one uppercase letter, one lowercase letter, and one number');
      return;
    }

    setIsSubmitting(true);

    try {
      await register({
        email: formData.email,
        password: formData.password,
        firstName: formData.firstName,
        lastName: formData.lastName,
        role: 'CONSUMER',
      });
    } catch (err: unknown) {
      // Try to extract detailed error message
      if (err && typeof err === 'object' && 'details' in err) {
        const details = (err as { details?: Array<{ path?: string; message?: string }> }).details;
        if (details && details.length > 0) {
          const messages = details.map((d: { path?: string; message?: string }) => d.message).filter(Boolean);
          setError(messages.join('. ') || 'Registration failed. Please try again.');
          return;
        }
      }
      setError(err instanceof Error ? err.message : 'Registration failed. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSocialRegister = (provider: string) => {
    // TODO: Implement social registration
    console.log(`Register with ${provider}`);
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
                Create Consumer Account
              </h1>
              <p className="text-sm text-[var(--foreground-muted)] mt-2">
                Start browsing verified products today
              </p>
            </div>

            {/* Social Register Buttons */}
            <div className="space-y-3 mb-6">
              <button
                type="button"
                onClick={() => handleSocialRegister('google')}
                className="w-full flex items-center justify-center gap-3 px-4 py-3 rounded-xl border border-[var(--border)] hover:bg-[var(--muted)] transition-colors"
              >
                <svg className="w-5 h-5" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                </svg>
                <span className="text-sm font-medium text-[var(--foreground)]">Sign up with Google</span>
              </button>
              <button
                type="button"
                onClick={() => handleSocialRegister('github')}
                className="w-full flex items-center justify-center gap-3 px-4 py-3 rounded-xl border border-[var(--border)] hover:bg-[var(--muted)] transition-colors"
              >
                <Icons.github size={20} className="text-[var(--foreground)]" />
                <span className="text-sm font-medium text-[var(--foreground)]">Sign up with GitHub</span>
              </button>
            </div>

            {/* Divider */}
            <div className="relative mb-6">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-[var(--border)]" />
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-4 bg-[var(--card-bg)] text-[var(--foreground-muted)]">or register with email</span>
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
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label htmlFor="firstName" className="block text-sm font-medium text-[var(--foreground)] mb-1.5">
                    First name
                  </label>
                  <input
                    id="firstName"
                    name="firstName"
                    type="text"
                    placeholder="John"
                    className="input"
                    required
                    value={formData.firstName}
                    onChange={handleChange}
                    disabled={isSubmitting}
                  />
                </div>
                <div>
                  <label htmlFor="lastName" className="block text-sm font-medium text-[var(--foreground)] mb-1.5">
                    Last name
                  </label>
                  <input
                    id="lastName"
                    name="lastName"
                    type="text"
                    placeholder="Doe"
                    className="input"
                    required
                    value={formData.lastName}
                    onChange={handleChange}
                    disabled={isSubmitting}
                  />
                </div>
              </div>

              <div>
                <label htmlFor="email" className="block text-sm font-medium text-[var(--foreground)] mb-1.5">
                  Email address
                </label>
                <input
                  id="email"
                  name="email"
                  type="email"
                  placeholder="you@example.com"
                  className="input"
                  required
                  value={formData.email}
                  onChange={handleChange}
                  disabled={isSubmitting}
                />
              </div>

              <div>
                <label htmlFor="password" className="block text-sm font-medium text-[var(--foreground)] mb-1.5">
                  Password
                </label>
                <input
                  id="password"
                  name="password"
                  type="password"
                  placeholder="••••••••"
                  className="input"
                  required
                  minLength={8}
                  value={formData.password}
                  onChange={handleChange}
                  disabled={isSubmitting}
                />
                <p className="text-xs text-[var(--foreground-muted)] mt-1">
                  Must be at least 8 characters
                </p>
              </div>

              <div>
                <label htmlFor="confirmPassword" className="block text-sm font-medium text-[var(--foreground)] mb-1.5">
                  Confirm password
                </label>
                <input
                  id="confirmPassword"
                  name="confirmPassword"
                  type="password"
                  placeholder="••••••••"
                  className="input"
                  required
                  value={formData.confirmPassword}
                  onChange={handleChange}
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
                    Creating account...
                  </span>
                ) : (
                  'Create account'
                )}
              </button>

              <p className="text-xs text-center text-[var(--foreground-muted)]">
                By creating an account, you agree to our{' '}
                <Link href="/terms" className="text-[var(--primary)] hover:underline">Terms of Service</Link>
                {' '}and{' '}
                <Link href="/privacy" className="text-[var(--primary)] hover:underline">Privacy Policy</Link>
              </p>
            </form>

            {/* Footer */}
            <p className="text-center text-sm text-[var(--foreground-muted)] mt-6">
              Already have an account?{' '}
              <Link href="/auth/consumer/login" className="text-[var(--primary)] hover:underline font-medium">
                Sign in
              </Link>
            </p>
          </div>

          {/* Switch Role */}
          <p className="text-center text-sm text-[var(--foreground-muted)] mt-6">
            Are you a merchant?{' '}
            <Link href="/auth/merchant/register" className="text-[var(--foreground)] hover:underline font-medium">
              Register as Merchant
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}

export default function ConsumerRegisterPage() {
  return (
    <GuestRoute>
      <ConsumerRegisterForm />
    </GuestRoute>
  );
}
