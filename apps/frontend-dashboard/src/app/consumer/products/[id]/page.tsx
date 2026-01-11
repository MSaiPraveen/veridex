'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { DashboardLayout, PageHeader } from '@/components/layout';
import { Icons } from '@/components/ui/icons';
import { api } from '@/lib/api';
import Link from 'next/link';

interface Document {
  _id: string;
  type: string;
  filename: string;
  originalName: string;
  mimeType: string;
  size: number;
  status: string;
  uploadedAt: string;
  url?: string;
}

interface Product {
  _id: string;
  name: string;
  sku?: string;
  category: string;
  description?: string;
  complianceStatus?: string;
  status?: string;
  createdAt: string;
  updatedAt: string;
  merchantId?: string;
  organizationId?: string;
  attributes?: Record<string, unknown>;
  documents?: Document[];
}

const DOCUMENT_TYPE_CONFIG: Record<string, { label: string; icon: typeof Icons.file; color: string }> = {
  LAB_REPORT: {
    label: 'Lab Report',
    icon: Icons.file,
    color: 'bg-blue-100 text-blue-600 dark:bg-blue-900/50 dark:text-blue-400'
  },
  LICENSE: {
    label: 'License',
    icon: Icons.shield,
    color: 'bg-purple-100 text-purple-600 dark:bg-purple-900/50 dark:text-purple-400'
  },
  INSURANCE: {
    label: 'Insurance',
    icon: Icons.shield,
    color: 'bg-emerald-100 text-emerald-600 dark:bg-emerald-900/50 dark:text-emerald-400'
  },
  CERTIFICATE: {
    label: 'Certificate',
    icon: Icons.award,
    color: 'bg-amber-100 text-amber-600 dark:bg-amber-900/50 dark:text-amber-400'
  },
  COA: {
    label: 'Certificate of Analysis',
    icon: Icons.file,
    color: 'bg-cyan-100 text-cyan-600 dark:bg-cyan-900/50 dark:text-cyan-400'
  },
  OTHER: {
    label: 'Document',
    icon: Icons.file,
    color: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400'
  },
};

function ComplianceBadge({ status }: { status?: string }) {
  const getConfig = () => {
    switch (status) {
      case 'COMPLIANT':
        return {
          label: 'Verified Compliant',
          icon: Icons.check,
          className: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800'
        };
      case 'PENDING':
      case 'REQUIRES_REVIEW':
        return {
          label: 'Pending Review',
          icon: Icons.clock,
          className: 'bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-400 border border-amber-200 dark:border-amber-800'
        };
      case 'NON_COMPLIANT':
        return {
          label: 'Non-Compliant',
          icon: Icons.x,
          className: 'bg-red-100 text-red-700 dark:bg-red-900/50 dark:text-red-400 border border-red-200 dark:border-red-800'
        };
      default:
        return {
          label: 'Unknown',
          icon: Icons.help,
          className: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-400 border border-slate-200 dark:border-slate-700'
        };
    }
  };

  const config = getConfig();
  const IconComponent = config.icon;

  return (
    <span className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium ${config.className}`}>
      <IconComponent size={18} />
      {config.label}
    </span>
  );
}

function DocumentCard({ document }: { document: Document }) {
  const [isViewing, setIsViewing] = useState(false);
  const config = DOCUMENT_TYPE_CONFIG[document.type] || DOCUMENT_TYPE_CONFIG.OTHER;
  const IconComponent = config.icon;

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getStatusBadge = () => {
    switch (document.status) {
      case 'APPROVED':
      case 'VERIFIED':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-400">
            <Icons.check size={10} />
            Verified
          </span>
        );
      case 'PENDING':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-400">
            <Icons.clock size={10} />
            Pending
          </span>
        );
      case 'REJECTED':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-700 dark:bg-red-900/50 dark:text-red-400">
            <Icons.x size={10} />
            Rejected
          </span>
        );
      default:
        return null;
    }
  };

  return (
    <div className="card p-4 hover:shadow-md transition-shadow">
      <div className="flex items-start gap-4">
        <div className={`p-3 rounded-lg ${config.color}`}>
          <IconComponent size={24} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2 mb-1">
            <h4 className="font-medium text-[var(--foreground)] truncate">
              {config.label}
            </h4>
            {getStatusBadge()}
          </div>
          <p className="text-sm text-[var(--foreground-muted)] truncate mb-2">
            {document.originalName || document.filename}
          </p>
          <div className="flex items-center gap-4 text-xs text-[var(--foreground-muted)]">
            <span>{formatFileSize(document.size)}</span>
            <span>{new Date(document.uploadedAt).toLocaleDateString()}</span>
          </div>
        </div>
        <button
          onClick={() => setIsViewing(true)}
          className="btn btn-secondary text-sm px-3 py-1.5"
        >
          <Icons.eye size={14} className="mr-1" />
          View
        </button>
      </div>

      {/* Document Viewer Modal */}
      {isViewing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="bg-[var(--card-bg)] rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden m-4">
            <div className="flex items-center justify-between p-4 border-b border-[var(--border)]">
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-lg ${config.color}`}>
                  <IconComponent size={20} />
                </div>
                <div>
                  <h3 className="font-semibold text-[var(--foreground)]">{config.label}</h3>
                  <p className="text-sm text-[var(--foreground-muted)]">{document.originalName}</p>
                </div>
              </div>
              <button
                onClick={() => setIsViewing(false)}
                className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
              >
                <Icons.x size={20} />
              </button>
            </div>
            <div className="p-6 overflow-auto max-h-[calc(90vh-80px)]">
              {document.mimeType?.startsWith('image/') ? (
                <img
                  src={document.url || `/api/documents/${document._id}/view`}
                  alt={document.originalName}
                  className="max-w-full h-auto rounded-lg mx-auto"
                />
              ) : document.mimeType === 'application/pdf' ? (
                <iframe
                  src={document.url || `/api/documents/${document._id}/view`}
                  className="w-full h-[70vh] rounded-lg border border-[var(--border)]"
                  title={document.originalName}
                />
              ) : (
                <div className="text-center py-12">
                  <Icons.file size={64} className="mx-auto text-[var(--foreground-muted)] mb-4" />
                  <p className="text-[var(--foreground-muted)] mb-4">
                    Preview not available for this file type
                  </p>
                  <a
                    href={document.url || `/api/documents/${document._id}/download`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="btn btn-primary"
                  >
                    <Icons.download size={16} className="mr-2" />
                    Download File
                  </a>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Mock documents for demo
const MOCK_DOCUMENTS: Document[] = [
  {
    _id: 'doc1',
    type: 'LAB_REPORT',
    filename: 'lab_report_2024.pdf',
    originalName: 'THC_CBD_Analysis_Report.pdf',
    mimeType: 'application/pdf',
    size: 2453678,
    status: 'APPROVED',
    uploadedAt: new Date().toISOString(),
  },
  {
    _id: 'doc2',
    type: 'COA',
    filename: 'coa_cert.pdf',
    originalName: 'Certificate_of_Analysis.pdf',
    mimeType: 'application/pdf',
    size: 1234567,
    status: 'APPROVED',
    uploadedAt: new Date().toISOString(),
  },
  {
    _id: 'doc3',
    type: 'LICENSE',
    filename: 'business_license.pdf',
    originalName: 'State_Cannabis_License.pdf',
    mimeType: 'application/pdf',
    size: 987654,
    status: 'PENDING',
    uploadedAt: new Date().toISOString(),
  },
];

export default function ProductDetailPage() {
  const params = useParams();
  const router = useRouter();
  const productId = params.id as string;

  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isFavorite, setIsFavorite] = useState(false);

  useEffect(() => {
    const fetchProduct = async () => {
      try {
        setLoading(true);
        // Use PUBLIC endpoint for consumers (no auth required)
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const response = await api.get<any>(`/public/products/${productId}`);
        // Handle both wrapped and unwrapped API responses
        const productData = response.data?.data || response.data;
        setProduct(productData as Product);

        // Check if favorited
        const saved = localStorage.getItem('veridex_favorites');
        if (saved) {
          const favorites = JSON.parse(saved);
          setIsFavorite(favorites.includes(productId));
        }
      } catch (err) {
        console.error('Failed to fetch product:', err);
        setError('Failed to load product details');
      } finally {
        setLoading(false);
      }
    };

    fetchProduct();
  }, [productId]);

  const toggleFavorite = () => {
    const saved = localStorage.getItem('veridex_favorites');
    let favorites: string[] = saved ? JSON.parse(saved) : [];

    if (isFavorite) {
      favorites = favorites.filter(id => id !== productId);
    } else {
      favorites.push(productId);
    }

    localStorage.setItem('veridex_favorites', JSON.stringify(favorites));
    setIsFavorite(!isFavorite);
  };

  // Use mock documents if no documents in product
  const documents = product?.documents?.length ? product.documents : MOCK_DOCUMENTS;

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <Icons.loader size={48} className="animate-spin text-primary-600" />
        </div>
      </DashboardLayout>
    );
  }

  if (error || !product) {
    return (
      <DashboardLayout>
        <div className="card p-8 text-center">
          <Icons.alertCircle size={48} className="mx-auto text-red-500 mb-4" />
          <h2 className="text-xl font-semibold text-[var(--foreground)] mb-2">
            {error || 'Product not found'}
          </h2>
          <p className="text-[var(--foreground-muted)] mb-4">
            The product you&apos;re looking for could not be loaded.
          </p>
          <button onClick={() => router.back()} className="btn btn-primary">
            Go Back
          </button>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <PageHeader
        title={product.name}
        description={`SKU: ${product.sku || 'N/A'} • Category: ${product.category.replace('_', '/')}`}
        breadcrumbs={[
          { label: 'Consumer', href: '/consumer' },
          { label: 'Products', href: '/consumer/products' },
          { label: product.name },
        ]}
        actions={
          <div className="flex items-center gap-3">
            <button
              onClick={toggleFavorite}
              className={`btn ${isFavorite ? 'btn-secondary bg-pink-100 dark:bg-pink-900/30 text-pink-600' : 'btn-secondary'}`}
            >
              {isFavorite ? (
                <Icons.starFilled size={18} className="mr-2" />
              ) : (
                <Icons.heart size={18} className="mr-2" />
              )}
              {isFavorite ? 'Favorited' : 'Add to Favorites'}
            </button>
            <Link href="/consumer/report" className="btn btn-secondary">
              <Icons.flag size={18} className="mr-2" />
              Report Issue
            </Link>
          </div>
        }
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Product Overview */}
          <div className="card p-6">
            <div className="flex items-start gap-6">
              <div className="w-32 h-32 bg-gradient-to-br from-primary-100 to-primary-50 dark:from-primary-900/30 dark:to-primary-800/20 rounded-xl flex items-center justify-center flex-shrink-0">
                <Icons.package className="text-primary-400" size={48} />
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-4">
                  <ComplianceBadge status={product.complianceStatus} />
                </div>

                {product.description && (
                  <p className="text-[var(--foreground-muted)] mb-4">
                    {product.description}
                  </p>
                )}

                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-[var(--foreground-muted)]">Category</span>
                    <p className="font-medium text-[var(--foreground)]">
                      {product.category.replace('_', '/')}
                    </p>
                  </div>
                  <div>
                    <span className="text-[var(--foreground-muted)]">SKU</span>
                    <p className="font-mono font-medium text-[var(--foreground)]">
                      {product.sku || 'N/A'}
                    </p>
                  </div>
                  <div>
                    <span className="text-[var(--foreground-muted)]">Created</span>
                    <p className="font-medium text-[var(--foreground)]">
                      {new Date(product.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                  <div>
                    <span className="text-[var(--foreground-muted)]">Last Updated</span>
                    <p className="font-medium text-[var(--foreground)]">
                      {new Date(product.updatedAt).toLocaleDateString()}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Compliance Documents */}
          <div className="card">
            <div className="p-6 border-b border-[var(--border)]">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-primary-100 dark:bg-primary-900/30 rounded-lg">
                    <Icons.file size={20} className="text-primary-600 dark:text-primary-400" />
                  </div>
                  <div>
                    <h2 className="text-lg font-semibold text-[var(--foreground)]">
                      Compliance Documents
                    </h2>
                    <p className="text-sm text-[var(--foreground-muted)]">
                      View verification documents for this product
                    </p>
                  </div>
                </div>
                <span className="px-3 py-1 bg-slate-100 dark:bg-slate-800 rounded-full text-sm font-medium">
                  {documents.length} documents
                </span>
              </div>
            </div>
            <div className="p-6 space-y-4">
              {documents.length > 0 ? (
                documents.map((doc) => (
                  <DocumentCard key={doc._id} document={doc} />
                ))
              ) : (
                <div className="text-center py-8">
                  <Icons.file size={48} className="mx-auto text-[var(--foreground-muted)] mb-4" />
                  <p className="text-[var(--foreground-muted)]">
                    No compliance documents available
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Compliance Summary */}
          <div className="card p-6">
            <h3 className="font-semibold text-[var(--foreground)] mb-4 flex items-center gap-2">
              <Icons.shield size={18} className="text-primary-600" />
              Compliance Summary
            </h3>
            <div className="space-y-4">
              <div className="flex items-center justify-between py-3 border-b border-[var(--border)]">
                <span className="text-[var(--foreground-muted)]">Status</span>
                <ComplianceBadge status={product.complianceStatus} />
              </div>
              <div className="flex items-center justify-between py-3 border-b border-[var(--border)]">
                <span className="text-[var(--foreground-muted)]">Documents</span>
                <span className="font-medium text-[var(--foreground)]">
                  {documents.length} uploaded
                </span>
              </div>
              <div className="flex items-center justify-between py-3 border-b border-[var(--border)]">
                <span className="text-[var(--foreground-muted)]">Verified Docs</span>
                <span className="font-medium text-emerald-600 dark:text-emerald-400">
                  {documents.filter(d => d.status === 'APPROVED' || d.status === 'VERIFIED').length}
                </span>
              </div>
              <div className="flex items-center justify-between py-3">
                <span className="text-[var(--foreground-muted)]">Pending Review</span>
                <span className="font-medium text-amber-600 dark:text-amber-400">
                  {documents.filter(d => d.status === 'PENDING').length}
                </span>
              </div>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="card p-6">
            <h3 className="font-semibold text-[var(--foreground)] mb-4 flex items-center gap-2">
              <Icons.zap size={18} className="text-primary-600" />
              Quick Actions
            </h3>
            <div className="space-y-3">
              <Link
                href="/consumer/compare"
                className="btn btn-secondary w-full justify-start"
              >
                <Icons.gitCompare size={18} className="mr-3" />
                Compare Products
              </Link>
              <Link
                href="/consumer/merchants"
                className="btn btn-secondary w-full justify-start"
              >
                <Icons.store size={18} className="mr-3" />
                View Merchant
              </Link>
              <Link
                href={`/consumer/report?product=${productId}`}
                className="btn btn-secondary w-full justify-start text-amber-600 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-900/20"
              >
                <Icons.flag size={18} className="mr-3" />
                Report Issue
              </Link>
            </div>
          </div>

          {/* Trust Indicators */}
          <div className="card p-6 bg-gradient-to-br from-emerald-50 to-emerald-100 dark:from-emerald-900/20 dark:to-emerald-800/10 border-emerald-200 dark:border-emerald-800">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-emerald-200 dark:bg-emerald-800 rounded-lg">
                <Icons.shield size={20} className="text-emerald-700 dark:text-emerald-300" />
              </div>
              <h3 className="font-semibold text-emerald-800 dark:text-emerald-300">
                Verified Product
              </h3>
            </div>
            <p className="text-sm text-emerald-700 dark:text-emerald-400 mb-3">
              This product has been verified by Veridex compliance review.
            </p>
            <ul className="text-sm text-emerald-700 dark:text-emerald-400 space-y-2">
              <li className="flex items-center gap-2">
                <Icons.check size={14} />
                Lab tested & verified
              </li>
              <li className="flex items-center gap-2">
                <Icons.check size={14} />
                Licensed manufacturer
              </li>
              <li className="flex items-center gap-2">
                <Icons.check size={14} />
                Regulatory compliant
              </li>
            </ul>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
