'use client';

import { DashboardLayout, PageHeader } from '@/components/layout';
import { Icons } from '@/components/ui/icons';
import { useAuth } from '@/lib/auth-context';
import Link from 'next/link';

export default function OrganizationPage() {
  const { user } = useAuth();

  // Mock organization data - replace with real API call
  const organization = {
    id: user?.organizationId,
    name: 'Your Organization',
    type: 'MANUFACTURER',
    status: 'ACTIVE',
    contactEmail: user?.email,
    contactPhone: '',
    address: {
      street: '',
      city: '',
      state: '',
      zip: '',
      country: 'USA',
    },
  };

  const statusColors: Record<string, string> = {
    ACTIVE: 'bg-success-100 text-success-700 dark:bg-success-900/30 dark:text-success-400',
    PENDING: 'bg-warning-100 text-warning-700 dark:bg-warning-900/30 dark:text-warning-400',
    SUSPENDED: 'bg-error-100 text-error-700 dark:bg-error-900/30 dark:text-error-400',
  };

  const typeIcons: Record<string, keyof typeof Icons> = {
    MANUFACTURER: 'package',
    DISTRIBUTOR: 'truck',
    RETAILER: 'store',
    LABORATORY: 'clipboardCheck',
    IMPORTER: 'download',
    EXPORTER: 'upload',
  };

  if (!user?.organizationId) {
    return (
      <DashboardLayout>
        <PageHeader
          title="Organization"
          description="View and manage your organization"
        />
        <div className="card p-12 text-center">
          <Icons.building size={48} className="text-[var(--foreground-muted)] mx-auto mb-4" />
          <h3 className="text-lg font-medium text-[var(--foreground)] mb-2">
            No Organization
          </h3>
          <p className="text-[var(--foreground-muted)] mb-4">
            You are not associated with any organization yet.
          </p>
          {user?.role === 'ADMIN' || user?.role === 'SUPER_ADMIN' ? (
            <Link href="/admin/organizations" className="btn btn-primary">
              Manage Organizations
            </Link>
          ) : (
            <p className="text-sm text-[var(--foreground-muted)]">
              Contact an administrator to be added to an organization.
            </p>
          )}
        </div>
      </DashboardLayout>
    );
  }

  const TypeIcon = Icons[typeIcons[organization.type] || 'building'];

  return (
    <DashboardLayout>
      <PageHeader
        title="Organization"
        description="View your organization details"
      />

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Organization Card */}
        <div className="lg:col-span-1">
          <div className="card p-6 text-center">
            <div className="w-20 h-20 rounded-xl bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center mx-auto mb-4">
              <TypeIcon size={36} className="text-primary-600 dark:text-primary-400" />
            </div>
            <h2 className="text-xl font-semibold text-[var(--foreground)]">
              {organization.name}
            </h2>
            <p className="text-[var(--foreground-muted)] mt-1 capitalize">
              {organization.type?.toLowerCase().replace('_', ' ')}
            </p>
            <span className={`inline-block mt-3 px-3 py-1 text-sm font-medium rounded-full ${statusColors[organization.status] || 'bg-gray-100 text-gray-700'}`}>
              {organization.status}
            </span>
          </div>

          {/* Quick Stats */}
          <div className="card p-6 mt-6">
            <h3 className="text-sm font-semibold text-[var(--foreground-muted)] uppercase tracking-wider mb-4">
              Organization ID
            </h3>
            <p className="text-sm font-mono text-[var(--foreground)] bg-[var(--background)] px-3 py-2 rounded-lg break-all">
              {organization.id || user?.organizationId}
            </p>
          </div>
        </div>

        {/* Details */}
        <div className="lg:col-span-2 space-y-6">
          {/* Contact Information */}
          <div className="card">
            <div className="p-6 border-b border-[var(--border)]">
              <h3 className="text-lg font-semibold text-[var(--foreground)]">Contact Information</h3>
              <p className="text-sm text-[var(--foreground-muted)]">Organization contact details</p>
            </div>
            <div className="p-6 grid gap-6 md:grid-cols-2">
              <div>
                <label className="block text-sm font-medium text-[var(--foreground-muted)] mb-1">
                  Contact Email
                </label>
                <div className="flex items-center gap-2 text-[var(--foreground)]">
                  <Icons.mail size={16} className="text-[var(--foreground-muted)]" />
                  <span>{organization.contactEmail || 'Not provided'}</span>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-[var(--foreground-muted)] mb-1">
                  Contact Phone
                </label>
                <div className="flex items-center gap-2 text-[var(--foreground)]">
                  <Icons.phone size={16} className="text-[var(--foreground-muted)]" />
                  <span>{organization.contactPhone || 'Not provided'}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Address */}
          <div className="card">
            <div className="p-6 border-b border-[var(--border)]">
              <h3 className="text-lg font-semibold text-[var(--foreground)]">Address</h3>
              <p className="text-sm text-[var(--foreground-muted)]">Business location</p>
            </div>
            <div className="p-6">
              {organization.address?.street ? (
                <div className="flex items-start gap-3">
                  <Icons.mapPin size={20} className="text-[var(--foreground-muted)] mt-0.5" />
                  <div>
                    <p className="text-[var(--foreground)]">{organization.address.street}</p>
                    <p className="text-[var(--foreground)]">
                      {organization.address.city}, {organization.address.state} {organization.address.zip}
                    </p>
                    <p className="text-[var(--foreground-muted)]">{organization.address.country}</p>
                  </div>
                </div>
              ) : (
                <p className="text-[var(--foreground-muted)]">No address on file</p>
              )}
            </div>
          </div>

          {/* Team Members Note */}
          <div className="card">
            <div className="p-6 border-b border-[var(--border)]">
              <h3 className="text-lg font-semibold text-[var(--foreground)]">Team</h3>
              <p className="text-sm text-[var(--foreground-muted)]">Organization members</p>
            </div>
            <div className="p-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-primary-600 flex items-center justify-center">
                  <span className="text-sm font-medium text-white">
                    {user?.firstName?.[0]}{user?.lastName?.[0]}
                  </span>
                </div>
                <div>
                  <p className="font-medium text-[var(--foreground)]">
                    {user?.firstName} {user?.lastName}
                  </p>
                  <p className="text-sm text-[var(--foreground-muted)]">{user?.email}</p>
                </div>
                <span className="ml-auto text-xs px-2 py-1 rounded-full bg-primary-100 text-primary-700 dark:bg-primary-900/30 dark:text-primary-400">
                  {user?.role?.replace('_', ' ')}
                </span>
              </div>
              <p className="text-sm text-[var(--foreground-muted)] mt-4">
                Contact an administrator to manage team members.
              </p>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
