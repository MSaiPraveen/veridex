'use client';

import { useMemo } from 'react';
import { DashboardLayout, PageHeader } from '@/components/layout';
import { Icons } from '@/components/ui/icons';
import {
  useProducts,
  useDocuments,
  Product,
  Document,
} from '@/lib/hooks';

function formatTimeAgo(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 60) return `${diffMins} minutes ago`;
  if (diffHours < 24) return `${diffHours} hours ago`;
  return `${diffDays} days ago`;
}

function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function getDaysUntil(dateString: string): number {
  const date = new Date(dateString);
  const now = new Date();
  return Math.ceil((date.getTime() - now.getTime()) / 86400000);
}

export default function MerchantStatusPage() {
  // Only fetch products and documents - audit logs and compliance rules are admin-only
  const { data: productsData, isLoading: loadingProducts } = useProducts();
  const { data: docsData, isLoading: loadingDocs } = useDocuments();

  const products = productsData?.data || [];
  const documents = docsData?.data || [];

  const isLoading = loadingProducts || loadingDocs;

  // Calculate real metrics from data
  const metrics = useMemo(() => {
    const totalProducts = products.length;
    const compliantProducts = products.filter((p: Product) => p.complianceStatus === 'COMPLIANT').length;
    const complianceScore = totalProducts > 0 ? Math.round((compliantProducts / totalProducts) * 100) : 0;

    const nonCompliantProducts = products.filter((p: Product) => p.complianceStatus === 'NON_COMPLIANT').length;
    const pendingProducts = products.filter(
      (p: Product) => p.complianceStatus === 'PENDING' || p.complianceStatus === 'REQUIRES_REVIEW'
    ).length;

    // Risk level based on non-compliant ratio
    const nonCompliantRatio = totalProducts > 0 ? nonCompliantProducts / totalProducts : 0;
    let riskLevel = 'Low';
    let riskColor = 'primary';
    if (nonCompliantRatio > 0.3) {
      riskLevel = 'High';
      riskColor = 'error';
    } else if (nonCompliantRatio > 0.1) {
      riskLevel = 'Medium';
      riskColor = 'warning';
    }

    // Active alerts = non-compliant + pending review items
    const activeAlerts = nonCompliantProducts + pendingProducts;

    // Documents due = expired or near expiry
    const expiredDocs = documents.filter((d: Document) => d.status === 'EXPIRED').length;
    const pendingDocs = documents.filter((d: Document) => d.status === 'PENDING' || d.status === 'PROCESSING').length;

    return [
      {
        title: 'Compliance Score',
        value: `${complianceScore}%`,
        change: complianceScore >= 80 ? 'Good' : complianceScore >= 50 ? 'Fair' : 'Needs Work',
        trend: complianceScore >= 80 ? 'up' : 'neutral',
        description: `${compliantProducts}/${totalProducts} products`,
        icon: 'clipboardCheck',
        color: 'success',
      },
      {
        title: 'Risk Level',
        value: riskLevel,
        change: riskLevel === 'Low' ? 'Stable' : riskLevel === 'High' ? 'Critical' : 'Monitor',
        trend: 'neutral',
        description: `${nonCompliantProducts} issues found`,
        icon: 'shield',
        color: riskColor,
      },
      {
        title: 'Active Alerts',
        value: String(activeAlerts),
        change: activeAlerts > 5 ? 'Action Needed' : 'Under Control',
        trend: activeAlerts > 0 ? 'up' : 'neutral',
        description: 'Requiring attention',
        icon: 'alertTriangle',
        color: 'warning',
      },
      {
        title: 'Documents Status',
        value: String(documents.length),
        change: `${expiredDocs} expired`,
        trend: expiredDocs > 0 ? 'up' : 'neutral',
        description: `${pendingDocs} pending review`,
        icon: 'fileText',
        color: 'info',
      },
    ];
  }, [products, documents]);

  // Compliance breakdown by category
  const complianceBreakdown = useMemo(() => {
    const categories: Record<string, { compliant: number; total: number }> = {};

    products.forEach((p: Product) => {
      const category = p.category || 'Other';
      if (!categories[category]) {
        categories[category] = { compliant: 0, total: 0 };
      }
      categories[category].total++;
      if (p.complianceStatus === 'COMPLIANT') {
        categories[category].compliant++;
      }
    });

    const result = Object.entries(categories).map(([category, data]) => ({
      category,
      score: data.total > 0 ? Math.round((data.compliant / data.total) * 100) : 0,
      weight: Math.round((data.total / products.length) * 100) || 0,
    }));

    // Sort by weight/size
    return result.sort((a, b) => b.weight - a.weight).slice(0, 5);
  }, [products]);

  // Recent activity - derived from products and documents instead of audit logs (admin-only)
  const recentActivity = useMemo(() => {
    const activities: Array<{
      id: string;
      type: 'product' | 'document';
      title: string;
      time: string;
      status: 'success' | 'error' | 'info';
    }> = [];
    
    // Add recent product updates
    products.slice(0, 3).forEach((p: Product) => {
      activities.push({
        id: p._id,
        type: 'product',
        title: `Product ${p.name} - ${p.complianceStatus?.replace(/_/g, ' ') || 'updated'}`,
        time: formatTimeAgo(p.updatedAt || p.createdAt),
        status: p.complianceStatus === 'COMPLIANT' ? 'success' : 
                p.complianceStatus === 'NON_COMPLIANT' ? 'error' : 'info',
      });
    });
    
    // Add recent document updates
    documents.slice(0, 3).forEach((doc: Document) => {
      const docStatus = doc.status as string;
      activities.push({
        id: doc._id,
        type: 'document',
        title: `Document ${doc.name || doc.type} uploaded`,
        time: formatTimeAgo(doc.updatedAt || doc.createdAt),
        status: docStatus === 'SUCCESS' || docStatus === 'ACTIVE' ? 'success' : 
                docStatus === 'FAILED' || docStatus === 'EXPIRED' ? 'error' : 'info',
      });
    });
    
    return activities.slice(0, 5);
  }, [products, documents]);

  // Upcoming deadlines from documents and rules
  const upcomingDeadlines = useMemo(() => {
    const deadlines: Array<{
      id: string;
      title: string;
      dueDate: string;
      daysLeft: number;
      priority: 'high' | 'medium' | 'low';
    }> = [];

    // Documents with expiry
    documents.forEach((doc: Document) => {
      const expiryDateStr = doc.expiryDate || doc.expiresAt;
      if (expiryDateStr) {
        const daysLeft = getDaysUntil(expiryDateStr);
        if (daysLeft > 0 && daysLeft <= 60) {
          deadlines.push({
            id: doc._id,
            title: `${doc.type.replace('_', ' ')} Renewal`,
            dueDate: formatDate(expiryDateStr),
            daysLeft,
            priority: daysLeft <= 7 ? 'high' : daysLeft <= 30 ? 'medium' : 'low',
          });
        }
      }
    });

    // Sort by days left
    return deadlines.sort((a, b) => a.daysLeft - b.daysLeft).slice(0, 4);
  }, [documents]);

  // Overall risk calculation
  const overallRisk = useMemo(() => {
    const totalProducts = products.length;
    if (totalProducts === 0) return { level: 'Low', position: 10 };

    const nonCompliant = products.filter((p: Product) => p.complianceStatus === 'NON_COMPLIANT').length;
    const ratio = nonCompliant / totalProducts;

    if (ratio > 0.3) return { level: 'High', position: 85 };
    if (ratio > 0.1) return { level: 'Medium', position: 50 };
    return { level: 'Low', position: 15 };
  }, [products]);

  if (isLoading) {
    return (
      <DashboardLayout>
        <PageHeader
          title="Status Dashboard"
          description="Monitor your compliance status and risk indicators"
          breadcrumbs={[{ label: 'Merchant', href: '/merchant' }, { label: 'Status' }]}
        />
        <div className="flex items-center justify-center py-12">
          <Icons.loader size={32} className="animate-spin text-primary-600" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <PageHeader
        title="Status Dashboard"
        description="Monitor your compliance status and risk indicators"
        breadcrumbs={[
          { label: 'Merchant', href: '/merchant' },
          { label: 'Status' },
        ]}
        actions={
          <button className="btn btn-secondary">
            <Icons.fileText size={16} className="mr-2" />
            Generate Report
          </button>
        }
      />

      {/* Metrics Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {metrics.map((metric) => {
          const IconComponent = Icons[metric.icon as keyof typeof Icons];
          const colorClasses: Record<string, string> = {
            success: 'bg-success-50 dark:bg-success-900/20 text-success-600 dark:text-success-400',
            primary: 'bg-primary-50 dark:bg-primary-900/20 text-primary-600 dark:text-primary-400',
            warning: 'bg-warning-50 dark:bg-warning-900/20 text-warning-600 dark:text-warning-400',
            info: 'bg-info-50 dark:bg-info-900/20 text-info-600 dark:text-info-400',
            error: 'bg-error-50 dark:bg-error-900/20 text-error-600 dark:text-error-400',
          };

          return (
            <div key={metric.title} className="card p-5">
              <div className="flex items-center justify-between mb-4">
                <div className={`p-2.5 rounded-xl ${colorClasses[metric.color] || colorClasses.primary}`}>
                  <IconComponent size={20} />
                </div>
                <span
                  className={`text-sm font-medium ${
                    metric.trend === 'up'
                      ? 'text-success-600 dark:text-success-400'
                      : metric.trend === 'down'
                      ? 'text-error-600 dark:text-error-400'
                      : 'text-[var(--foreground-muted)]'
                  }`}
                >
                  {metric.change}
                </span>
              </div>
              <p className="text-2xl font-semibold text-[var(--foreground)] mb-1">
                {metric.value}
              </p>
              <p className="text-sm text-[var(--foreground-muted)]">{metric.title}</p>
              <p className="text-xs text-[var(--foreground-muted)] mt-1">{metric.description}</p>
            </div>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Compliance Breakdown */}
        <div className="lg:col-span-2 card p-6">
          <h2 className="text-lg font-semibold text-[var(--foreground)] mb-6">
            Compliance by Category
          </h2>
          {complianceBreakdown.length === 0 ? (
            <p className="text-[var(--foreground-muted)] text-center py-8">
              No products to analyze. Add products to see compliance breakdown.
            </p>
          ) : (
            <div className="space-y-5">
              {complianceBreakdown.map((item) => (
                <div key={item.category}>
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-3">
                      <span className="text-sm font-medium text-[var(--foreground)]">
                        {item.category}
                      </span>
                      <span className="text-xs px-2 py-0.5 rounded-full bg-[var(--background)] text-[var(--foreground-muted)]">
                        {item.weight}% of products
                      </span>
                    </div>
                    <span
                      className={`text-sm font-semibold ${
                        item.score >= 90
                          ? 'text-success-600 dark:text-success-400'
                          : item.score >= 75
                          ? 'text-warning-600 dark:text-warning-400'
                          : 'text-error-600 dark:text-error-400'
                      }`}
                    >
                      {item.score}%
                    </span>
                  </div>
                  <div className="h-3 bg-[var(--background)] rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${
                        item.score >= 90
                          ? 'bg-success-500'
                          : item.score >= 75
                          ? 'bg-warning-500'
                          : 'bg-error-500'
                      }`}
                      style={{ width: `${item.score}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Risk Gauge Visual */}
          <div className="mt-8 pt-6 border-t border-[var(--border)]">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-medium text-[var(--foreground)]">Overall Risk Assessment</h3>
              <span className={`badge ${
                overallRisk.level === 'Low' ? 'badge-success' :
                overallRisk.level === 'Medium' ? 'badge-warning' : 'badge-error'
              }`}>
                {overallRisk.level} Risk
              </span>
            </div>
            <div className="flex items-center gap-2">
              <div className="flex-1 h-4 rounded-full overflow-hidden flex">
                <div className="w-1/3 bg-success-500" />
                <div className="w-1/3 bg-warning-500" />
                <div className="w-1/3 bg-error-500" />
              </div>
            </div>
            <div className="flex justify-between mt-2 text-xs text-[var(--foreground-muted)]">
              <span>Low</span>
              <span>Medium</span>
              <span>High</span>
            </div>
            {/* Indicator */}
            <div className="relative mt-2">
              <div
                className="absolute w-4 h-4 bg-[var(--foreground)] rounded-full border-2 border-[var(--card-bg)] shadow-lg"
                style={{ left: `${overallRisk.position}%`, transform: 'translateX(-50%)' }}
              />
            </div>
          </div>
        </div>

        {/* Upcoming Deadlines */}
        <div className="card p-6">
          <h2 className="text-lg font-semibold text-[var(--foreground)] mb-6">
            Upcoming Deadlines
          </h2>
          {upcomingDeadlines.length === 0 ? (
            <p className="text-[var(--foreground-muted)] text-center py-8">
              No upcoming deadlines. Documents are up to date.
            </p>
          ) : (
            <div className="space-y-4">
              {upcomingDeadlines.map((deadline) => (
                <div
                  key={deadline.id}
                  className={`p-4 rounded-lg border ${
                    deadline.priority === 'high'
                      ? 'border-error-200 dark:border-error-800 bg-error-50/50 dark:bg-error-900/10'
                      : deadline.priority === 'medium'
                      ? 'border-warning-200 dark:border-warning-800 bg-warning-50/50 dark:bg-warning-900/10'
                      : 'border-[var(--border)] bg-[var(--background)]'
                  }`}
                >
                  <div className="flex items-start justify-between mb-2">
                    <h4 className="font-medium text-[var(--foreground)]">{deadline.title}</h4>
                    <span
                      className={`badge ${
                        deadline.priority === 'high'
                          ? 'badge-error'
                          : deadline.priority === 'medium'
                          ? 'badge-warning'
                          : 'badge-info'
                      }`}
                    >
                      {deadline.daysLeft}d left
                    </span>
                  </div>
                  <p className="text-sm text-[var(--foreground-muted)]">
                    Due: {deadline.dueDate}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Recent Activity */}
      <div className="mt-6 card p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-semibold text-[var(--foreground)]">Recent Activity</h2>
          <a href="/admin/audits" className="text-sm text-primary-600 dark:text-primary-400 hover:underline">
            View All
          </a>
        </div>
        {recentActivity.length === 0 ? (
          <p className="text-[var(--foreground-muted)] text-center py-8">
            No recent activity to show.
          </p>
        ) : (
          <div className="divide-y divide-[var(--border)]">
            {recentActivity.map((activity) => (
              <div key={activity.id} className="py-4 first:pt-0 last:pb-0 flex items-start gap-4">
                <div
                  className={`mt-0.5 p-2 rounded-full ${
                    activity.status === 'success'
                      ? 'bg-success-50 dark:bg-success-900/20'
                      : activity.status === 'error'
                      ? 'bg-error-50 dark:bg-error-900/20'
                      : 'bg-info-50 dark:bg-info-900/20'
                  }`}
                >
                  {activity.status === 'success' ? (
                    <Icons.check
                      className="text-success-600 dark:text-success-400"
                      size={14}
                    />
                  ) : activity.status === 'error' ? (
                    <Icons.alertTriangle
                      className="text-error-600 dark:text-error-400"
                      size={14}
                    />
                  ) : (
                    <Icons.activity
                      className="text-info-600 dark:text-info-400"
                      size={14}
                    />
                  )}
                </div>
                <div className="flex-1">
                  <p className="font-medium text-[var(--foreground)]">{activity.title}</p>
                  <p className="text-sm text-[var(--foreground-muted)]">{activity.time}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
