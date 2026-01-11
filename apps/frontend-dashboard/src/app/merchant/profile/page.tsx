'use client';

import { DashboardLayout, PageHeader } from '@/components/layout';
import { Icons } from '@/components/ui/icons';
import Link from 'next/link';
import { useAuth } from '@/lib/auth-context';
import { useMyProducts, useDocuments, Product, Document } from '@/lib/hooks';
import { useState } from 'react';

export default function MerchantProfilePage() {
  const { user } = useAuth();
  const { data: productsData, isLoading: productsLoading } = useMyProducts();
  const { data: documentsData, isLoading: documentsLoading } = useDocuments();
  const [activeTab, setActiveTab] = useState<'overview' | 'products' | 'documents'>('overview');

  const products = productsData?.data || [];
  const documents = documentsData?.data || [];

  // Calculate statistics
  const totalProducts = products.length;
  const approvedProducts = products.filter((p: Product) =>
    p.status === 'APPROVED' || p.complianceStatus === 'COMPLIANT'
  ).length;
  const complianceRate = totalProducts > 0 ? Math.round((approvedProducts / totalProducts) * 100) : 0;

  const totalDocuments = documents.length;

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

  const getDocStatusBadgeClass = (doc: Document) => {
    const status = doc.status;
    if (status === 'SUCCESS') return 'badge-success';
    if (status === 'PENDING' || status === 'PROCESSING') return 'badge-warning';
    if (status === 'FAILED' || status === 'EXPIRED') return 'badge-error';
    return 'badge-secondary';
  };

  const isLoading = productsLoading || documentsLoading;

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <PageHeader
          title="Merchant Profile"
          description="Manage your business information, products, and documents"
        />

        {/* Profile Header Card */}
        <div className="card overflow-hidden">
          <div className="bg-gradient-to-r from-emerald-500 to-teal-600 h-32 relative">
            <div className="absolute -bottom-12 left-6">
              <div className="w-24 h-24 rounded-2xl bg-[var(--card-bg)] border-4 border-[var(--card-bg)] shadow-lg flex items-center justify-center">
                <span className="text-3xl font-bold text-emerald-600">
                  {user?.firstName?.[0] || user?.email?.[0] || 'M'}
                </span>
              </div>
            </div>
          </div>
          <div className="pt-16 pb-6 px-6">
            <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
              <div>
                <h2 className="text-xl font-semibold text-[var(--foreground)]">
                  {user?.firstName && user?.lastName
                    ? `${user.firstName} ${user.lastName}`
                    : user?.email}
                </h2>
                <p className="text-[var(--foreground-muted)]">{user?.email}</p>
                <div className="flex items-center gap-4 mt-3">
                  <span className="badge-success">Verified Merchant</span>
                  <span className="text-sm text-[var(--foreground-muted)]">
                    Member since {new Date().getFullYear()}
                  </span>
                </div>
              </div>
              <div className="flex gap-3">
                <Link href="/settings" className="btn-secondary">
                  <Icons.settings size={16} className="mr-2" />
                  Settings
                </Link>
                <Link href="/merchant/products/new" className="btn-primary">
                  <Icons.plus size={16} className="mr-2" />
                  Add Product
                </Link>
              </div>
            </div>
          </div>
        </div>

        {/* Stats Row */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="card p-5 text-center">
            <div className="w-12 h-12 rounded-xl bg-emerald-50 dark:bg-emerald-900/20 flex items-center justify-center mx-auto mb-3">
              <Icons.package className="text-emerald-600" size={24} />
            </div>
            {isLoading ? (
              <div className="h-8 w-12 bg-[var(--muted)] rounded animate-pulse mx-auto" />
            ) : (
              <p className="text-2xl font-bold text-[var(--foreground)]">{totalProducts}</p>
            )}
            <p className="text-sm text-[var(--foreground-muted)]">Total Products</p>
          </div>

          <div className="card p-5 text-center">
            <div className="w-12 h-12 rounded-xl bg-green-50 dark:bg-green-900/20 flex items-center justify-center mx-auto mb-3">
              <Icons.check className="text-green-600" size={24} />
            </div>
            {isLoading ? (
              <div className="h-8 w-12 bg-[var(--muted)] rounded animate-pulse mx-auto" />
            ) : (
              <p className="text-2xl font-bold text-[var(--foreground)]">{approvedProducts}</p>
            )}
            <p className="text-sm text-[var(--foreground-muted)]">Approved</p>
          </div>

          <div className="card p-5 text-center">
            <div className="w-12 h-12 rounded-xl bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center mx-auto mb-3">
              <Icons.fileText className="text-blue-600" size={24} />
            </div>
            {isLoading ? (
              <div className="h-8 w-12 bg-[var(--muted)] rounded animate-pulse mx-auto" />
            ) : (
              <p className="text-2xl font-bold text-[var(--foreground)]">{totalDocuments}</p>
            )}
            <p className="text-sm text-[var(--foreground-muted)]">Documents</p>
          </div>

          <div className="card p-5 text-center">
            <div className="w-12 h-12 rounded-xl bg-violet-50 dark:bg-violet-900/20 flex items-center justify-center mx-auto mb-3">
              <Icons.trendingUp className="text-violet-600" size={24} />
            </div>
            {isLoading ? (
              <div className="h-8 w-12 bg-[var(--muted)] rounded animate-pulse mx-auto" />
            ) : (
              <p className="text-2xl font-bold text-[var(--foreground)]">{complianceRate}%</p>
            )}
            <p className="text-sm text-[var(--foreground-muted)]">Compliance Rate</p>
          </div>
        </div>

        {/* Tabs */}
        <div className="card">
          <div className="border-b border-[var(--border)]">
            <nav className="flex gap-6 px-6">
              <button
                onClick={() => setActiveTab('overview')}
                className={`py-4 text-sm font-medium border-b-2 transition-colors ${activeTab === 'overview'
                  ? 'border-emerald-500 text-emerald-600'
                  : 'border-transparent text-[var(--foreground-muted)] hover:text-[var(--foreground)]'
                  }`}
              >
                Overview
              </button>
              <button
                onClick={() => setActiveTab('products')}
                className={`py-4 text-sm font-medium border-b-2 transition-colors ${activeTab === 'products'
                  ? 'border-emerald-500 text-emerald-600'
                  : 'border-transparent text-[var(--foreground-muted)] hover:text-[var(--foreground)]'
                  }`}
              >
                Products ({totalProducts})
              </button>
              <button
                onClick={() => setActiveTab('documents')}
                className={`py-4 text-sm font-medium border-b-2 transition-colors ${activeTab === 'documents'
                  ? 'border-emerald-500 text-emerald-600'
                  : 'border-transparent text-[var(--foreground-muted)] hover:text-[var(--foreground)]'
                  }`}
              >
                Documents ({totalDocuments})
              </button>
            </nav>
          </div>

          <div className="p-6">
            {/* Overview Tab */}
            {activeTab === 'overview' && (
              <div className="space-y-6">
                {/* Business Information */}
                <div>
                  <h3 className="text-lg font-semibold text-[var(--foreground)] mb-4">
                    Business Information
                  </h3>
                  <div className="grid md:grid-cols-2 gap-6">
                    <div className="space-y-4">
                      <div>
                        <label className="text-sm text-[var(--foreground-muted)]">Business Name</label>
                        <p className="text-[var(--foreground)] font-medium">
                          {user?.organizationId ? 'Your Organization' : 'Not set'}
                        </p>
                      </div>
                      <div>
                        <label className="text-sm text-[var(--foreground-muted)]">Account Email</label>
                        <p className="text-[var(--foreground)] font-medium">{user?.email}</p>
                      </div>
                      <div>
                        <label className="text-sm text-[var(--foreground-muted)]">Account Status</label>
                        <p className="flex items-center gap-2">
                          <span className="w-2 h-2 rounded-full bg-green-500"></span>
                          <span className="text-[var(--foreground)] font-medium">Active</span>
                        </p>
                      </div>
                    </div>
                    <div className="space-y-4">
                      <div>
                        <label className="text-sm text-[var(--foreground-muted)]">Role</label>
                        <p className="text-[var(--foreground)] font-medium capitalize">
                          {user?.role?.toLowerCase().replace('_', ' ')}
                        </p>
                      </div>
                      <div>
                        <label className="text-sm text-[var(--foreground-muted)]">Organization ID</label>
                        <p className="text-[var(--foreground)] font-medium font-mono text-sm">
                          {user?.organizationId || 'N/A'}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Quick Actions */}
                <div>
                  <h3 className="text-lg font-semibold text-[var(--foreground)] mb-4">
                    Quick Actions
                  </h3>
                  <div className="grid md:grid-cols-3 gap-4">
                    <Link
                      href="/merchant/products/new"
                      className="p-4 rounded-xl border border-[var(--border)] hover:border-emerald-500 hover:bg-emerald-50/50 dark:hover:bg-emerald-900/10 transition-all group"
                    >
                      <Icons.plus className="text-emerald-600 mb-2" size={24} />
                      <p className="font-medium text-[var(--foreground)] group-hover:text-emerald-600">
                        Add New Product
                      </p>
                      <p className="text-sm text-[var(--foreground-muted)]">
                        Register a product for compliance
                      </p>
                    </Link>
                    <Link
                      href="/merchant/documents"
                      className="p-4 rounded-xl border border-[var(--border)] hover:border-blue-500 hover:bg-blue-50/50 dark:hover:bg-blue-900/10 transition-all group"
                    >
                      <Icons.fileText className="text-blue-600 mb-2" size={24} />
                      <p className="font-medium text-[var(--foreground)] group-hover:text-blue-600">
                        Upload Documents
                      </p>
                      <p className="text-sm text-[var(--foreground-muted)]">
                        Add certificates and licenses
                      </p>
                    </Link>
                    <Link
                      href="/merchant/status"
                      className="p-4 rounded-xl border border-[var(--border)] hover:border-violet-500 hover:bg-violet-50/50 dark:hover:bg-violet-900/10 transition-all group"
                    >
                      <Icons.activity className="text-violet-600 mb-2" size={24} />
                      <p className="font-medium text-[var(--foreground)] group-hover:text-violet-600">
                        View Status
                      </p>
                      <p className="text-sm text-[var(--foreground-muted)]">
                        Check compliance status
                      </p>
                    </Link>
                  </div>
                </div>
              </div>
            )}

            {/* Products Tab */}
            {activeTab === 'products' && (
              <div>
                {productsLoading ? (
                  <div className="space-y-4">
                    {[1, 2, 3].map(i => (
                      <div key={i} className="h-20 bg-[var(--muted)] rounded-lg animate-pulse" />
                    ))}
                  </div>
                ) : products.length === 0 ? (
                  <div className="text-center py-12">
                    <Icons.package className="mx-auto text-[var(--foreground-muted)] mb-4" size={48} />
                    <h3 className="text-lg font-medium text-[var(--foreground)] mb-2">
                      No products yet
                    </h3>
                    <p className="text-[var(--foreground-muted)] mb-4">
                      Start by adding your first product
                    </p>
                    <Link href="/merchant/products/new" className="btn-primary inline-flex">
                      <Icons.plus size={16} className="mr-2" />
                      Add Product
                    </Link>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {products.map((product: Product) => (
                      <Link
                        key={product._id}
                        href={`/merchant/products/${product._id}`}
                        className="flex items-center justify-between p-4 rounded-xl border border-[var(--border)] hover:border-emerald-500/50 hover:bg-[var(--muted)] transition-all"
                      >
                        <div className="flex items-center gap-4">
                          <div className="w-12 h-12 rounded-lg bg-emerald-50 dark:bg-emerald-900/20 flex items-center justify-center">
                            <Icons.package className="text-emerald-600" size={20} />
                          </div>
                          <div>
                            <p className="font-medium text-[var(--foreground)]">
                              {product.name}
                            </p>
                            <p className="text-sm text-[var(--foreground-muted)]">
                              {product.category || 'Uncategorized'}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-4">
                          <span className={getStatusBadgeClass(product)}>
                            {getDisplayStatus(product)}
                          </span>
                          <Icons.chevronRight className="text-[var(--foreground-muted)]" size={16} />
                        </div>
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Documents Tab */}
            {activeTab === 'documents' && (
              <div>
                {documentsLoading ? (
                  <div className="space-y-4">
                    {[1, 2, 3].map(i => (
                      <div key={i} className="h-20 bg-[var(--muted)] rounded-lg animate-pulse" />
                    ))}
                  </div>
                ) : documents.length === 0 ? (
                  <div className="text-center py-12">
                    <Icons.fileText className="mx-auto text-[var(--foreground-muted)] mb-4" size={48} />
                    <h3 className="text-lg font-medium text-[var(--foreground)] mb-2">
                      No documents yet
                    </h3>
                    <p className="text-[var(--foreground-muted)] mb-4">
                      Upload certificates and licenses for your products
                    </p>
                    <Link href="/merchant/documents" className="btn-primary inline-flex">
                      <Icons.upload size={16} className="mr-2" />
                      Upload Document
                    </Link>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {documents.map((doc: Document) => (
                      <div
                        key={doc._id}
                        className="flex items-center justify-between p-4 rounded-xl border border-[var(--border)] hover:bg-[var(--muted)] transition-all"
                      >
                        <div className="flex items-center gap-4">
                          <div className="w-12 h-12 rounded-lg bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center">
                            <Icons.fileText className="text-blue-600" size={20} />
                          </div>
                          <div>
                            <p className="font-medium text-[var(--foreground)]">
                              {doc.name || doc.fileName || 'Document'}
                            </p>
                            <p className="text-sm text-[var(--foreground-muted)]">
                              {doc.type || 'Certificate'}
                              {doc.expiryDate && ` • Expires: ${new Date(doc.expiryDate).toLocaleDateString()}`}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-4">
                          <span className={getDocStatusBadgeClass(doc)}>
                            {doc.status || 'Active'}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
