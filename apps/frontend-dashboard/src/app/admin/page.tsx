'use client';

import { DashboardLayout, PageHeader } from '@/components/layout';
import { Icons } from '@/components/ui/icons';
import Link from 'next/link';
import { useAuth } from '@/lib/auth-context';
import { useDashboardStats, useAuditLogs, AuditLog } from '@/lib/hooks';

function formatRelativeTime(date: string): string {
  const now = new Date();
  const then = new Date(date);
  const diffMs = now.getTime() - then.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  
  if (diffMins < 1) return 'just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  
  const diffDays = Math.floor(diffHours / 24);
  return `${diffDays}d ago`;
}

export default function AdminDashboard() {
  const { user } = useAuth();
  // Pass user role to useDashboardStats to ensure role-appropriate API calls
  const { stats, isLoading: statsLoading } = useDashboardStats(user?.role);
  const { data: auditData, isLoading: auditLoading } = useAuditLogs({ limit: '10' });

  const recentAudits = auditData?.data?.slice(0, 8) || [];

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <PageHeader
          title="Admin Dashboard"
          description="System overview and management"
        />

        {/* Stats Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="card p-5 border-l-4 border-l-amber-500">
            <div className="flex items-center justify-between mb-3">
              <div className="p-2 rounded-lg bg-amber-50 dark:bg-amber-900/20">
                <Icons.package className="text-amber-600 dark:text-amber-400" size={20} />
              </div>
            </div>
            {statsLoading ? (
              <div className="w-16 h-8 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
            ) : (
              <p className="text-2xl font-semibold text-[var(--foreground)]">
                {stats?.productsCount?.toLocaleString() || 0}
              </p>
            )}
            <p className="text-sm text-[var(--foreground-muted)] mt-1">Total Products</p>
          </div>

          <div className="card p-5 border-l-4 border-l-emerald-500">
            <div className="flex items-center justify-between mb-3">
              <div className="p-2 rounded-lg bg-emerald-50 dark:bg-emerald-900/20">
                <Icons.clipboardCheck className="text-emerald-600 dark:text-emerald-400" size={20} />
              </div>
            </div>
            {statsLoading ? (
              <div className="w-16 h-8 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
            ) : (
              <p className="text-2xl font-semibold text-[var(--foreground)]">
                {stats?.complianceScore?.toFixed(1) || 0}%
              </p>
            )}
            <p className="text-sm text-[var(--foreground-muted)] mt-1">Compliance Rate</p>
          </div>

          <div className="card p-5 border-l-4 border-l-blue-500">
            <div className="flex items-center justify-between mb-3">
              <div className="p-2 rounded-lg bg-blue-50 dark:bg-blue-900/20">
                <Icons.eye className="text-blue-600 dark:text-blue-400" size={20} />
              </div>
            </div>
            {statsLoading ? (
              <div className="w-16 h-8 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
            ) : (
              <p className="text-2xl font-semibold text-[var(--foreground)]">
                {stats?.pendingReviews || 0}
              </p>
            )}
            <p className="text-sm text-[var(--foreground-muted)] mt-1">Pending Reviews</p>
          </div>

          <div className="card p-5 border-l-4 border-l-purple-500">
            <div className="flex items-center justify-between mb-3">
              <div className="p-2 rounded-lg bg-purple-50 dark:bg-purple-900/20">
                <Icons.settings className="text-purple-600 dark:text-purple-400" size={20} />
              </div>
            </div>
            {statsLoading ? (
              <div className="w-16 h-8 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
            ) : (
              <p className="text-2xl font-semibold text-[var(--foreground)]">
                {stats?.activeRules || 0}
              </p>
            )}
            <p className="text-sm text-[var(--foreground-muted)] mt-1">Active Rules</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Admin Actions */}
          <div className="lg:col-span-1">
            <h2 className="text-lg font-semibold text-[var(--foreground)] mb-4">Administration</h2>
            <div className="space-y-3">
              <Link href="/admin/rules" className="card card-hover p-4 flex items-center gap-4">
                <div className="p-2.5 rounded-lg bg-amber-50 dark:bg-amber-900/20">
                  <Icons.settings className="text-amber-600 dark:text-amber-400" size={20} />
                </div>
                <div className="flex-1">
                  <p className="font-medium text-[var(--foreground)]">Compliance Rules</p>
                  <p className="text-sm text-[var(--foreground-muted)]">Manage verification rules</p>
                </div>
                <Icons.chevronRight className="text-[var(--foreground-muted)]" size={16} />
              </Link>

              <Link href="/admin/audits" className="card card-hover p-4 flex items-center gap-4">
                <div className="p-2.5 rounded-lg bg-blue-50 dark:bg-blue-900/20">
                  <Icons.clipboardList className="text-blue-600 dark:text-blue-400" size={20} />
                </div>
                <div className="flex-1">
                  <p className="font-medium text-[var(--foreground)]">Audit Logs</p>
                  <p className="text-sm text-[var(--foreground-muted)]">View system activity</p>
                </div>
                <Icons.chevronRight className="text-[var(--foreground-muted)]" size={16} />
              </Link>

              <Link href="/admin/reviews" className="card card-hover p-4 flex items-center gap-4">
                <div className="p-2.5 rounded-lg bg-emerald-50 dark:bg-emerald-900/20">
                  <Icons.eye className="text-emerald-600 dark:text-emerald-400" size={20} />
                </div>
                <div className="flex-1">
                  <p className="font-medium text-[var(--foreground)]">Reviews</p>
                  <p className="text-sm text-[var(--foreground-muted)]">Pending verifications</p>
                </div>
                <Icons.chevronRight className="text-[var(--foreground-muted)]" size={16} />
              </Link>

              <Link href="/admin/users" className="card card-hover p-4 flex items-center gap-4">
                <div className="p-2.5 rounded-lg bg-purple-50 dark:bg-purple-900/20">
                  <Icons.users className="text-purple-600 dark:text-purple-400" size={20} />
                </div>
                <div className="flex-1">
                  <p className="font-medium text-[var(--foreground)]">User Management</p>
                  <p className="text-sm text-[var(--foreground-muted)]">Manage user accounts</p>
                </div>
                <Icons.chevronRight className="text-[var(--foreground-muted)]" size={16} />
              </Link>
            </div>
          </div>

          {/* Recent Audit Logs */}
          <div className="lg:col-span-2">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-[var(--foreground)]">Recent Activity</h2>
              <Link href="/admin/audits" className="text-sm text-amber-600 hover:underline">
                View all logs
              </Link>
            </div>
            <div className="card divide-y divide-[var(--border)]">
              {auditLoading ? (
                <div className="p-8 text-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-amber-500 mx-auto" />
                </div>
              ) : recentAudits.length > 0 ? (
                recentAudits.map((log: AuditLog) => (
                  <div key={log._id} className="p-4 flex items-start gap-4">
                    <div className={`p-2 rounded-full ${
                      log.success 
                        ? 'bg-emerald-50 dark:bg-emerald-900/20' 
                        : 'bg-red-50 dark:bg-red-900/20'
                    }`}>
                      {log.success ? (
                        <Icons.check size={14} className="text-emerald-600 dark:text-emerald-400" />
                      ) : (
                        <Icons.alertTriangle size={14} className="text-red-600 dark:text-red-400" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-[var(--foreground)] text-sm">
                        {log.action} - {log.resourceType}
                      </p>
                      <p className="text-xs text-[var(--foreground-muted)] truncate">
                        {log.description || log.resourceName || log.resourceId}
                      </p>
                    </div>
                    <span className="text-xs text-[var(--foreground-muted)] whitespace-nowrap">
                      {formatRelativeTime(log.createdAt)}
                    </span>
                  </div>
                ))
              ) : (
                <div className="p-8 text-center">
                  <Icons.clipboardList size={40} className="text-[var(--foreground-muted)] mx-auto mb-3" />
                  <p className="text-[var(--foreground-muted)]">No recent activity</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* System Status */}
        <div className="card p-6">
          <h2 className="text-lg font-semibold text-[var(--foreground)] mb-4">System Status</h2>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="flex items-center gap-3">
              <div className="w-3 h-3 rounded-full bg-emerald-500 animate-pulse" />
              <div>
                <p className="text-sm font-medium text-[var(--foreground)]">API Gateway</p>
                <p className="text-xs text-[var(--foreground-muted)]">Operational</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-3 h-3 rounded-full bg-emerald-500 animate-pulse" />
              <div>
                <p className="text-sm font-medium text-[var(--foreground)]">Database</p>
                <p className="text-xs text-[var(--foreground-muted)]">Healthy</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-3 h-3 rounded-full bg-emerald-500 animate-pulse" />
              <div>
                <p className="text-sm font-medium text-[var(--foreground)]">Compliance Engine</p>
                <p className="text-xs text-[var(--foreground-muted)]">Running</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-3 h-3 rounded-full bg-emerald-500 animate-pulse" />
              <div>
                <p className="text-sm font-medium text-[var(--foreground)]">Message Queue</p>
                <p className="text-xs text-[var(--foreground-muted)]">Active</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
