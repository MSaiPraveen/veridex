/**
 * Server-rendered Dashboard Components
 * These components render entirely on the server
 * No useState, useEffect, or client hooks
 */

import Link from 'next/link';
import type {
  StatCard,
  QuickStat,
  SLAMetrics,
  OverrideStats,
  SystemStatus,
  RecentActivity,
  ComplianceAlert
} from '@/lib/server/dashboard-data';

// ============================================
// Static Icons as SVG (no lucide imports needed)
// ============================================
const Icons = {
  Users: () => (
    <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" />
    </svg>
  ),
  Building2: () => (
    <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 21h19.5m-18-18v18m10.5-18v18m6-13.5V21M6.75 6.75h.75m-.75 3h.75m-.75 3h.75m3-6h.75m-.75 3h.75m-.75 3h.75M6.75 21v-3.375c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21M3 3h12m-.75 4.5V21m3-18h3.75m-3.75 0v7.875c0 .621.504 1.125 1.125 1.125H21V3m-9.75 18h10.5" />
    </svg>
  ),
  Package: () => (
    <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 7.5l-.625 10.632a2.25 2.25 0 01-2.247 2.118H6.622a2.25 2.25 0 01-2.247-2.118L3.75 7.5M10 11.25h4M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125z" />
    </svg>
  ),
  ShieldCheck: () => (
    <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
    </svg>
  ),
  FileText: () => (
    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
    </svg>
  ),
  Clock: () => (
    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  ),
  TrendingUp: () => (
    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18L9 11.25l4.306 4.307a11.95 11.95 0 015.814-5.519l2.74-1.22m0 0l-5.94-2.28m5.94 2.28l-2.28 5.941" />
    </svg>
  ),
  TrendingDown: () => (
    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 6L9 12.75l4.286-4.286a11.948 11.948 0 014.306 6.43l.776 2.898m0 0l3.182-5.511m-3.182 5.51l-5.511-3.181" />
    </svg>
  ),
  ArrowRight: () => (
    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
    </svg>
  ),
  Scale: () => (
    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v17.25m0 0c-1.472 0-2.882.265-4.185.75M12 20.25c1.472 0 2.882.265 4.185.75M18.75 4.97A48.416 48.416 0 0012 4.5c-2.291 0-4.545.16-6.75.47m13.5 0c1.01.143 2.01.317 3 .52m-3-.52l2.62 10.726c.122.499-.106 1.028-.589 1.202a5.988 5.988 0 01-2.031.352 5.988 5.988 0 01-2.031-.352c-.483-.174-.711-.703-.59-1.202L18.75 4.971zm-16.5.52c.99-.203 1.99-.377 3-.52m0 0l2.62 10.726c.122.499-.106 1.028-.589 1.202a5.989 5.989 0 01-2.031.352 5.989 5.989 0 01-2.031-.352c-.483-.174-.711-.703-.59-1.202L5.25 4.971z" />
    </svg>
  ),
  Activity: () => (
    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z" />
    </svg>
  ),
  XCircle: () => (
    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9.75 9.75l4.5 4.5m0-4.5l-4.5 4.5M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  ),
  AlertTriangle: () => (
    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
    </svg>
  ),
  CheckCircle: () => (
    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  ),
};

const SmallIcons = {
  Users: () => (
    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" />
    </svg>
  ),
  ShieldCheck: () => (
    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
    </svg>
  ),
  FileText: () => (
    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
    </svg>
  ),
  Clock: () => (
    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  ),
};

function getSmallIcon(name: string) {
  switch (name) {
    case 'Users': return <SmallIcons.Users />;
    case 'ShieldCheck': return <SmallIcons.ShieldCheck />;
    case 'FileText': return <SmallIcons.FileText />;
    case 'Clock': return <SmallIcons.Clock />;
    default: return <SmallIcons.FileText />;
  }
}

function getIcon(name: string) {
  switch (name) {
    case 'Users': return <Icons.Users />;
    case 'Building2': return <Icons.Building2 />;
    case 'Package': return <Icons.Package />;
    case 'ShieldCheck': return <Icons.ShieldCheck />;
    default: return <Icons.FileText />;
  }
}

// ============================================
// Quick Stats Bar (Server Component)
// ============================================
export function QuickStatsBar({ stats }: { stats: QuickStat[] }) {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {stats.map((stat) => (
        <div
          key={stat.label}
          className="bg-white dark:bg-slate-800/50 rounded-xl p-4 border border-slate-200 dark:border-slate-700/50 shadow-sm"
        >
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-slate-100 dark:bg-slate-700/50 text-slate-500 dark:text-slate-400">
              {getSmallIcon(stat.iconName)}
            </div>
            <div>
              <p className="text-xs text-slate-500 dark:text-slate-400 uppercase tracking-wide">{stat.label}</p>
              <p className="text-lg font-bold text-slate-900 dark:text-white">{stat.value}</p>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

// ============================================
// SLA Ring Chart (Server Component - Pure SVG)
// ============================================
export function SLARing({ metrics }: { metrics: SLAMetrics }) {
  const circumference = 2 * Math.PI * 56;
  const dashArray = (metrics.slaComplianceRate / 100) * circumference;

  return (
    <div className="space-y-4">
      {/* SLA Ring */}
      <div className="flex items-center justify-center py-4">
        <div className="relative">
          <svg className="h-32 w-32 transform -rotate-90">
            <circle
              cx="64" cy="64" r="56"
              fill="none"
              stroke="currentColor"
              strokeWidth="12"
              className="text-slate-300 dark:text-slate-600"
            />
            <circle
              cx="64" cy="64" r="56"
              fill="none"
              stroke="currentColor"
              strokeWidth="12"
              strokeDasharray={`${dashArray} ${circumference}`}
              className="text-amber-500"
              strokeLinecap="round"
            />
          </svg>
          <div className="absolute inset-0 flex items-center justify-center flex-col">
            <span className="text-3xl font-bold text-slate-900 dark:text-white">{metrics.slaComplianceRate}%</span>
            <span className="text-xs text-slate-600 dark:text-slate-400">SLA Rate</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-2 text-center">
        <div className="p-2 bg-slate-100 dark:bg-slate-700/30 rounded-lg">
          <p className="text-lg font-bold text-emerald-600 dark:text-emerald-400">
            {metrics.pendingReviews - metrics.atRisk - metrics.breached}
          </p>
          <p className="text-xs text-slate-500 dark:text-slate-400">On Track</p>
        </div>
        <div className="p-2 bg-amber-50 dark:bg-amber-500/10 rounded-lg">
          <p className="text-lg font-bold text-amber-600 dark:text-amber-400">{metrics.atRisk}</p>
          <p className="text-xs text-slate-500 dark:text-slate-400">At Risk</p>
        </div>
        <div className="p-2 bg-red-50 dark:bg-red-500/10 rounded-lg">
          <p className="text-lg font-bold text-red-600 dark:text-red-400">{metrics.breached}</p>
          <p className="text-xs text-slate-500 dark:text-slate-400">Breached</p>
        </div>
      </div>

      <div className="flex items-center justify-between pt-2 border-t border-slate-200 dark:border-slate-700/50">
        <span className="text-sm text-slate-600 dark:text-slate-400">Avg. Decision Time</span>
        <span className="text-sm font-medium text-slate-900 dark:text-white">{metrics.avgTimeToDecision}</span>
      </div>
    </div>
  );
}

// ============================================
// Stat Cards Grid (Server Component)
// ============================================
export function StatCardsGrid({
  stats,
  allowedPermissions
}: {
  stats: StatCard[];
  allowedPermissions: Set<string>;
}) {
  const visibleStats = stats.filter(s => allowedPermissions.has(s.permissionKey));

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {visibleStats.map((stat) => (
        <Link key={stat.label} href={stat.href} className="group">
          <div className="h-full bg-white dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/50 rounded-xl p-5 hover:border-amber-500/30 transition-all duration-200 shadow-sm">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <p className="text-sm text-slate-600 dark:text-slate-400">{stat.label}</p>
                <p className="text-3xl font-bold text-slate-900 dark:text-white mt-2">{stat.value}</p>
              </div>
              <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-amber-500/20 to-amber-600/10 flex items-center justify-center text-amber-500 group-hover:scale-110 transition-transform">
                {getIcon(stat.iconName)}
              </div>
            </div>
            <div className="mt-4 flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                {stat.changeType === 'positive' ? (
                  <span className="text-emerald-500"><Icons.TrendingUp /></span>
                ) : (
                  <span className="text-red-500"><Icons.TrendingDown /></span>
                )}
                <span className={`text-sm font-medium ${stat.changeType === 'positive' ? 'text-emerald-500' : 'text-red-500'
                  }`}>
                  {stat.change}
                </span>
                <span className="text-xs text-slate-500 dark:text-slate-400">vs last month</span>
              </div>
              <span className="text-slate-400 group-hover:text-amber-500 group-hover:translate-x-1 transition-all">
                <Icons.ArrowRight />
              </span>
            </div>
          </div>
        </Link>
      ))}
    </div>
  );
}

// ============================================
// Override Stats Card (Server Component)
// ============================================
export function OverrideStatsCard({ stats }: { stats: OverrideStats }) {
  return (
    <div className="bg-white dark:bg-slate-800/50 border border-amber-500/30 rounded-xl p-4">
      <div className="flex items-center gap-3 mb-3">
        <div className="p-2 rounded-lg bg-amber-500/10 text-amber-500">
          <Icons.Scale />
        </div>
        <div>
          <p className="text-sm text-slate-600 dark:text-slate-400">Overrides Today</p>
          <p className="text-2xl font-bold text-amber-500">{stats.today}</p>
        </div>
      </div>
      <div className="flex items-center justify-between text-sm">
        <span className="text-slate-500 dark:text-slate-400">This week: {stats.thisWeek}</span>
        <Link href="/audit-logs?filter=override" className="text-amber-500 hover:text-amber-400">
          View →
        </Link>
      </div>
    </div>
  );
}

// ============================================
// Services Status Card (Server Component)
// ============================================
export function ServicesStatusCard({ status }: { status: SystemStatus }) {
  const total = status.services.healthy + status.services.degraded + status.services.down;

  return (
    <div className="bg-white dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/50 rounded-xl p-4">
      <div className="flex items-center gap-3 mb-3">
        <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-500">
          <Icons.Activity />
        </div>
        <div>
          <p className="text-sm text-slate-600 dark:text-slate-400">Services</p>
          <p className="text-2xl font-bold text-emerald-500">
            {status.services.healthy}/{total}
          </p>
        </div>
      </div>
      <div className="flex items-center gap-2 text-sm">
        {status.services.degraded > 0 && (
          <span className="text-amber-500">{status.services.degraded} degraded</span>
        )}
        {status.services.down > 0 && (
          <span className="text-red-500">{status.services.down} down</span>
        )}
        {status.services.degraded === 0 && status.services.down === 0 && (
          <span className="text-emerald-500">All healthy</span>
        )}
      </div>
    </div>
  );
}

// ============================================
// OCR Error Rate Card (Server Component)
// ============================================
export function OCRErrorCard({ rate }: { rate: number }) {
  const isHigh = rate > 5;

  return (
    <div className={`bg-white dark:bg-slate-800/50 border rounded-xl p-4 ${isHigh ? 'border-red-500/30' : 'border-slate-200 dark:border-slate-700/50'}`}>
      <div className="flex items-center gap-3 mb-3">
        <div className={`p-2 rounded-lg ${isHigh ? 'bg-red-500/10 text-red-500' : 'bg-blue-500/10 text-blue-500'}`}>
          <Icons.FileText />
        </div>
        <div>
          <p className="text-sm text-slate-600 dark:text-slate-400">OCR Error Rate</p>
          <p className={`text-2xl font-bold ${isHigh ? 'text-red-500' : 'text-slate-900 dark:text-white'}`}>
            {rate}%
          </p>
        </div>
      </div>
      <div className="w-full h-2 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full ${isHigh ? 'bg-red-500' : 'bg-blue-500'}`}
          style={{ width: `${Math.min(rate * 10, 100)}%` }}
        />
      </div>
    </div>
  );
}

// ============================================
// Dead Letter Queue Card (Server Component)
// ============================================
export function DeadLetterCard({ count }: { count: number }) {
  const hasIssues = count > 0;

  return (
    <div className={`bg-white dark:bg-slate-800/50 border rounded-xl p-4 ${hasIssues ? 'border-red-500/30' : 'border-slate-200 dark:border-slate-700/50'}`}>
      <div className="flex items-center gap-3 mb-3">
        <div className={`p-2 rounded-lg ${hasIssues ? 'bg-red-500/10 text-red-500' : 'bg-slate-100 dark:bg-slate-700/50 text-slate-500 dark:text-slate-400'}`}>
          <Icons.XCircle />
        </div>
        <div>
          <p className="text-sm text-slate-600 dark:text-slate-400">Dead Letter Queue</p>
          <p className={`text-2xl font-bold ${hasIssues ? 'text-red-500' : 'text-slate-900 dark:text-white'}`}>
            {count}
          </p>
        </div>
      </div>
      <Link href="/system-health" className="text-sm text-amber-500 hover:text-amber-400">
        View System Health →
      </Link>
    </div>
  );
}

// ============================================
// Recent Activity List (Server Component)
// ============================================
export function RecentActivityList({ activities }: { activities: RecentActivity[] }) {
  return (
    <div className="space-y-4">
      {activities.map((activity, index) => (
        <div
          key={index}
          className="flex items-start gap-3 p-3 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors cursor-pointer"
        >
          <div className={`h-10 w-10 rounded-xl flex items-center justify-center flex-shrink-0 ${activity.type === 'user' ? 'bg-blue-500/10 text-blue-500' :
              activity.type === 'compliance' ? 'bg-amber-500/10 text-amber-500' :
                'bg-emerald-500/10 text-emerald-500'
            }`}>
            {activity.type === 'user' ? <SmallIcons.Users /> :
              activity.type === 'compliance' ? <SmallIcons.ShieldCheck /> :
                <SmallIcons.FileText />}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-slate-900 dark:text-white">{activity.action}</p>
            <p className="text-sm text-slate-600 dark:text-slate-400 truncate">{activity.entity}</p>
          </div>
          <div className="flex flex-col items-end gap-1">
            <span className="text-xs text-slate-500 dark:text-slate-400">{activity.time}</span>
            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${activity.status === 'success' ? 'bg-emerald-100 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400' :
                activity.status === 'warning' ? 'bg-amber-100 dark:bg-amber-500/20 text-amber-600 dark:text-amber-400' :
                  activity.status === 'pending' ? 'bg-blue-100 dark:bg-blue-500/20 text-blue-600 dark:text-blue-400' :
                    'bg-red-100 dark:bg-red-500/20 text-red-600 dark:text-red-400'
              }`}>
              {activity.status}
            </span>
          </div>
        </div>
      ))}
    </div>
  );
}

// ============================================
// Compliance Alerts List (Server Component)
// ============================================
export function ComplianceAlertsList({ alerts }: { alerts: ComplianceAlert[] }) {
  return (
    <div className="space-y-3">
      {alerts.map((alert, index) => (
        <div
          key={index}
          className={`p-4 rounded-xl border-l-4 ${alert.severity === 'high' ? 'bg-red-50 dark:bg-red-500/10 border-red-500' :
              alert.severity === 'medium' ? 'bg-amber-50 dark:bg-amber-500/10 border-amber-500' :
                'bg-blue-50 dark:bg-blue-500/10 border-blue-500'
            }`}
        >
          <div className="flex items-start gap-3">
            <span className={`flex-shrink-0 mt-0.5 ${alert.severity === 'high' ? 'text-red-500' :
                alert.severity === 'medium' ? 'text-amber-500' :
                  'text-blue-500'
              }`}>
              {alert.severity === 'low' ? <Icons.CheckCircle /> : <Icons.AlertTriangle />}
            </span>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-slate-900 dark:text-white">{alert.message}</p>
              <div className="flex items-center gap-2 mt-1">
                <p className="text-sm text-slate-600 dark:text-slate-400">{alert.product}</p>
                <span className="text-xs text-slate-500 dark:text-slate-400">• {alert.time}</span>
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
