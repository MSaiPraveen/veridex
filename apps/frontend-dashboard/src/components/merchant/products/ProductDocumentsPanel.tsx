'use client';

import { useState, useEffect } from 'react';
import { Icons } from '@/components/ui/icons';
import { Modal } from '@/components/ui/modal';
import { Product } from './types';
import { Document, useProductDocuments, uploadDocument, deleteDocument } from '@/lib/hooks';
import { DocumentUploadModal } from '@/components/forms/document-upload';

interface ProductDocumentsPanelProps {
  isOpen: boolean;
  onClose: () => void;
  product: Product | null;
  organizationId: string;
}

const typeIcons: Record<string, keyof typeof Icons> = {
  LAB_REPORT: 'clipboardCheck',
  LICENSE: 'shield',
  INSURANCE: 'shield',
  CERTIFICATE: 'clipboardCheck',
  COA: 'clipboardCheck',
  INVOICE: 'fileText',
  PRODUCT_PHOTO: 'file',
  OTHER: 'fileText',
};

const typeLabels: Record<string, string> = {
  LAB_REPORT: 'Lab Report',
  LICENSE: 'License',
  INSURANCE: 'Insurance',
  CERTIFICATE: 'Certificate',
  COA: 'Certificate of Analysis',
  INVOICE: 'Invoice',
  PRODUCT_PHOTO: 'Product Photo',
  OTHER: 'Other',
};

const statusColors: Record<string, string> = {
  PENDING: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  PROCESSING: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  SUCCESS: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
  FAILED: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  EXPIRED: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-400',
};

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function ProductDocumentsPanel({
  isOpen,
  onClose,
  product,
  organizationId,
}: ProductDocumentsPanelProps) {
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [deletingDoc, setDeletingDoc] = useState<Document | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const { data: docsData, isLoading, error, refetch } = useProductDocuments(product?._id || null);
  const documents = docsData?.data || [];

  const handleDelete = async () => {
    if (!deletingDoc) return;
    setIsDeleting(true);
    try {
      await deleteDocument(deletingDoc._id);
      setDeletingDoc(null);
      refetch();
    } catch (err) {
      console.error('Delete failed:', err);
    } finally {
      setIsDeleting(false);
    }
  };

  if (!product) return null;

  // Group documents by type
  const groupedDocs = documents.reduce((acc, doc) => {
    const type = doc.type || 'OTHER';
    if (!acc[type]) acc[type] = [];
    acc[type].push(doc);
    return acc;
  }, {} as Record<string, Document[]>);

  const requiredDocTypes = ['LAB_REPORT', 'COA'];
  const missingDocs = requiredDocTypes.filter(type => !groupedDocs[type]?.length);

  return (
    <>
      <Modal
        isOpen={isOpen}
        onClose={onClose}
        title={`Documents for ${product.name}`}
        size="xl"
      >
        <div className="space-y-6">
          {/* Product Info Header */}
          <div className="flex items-start gap-4 p-4 bg-[var(--muted)]/50 rounded-xl">
            <div className="flex-shrink-0 w-14 h-14 rounded-xl bg-gradient-to-br from-primary-100 to-primary-200 dark:from-primary-900/50 dark:to-primary-800/50 flex items-center justify-center">
              <Icons.package size={24} className="text-primary-600 dark:text-primary-400" />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="text-lg font-semibold text-[var(--foreground)]">{product.name}</h3>
              <div className="flex flex-wrap items-center gap-3 mt-1 text-sm text-[var(--foreground-muted)]">
                {product.sku && (
                  <span className="font-mono">{product.sku}</span>
                )}
                {product.category && (
                  <span className="px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-xs">
                    {product.category}
                  </span>
                )}
                {product.batchNumber && (
                  <span>Batch: {product.batchNumber}</span>
                )}
              </div>
            </div>
            <button
              onClick={() => setShowUploadModal(true)}
              className="btn btn-primary flex-shrink-0"
            >
              <Icons.upload size={16} className="mr-2" />
              Upload Document
            </button>
          </div>

          {/* Compliance Status */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="p-3 rounded-lg bg-[var(--muted)]/30 border border-[var(--border)]">
              <div className="text-xs text-[var(--foreground-muted)] mb-1">Documents</div>
              <div className="text-xl font-bold text-[var(--foreground)]">{documents.length}</div>
            </div>
            <div className="p-3 rounded-lg bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800">
              <div className="text-xs text-emerald-600 dark:text-emerald-400 mb-1">Verified</div>
              <div className="text-xl font-bold text-emerald-700 dark:text-emerald-300">
                {documents.filter(d => d.status === 'SUCCESS').length}
              </div>
            </div>
            <div className="p-3 rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800">
              <div className="text-xs text-amber-600 dark:text-amber-400 mb-1">Pending</div>
              <div className="text-xl font-bold text-amber-700 dark:text-amber-300">
                {documents.filter(d => d.status === 'PENDING' || d.status === 'PROCESSING').length}
              </div>
            </div>
            <div className="p-3 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800">
              <div className="text-xs text-red-600 dark:text-red-400 mb-1">Missing Required</div>
              <div className="text-xl font-bold text-red-700 dark:text-red-300">
                {missingDocs.length}
              </div>
            </div>
          </div>

          {/* Missing Documents Alert */}
          {missingDocs.length > 0 && (
            <div className="p-4 rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800">
              <div className="flex items-start gap-3">
                <Icons.alertTriangle size={20} className="text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-medium text-amber-800 dark:text-amber-300">
                    Missing Required Documents
                  </h4>
                  <p className="text-sm text-amber-700 dark:text-amber-400 mt-1">
                    Upload the following documents to improve compliance:
                  </p>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {missingDocs.map(type => (
                      <button
                        key={type}
                        onClick={() => setShowUploadModal(true)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-100 dark:bg-amber-800/40 text-amber-800 dark:text-amber-300 text-sm font-medium hover:bg-amber-200 dark:hover:bg-amber-700/40 transition-colors"
                      >
                        <Icons.plus size={14} />
                        {typeLabels[type]}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Loading State */}
          {isLoading && (
            <div className="py-12 flex flex-col items-center justify-center">
              <Icons.loader size={32} className="animate-spin text-primary-500 mb-4" />
              <p className="text-[var(--foreground-muted)]">Loading documents...</p>
            </div>
          )}

          {/* Error State */}
          {error && (
            <div className="p-4 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800">
              <p className="text-red-600 dark:text-red-400">{error}</p>
            </div>
          )}

          {/* Documents List */}
          {!isLoading && !error && (
            <>
              {documents.length === 0 ? (
                <div className="py-12 flex flex-col items-center justify-center border-2 border-dashed border-[var(--border)] rounded-xl">
                  <Icons.fileText size={48} className="text-[var(--foreground-muted)] mb-4" />
                  <p className="text-[var(--foreground-muted)] mb-4">No documents uploaded yet</p>
                  <button
                    onClick={() => setShowUploadModal(true)}
                    className="btn btn-primary"
                  >
                    <Icons.upload size={16} className="mr-2" />
                    Upload First Document
                  </button>
                </div>
              ) : (
                <div className="space-y-4">
                  {Object.entries(groupedDocs).map(([type, docs]) => {
                    const IconComponent = Icons[typeIcons[type] || 'fileText'];
                    return (
                      <div key={type} className="border border-[var(--border)] rounded-xl overflow-hidden">
                        <div className="px-4 py-3 bg-[var(--muted)]/50 border-b border-[var(--border)] flex items-center gap-2">
                          <IconComponent size={16} className="text-primary-500" />
                          <span className="font-medium text-[var(--foreground)]">
                            {typeLabels[type] || type}
                          </span>
                          <span className="text-xs text-[var(--foreground-muted)]">
                            ({docs.length} document{docs.length !== 1 ? 's' : ''})
                          </span>
                        </div>
                        <div className="divide-y divide-[var(--border)]">
                          {docs.map(doc => (
                            <div
                              key={doc._id}
                              className="px-4 py-3 flex items-center gap-4 hover:bg-[var(--muted)]/30 transition-colors"
                            >
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2">
                                  <span className="text-sm font-medium text-[var(--foreground)] truncate">
                                    {doc.fileName || doc.name}
                                  </span>
                                  <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${statusColors[doc.status] || statusColors.PENDING}`}>
                                    {doc.status}
                                  </span>
                                </div>
                                <div className="flex items-center gap-3 mt-1 text-xs text-[var(--foreground-muted)]">
                                  <span>{formatFileSize(doc.fileSize)}</span>
                                  <span>•</span>
                                  <span>{formatDate(doc.createdAt)}</span>
                                  {doc.extractionStatus === 'SUCCESS' && (
                                    <>
                                      <span>•</span>
                                      <span className="text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                                        <Icons.check size={12} />
                                        Data Extracted
                                      </span>
                                    </>
                                  )}
                                </div>
                              </div>
                              <div className="flex items-center gap-1">
                                {doc.fileUrl && (
                                  <a
                                    href={doc.fileUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="p-2 rounded-lg hover:bg-[var(--muted)] transition-colors"
                                    title="Download"
                                  >
                                    <Icons.download size={16} className="text-[var(--foreground-muted)]" />
                                  </a>
                                )}
                                <button
                                  className="p-2 rounded-lg hover:bg-[var(--muted)] transition-colors"
                                  title="View"
                                >
                                  <Icons.eye size={16} className="text-[var(--foreground-muted)]" />
                                </button>
                                <button
                                  onClick={() => setDeletingDoc(doc)}
                                  className="p-2 rounded-lg hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors"
                                  title="Delete"
                                >
                                  <Icons.trash size={16} className="text-red-500" />
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </>
          )}
        </div>
      </Modal>

      {/* Upload Modal */}
      <DocumentUploadModal
        isOpen={showUploadModal}
        onClose={() => setShowUploadModal(false)}
        onSuccess={() => {
          setShowUploadModal(false);
          refetch();
        }}
        organizationId={organizationId}
        productId={product._id}
      />

      {/* Delete Confirmation */}
      {deletingDoc && (
        <Modal
          isOpen={!!deletingDoc}
          onClose={() => setDeletingDoc(null)}
          title="Delete Document"
          size="sm"
        >
          <div className="space-y-4">
            <p className="text-[var(--foreground-muted)]">
              Are you sure you want to delete &ldquo;{deletingDoc.fileName}&rdquo;? This action cannot be undone.
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setDeletingDoc(null)}
                className="btn btn-secondary"
                disabled={isDeleting}
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                className="btn btn-danger"
                disabled={isDeleting}
              >
                {isDeleting ? (
                  <>
                    <Icons.loader size={16} className="mr-2 animate-spin" />
                    Deleting...
                  </>
                ) : (
                  <>
                    <Icons.trash size={16} className="mr-2" />
                    Delete
                  </>
                )}
              </button>
            </div>
          </div>
        </Modal>
      )}
    </>
  );
}
