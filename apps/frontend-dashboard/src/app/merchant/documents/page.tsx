"use client";

import { useState, useMemo, useEffect, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import { DashboardLayout, PageHeader } from "@/components/layout";
import { Icons } from "@/components/ui/icons";
import { Pagination } from "@/components/ui/table";
import { ConfirmDialog } from "@/components/ui/modal";
import { DocumentUploadModal } from "@/components/forms/document-upload";
import { useDocuments, useScopedProducts, Document, Product, deleteDocument } from "@/lib/hooks";
import { useAuth } from "@/lib/auth-context";
import { DocumentViewer } from "@/components/ui/document-viewer";

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
  { label: "Verified", value: "SUCCESS" },
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
  PRODUCT_PHOTO: "file",
  OTHER: "fileText",
};

const typeLabels: Record<string, string> = {
  LAB_REPORT: "Lab Report",
  LICENSE: "License",
  INSURANCE: "Insurance",
  CERTIFICATE: "Certificate",
  COA: "Certificate of Analysis",
  INVOICE: "Invoice",
  PRODUCT_PHOTO: "Product Photo",
  OTHER: "Other",
};

const statusColors: Record<string, string> = {
  PENDING: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
  PROCESSING: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  SUCCESS: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400",
  FAILED: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
  EXPIRED: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-400",
};

function formatFileSize(bytes: number): string {
  if (!bytes) return "0 B";
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

type ViewMode = "products" | "all";

export default function MerchantDocumentsPage() {
  const searchParams = useSearchParams();
  const { user } = useAuth();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [viewMode, setViewMode] = useState<ViewMode>("products");
  const [expandedProducts, setExpandedProducts] = useState<Set<string>>(new Set());

  // Initialize search from URL params
  useEffect(() => {
    const urlSearch = searchParams.get("search");
    if (urlSearch) {
      setSearch(urlSearch);
    }
  }, [searchParams]);

  // Modals
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [uploadForProduct, setUploadForProduct] = useState<Product | null>(null);
  const [deletingDocument, setDeletingDocument] = useState<Document | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [viewingDocument, setViewingDocument] = useState<Document | null>(null);

  // Fetch products with documents
  const { data: productsData, isLoading: loadingProducts, refetch: refetchProducts } = useScopedProducts("my", {
    page: "1",
    limit: "100",
  });
  const products = productsData?.data || [];

  // Fetch all documents
  const docsQuery = useMemo(() => {
    const params: Record<string, string> = {
      page: String(page),
      limit: "50",
    };
    if (search) params.search = search;
    if (typeFilter) params.type = typeFilter;
    if (statusFilter) params.status = statusFilter;
    return params;
  }, [page, search, typeFilter, statusFilter]);

  const { data: docsData, isLoading: loadingDocs, error, refetch: refetchDocs } = useDocuments(docsQuery);
  const documents = docsData?.data || [];

  // Group documents by product
  const productDocMap = useMemo(() => {
    const map: Record<string, Document[]> = {};
    const unassigned: Document[] = [];

    documents.forEach((doc) => {
      if (doc.productId) {
        if (!map[doc.productId]) map[doc.productId] = [];
        map[doc.productId].push(doc);
      } else {
        unassigned.push(doc);
      }
    });

    return { byProduct: map, unassigned };
  }, [documents]);

  // Calculate stats
  const stats = useMemo(() => {
    return {
      total: documents.length,
      verified: documents.filter((d) => d.status === "SUCCESS").length,
      pending: documents.filter((d) => d.status === "PENDING" || d.status === "PROCESSING").length,
      failed: documents.filter((d) => d.status === "FAILED").length,
      productsWithDocs: Object.keys(productDocMap.byProduct).length,
      productsWithoutDocs: products.filter((p) => !productDocMap.byProduct[p._id]?.length).length,
    };
  }, [documents, productDocMap, products]);

  const handleDelete = async () => {
    if (!deletingDocument) return;
    setIsDeleting(true);
    try {
      await deleteDocument(deletingDocument._id);
      setDeletingDocument(null);
      refetchDocs();
    } catch (err) {
      console.error("Delete failed:", err);
    } finally {
      setIsDeleting(false);
    }
  };

  const toggleProductExpand = useCallback((productId: string) => {
    setExpandedProducts((prev) => {
      const next = new Set(prev);
      if (next.has(productId)) {
        next.delete(productId);
      } else {
        next.add(productId);
      }
      return next;
    });
  }, []);

  const handleUploadForProduct = (product: Product) => {
    setUploadForProduct(product);
    setShowUploadModal(true);
  };

  const isLoading = loadingProducts || loadingDocs;

  return (
    <DashboardLayout>
      <PageHeader
        title="Documents"
        description="Manage compliance documents and certificates for your products"
        breadcrumbs={[
          { label: "Merchant", href: "/merchant" },
          { label: "Documents" },
        ]}
        actions={
          <button
            className="btn btn-primary"
            onClick={() => {
              setUploadForProduct(null);
              setShowUploadModal(true);
            }}
          >
            <Icons.upload size={16} className="mr-2" />
            Upload Document
          </button>
        }
      />

      {/* Stats Overview */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4 mb-6">
        <div className="card p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary-100 dark:bg-primary-900/30">
              <Icons.fileText size={20} className="text-primary-600 dark:text-primary-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-[var(--foreground)]">{stats.total}</p>
              <p className="text-xs text-[var(--foreground-muted)]">Total Documents</p>
            </div>
          </div>
        </div>
        <div className="card p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-emerald-100 dark:bg-emerald-900/30">
              <Icons.check size={20} className="text-emerald-600 dark:text-emerald-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">{stats.verified}</p>
              <p className="text-xs text-[var(--foreground-muted)]">Verified</p>
            </div>
          </div>
        </div>
        <div className="card p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-amber-100 dark:bg-amber-900/30">
              <Icons.clock size={20} className="text-amber-600 dark:text-amber-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-amber-600 dark:text-amber-400">{stats.pending}</p>
              <p className="text-xs text-[var(--foreground-muted)]">Pending</p>
            </div>
          </div>
        </div>
        <div className="card p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-red-100 dark:bg-red-900/30">
              <Icons.x size={20} className="text-red-600 dark:text-red-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-red-600 dark:text-red-400">{stats.failed}</p>
              <p className="text-xs text-[var(--foreground-muted)]">Failed</p>
            </div>
          </div>
        </div>
        <div className="card p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-900/30">
              <Icons.package size={20} className="text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">{stats.productsWithDocs}</p>
              <p className="text-xs text-[var(--foreground-muted)]">With Docs</p>
            </div>
          </div>
        </div>
        <div className="card p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-slate-100 dark:bg-slate-800">
              <Icons.alertTriangle size={20} className="text-slate-600 dark:text-slate-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-600 dark:text-slate-400">{stats.productsWithoutDocs}</p>
              <p className="text-xs text-[var(--foreground-muted)]">Missing Docs</p>
            </div>
          </div>
        </div>
      </div>

      {/* View Toggle & Filters */}
      <div className="card p-4 mb-6">
        <div className="flex flex-col lg:flex-row lg:items-center gap-4">
          {/* View Mode Toggle */}
          <div className="flex rounded-lg bg-[var(--muted)] p-1">
            <button
              onClick={() => setViewMode("products")}
              className={`px-4 py-2 text-sm font-medium rounded-md transition-all ${
                viewMode === "products"
                  ? "bg-[var(--card)] text-[var(--foreground)] shadow-sm"
                  : "text-[var(--foreground-muted)] hover:text-[var(--foreground)]"
              }`}
            >
              <Icons.package size={16} className="inline mr-2" />
              By Product
            </button>
            <button
              onClick={() => setViewMode("all")}
              className={`px-4 py-2 text-sm font-medium rounded-md transition-all ${
                viewMode === "all"
                  ? "bg-[var(--card)] text-[var(--foreground)] shadow-sm"
                  : "text-[var(--foreground-muted)] hover:text-[var(--foreground)]"
              }`}
            >
              <Icons.fileText size={16} className="inline mr-2" />
              All Documents
            </button>
          </div>

          {/* Search */}
          <div className="relative flex-1">
            <Icons.search
              className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--foreground-muted)]"
              size={16}
            />
            <input
              type="text"
              placeholder="Search documents..."
              className="input pl-9 w-full"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
            />
          </div>

          {/* Filters */}
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
          <button
            className="btn btn-secondary"
            onClick={() => {
              refetchDocs();
              refetchProducts();
            }}
          >
            <Icons.sync size={16} className="mr-2" />
            Refresh
          </button>
        </div>
      </div>

      {/* Error State */}
      {error && (
        <div className="card p-6 mb-6 bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800">
          <p className="text-red-600 dark:text-red-400">{error}</p>
        </div>
      )}

      {/* Loading State */}
      {isLoading && (
        <div className="card p-12 flex flex-col items-center justify-center">
          <Icons.loader size={32} className="animate-spin text-primary-500 mb-4" />
          <p className="text-[var(--foreground-muted)]">Loading documents...</p>
        </div>
      )}

      {/* Products View */}
      {!isLoading && viewMode === "products" && (
        <div className="space-y-4">
          {/* Products with documents */}
          {products.map((product) => {
            const productDocs = productDocMap.byProduct[product._id] || [];
            const isExpanded = expandedProducts.has(product._id);
            const docCount = productDocs.length;
            const verifiedCount = productDocs.filter((d) => d.status === "SUCCESS").length;
            const pendingCount = productDocs.filter((d) => d.status === "PENDING" || d.status === "PROCESSING").length;

            return (
              <div
                key={product._id}
                className="card overflow-hidden border-[var(--border)]"
              >
                {/* Product Header */}
                <div
                  className="p-4 flex items-center gap-4 cursor-pointer hover:bg-[var(--muted)]/50 transition-colors"
                  onClick={() => toggleProductExpand(product._id)}
                >
                  <div className="flex-shrink-0 w-12 h-12 rounded-xl bg-gradient-to-br from-primary-100 to-primary-200 dark:from-primary-900/50 dark:to-primary-800/50 flex items-center justify-center">
                    <Icons.package size={22} className="text-primary-600 dark:text-primary-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold text-[var(--foreground)] truncate">
                        {product.name}
                      </h3>
                      {product.category && (
                        <span className="px-2 py-0.5 text-xs rounded-md bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                          {product.category}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-3 mt-1 text-sm text-[var(--foreground-muted)]">
                      {product.sku && <span className="font-mono">{product.sku}</span>}
                      {product.batchNumber && <span>Batch: {product.batchNumber}</span>}
                    </div>
                  </div>

                  {/* Document Counts */}
                  <div className="flex items-center gap-3">
                    {docCount === 0 ? (
                      <span className="flex items-center gap-1.5 text-sm text-amber-600 dark:text-amber-400">
                        <Icons.alertTriangle size={14} />
                        No documents
                      </span>
                    ) : (
                      <>
                        <div className="flex items-center gap-1 text-sm">
                          <Icons.fileText size={14} className="text-[var(--foreground-muted)]" />
                          <span className="text-[var(--foreground)]">{docCount}</span>
                        </div>
                        {verifiedCount > 0 && (
                          <div className="flex items-center gap-1 text-sm text-emerald-600 dark:text-emerald-400">
                            <Icons.check size={14} />
                            {verifiedCount}
                          </div>
                        )}
                        {pendingCount > 0 && (
                          <div className="flex items-center gap-1 text-sm text-amber-600 dark:text-amber-400">
                            <Icons.clock size={14} />
                            {pendingCount}
                          </div>
                        )}
                      </>
                    )}
                  </div>

                  {/* Actions */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleUploadForProduct(product);
                    }}
                    className="btn btn-sm btn-secondary"
                  >
                    <Icons.upload size={14} className="mr-1" />
                    Upload
                  </button>

                  <Icons.chevronDown
                    size={20}
                    className={`text-[var(--foreground-muted)] transition-transform ${
                      isExpanded ? "rotate-180" : ""
                    }`}
                  />
                </div>

                {/* Expanded Documents List */}
                {isExpanded && (
                  <div className="border-t border-[var(--border)] bg-[var(--muted)]/30">
                    {productDocs.length === 0 ? (
                      <div className="p-8 text-center">
                        <Icons.fileText size={40} className="text-[var(--foreground-muted)] mx-auto mb-3" />
                        <p className="text-[var(--foreground-muted)] mb-3">No documents uploaded yet</p>
                        <button
                          onClick={() => handleUploadForProduct(product)}
                          className="btn btn-primary btn-sm"
                        >
                          <Icons.upload size={14} className="mr-1" />
                          Upload Document
                        </button>
                      </div>
                    ) : (
                      <div className="divide-y divide-[var(--border)]">
                        {productDocs.map((doc) => {
                          const IconComponent = Icons[typeIcons[doc.type] || "fileText"];
                          return (
                            <div
                              key={doc._id}
                              className="px-4 py-3 pl-20 flex items-center gap-4 hover:bg-[var(--muted)]/50 transition-colors"
                            >
                              <div className="p-2 rounded-lg bg-[var(--card)]">
                                <IconComponent size={18} className="text-primary-500" />
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2">
                                  <span className="text-sm font-medium text-[var(--foreground)] truncate">
                                    {doc.fileName || doc.name}
                                  </span>
                                  <span
                                    className={`px-2 py-0.5 text-xs font-medium rounded-full ${
                                      statusColors[doc.status] || statusColors.PENDING
                                    }`}
                                  >
                                    {doc.status === "SUCCESS" ? "Verified" : doc.status}
                                  </span>
                                </div>
                                <div className="flex items-center gap-3 mt-0.5 text-xs text-[var(--foreground-muted)]">
                                  <span>{typeLabels[doc.type] || doc.type}</span>
                                  <span>•</span>
                                  <span>{formatFileSize(doc.fileSize)}</span>
                                  <span>•</span>
                                  <span>{formatDate(doc.createdAt)}</span>
                                  {doc.extractionStatus === "SUCCESS" && (
                                    <>
                                      <span>•</span>
                                      <span className="text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                                        <Icons.check size={10} />
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
                                    className="p-2 rounded-lg hover:bg-[var(--card)] transition-colors"
                                    title="Download"
                                  >
                                    <Icons.download size={16} className="text-[var(--foreground-muted)]" />
                                  </a>
                                )}
                                <button
                                  onClick={() => setViewingDocument(doc)}
                                  className="p-2 rounded-lg hover:bg-[var(--card)] transition-colors"
                                  title="View"
                                >
                                  <Icons.eye size={16} className="text-[var(--foreground-muted)]" />
                                </button>
                                <button
                                  onClick={() => setDeletingDocument(doc)}
                                  className="p-2 rounded-lg hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors"
                                  title="Delete"
                                >
                                  <Icons.trash size={16} className="text-red-500" />
                                </button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}

          {/* Unassigned Documents */}
          {productDocMap.unassigned.length > 0 && (
            <div className="card overflow-hidden border-amber-200 dark:border-amber-800">
              <div className="p-4 bg-amber-50 dark:bg-amber-900/20 border-b border-amber-200 dark:border-amber-800">
                <div className="flex items-center gap-2">
                  <Icons.alertTriangle size={18} className="text-amber-600 dark:text-amber-400" />
                  <h3 className="font-semibold text-amber-800 dark:text-amber-300">
                    Unassigned Documents ({productDocMap.unassigned.length})
                  </h3>
                </div>
                <p className="text-sm text-amber-700 dark:text-amber-400 mt-1">
                  These documents are not linked to any product
                </p>
              </div>
              <div className="divide-y divide-[var(--border)]">
                {productDocMap.unassigned.map((doc) => {
                  const IconComponent = Icons[typeIcons[doc.type] || "fileText"];
                  return (
                    <div
                      key={doc._id}
                      className="px-4 py-3 flex items-center gap-4 hover:bg-[var(--muted)]/50 transition-colors"
                    >
                      <div className="p-2 rounded-lg bg-[var(--muted)]">
                        <IconComponent size={18} className="text-amber-500" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium text-[var(--foreground)] truncate">
                            {doc.fileName || doc.name}
                          </span>
                          <span
                            className={`px-2 py-0.5 text-xs font-medium rounded-full ${
                              statusColors[doc.status] || statusColors.PENDING
                            }`}
                          >
                            {doc.status === "SUCCESS" ? "Verified" : doc.status}
                          </span>
                        </div>
                        <div className="flex items-center gap-3 mt-0.5 text-xs text-[var(--foreground-muted)]">
                          <span>{typeLabels[doc.type] || doc.type}</span>
                          <span>•</span>
                          <span>{formatFileSize(doc.fileSize)}</span>
                          <span>•</span>
                          <span>{formatDate(doc.createdAt)}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-1">
                        {doc.fileUrl && (
                          <a
                            href={doc.fileUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-2 rounded-lg hover:bg-[var(--card)] transition-colors"
                            title="Download"
                          >
                            <Icons.download size={16} className="text-[var(--foreground-muted)]" />
                          </a>
                        )}
                        <button
                          onClick={() => setDeletingDocument(doc)}
                          className="p-2 rounded-lg hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors"
                          title="Delete"
                        >
                          <Icons.trash size={16} className="text-red-500" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {products.length === 0 && (
            <div className="card p-12 flex flex-col items-center justify-center">
              <Icons.package size={48} className="text-[var(--foreground-muted)] mb-4" />
              <p className="text-[var(--foreground-muted)] mb-4">No products found</p>
              <a href="/merchant/products?action=new" className="btn btn-primary">
                <Icons.plus size={16} className="mr-2" />
                Create Your First Product
              </a>
            </div>
          )}
        </div>
      )}

      {/* All Documents View (Grid) */}
      {!isLoading && viewMode === "all" && (
        <>
          {documents.length === 0 ? (
            <div className="card p-12 flex flex-col items-center justify-center">
              <Icons.fileText size={48} className="text-[var(--foreground-muted)] mb-4" />
              <p className="text-[var(--foreground-muted)] mb-4">No documents found</p>
              <button className="btn btn-primary" onClick={() => setShowUploadModal(true)}>
                <Icons.upload size={16} className="mr-2" />
                Upload your first document
              </button>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
                {documents.map((doc) => {
                  const IconComponent = Icons[typeIcons[doc.type] || "fileText"];
                  const linkedProduct = products.find((p) => p._id === doc.productId);

                  return (
                    <div
                      key={doc._id}
                      className="card p-4 hover:border-primary-500/30 transition-colors"
                    >
                      <div className="flex items-start justify-between mb-3">
                        <div className="p-2 rounded-lg bg-primary-500/10">
                          <IconComponent size={20} className="text-primary-500" />
                        </div>
                        <span
                          className={`px-2 py-0.5 text-xs font-medium rounded-full ${
                            statusColors[doc.status] || statusColors.PENDING
                          }`}
                        >
                          {doc.status === "SUCCESS" ? "Verified" : doc.status}
                        </span>
                      </div>

                      <h3
                        className="font-medium text-[var(--foreground)] mb-1 truncate"
                        title={doc.fileName}
                      >
                        {doc.fileName || doc.name}
                      </h3>

                      <p className="text-sm text-[var(--foreground-muted)] mb-2">
                        {typeLabels[doc.type] || doc.type.replace(/_/g, " ")}
                      </p>

                      {linkedProduct && (
                        <div className="flex items-center gap-2 mb-3 p-2 rounded-lg bg-[var(--muted)]/50">
                          <Icons.package size={14} className="text-[var(--foreground-muted)]" />
                          <span className="text-xs text-[var(--foreground)] truncate">
                            {linkedProduct.name}
                          </span>
                        </div>
                      )}

                      <div className="flex items-center justify-between text-xs text-[var(--foreground-muted)]">
                        <span>{formatFileSize(doc.fileSize)}</span>
                        <span>{formatDate(doc.createdAt)}</span>
                      </div>

                      {doc.extractionStatus && (
                        <div className="mt-3 pt-3 border-t border-[var(--border)]">
                          <div className="flex items-center gap-2 text-xs">
                            {doc.extractionStatus === "SUCCESS" ? (
                              <>
                                <Icons.check size={14} className="text-emerald-500" />
                                <span className="text-emerald-600 dark:text-emerald-400">
                                  Data extracted
                                </span>
                              </>
                            ) : doc.extractionStatus === "PROCESSING" ? (
                              <>
                                <Icons.loader
                                  size={14}
                                  className="text-amber-500 animate-spin"
                                />
                                <span className="text-amber-600 dark:text-amber-400">
                                  Processing...
                                </span>
                              </>
                            ) : doc.extractionStatus === "FAILED" ? (
                              <>
                                <Icons.x size={14} className="text-red-500" />
                                <span className="text-red-600 dark:text-red-400">
                                  Extraction failed
                                </span>
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
                            className="p-2 rounded-lg hover:bg-[var(--muted)] transition-colors"
                            title="Download"
                          >
                            <Icons.download size={16} className="text-[var(--foreground-muted)]" />
                          </a>
                        )}
                        <button
                          onClick={() => setViewingDocument(doc)}
                          className="p-2 rounded-lg hover:bg-[var(--muted)] transition-colors"
                          title="View"
                        >
                          <Icons.eye size={16} className="text-[var(--foreground-muted)]" />
                        </button>
                        <button
                          className="p-2 rounded-lg hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors"
                          title="Delete"
                          onClick={() => setDeletingDocument(doc)}
                        >
                          <Icons.trash size={16} className="text-red-500" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Pagination */}
              {docsData && docsData.totalPages > 1 && (
                <div className="card">
                  <Pagination
                    page={page}
                    totalPages={docsData.totalPages}
                    total={docsData.total}
                    limit={docsData.limit}
                    onPageChange={setPage}
                  />
                </div>
              )}
            </>
          )}
        </>
      )}

      {/* Upload Modal */}
      <DocumentUploadModal
        isOpen={showUploadModal}
        onClose={() => {
          setShowUploadModal(false);
          setUploadForProduct(null);
        }}
        onSuccess={() => {
          refetchDocs();
          refetchProducts();
        }}
        organizationId={user?.organizationId || ""}
        productId={uploadForProduct?._id}
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

      {/* Document Viewer */}
      {viewingDocument && (
        <DocumentViewer
          document={viewingDocument}
          onClose={() => setViewingDocument(null)}
        />
      )}
    </DashboardLayout>
  );
}
