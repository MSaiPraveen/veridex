'use client';

import { useState, useMemo, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { DashboardLayout, PageHeader } from '@/components/layout';
import { Icons } from '@/components/ui/icons';
import { ConfirmDialog } from '@/components/ui/modal';
import { DataTable, Pagination, StatusBadge } from '@/components/ui/table';
import { UserForm, UserUpdateInput } from '@/components/forms/user-form';
import { useUsers, updateUser, deleteUser, User } from '@/lib/hooks';
import { withAuth } from '@/lib/auth-context';

const ROLES = [
  { label: 'All Roles', value: '' },
  { label: 'Consumer', value: 'CONSUMER' },
  { label: 'Merchant', value: 'MERCHANT' },
  { label: 'Admin', value: 'ADMIN' },
  { label: 'Super Admin', value: 'SUPER_ADMIN' },
];

const STATUSES = [
  { label: 'All Status', value: '' },
  { label: 'Active', value: 'ACTIVE' },
  { label: 'Inactive', value: 'INACTIVE' },
  { label: 'Locked', value: 'LOCKED' },
];

function RoleBadge({ role }: { role: string }) {
  const colors: Record<string, string> = {
    SUPER_ADMIN: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
    ADMIN: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
    MERCHANT: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
    CONSUMER: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  };

  const labels: Record<string, string> = {
    SUPER_ADMIN: 'Super Admin',
    ADMIN: 'Admin',
    MERCHANT: 'Merchant',
    CONSUMER: 'Consumer',
  };

  return (
    <span className={`px-2 py-1 text-xs rounded-full ${colors[role] || 'bg-gray-100 text-gray-700'}`}>
      {labels[role] || role}
    </span>
  );
}

function AdminUsersPage() {
  const searchParams = useSearchParams();
  const { data, isLoading, refetch } = useUsers();
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
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
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [deleteUserState, setDeleteUserState] = useState<User | null>(null);

  const users = useMemo(() => data?.data || [], [data]);

  // Filter users
  const filteredUsers = useMemo(() => {
    return users.filter((user) => {
      const matchesSearch =
        !searchQuery ||
        user.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
        user.firstName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        user.lastName?.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesRole = !roleFilter || user.role === roleFilter;
      const matchesStatus = !statusFilter || user.status === statusFilter;

      return matchesSearch && matchesRole && matchesStatus;
    });
  }, [users, searchQuery, roleFilter, statusFilter]);

  // Pagination
  const totalPages = Math.ceil(filteredUsers.length / itemsPerPage);
  const paginatedUsers = filteredUsers.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  // Stats
  const stats = useMemo(
    () => ({
      total: users.length,
      active: users.filter((u) => u.status === 'ACTIVE').length,
      admins: users.filter((u) => u.role === 'ADMIN' || u.role === 'SUPER_ADMIN').length,
      merchants: users.filter((u) => u.role === 'MERCHANT').length,
    }),
    [users]
  );

  const handleUpdateUser = async (data: UserUpdateInput) => {
    if (!editingUser) return;
    await updateUser(editingUser._id, data);
    setEditingUser(null);
    refetch();
  };

  const handleDeleteUser = async () => {
    if (!deleteUserState) return;
    await deleteUser(deleteUserState._id);
    setDeleteUserState(null);
    refetch();
  };

  const columns = [
    {
      key: 'user',
      header: 'User',
      render: (user: User) => (
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center">
            <span className="text-primary-600 dark:text-primary-400 font-medium text-sm">
              {(user.firstName?.[0] || user.email[0]).toUpperCase()}
            </span>
          </div>
          <div>
            <p className="font-medium text-[var(--foreground)]">
              {user.firstName && user.lastName
                ? `${user.firstName} ${user.lastName}`
                : user.email.split('@')[0]}
            </p>
            <p className="text-xs text-[var(--foreground-muted)]">{user.email}</p>
          </div>
        </div>
      ),
    },
    {
      key: 'role',
      header: 'Role',
      render: (user: User) => <RoleBadge role={user.role} />,
    },
    {
      key: 'status',
      header: 'Status',
      render: (user: User) => (
        <StatusBadge
          status={user.status}
          variant={
            user.status === 'ACTIVE'
              ? 'success'
              : user.status === 'INACTIVE'
                ? 'neutral'
                : 'error'
          }
        />
      ),
    },
    {
      key: 'createdAt',
      header: 'Joined',
      render: (user: User) => (
        <span className="text-sm text-[var(--foreground-muted)]">
          {new Date(user.createdAt).toLocaleDateString()}
        </span>
      ),
    },
    {
      key: 'actions',
      header: '',
      render: (user: User) => (
        <div className="flex items-center gap-2 justify-end">
          <button
            onClick={() => setEditingUser(user)}
            className="p-2 rounded-lg hover:bg-[var(--background)] transition-colors"
            title="Edit"
          >
            <Icons.edit size={16} className="text-[var(--foreground-muted)]" />
          </button>
          <button
            onClick={() => setDeleteUserState(user)}
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
        title="Users"
        description="Manage user accounts, roles, and permissions"
        breadcrumbs={[
          { label: 'Admin', href: '/admin' },
          { label: 'Users' },
        ]}
      />

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 mb-6">
        <div className="card p-4">
          <p className="text-2xl font-semibold text-[var(--foreground)]">
            {isLoading ? '...' : stats.total}
          </p>
          <p className="text-sm text-[var(--foreground-muted)]">Total Users</p>
        </div>
        <div className="card p-4">
          <p className="text-2xl font-semibold text-success-600 dark:text-success-400">
            {isLoading ? '...' : stats.active}
          </p>
          <p className="text-sm text-[var(--foreground-muted)]">Active</p>
        </div>
        <div className="card p-4">
          <p className="text-2xl font-semibold text-purple-600 dark:text-purple-400">
            {isLoading ? '...' : stats.admins}
          </p>
          <p className="text-sm text-[var(--foreground-muted)]">Admins</p>
        </div>
        <div className="card p-4">
          <p className="text-2xl font-semibold text-blue-600 dark:text-blue-400">
            {isLoading ? '...' : stats.merchants}
          </p>
          <p className="text-sm text-[var(--foreground-muted)]">Merchants</p>
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
              placeholder="Search users..."
              className="input pl-9"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <select
            className="input lg:w-48"
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
          >
            {ROLES.map((r) => (
              <option key={r.value} value={r.value}>
                {r.label}
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
          data={paginatedUsers}
          isLoading={isLoading}
          emptyTitle="No users found"
          emptyMessage="Try adjusting your search or filters."
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

      {/* User Edit Modal */}
      {editingUser && (
        <UserForm
          isOpen={!!editingUser}
          onClose={() => setEditingUser(null)}
          onSubmit={handleUpdateUser}
          user={editingUser}
        />
      )}

      {/* Delete Confirmation */}
      <ConfirmDialog
        isOpen={!!deleteUserState}
        onClose={() => setDeleteUserState(null)}
        onConfirm={handleDeleteUser}
        title="Delete User"
        message={`Are you sure you want to delete "${deleteUserState?.email}"? This action cannot be undone.`}
        confirmLabel="Delete"
        variant="danger"
      />
    </DashboardLayout>
  );
}

export default withAuth(AdminUsersPage, ['ADMIN', 'SUPER_ADMIN']);
