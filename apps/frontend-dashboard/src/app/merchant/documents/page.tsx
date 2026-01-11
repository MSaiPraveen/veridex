"use client";

import { useState, useMemo, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { DashboardLayout, PageHeader } from "@/components/layout";
import { Icons } from "@/components/ui/icons";
import { StatusBadge, Pagination } from "@/components/ui/table";
import { ConfirmDialog } from "@/components/ui/modal";
import { DocumentUploadModal } from "@/components/forms/document-upload";
import { useDocuments, Document, deleteDocument } from "@/lib/hooks";
import { useAuth } from "@/lib/auth-context";

const typeOptions = [
  { label: "All Types", value: "" },
  { label: "Lab Report", value: "LAB_REPORT" },
  { label: "License", value: "LICENSE" },
  { label: "Insurance", value: "INSURANCE" },
  { label: "Certificate", value: "CERTIFICATE" },
  { label: "COA", value: "COA" },
  { label: "Invoice", value: "INVOICE" },
  { label: "Other", value: "OTHER" },
];

const statusOptions = [
  { label: "All Status", value: "" },
  { label: "Pending", value: "PENDING" },
  { label: "Processing", value: "PROCESSING" },
  { label: "Success", value: "SUCCESS" },
  { label: "Failed", value: "FAILED" },
  { label: "Expired", value: "EXPIRED" },
];

const typeIcons: Record<string, keyof typeof Icons> = {
  LAB_REPORT: "clipboardCheck",
  LICENSE: "shield",
  INSURANCE: "shield",
  CERTIFICATE: "clipboardCheck",
  COA: "clipboardCheck",
  INVOICE: "fileText",
  OTHER: "fileText",
};

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return bytes + " B";
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
  return (bytes / (1024 * 1024)).toFixed(1) + " MB";
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export default function MerchantDocumentsPage() {
  const searchParams = useSearchParams();
  const { user } = useAuth();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");

  // Initialize search from URL params
  useEffect(() => {
    const urlSearch = searchParams.get('search');
    if (urlSearch) {
       
      setSearch(urlSearch);
    }
  }, [searchParams]);

  // Modals
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [deletingDocument, setDeletingDocument] = useState<Document | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Build query params
  const query = useMemo(() => {
    const params: Record<string, string> = {
      page: String(page),
      limit: "10",
    };
    if (search) params.search = search;
    if (typeFilter) params.type = typeFilter;
    if (statusFilter) params.status = statusFilter;
    return params;
  }, [page, search, typeFilter, statusFilter]);

  const { data, isLoading, error, refetch } = useDocuments(query);

  const handleDelete = async () => {
    if (!deletingDocument) return;
    setIsDeleting(true);
    try {
      await deleteDocument(deletingDocument._id);
      setDeletingDocument(null);
      refetch();
    } catch (err) {
      console.error("Delete failed:", err);
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <DashboardLayout>
      <PageHeader
        title="Documents"
        description="Manage compliance documents and certificates"
        breadcrumbs={[
          { label: "Merchant", href: "/merchant" },
          { label: "Documents" },
        ]}
        actions={
          <button
            className="btn btn-primary"
            onClick={() => setShowUploadModal(true)}
          >
            <Icons.upload size={16} className="mr-2" />
            Upload Document
          </button>
        }
      />

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
              placeholder="Search documents..."
              className="input pl-9"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
            />
          </div>
          <select
            className="input lg:w-48"
            value={typeFilter}
            onChange={(e) => {
              setTypeFilter(e.target.value);
              setPage(1);
            }}
          >
            {typeOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          <select
            className="input lg:w-48"
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setPage(1);
            }}
          >
            {statusOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          <button className="btn btn-secondary" onClick={() => refetch()}>
            <Icons.sync size={16} className="mr-2" />
            Refresh
          </button>
        </div>
      </div>

      {/* Error State */}
      {error && (
        <div className="card p-6 mb-6 bg-error-500/10 border-error-500/20">
          <p className="text-error-500">{error}</p>
        </div>
      )}

      {/* Loading State */}
      {isLoading && (
        <div className="card p-12 flex flex-col items-center justify-center">
          <Icons.loader size={32} className="animate-spin text-primary-500 mb-4" />
          <p className="text-[var(--foreground-muted)]">Loading documents...</p>
        </div>
      )}

      {/* Empty State */}
      {!isLoading && data?.data.length === 0 && (
        <div className="card p-12 flex flex-col items-center justify-center">
          <Icons.fileText size={48} className="text-[var(--foreground-muted)] mb-4" />
          <p className="text-[var(--foreground-muted)] mb-4">No documents found</p>
          <button
            className="btn btn-primary"
            onClick={() => setShowUploadModal(true)}
          >
            <Icons.upload size={16} className="mr-2" />
            Upload your first document
          </button>
        </div>
      )}

      {/* Document Grid */}
      {!isLoading && data && data.data.length > 0 && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
            {data.data.map((doc) => {
              const IconComponent = Icons[typeIcons[doc.type] || "fileText"];
              return (
                <div key={doc._id} className="card p-4 hover:border-primary-500/30 transition-colors">
                  <div className="flex items-start justify-between mb-3">
                    <div className="p-2 rounded-lg bg-primary-500/10">
                      <IconComponent size={20} className="text-primary-500" />
                    </div>
                    <StatusBadge status={doc.status} variant="document" />
                  </div>

                  <h3 className="font-medium text-[var(--foreground)] mb-1 truncate" title={doc.fileName}>
                    {doc.fileName || doc.name}
                  </h3>

                  <p className="text-sm text-[var(--foreground-muted)] mb-3">
                    {doc.type.replace(/_/g, " ")}
                  </p>

                  <div className="flex items-center justify-between text-xs text-[var(--foreground-muted)]">
                    <span>{formatFileSize(doc.fileSize)}</span>
                    <span>{formatDate(doc.createdAt)}</span>
                  </div>

                  {doc.extractionStatus && (
                    <div className="mt-3 pt-3 border-t border-[var(--border)]">
                      <div className="flex items-center gap-2 text-xs">
                        {doc.extractionStatus === "SUCCESS" ? (
                          <>
                            <Icons.check size={14} className="text-success-500" />
                            <span className="text-success-500">Data extracted</span>
                          </>
                        ) : doc.extractionStatus === "PROCESSING" ? (
                          <>
                            <Icons.loader size={14} className="text-warning-500 animate-spin" />
                            <span className="text-warning-500">Processing...</span>
                          </>
                        ) : doc.extractionStatus === "FAILED" ? (
                          <>
                            <Icons.x size={14} className="text-error-500" />
                            <span className="text-error-500">Extraction failed</span>
                          </>
                        ) : (
                          <>
                            <Icons.clock size={14} className="text-[var(--foreground-muted)]" />
                            <span>Pending extraction</span>
                          </>
                        )}
                      </div>
                    </div>
                  )}

                  <div className="flex items-center justify-end gap-2 mt-4">
                    {doc.fileUrl && (
                      <a
                        href={doc.fileUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-2 rounded-lg hover:bg-[var(--background)] transition-colors"
                        title="Download"
                      >
                        <Icons.download size={16} className="text-[var(--foreground-muted)]" />
                      </a>
                    )}
                    <button
                      className="p-2 rounded-lg hover:bg-[var(--background)] transition-colors"
                      title="View"
                    >
                      <Icons.eye size={16} className="text-[var(--foreground-muted)]" />
                    </button>
                    <button
                      className="p-2 rounded-lg hover:bg-error-500/10 transition-colors"
                      title="Delete"
                      onClick={() => setDeletingDocument(doc)}
                    >
                      <Icons.trash size={16} className="text-error-500" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Pagination */}
          {data.totalPages > 1 && (
            <div className="card">
              <Pagination
                page={page}
                totalPages={data.totalPages}
                total={data.total}
                limit={data.limit}
                onPageChange={setPage}
              />
            </div>
          )}
        </>
      )}

      {/* Upload Modal */}
      <DocumentUploadModal
        isOpen={showUploadModal}
        onClose={() => setShowUploadModal(false)}
        onSuccess={refetch}
        organizationId={user?.organizationId || ""}
      />

      {/* Delete Confirmation */}
      <ConfirmDialog
        isOpen={!!deletingDocument}
        onClose={() => setDeletingDocument(null)}
        onConfirm={handleDelete}
        title="Delete Document"
        message={`Are you sure you want to delete "${deletingDocument?.fileName}"? This action cannot be undone.`}
        confirmText="Delete"
        variant="danger"
        isLoading={isDeleting}
      />
    </DashboardLayout>
  );
}
