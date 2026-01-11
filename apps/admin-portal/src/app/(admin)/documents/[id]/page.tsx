'use client';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { 
  ArrowLeft, 
  FileText, 
  Download, 
  Eye, 
  CheckCircle, 
  XCircle,
  Clock,
  AlertTriangle,
  Building2,
  RotateCcw,
  Lock,
  Unlock,
  History,
  ZoomIn,
  ZoomOut,
  ChevronLeft,
  ChevronRight,
  Copy,
  ExternalLink,
  Shield,
  Package,
  Calendar,
  User,
  Target,
  Gauge
} from 'lucide-react';
import Link from 'next/link';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Modal } from '@/components/ui/modal';
import { Textarea } from '@/components/ui/input';
import { PermissionGate } from '@/components/auth/permission-gate';
import { AdminPermission } from '@/lib/admin-rbac';

// Mock document data
const mockDocument = {
  id: 'doc-001',
  name: 'Lab Report - Batch #2024-Q4-142.pdf',
  type: 'LAB_REPORT',
  status: 'PENDING_REVIEW',
  mimeType: 'application/pdf',
  fileSize: 2450000,
  uploadedAt: '2026-01-02T10:30:00Z',
  uploadedBy: 'owner@greenleaflabs.com',
  organization: {
    id: 'org-001',
    name: 'GreenLeaf Labs',
  },
  product: {
    id: 'prod-001',
    name: 'Full Spectrum CBD Oil 1000mg',
    sku: 'CBD-FS-1000',
  },
  batch: {
    id: 'batch-001',
    number: '2024-Q4-142',
  },
  ocrResult: {
    confidence: 94.2,
    processingTime: '3.2s',
    processedAt: '2026-01-02T10:30:45Z',
    engine: 'Veridex OCR v2.3',
    pageCount: 3,
    extractedFields: [
      { field: 'THC Content', value: '0.45%', confidence: 98, status: 'FAILED', rule: 'THC-CA-001', message: 'Exceeds 0.3% limit' },
      { field: 'CBD Content', value: '22.1%', confidence: 96, status: 'PASSED', rule: null, message: null },
      { field: 'Batch Number', value: 'NOT_FOUND', confidence: 0, status: 'FAILED', rule: 'DOC-FED-002', message: 'Required field missing' },
      { field: 'Test Date', value: '2025-12-28', confidence: 99, status: 'PASSED', rule: null, message: null },
      { field: 'Lab Name', value: 'CannaTech Labs', confidence: 97, status: 'PASSED', rule: null, message: null },
      { field: 'Lab License', value: 'CA-LAB-2024-0089', confidence: 95, status: 'PASSED', rule: null, message: null },
      { field: 'Expiration Date', value: '2026-12-28', confidence: 92, status: 'PASSED', rule: null, message: null },
      { field: 'Heavy Metals', value: 'Below Detection', confidence: 94, status: 'PASSED', rule: 'TEST-FED-001', message: null },
      { field: 'Pesticides', value: 'Not Detected', confidence: 96, status: 'PASSED', rule: 'TEST-FED-002', message: null },
      { field: 'Microbials', value: 'Within Limits', confidence: 91, status: 'PASSED', rule: 'TEST-FED-003', message: null },
    ],
  },
  complianceResult: {
    status: 'FAILED',
    passedRules: 8,
    failedRules: 2,
    evaluatedAt: '2026-01-02T10:31:00Z',
    rules: [
      { id: 'THC-CA-001', name: 'California THC Limit', status: 'FAILED', severity: 'CRITICAL', message: 'THC content 0.45% exceeds maximum 0.3%' },
      { id: 'DOC-FED-002', name: 'Batch Number Required', status: 'FAILED', severity: 'HIGH', message: 'Batch number not found in document' },
      { id: 'DOC-FED-001', name: 'COA Validity Period', status: 'PASSED', severity: 'MEDIUM', message: null },
      { id: 'TEST-FED-001', name: 'Heavy Metals Testing', status: 'PASSED', severity: 'HIGH', message: null },
    ],
  },
  decisionHistory: [
    { 
      id: 'dec-001', 
      action: 'AUTO_REJECTED', 
      actor: 'System', 
      timestamp: '2026-01-02T10:31:00Z', 
      reason: 'Failed automated compliance check: THC limit exceeded, missing batch number',
    },
  ],
  isLocked: false,
  lockedBy: null,
  lockedAt: null,
};

type TabType = 'overview' | 'extraction' | 'compliance' | 'history';

export default function DocumentDetailPage() {
  const params = useParams();
  const router = useRouter();
  
  const [activeTab, setActiveTab] = useState<TabType>('overview');
  const [showDecisionModal, setShowDecisionModal] = useState(false);
  const [decisionType, setDecisionType] = useState<'approve' | 'reject' | 'escalate' | null>(null);
  const [justification, setJustification] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showRerunModal, setShowRerunModal] = useState(false);
  const [showLockModal, setShowLockModal] = useState(false);
  const [zoomLevel, setZoomLevel] = useState(100);
  const [currentPage, setCurrentPage] = useState(1);
  
  const doc = mockDocument;

  const tabs: { id: TabType; label: string }[] = [
    { id: 'overview', label: 'Overview' },
    { id: 'extraction', label: 'Extracted Data' },
    { id: 'compliance', label: 'Compliance Evaluation' },
    { id: 'history', label: 'Decision History' },
  ];

  const handleDecision = async () => {
    if (!justification.trim()) return;
    setIsSubmitting(true);
    await new Promise(resolve => setTimeout(resolve, 1000));
    console.log(`Decision: ${decisionType}`, { justification });
    setIsSubmitting(false);
    setShowDecisionModal(false);
    setJustification('');
    setDecisionType(null);
  };

  const openDecisionModal = (type: 'approve' | 'reject' | 'escalate') => {
    setDecisionType(type);
    setShowDecisionModal(true);
  };

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 90) return 'text-emerald-400';
    if (confidence >= 70) return 'text-amber-400';
    if (confidence >= 50) return 'text-orange-400';
    return 'text-red-400';
  };

  const getConfidenceBg = (confidence: number) => {
    if (confidence >= 90) return 'bg-emerald-500';
    if (confidence >= 70) return 'bg-amber-500';
    if (confidence >= 50) return 'bg-orange-500';
    return 'bg-red-500';
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <div className="space-y-6">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={() => router.back()}
              className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-700/50 transition-colors"
            >
              <ArrowLeft className="h-5 w-5" />
            </button>
            <div>
              <div className="flex items-center gap-3 mb-1">
                <h1 className="text-xl font-bold text-white truncate max-w-lg">{doc.name}</h1>
                <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                  doc.status === 'PENDING_REVIEW' ? 'bg-amber-500/10 text-amber-400' :
                  doc.status === 'APPROVED' ? 'bg-emerald-500/10 text-emerald-400' :
                  'bg-red-500/10 text-red-400'
                }`}>
                  {doc.status.replace('_', ' ')}
                </span>
                {doc.isLocked && (
                  <span className="flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium bg-purple-500/10 text-purple-400">
                    <Lock className="h-3 w-3" />
                    Locked
                  </span>
                )}
              </div>
              <div className="flex items-center gap-4 text-sm text-slate-400">
                <Link href={`/organizations/${doc.organization.id}`} className="flex items-center gap-1 hover:text-white">
                  <Building2 className="h-3.5 w-3.5" />
                  {doc.organization.name}
                </Link>
                {doc.product && (
                  <Link href={`/products/${doc.product.id}`} className="flex items-center gap-1 hover:text-white">
                    <Package className="h-3.5 w-3.5" />
                    {doc.product.name}
                  </Link>
                )}
                <span className="flex items-center gap-1">
                  <Calendar className="h-3.5 w-3.5" />
                  {new Date(doc.uploadedAt).toLocaleDateString()}
                </span>
              </div>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <Button variant="secondary" size="sm">
              <Download className="h-4 w-4 mr-1" />
              Download
            </Button>
            <PermissionGate permission={AdminPermission.DOC_UPDATE}>
              <Button 
                variant="secondary" 
                size="sm"
                onClick={() => setShowRerunModal(true)}
              >
                <RotateCcw className="h-4 w-4 mr-1" />
                Re-run Verification
              </Button>
            </PermissionGate>
            <PermissionGate permission={AdminPermission.DOC_APPROVE}>
              {!doc.isLocked && (
                <Button 
                  variant="secondary" 
                  size="sm"
                  onClick={() => setShowLockModal(true)}
                >
                  <Lock className="h-4 w-4 mr-1" />
                  Lock
                </Button>
              )}
            </PermissionGate>
          </div>
        </div>

        {/* Two Column Layout */}
        <div className="grid grid-cols-1 xl:grid-cols-5 gap-6">
          {/* Document Preview */}
          <div className="xl:col-span-2">
            <Card className="sticky top-24">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>Document Preview</CardTitle>
                  <div className="flex items-center gap-2">
                    <Button 
                      variant="ghost" 
                      size="sm"
                      onClick={() => setZoomLevel(Math.max(50, zoomLevel - 25))}
                    >
                      <ZoomOut className="h-4 w-4" />
                    </Button>
                    <span className="text-sm text-slate-400 w-12 text-center">{zoomLevel}%</span>
                    <Button 
                      variant="ghost" 
                      size="sm"
                      onClick={() => setZoomLevel(Math.min(200, zoomLevel + 25))}
                    >
                      <ZoomIn className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {/* Placeholder for PDF preview */}
                <div className="aspect-[8.5/11] bg-slate-700/30 rounded-lg flex items-center justify-center border border-slate-600/50">
                  <div className="text-center p-8">
                    <FileText className="h-16 w-16 text-slate-500 mx-auto mb-4" />
                    <p className="text-slate-400">PDF Preview</p>
                    <p className="text-sm text-slate-500 mt-1">Page {currentPage} of {doc.ocrResult.pageCount}</p>
                    <Button variant="secondary" size="sm" className="mt-4">
                      <ExternalLink className="h-4 w-4 mr-1" />
                      Open in New Tab
                    </Button>
                  </div>
                </div>
                
                {/* Page Navigation */}
                <div className="flex items-center justify-center gap-4 mt-4">
                  <Button 
                    variant="ghost" 
                    size="sm"
                    disabled={currentPage === 1}
                    onClick={() => setCurrentPage(p => p - 1)}
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <span className="text-sm text-slate-400">
                    Page {currentPage} of {doc.ocrResult.pageCount}
                  </span>
                  <Button 
                    variant="ghost" 
                    size="sm"
                    disabled={currentPage === doc.ocrResult.pageCount}
                    onClick={() => setCurrentPage(p => p + 1)}
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Details Panel */}
          <div className="xl:col-span-3 space-y-6">
            {/* Tabs */}
            <div className="border-b border-slate-700/50">
              <nav className="flex gap-1">
                {tabs.map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                      activeTab === tab.id
                        ? 'border-amber-500 text-amber-400'
                        : 'border-transparent text-slate-400 hover:text-white'
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </nav>
            </div>

            {/* Tab Content */}
            {activeTab === 'overview' && (
              <div className="space-y-6">
                {/* Quick Stats */}
                <div className="grid grid-cols-3 gap-4">
                  <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700/50">
                    <div className="flex items-center gap-2 mb-2">
                      <Gauge className="h-4 w-4 text-slate-500" />
                      <p className="text-sm text-slate-400">OCR Confidence</p>
                    </div>
                    <p className={`text-2xl font-bold ${getConfidenceColor(doc.ocrResult.confidence)}`}>
                      {doc.ocrResult.confidence}%
                    </p>
                  </div>
                  <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700/50">
                    <div className="flex items-center gap-2 mb-2">
                      <Shield className="h-4 w-4 text-slate-500" />
                      <p className="text-sm text-slate-400">Compliance</p>
                    </div>
                    <p className={`text-2xl font-bold ${
                      doc.complianceResult.status === 'PASSED' ? 'text-emerald-400' : 'text-red-400'
                    }`}>
                      {doc.complianceResult.passedRules}/{doc.complianceResult.passedRules + doc.complianceResult.failedRules}
                    </p>
                  </div>
                  <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700/50">
                    <div className="flex items-center gap-2 mb-2">
                      <Clock className="h-4 w-4 text-slate-500" />
                      <p className="text-sm text-slate-400">Processing</p>
                    </div>
                    <p className="text-2xl font-bold text-white">{doc.ocrResult.processingTime}</p>
                  </div>
                </div>

                {/* Document Details */}
                <Card>
                  <CardHeader>
                    <CardTitle>Document Details</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-xs text-slate-500 uppercase tracking-wide">Type</p>
                        <p className="text-white font-medium mt-1">{doc.type.replace('_', ' ')}</p>
                      </div>
                      <div>
                        <p className="text-xs text-slate-500 uppercase tracking-wide">File Size</p>
                        <p className="text-white font-medium mt-1">{formatFileSize(doc.fileSize)}</p>
                      </div>
                      <div>
                        <p className="text-xs text-slate-500 uppercase tracking-wide">Uploaded By</p>
                        <p className="text-white font-medium mt-1">{doc.uploadedBy}</p>
                      </div>
                      <div>
                        <p className="text-xs text-slate-500 uppercase tracking-wide">Upload Date</p>
                        <p className="text-white font-medium mt-1">{new Date(doc.uploadedAt).toLocaleString()}</p>
                      </div>
                      <div>
                        <p className="text-xs text-slate-500 uppercase tracking-wide">OCR Engine</p>
                        <p className="text-white font-medium mt-1">{doc.ocrResult.engine}</p>
                      </div>
                      <div>
                        <p className="text-xs text-slate-500 uppercase tracking-wide">Pages</p>
                        <p className="text-white font-medium mt-1">{doc.ocrResult.pageCount}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Compliance Summary */}
                {doc.complianceResult.failedRules > 0 && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-red-400">Compliance Failures</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        {doc.complianceResult.rules.filter(r => r.status === 'FAILED').map((rule) => (
                          <div key={rule.id} className="p-4 bg-red-500/10 rounded-lg border border-red-500/20">
                            <div className="flex items-start gap-3">
                              <XCircle className="h-5 w-5 text-red-400 flex-shrink-0 mt-0.5" />
                              <div>
                                <div className="flex items-center gap-2 mb-1">
                                  <code className="text-xs text-amber-400 font-mono">{rule.id}</code>
                                  <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                                    rule.severity === 'CRITICAL' ? 'bg-red-500/20 text-red-400' :
                                    rule.severity === 'HIGH' ? 'bg-amber-500/20 text-amber-400' :
                                    'bg-blue-500/20 text-blue-400'
                                  }`}>
                                    {rule.severity}
                                  </span>
                                </div>
                                <p className="text-white font-medium">{rule.name}</p>
                                <p className="text-sm text-slate-300 mt-1">{rule.message}</p>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Decision Actions */}
                <Card>
                  <CardHeader>
                    <CardTitle>Actions</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex flex-wrap gap-3">
                      <PermissionGate permission={AdminPermission.DOC_APPROVE}>
                        <Button 
                          variant="primary"
                          onClick={() => openDecisionModal('approve')}
                        >
                          <CheckCircle className="h-4 w-4 mr-2" />
                          Approve Document
                        </Button>
                      </PermissionGate>
                      <PermissionGate permission={AdminPermission.DOC_REJECT}>
                        <Button 
                          variant="danger"
                          onClick={() => openDecisionModal('reject')}
                        >
                          <XCircle className="h-4 w-4 mr-2" />
                          Reject Document
                        </Button>
                      </PermissionGate>
                      <Button 
                        variant="secondary"
                        onClick={() => openDecisionModal('escalate')}
                      >
                        Escalate
                      </Button>
                    </div>
                    {doc.complianceResult.failedRules > 0 && (
                      <div className="mt-4 p-3 bg-amber-500/10 rounded-lg border border-amber-500/20">
                        <div className="flex items-start gap-2">
                          <AlertTriangle className="h-4 w-4 text-amber-400 flex-shrink-0 mt-0.5" />
                          <p className="text-sm text-amber-400">
                            Approving this document will create an override record requiring detailed justification.
                          </p>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            )}

            {activeTab === 'extraction' && (
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle>Extracted Fields</CardTitle>
                    <div className="flex items-center gap-2">
                      <div className="h-2 w-2 rounded-full bg-emerald-500" />
                      <span className="text-xs text-slate-400">High Confidence (90%+)</span>
                      <div className="h-2 w-2 rounded-full bg-amber-500 ml-2" />
                      <span className="text-xs text-slate-400">Medium (70-90%)</span>
                      <div className="h-2 w-2 rounded-full bg-red-500 ml-2" />
                      <span className="text-xs text-slate-400">Low (&lt;70%)</span>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {doc.ocrResult.extractedFields.map((field, index) => (
                      <div 
                        key={index}
                        className={`p-4 rounded-lg border ${
                          field.status === 'FAILED' 
                            ? 'bg-red-500/5 border-red-500/30' 
                            : 'bg-slate-700/30 border-slate-700/50'
                        }`}
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <p className="text-sm text-slate-400">{field.field}</p>
                              {field.rule && (
                                <code className="text-xs text-amber-400 font-mono">{field.rule}</code>
                              )}
                            </div>
                            <p className={`text-lg font-medium ${
                              field.value === 'NOT_FOUND' ? 'text-red-400' : 'text-white'
                            }`}>
                              {field.value}
                            </p>
                            {field.message && (
                              <p className="text-sm text-red-400 mt-1 flex items-center gap-1">
                                <AlertTriangle className="h-3.5 w-3.5" />
                                {field.message}
                              </p>
                            )}
                          </div>
                          <div className="flex flex-col items-end gap-1">
                            <div className="flex items-center gap-2">
                              <div className="w-16 h-2 bg-slate-700 rounded-full overflow-hidden">
                                <div 
                                  className={`h-full rounded-full ${getConfidenceBg(field.confidence)}`}
                                  style={{ width: `${field.confidence}%` }}
                                />
                              </div>
                              <span className={`text-sm font-medium ${getConfidenceColor(field.confidence)}`}>
                                {field.confidence}%
                              </span>
                            </div>
                            {field.status === 'FAILED' && (
                              <XCircle className="h-5 w-5 text-red-400" />
                            )}
                            {field.status === 'PASSED' && field.rule && (
                              <CheckCircle className="h-5 w-5 text-emerald-400" />
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {activeTab === 'compliance' && (
              <Card>
                <CardHeader>
                  <CardTitle>Compliance Evaluation</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {/* Summary */}
                    <div className="grid grid-cols-3 gap-4 mb-6">
                      <div className="text-center p-4 bg-slate-700/30 rounded-lg">
                        <p className="text-3xl font-bold text-white">
                          {doc.complianceResult.passedRules + doc.complianceResult.failedRules}
                        </p>
                        <p className="text-sm text-slate-400">Total Rules</p>
                      </div>
                      <div className="text-center p-4 bg-emerald-500/10 rounded-lg">
                        <p className="text-3xl font-bold text-emerald-400">
                          {doc.complianceResult.passedRules}
                        </p>
                        <p className="text-sm text-slate-400">Passed</p>
                      </div>
                      <div className="text-center p-4 bg-red-500/10 rounded-lg">
                        <p className="text-3xl font-bold text-red-400">
                          {doc.complianceResult.failedRules}
                        </p>
                        <p className="text-sm text-slate-400">Failed</p>
                      </div>
                    </div>

                    {/* Rules List */}
                    <div className="space-y-3">
                      {doc.complianceResult.rules.map((rule) => (
                        <div 
                          key={rule.id}
                          className={`p-4 rounded-lg border ${
                            rule.status === 'FAILED' 
                              ? 'bg-red-500/5 border-red-500/30' 
                              : 'bg-slate-700/30 border-slate-700/50'
                          }`}
                        >
                          <div className="flex items-start justify-between">
                            <div>
                              <div className="flex items-center gap-2 mb-1">
                                <code className="text-xs text-amber-400 font-mono">{rule.id}</code>
                                <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                                  rule.severity === 'CRITICAL' ? 'bg-red-500/20 text-red-400' :
                                  rule.severity === 'HIGH' ? 'bg-amber-500/20 text-amber-400' :
                                  'bg-blue-500/20 text-blue-400'
                                }`}>
                                  {rule.severity}
                                </span>
                              </div>
                              <p className="text-white font-medium">{rule.name}</p>
                              {rule.message && (
                                <p className="text-sm text-slate-400 mt-1">{rule.message}</p>
                              )}
                            </div>
                            <div>
                              {rule.status === 'PASSED' ? (
                                <CheckCircle className="h-6 w-6 text-emerald-400" />
                              ) : (
                                <XCircle className="h-6 w-6 text-red-400" />
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>

                    <p className="text-xs text-slate-500 mt-4">
                      Evaluated at {new Date(doc.complianceResult.evaluatedAt).toLocaleString()}
                    </p>
                  </div>
                </CardContent>
              </Card>
            )}

            {activeTab === 'history' && (
              <Card>
                <CardHeader>
                  <CardTitle>Decision History</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="relative">
                    <div className="absolute left-4 top-0 bottom-0 w-px bg-slate-700" />
                    <div className="space-y-6">
                      {doc.decisionHistory.map((decision) => (
                        <div key={decision.id} className="relative flex gap-4 pl-10">
                          <div className={`absolute left-2.5 h-3 w-3 rounded-full ring-4 ring-slate-800 ${
                            decision.action === 'APPROVED' ? 'bg-emerald-500' :
                            decision.action === 'REJECTED' || decision.action === 'AUTO_REJECTED' ? 'bg-red-500' :
                            'bg-amber-500'
                          }`} />
                          <div className="flex-1 bg-slate-700/30 rounded-xl p-4">
                            <div className="flex items-center justify-between mb-2">
                              <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                                decision.action === 'APPROVED' ? 'bg-emerald-500/10 text-emerald-400' :
                                decision.action.includes('REJECTED') ? 'bg-red-500/10 text-red-400' :
                                'bg-amber-500/10 text-amber-400'
                              }`}>
                                {decision.action.replace('_', ' ')}
                              </span>
                              <span className="text-xs text-slate-500">
                                {new Date(decision.timestamp).toLocaleString()}
                              </span>
                            </div>
                            <p className="text-sm text-slate-300">{decision.reason}</p>
                            <div className="flex items-center gap-1 mt-2 text-xs text-slate-500">
                              <User className="h-3 w-3" />
                              {decision.actor}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {doc.decisionHistory.length === 0 && (
                    <div className="text-center py-8">
                      <History className="h-12 w-12 text-slate-600 mx-auto mb-3" />
                      <p className="text-slate-400">No decisions yet</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}
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
        description="This action requires justification and will be permanently recorded."
      >
        <div className="space-y-4">
          {decisionType === 'approve' && doc.complianceResult.failedRules > 0 && (
            <div className="p-4 bg-red-500/10 rounded-lg border border-red-500/20">
              <div className="flex items-start gap-3">
                <AlertTriangle className="h-5 w-5 text-red-400 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-red-400">Override Required</p>
                  <p className="text-sm text-slate-300 mt-1">
                    This document has {doc.complianceResult.failedRules} failed compliance check(s).
                    Approving will create an override record that will be flagged for audit.
                  </p>
                </div>
              </div>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Justification <span className="text-red-400">*</span>
            </label>
            <Textarea
              value={justification}
              onChange={(e) => setJustification(e.target.value)}
              placeholder="Provide detailed justification for this decision..."
              rows={4}
            />
            <p className="text-xs text-slate-500 mt-1">
              Minimum 20 characters required. This will be permanently recorded.
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
              {isSubmitting ? 'Submitting...' : 'Confirm Decision'}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Re-run Modal */}
      <Modal
        isOpen={showRerunModal}
        onClose={() => setShowRerunModal(false)}
        title="Re-run Verification"
        description="This will re-process the document through OCR and compliance evaluation."
      >
        <div className="space-y-4">
          <p className="text-slate-300">
            Re-running verification will:
          </p>
          <ul className="list-disc list-inside text-sm text-slate-400 space-y-1">
            <li>Re-extract all fields using the latest OCR engine</li>
            <li>Re-evaluate against current compliance rules</li>
            <li>Update the document status based on new results</li>
            <li>Log this action in the audit trail</li>
          </ul>
          <div className="flex justify-end gap-3 pt-4">
            <Button variant="secondary" onClick={() => setShowRerunModal(false)}>Cancel</Button>
            <Button variant="primary">
              <RotateCcw className="h-4 w-4 mr-2" />
              Re-run Verification
            </Button>
          </div>
        </div>
      </Modal>

      {/* Lock Modal */}
      <Modal
        isOpen={showLockModal}
        onClose={() => setShowLockModal(false)}
        title="Lock Document"
        description="Lock this document to prevent further modifications."
      >
        <div className="space-y-4">
          <p className="text-slate-300">
            Locking a document will:
          </p>
          <ul className="list-disc list-inside text-sm text-slate-400 space-y-1">
            <li>Prevent any status changes</li>
            <li>Disable re-verification</li>
            <li>Mark the document as final</li>
            <li>Require ADMIN to unlock</li>
          </ul>
          <div className="flex justify-end gap-3 pt-4">
            <Button variant="secondary" onClick={() => setShowLockModal(false)}>Cancel</Button>
            <Button variant="primary">
              <Lock className="h-4 w-4 mr-2" />
              Lock Document
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
