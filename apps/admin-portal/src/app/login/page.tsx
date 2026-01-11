'use client';

import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Shield, Eye, EyeOff, AlertCircle, Lock, Mail, ArrowRight, CheckCircle2, Sparkles } from 'lucide-react';
import { useAdminAuth } from '@/lib/admin-auth-context';

export default function AdminLoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { login, isLoading: authLoading } = useAdminAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Check for access denied error from redirect
  const accessDenied = searchParams.get('error') === 'access_denied';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      await login(email, password);
      // Success - auth context handles redirect
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Login failed';
      setError(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Don't render form if auth is still loading initial state
  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
        <div className="flex flex-col items-center gap-4">
          <div className="h-10 w-10 border-3 border-amber-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-white/70 text-sm">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col lg:flex-row bg-slate-950">
      {/* Left Panel - Stunning Gradient Branding */}
      <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden flex-col justify-between p-12 xl:p-16">
        {/* Animated Gradient Background */}
        <div className="absolute inset-0 bg-gradient-to-br from-violet-600 via-purple-600 to-indigo-700" />
        <div className="absolute inset-0 bg-gradient-to-tr from-amber-500/20 via-transparent to-pink-500/20" />
        
        {/* Animated Mesh Gradient Overlay */}
        <div className="absolute inset-0 opacity-30">
          <div className="absolute top-0 -left-4 w-72 h-72 bg-purple-300 rounded-full mix-blend-multiply filter blur-xl animate-blob" />
          <div className="absolute top-0 -right-4 w-72 h-72 bg-amber-300 rounded-full mix-blend-multiply filter blur-xl animate-blob animation-delay-2000" />
          <div className="absolute -bottom-8 left-20 w-72 h-72 bg-pink-300 rounded-full mix-blend-multiply filter blur-xl animate-blob animation-delay-4000" />
        </div>

        {/* Grid Pattern */}
        <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.05)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.05)_1px,transparent_1px)] bg-[size:50px_50px]" />

        {/* Content */}
        <div className="relative z-10 space-y-8">
          {/* Logo */}
          <div className="flex items-center gap-3">
            <div className="h-12 w-12 rounded-xl bg-white/10 backdrop-blur-sm border border-white/20 flex items-center justify-center shadow-2xl">
              <Shield className="h-7 w-7 text-amber-400" />
            </div>
            <span className="text-2xl font-bold text-white tracking-tight">Veridex Enterprise</span>
          </div>
        </div>

        <div className="relative z-10 space-y-8">
          <div className="space-y-6">
            <h1 className="text-5xl xl:text-6xl font-bold leading-tight text-white">
              Secure Compliance
              <br />
              <span className="bg-gradient-to-r from-amber-400 to-orange-400 bg-clip-text text-transparent">
                Management Platform
              </span>
            </h1>
            <p className="text-xl text-white/70 max-w-md leading-relaxed">
              Advanced document verification and risk intelligence for the modern enterprise.
            </p>
          </div>

          <div className="space-y-4 pt-4">
            {[
              'Enterprise-grade security & encryption',
              'Real-time compliance monitoring audit',
              'Automated risk assessment & scoring',
            ].map((item, i) => (
              <div key={i} className="flex items-center gap-3 text-white/90 group">
                <div className="h-6 w-6 rounded-full bg-gradient-to-r from-amber-400 to-orange-400 flex items-center justify-center shadow-lg shadow-amber-500/30 group-hover:scale-110 transition-transform">
                  <CheckCircle2 className="h-4 w-4 text-white" />
                </div>
                <span className="text-sm font-medium">{item}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="relative z-10 text-sm text-white/50 font-medium">
          <p>© {new Date().getFullYear()} Veridex Inc. All rights reserved.</p>
        </div>
      </div>

      {/* Right Panel - Dark Elegant Login Form */}
      <div className="flex-1 flex flex-col justify-center items-center p-6 sm:p-8 lg:p-12 relative">
        {/* Dark gradient background */}
        <div className="absolute inset-0 bg-gradient-to-br from-slate-900 via-slate-900 to-slate-950" />
        {/* Accent glow from left panel */}
        <div className="absolute left-0 top-0 bottom-0 w-32 bg-gradient-to-r from-purple-600/10 to-transparent" />
        {/* Subtle grid pattern */}
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_1px_1px,rgba(255,255,255,0.03)_1px,transparent_0)] [background-size:32px_32px]" />

        <div className="w-full max-w-[420px] relative z-10">
          {/* Mobile Logo */}
          <div className="lg:hidden flex flex-col items-center gap-3 mb-10">
            <div className="h-14 w-14 rounded-2xl bg-gradient-to-br from-violet-600 to-purple-600 flex items-center justify-center shadow-xl shadow-purple-500/30">
              <Shield className="h-8 w-8 text-white" />
            </div>
            <span className="text-2xl font-bold text-white">Veridex Enterprise</span>
          </div>

          {/* Form Card - Dark theme with proper contrast */}
          <div className="rounded-2xl shadow-2xl shadow-black/40 border border-slate-700/50 p-8" style={{ backgroundColor: '#0f172a' }}>
            <div className="text-center space-y-2 mb-8">
              <h2 className="text-2xl font-bold text-white">Welcome back</h2>
              <p className="text-sm text-slate-400">
                Enter your credentials to access the admin portal
              </p>
            </div>

            {/* Access Denied Alert */}
            {accessDenied && (
              <div className="mb-6 p-4 bg-red-900/30 border border-red-800/50 rounded-xl flex gap-3">
                <AlertCircle className="h-5 w-5 text-red-400 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-semibold text-red-300">Access Denied</p>
                  <p className="text-sm text-red-400">You do not have permission to access the admin portal.</p>
                </div>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-5">
              {error && (
                <div className="p-4 bg-red-900/30 border border-red-800/50 rounded-xl text-sm text-red-400 flex items-center gap-3">
                  <AlertCircle className="h-5 w-5 flex-shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-slate-300" htmlFor="email">
                    Email Address
                  </label>
                  <div className="relative group">
                    <Mail className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400 group-focus-within:text-amber-500 transition-colors z-10" />
                    <input
                      id="email"
                      type="email"
                      name="email"
                      autoComplete="off"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      disabled={isSubmitting}
                      required
                      style={{ 
                        color: '#e2e8f0', 
                        backgroundColor: '#1e293b',
                        caretColor: '#e2e8f0'
                      }}
                      className="w-full h-12 pl-12 pr-4 rounded-xl border border-slate-600 placeholder:text-slate-500 focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-500/30 transition-all text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                      placeholder="admin@veridex.io"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-sm font-semibold text-slate-300" htmlFor="password">
                      Password
                    </label>
                    <button type="button" className="text-xs font-semibold text-amber-500 hover:text-amber-400 transition-colors">
                      Forgot password?
                    </button>
                  </div>
                  <div className="relative group">
                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400 group-focus-within:text-amber-500 transition-colors z-10" />
                    <input
                      id="password"
                      type={showPassword ? 'text' : 'password'}
                      name="password"
                      autoComplete="off"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      disabled={isSubmitting}
                      required
                      style={{ 
                        color: '#e2e8f0', 
                        backgroundColor: '#1e293b',
                        caretColor: '#e2e8f0'
                      }}
                      className="w-full h-12 pl-12 pr-12 rounded-xl border border-slate-600 placeholder:text-slate-500 focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-500/30 transition-all text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                      placeholder="••••••••"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      disabled={isSubmitting}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200 disabled:opacity-50 transition-colors z-10"
                    >
                      {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                    </button>
                  </div>
                </div>
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full h-12 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white font-semibold rounded-xl transition-all duration-200 flex items-center justify-center gap-2 group disabled:opacity-70 disabled:cursor-wait shadow-lg shadow-amber-500/25 hover:shadow-xl hover:shadow-amber-500/35 hover:-translate-y-0.5 active:translate-y-0"
              >
                {isSubmitting ? (
                  <>
                    <div className="h-5 w-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Signing in...</span>
                  </>
                ) : (
                  <>
                    <span>Sign in</span>
                    <ArrowRight className="h-5 w-5 group-hover:translate-x-0.5 transition-transform" />
                  </>
                )}
              </button>
            </form>
          </div>

          <div className="mt-8 text-center space-y-4">
            <div className="flex justify-center gap-6 text-xs text-slate-500">
              <a href="#" className="hover:text-amber-500 transition-colors">Privacy Policy</a>
              <a href="#" className="hover:text-amber-500 transition-colors">Terms of Service</a>
              <a href="#" className="hover:text-amber-500 transition-colors">Help Center</a>
            </div>
            <p className="text-xs text-slate-600">
              Protected by enterprise-grade security.
            </p>
          </div>
        </div>
      </div>

      {/* Custom Animations */}
      <style jsx>{`
        @keyframes blob {
          0% { transform: translate(0px, 0px) scale(1); }
          33% { transform: translate(30px, -50px) scale(1.1); }
          66% { transform: translate(-20px, 20px) scale(0.9); }
          100% { transform: translate(0px, 0px) scale(1); }
        }
        .animate-blob {
          animation: blob 7s infinite;
        }
        .animation-delay-2000 {
          animation-delay: 2s;
        }
        .animation-delay-4000 {
          animation-delay: 4s;
        }
      `}</style>
    </div>
  );
}
