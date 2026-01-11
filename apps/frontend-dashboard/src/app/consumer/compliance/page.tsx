'use client';

import { useMemo } from 'react';
import { DashboardLayout, PageHeader } from '@/components/layout';
import { Icons } from '@/components/ui/icons';
import { usePublicProducts, useDocuments, useComplianceRules, Product, Document, ComplianceRule } from '@/lib/hooks';

function StepIndicator({ status, stepNumber }: { status: 'completed' | 'in-progress' | 'pending'; stepNumber: number }) {
  if (status === 'completed') {
    return (
      <div className="w-10 h-10 rounded-full bg-success-500 flex items-center justify-center">
        <Icons.check className="text-white" size={20} />
      </div>
    );
  }
  if (status === 'in-progress') {
    return (
      <div className="w-10 h-10 rounded-full bg-primary-500 flex items-center justify-center animate-pulse">
        <span className="text-white font-semibold">{stepNumber}</span>
      </div>
    );
  }
  return (
    <div className="w-10 h-10 rounded-full bg-[var(--background)] border-2 border-[var(--border)] flex items-center justify-center">
      <span className="text-[var(--foreground-muted)] font-semibold">{stepNumber}</span>
    </div>
  );
}

export default function ConsumerCompliancePage() {
  // Use PUBLIC endpoint for consumers (no auth required to see products)
  const { data: productsData, isLoading: loadingProducts } = usePublicProducts({ limit: '100' });
  const { data: docsData, isLoading: loadingDocs } = useDocuments();
  const { data: rulesData, isLoading: loadingRules } = useComplianceRules();

  const products = productsData?.data || [];
  const documents = docsData?.data || [];
  const rules = rulesData?.data || [];

  const isLoading = loadingProducts || loadingDocs || loadingRules;

  // Calculate compliance stats
  const stats = useMemo(() => {
    const compliantProducts = products.filter((p: Product) => p.complianceStatus === 'COMPLIANT').length;
    const pendingProducts = products.filter((p: Product) => p.complianceStatus === 'PENDING' || p.complianceStatus === 'REQUIRES_REVIEW').length;
    const totalProducts = products.length;
    const complianceRate = totalProducts > 0 ? Math.round((compliantProducts / totalProducts) * 100) : 0;

    const validDocs = documents.filter((d: Document) => d.status === 'SUCCESS').length;
    const expiredDocs = documents.filter((d: Document) => d.status === 'EXPIRED').length;
    const pendingDocs = documents.filter((d: Document) => d.status === 'PENDING' || d.status === 'PROCESSING').length;

    const activeRules = rules.filter((r: ComplianceRule) => r.status === 'ACTIVE').length;

    return {
      complianceRate,
      compliantProducts,
      pendingProducts,
      totalProducts,
      validDocs,
      expiredDocs,
      pendingDocs,
      totalDocs: documents.length,
      activeRules,
    };
  }, [products, documents, rules]);

  // Build compliance steps dynamically based on data
  const complianceSteps = useMemo(() => {
    const hasProducts = products.length > 0;
    const hasDocuments = documents.length > 0;
    const hasApprovedProducts = products.some((p: Product) => p.status === 'APPROVED');
    const hasValidDocs = documents.some((d: Document) => d.status === 'SUCCESS');
    const isFullyCompliant = stats.complianceRate === 100;

    return [
      {
        id: 1,
        title: 'Account Setup',
        description: 'Create your account and verify business information',
        status: 'completed' as const, // If user is logged in, account is set up
      },
      {
        id: 2,
        title: 'Add Products',
        description: 'Register your products for compliance verification',
        status: hasProducts ? 'completed' as const : 'in-progress' as const,
      },
      {
        id: 3,
        title: 'Upload Documents',
        description: 'Submit required compliance documents and certificates',
        status: !hasProducts ? 'pending' as const : hasDocuments ? 'completed' as const : 'in-progress' as const,
      },
      {
        id: 4,
        title: 'Compliance Review',
        description: 'Automated verification against active compliance rules',
        status: !hasDocuments ? 'pending' as const : hasValidDocs ? 'completed' as const : 'in-progress' as const,
      },
      {
        id: 5,
        title: 'Full Compliance',
        description: 'All products meet compliance requirements',
        status: isFullyCompliant ? 'completed' as const : hasApprovedProducts ? 'in-progress' as const : 'pending' as const,
      },
    ];
  }, [products, documents, stats.complianceRate]);

  // Build checklist items from actual data
  const checklistItems = useMemo(() => {
    const items = [];

    // Products checklist
    items.push({
      id: 'products',
      title: 'Products Registered',
      description: `${products.length} products in the system`,
      completed: products.length > 0,
      category: 'Products',
    });

    // Documents checklist
    const docTypes = ['LAB_REPORT', 'LICENSE', 'CERTIFICATE', 'COA'];
    docTypes.forEach((type) => {
      const hasDoc = documents.some((d: Document) => d.type === type && d.status === 'SUCCESS');
      items.push({
        id: `doc-${type}`,
        title: type.replace('_', ' '),
        description: hasDoc ? 'Document verified' : 'Required document',
        completed: hasDoc,
        category: 'Documents',
      });
    });

    // Compliance rules
    items.push({
      id: 'compliance-check',
      title: 'Compliance Rules Passed',
      description: `${stats.compliantProducts} of ${stats.totalProducts} products compliant`,
      completed: stats.complianceRate >= 80,
      category: 'Compliance',
    });

    return items;
  }, [products, documents, stats]);

  const completedSteps = complianceSteps.filter((s) => s.status === 'completed').length;
  const completedChecklist = checklistItems.filter((i) => i.completed).length;

  if (isLoading) {
    return (
      <DashboardLayout>
        <PageHeader
          title="Compliance Status"
          description="Track your verification progress"
          breadcrumbs={[{ label: 'Consumer', href: '/consumer' }, { label: 'Compliance' }]}
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
        title="Compliance Status"
        description="Track your verification progress and compliance requirements"
        breadcrumbs={[
          { label: 'Consumer', href: '/consumer' },
          { label: 'Compliance' },
        ]}
      />

      {/* Progress Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="card p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-[var(--foreground)]">Overall Progress</h3>
            <span className="text-2xl font-bold text-primary-600 dark:text-primary-400">
              {completedSteps}/{complianceSteps.length}
            </span>
          </div>
          <div className="h-2 bg-[var(--background)] rounded-full overflow-hidden">
            <div
              className="h-full bg-primary-500 rounded-full transition-all"
              style={{ width: `${(completedSteps / complianceSteps.length) * 100}%` }}
            />
          </div>
          <p className="text-sm text-[var(--foreground-muted)] mt-2">
            {complianceSteps.length - completedSteps} steps remaining
          </p>
        </div>

        <div className="card p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-[var(--foreground)]">Compliance Rate</h3>
            <span className={`text-2xl font-bold ${stats.complianceRate >= 80 ? 'text-success-600 dark:text-success-400' :
              stats.complianceRate >= 50 ? 'text-warning-600 dark:text-warning-400' :
                'text-error-600 dark:text-error-400'
              }`}>
              {stats.complianceRate}%
            </span>
          </div>
          <div className="h-2 bg-[var(--background)] rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all ${stats.complianceRate >= 80 ? 'bg-success-500' :
                stats.complianceRate >= 50 ? 'bg-warning-500' : 'bg-error-500'
                }`}
              style={{ width: `${stats.complianceRate}%` }}
            />
          </div>
          <p className="text-sm text-[var(--foreground-muted)] mt-2">
            {stats.compliantProducts} of {stats.totalProducts} products compliant
          </p>
        </div>

        <div className="card p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-[var(--foreground)]">Documents Status</h3>
            <span className="text-2xl font-bold text-info-600 dark:text-info-400">
              {stats.validDocs}/{stats.totalDocs}
            </span>
          </div>
          <div className="flex items-center gap-4 text-sm">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-success-500" />
              <span className="text-[var(--foreground-muted)]">{stats.validDocs} Valid</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-warning-500" />
              <span className="text-[var(--foreground-muted)]">{stats.pendingDocs} Pending</span>
            </div>
            {stats.expiredDocs > 0 && (
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-error-500" />
                <span className="text-[var(--foreground-muted)]">{stats.expiredDocs} Expired</span>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Compliance Steps */}
        <div className="lg:col-span-2">
          <div className="card p-6">
            <h3 className="font-semibold text-[var(--foreground)] mb-6">Compliance Journey</h3>
            <div className="space-y-6">
              {complianceSteps.map((step, index) => (
                <div key={step.id} className="flex gap-4">
                  <div className="flex flex-col items-center">
                    <StepIndicator status={step.status} stepNumber={step.id} />
                    {index < complianceSteps.length - 1 && (
                      <div className={`w-0.5 h-12 mt-2 ${step.status === 'completed' ? 'bg-success-500' : 'bg-[var(--border)]'
                        }`} />
                    )}
                  </div>
                  <div className="flex-1 pt-1">
                    <h4 className="font-medium text-[var(--foreground)]">{step.title}</h4>
                    <p className="text-sm text-[var(--foreground-muted)] mt-1">{step.description}</p>
                    {step.status === 'in-progress' && (
                      <span className="inline-block mt-2 text-xs bg-primary-100 dark:bg-primary-900/30 text-primary-600 dark:text-primary-400 px-2 py-1 rounded">
                        In Progress
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Checklist */}
        <div className="lg:col-span-1">
          <div className="card p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="font-semibold text-[var(--foreground)]">Compliance Checklist</h3>
              <span className="text-sm text-[var(--foreground-muted)]">
                {completedChecklist}/{checklistItems.length}
              </span>
            </div>
            <div className="space-y-4">
              {checklistItems.map((item) => (
                <div key={item.id} className="flex items-start gap-3">
                  <div className={`w-5 h-5 rounded flex items-center justify-center flex-shrink-0 mt-0.5 ${item.completed
                    ? 'bg-success-500 text-white'
                    : 'border-2 border-[var(--border)]'
                    }`}>
                    {item.completed && <Icons.check size={12} />}
                  </div>
                  <div>
                    <p className={`text-sm font-medium ${item.completed ? 'text-[var(--foreground)]' : 'text-[var(--foreground-muted)]'
                      }`}>
                      {item.title}
                    </p>
                    <p className="text-xs text-[var(--foreground-muted)]">{item.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Active Rules Info */}
          <div className="card p-6 mt-6">
            <h3 className="font-semibold text-[var(--foreground)] mb-4">Active Compliance Rules</h3>
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center">
                <Icons.settings className="text-primary-600 dark:text-primary-400" size={24} />
              </div>
              <div>
                <p className="text-2xl font-bold text-[var(--foreground)]">{stats.activeRules}</p>
                <p className="text-sm text-[var(--foreground-muted)]">Rules being enforced</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
