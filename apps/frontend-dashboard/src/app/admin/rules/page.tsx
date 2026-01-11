'use client';

import { useState, useMemo, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { DashboardLayout, PageHeader } from '@/components/layout';
import { Icons } from '@/components/ui/icons';
import { ConfirmDialog } from '@/components/ui/modal';
import { RuleForm } from '@/components/forms/rule-form';
import { StatusBadge } from '@/components/ui/table';
import {
  useComplianceRules,
  createComplianceRule,
  updateComplianceRule,
  deleteComplianceRule,
  toggleRuleStatus,
  ComplianceRule,
  CreateRuleInput,
} from '@/lib/hooks';

const CATEGORIES = [
  { label: 'All Categories', value: '' },
  { label: 'Cannabis', value: 'CANNABIS' },
  { label: 'Hemp/CBD', value: 'HEMP_CBD' },
  { label: 'Supplement', value: 'SUPPLEMENT' },
  { label: 'Pharmaceutical', value: 'PHARMA' },
  { label: 'Peptide', value: 'PEPTIDE' },
];

const STATUSES = [
  { label: 'All Status', value: '' },
  { label: 'Active', value: 'ACTIVE' },
  { label: 'Inactive', value: 'INACTIVE' },
  { label: 'Draft', value: 'DRAFT' },
];

const SEVERITIES = [
  { label: 'All Severity', value: '' },
  { label: 'Blocker', value: 'BLOCKER' },
  { label: 'Warning', value: 'WARNING' },
];

function SeverityBadge({ severity }: { severity: string }) {
  const variant = severity === 'BLOCKER' ? 'error' : 'warning';
  return <StatusBadge status={severity} variant={variant} />;
}

function CategoryBadge({ category }: { category: string }) {
  return (
    <span className="text-xs px-2.5 py-1 rounded-full bg-[var(--background)] text-[var(--foreground-muted)] border border-[var(--border)]">
      {category.replace('_', '/')}
    </span>
  );
}

function Toggle({ enabled, onChange, loading }: { enabled: boolean; onChange: () => void; loading?: boolean }) {
  return (
    <button
      onClick={onChange}
      disabled={loading}
      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors disabled:opacity-50 ${enabled ? 'bg-success-600' : 'bg-[var(--border)]'
        }`}
    >
      <span
        className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${enabled ? 'translate-x-6' : 'translate-x-1'
          }`}
      />
    </button>
  );
}

function RuleCard({
  rule,
  onEdit,
  onDelete,
  onToggle,
  isToggling,
}: {
  rule: ComplianceRule;
  onEdit: () => void;
  onDelete: () => void;
  onToggle: () => void;
  isToggling: boolean;
}) {
  const isActive = rule.status === 'ACTIVE';

  return (
    <div className={`card p-5 ${!isActive ? 'opacity-75' : ''}`}>
      <div className="flex flex-col lg:flex-row lg:items-start gap-4">
        <div className="flex-1">
          <div className="flex items-start gap-3 mb-2">
            <div className="flex items-center gap-2">
              <h3 className="font-semibold text-[var(--foreground)]">
                {rule.name}
              </h3>
              <span className="text-xs font-mono text-[var(--foreground-muted)]">
                {rule.ruleId}
              </span>
            </div>
          </div>
          <p className="text-sm text-[var(--foreground-muted)] mb-3">
            {rule.description}
          </p>
          <div className="flex flex-wrap items-center gap-3">
            <SeverityBadge severity={rule.severity} />
            <CategoryBadge category={rule.category} />
            <StatusBadge status={rule.status} variant={
              rule.status === 'ACTIVE' ? 'success' :
                rule.status === 'DRAFT' ? 'info' : 'neutral'
            } />
            {rule.metadata?.jurisdiction && (
              <span className="text-xs text-[var(--foreground-muted)]">
                📍 {rule.metadata.jurisdiction}
              </span>
            )}
            <span className="text-xs text-[var(--foreground-muted)]">
              v{rule.version}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="text-right">
            <p className="text-sm text-[var(--foreground-muted)]">
              Last updated
            </p>
            <p className="text-sm text-[var(--foreground)]">
              {new Date(rule.updatedAt).toLocaleDateString()}
            </p>
          </div>

          <div className="flex items-center gap-3 pl-4 border-l border-[var(--border)]">
            <Toggle
              enabled={isActive}
              onChange={onToggle}
              loading={isToggling}
            />
            <button
              onClick={onEdit}
              className="p-2 rounded-lg hover:bg-[var(--background)] transition-colors"
              title="Edit rule"
            >
              <Icons.edit size={18} className="text-[var(--foreground-muted)]" />
            </button>
            <button
              onClick={onDelete}
              className="p-2 rounded-lg hover:bg-[var(--background)] transition-colors text-error-600 dark:text-error-400"
              title="Delete rule"
            >
              <Icons.trash size={18} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function AdminRulesPage() {
  const searchParams = useSearchParams();
  const { data, isLoading, error, refetch } = useComplianceRules();
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [severityFilter, setSeverityFilter] = useState('');

  // Initialize search from URL params
  useEffect(() => {
    const search = searchParams.get('search');
    if (search) {
      setSearchQuery(search);
    }
  }, [searchParams]);

  // Modal states
  const [showRuleForm, setShowRuleForm] = useState(false);
  const [editingRule, setEditingRule] = useState<ComplianceRule | undefined>();
  const [deleteRule, setDeleteRule] = useState<ComplianceRule | null>(null);
  const [togglingId, setTogglingId] = useState<string | null>(null);

  const rules = useMemo(() => data?.data || [], [data]);

  // Filter rules
  const filteredRules = useMemo(() => {
    return rules.filter((rule) => {
      const matchesSearch =
        !searchQuery ||
        rule.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        rule.ruleId.toLowerCase().includes(searchQuery.toLowerCase()) ||
        rule.description.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesCategory = !categoryFilter || rule.category === categoryFilter;
      const matchesStatus = !statusFilter || rule.status === statusFilter;
      const matchesSeverity = !severityFilter || rule.severity === severityFilter;

      return matchesSearch && matchesCategory && matchesStatus && matchesSeverity;
    });
  }, [rules, searchQuery, categoryFilter, statusFilter, severityFilter]);

  // Stats
  const stats = useMemo(() => ({
    total: rules.length,
    active: rules.filter((r) => r.status === 'ACTIVE').length,
    blockers: rules.filter((r) => r.severity === 'BLOCKER').length,
    draft: rules.filter((r) => r.status === 'DRAFT').length,
  }), [rules]);

  const handleCreateRule = async (data: CreateRuleInput) => {
    await createComplianceRule(data);
    setShowRuleForm(false);
    refetch();
  };

  const handleUpdateRule = async (data: CreateRuleInput) => {
    if (!editingRule) return;
    await updateComplianceRule(editingRule._id, data);
    setEditingRule(undefined);
    setShowRuleForm(false);
    refetch();
  };

  const handleDeleteRule = async () => {
    if (!deleteRule) return;
    await deleteComplianceRule(deleteRule._id);
    setDeleteRule(null);
    refetch();
  };

  const handleToggleStatus = async (rule: ComplianceRule) => {
    setTogglingId(rule._id);
    try {
      const newStatus = rule.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
      await toggleRuleStatus(rule._id, newStatus);
      refetch();
    } finally {
      setTogglingId(null);
    }
  };

  const openCreateForm = () => {
    setEditingRule(undefined);
    setShowRuleForm(true);
  };

  const openEditForm = (rule: ComplianceRule) => {
    setEditingRule(rule);
    setShowRuleForm(true);
  };

  return (
    <DashboardLayout>
      <PageHeader
        title="Compliance Rules"
        description="Configure and manage compliance rules for product verification"
        breadcrumbs={[
          { label: 'Admin', href: '/admin' },
          { label: 'Rules' },
        ]}
        actions={
          <button className="btn btn-primary" onClick={openCreateForm}>
            <Icons.plus size={16} className="mr-2" />
            Create Rule
          </button>
        }
      />

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 mb-6">
        <div className="card p-4">
          <p className="text-2xl font-semibold text-[var(--foreground)]">
            {isLoading ? '...' : stats.total}
          </p>
          <p className="text-sm text-[var(--foreground-muted)]">Total Rules</p>
        </div>
        <div className="card p-4">
          <p className="text-2xl font-semibold text-success-600 dark:text-success-400">
            {isLoading ? '...' : stats.active}
          </p>
          <p className="text-sm text-[var(--foreground-muted)]">Active</p>
        </div>
        <div className="card p-4">
          <p className="text-2xl font-semibold text-error-600 dark:text-error-400">
            {isLoading ? '...' : stats.blockers}
          </p>
          <p className="text-sm text-[var(--foreground-muted)]">Blockers</p>
        </div>
        <div className="card p-4">
          <p className="text-2xl font-semibold text-[var(--foreground-muted)]">
            {isLoading ? '...' : stats.draft}
          </p>
          <p className="text-sm text-[var(--foreground-muted)]">Draft</p>
        </div>
      </div>

      {/* Filters */}
      <div className="card p-4 mb-6">
        <div className="flex flex-col lg:flex-row lg:items-center gap-4">
          <div className="relative flex-1">
            <Icons.search
              className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--foreground-muted)]"
              size={16}
            />
            <input
              type="text"
              placeholder="Search rules..."
              className="input pl-9"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <select
            className="input lg:w-48"
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
          >
            {CATEGORIES.map((cat) => (
              <option key={cat.value} value={cat.value}>
                {cat.label}
              </option>
            ))}
          </select>
          <select
            className="input lg:w-48"
            value={severityFilter}
            onChange={(e) => setSeverityFilter(e.target.value)}
          >
            {SEVERITIES.map((sev) => (
              <option key={sev.value} value={sev.value}>
                {sev.label}
              </option>
            ))}
          </select>
          <select
            className="input lg:w-48"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            {STATUSES.map((st) => (
              <option key={st.value} value={st.value}>
                {st.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Loading State */}
      {isLoading && (
        <div className="flex items-center justify-center py-12">
          <Icons.loader size={32} className="animate-spin text-primary-600" />
        </div>
      )}

      {/* Error State */}
      {error && (
        <div className="card p-8 text-center">
          <p className="text-error-600 dark:text-error-400 mb-4">{error}</p>
          <button className="btn btn-primary" onClick={refetch}>
            Try Again
          </button>
        </div>
      )}

      {/* Empty State */}
      {!isLoading && !error && filteredRules.length === 0 && (
        <div className="card p-8 text-center">
          <Icons.fileText size={48} className="mx-auto text-[var(--foreground-muted)] mb-4" />
          <h3 className="text-lg font-semibold text-[var(--foreground)] mb-2">
            {rules.length === 0 ? 'No compliance rules yet' : 'No matching rules'}
          </h3>
          <p className="text-[var(--foreground-muted)] mb-6">
            {rules.length === 0
              ? 'Create your first compliance rule to start validating products.'
              : 'Try adjusting your search or filters.'}
          </p>
          {rules.length === 0 && (
            <button className="btn btn-primary" onClick={openCreateForm}>
              <Icons.plus size={16} className="mr-2" />
              Create Rule
            </button>
          )}
        </div>
      )}

      {/* Rules List */}
      {!isLoading && !error && filteredRules.length > 0 && (
        <div className="space-y-4">
          {filteredRules.map((rule) => (
            <RuleCard
              key={rule._id}
              rule={rule}
              onEdit={() => openEditForm(rule)}
              onDelete={() => setDeleteRule(rule)}
              onToggle={() => handleToggleStatus(rule)}
              isToggling={togglingId === rule._id}
            />
          ))}
        </div>
      )}

      {/* Rule Form Modal */}
      <RuleForm
        isOpen={showRuleForm}
        onClose={() => {
          setShowRuleForm(false);
          setEditingRule(undefined);
        }}
        onSubmit={editingRule ? handleUpdateRule : handleCreateRule}
        rule={editingRule}
      />

      {/* Delete Confirmation */}
      <ConfirmDialog
        isOpen={!!deleteRule}
        onClose={() => setDeleteRule(null)}
        onConfirm={handleDeleteRule}
        title="Delete Rule"
        message={`Are you sure you want to delete "${deleteRule?.name}"? This action cannot be undone.`}
        confirmLabel="Delete"
        variant="danger"
      />
    </DashboardLayout>
  );
}
