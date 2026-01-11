'use client';

import { DashboardLayout, PageHeader } from '@/components/layout';
import { Icons } from '@/components/ui/icons';
import Link from 'next/link';
import { useAuth } from '@/lib/auth-context';
import { useMyProducts, Product } from '@/lib/hooks';

export default function MerchantDashboard() {
  const { user } = useAuth();
  const { data, isLoading } = useMyProducts();

  // Get products array from paginated response
  const products = data?.data || [];

  // Calculate stats from products - handle both status and complianceStatus
  const totalProducts = products.length;
  const approvedProducts = products.filter((p: Product) =>
    p.status === 'APPROVED' || p.complianceStatus === 'COMPLIANT'
  ).length;
  const pendingProducts = products.filter((p: Product) =>
    p.status === 'PENDING_REVIEW' || p.complianceStatus === 'PENDING'
  ).length;
  const complianceRate = totalProducts > 0 ? Math.round((approvedProducts / totalProducts) * 100) : 0;

  // Helper to get display status
  const getDisplayStatus = (product: Product) => {
    const status = product.status || product.complianceStatus || 'PENDING';
    return status.replace(/_/g, ' ');
  };

  const getStatusBadgeClass = (product: Product) => {
    const status = product.status || product.complianceStatus;
    if (status === 'APPROVED' || status === 'COMPLIANT') return 'badge-success';
    if (status === 'PENDING_REVIEW' || status === 'PENDING') return 'badge-warning';
    if (status === 'REJECTED' || status === 'NON_COMPLIANT') return 'badge-error';
    return 'badge-secondary';
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <PageHeader
          title={`Welcome back${user?.firstName ? `, ${user.firstName}` : ''}!`}
          description="Manage your products and compliance status"
        />

        {/* Stats Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="card p-5">
            <div className="flex items-center justify-between mb-3">
              <div className="p-2 rounded-lg bg-emerald-50 dark:bg-emerald-900/20">
                <Icons.package className="text-emerald-600 dark:text-emerald-400" size={20} />
              </div>
              <span className="text-sm font-medium text-emerald-600 dark:text-emerald-400">
                Total
              </span>
            </div>
            {isLoading ? (
              <div className="w-16 h-8 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
            ) : (
              <p className="text-2xl font-semibold text-[var(--foreground)]">{totalProducts}</p>
            )}
            <p className="text-sm text-[var(--foreground-muted)] mt-1">Products</p>
          </div>

          <div className="card p-5">
            <div className="flex items-center justify-between mb-3">
              <div className="p-2 rounded-lg bg-success-50 dark:bg-success-900/20">
                <Icons.check className="text-success-600 dark:text-success-400" size={20} />
              </div>
              <span className="text-sm font-medium text-success-600 dark:text-success-400">
                Approved
              </span>
            </div>
            {isLoading ? (
              <div className="w-16 h-8 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
            ) : (
              <p className="text-2xl font-semibold text-[var(--foreground)]">{approvedProducts}</p>
            )}
            <p className="text-sm text-[var(--foreground-muted)] mt-1">Compliant Products</p>
          </div>

          <div className="card p-5">
            <div className="flex items-center justify-between mb-3">
              <div className="p-2 rounded-lg bg-warning-50 dark:bg-warning-900/20">
                <Icons.activity className="text-warning-600 dark:text-warning-400" size={20} />
              </div>
              <span className="text-sm font-medium text-warning-600 dark:text-warning-400">
                Pending
              </span>
            </div>
            {isLoading ? (
              <div className="w-16 h-8 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
            ) : (
              <p className="text-2xl font-semibold text-[var(--foreground)]">{pendingProducts}</p>
            )}
            <p className="text-sm text-[var(--foreground-muted)] mt-1">Under Review</p>
          </div>

          <div className="card p-5">
            <div className="flex items-center justify-between mb-3">
              <div className="p-2 rounded-lg bg-primary-50 dark:bg-primary-900/20">
                <Icons.trendingUp className="text-primary-600 dark:text-primary-400" size={20} />
              </div>
              <span className="text-sm font-medium text-primary-600 dark:text-primary-400">
                Rate
              </span>
            </div>
            {isLoading ? (
              <div className="w-16 h-8 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
            ) : (
              <p className="text-2xl font-semibold text-[var(--foreground)]">{complianceRate}%</p>
            )}
            <p className="text-sm text-[var(--foreground-muted)] mt-1">Compliance Score</p>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-1">
            <h2 className="text-lg font-semibold text-[var(--foreground)] mb-4">Quick Actions</h2>
            <div className="space-y-3">
              <Link href="/merchant/products" className="card card-hover p-4 flex items-center gap-4">
                <div className="p-2.5 rounded-lg bg-emerald-50 dark:bg-emerald-900/20">
                  <Icons.package className="text-emerald-600 dark:text-emerald-400" size={20} />
                </div>
                <div className="flex-1">
                  <p className="font-medium text-[var(--foreground)]">Manage Products</p>
                  <p className="text-sm text-[var(--foreground-muted)]">View and edit products</p>
                </div>
                <Icons.chevronRight className="text-[var(--foreground-muted)]" size={16} />
              </Link>

              <Link href="/merchant/documents" className="card card-hover p-4 flex items-center gap-4">
                <div className="p-2.5 rounded-lg bg-info-50 dark:bg-info-900/20">
                  <Icons.upload className="text-info-600 dark:text-info-400" size={20} />
                </div>
                <div className="flex-1">
                  <p className="font-medium text-[var(--foreground)]">Upload Documents</p>
                  <p className="text-sm text-[var(--foreground-muted)]">Licenses, lab reports</p>
                </div>
                <Icons.chevronRight className="text-[var(--foreground-muted)]" size={16} />
              </Link>

              <Link href="/merchant/status" className="card card-hover p-4 flex items-center gap-4">
                <div className="p-2.5 rounded-lg bg-success-50 dark:bg-success-900/20">
                  <Icons.clipboardCheck className="text-success-600 dark:text-success-400" size={20} />
                </div>
                <div className="flex-1">
                  <p className="font-medium text-[var(--foreground)]">Compliance Status</p>
                  <p className="text-sm text-[var(--foreground-muted)]">View verification status</p>
                </div>
                <Icons.chevronRight className="text-[var(--foreground-muted)]" size={16} />
              </Link>
            </div>
          </div>

          {/* Recent Products */}
          <div className="lg:col-span-2">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-[var(--foreground)]">Recent Products</h2>
              <Link href="/merchant/products" className="text-sm text-[var(--primary)] hover:underline">
                View all
              </Link>
            </div>
            <div className="card divide-y divide-[var(--border)]">
              {isLoading ? (
                <div className="p-8 text-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-500 mx-auto" />
                </div>
              ) : products.length > 0 ? (
                products.slice(0, 5).map((product: Product) => (
                  <div key={product._id} className="p-4 flex items-center gap-4">
                    <div className="p-2 rounded-lg bg-[var(--muted)]">
                      <Icons.package size={18} className="text-[var(--foreground-muted)]" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-[var(--foreground)] truncate">{product.name}</p>
                      <p className="text-sm text-[var(--foreground-muted)]">{product.sku || product.category}</p>
                    </div>
                    <span className={`badge ${getStatusBadgeClass(product)}`}>
                      {getDisplayStatus(product)}
                    </span>
                  </div>
                ))
              ) : (
                <div className="p-8 text-center">
                  <Icons.package size={40} className="text-[var(--foreground-muted)] mx-auto mb-3" />
                  <p className="text-[var(--foreground-muted)]">No products yet</p>
                  <Link href="/merchant/products/new" className="btn btn-primary mt-4">
                    Add Your First Product
                  </Link>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
