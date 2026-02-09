'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  FileText,
  Download,
  Eye,
  CheckCircle,
  XCircle,
  Clock,
  AlertTriangle,
  Building2,
  RefreshCw,
  FileCheck,
  FileX,
  MoreVertical,
  ExternalLink,
  Calendar,
  Flag,
  ChevronRight,
  Loader2,
  Filter
} from 'lucide-react';
import Link from 'next/link';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge, StatusBadge } from '@/components/ui/badge';
import { SearchInput, Select, Textarea } from '@/components/ui/input';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell, Pagination } from '@/components/ui/table';
import { Modal } from '@/components/ui/modal';
import { Dropdown, DropdownItem, DropdownDivider } from '@/components/ui/dropdown';
import { EmptyState, ErrorState } from '@/components/ui/empty-state';
import { SkeletonTable, SkeletonCard } from '@/components/ui/skeleton';
import { PermissionGate, useAdminPermissions } from '@/components/auth/permission-gate';
import { AdminPermission } from '@/lib/admin-rbac';
import { adminApi } from '@/lib/admin-api';

// Types
interface Document {
  id: string;
  fileName: string;
  originalName?: string;
  documentType: string;
  organizationId: string;
  organizationName?: string;
  productId?: string;
  productName?: string;
  status: 'PENDING_REVIEW' | 'PROCESSING' | 'APPROVED' | 'REJECTED' | 'FLAGGED' | 'EXTRACTION_FAILED';
  complianceStatus?: 'COMPLIANT' | 'NON_COMPLIANT' | 'PENDING' | 'NEEDS_REVIEW';
  uploadedAt: string;
  uploadedBy?: string;
  reviewedAt?: string;
  reviewedBy?: string;
  reviewNote?: string;
  fileSize?: number;
  mimeType?: string;
  extractedData?: Record<string, unknown>;
}

interface DocumentStats {
  total: number;
  pendingReview: number;
  approved: number;
  rejected: number;
  flagged: number;
  extractionFailed: number;
}

const statusConfig: Record<string, { bg: string; text: string; icon: typeof CheckCircle }> = {
  PENDING_REVIEW: { bg: 'bg-amber-500/10', text: 'text-amber-400', icon: Clock },
  PROCESSING: { bg: 'bg-blue-500/10', text: 'text-blue-400', icon: RefreshCw },
  APPROVED: { bg: 'bg-emerald-500/10', text: 'text-emerald-400', icon: CheckCircle },
  REJECTED: { bg: 'bg-red-500/10', text: 'text-red-400', icon: XCircle },
  FLAGGED: { bg: 'bg-orange-500/10', text: 'text-orange-400', icon: Flag },
  EXTRACTION_FAILED: { bg: 'bg-slate-500/10', text: 'text-slate-400', icon: FileX },
};

const typeConfig: Record<string, string> = {
  COA: 'bg-emerald-500/10 text-emerald-400',
  CERTIFICATE_OF_ANALYSIS: 'bg-emerald-500/10 text-emerald-400',
  BUSINESS_LICENSE: 'bg-blue-500/10 text-blue-400',
  LAB_REPORT: 'bg-purple-500/10 text-purple-400',
  SAFETY_SHEET: 'bg-amber-500/10 text-amber-400',
  COMPLIANCE_CERT: 'bg-cyan-500/10 text-cyan-400',
  LICENSE: 'bg-blue-500/10 text-blue-400',
  OTHER: 'bg-slate-500/10 text-slate-400',
};

export default function DocumentsPage() {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [stats, setStats] = useState<DocumentStats>({
    total: 0,
    pendingReview: 0,
    approved: 0,
    rejected: 0,
    flagged: 0,
    extractionFailed: 0,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [typeFilter, setTypeFilter] = useState('ALL');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const itemsPerPage = 15;

  // Action modal state
  const [selectedDoc, setSelectedDoc] = useState<Document | null>(null);
  const [actionType, setActionType] = useState<'approve' | 'reject' | 'flag' | null>(null);
  const [reviewNote, setReviewNote] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

  // Auto-refresh state
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());
  const [autoRefreshEnabled, setAutoRefreshEnabled] = useState(true);

  const permissions = useAdminPermissions();

  // Fetch documents from API
  const fetchDocuments = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const params: Record<string, string | number> = {
        page: currentPage,
        limit: itemsPerPage,
      };

      if (statusFilter !== 'ALL') {
        params.status = statusFilter;
      }
      if (typeFilter !== 'ALL') {
        params.documentType = typeFilter;
      }
      if (searchQuery) {
        params.search = searchQuery;
      }

      const queryString = new URLSearchParams(params as Record<string, string>).toString();
      const response = await adminApi.get<{
        documents: Document[];
        total: number;
        totalPages: number;
        stats?: DocumentStats;
      }>(`/admin/documents/review?${queryString}`);

      if (response.success && response.data) {
        setDocuments(response.data.documents || []);
        setTotalPages(response.data.totalPages || 1);
        setTotalItems(response.data.total || 0);

        if (response.data.stats) {
          setStats(response.data.stats);
        } else {
          // Calculate stats from documents
          const docs = response.data.documents || [];
          setStats({
            total: response.data.total || docs.length,
            pendingReview: docs.filter(d => d.status === 'PENDING_REVIEW').length,
            approved: docs.filter(d => d.status === 'APPROVED').length,
            rejected: docs.filter(d => d.status === 'REJECTED').length,
            flagged: docs.filter(d => d.status === 'FLAGGED').length,
            extractionFailed: docs.filter(d => d.status === 'EXTRACTION_FAILED').length,
          });
        }
        setLastRefresh(new Date());
        setError(null);
      } else {
        // Show error - NO MOCK FALLBACKS
        setError('Failed to load documents. Please check API connection.');
        setDocuments([]);
        setStats({ total: 0, pendingReview: 0, approved: 0, rejected: 0, flagged: 0, extractionFailed: 0 });
      }
    } catch (err) {
      console.error('Failed to fetch documents:', err);
      // Show error - NO MOCK FALLBACKS
      setError(`Failed to fetch documents: ${err instanceof Error ? err.message : 'Unknown error'}`);
      setDocuments([]);
      setStats({ total: 0, pendingReview: 0, approved: 0, rejected: 0, flagged: 0, extractionFailed: 0 });
    } finally {
      setLoading(false);
    }
  }, [currentPage, statusFilter, typeFilter, searchQuery]);

  // Fetch stats separately
  const fetchStats = useCallback(async () => {
    try {
      const response = await adminApi.get<DocumentStats>('/admin/documents/stats');
      if (response.success && response.data) {
        setStats(response.data);
      }
    } catch (err) {
      console.error('Failed to fetch stats:', err);
    }
  }, []);

  useEffect(() => {
    fetchDocuments();
  }, [fetchDocuments]);

  // Auto-refresh every 30 seconds
  useEffect(() => {
    if (!autoRefreshEnabled) return;

    const interval = setInterval(() => {
      fetchDocuments();
    }, 30000);

    return () => clearInterval(interval);
  }, [autoRefreshEnabled, fetchDocuments]);

  // Handle document action
  const handleAction = (doc: Document, action: 'approve' | 'reject' | 'flag') => {
    setSelectedDoc(doc);
    setActionType(action);
    setReviewNote('');
  };

  const executeAction = async () => {
    if (!selectedDoc || !actionType) return;

    setActionLoading(true);

    try {
      const decision = actionType === 'approve' ? 'APPROVE' : actionType === 'reject' ? 'REJECT' : 'FLAG';

      const response = await adminApi.post(`/admin/documents/review/${selectedDoc.id}/decision`, {
        decision,
        reviewNote: reviewNote || undefined,
      });

      if (response.success) {
        // Refresh the list
        await fetchDocuments();
        setSelectedDoc(null);
        setActionType(null);
        setReviewNote('');
      } else {
        console.error('Failed to submit decision:', response.error);
      }
    } catch (err) {
      console.error('Failed to execute action:', err);
    } finally {
      setActionLoading(false);
    }
  };

  const formatFileSize = (bytes?: number) => {
    if (!bytes) return '-';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const formatDateTime = (dateString: string) => {
    return new Date(dateString).toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });
  };

  // Filter documents locally for search
  const filteredDocs = documents.filter(doc => {
    if (!searchQuery) return true;
    const searchLower = searchQuery.toLowerCase();
    return (
      doc.fileName.toLowerCase().includes(searchLower) ||
      doc.organizationName?.toLowerCase().includes(searchLower) ||
      doc.productName?.toLowerCase().includes(searchLower)
    );
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Documents</h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1">
            Review and manage uploaded documents
            {lastRefresh && (
              <span className="ml-2 text-sm text-slate-400">
                • Last updated: {formatDateTime(lastRefresh.toISOString())}
              </span>
            )}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={() => setAutoRefreshEnabled(!autoRefreshEnabled)}>
            <RefreshCw className={`h-4 w-4 mr-2 ${autoRefreshEnabled ? 'text-emerald-400 animate-spin' : ''}`} />
            {autoRefreshEnabled ? 'Auto' : 'Manual'}
          </Button>
          <Button variant="secondary" onClick={fetchDocuments}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
              <FileText className="h-5 w-5 text-slate-400" />
            </div>
            <div>
              <p className="text-sm text-slate-500 dark:text-slate-400">Total</p>
              <p className="text-2xl font-bold text-slate-900 dark:text-white">{stats.total}</p>
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-amber-500/10 flex items-center justify-center">
              <Clock className="h-5 w-5 text-amber-400" />
            </div>
            <div>
              <p className="text-sm text-slate-500 dark:text-slate-400">Pending</p>
              <p className="text-2xl font-bold text-amber-400">{stats.pendingReview}</p>
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-emerald-500/10 flex items-center justify-center">
              <FileCheck className="h-5 w-5 text-emerald-400" />
            </div>
            <div>
              <p className="text-sm text-slate-500 dark:text-slate-400">Approved</p>
              <p className="text-2xl font-bold text-emerald-400">{stats.approved}</p>
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-red-500/10 flex items-center justify-center">
              <XCircle className="h-5 w-5 text-red-400" />
            </div>
            <div>
              <p className="text-sm text-slate-500 dark:text-slate-400">Rejected</p>
              <p className="text-2xl font-bold text-red-400">{stats.rejected}</p>
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-orange-500/10 flex items-center justify-center">
              <Flag className="h-5 w-5 text-orange-400" />
            </div>
            <div>
              <p className="text-sm text-slate-500 dark:text-slate-400">Flagged</p>
              <p className="text-2xl font-bold text-orange-400">{stats.flagged}</p>
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-slate-500/10 flex items-center justify-center">
              <FileX className="h-5 w-5 text-slate-400" />
            </div>
            <div>
              <p className="text-sm text-slate-500 dark:text-slate-400">Failed</p>
              <p className="text-2xl font-bold text-slate-400">{stats.extractionFailed}</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Filters */}
      <Card className="p-4">
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex-1 min-w-[250px]">
            <SearchInput
              placeholder="Search by document name, organization, or product..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          <Select
            value={statusFilter}
            onChange={(e) => { setStatusFilter(e.target.value); setCurrentPage(1); }}
            options={[
              { value: 'ALL', label: 'All Status' },
              { value: 'PENDING_REVIEW', label: 'Pending Review' },
              { value: 'PROCESSING', label: 'Processing' },
              { value: 'APPROVED', label: 'Approved' },
              { value: 'REJECTED', label: 'Rejected' },
              { value: 'FLAGGED', label: 'Flagged' },
              { value: 'EXTRACTION_FAILED', label: 'Extraction Failed' },
            ]}
          />

          <Select
            value={typeFilter}
            onChange={(e) => { setTypeFilter(e.target.value); setCurrentPage(1); }}
            options={[
              { value: 'ALL', label: 'All Types' },
              { value: 'COA', label: 'Certificate of Analysis' },
              { value: 'BUSINESS_LICENSE', label: 'Business License' },
              { value: 'LAB_REPORT', label: 'Lab Report' },
              { value: 'SAFETY_SHEET', label: 'Safety Sheet' },
              { value: 'COMPLIANCE_CERT', label: 'Compliance Cert' },
              { value: 'LICENSE', label: 'License' },
            ]}
          />
        </div>
      </Card>

      {/* Documents Table */}
      {loading ? (
        <SkeletonTable rows={8} cols={7} />
      ) : error ? (
        <ErrorState
          title="Failed to load documents"
          description={error}
          onRetry={fetchDocuments}
        />
      ) : filteredDocs.length === 0 ? (
        <Card>
          <EmptyState
            icon={<FileText className="h-12 w-12" />}
            title="No documents found"
            description={searchQuery || statusFilter !== 'ALL' || typeFilter !== 'ALL'
              ? "Try adjusting your search or filters"
              : "Documents uploaded by merchants will appear here"
            }
          />
        </Card>
      ) : (
        <Card padding="none">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Document</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Organization</TableHead>
                <TableHead>Product</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Uploaded</TableHead>
                <TableHead align="right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredDocs.map((doc) => {
                const status = statusConfig[doc.status] || statusConfig.PENDING_REVIEW;
                const StatusIcon = status.icon;
                const typeClass = typeConfig[doc.documentType] || typeConfig.OTHER;

                return (
                  <TableRow key={doc.id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center flex-shrink-0">
                          <FileText className="h-5 w-5 text-slate-400" />
                        </div>
                        <div className="min-w-0">
                          <Link
                            href={`/documents/${doc.id}`}
                            className="font-medium text-slate-900 dark:text-white hover:text-amber-500 truncate block max-w-[220px]"
                            title={doc.fileName}
                          >
                            {doc.fileName}
                          </Link>
                          {doc.fileSize && (
                            <p className="text-xs text-slate-500">
                              {formatFileSize(doc.fileSize)}
                            </p>
                          )}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className={`px-2.5 py-1 rounded text-xs font-medium ${typeClass}`}>
                        {doc.documentType.replace(/_/g, ' ')}
                      </span>
                    </TableCell>
                    <TableCell>
                      {doc.organizationName ? (
                        <Link
                          href={`/organizations/${doc.organizationId}`}
                          className="flex items-center gap-2 text-slate-700 dark:text-slate-300 hover:text-amber-500 transition-colors"
                        >
                          <Building2 className="h-4 w-4 text-slate-500" />
                          <span className="truncate max-w-[120px]">{doc.organizationName}</span>
                        </Link>
                      ) : (
                        <span className="text-slate-400">—</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {doc.productName ? (
                        <Link
                          href={`/products/${doc.productId}`}
                          className="text-slate-700 dark:text-slate-300 hover:text-amber-500 transition-colors truncate block max-w-[120px]"
                        >
                          {doc.productName}
                        </Link>
                      ) : (
                        <span className="text-slate-400">—</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${status.bg} ${status.text}`}>
                        <StatusIcon className="h-3 w-3" />
                        {doc.status.replace(/_/g, ' ')}
                      </span>
                    </TableCell>
                    <TableCell>
                      <span className="text-slate-500 dark:text-slate-400 text-sm">
                        {formatDate(doc.uploadedAt)}
                      </span>
                    </TableCell>
                    <TableCell align="right">
                      <div className="flex items-center justify-end gap-1">
                        <Link href={`/documents/${doc.id}`}>
                          <Button variant="ghost" size="sm" title="View Details">
                            <Eye className="h-4 w-4" />
                          </Button>
                        </Link>

                        {(doc.status === 'PENDING_REVIEW' || doc.status === 'FLAGGED') && (
                          <>
                            <PermissionGate permission={AdminPermission.DOC_APPROVE}>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleAction(doc, 'approve')}
                                className="text-emerald-400 hover:text-emerald-300 hover:bg-emerald-500/10"
                                title="Approve"
                              >
                                <CheckCircle className="h-4 w-4" />
                              </Button>
                            </PermissionGate>

                            <PermissionGate permission={AdminPermission.DOC_REJECT}>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleAction(doc, 'reject')}
                                className="text-red-400 hover:text-red-300 hover:bg-red-500/10"
                                title="Reject"
                              >
                                <XCircle className="h-4 w-4" />
                              </Button>
                            </PermissionGate>
                          </>
                        )}

                        <Dropdown
                          trigger={
                            <button className="p-1.5 rounded-lg text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-700/50 transition-colors">
                              <MoreVertical className="h-4 w-4" />
                            </button>
                          }
                          align="end"
                        >
                          <DropdownItem icon={<Eye className="h-4 w-4" />}>
                            <Link href={`/documents/${doc.id}`}>View Details</Link>
                          </DropdownItem>
                          <DropdownItem icon={<Download className="h-4 w-4" />}>
                            Download Original
                          </DropdownItem>
                          <DropdownItem icon={<ExternalLink className="h-4 w-4" />}>
                            View in New Tab
                          </DropdownItem>
                          {doc.status === 'PENDING_REVIEW' && (
                            <>
                              <DropdownDivider />
                              <DropdownItem icon={<Flag className="h-4 w-4" />}>
                                <button onClick={() => handleAction(doc, 'flag')}>Flag for Review</button>
                              </DropdownItem>
                            </>
                          )}
                        </Dropdown>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>

          <div className="px-4 py-3 border-t border-slate-200 dark:border-slate-700">
            <Pagination
              currentPage={currentPage}
              totalPages={totalPages}
              totalItems={totalItems}
              itemsPerPage={itemsPerPage}
              onPageChange={setCurrentPage}
            />
          </div>
        </Card>
      )}

      {/* Action Confirmation Modal */}
      <Modal
        isOpen={!!selectedDoc && !!actionType}
        onClose={() => { setSelectedDoc(null); setActionType(null); setReviewNote(''); }}
        title={
          actionType === 'approve' ? 'Approve Document' :
            actionType === 'reject' ? 'Reject Document' :
              'Flag for Review'
        }
        description={
          actionType === 'approve'
            ? `You are about to approve "${selectedDoc?.fileName}".`
            : actionType === 'reject'
              ? `You are about to reject "${selectedDoc?.fileName}". This action will notify the merchant.`
              : `Flag "${selectedDoc?.fileName}" for additional review.`
        }
      >
        <div className="space-y-4 mt-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
              Review Note {actionType === 'reject' && <span className="text-red-400">*</span>}
            </label>
            <Textarea
              value={reviewNote}
              onChange={(e) => setReviewNote(e.target.value)}
              placeholder={
                actionType === 'approve' ? 'Optional: Add a note about this approval...' :
                  actionType === 'reject' ? 'Required: Explain why this document is being rejected...' :
                    'Add notes about what needs to be reviewed...'
              }
              rows={3}
            />
            {actionType === 'reject' && !reviewNote && (
              <p className="text-xs text-amber-500 mt-1">A rejection reason is required</p>
            )}
          </div>

          <div className="flex justify-end gap-3">
            <Button
              variant="secondary"
              onClick={() => { setSelectedDoc(null); setActionType(null); setReviewNote(''); }}
              disabled={actionLoading}
            >
              Cancel
            </Button>
            <Button
              variant={actionType === 'reject' ? 'danger' : 'primary'}
              onClick={executeAction}
              disabled={actionLoading || (actionType === 'reject' && !reviewNote)}
            >
              {actionLoading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Processing...
                </>
              ) : (
                actionType === 'approve' ? 'Approve Document' :
                  actionType === 'reject' ? 'Reject Document' :
                    'Flag for Review'
              )}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
