'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  ShieldCheck,
  Clock,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Eye,
  FileText,
  Building2,
  Package,
  Search,
  AlertCircle,
  Loader2,
  RefreshCw
} from 'lucide-react';
import { PermissionGate, useAdminPermissions } from '@/components/auth/permission-gate';
import { AdminPermission } from '@/lib/admin-rbac';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { SearchInput } from '@/components/ui/input';
import { Modal } from '@/components/ui/modal';
import { EmptyState } from '@/components/ui/empty-state';
import { adminApi } from '@/lib/admin-api';
import { DocumentViewer } from '@/components/ui/document-viewer';

// Types
interface ComplianceItem {
  id: string;
  entityType: 'DOCUMENT' | 'PRODUCT' | 'BATCH' | 'ORGANIZATION';
  entityName: string;
  organizationName: string;
  organizationId?: string;
  documentId?: string;
  mimeType?: string;
  status: 'PENDING' | 'AUTO_FAILED' | 'NEEDS_REVIEW' | 'APPROVED' | 'REJECTED';
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  failureReason?: string;
  ruleId?: string;
  ruleName?: string;
  assignedTo?: string;
  createdAt: string;
  dueDate?: string;
}

type StatusFilter = 'ALL' | 'PENDING' | 'AUTO_FAILED' | 'NEEDS_REVIEW';
type SeverityFilter = 'ALL' | 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

const statusConfig: Record<string, { color: string; bgColor: string; icon: typeof AlertTriangle }> = {
  PENDING: { color: 'text-amber-400', bgColor: 'bg-amber-500/10', icon: Clock },
  AUTO_FAILED: { color: 'text-red-400', bgColor: 'bg-red-500/10', icon: AlertCircle },
  NEEDS_REVIEW: { color: 'text-orange-400', bgColor: 'bg-orange-500/10', icon: AlertTriangle },
  APPROVED: { color: 'text-emerald-400', bgColor: 'bg-emerald-500/10', icon: CheckCircle },
  REJECTED: { color: 'text-slate-400', bgColor: 'bg-slate-500/10', icon: XCircle },
};

const severityConfig: Record<string, { color: string; bgColor: string }> = {
  LOW: { color: 'text-sky-400', bgColor: 'bg-sky-500/10' },
  MEDIUM: { color: 'text-amber-400', bgColor: 'bg-amber-500/10' },
  HIGH: { color: 'text-orange-400', bgColor: 'bg-orange-500/10' },
  CRITICAL: { color: 'text-red-400', bgColor: 'bg-red-500/10' },
};

const entityIcons: Record<string, typeof FileText> = {
  DOCUMENT: FileText,
  PRODUCT: Package,
  BATCH: Package,
  ORGANIZATION: Building2,
};

// Transform API data to ComplianceItem format
function transformToComplianceItem(doc: any): ComplianceItem {
  // Determine status based on compliance status
  let status: ComplianceItem['status'] = 'PENDING';
  if (doc.complianceStatus === 'COMPLIANT') status = 'APPROVED';
  else if (doc.complianceStatus === 'NON_COMPLIANT') status = 'AUTO_FAILED';
  else if (doc.reviewStatus === 'APPROVED') status = 'APPROVED';
  else if (doc.reviewStatus === 'REJECTED') status = 'REJECTED';
  else if (doc.complianceReasons?.length > 0) status = 'NEEDS_REVIEW';

  // Determine severity
  let severity: ComplianceItem['severity'] = 'MEDIUM';
  if (doc.complianceScore !== undefined) {
    if (doc.complianceScore < 50) severity = 'CRITICAL';
    else if (doc.complianceScore < 70) severity = 'HIGH';
    else if (doc.complianceScore < 90) severity = 'MEDIUM';
    else severity = 'LOW';
  } else if (doc.complianceStatus === 'NON_COMPLIANT') {
    severity = 'HIGH';
  }

  // Get first failure reason as rule
  const failureReason = doc.complianceReasons?.[0] || doc.failureReason;
  const ruleId = doc.ruleViolations?.[0]?.ruleId;
  const ruleName = doc.ruleViolations?.[0]?.ruleName;

  return {
    id: doc.id || doc._id,
    documentId: doc.id || doc._id,
    entityType: 'DOCUMENT',
    entityName: doc.originalName || doc.fileName || 'Document',
    organizationName: doc.organizationName || 'Unknown Organization',
    organizationId: doc.organizationId,
    mimeType: doc.mimeType,
    status,
    severity,
    failureReason,
    ruleId,
    ruleName,
    createdAt: doc.uploadedAt || doc.createdAt,
    dueDate: doc.dueDate,
  };
}

export default function ComplianceQueuePage() {
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('ALL');
  const [severityFilter, setSeverityFilter] = useState<SeverityFilter>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedItem, setSelectedItem] = useState<ComplianceItem | null>(null);
  const [showDecisionModal, setShowDecisionModal] = useState(false);
  const [decisionType, setDecisionType] = useState<'approve' | 'reject' | null>(null);

  const permissions = useAdminPermissions();
  
  // Real data state
  const [complianceQueue, setComplianceQueue] = useState<ComplianceItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [stats, setStats] = useState({
    total: 0,
    pending: 0,
    autoFailed: 0,
    needsReview: 0,
    critical: 0,
  });
  
  // Document viewer state
  const [viewingDocument, setViewingDocument] = useState<ComplianceItem | null>(null);

  // Fetch compliance queue from API
  const fetchComplianceQueue = useCallback(async () => {
    setLoading(true);
    setError(null);
    
    try {
      // Use admin review endpoint which has documents with compliance data
      const response = await adminApi.get<any>('/admin/review?limit=50');
      
      if (response.success && response.data) {
        const documents = response.data.documents || response.data.data || [];
        const transformedDocs = documents.map(transformToComplianceItem);
        setComplianceQueue(transformedDocs);
        
        // Calculate stats
        setStats({
          total: transformedDocs.length,
          pending: transformedDocs.filter((i: ComplianceItem) => i.status === 'PENDING').length,
          autoFailed: transformedDocs.filter((i: ComplianceItem) => i.status === 'AUTO_FAILED').length,
          needsReview: transformedDocs.filter((i: ComplianceItem) => i.status === 'NEEDS_REVIEW').length,
          critical: transformedDocs.filter((i: ComplianceItem) => i.severity === 'CRITICAL').length,
        });
      } else {
        setError('Failed to load compliance queue');
        setComplianceQueue([]);
      }
    } catch (err) {
      console.error('Error fetching compliance queue:', err);
      setError('Failed to load compliance queue');
      setComplianceQueue([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchComplianceQueue();
  }, [fetchComplianceQueue]);

  const filteredQueue = complianceQueue.filter(item => {
    if (statusFilter !== 'ALL' && item.status !== statusFilter) return false;
    if (severityFilter !== 'ALL' && item.severity !== severityFilter) return false;
    if (searchQuery && !item.entityName.toLowerCase().includes(searchQuery.toLowerCase())) return false;
    return true;
  });

  const handleDecision = (item: ComplianceItem, type: 'approve' | 'reject') => {
    setSelectedItem(item);
    setDecisionType(type);
    setShowDecisionModal(true);
  };

  const executeDecision = async () => {
    if (!selectedItem) return;
    
    try {
      const decision = decisionType === 'approve' ? 'APPROVE' : 'REJECT';
      await adminApi.post(`/admin/review/${selectedItem.documentId}/decision`, {
        decision,
        reviewNote: `${decision === 'APPROVE' ? 'Approved' : 'Rejected'} via compliance queue`,
      });
      
      // Refresh the queue
      await fetchComplianceQueue();
      setShowDecisionModal(false);
      setSelectedItem(null);
      setDecisionType(null);
    } catch (err) {
      console.error('Failed to submit decision:', err);
      alert('Failed to submit decision. Please try again.');
    }
  };

  return (
    <div className="space-y-6">
      {/* Document Viewer Modal */}
      {viewingDocument && (
        <DocumentViewer
          document={{
            id: viewingDocument.documentId || viewingDocument.id,
            name: viewingDocument.entityName,
            type: viewingDocument.entityType,
            mimeType: viewingDocument.mimeType,
          }}
          onClose={() => setViewingDocument(null)}
        />
      )}
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Compliance Queue</h1>
          <p className="text-slate-600 dark:text-slate-400 mt-1">
            Review and process compliance verification items
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="secondary" onClick={fetchComplianceQueue} disabled={loading}>
            {loading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <RefreshCw className="h-4 w-4 mr-2" />}
            Refresh
          </Button>
          <Badge variant="warning" size="md">{stats.total} items</Badge>
          {stats.critical > 0 && (
            <Badge variant="danger" size="md">{stats.critical} critical</Badge>
          )}
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <Card className="p-4 border-l-4 border-amber-500">
          <p className="text-sm text-slate-600 dark:text-slate-400">Total Queue</p>
          <p className="text-2xl font-bold text-slate-900 dark:text-white">{stats.total}</p>
        </Card>
        <Card className="p-4 border-l-4 border-yellow-500">
          <p className="text-sm text-slate-600 dark:text-slate-400">Pending</p>
          <p className="text-2xl font-bold text-amber-600 dark:text-amber-400">{stats.pending}</p>
        </Card>
        <Card className="p-4 border-l-4 border-red-500">
          <p className="text-sm text-slate-600 dark:text-slate-400">Auto Failed</p>
          <p className="text-2xl font-bold text-red-600 dark:text-red-400">{stats.autoFailed}</p>
        </Card>
        <Card className="p-4 border-l-4 border-orange-500">
          <p className="text-sm text-slate-600 dark:text-slate-400">Needs Review</p>
          <p className="text-2xl font-bold text-orange-600 dark:text-orange-400">{stats.needsReview}</p>
        </Card>
        <Card className="p-4 border-l-4 border-purple-500">
          <p className="text-sm text-slate-600 dark:text-slate-400">Critical</p>
          <p className="text-2xl font-bold text-purple-600 dark:text-purple-400">{stats.critical}</p>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <SearchInput
                placeholder="Search queue..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>

            <div className="flex gap-2">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
                className="px-3 py-2.5 rounded-lg appearance-none bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-500/50 focus:border-amber-500 transition-all"
              >
                <option value="ALL">All Status</option>
                <option value="PENDING">Pending</option>
                <option value="AUTO_FAILED">Auto Failed</option>
                <option value="NEEDS_REVIEW">Needs Review</option>
              </select>

              <select
                value={severityFilter}
                onChange={(e) => setSeverityFilter(e.target.value as SeverityFilter)}
                className="px-3 py-2.5 rounded-lg appearance-none bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-500/50 focus:border-amber-500 transition-all"
              >
                <option value="ALL">All Severity</option>
                <option value="CRITICAL">Critical</option>
                <option value="HIGH">High</option>
                <option value="MEDIUM">Medium</option>
                <option value="LOW">Low</option>
              </select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Queue Items */}
      <div className="space-y-4">
        {/* Loading State */}
        {loading && (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-amber-500" />
            <span className="ml-2 text-slate-600 dark:text-slate-400">Loading compliance queue...</span>
          </div>
        )}

        {/* Error State */}
        {error && !loading && (
          <div className="text-center py-12">
            <AlertTriangle className="h-12 w-12 text-red-500 mx-auto mb-4" />
            <p className="text-red-500 font-medium">{error}</p>
            <Button onClick={fetchComplianceQueue} className="mt-4">
              Try Again
            </Button>
          </div>
        )}

        {/* Empty State */}
        {!loading && !error && filteredQueue.length === 0 && (
          <div className="text-center py-12 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700">
            <CheckCircle className="h-12 w-12 text-emerald-500 mx-auto mb-4" />
            <p className="text-slate-600 dark:text-slate-400 font-medium">All clear!</p>
            <p className="text-sm text-slate-500 mt-1">No compliance items pending</p>
          </div>
        )}

        {/* Compliance Items */}
        {!loading && !error && filteredQueue.map((item) => {
          const StatusIcon = statusConfig[item.status].icon;
          const EntityIcon = entityIcons[item.entityType];

          return (
            <Card key={item.id} className="hover:border-slate-600 transition-all">
              <CardContent className="p-5">
                <div className="flex items-start gap-4">
                  {/* Entity Icon */}
                  <div className="h-12 w-12 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center flex-shrink-0">
                    <EntityIcon className="h-6 w-6 text-slate-500 dark:text-slate-400" />
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <h3 className="font-medium text-slate-900 dark:text-white">
                          {item.entityName}
                        </h3>
                        <p className="text-sm text-slate-600 dark:text-slate-400">
                          {item.organizationName} • {item.entityType}
                        </p>
                      </div>

                      <div className="flex items-center gap-2">
                        {/* Severity Badge */}
                        <span className={`px-2 py-1 rounded-md text-xs font-medium ${severityConfig[item.severity].bgColor} ${severityConfig[item.severity].color}`}>
                          {item.severity}
                        </span>

                        {/* Status Badge */}
                        <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium ${statusConfig[item.status].bgColor} ${statusConfig[item.status].color}`}>
                          <StatusIcon className="h-3 w-3" />
                          {item.status.replace('_', ' ')}
                        </span>
                      </div>
                    </div>

                    {/* Failure Reason */}
                    {item.failureReason && (
                      <div className="mt-3 p-3 bg-red-500/10 border border-red-500/20 rounded-lg">
                        <div className="flex items-start gap-2">
                          <AlertTriangle className="h-4 w-4 text-red-400 mt-0.5 flex-shrink-0" />
                          <div>
                            <p className="text-sm text-red-300">
                              {item.failureReason}
                            </p>
                            {item.ruleName && (
                              <p className="text-xs text-red-400/80 mt-1">
                                Rule: {item.ruleName} ({item.ruleId})
                              </p>
                            )}
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Actions */}
                    <div className="mt-4 flex items-center justify-between">
                      <div className="flex items-center gap-2 text-sm text-slate-500">
                        <Clock className="h-4 w-4" />
                        <span>
                          Submitted {new Date(item.createdAt).toLocaleDateString()}
                        </span>
                        {item.dueDate && (
                          <>
                            <span>•</span>
                            <span className="text-amber-400">
                              Due {new Date(item.dueDate).toLocaleDateString()}
                            </span>
                          </>
                        )}
                      </div>

                      <div className="flex items-center gap-2">
                        <Button 
                          variant="secondary" 
                          size="sm"
                          onClick={() => setViewingDocument(item)}
                        >
                          <Eye className="h-4 w-4 mr-1" />
                          View
                        </Button>

                        <PermissionGate permission={AdminPermission.COMPLIANCE_APPROVE}>
                          <Button
                            variant="success"
                            size="sm"
                            onClick={() => handleDecision(item, 'approve')}
                          >
                            <CheckCircle className="h-4 w-4 mr-1" />
                            Approve
                          </Button>
                        </PermissionGate>

                        <PermissionGate permission={AdminPermission.COMPLIANCE_REJECT}>
                          <Button
                            variant="danger"
                            size="sm"
                            onClick={() => handleDecision(item, 'reject')}
                          >
                            <XCircle className="h-4 w-4 mr-1" />
                            Reject
                          </Button>
                        </PermissionGate>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}

        {filteredQueue.length === 0 && (
          <Card>
            <CardContent className="p-8">
              <EmptyState
                icon={<ShieldCheck className="h-8 w-8 text-emerald-400" />}
                title="Queue is empty"
                description="No items matching your filters"
              />
            </CardContent>
          </Card>
        )}
      </div>

      {/* Decision Modal */}
      <Modal
        isOpen={showDecisionModal}
        onClose={() => {
          setShowDecisionModal(false);
          setSelectedItem(null);
          setDecisionType(null);
        }}
        title={decisionType === 'approve' ? 'Approve Compliance Check' : 'Reject Compliance Check'}
      >
        <div className="space-y-4">
          <p className="text-slate-700 dark:text-slate-300">
            {decisionType === 'approve'
              ? `Are you sure you want to approve "${selectedItem?.entityName}"?`
              : `Are you sure you want to reject "${selectedItem?.entityName}"?`}
          </p>

          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
              Reason Code
            </label>
            <select className="w-full px-3 py-2.5 rounded-lg bg-white dark:bg-slate-900/50 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white">
              <option value="">Select a reason...</option>
              {decisionType === 'approve' ? (
                <>
                  <option value="MEETS_REQUIREMENTS">Meets all requirements</option>
                  <option value="MANUAL_VERIFICATION">Manual verification passed</option>
                  <option value="EXCEPTION_GRANTED">Exception granted</option>
                </>
              ) : (
                <>
                  <option value="MISSING_DOCUMENTATION">Missing documentation</option>
                  <option value="FAILED_REQUIREMENTS">Failed requirements</option>
                  <option value="INVALID_DATA">Invalid data</option>
                  <option value="EXPIRED_CERTIFICATE">Expired certificate</option>
                </>
              )}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
              Notes
            </label>
            <textarea
              rows={3}
              className="w-full px-3 py-2.5 rounded-lg bg-white dark:bg-slate-900/50 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500"
              placeholder="Add notes for the audit trail..."
            />
          </div>

          <div className="p-3 bg-slate-100 dark:bg-slate-800 rounded-lg">
            <p className="text-xs text-slate-600 dark:text-slate-400">
              This decision will be recorded in the audit log with your admin ID, timestamp, and reason.
            </p>
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <Button
              variant="secondary"
              onClick={() => {
                setShowDecisionModal(false);
                setSelectedItem(null);
                setDecisionType(null);
              }}
            >
              Cancel
            </Button>
            <Button
              variant={decisionType === 'approve' ? 'success' : 'danger'}
              onClick={executeDecision}
            >
              {decisionType === 'approve' ? 'Approve' : 'Reject'}
            </Button>
          </div>
        </div>
      </Modal>
    </div>

  );
}
