'use client';

import Link from 'next/link';
import { Icons } from '@/components/ui/icons';

export default function NotFoundPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-[var(--background)] px-4">
      <div className="text-center max-w-md">
        <div className="inline-flex items-center justify-center h-20 w-20 rounded-full bg-[var(--muted)] mb-6">
          <Icons.alertCircle className="h-10 w-10 text-[var(--foreground-muted)]" />
        </div>
        
        <h1 className="text-6xl font-bold text-[var(--foreground)] mb-4">404</h1>
        <h2 className="text-xl font-semibold text-[var(--foreground)] mb-2">
          Page Not Found
        </h2>
        <p className="text-[var(--foreground-muted)] mb-8">
          The page you&apos;re looking for doesn&apos;t exist or has been moved.
        </p>
        
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link
            href="/"
            className="btn btn-primary inline-flex items-center gap-2"
          >
            <Icons.home size={18} />
            Go Home
          </Link>
          <button
            onClick={() => window.history.back()}
            className="btn btn-secondary inline-flex items-center gap-2"
          >
            <Icons.arrowLeft size={18} />
            Go Back
          </button>
        </div>
      </div>
    </div>
  );
}
