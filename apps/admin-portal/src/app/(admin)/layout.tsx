/**
 * Admin Layout - OPTIMIZED FOR PERFORMANCE
 * 
 * Strategy:
 * - Main layout structure is server-rendered (no 'use client')
 * - Interactive elements (sidebar toggle, header) are client components
 * - Auth check happens server-side where possible
 * - Theme is applied via CSS, not JS hydration
 * 
 * This eliminates the "Compiling..." message on navigation
 */

import { Suspense } from 'react';
import { AdminLayoutClient } from '@/components/layout/admin-layout-client';

// Server Component - Fast Loading Skeleton
function PageLoadingState() {
  return (
    <div className="animate-pulse space-y-4">
      <div className="h-8 w-64 bg-slate-200 dark:bg-slate-700 rounded" />
      <div className="h-4 w-96 bg-slate-200 dark:bg-slate-700 rounded" />
      <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="h-32 bg-slate-200 dark:bg-slate-700 rounded-xl" />
        ))}
      </div>
    </div>
  );
}

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  // Server component - renders immediately without compilation
  // Auth check is delegated to the client component for interactivity
  return (
    <AdminLayoutClient>
      <Suspense fallback={<PageLoadingState />}>
        {children}
      </Suspense>
    </AdminLayoutClient>
  );
}
