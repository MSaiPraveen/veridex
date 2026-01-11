'use client';

import { useState, useEffect } from 'react';
import { 
  Users, 
  Building2, 
  Package, 
  FileText, 
  ShieldCheck, 
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  CheckCircle,
  Clock,
  ArrowRight,
  MoreHorizontal,
  Eye,
  AlertOctagon,
  Timer,
  Activity,
  ClipboardCheck,
  Scale,
  XCircle,
  ArrowUpRight,
  Zap
} from 'lucide-react';
import Link from 'next/link';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge, StatusBadge, StatusType } from '@/components/ui/badge';
import { useAdminPermissions, PermissionGate } from '@/components/auth/permission-gate';
import { AdminPermission, AdminRole } from '@/lib/admin-rbac';

interface StatCard {
  label: string;
  value: string;
  change: string;
  changeType: 'positive' | 'negative' | 'neutral';
  icon: React.ReactNode;
  href: string;
  permission: AdminPermission;
}

const stats: StatCard[] = [
  { 
    label: 'Total Users', 
    value: '12,453', 
    change: '+12.5%', 
    changeType: 'positive',
    icon: <Users className="h-6 w-6" />,
    href: '/admin-users',
    permission: AdminPermission.ADMIN_USER_READ
  },
  { 
    label: 'Organizations', 
    value: '847', 
    change: '+8.2%', 
    changeType: 'positive',
    icon: <Building2 className="h-6 w-6" />,
    href: '/organizations',
    permission: AdminPermission.ORG_READ
  },
  { 
    label: 'Active Products', 
    value: '3,291', 
    change: '+15.3%', 
    changeType: 'positive',
    icon: <Package className="h-6 w-6" />,
    href: '/products',
    permission: AdminPermission.PRODUCT_READ
  },
  { 
    label: 'Pending Reviews', 
    value: '24', 
    change: '-5', 
    changeType: 'negative',
    icon: <ShieldCheck className="h-6 w-6" />,
    href: '/compliance-queue',
    permission: AdminPermission.COMPLIANCE_READ
  },
];

const recentActivity = [
  { type: 'user', action: 'New merchant registered', entity: 'GreenLeaf Labs', time: '5 min ago', status: 'pending' },
  { type: 'compliance', action: 'Product flagged for review', entity: 'Product #1234', time: '12 min ago', status: 'warning' },
  { type: 'document', action: 'COA uploaded', entity: 'Batch #5678', time: '23 min ago', status: 'success' },
  { type: 'user', action: 'Consumer verified', entity: 'john.doe@email.com', time: '45 min ago', status: 'success' },
  { type: 'compliance', action: 'Compliance check passed', entity: 'Product #9012', time: '1 hour ago', status: 'success' },
];

const complianceAlerts = [
  { severity: 'high', message: 'Product batch #4521 missing lab results', product: 'Hemp Extract 1000mg', time: '2h ago' },
  { severity: 'medium', message: 'COA expiring in 7 days', product: 'Full Spectrum Tincture', time: '4h ago' },
  { severity: 'low', message: 'Document pending review', product: 'CBD Isolate 99%', time: '6h ago' },
];

const quickStats = [
  { label: 'Documents Today', value: '156', icon: FileText },
  { label: 'Active Sessions', value: '89', icon: Users },
  { label: 'Compliance Rate', value: '94.2%', icon: ShieldCheck },
  { label: 'Avg. Review Time', value: '2.4h', icon: Clock },
];

// Governance-focused data
const slaMetrics = {
  pendingReviews: 24,
  atRisk: 5,
  breached: 2,
  avgTimeToDecision: '2.1h',
  slaComplianceRate: 92,
};

const criticalAlerts = [
  { id: 1, type: 'CRITICAL', title: 'THC Limit Exceeded - GreenLeaf Labs', slaRemaining: '1h 23m', count: 5 },
  { id: 2, type: 'HIGH', title: 'SLA Breach Risk - 12 Pending Reviews', slaRemaining: '45m', count: 12 },
  { id: 3, type: 'HIGH', title: 'OCR Failure Rate Spike (15%)', slaRemaining: null, count: 23 },
];

const overrideStats = {
  today: 3,
  thisWeek: 12,
  thisMonth: 45,
  pendingReview: 2,
};

const systemStatus = {
  services: { healthy: 5, degraded: 1, down: 0 },
  queueLag: 45,
  ocrErrorRate: 4.2,
  deadLetterCount: 3,
};

export default function AdminDashboardPage() {
  const { role } = useAdminPermissions();
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 60000);
    return () => clearInterval(timer);
  }, []);

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
          <div className="flex items-center gap-3">
            <PermissionGate permission={AdminPermission.AUDIT_READ}>
              <Link href="/audit-logs">
                <Button variant="secondary" size="sm">
                  <Eye className="h-4 w-4 mr-2" />
                  View Audit Logs
                </Button>
              </Link>
            </PermissionGate>
          </div>
        </div>

        {/* Quick Stats Bar */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {quickStats.map((stat) => (
            <div key={stat.label} className="bg-white dark:bg-slate-800/50 rounded-xl p-4 border border-slate-200 dark:border-slate-700/50 shadow-sm">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-slate-100 dark:bg-slate-700/50">
                  <stat.icon className="h-4 w-4 text-slate-500 dark:text-slate-400" />
                </div>
                <div>
                  <p className="text-xs text-slate-500 dark:text-slate-500 uppercase tracking-wide">{stat.label}</p>
                  <p className="text-lg font-bold text-slate-900 dark:text-white">{stat.value}</p>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Governance Priority Section */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Critical Alerts - Takes Priority */}
          <Card className="lg:col-span-2 border-red-500/30 bg-red-500/5">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-red-500/10">
                    <AlertOctagon className="h-5 w-5 text-red-400" />
                  </div>
                  <div>
                    <CardTitle className="text-red-400">Priority Alerts</CardTitle>
                    <p className="text-sm text-slate-400">{criticalAlerts.length} require immediate attention</p>
                  </div>
                </div>
                <Link href="/alerts">
                  <Button variant="danger" size="sm">
                    View All Alerts
                    <ArrowRight className="h-4 w-4 ml-2" />
                  </Button>
                </Link>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {criticalAlerts.map((alert) => (
                  <Link key={alert.id} href="/alerts" className="block">
                    <div className={`p-4 rounded-xl border-l-4 transition-all hover:bg-slate-700/30 ${
                      alert.type === 'CRITICAL' ? 'bg-red-500/10 border-red-500' : 'bg-amber-500/10 border-amber-500'
                    }`}>
                      <div className="flex items-start justify-between">
                        <div className="flex items-start gap-3">
                          <AlertTriangle className={`h-5 w-5 flex-shrink-0 mt-0.5 ${
                            alert.type === 'CRITICAL' ? 'text-red-400' : 'text-amber-400'
                          }`} />
                          <div>
                            <p className="text-sm font-medium text-slate-900 dark:text-white">{alert.title}</p>
                            <div className="flex items-center gap-3 mt-1">
                              <span className={`text-xs px-2 py-0.5 rounded ${
                                alert.type === 'CRITICAL' ? 'bg-red-500/20 text-red-400' : 'bg-amber-500/20 text-amber-400'
                              }`}>
                                {alert.type}
                              </span>
                              <span className="text-xs text-slate-500">{alert.count} items</span>
                            </div>
                          </div>
                        </div>
                        {alert.slaRemaining && (
                          <div className="flex items-center gap-1 text-sm">
                            <Timer className={`h-4 w-4 ${
                              alert.type === 'CRITICAL' ? 'text-red-400' : 'text-amber-400'
                            }`} />
                            <span className={alert.type === 'CRITICAL' ? 'text-red-400' : 'text-amber-400'}>
                              {alert.slaRemaining}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* SLA Overview */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <Timer className="h-5 w-5" />
                  SLA Status
                </CardTitle>
                <Link href="/review-queue">
                  <Button variant="ghost" size="sm">
                    <ArrowUpRight className="h-4 w-4" />
                  </Button>
                </Link>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {/* SLA Ring */}
                <div className="flex items-center justify-center py-4">
                  <div className="relative">
                    <svg className="h-32 w-32 transform -rotate-90">
                      <circle cx="64" cy="64" r="56" fill="none" stroke="currentColor" strokeWidth="12" className="text-slate-200 dark:text-slate-700" />
                      <circle 
                        cx="64" cy="64" r="56" fill="none" stroke="currentColor" strokeWidth="12" 
                        strokeDasharray={`${slaMetrics.slaComplianceRate * 3.52} 352`}
                        className="text-amber-500"
                        strokeLinecap="round"
                      />
                    </svg>
                    <div className="absolute inset-0 flex items-center justify-center flex-col">
                      <span className="text-3xl font-bold text-slate-900 dark:text-white">{slaMetrics.slaComplianceRate}%</span>
                      <span className="text-xs text-slate-600 dark:text-slate-400">SLA Rate</span>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-2 text-center">
                  <div className="p-2 bg-slate-100 dark:bg-slate-700/30 rounded-lg">
                    <p className="text-lg font-bold text-emerald-600 dark:text-emerald-400">{slaMetrics.pendingReviews - slaMetrics.atRisk - slaMetrics.breached}</p>
                    <p className="text-xs text-slate-500 dark:text-slate-500">On Track</p>
                  </div>
                  <div className="p-2 bg-amber-50 dark:bg-amber-500/10 rounded-lg">
                    <p className="text-lg font-bold text-amber-600 dark:text-amber-400">{slaMetrics.atRisk}</p>
                    <p className="text-xs text-slate-500 dark:text-slate-500">At Risk</p>
                  </div>
                  <div className="p-2 bg-red-50 dark:bg-red-500/10 rounded-lg">
                    <p className="text-lg font-bold text-red-600 dark:text-red-400">{slaMetrics.breached}</p>
                    <p className="text-xs text-slate-500 dark:text-slate-500">Breached</p>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-slate-200 dark:border-slate-700/50">
                  <span className="text-sm text-slate-600 dark:text-slate-400">Avg. Decision Time</span>
                  <span className="text-sm font-medium text-slate-900 dark:text-white">{slaMetrics.avgTimeToDecision}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Override Tracking & System Health */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
          {/* Override Stats */}
          <Card className="border-amber-500/30">
            <CardContent className="pt-4">
              <div className="flex items-center gap-3 mb-3">
                <div className="p-2 rounded-lg bg-amber-500/10">
                  <Scale className="h-5 w-5 text-amber-400" />
                </div>
                <div>
                  <p className="text-sm text-slate-400">Overrides Today</p>
                  <p className="text-2xl font-bold text-amber-400">{overrideStats.today}</p>
                </div>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-500">This week: {overrideStats.thisWeek}</span>
                <Link href="/audit-logs?filter=override" className="text-amber-400 hover:text-amber-300">
                  View →
                </Link>
              </div>
            </CardContent>
          </Card>

          {/* Services Status */}
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center gap-3 mb-3">
                <div className="p-2 rounded-lg bg-emerald-500/10">
                  <Activity className="h-5 w-5 text-emerald-400" />
                </div>
                <div>
                  <p className="text-sm text-slate-400">Services</p>
                  <p className="text-2xl font-bold text-emerald-400">
                    {systemStatus.services.healthy}/{systemStatus.services.healthy + systemStatus.services.degraded + systemStatus.services.down}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2 text-sm">
                {systemStatus.services.degraded > 0 && (
                  <span className="text-amber-400">{systemStatus.services.degraded} degraded</span>
                )}
                {systemStatus.services.down > 0 && (
                  <span className="text-red-400">{systemStatus.services.down} down</span>
                )}
                {systemStatus.services.degraded === 0 && systemStatus.services.down === 0 && (
                  <span className="text-emerald-400">All healthy</span>
                )}
              </div>
            </CardContent>
          </Card>

          {/* OCR Error Rate */}
          <Card className={systemStatus.ocrErrorRate > 5 ? 'border-red-500/30' : ''}>
            <CardContent className="pt-4">
              <div className="flex items-center gap-3 mb-3">
                <div className={`p-2 rounded-lg ${systemStatus.ocrErrorRate > 5 ? 'bg-red-500/10' : 'bg-blue-500/10'}`}>
                  <FileText className={`h-5 w-5 ${systemStatus.ocrErrorRate > 5 ? 'text-red-400' : 'text-blue-400'}`} />
                </div>
                <div>
                  <p className="text-sm text-slate-400">OCR Error Rate</p>
                  <p className={`text-2xl font-bold ${systemStatus.ocrErrorRate > 5 ? 'text-red-500 dark:text-red-400' : 'text-slate-900 dark:text-white'}`}>
                    {systemStatus.ocrErrorRate}%
                  </p>
                </div>
              </div>
              <div className="w-full h-2 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                <div 
                  className={`h-full rounded-full ${systemStatus.ocrErrorRate > 5 ? 'bg-red-500' : 'bg-blue-500'}`}
                  style={{ width: `${Math.min(systemStatus.ocrErrorRate * 10, 100)}%` }}
                />
              </div>
            </CardContent>
          </Card>

          {/* Dead Letter Queue */}
          <Card className={systemStatus.deadLetterCount > 0 ? 'border-red-500/30' : ''}>
            <CardContent className="pt-4">
              <div className="flex items-center gap-3 mb-3">
                <div className={`p-2 rounded-lg ${systemStatus.deadLetterCount > 0 ? 'bg-red-500/10' : 'bg-slate-100 dark:bg-slate-700/50'}`}>
                  <XCircle className={`h-5 w-5 ${systemStatus.deadLetterCount > 0 ? 'text-red-400' : 'text-slate-500 dark:text-slate-400'}`} />
                </div>
                <div>
                  <p className="text-sm text-slate-600 dark:text-slate-400">Dead Letter Queue</p>
                  <p className={`text-2xl font-bold ${systemStatus.deadLetterCount > 0 ? 'text-red-500 dark:text-red-400' : 'text-slate-900 dark:text-white'}`}>
                    {systemStatus.deadLetterCount}
                  </p>
                </div>
              </div>
              <Link href="/system-health" className="text-sm text-amber-400 hover:text-amber-300">
                View System Health →
              </Link>
            </CardContent>
          </Card>
        </div>

        {/* Main Stats Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {stats.map((stat) => (
            <PermissionGate key={stat.label} permission={stat.permission}>
              <Link href={stat.href} className="group">
                <Card className="h-full hover:border-amber-500/30 transition-all duration-200">
                  <CardContent className="p-5">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <p className="text-sm text-slate-600 dark:text-slate-400">{stat.label}</p>
                        <p className="text-3xl font-bold text-slate-900 dark:text-white mt-2">{stat.value}</p>
                      </div>
                      <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-amber-500/20 to-amber-600/10 flex items-center justify-center text-amber-500 group-hover:scale-110 transition-transform">
                        {stat.icon}
                      </div>
                    </div>
                    <div className="mt-4 flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        {stat.changeType === 'positive' ? (
                          <TrendingUp className="h-4 w-4 text-emerald-400" />
                        ) : (
                          <TrendingDown className="h-4 w-4 text-red-400" />
                        )}
                        <span className={`text-sm font-medium ${
                          stat.changeType === 'positive' ? 'text-emerald-400' : 'text-red-400'
                        }`}>
                          {stat.change}
                        </span>
                        <span className="text-xs text-slate-500">vs last month</span>
                      </div>
                      <ArrowRight className="h-4 w-4 text-slate-600 group-hover:text-amber-500 group-hover:translate-x-1 transition-all" />
                    </div>
                  </CardContent>
                </Card>
              </Link>
            </PermissionGate>
          ))}
        </div>

        {/* Two Column Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Recent Activity */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Recent Activity</CardTitle>
                <Link href="/audit-logs" className="text-sm text-amber-400 hover:text-amber-300 transition-colors">
                  View all
                </Link>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {recentActivity.map((activity, index) => (
                  <div key={index} className="flex items-start gap-3 p-3 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700/30 transition-colors cursor-pointer">
                    <div className={`h-10 w-10 rounded-xl flex items-center justify-center flex-shrink-0 ${
                      activity.type === 'user' ? 'bg-blue-500/10 text-blue-500 dark:text-blue-400' :
                      activity.type === 'compliance' ? 'bg-amber-500/10 text-amber-500 dark:text-amber-400' :
                      'bg-emerald-500/10 text-emerald-500 dark:text-emerald-400'
                    }`}>
                      {activity.type === 'user' ? <Users className="h-5 w-5" /> :
                       activity.type === 'compliance' ? <ShieldCheck className="h-5 w-5" /> :
                       <FileText className="h-5 w-5" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-slate-900 dark:text-white">{activity.action}</p>
                      <p className="text-sm text-slate-600 dark:text-slate-400 truncate">{activity.entity}</p>
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      <span className="text-xs text-slate-500">{activity.time}</span>
                      <StatusBadge status={activity.status as StatusType} />
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Compliance Alerts */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <CardTitle>Compliance Alerts</CardTitle>
                  <Badge variant="danger">{complianceAlerts.length} active</Badge>
                </div>
                <Link href="/compliance-queue" className="text-sm text-amber-400 hover:text-amber-300 transition-colors">
                  Review all
                </Link>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {complianceAlerts.map((alert, index) => (
                  <div key={index} className={`p-4 rounded-xl border-l-4 ${
                    alert.severity === 'high' ? 'bg-red-500/10 border-red-500' :
                    alert.severity === 'medium' ? 'bg-amber-500/10 border-amber-500' :
                    'bg-blue-500/10 border-blue-500'
                  }`}>
                    <div className="flex items-start gap-3">
                      {alert.severity === 'high' ? (
                        <AlertTriangle className="h-5 w-5 text-red-400 flex-shrink-0 mt-0.5" />
                      ) : alert.severity === 'medium' ? (
                        <AlertTriangle className="h-5 w-5 text-amber-400 flex-shrink-0 mt-0.5" />
                      ) : (
                        <CheckCircle className="h-5 w-5 text-blue-400 flex-shrink-0 mt-0.5" />
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-slate-900 dark:text-white">{alert.message}</p>
                        <div className="flex items-center gap-2 mt-1">
                          <p className="text-sm text-slate-600 dark:text-slate-400">{alert.product}</p>
                          <span className="text-xs text-slate-500 dark:text-slate-500">• {alert.time}</span>
                        </div>
                      </div>
                      <button className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700/50 text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors">
                        <MoreHorizontal className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Quick Actions */}
        <Card>
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-4">
              <PermissionGate permission={AdminPermission.DOC_REVIEW}>
                <Link href="/review-queue">
                  <Button variant="primary" className="w-full justify-start">
                    <ClipboardCheck className="h-4 w-4 mr-2" />
                    Review Queue
                  </Button>
                </Link>
              </PermissionGate>
              <PermissionGate permission={AdminPermission.COMPLIANCE_READ}>
                <Link href="/alerts">
                  <Button variant="secondary" className="w-full justify-start">
                    <AlertTriangle className="h-4 w-4 mr-2" />
                    Alerts
                  </Button>
                </Link>
              </PermissionGate>
              <PermissionGate permission={AdminPermission.RULES_READ}>
                <Link href="/rule-governance">
                  <Button variant="secondary" className="w-full justify-start">
                    <Scale className="h-4 w-4 mr-2" />
                    Rule Governance
                  </Button>
                </Link>
              </PermissionGate>
              <PermissionGate permission={AdminPermission.AUDIT_READ}>
                <Link href="/audit-logs">
                  <Button variant="secondary" className="w-full justify-start">
                    <Eye className="h-4 w-4 mr-2" />
                    Audit Logs
                  </Button>
                </Link>
              </PermissionGate>
              <PermissionGate permission={AdminPermission.ORG_READ}>
                <Link href="/organizations">
                  <Button variant="secondary" className="w-full justify-start">
                    <Building2 className="h-4 w-4 mr-2" />
                    Organizations
                  </Button>
                </Link>
              </PermissionGate>
              <PermissionGate permission={AdminPermission.COMPLIANCE_REVIEW}>
                <Link href="/compliance-queue">
                  <Button variant="secondary" className="w-full justify-start">
                    <ShieldCheck className="h-4 w-4 mr-2" />
                    Compliance Queue
                  </Button>
                </Link>
              </PermissionGate>
            </div>
          </CardContent>
        </Card>
    </div>
  );
}
