'use client';

import Link from 'next/link';
import { Icons } from '@/components/ui/icons';
import { useTheme } from '@/components/providers/theme-provider';
import { useAuth } from '@/lib/auth-context';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

export default function LandingPage() {
  const { theme, toggleTheme } = useTheme();
  const { isAuthenticated, user, isLoading } = useAuth();
  const router = useRouter();
  const [scrolled, setScrolled] = useState(false);

  // Handle scroll for navbar effect
  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // If already authenticated, redirect to role-specific dashboard
  useEffect(() => {
    if (!isLoading && isAuthenticated && user) {
      switch (user.role) {
        case 'ADMIN':
        case 'SUPER_ADMIN':
          router.push('/admin');
          break;
        case 'MERCHANT':
          router.push('/merchant');
          break;
        case 'CONSUMER':
          router.push('/consumer');
          break;
      }
    }
  }, [isAuthenticated, user, isLoading, router]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--background)]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[var(--primary)]" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[var(--background)]">
      {/* Navigation */}
      <nav className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        scrolled 
          ? 'bg-[var(--background)]/95 backdrop-blur-xl border-b border-[var(--border)] shadow-sm' 
          : 'bg-transparent'
      }`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <div className="flex items-center gap-3">
              <Icons.logo size={36} />
              <span className="text-xl font-bold text-[var(--foreground)]">Veridex</span>
            </div>

            {/* Nav Links */}
            <div className="hidden md:flex items-center gap-8">
              <a href="#features" className="text-sm font-medium text-[var(--foreground-muted)] hover:text-[var(--foreground)] transition-colors">
                Features
              </a>
              <a href="#how-it-works" className="text-sm font-medium text-[var(--foreground-muted)] hover:text-[var(--foreground)] transition-colors">
                How It Works
              </a>
              <a href="#trust" className="text-sm font-medium text-[var(--foreground-muted)] hover:text-[var(--foreground)] transition-colors">
                Trust & Security
              </a>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-3">
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
              <Link 
                href="/auth/consumer/login"
                className="hidden sm:inline-flex px-4 py-2 text-sm font-medium text-[var(--foreground)] hover:text-[var(--primary)] transition-colors"
              >
                Sign In
              </Link>
              <Link 
                href="/auth/merchant/register"
                className="hidden sm:inline-flex px-4 py-2 bg-[var(--primary)] text-white rounded-lg text-sm font-medium hover:opacity-90 transition-opacity"
              >
                Get Started
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative pt-24 pb-20 px-4 sm:px-6 lg:px-8 overflow-hidden">
        {/* Background Elements */}
        <div className="absolute inset-0 -z-10">
          <div className="absolute top-0 left-1/4 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl" />
          <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl" />
          <div className="absolute inset-0 bg-[linear-gradient(rgba(var(--primary-rgb),0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(var(--primary-rgb),0.03)_1px,transparent_1px)] bg-[size:40px_40px]" />
        </div>

        <div className="max-w-7xl mx-auto">
          <div className="text-center max-w-4xl mx-auto pt-12">
            {/* Badge */}
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-gradient-to-r from-blue-500/10 to-emerald-500/10 border border-[var(--primary)]/20 mb-8 animate-fade-in">
              <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-sm font-medium bg-gradient-to-r from-blue-600 to-emerald-600 bg-clip-text text-transparent">
                Trusted by 500+ Businesses Worldwide
              </span>
            </div>

            {/* Headline */}
            <h1 className="text-4xl sm:text-5xl lg:text-7xl font-bold text-[var(--foreground)] leading-tight mb-6">
              Regulatory Compliance
              <br />
              <span className="bg-gradient-to-r from-blue-600 via-violet-600 to-emerald-600 bg-clip-text text-transparent">Made Simple</span>
            </h1>

            {/* Subheadline */}
            <p className="text-lg sm:text-xl text-[var(--foreground-muted)] mb-8 max-w-2xl mx-auto leading-relaxed">
              Streamline your compliance workflow with real-time verification, 
              automated document management, and comprehensive audit trails.
            </p>

            {/* Stats Row */}
            <div className="flex flex-wrap items-center justify-center gap-8 mb-12">
              <div className="text-center">
                <p className="text-3xl font-bold text-[var(--foreground)]">99.9%</p>
                <p className="text-sm text-[var(--foreground-muted)]">Uptime SLA</p>
              </div>
              <div className="w-px h-10 bg-[var(--border)] hidden sm:block" />
              <div className="text-center">
                <p className="text-3xl font-bold text-[var(--foreground)]">500+</p>
                <p className="text-sm text-[var(--foreground-muted)]">Businesses</p>
              </div>
              <div className="w-px h-10 bg-[var(--border)] hidden sm:block" />
              <div className="text-center">
                <p className="text-3xl font-bold text-[var(--foreground)]">10K+</p>
                <p className="text-sm text-[var(--foreground-muted)]">Products Verified</p>
              </div>
            </div>

            {/* Role Selection Cards */}
            <div className="grid sm:grid-cols-2 gap-6 max-w-3xl mx-auto">
              {/* Consumer Card */}
              <Link 
                href="/auth/consumer/login"
                className="group relative p-8 rounded-2xl bg-[var(--card)] border border-[var(--border)] hover:border-blue-500/50 hover:shadow-2xl hover:shadow-blue-500/10 transition-all duration-300 text-left"
              >
                <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 to-transparent rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity" />
                <div className="relative">
                  <div className="flex items-center justify-between mb-4">
                    <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center group-hover:scale-110 transition-transform shadow-lg shadow-blue-500/25">
                      <Icons.user size={28} className="text-white" />
                    </div>
                    <Icons.chevronRight size={20} className="text-[var(--foreground-muted)] group-hover:text-blue-500 group-hover:translate-x-1 transition-all" />
                  </div>
                  <h3 className="text-xl font-bold text-[var(--foreground)] mb-2">
                    I&apos;m a Consumer
                  </h3>
                  <p className="text-sm text-[var(--foreground-muted)] leading-relaxed">
                    Browse verified products, check compliance status, and make informed purchasing decisions.
                  </p>
                  <div className="mt-4 flex items-center gap-2 text-sm font-medium text-blue-600 dark:text-blue-400">
                    Start browsing <Icons.chevronRight size={14} />
                  </div>
                </div>
              </Link>

              {/* Merchant Card */}
              <Link 
                href="/auth/merchant/login"
                className="group relative p-8 rounded-2xl bg-[var(--card)] border border-[var(--border)] hover:border-emerald-500/50 hover:shadow-2xl hover:shadow-emerald-500/10 transition-all duration-300 text-left"
              >
                <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/5 to-transparent rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity" />
                <div className="relative">
                  <div className="flex items-center justify-between mb-4">
                    <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-emerald-500 to-emerald-600 flex items-center justify-center group-hover:scale-110 transition-transform shadow-lg shadow-emerald-500/25">
                      <Icons.building size={28} className="text-white" />
                    </div>
                    <Icons.chevronRight size={20} className="text-[var(--foreground-muted)] group-hover:text-emerald-500 group-hover:translate-x-1 transition-all" />
                  </div>
                  <h3 className="text-xl font-bold text-[var(--foreground)] mb-2">
                    I&apos;m a Merchant
                  </h3>
                  <p className="text-sm text-[var(--foreground-muted)] leading-relaxed">
                    Manage products, upload compliance documents, and maintain regulatory standards.
                  </p>
                  <div className="mt-4 flex items-center gap-2 text-sm font-medium text-emerald-600 dark:text-emerald-400">
                    Get started <Icons.chevronRight size={14} />
                  </div>
                </div>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-24 px-4 sm:px-6 lg:px-8 bg-[var(--muted)]/30">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <span className="inline-block px-3 py-1 text-xs font-semibold text-[var(--primary)] bg-[var(--primary)]/10 rounded-full mb-4">
              FEATURES
            </span>
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-[var(--foreground)] mb-4">
              Everything you need for compliance
            </h2>
            <p className="text-lg text-[var(--foreground-muted)] max-w-2xl mx-auto">
              A complete platform for regulatory compliance management, document verification, and audit tracking.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {/* Feature 1 */}
            <div className="group p-8 rounded-2xl bg-[var(--card)] border border-[var(--border)] hover:shadow-xl transition-all duration-300">
              <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform shadow-lg shadow-blue-500/25">
                <Icons.shield size={28} className="text-white" />
              </div>
              <h3 className="text-xl font-bold text-[var(--foreground)] mb-3">
                Real-Time Verification
              </h3>
              <p className="text-[var(--foreground-muted)] leading-relaxed">
                Instant compliance checks against regulatory requirements with automated status updates and alerts.
              </p>
            </div>

            {/* Feature 2 */}
            <div className="group p-8 rounded-2xl bg-[var(--card)] border border-[var(--border)] hover:shadow-xl transition-all duration-300">
              <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-emerald-500 to-emerald-600 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform shadow-lg shadow-emerald-500/25">
                <Icons.upload size={28} className="text-white" />
              </div>
              <h3 className="text-xl font-bold text-[var(--foreground)] mb-3">
                Document Management
              </h3>
              <p className="text-[var(--foreground-muted)] leading-relaxed">
                Secure upload, storage, and tracking of licenses, certificates, and lab reports in one place.
              </p>
            </div>

            {/* Feature 3 */}
            <div className="group p-8 rounded-2xl bg-[var(--card)] border border-[var(--border)] hover:shadow-xl transition-all duration-300">
              <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-amber-500 to-orange-500 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform shadow-lg shadow-amber-500/25">
                <Icons.clipboardCheck size={28} className="text-white" />
              </div>
              <h3 className="text-xl font-bold text-[var(--foreground)] mb-3">
                Comprehensive Audits
              </h3>
              <p className="text-[var(--foreground-muted)] leading-relaxed">
                Complete history of all compliance activities for regulatory audits, reviews, and reporting.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section id="how-it-works" className="py-24 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <span className="inline-block px-3 py-1 text-xs font-semibold text-[var(--primary)] bg-[var(--primary)]/10 rounded-full mb-4">
              HOW IT WORKS
            </span>
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-[var(--foreground)] mb-4">
              Get Started in Minutes
            </h2>
            <p className="text-lg text-[var(--foreground-muted)] max-w-2xl mx-auto">
              Three simple steps to compliance confidence.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8 relative">
            {/* Connecting Line */}
            <div className="hidden md:block absolute top-12 left-1/4 right-1/4 h-0.5 bg-gradient-to-r from-blue-500 via-violet-500 to-emerald-500" />
            
            {/* Step 1 */}
            <div className="text-center relative">
              <div className="w-24 h-24 rounded-2xl bg-gradient-to-br from-blue-500 to-blue-600 text-white text-3xl font-bold flex items-center justify-center mx-auto mb-6 shadow-xl shadow-blue-500/25 relative z-10">
                1
              </div>
              <h3 className="text-xl font-bold text-[var(--foreground)] mb-3">
                Upload Documents
              </h3>
              <p className="text-[var(--foreground-muted)]">
                Submit your licenses, lab reports, and compliance documents securely.
              </p>
            </div>

            {/* Step 2 */}
            <div className="text-center relative">
              <div className="w-24 h-24 rounded-2xl bg-gradient-to-br from-violet-500 to-purple-600 text-white text-3xl font-bold flex items-center justify-center mx-auto mb-6 shadow-xl shadow-violet-500/25 relative z-10">
                2
              </div>
              <h3 className="text-xl font-bold text-[var(--foreground)] mb-3">
                Automated Verification
              </h3>
              <p className="text-[var(--foreground-muted)]">
                Our system validates your documents against current regulatory requirements.
              </p>
            </div>

            {/* Step 3 */}
            <div className="text-center relative">
              <div className="w-24 h-24 rounded-2xl bg-gradient-to-br from-emerald-500 to-emerald-600 text-white text-3xl font-bold flex items-center justify-center mx-auto mb-6 shadow-xl shadow-emerald-500/25 relative z-10">
                3
              </div>
              <h3 className="text-xl font-bold text-[var(--foreground)] mb-3">
                Compliance Dashboard
              </h3>
              <p className="text-[var(--foreground-muted)]">
                Track your compliance status in real-time with actionable insights.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Trust Section */}
      <section id="trust" className="py-24 px-4 sm:px-6 lg:px-8 bg-[var(--muted)]/30">
        <div className="max-w-7xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div>
              <span className="inline-block px-3 py-1 text-xs font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 rounded-full mb-4">
                TRUSTED & SECURE
              </span>
              <h2 className="text-3xl sm:text-4xl font-bold text-[var(--foreground)] mb-6">
                Enterprise-Grade Security for Your Compliance Data
              </h2>
              <p className="text-lg text-[var(--foreground-muted)] mb-8">
                Your compliance data is protected with bank-level encryption and security measures. 
                We take data privacy seriously and comply with all major regulatory standards.
              </p>
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-emerald-500/10 flex items-center justify-center">
                    <Icons.shield size={20} className="text-emerald-600 dark:text-emerald-400" />
                  </div>
                  <span className="text-[var(--foreground)]">256-bit SSL Encryption</span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-emerald-500/10 flex items-center justify-center">
                    <Icons.lock size={20} className="text-emerald-600 dark:text-emerald-400" />
                  </div>
                  <span className="text-[var(--foreground)]">SOC 2 Type II Compliant</span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-emerald-500/10 flex items-center justify-center">
                    <Icons.check size={20} className="text-emerald-600 dark:text-emerald-400" />
                  </div>
                  <span className="text-[var(--foreground)]">GDPR & CCPA Ready</span>
                </div>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="p-6 rounded-2xl bg-[var(--card)] border border-[var(--border)]">
                <p className="text-4xl font-bold text-[var(--foreground)] mb-2">99.9%</p>
                <p className="text-sm text-[var(--foreground-muted)]">Uptime Guarantee</p>
              </div>
              <div className="p-6 rounded-2xl bg-[var(--card)] border border-[var(--border)]">
                <p className="text-4xl font-bold text-[var(--foreground)] mb-2">24/7</p>
                <p className="text-sm text-[var(--foreground-muted)]">Support Available</p>
              </div>
              <div className="p-6 rounded-2xl bg-[var(--card)] border border-[var(--border)]">
                <p className="text-4xl font-bold text-[var(--foreground)] mb-2">&lt;1s</p>
                <p className="text-sm text-[var(--foreground-muted)]">Verification Speed</p>
              </div>
              <div className="p-6 rounded-2xl bg-[var(--card)] border border-[var(--border)]">
                <p className="text-4xl font-bold text-[var(--foreground)] mb-2">100%</p>
                <p className="text-sm text-[var(--foreground-muted)]">Audit Trail</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24 px-4 sm:px-6 lg:px-8 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-blue-600 via-violet-600 to-emerald-600" />
        <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.05)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.05)_1px,transparent_1px)] bg-[size:30px_30px]" />
        
        <div className="max-w-4xl mx-auto text-center relative z-10">
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-white mb-6">
            Ready to simplify your compliance?
          </h2>
          <p className="text-xl text-white/80 mb-10 max-w-2xl mx-auto">
            Join 500+ businesses already using Veridex to streamline their regulatory compliance.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link 
              href="/auth/consumer/register"
              className="px-8 py-4 rounded-xl bg-white text-violet-600 font-semibold hover:bg-white/90 transition-colors shadow-xl"
            >
              Get Started Free
            </Link>
            <Link 
              href="/auth/merchant/register"
              className="px-8 py-4 rounded-xl bg-white/10 text-white font-semibold border border-white/20 hover:bg-white/20 transition-colors backdrop-blur-sm"
            >
              Register as Merchant
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-16 px-4 sm:px-6 lg:px-8 bg-[var(--card)] border-t border-[var(--border)]">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-12">
            <div className="col-span-2 md:col-span-1">
              <div className="flex items-center gap-3 mb-4">
                <Icons.logo size={32} />
                <span className="text-xl font-bold text-[var(--foreground)]">Veridex</span>
              </div>
              <p className="text-sm text-[var(--foreground-muted)]">
                Enterprise-grade compliance platform for modern businesses.
              </p>
            </div>
            <div>
              <h4 className="font-semibold text-[var(--foreground)] mb-4">Product</h4>
              <ul className="space-y-2 text-sm text-[var(--foreground-muted)]">
                <li><a href="#features" className="hover:text-[var(--foreground)] transition-colors">Features</a></li>
                <li><a href="#how-it-works" className="hover:text-[var(--foreground)] transition-colors">How It Works</a></li>
                <li><a href="#" className="hover:text-[var(--foreground)] transition-colors">Pricing</a></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold text-[var(--foreground)] mb-4">Company</h4>
              <ul className="space-y-2 text-sm text-[var(--foreground-muted)]">
                <li><a href="#" className="hover:text-[var(--foreground)] transition-colors">About</a></li>
                <li><a href="#" className="hover:text-[var(--foreground)] transition-colors">Careers</a></li>
                <li><a href="#" className="hover:text-[var(--foreground)] transition-colors">Contact</a></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold text-[var(--foreground)] mb-4">Legal</h4>
              <ul className="space-y-2 text-sm text-[var(--foreground-muted)]">
                <li><a href="#" className="hover:text-[var(--foreground)] transition-colors">Privacy</a></li>
                <li><a href="#" className="hover:text-[var(--foreground)] transition-colors">Terms</a></li>
                <li><a href="#" className="hover:text-[var(--foreground)] transition-colors">Security</a></li>
              </ul>
            </div>
          </div>
          <div className="pt-8 border-t border-[var(--border)] flex flex-col md:flex-row items-center justify-between gap-4">
            <p className="text-sm text-[var(--foreground-muted)]">
              © 2026 Veridex. All rights reserved.
            </p>
            <div className="flex items-center gap-6 text-sm text-[var(--foreground-muted)]">
              <a href="#" className="hover:text-[var(--foreground)] transition-colors">Privacy</a>
              <a href="#" className="hover:text-[var(--foreground)] transition-colors">Terms</a>
              <a href="#" className="hover:text-[var(--foreground)] transition-colors">Contact</a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
