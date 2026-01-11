'use client';

import { useState, Suspense } from 'react';
import { useAdminAuth } from '@/lib/admin-auth-context';
import { AdminSidebar } from '@/components/layout/admin-sidebar';
import { AdminHeader } from '@/components/layout/admin-header';
import { DropdownManager } from '@/components/ui/dropdown';
import { useTheme } from '@/components/providers/theme-provider';

/**
 * AdminLayout - The single authoritative layout for all admin routes
 * 
 * This layout is NON-NEGOTIABLE:
 * - Always renders sidebar
 * - Always renders header
 * - Always provides consistent container
 * - Never crashes, never blanks out
 */

function AdminLayoutSkeleton() {
  return (
    <div className="min-h-screen bg-slate-100 dark:bg-slate-900">
      {/* Skeleton sidebar */}
      <aside className="fixed top-0 left-0 z-50 h-full w-64 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 hidden lg:block">
        <div className="h-16 px-4 border-b border-slate-200 dark:border-slate-800 flex items-center">
          <div className="h-8 w-32 bg-slate-200 dark:bg-slate-700 rounded animate-pulse" />
        </div>
        <div className="p-4 space-y-2">
          {[...Array(8)].map((_, i) => (
            <div key={i} className="h-10 bg-slate-100 dark:bg-slate-800 rounded animate-pulse" />
          ))}
        </div>
      </aside>
      
      {/* Skeleton main content */}
      <div className="lg:pl-64">
        <header className="sticky top-0 z-40 h-16 bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700">
          <div className="h-full px-4 flex items-center justify-between">
            <div className="h-8 w-48 bg-slate-200 dark:bg-slate-700 rounded animate-pulse" />
            <div className="h-8 w-32 bg-slate-200 dark:bg-slate-700 rounded animate-pulse" />
          </div>
        </header>
        <main className="min-h-[calc(100vh-64px)] p-6">
          <div className="animate-pulse space-y-4">
            <div className="h-8 w-64 bg-slate-200 dark:bg-slate-700 rounded" />
            <div className="h-4 w-96 bg-slate-200 dark:bg-slate-700 rounded" />
            <div className="grid grid-cols-4 gap-4 mt-6">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="h-32 bg-slate-200 dark:bg-slate-700 rounded" />
              ))}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}

function AuthenticatedLayout({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <DropdownManager>
      <div className="min-h-screen bg-slate-100 dark:bg-slate-900">
        {/* Mobile sidebar backdrop */}
        {sidebarOpen && (
          <div 
            className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm lg:hidden"
            onClick={() => setSidebarOpen(false)}
            aria-hidden="true"
          />
        )}

        {/* Sidebar - ALWAYS RENDERED */}
        <AdminSidebar 
          isOpen={sidebarOpen} 
          onClose={() => setSidebarOpen(false)} 
        />

        {/* Main content area */}
        <div className="lg:pl-64 min-h-screen flex flex-col">
          {/* Header - ALWAYS RENDERED */}
          <AdminHeader onMenuClick={() => setSidebarOpen(true)} />

          {/* Page content with guaranteed container */}
          <main className="flex-1 min-h-[calc(100vh-64px)]">
            <div className="px-4 sm:px-6 lg:px-8 py-6">
              <Suspense fallback={<PageLoadingState />}>
                {children}
              </Suspense>
            </div>
          </main>
        </div>
      </div>
    </DropdownManager>
  );
}

function PageLoadingState() {
  return (
    <div className="animate-pulse space-y-4">
      <div className="h-8 w-64 bg-slate-200 dark:bg-slate-700 rounded" />
      <div className="h-4 w-96 bg-slate-200 dark:bg-slate-700 rounded" />
      <div className="mt-6 space-y-4">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="h-24 bg-slate-200 dark:bg-slate-700 rounded" />
        ))}
      </div>
    </div>
  );
}

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const { isLoading, user } = useAdminAuth();
  const { mounted } = useTheme();

  // Wait for both auth and theme to be ready
  if (!mounted || isLoading) {
    return <AdminLayoutSkeleton />;
  }

  // If not authenticated, render nothing (auth context handles redirect)
  if (!user) {
    return <AdminLayoutSkeleton />;
  }

  // Render the full authenticated layout
  return <AuthenticatedLayout>{children}</AuthenticatedLayout>;
}
