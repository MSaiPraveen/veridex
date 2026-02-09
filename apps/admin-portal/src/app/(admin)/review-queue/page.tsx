'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  FileText,
  Clock,
  AlertTriangle,
  CheckCircle,
  XCircle,
  ChevronRight,
  Timer,
  User,
  Building2,
  Eye,
  RotateCcw,
  ArrowUpRight,
  Filter,
  SortAsc,
  Calendar,
  Loader2,
  RefreshCw
} from 'lucide-react';
import Link from 'next/link';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { SearchInput, Select } from '@/components/ui/input';
import { Modal } from '@/components/ui/modal';
import { PermissionGate } from '@/components/auth/permission-gate';
import { AdminPermission } from '@/lib/admin-rbac';
import { adminApi } from '@/lib/admin-api';
import { DocumentViewer } from '@/components/ui/document-viewer';

// Types
interface ReviewItem {
  id: string;
  documentId: string;
  documentName: string;
  documentType: string;
  mimeType?: string;
  organizationId: string;
  organizationName: string;
  productName?: string;
  submittedAt: string;
  slaDeadline: string;
  slaStatus: 'ON_TRACK' | 'AT_RISK' | 'BREACHED';
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  autoDecision?: 'PASSED' | 'FAILED' | 'NEEDS_REVIEW';
  failureReasons?: string[];
  assignedTo?: string;
  ocrConfidence?: number;
  extractedData?: Record<string, any>;
  complianceStatus?: string;
  complianceScore?: number;
  complianceReasons?: string[];
}

interface DecisionHistory {
  id: string;
  documentId: string;
  decision: 'APPROVED' | 'REJECTED' | 'ESCALATED';
  decidedBy: string;
  decidedAt: string;
  justification: string;
  timeToDecision: string;
}

// Priority and SLA configs
const priorityConfig: Record<string, { bg: string; text: string; label: string }> = {
  LOW: { bg: 'bg-slate-500/10', text: 'text-slate-400', label: 'Low' },
  MEDIUM: { bg: 'bg-blue-500/10', text: 'text-blue-400', label: 'Medium' },
  HIGH: { bg: 'bg-amber-500/10', text: 'text-amber-400', label: 'High' },
  CRITICAL: { bg: 'bg-red-500/10', text: 'text-red-400', label: 'Critical' },
};

const slaConfig: Record<string, { bg: string; text: string; icon: typeof Clock }> = {
  ON_TRACK: { bg: 'bg-emerald-500/10', text: 'text-emerald-400', icon: Clock },
  AT_RISK: { bg: 'bg-amber-500/10', text: 'text-amber-400', icon: Timer },
  BREACHED: { bg: 'bg-red-500/10', text: 'text-red-400', icon: AlertTriangle },
};

const autoDecisionConfig: Record<string, { bg: string; text: string; label: string }> = {
  PASSED: { bg: 'bg-emerald-500/10', text: 'text-emerald-400', label: 'Auto Passed' },
  FAILED: { bg: 'bg-red-500/10', text: 'text-red-400', label: 'Auto Failed' },
  NEEDS_REVIEW: { bg: 'bg-amber-500/10', text: 'text-amber-400', label: 'Needs Review' },
};

// Transform API data to ReviewItem format
function transformDocToReviewItem(doc: any): ReviewItem {
  // Calculate SLA status based on upload date (48h SLA by default)
  const uploadDate = new Date(doc.uploadedAt || doc.createdAt);
  const slaDeadline = new Date(uploadDate.getTime() + 48 * 60 * 60 * 1000);
  const now = new Date();
  const hoursRemaining = (slaDeadline.getTime() - now.getTime()) / (1000 * 60 * 60);
  
  let slaStatus: 'ON_TRACK' | 'AT_RISK' | 'BREACHED' = 'ON_TRACK';
  if (hoursRemaining < 0) slaStatus = 'BREACHED';
  else if (hoursRemaining < 12) slaStatus = 'AT_RISK';

  // Determine priority based on compliance status
  let priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' = 'MEDIUM';
  if (doc.complianceStatus === 'NON_COMPLIANT') priority = 'HIGH';
  if (slaStatus === 'BREACHED') priority = 'CRITICAL';
  if (doc.complianceStatus === 'COMPLIANT') priority = 'LOW';

  // Determine auto-decision
  let autoDecision: 'PASSED' | 'FAILED' | 'NEEDS_REVIEW' = 'NEEDS_REVIEW';
  if (doc.complianceStatus === 'COMPLIANT') autoDecision = 'PASSED';
  if (doc.complianceStatus === 'NON_COMPLIANT') autoDecision = 'FAILED';

  return {
    id: doc.id || doc._id,
    documentId: doc.id || doc._id,
    documentName: doc.originalName || doc.fileName || 'Document',
    documentType: doc.documentType || doc.type || 'DOCUMENT',
    mimeType: doc.mimeType,
    organizationId: doc.organizationId || '',
    organizationName: doc.organizationName || 'Unknown Organization',
    productName: doc.productName,
    submittedAt: doc.uploadedAt || doc.createdAt,
    slaDeadline: slaDeadline.toISOString(),
    slaStatus,
    priority,
    autoDecision,
    failureReasons: doc.complianceReasons || [],
    ocrConfidence: doc.extractedData?.confidence || 0,
    extractedData: doc.extractedData,
    complianceStatus: doc.complianceStatus,
    complianceScore: doc.complianceScore,
    complianceReasons: doc.complianceReasons,
  };
}

export default function ReviewQueuePage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [priorityFilter, setPriorityFilter] = useState('ALL');
  const [slaFilter, setSlaFilter] = useState('ALL');
  const [selectedItem, setSelectedItem] = useState<ReviewItem | null>(null);
  const [showDecisionModal, setShowDecisionModal] = useState(false);
  const [decisionType, setDecisionType] = useState<'approve' | 'reject' | 'escalate' | null>(null);
  const [justification, setJustification] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Real data state
  const [reviewQueue, setReviewQueue] = useState<ReviewItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [stats, setStats] = useState({
    total: 0,
    pending: 0,
    failed: 0,
    breached: 0,
    atRisk: 0,
  });
  
  // Real data - no mock data
  const decisionHistory: { id: string; decision: string; timeToDecision: string; justification: string; decidedBy: string; decidedAt: string }[] = [];
  
  // Document viewer state
  const [viewingDocument, setViewingDocument] = useState<ReviewItem | null>(null);

  // Fetch review queue from API
  const fetchReviewQueue = useCallback(async () => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await adminApi.get<any>('/admin/review?status=PENDING_REVIEW&limit=50');
      
      if (response.success && response.data) {
        const documents = response.data.documents || response.data.data || [];
        const transformedDocs = documents.map(transformDocToReviewItem);
        setReviewQueue(transformedDocs);
        
        // Calculate stats
        setStats({
          total: transformedDocs.length,
          pending: transformedDocs.filter((i: ReviewItem) => i.autoDecision === 'NEEDS_REVIEW').length,
          failed: transformedDocs.filter((i: ReviewItem) => i.autoDecision === 'FAILED').length,
          breached: transformedDocs.filter((i: ReviewItem) => i.slaStatus === 'BREACHED').length,
          atRisk: transformedDocs.filter((i: ReviewItem) => i.slaStatus === 'AT_RISK').length,
        });
      } else {
        setError('Failed to load review queue');
        setReviewQueue([]);
      }
    } catch (err) {
      console.error('Error fetching review queue:', err);
      setError('Failed to load review queue');
      setReviewQueue([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchReviewQueue();
  }, [fetchReviewQueue]);

  // Filter the queue
  const filteredQueue = reviewQueue.filter(item => {
    if (priorityFilter !== 'ALL' && item.priority !== priorityFilter) return false;
    if (slaFilter !== 'ALL' && item.slaStatus !== slaFilter) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      return item.documentName.toLowerCase().includes(q) ||
        item.organizationName.toLowerCase().includes(q);
    }
    return true;
  });

  const handleDecision = async () => {
    if (!justification.trim() || !selectedItem) return;
    setIsSubmitting(true);
    
    try {
      const decision = decisionType === 'approve' ? 'APPROVE' : decisionType === 'reject' ? 'REJECT' : 'FLAG';
      
      await adminApi.post(`/admin/review/${selectedItem.documentId}/decision`, {
        decision,
        reviewNote: justification,
      });
      
      // Refresh the queue after decision
      await fetchReviewQueue();
      
      setShowDecisionModal(false);
      setSelectedItem(null);
      setJustification('');
      setDecisionType(null);
    } catch (err) {
      console.error('Failed to submit decision:', err);
      alert('Failed to submit decision. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const openDecisionModal = (item: ReviewItem, type: 'approve' | 'reject' | 'escalate') => {
    setSelectedItem(item);
    setDecisionType(type);
    setShowDecisionModal(true);
  };

  const getTimeRemaining = (deadline: string) => {
    const diff = new Date(deadline).getTime() - new Date().getTime();
    if (diff < 0) return 'Overdue';
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    if (hours > 24) return `${Math.floor(hours / 24)}d ${hours % 24}h`;
    return `${hours}h ${minutes}m`;
  };

  return (
    <div className="space-y-6">
      {/* Document Viewer Modal */}
      {viewingDocument && (
        <DocumentViewer
          document={{
            id: viewingDocument.documentId,
            name: viewingDocument.documentName,
            type: viewingDocument.documentType,
            mimeType: viewingDocument.mimeType,
          }}
          onClose={() => setViewingDocument(null)}
        />
      )}
      
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Review Queue</h1>
          <p className="text-slate-600 dark:text-slate-400 mt-1">
            Documents requiring manual review and decision
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="secondary" onClick={fetchReviewQueue} disabled={loading}>
            {loading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <RefreshCw className="h-4 w-4 mr-2" />}
            Refresh
          </Button>
          <Button variant="secondary">
            <Filter className="h-4 w-4 mr-2" />
            Advanced Filters
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        <div className="bg-white dark:bg-slate-900 rounded-xl p-4 border border-slate-200 dark:border-slate-700 shadow-sm">
          <p className="text-sm text-slate-600 dark:text-slate-400">Total in Queue</p>
          <p className="text-3xl font-bold text-slate-900 dark:text-white mt-1">{stats.total}</p>
        </div>
        <div className="bg-white dark:bg-slate-900 rounded-xl p-4 border border-slate-200 dark:border-slate-700 shadow-sm">
          <p className="text-sm text-slate-600 dark:text-slate-400">Needs Review</p>
          <p className="text-3xl font-bold text-amber-500 dark:text-amber-400 mt-1">{stats.pending}</p>
        </div>
        <div className="bg-white dark:bg-slate-900 rounded-xl p-4 border border-slate-200 dark:border-slate-700 shadow-sm">
          <p className="text-sm text-slate-600 dark:text-slate-400">Auto Failed</p>
          <p className="text-3xl font-bold text-red-500 dark:text-red-400 mt-1">{stats.failed}</p>
        </div>
        <div className="bg-white dark:bg-slate-900 rounded-xl p-4 border border-slate-200 dark:border-slate-700 shadow-sm">
          <p className="text-sm text-slate-600 dark:text-slate-400">SLA Breached</p>
          <p className="text-3xl font-bold text-red-500 dark:text-red-400 mt-1">{stats.breached}</p>
        </div>
        <div className="bg-white dark:bg-slate-900 rounded-xl p-4 border border-slate-200 dark:border-slate-700 shadow-sm">
          <p className="text-sm text-slate-600 dark:text-slate-400">At Risk</p>
          <p className="text-3xl font-bold text-amber-500 dark:text-amber-400 mt-1">{stats.atRisk}</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <SearchInput
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search documents or organizations..."
          className="flex-1"
        />
        <Select
          value={priorityFilter}
          onChange={(e) => setPriorityFilter(e.target.value)}
          options={[
            { value: 'ALL', label: 'All Priorities' },
            { value: 'CRITICAL', label: 'Critical' },
            { value: 'HIGH', label: 'High' },
            { value: 'MEDIUM', label: 'Medium' },
            { value: 'LOW', label: 'Low' }
          ]}
        />
        <Select
          value={slaFilter}
          onChange={(e) => setSlaFilter(e.target.value)}
          options={[
            { value: 'ALL', label: 'All SLA Status' },
            { value: 'BREACHED', label: 'SLA Breached' },
            { value: 'AT_RISK', label: 'At Risk' },
            { value: 'ON_TRACK', label: 'On Track' }
          ]}
        />
      </div>

      {/* Two Column Layout */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Review Queue */}
        <div className="xl:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Pending Reviews ({filteredQueue.length})</h2>
            <Button variant="ghost" size="sm">
              <SortAsc className="h-4 w-4 mr-2" />
              Sort by Priority
            </Button>
          </div>

          {/* Loading State */}
          {loading && (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-amber-500" />
              <span className="ml-2 text-slate-600 dark:text-slate-400">Loading review queue...</span>
            </div>
          )}

          {/* Error State */}
          {error && !loading && (
            <div className="text-center py-12">
              <AlertTriangle className="h-12 w-12 text-red-500 mx-auto mb-4" />
              <p className="text-red-500 font-medium">{error}</p>
              <Button onClick={fetchReviewQueue} className="mt-4">
                Try Again
              </Button>
            </div>
          )}

          {/* Empty State */}
          {!loading && !error && filteredQueue.length === 0 && (
            <div className="text-center py-12 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700">
              <CheckCircle className="h-12 w-12 text-emerald-500 mx-auto mb-4" />
              <p className="text-slate-600 dark:text-slate-400 font-medium">All caught up!</p>
              <p className="text-sm text-slate-500 mt-1">No documents pending review</p>
            </div>
          )}

          {/* Review Items */}
          {!loading && !error && filteredQueue.map((item) => {
            const priorityConf = priorityConfig[item.priority];
            const slaConf = slaConfig[item.slaStatus];
            const autoConf = item.autoDecision ? autoDecisionConfig[item.autoDecision] : null;
            const SlaIcon = slaConf.icon;

            return (
              <Card key={item.id} className="hover:border-amber-500/30 transition-all">
                <CardContent className="p-5">
                  <div className="flex items-start justify-between gap-4">
                    {/* Main Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-3 mb-2">
                        <span className={`px-2 py-0.5 rounded text-xs font-medium ${priorityConf.bg} ${priorityConf.text}`}>
                          {priorityConf.label}
                        </span>
                        {autoConf && (
                          <span className={`px-2 py-0.5 rounded text-xs font-medium ${autoConf.bg} ${autoConf.text}`}>
                            {autoConf.label}
                          </span>
                        )}
                        <span className={`flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium ${slaConf.bg} ${slaConf.text}`}>
                          <SlaIcon className="h-3 w-3" />
                          {getTimeRemaining(item.slaDeadline)}
                        </span>
                      </div>

                      <h3 className="font-medium text-slate-900 dark:text-white truncate">{item.documentName}</h3>

                      <div className="flex items-center gap-4 mt-2 text-sm text-slate-600 dark:text-slate-400">
                        <span className="flex items-center gap-1">
                          <Building2 className="h-3.5 w-3.5" />
                          {item.organizationName}
                        </span>
                        {item.productName && (
                          <span className="truncate">• {item.productName}</span>
                        )}
                      </div>

                      {/* Failure Reasons */}
                      {item.failureReasons && item.failureReasons.length > 0 && (
                        <div className="mt-3 p-3 bg-red-500/10 rounded-lg border border-red-500/20">
                          <p className="text-xs font-medium text-red-400 mb-1">Failure Reasons:</p>
                          <ul className="text-xs text-slate-700 dark:text-slate-300 space-y-0.5">
                            {item.failureReasons.map((reason, i) => (
                              <li key={i} className="flex items-start gap-2">
                                <XCircle className="h-3 w-3 text-red-400 mt-0.5 flex-shrink-0" />
                                {reason}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {/* OCR Confidence */}
                      {item.ocrConfidence && (
                        <div className="mt-3 flex items-center gap-2">
                          <span className="text-xs text-slate-500 dark:text-slate-500">OCR Confidence:</span>
                          <div className="flex-1 max-w-32 h-1.5 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                            <div
                              className={`h-full rounded-full ${item.ocrConfidence >= 90 ? 'bg-emerald-500' :
                                item.ocrConfidence >= 70 ? 'bg-amber-500' : 'bg-red-500'
                                }`}
                              style={{ width: `${item.ocrConfidence}%` }}
                            />
                          </div>
                          <span className={`text-xs font-medium ${item.ocrConfidence >= 90 ? 'text-emerald-400' :
                            item.ocrConfidence >= 70 ? 'text-amber-400' : 'text-red-400'
                            }`}>
                            {item.ocrConfidence}%
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Actions */}
                    <div className="flex flex-col gap-2">
                      <Button 
                        variant="secondary" 
                        size="sm" 
                        className="w-full"
                        onClick={() => setViewingDocument(item)}
                      >
                        <Eye className="h-4 w-4 mr-1" />
                        View
                      </Button>
                      <PermissionGate permission={AdminPermission.DOC_APPROVE}>
                        <Button
                          variant="primary"
                          size="sm"
                          className="w-full"
                          onClick={() => openDecisionModal(item, 'approve')}
                        >
                          <CheckCircle className="h-4 w-4 mr-1" />
                          Approve
                        </Button>
                      </PermissionGate>
                      <PermissionGate permission={AdminPermission.DOC_REJECT}>
                        <Button
                          variant="danger"
                          size="sm"
                          className="w-full"
                          onClick={() => openDecisionModal(item, 'reject')}
                        >
                          <XCircle className="h-4 w-4 mr-1" />
                          Reject
                        </Button>
                      </PermissionGate>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="w-full"
                        onClick={() => openDecisionModal(item, 'escalate')}
                      >
                        <ArrowUpRight className="h-4 w-4 mr-1" />
                        Escalate
                      </Button>
                    </div>
                  </div>

                  {/* Extracted Fields Preview */}
                  {item.extractedFields && (
                    <div className="mt-4 pt-4 border-t border-slate-200 dark:border-slate-700/50">
                      <p className="text-xs font-medium text-slate-500 dark:text-slate-500 mb-2">EXTRACTED FIELDS</p>
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                        {Object.entries(item.extractedFields).slice(0, 6).map(([key, data]) => (
                          <div key={key} className="bg-slate-50 dark:bg-slate-800 rounded-lg p-2">
                            <p className="text-xs text-slate-500 dark:text-slate-500">{key}</p>
                            <p className={`text-sm font-medium truncate ${data.confidence >= 80 ? 'text-slate-900 dark:text-white' :
                              data.confidence >= 50 ? 'text-amber-600 dark:text-amber-400' : 'text-red-600 dark:text-red-400'
                              }`}>
                              {data.value}
                            </p>
                            <p className="text-[10px] text-slate-500 dark:text-slate-500">{data.confidence}% confidence</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}

          {filteredQueue.length === 0 && (
            <div className="text-center py-12">
              <CheckCircle className="h-12 w-12 text-emerald-500 dark:text-emerald-400 mx-auto mb-3" />
              <h3 className="text-lg font-medium text-slate-900 dark:text-white">Queue Empty</h3>
              <p className="text-slate-600 dark:text-slate-400 mt-1">All documents have been reviewed</p>
            </div>
          )}
        </div>

        {/* Decision History Sidebar */}
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Recent Decisions</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {decisionHistory.length === 0 ? (
                  <p className="text-sm text-slate-500 dark:text-slate-400 text-center py-4">No recent decisions</p>
                ) : decisionHistory.map((decision) => (
                  <div key={decision.id} className="border-b border-slate-200 dark:border-slate-700/50 pb-4 last:border-0 last:pb-0">
                    <div className="flex items-center justify-between mb-2">
                      <span className={`px-2 py-0.5 rounded text-xs font-medium ${decision.decision === 'APPROVED' ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400' :
                        decision.decision === 'REJECTED' ? 'bg-red-500/10 text-red-600 dark:text-red-400' :
                          'bg-amber-500/10 text-amber-600 dark:text-amber-400'
                        }`}>
                        {decision.decision}
                      </span>
                      <span className="text-xs text-slate-500 dark:text-slate-500">{decision.timeToDecision}</span>
                    </div>
                    <p className="text-sm text-slate-700 dark:text-slate-300 mb-2">{decision.justification}</p>
                    <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-500">
                      <User className="h-3 w-3" />
                      <span>{decision.decidedBy}</span>
                      <span>•</span>
                      <span>{new Date(decision.decidedAt).toLocaleDateString()}</span>
                    </div>
                  </div>
                ))}
              </div>
              <Link href="/audit-logs?type=DECISION" className="block mt-4 text-center text-sm text-amber-400 hover:text-amber-300">
                View All Decisions →
              </Link>
            </CardContent>
          </Card>

          {/* Quick Stats */}
          <Card>
            <CardHeader>
              <CardTitle>Performance Metrics</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-slate-600 dark:text-slate-400">Avg. Time to Decision</span>
                    <span className="text-slate-900 dark:text-white font-medium">2.8h</span>
                  </div>
                  <div className="h-2 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                    <div className="h-full w-3/4 bg-emerald-500 rounded-full" />
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-500 mt-1">Target: 4h</p>
                </div>
                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-slate-600 dark:text-slate-400">SLA Compliance</span>
                    <span className="text-slate-900 dark:text-white font-medium">94%</span>
                  </div>
                  <div className="h-2 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                    <div className="h-full w-[94%] bg-amber-500 rounded-full" />
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-500 mt-1">Target: 98%</p>
                </div>
                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-slate-600 dark:text-slate-400">Override Rate</span>
                    <span className="text-slate-900 dark:text-white font-medium">8%</span>
                  </div>
                  <div className="h-2 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                    <div className="h-full w-[8%] bg-blue-500 rounded-full" />
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-500 mt-1">Below threshold</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Decision Modal */}
      <Modal
        isOpen={showDecisionModal}
        onClose={() => {
          setShowDecisionModal(false);
          setJustification('');
        }}
        title={
          decisionType === 'approve' ? 'Approve Document' :
            decisionType === 'reject' ? 'Reject Document' :
              'Escalate Document'
        }
        description="This action will be logged in the audit trail."
      >
        <div className="space-y-4">
          {selectedItem && (
            <div className="p-4 bg-slate-50 dark:bg-slate-800 rounded-lg">
              <p className="text-sm text-slate-600 dark:text-slate-400 mb-1">Document</p>
              <p className="font-medium text-slate-900 dark:text-white">{selectedItem.documentName}</p>
              <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">{selectedItem.organizationName}</p>
            </div>
          )}

          {decisionType === 'approve' && selectedItem?.autoDecision === 'FAILED' && (
            <div className="p-4 bg-amber-500/10 rounded-lg border border-amber-500/20">
              <div className="flex items-start gap-3">
                <AlertTriangle className="h-5 w-5 text-amber-400 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-amber-400">Override Warning</p>
                  <p className="text-sm text-slate-700 dark:text-slate-300 mt-1">
                    This document was auto-rejected. Approving requires detailed justification and will be flagged for audit review.
                  </p>
                </div>
              </div>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
              Justification <span className="text-red-400">*</span>
            </label>
            <textarea
              value={justification}
              onChange={(e) => setJustification(e.target.value)}
              placeholder={
                decisionType === 'approve' ? 'Explain why this document meets compliance requirements...' :
                  decisionType === 'reject' ? 'Explain why this document is being rejected...' :
                    'Explain why this needs to be escalated...'
              }
              className="w-full px-4 py-3 bg-white dark:bg-slate-700/50 border border-slate-300 dark:border-slate-600 rounded-lg text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-500/50 focus:border-amber-500/50 resize-none"
              rows={4}
            />
            <p className="text-xs text-slate-500 mt-1">
              Minimum 20 characters. This will be permanently recorded.
            </p>
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <Button
              variant="secondary"
              onClick={() => {
                setShowDecisionModal(false);
                setJustification('');
              }}
            >
              Cancel
            </Button>
            <Button
              variant={decisionType === 'reject' ? 'danger' : 'primary'}
              onClick={handleDecision}
              disabled={justification.trim().length < 20 || isSubmitting}
            >
              {isSubmitting ? 'Submitting...' :
                decisionType === 'approve' ? 'Confirm Approval' :
                  decisionType === 'reject' ? 'Confirm Rejection' :
                    'Confirm Escalation'}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
