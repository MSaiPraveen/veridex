/**
 * Admin Dashboard Page - SERVER COMPONENT
 * 
 * This page is a React Server Component by default.
 * All data is fetched on the server and streamed to the client.
 * 
 * NO 'use client' directive - this renders on the server.
 * Interactive elements are isolated in client components.
 */

import Link from 'next/link';
import { getDashboardData, getServerPermissions } from '@/lib/server/dashboard-data';
import {
  QuickStatsBar,
  SLARing,
  StatCardsGrid,
  OverrideStatsCard,
  ServicesStatusCard,
  OCRErrorCard,
  DeadLetterCard,
  RecentActivityList,
  ComplianceAlertsList,
} from '@/components/dashboard/server-components';
import { ExpandableAlert } from '@/components/dashboard/client-components';

// Force dynamic rendering for fresh data
export const dynamic = 'force-dynamic';

export default async function AdminDashboardPage() {
  // Fetch all data on the server - no client-side fetching needed
  const [data, permissions] = await Promise.all([
    getDashboardData(),
    getServerPermissions(),
  ]);

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Dashboard</h1>
          <p className="text-slate-600 dark:text-slate-400 mt-1">
            Welcome back! Here&apos;s what&apos;s happening today.
          </p>
        </div>
        {permissions.canViewAudit && (
          <Link
            href="/audit-logs"
            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            View Audit Logs
          </Link>
        )}
      </div>

      {/* Quick Stats Bar - Server Rendered */}
      <QuickStatsBar stats={data.quickStats} />

      {/* Governance Priority Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Critical Alerts - Takes Priority */}
        <div className="lg:col-span-2 bg-red-50 dark:bg-red-500/5 border border-red-500/30 rounded-xl overflow-hidden">
          <div className="p-4 border-b border-red-500/20">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-red-500/10">
                  <svg className="h-5 w-5 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                </div>
                <div>
                  <h2 className="font-semibold text-red-600 dark:text-red-400">Priority Alerts</h2>
                  <p className="text-sm text-slate-600 dark:text-slate-400">{data.criticalAlerts.length} require immediate attention</p>
                </div>
              </div>
              <Link
                href="/alerts"
                className="inline-flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-white bg-red-500 hover:bg-red-600 rounded-lg transition-colors"
              >
                View All Alerts
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
                </svg>
              </Link>
            </div>
          </div>
          <div className="p-4 space-y-3">
            {data.criticalAlerts.map((alert) => (
              <ExpandableAlert
                key={alert.id}
                id={alert.id}
                type={alert.type}
                title={alert.title}
                slaRemaining={alert.slaRemaining}
                count={alert.count}
              />
            ))}
          </div>
        </div>

        {/* SLA Overview - Server Rendered */}
        <div className="bg-white dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/50 rounded-xl overflow-hidden">
          <div className="p-4 border-b border-slate-200 dark:border-slate-700/50">
            <div className="flex items-center justify-between">
              <h2 className="font-semibold text-slate-900 dark:text-white flex items-center gap-2">
                <svg className="h-5 w-5 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                SLA Status
              </h2>
              <Link href="/review-queue" className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors">
                <svg className="h-4 w-4 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 19.5l15-15m0 0H8.25m11.25 0v11.25" />
                </svg>
              </Link>
            </div>
          </div>
          <div className="p-4">
            <SLARing metrics={data.slaMetrics} />
          </div>
        </div>
      </div>

      {/* Override Tracking & System Health */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
        <OverrideStatsCard stats={data.overrideStats} />
        <ServicesStatusCard status={data.systemStatus} />
        <OCRErrorCard rate={data.systemStatus.ocrErrorRate} />
        <DeadLetterCard count={data.systemStatus.deadLetterCount} />
      </div>

      {/* Main Stats Grid - Server Rendered */}
      <StatCardsGrid stats={data.stats} allowedPermissions={permissions.permissions} />

      {/* Two Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Activity */}
        <div className="bg-white dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/50 rounded-xl overflow-hidden">
          <div className="p-4 border-b border-slate-200 dark:border-slate-700/50">
            <div className="flex items-center justify-between">
              <h2 className="font-semibold text-slate-900 dark:text-white">Recent Activity</h2>
              <Link href="/audit-logs" className="text-sm text-amber-500 hover:text-amber-400 transition-colors">
                View all
              </Link>
            </div>
          </div>
          <div className="p-4">
            <RecentActivityList activities={data.recentActivity} />
          </div>
        </div>

        {/* Compliance Alerts */}
        <div className="bg-white dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/50 rounded-xl overflow-hidden">
          <div className="p-4 border-b border-slate-200 dark:border-slate-700/50">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <h2 className="font-semibold text-slate-900 dark:text-white">Compliance Alerts</h2>
                <span className="px-2 py-0.5 text-xs font-medium bg-red-100 dark:bg-red-500/20 text-red-600 dark:text-red-400 rounded-full">
                  {data.complianceAlerts.length} active
                </span>
              </div>
              <Link href="/compliance-queue" className="text-sm text-amber-500 hover:text-amber-400 transition-colors">
                Review all
              </Link>
            </div>
          </div>
          <div className="p-4">
            <ComplianceAlertsList alerts={data.complianceAlerts} />
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="bg-white dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/50 rounded-xl overflow-hidden">
        <div className="p-4 border-b border-slate-200 dark:border-slate-700/50">
          <h2 className="font-semibold text-slate-900 dark:text-white">Quick Actions</h2>
        </div>
        <div className="p-4">
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-3">
            {permissions.canReviewDocs && (
              <Link
                href="/review-queue"
                className="flex items-center gap-2 px-4 py-2.5 text-sm font-medium text-white bg-amber-500 hover:bg-amber-600 rounded-lg transition-colors"
              >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Review Queue
              </Link>
            )}
            {permissions.canViewCompliance && (
              <Link
                href="/alerts"
                className="flex items-center gap-2 px-4 py-2.5 text-sm font-medium text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 rounded-lg transition-colors"
              >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
                </svg>
                Alerts
              </Link>
            )}
            {permissions.canManageRules && (
              <Link
                href="/rule-governance"
                className="flex items-center gap-2 px-4 py-2.5 text-sm font-medium text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 rounded-lg transition-colors"
              >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v17.25m0 0c-1.472 0-2.882.265-4.185.75M12 20.25c1.472 0 2.882.265 4.185.75M18.75 4.97A48.416 48.416 0 0012 4.5c-2.291 0-4.545.16-6.75.47m13.5 0c1.01.143 2.01.317 3 .52m-3-.52l2.62 10.726c.122.499-.106 1.028-.589 1.202a5.988 5.988 0 01-2.031.352 5.988 5.988 0 01-2.031-.352c-.483-.174-.711-.703-.59-1.202L18.75 4.971z" />
                </svg>
                Rules
              </Link>
            )}
            {permissions.canViewAudit && (
              <Link
                href="/audit-logs"
                className="flex items-center gap-2 px-4 py-2.5 text-sm font-medium text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 rounded-lg transition-colors"
              >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
                </svg>
                Audit
              </Link>
            )}
            {permissions.canViewOrgs && (
              <Link
                href="/organizations"
                className="flex items-center gap-2 px-4 py-2.5 text-sm font-medium text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 rounded-lg transition-colors"
              >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 21h19.5m-18-18v18m10.5-18v18m6-13.5V21M6.75 6.75h.75m-.75 3h.75m-.75 3h.75m3-6h.75m-.75 3h.75m-.75 3h.75M6.75 21v-3.375c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21" />
                </svg>
                Orgs
              </Link>
            )}
            {permissions.canViewCompliance && (
              <Link
                href="/compliance-queue"
                className="flex items-center gap-2 px-4 py-2.5 text-sm font-medium text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 rounded-lg transition-colors"
              >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
                </svg>
                Compliance
              </Link>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
