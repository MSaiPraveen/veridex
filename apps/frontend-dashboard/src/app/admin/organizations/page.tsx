'use client';

import { useState, useMemo, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { DashboardLayout, PageHeader } from '@/components/layout';
import { Icons } from '@/components/ui/icons';
import { ConfirmDialog } from '@/components/ui/modal';
import { DataTable, Pagination, StatusBadge } from '@/components/ui/table';
import { OrganizationForm } from '@/components/forms/organization-form';
import {
  useOrganizations,
  createOrganization,
  updateOrganization,
  deleteOrganization,
  Organization,
  CreateOrganizationInput,
} from '@/lib/hooks';

const TYPES = [
  { label: 'All Types', value: '' },
  { label: 'Manufacturer', value: 'MANUFACTURER' },
  { label: 'Distributor', value: 'DISTRIBUTOR' },
  { label: 'Retailer', value: 'RETAILER' },
  { label: 'Importer', value: 'IMPORTER' },
  { label: 'Exporter', value: 'EXPORTER' },
  { label: 'Laboratory', value: 'LABORATORY' },
];

const STATUSES = [
  { label: 'All Status', value: '' },
  { label: 'Active', value: 'ACTIVE' },
  { label: 'Pending', value: 'PENDING' },
  { label: 'Suspended', value: 'SUSPENDED' },
];

function TypeBadge({ type }: { type: string }) {
  const colors: Record<string, string> = {
    MANUFACTURER: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
    DISTRIBUTOR: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
    RETAILER: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
    IMPORTER: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
    EXPORTER: 'bg-pink-100 text-pink-700 dark:bg-pink-900/30 dark:text-pink-400',
    LABORATORY: 'bg-cyan-100 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-400',
  };

  return (
    <span className={`px-2 py-1 text-xs rounded-full ${colors[type] || 'bg-gray-100 text-gray-700'}`}>
      {type.charAt(0) + type.slice(1).toLowerCase()}
    </span>
  );
}

export default function AdminOrganizationsPage() {
  const searchParams = useSearchParams();
  const { data, isLoading, error, refetch } = useOrganizations();
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // Initialize search from URL params
  useEffect(() => {
    const search = searchParams.get('search');
    if (search) {
      setSearchQuery(search);
    }
  }, [searchParams]);

  // Modal states
  const [showOrgForm, setShowOrgForm] = useState(false);
  const [editingOrg, setEditingOrg] = useState<Organization | undefined>();
  const [deleteOrg, setDeleteOrg] = useState<Organization | null>(null);

  const organizations = data?.data || [];

  // Filter organizations
  const filteredOrgs = useMemo(() => {
    return organizations.filter((org) => {
      const matchesSearch =
        !searchQuery ||
        org.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        org.contactEmail.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesType = !typeFilter || org.type === typeFilter;
      const matchesStatus = !statusFilter || org.status === statusFilter;

      return matchesSearch && matchesType && matchesStatus;
    });
  }, [organizations, searchQuery, typeFilter, statusFilter]);

  // Pagination
  const totalPages = Math.ceil(filteredOrgs.length / itemsPerPage);
  const paginatedOrgs = filteredOrgs.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  // Stats
  const stats = useMemo(
    () => ({
      total: organizations.length,
      active: organizations.filter((o) => o.status === 'ACTIVE').length,
      pending: organizations.filter((o) => o.status === 'PENDING').length,
      byType: TYPES.slice(1).map((t) => ({
        type: t.label,
        count: organizations.filter((o) => o.type === t.value).length,
      })),
    }),
    [organizations]
  );

  const handleCreateOrg = async (data: CreateOrganizationInput) => {
    await createOrganization(data);
    setShowOrgForm(false);
    refetch();
  };

  const handleUpdateOrg = async (data: CreateOrganizationInput) => {
    if (!editingOrg) return;
    await updateOrganization(editingOrg._id, data);
    setEditingOrg(undefined);
    setShowOrgForm(false);
    refetch();
  };

  const handleDeleteOrg = async () => {
    if (!deleteOrg) return;
    await deleteOrganization(deleteOrg._id);
    setDeleteOrg(null);
    refetch();
  };

  const openCreateForm = () => {
    setEditingOrg(undefined);
    setShowOrgForm(true);
  };

  const openEditForm = (org: Organization) => {
    setEditingOrg(org);
    setShowOrgForm(true);
  };

  const columns = [
    {
      key: 'name',
      header: 'Organization',
      render: (org: Organization) => (
        <div>
          <p className="font-medium text-[var(--foreground)]">{org.name}</p>
          <p className="text-xs text-[var(--foreground-muted)]">{org.contactEmail}</p>
        </div>
      ),
    },
    {
      key: 'type',
      header: 'Type',
      render: (org: Organization) => <TypeBadge type={org.type} />,
    },
    {
      key: 'status',
      header: 'Status',
      render: (org: Organization) => (
        <StatusBadge
          status={org.status}
          variant={
            org.status === 'ACTIVE'
              ? 'success'
              : org.status === 'PENDING'
                ? 'warning'
                : 'error'
          }
        />
      ),
    },
    {
      key: 'address',
      header: 'Location',
      render: (org: Organization) => (
        <span className="text-sm text-[var(--foreground-muted)]">
          {org.address?.city && org.address?.state
            ? `${org.address.city}, ${org.address.state}`
            : org.address?.country || '—'}
        </span>
      ),
    },
    {
      key: 'createdAt',
      header: 'Joined',
      render: (org: Organization) => (
        <span className="text-sm text-[var(--foreground-muted)]">
          {new Date(org.createdAt).toLocaleDateString()}
        </span>
      ),
    },
    {
      key: 'actions',
      header: '',
      render: (org: Organization) => (
        <div className="flex items-center gap-2 justify-end">
          <button
            onClick={() => openEditForm(org)}
            className="p-2 rounded-lg hover:bg-[var(--background)] transition-colors"
            title="Edit"
          >
            <Icons.edit size={16} className="text-[var(--foreground-muted)]" />
          </button>
          <button
            onClick={() => setDeleteOrg(org)}
            className="p-2 rounded-lg hover:bg-[var(--background)] transition-colors"
            title="Delete"
          >
            <Icons.trash size={16} className="text-error-600 dark:text-error-400" />
          </button>
        </div>
      ),
    },
  ];

  return (
    <DashboardLayout>
      <PageHeader
        title="Organizations"
        description="Manage organizations, manufacturers, distributors, and partners"
        breadcrumbs={[
          { label: 'Admin', href: '/admin' },
          { label: 'Organizations' },
        ]}
        actions={
          <button className="btn btn-primary" onClick={openCreateForm}>
            <Icons.plus size={16} className="mr-2" />
            Add Organization
          </button>
        }
      />

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 mb-6">
        <div className="card p-4">
          <p className="text-2xl font-semibold text-[var(--foreground)]">
            {isLoading ? '...' : stats.total}
          </p>
          <p className="text-sm text-[var(--foreground-muted)]">Total Organizations</p>
        </div>
        <div className="card p-4">
          <p className="text-2xl font-semibold text-success-600 dark:text-success-400">
            {isLoading ? '...' : stats.active}
          </p>
          <p className="text-sm text-[var(--foreground-muted)]">Active</p>
        </div>
        <div className="card p-4">
          <p className="text-2xl font-semibold text-warning-600 dark:text-warning-400">
            {isLoading ? '...' : stats.pending}
          </p>
          <p className="text-sm text-[var(--foreground-muted)]">Pending Approval</p>
        </div>
        <div className="card p-4">
          <p className="text-2xl font-semibold text-primary-600 dark:text-primary-400">
            {isLoading
              ? '...'
              : organizations.filter((o) => o.type === 'MANUFACTURER').length}
          </p>
          <p className="text-sm text-[var(--foreground-muted)]">Manufacturers</p>
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
              placeholder="Search organizations..."
              className="input pl-9"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <select
            className="input lg:w-48"
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
          >
            {TYPES.map((t) => (
              <option key={t.value} value={t.value}>
                {t.label}
              </option>
            ))}
          </select>
          <select
            className="input lg:w-48"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            {STATUSES.map((s) => (
              <option key={s.value} value={s.value}>
                {s.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Data Table */}
      <div className="card overflow-hidden">
        <DataTable
          columns={columns}
          data={paginatedOrgs}
          isLoading={isLoading}
          emptyTitle="No organizations found"
          emptyMessage="Add your first organization to get started."
          emptyAction={
            <button className="btn btn-primary" onClick={openCreateForm}>
              <Icons.plus size={16} className="mr-2" />
              Add Organization
            </button>
          }
        />

        {totalPages > 1 && (
          <div className="p-4 border-t border-[var(--border)]">
            <Pagination
              currentPage={currentPage}
              totalPages={totalPages}
              onPageChange={setCurrentPage}
            />
          </div>
        )}
      </div>

      {/* Organization Form Modal */}
      <OrganizationForm
        isOpen={showOrgForm}
        onClose={() => {
          setShowOrgForm(false);
          setEditingOrg(undefined);
        }}
        onSubmit={editingOrg ? handleUpdateOrg : handleCreateOrg}
        organization={editingOrg}
      />

      {/* Delete Confirmation */}
      <ConfirmDialog
        isOpen={!!deleteOrg}
        onClose={() => setDeleteOrg(null)}
        onConfirm={handleDeleteOrg}
        title="Delete Organization"
        message={`Are you sure you want to delete "${deleteOrg?.name}"? This will remove all associated data.`}
        confirmLabel="Delete"
        variant="danger"
      />
    </DashboardLayout>
  );
}
