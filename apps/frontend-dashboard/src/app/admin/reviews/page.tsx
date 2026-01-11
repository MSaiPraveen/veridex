'use client';

import { useState, useMemo } from 'react';
import { DashboardLayout, PageHeader } from '@/components/layout';
import { Icons } from '@/components/ui/icons';
import {
  useProducts,
  useDocuments,
  updateProduct,
  updateDocument,
  Product,
  Document,
} from '@/lib/hooks';

interface ReviewItem {
  id: string;
  title: string;
  type: 'Product' | 'Document';
  priority: 'critical' | 'high' | 'medium' | 'low';
  status: 'pending' | 'in-review';
  submittedBy: string;
  submittedAt: string;
  description: string;
  originalData: Product | Document;
}

function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

function PriorityBadge({ priority }: { priority: string }) {
  const styles: Record<string, string> = {
    critical: 'badge-error',
    high: 'badge-warning',
    medium: 'badge-info',
    low: 'badge-success',
  };

  return (
    <span className={`badge ${styles[priority]}`}>
      {priority.charAt(0).toUpperCase() + priority.slice(1)}
    </span>
  );
}

function TypeBadge({ type }: { type: string }) {
  const colors: Record<string, string> = {
    Product: 'bg-primary-50 text-primary-600 dark:bg-primary-900/20 dark:text-primary-400',
    Document: 'bg-info-50 text-info-600 dark:bg-info-900/20 dark:text-info-400',
  };

  return (
    <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${colors[type]}`}>
      {type}
    </span>
  );
}

export default function AdminReviewsPage() {
  const { data: productsData, isLoading: loadingProducts, refetch: refetchProducts } = useProducts();
  const { data: docsData, isLoading: loadingDocs, refetch: refetchDocs } = useDocuments();

  const [selectedReview, setSelectedReview] = useState<ReviewItem | null>(null);
  const [filter, setFilter] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  const products = useMemo(() => productsData?.data || [], [productsData]);
  const documents = useMemo(() => docsData?.data || [], [docsData]);
  const isLoading = loadingProducts || loadingDocs;

  // Build review items from pending products and documents
  const reviews = useMemo<ReviewItem[]>(() => {
    const items: ReviewItem[] = [];

    // Products with PENDING_REVIEW or REQUIRES_REVIEW compliance status
    products
      .filter((p: Product) => p.status === 'PENDING_REVIEW' || p.complianceStatus === 'REQUIRES_REVIEW' || p.complianceStatus === 'PENDING')
      .forEach((product: Product) => {
        // Priority based on compliance status
        let priority: 'critical' | 'high' | 'medium' | 'low' = 'medium';
        if (product.complianceStatus === 'NON_COMPLIANT') priority = 'critical';
        else if (product.complianceStatus === 'REQUIRES_REVIEW') priority = 'high';
        else if (product.status === 'PENDING_REVIEW') priority = 'high';

        items.push({
          id: product._id,
          title: `Product Review - ${product.name}`,
          type: 'Product',
          priority,
          status: product.status === 'PENDING_REVIEW' ? 'in-review' : 'pending',
          submittedBy: product.organizationId || 'Unknown',
          submittedAt: formatDate(product.createdAt),
          description: `${product.category || 'N/A'} product. ${product.commodityType ? `Commodity: ${product.commodityType}` : ''
            }${product.originCountry ? ` Origin: ${product.originCountry}` : ''}`,
          originalData: product,
        });
      });

    // Documents with PENDING or PROCESSING status
    documents
      .filter((d: Document) => d.status === 'PENDING' || d.status === 'PROCESSING')
      .forEach((doc: Document) => {
        // Priority based on type
        let priority: 'critical' | 'high' | 'medium' | 'low' = 'medium';
        if (doc.type === 'LICENSE') priority = 'high';
        else if (doc.type === 'COA') priority = 'high';
        else if (doc.type === 'CERTIFICATE') priority = 'medium';

        items.push({
          id: doc._id,
          title: `Document Review - ${doc.type.replace('_', ' ')}`,
          type: 'Document',
          priority,
          status: doc.status === 'PROCESSING' ? 'in-review' : 'pending',
          submittedBy: doc.uploadedBy || doc.organizationId || 'Unknown',
          submittedAt: formatDate(doc.uploadedAt || doc.createdAt),
          description: `${doc.type.replace('_', ' ')} document${doc.productId ? ` for product ${doc.productId}` : ''}. Status: ${doc.status}`,
          originalData: doc,
        });
      });

    // Sort by priority
    const priorityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
    return items.sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]);
  }, [products, documents]);

  // Stats
  const stats = useMemo(() => ({
    total: reviews.length,
    pending: reviews.filter((r) => r.status === 'pending').length,
    inReview: reviews.filter((r) => r.status === 'in-review').length,
    critical: reviews.filter((r) => r.priority === 'critical').length,
  }), [reviews]);

  const filteredReviews = filter ? reviews.filter((r) => r.status === filter) : reviews;

  // Set first review as selected when reviews load
  useMemo(() => {
    if (filteredReviews.length > 0 && !selectedReview) {
      setSelectedReview(filteredReviews[0]);
    }
  }, [filteredReviews, selectedReview]);

  const handleApprove = async () => {
    if (!selectedReview) return;
    setIsProcessing(true);
    try {
      if (selectedReview.type === 'Product') {
        await updateProduct(selectedReview.id, { status: 'APPROVED', complianceStatus: 'COMPLIANT' });
        refetchProducts();
      } else {
        await updateDocument(selectedReview.id, { status: 'SUCCESS' });
        refetchDocs();
      }
      setSelectedReview(null);
    } catch (error) {
      console.error('Failed to approve:', error);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleReject = async () => {
    if (!selectedReview) return;
    setIsProcessing(true);
    try {
      if (selectedReview.type === 'Product') {
        await updateProduct(selectedReview.id, { status: 'REJECTED', complianceStatus: 'NON_COMPLIANT' });
        refetchProducts();
      } else {
        await updateDocument(selectedReview.id, { status: 'FAILED' });
        refetchDocs();
      }
      setSelectedReview(null);
    } catch (error) {
      console.error('Failed to reject:', error);
    } finally {
      setIsProcessing(false);
    }
  };

  if (isLoading) {
    return (
      <DashboardLayout>
        <PageHeader
          title="Review Queue"
          description="Manage pending reviews and approval requests"
          breadcrumbs={[{ label: 'Admin', href: '/admin' }, { label: 'Reviews' }]}
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
        title="Review Queue"
        description="Manage pending reviews and approval requests"
        breadcrumbs={[
          { label: 'Admin', href: '/admin' },
          { label: 'Reviews' },
        ]}
      />

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 mb-6">
        <button
          onClick={() => setFilter('')}
          className={`card p-4 text-left transition-colors ${filter === '' ? 'ring-2 ring-primary-500' : ''
            }`}
        >
          <p className="text-2xl font-semibold text-[var(--foreground)]">{stats.total}</p>
          <p className="text-sm text-[var(--foreground-muted)]">Total Reviews</p>
        </button>
        <button
          onClick={() => setFilter('pending')}
          className={`card p-4 text-left transition-colors ${filter === 'pending' ? 'ring-2 ring-primary-500' : ''
            }`}
        >
          <p className="text-2xl font-semibold text-warning-600 dark:text-warning-400">{stats.pending}</p>
          <p className="text-sm text-[var(--foreground-muted)]">Pending</p>
        </button>
        <button
          onClick={() => setFilter('in-review')}
          className={`card p-4 text-left transition-colors ${filter === 'in-review' ? 'ring-2 ring-primary-500' : ''
            }`}
        >
          <p className="text-2xl font-semibold text-info-600 dark:text-info-400">{stats.inReview}</p>
          <p className="text-sm text-[var(--foreground-muted)]">In Review</p>
        </button>
        <div className="card p-4">
          <p className="text-2xl font-semibold text-error-600 dark:text-error-400">{stats.critical}</p>
          <p className="text-sm text-[var(--foreground-muted)]">Critical Priority</p>
        </div>
      </div>

      {reviews.length === 0 ? (
        <div className="card p-12 text-center">
          <Icons.check size={48} className="mx-auto mb-4 text-success-500" />
          <h3 className="text-lg font-semibold text-[var(--foreground)] mb-2">All Caught Up!</h3>
          <p className="text-[var(--foreground-muted)]">
            There are no pending reviews at this time.
          </p>
        </div>
      ) : (
        /* Split View */
        <div className="flex gap-6">
          {/* Review Queue */}
          <div className="w-full lg:w-1/2">
            <div className="card divide-y divide-[var(--border)]">
              {filteredReviews.length === 0 ? (
                <div className="p-8 text-center">
                  <p className="text-[var(--foreground-muted)]">No reviews matching this filter.</p>
                </div>
              ) : (
                filteredReviews.map((review) => (
                  <button
                    key={review.id}
                    onClick={() => setSelectedReview(review)}
                    className={`w-full p-4 text-left transition-colors hover:bg-[var(--background)] ${selectedReview?.id === review.id
                        ? 'bg-primary-50/50 dark:bg-primary-900/10'
                        : ''
                      }`}
                  >
                    <div className="flex items-start justify-between gap-3 mb-2">
                      <div className="flex items-center gap-2">
                        <TypeBadge type={review.type} />
                        <PriorityBadge priority={review.priority} />
                      </div>
                      <span className="text-xs text-[var(--foreground-muted)] whitespace-nowrap">
                        {review.submittedAt.split(',')[0]}
                      </span>
                    </div>
                    <h4 className="font-medium text-[var(--foreground)] mb-1 line-clamp-1">
                      {review.title}
                    </h4>
                    <p className="text-sm text-[var(--foreground-muted)] line-clamp-2">
                      {review.description}
                    </p>
                    <div className="flex items-center justify-between mt-3 text-xs text-[var(--foreground-muted)]">
                      <span>{review.submittedBy}</span>
                      <span
                        className={`badge ${review.status === 'pending' ? 'badge-warning' : 'badge-info'
                          }`}
                      >
                        {review.status === 'pending' ? 'Pending' : 'In Review'}
                      </span>
                    </div>
                  </button>
                ))
              )}
            </div>
          </div>

          {/* Detail Panel */}
          {selectedReview && (
            <div className="hidden lg:block w-1/2">
              <div className="card p-6 sticky top-24">
                <div className="flex items-start justify-between mb-6">
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <TypeBadge type={selectedReview.type} />
                      <PriorityBadge priority={selectedReview.priority} />
                    </div>
                    <h2 className="text-xl font-semibold text-[var(--foreground)]">
                      {selectedReview.title}
                    </h2>
                    <p className="text-sm text-[var(--foreground-muted)] mt-1">
                      ID: {selectedReview.id}
                    </p>
                  </div>
                </div>

                {/* Details Grid */}
                <div className="grid grid-cols-2 gap-4 mb-6">
                  <div>
                    <p className="text-xs text-[var(--foreground-muted)] uppercase tracking-wider mb-1">
                      Submitted By
                    </p>
                    <p className="text-[var(--foreground)]">{selectedReview.submittedBy}</p>
                  </div>
                  <div>
                    <p className="text-xs text-[var(--foreground-muted)] uppercase tracking-wider mb-1">
                      Submitted At
                    </p>
                    <p className="text-[var(--foreground)]">{selectedReview.submittedAt}</p>
                  </div>
                  <div>
                    <p className="text-xs text-[var(--foreground-muted)] uppercase tracking-wider mb-1">
                      Type
                    </p>
                    <p className="text-[var(--foreground)]">{selectedReview.type}</p>
                  </div>
                  <div>
                    <p className="text-xs text-[var(--foreground-muted)] uppercase tracking-wider mb-1">
                      Status
                    </p>
                    <span
                      className={`badge ${selectedReview.status === 'pending' ? 'badge-warning' : 'badge-info'
                        }`}
                    >
                      {selectedReview.status === 'pending' ? 'Pending' : 'In Review'}
                    </span>
                  </div>
                </div>

                {/* Description */}
                <div className="mb-6">
                  <p className="text-xs text-[var(--foreground-muted)] uppercase tracking-wider mb-2">
                    Description
                  </p>
                  <p className="text-sm text-[var(--foreground)] leading-relaxed">
                    {selectedReview.description}
                  </p>
                </div>

                {/* Item Details */}
                <div className="mb-6 p-4 bg-[var(--background)] rounded-lg">
                  <p className="text-xs text-[var(--foreground-muted)] uppercase tracking-wider mb-3">
                    {selectedReview.type} Details
                  </p>
                  {selectedReview.type === 'Product' ? (
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-[var(--foreground-muted)]">Name:</span>
                        <span className="text-[var(--foreground)]">
                          {(selectedReview.originalData as Product).name}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-[var(--foreground-muted)]">Category:</span>
                        <span className="text-[var(--foreground)]">
                          {(selectedReview.originalData as Product).category || 'N/A'}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-[var(--foreground-muted)]">Origin:</span>
                        <span className="text-[var(--foreground)]">
                          {(selectedReview.originalData as Product).originCountry || 'N/A'}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-[var(--foreground-muted)]">Compliance Status:</span>
                        <span className="text-[var(--foreground)]">
                          {(selectedReview.originalData as Product).complianceStatus}
                        </span>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-[var(--foreground-muted)]">Type:</span>
                        <span className="text-[var(--foreground)]">
                          {(selectedReview.originalData as Document).type.replace('_', ' ')}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-[var(--foreground-muted)]">File:</span>
                        <span className="text-[var(--foreground)]">
                          {(selectedReview.originalData as Document).fileName}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-[var(--foreground-muted)]">Status:</span>
                        <span className="text-[var(--foreground)]">
                          {(selectedReview.originalData as Document).status}
                        </span>
                      </div>
                      {(selectedReview.originalData as Document).fileUrl && (
                        <div className="flex justify-between">
                          <span className="text-[var(--foreground-muted)]">Download:</span>
                          <a
                            href={(selectedReview.originalData as Document).fileUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-primary-600 hover:underline flex items-center gap-1"
                          >
                            <Icons.eye size={12} />
                            View
                          </a>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Action Buttons */}
                <div className="pt-6 border-t border-[var(--border)]">
                  <div className="flex items-center gap-3">
                    <button
                      onClick={handleApprove}
                      disabled={isProcessing}
                      className="btn btn-success flex-1"
                    >
                      {isProcessing ? (
                        <Icons.loader size={16} className="mr-2 animate-spin" />
                      ) : (
                        <Icons.check size={16} className="mr-2" />
                      )}
                      Approve
                    </button>
                    <button
                      onClick={handleReject}
                      disabled={isProcessing}
                      className="btn btn-error flex-1"
                    >
                      {isProcessing ? (
                        <Icons.loader size={16} className="mr-2 animate-spin" />
                      ) : (
                        <Icons.x size={16} className="mr-2" />
                      )}
                      Reject
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </DashboardLayout>
  );
}
