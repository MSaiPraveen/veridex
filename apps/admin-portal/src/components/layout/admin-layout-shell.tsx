'use client';

import { useState } from 'react';
import { useAdminAuth } from '@/lib/admin-auth-context';
import { AdminSidebar } from './admin-sidebar';
import { AdminHeader } from './admin-header';
import { DropdownManager } from '@/components/ui/dropdown';

interface AdminLayoutShellProps {
  children: React.ReactNode;
  title?: string;
  description?: string;
}

export function AdminLayoutShell({ children, title, description }: AdminLayoutShellProps) {
  const { isLoading, user } = useAdminAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Show loading state
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-100 dark:bg-slate-900">
        <div className="flex flex-col items-center gap-4">
          <div className="h-12 w-12 border-4 border-amber-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-slate-500 dark:text-slate-400">Loading admin portal...</p>
        </div>
      </div>
    );
  }

  // If not authenticated, don't render shell (auth context handles redirect)
  if (!user) {
    return null;
  }

  return (
    <DropdownManager>
      <div className="min-h-screen bg-slate-100 dark:bg-slate-900">
        {/* Mobile sidebar backdrop */}
        {sidebarOpen && (
          <div 
            className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm lg:hidden"
            onClick={() => setSidebarOpen(false)}
          />
        )}

        {/* Sidebar */}
        <AdminSidebar 
          isOpen={sidebarOpen} 
          onClose={() => setSidebarOpen(false)} 
        />

        {/* Main content area */}
        <div className="lg:pl-64">
          {/* Header */}
          <AdminHeader onMenuClick={() => setSidebarOpen(true)} />

          {/* Page content */}
          <main className="min-h-[calc(100vh-64px)]">
            <div className="px-4 sm:px-6 lg:px-8 py-6">
              {/* Page title if provided */}
              {(title || description) && (
                <div className="mb-6">
                  {title && (
                    <h1 className="text-2xl font-bold text-slate-900 dark:text-white">{title}</h1>
                  )}
                  {description && (
                    <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{description}</p>
                  )}
                </div>
              )}
              {children}
            </div>
          </main>
        </div>
      </div>
    </DropdownManager>
  );
}
