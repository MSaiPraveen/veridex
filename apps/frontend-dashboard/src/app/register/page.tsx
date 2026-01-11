"use client";

import { useState } from "react";
import Link from "next/link";
import { Icons } from "@/components/ui/icons";
import { useTheme } from "@/components/providers/theme-provider";
import { useAuth } from "@/lib/auth-context";
import { GuestRoute } from "@/components/auth/protected-route";

function RegisterForm() {
  const { theme, toggleTheme } = useTheme();
  const { register, isLoading } = useAuth();
  
  const [formData, setFormData] = useState({
    email: "",
    password: "",
    confirmPassword: "",
    firstName: "",
    lastName: "",
    role: "MERCHANT" as "MERCHANT" | "CONSUMER",
    agreeTerms: false,
  });
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === "checkbox" ? (e.target as HTMLInputElement).checked : value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Validation
    if (formData.password !== formData.confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    if (formData.password.length < 8) {
      setError("Password must be at least 8 characters");
      return;
    }

    if (!formData.agreeTerms) {
      setError("You must agree to the terms and conditions");
      return;
    }

    setIsSubmitting(true);

    try {
      await register({
        email: formData.email,
        password: formData.password,
        firstName: formData.firstName || undefined,
        lastName: formData.lastName || undefined,
        role: formData.role,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Registration failed. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[var(--primary)]" />
      </div>
    );
  }

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
            <div className="flex items-center gap-3">
              <button
                onClick={toggleTheme}
                className="p-2 rounded-lg hover:bg-[var(--muted)] transition-colors"
                aria-label="Toggle theme"
              >
                {theme === "light" ? (
                  <Icons.moon size={20} className="text-[var(--foreground-muted)]" />
                ) : (
                  <Icons.sun size={20} className="text-[var(--foreground-muted)]" />
                )}
              </button>
              <Link
                href="/login"
                className="hidden sm:flex items-center gap-2 px-4 py-2 rounded-lg bg-[var(--muted)] text-sm font-medium text-[var(--foreground)] hover:bg-[var(--background)] border border-[var(--border)] transition-colors"
              >
                Sign In
              </Link>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex-1 flex items-center justify-center p-4 pt-20">
        <div className="w-full max-w-md">
          {/* Auth Card */}
          <div className="card p-8 backdrop-blur-xl bg-[var(--card-bg)] border border-[var(--border)] shadow-xl">
            {/* Logo & Header */}
            <div className="text-center mb-6">
              <div className="flex justify-center mb-4">
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-emerald-500 to-emerald-600 flex items-center justify-center shadow-lg shadow-emerald-500/30">
                  <Icons.userPlus size={32} className="text-white" />
                </div>
              </div>
              <h1 className="text-2xl font-bold text-[var(--foreground)]">
                Create Your Account
              </h1>
              <p className="mt-2 text-sm text-[var(--foreground-muted)]">
                Join Veridex to manage compliance
              </p>
            </div>

            {/* Error Message */}
            {error && (
              <div className="mb-4 p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-600 text-sm">
                {error}
              </div>
            )}

            {/* Register Form */}
            <form className="space-y-4" onSubmit={handleSubmit}>
              <div className="grid grid-cols-2 gap-3">
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
                  placeholder="you@company.com"
                  className="input"
                  required
                  value={formData.email}
                  onChange={handleChange}
                  disabled={isSubmitting}
                />
              </div>

              <div>
                <label htmlFor="role" className="block text-sm font-medium text-[var(--foreground)] mb-1.5">
                  Account type
                </label>
                <select
                  id="role"
                  name="role"
                  className="input"
                  value={formData.role}
                  onChange={handleChange}
                  disabled={isSubmitting}
                >
                  <option value="MERCHANT">Merchant / Supplier</option>
                  <option value="CONSUMER">Consumer / Buyer</option>
                </select>
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

              <div className="flex items-start">
                <input
                  id="agreeTerms"
                  name="agreeTerms"
                  type="checkbox"
                  className="w-4 h-4 mt-0.5 rounded border-[var(--border)] text-primary-600 focus:ring-primary-500"
                  checked={formData.agreeTerms}
                  onChange={handleChange}
                  disabled={isSubmitting}
                />
                <label htmlFor="agreeTerms" className="ml-2 text-sm text-[var(--foreground-muted)]">
                  I agree to the{" "}
                  <Link href="/terms" className="text-primary-600 hover:text-primary-500">
                    Terms of Service
                  </Link>{" "}
                  and{" "}
                  <Link href="/privacy" className="text-primary-600 hover:text-primary-500">
                    Privacy Policy
                  </Link>
                </label>
              </div>

              <button 
                type="submit" 
                className="btn btn-primary w-full flex items-center justify-center"
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                    Creating account...
                  </>
                ) : (
                  "Create account"
                )}
              </button>
            </form>

            {/* Sign In Link */}
            <p className="mt-6 text-center text-sm text-[var(--foreground-muted)]">
              Already have an account?{" "}
              <Link
                href="/login"
                className="font-medium text-primary-600 hover:text-primary-500"
              >
                Sign in
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function RegisterPage() {
  return (
    <GuestRoute>
      <RegisterForm />
    </GuestRoute>
  );
}
