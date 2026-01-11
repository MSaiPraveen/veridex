'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Icons } from '@/components/ui/icons';
import { useTheme } from '@/components/providers/theme-provider';
import { useAuth } from '@/lib/auth-context';
import { GuestRoute } from '@/components/auth/protected-route';

const INDUSTRIES = [
  { value: '', label: 'Select your industry' },
  { value: 'CANNABIS', label: 'Cannabis' },
  { value: 'HEMP_CBD', label: 'Hemp / CBD' },
  { value: 'SUPPLEMENT', label: 'Dietary Supplements' },
  { value: 'PHARMA', label: 'Pharmaceuticals' },
  { value: 'PEPTIDE', label: 'Peptides' },
  { value: 'COSMETICS', label: 'Cosmetics' },
  { value: 'FOOD_BEVERAGE', label: 'Food & Beverage' },
  { value: 'OTHER', label: 'Other' },
];

function MerchantRegisterForm() {
  const { theme, toggleTheme } = useTheme();
  const { register, isLoading } = useAuth();
  
  const [formData, setFormData] = useState({
    companyName: '',
    industry: '',
    email: '',
    password: '',
    confirmPassword: '',
  });
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!formData.companyName.trim()) {
      setError('Company name is required');
      return;
    }

    if (!formData.industry) {
      setError('Please select your industry');
      return;
    }

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
        firstName: formData.companyName,
        companyName: formData.companyName,
        industry: formData.industry,
        role: 'MERCHANT',
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
                Register Your Business
              </h1>
              <p className="text-sm text-[var(--foreground-muted)] mt-2">
                Create a merchant account to manage compliance
              </p>
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
                <label htmlFor="companyName" className="block text-sm font-medium text-[var(--foreground)] mb-1.5">
                  Company name <span className="text-red-500">*</span>
                </label>
                <input
                  id="companyName"
                  name="companyName"
                  type="text"
                  placeholder="Acme Corporation"
                  className="input"
                  required
                  value={formData.companyName}
                  onChange={handleChange}
                  disabled={isSubmitting}
                />
              </div>

              <div>
                <label htmlFor="industry" className="block text-sm font-medium text-[var(--foreground)] mb-1.5">
                  Industry <span className="text-red-500">*</span>
                </label>
                <select
                  id="industry"
                  name="industry"
                  className="input"
                  required
                  value={formData.industry}
                  onChange={handleChange}
                  disabled={isSubmitting}
                >
                  {INDUSTRIES.map(industry => (
                    <option key={industry.value} value={industry.value}>
                      {industry.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label htmlFor="email" className="block text-sm font-medium text-[var(--foreground)] mb-1.5">
                  Company email <span className="text-red-500">*</span>
                </label>
                <input
                  id="email"
                  name="email"
                  type="email"
                  placeholder="contact@company.com"
                  className="input"
                  required
                  value={formData.email}
                  onChange={handleChange}
                  disabled={isSubmitting}
                />
                <p className="text-xs text-[var(--foreground-muted)] mt-1">
                  Use your official company email address
                </p>
              </div>

              <div>
                <label htmlFor="password" className="block text-sm font-medium text-[var(--foreground)] mb-1.5">
                  Password <span className="text-red-500">*</span>
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
                  Min 8 characters with uppercase, lowercase, and number
                </p>
              </div>

              <div>
                <label htmlFor="confirmPassword" className="block text-sm font-medium text-[var(--foreground)] mb-1.5">
                  Confirm password <span className="text-red-500">*</span>
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
                className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-emerald-500 to-emerald-600 text-white font-semibold hover:from-emerald-600 hover:to-emerald-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <span className="flex items-center justify-center gap-2">
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Creating account...
                  </span>
                ) : (
                  'Register Company'
                )}
              </button>

              <p className="text-xs text-center text-[var(--foreground-muted)]">
                By registering, you agree to our{' '}
                <Link href="/terms" className="text-emerald-600 hover:underline">Terms of Service</Link>,{' '}
                <Link href="/privacy" className="text-emerald-600 hover:underline">Privacy Policy</Link>,
                and <Link href="/merchant-agreement" className="text-emerald-600 hover:underline">Merchant Agreement</Link>
              </p>
            </form>

            {/* Footer */}
            <p className="text-center text-sm text-[var(--foreground-muted)] mt-6">
              Already have an account?{' '}
              <Link href="/auth/merchant/login" className="text-emerald-600 hover:underline font-medium">
                Sign in
              </Link>
            </p>
          </div>

          {/* Switch Role */}
          <p className="text-center text-sm text-[var(--foreground-muted)] mt-6">
            Just want to browse products?{' '}
            <Link href="/auth/consumer/register" className="text-[var(--foreground)] hover:underline font-medium">
              Register as Consumer
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}

export default function MerchantRegisterPage() {
  return (
    <GuestRoute>
      <MerchantRegisterForm />
    </GuestRoute>
  );
}
