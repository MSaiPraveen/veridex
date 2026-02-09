'use client';

import { useState, useEffect } from 'react';
import { 
  ShieldAlert, 
  Clock, 
  User,
  CheckCircle,
  XCircle,
  AlertTriangle,
  FileText,
  Building2,
  Package,
  Eye,
  Filter,
  Search,
  Calendar,
  History,
  Lock,
  Unlock,
  UserCheck,
  Flag,
  Tag,
  MessageSquare,
  ChevronRight,
  Shield,
  RefreshCw
} from 'lucide-react';
import Link from 'next/link';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge, StatusBadge } from '@/components/ui/badge';
import { SearchInput, Select, Textarea, Input } from '@/components/ui/input';
import { Modal } from '@/components/ui/modal';
import { StatCard } from '@/components/ui/stat-card';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell, Pagination } from '@/components/ui/table';
import { Tabs, Tab, TabPanel } from '@/components/ui/tabs';
import { PermissionGate, useAdminPermissions } from '@/components/auth/permission-gate';
import { AdminPermission } from '@/lib/admin-rbac';

// Types
interface Override {
  id: string;
  type: 'DOCUMENT' | 'COMPLIANCE' | 'PRODUCT' | 'RULE';
  entityId: string;
  entityName: string;
  organizationId: string;
  organizationName: string;
  originalDecision: 'REJECTED' | 'FAILED' | 'NON_COMPLIANT';
  overrideDecision: 'APPROVED' | 'PASSED' | 'COMPLIANT';
  category: 'POLICY_EXCEPTION' | 'EMERGENCY' | 'FALSE_POSITIVE' | 'MEASUREMENT_ERROR' | 'TEMPORARY';
  justification: string;
  requiredApproval: boolean;
  approvalStatus: 'PENDING' | 'APPROVED' | 'DENIED' | 'NOT_REQUIRED';
  supervisorId?: string;
  supervisorName?: string;
  supervisorDecision?: string;
  requestedBy: string;
  requestedByEmail: string;
  requestedAt: string;
  approvedAt?: string;
  expiresAt?: string;
  originalFailures: string[];
  impactedRules?: string[];
  auditId?: string;
}

interface PendingApproval {
  id: string;
  overrideId: string;
  entityName: string;
  requestedBy: string;
  category: string;
  justification: string;
  requestedAt: string;
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
}

// Override categories
const OVERRIDE_CATEGORIES = [
  { value: 'POLICY_EXCEPTION', label: 'Policy Exception', description: 'Documented deviation from standard policy' },
  { value: 'EMERGENCY', label: 'Emergency', description: 'Time-critical business requirement' },
  { value: 'FALSE_POSITIVE', label: 'False Positive', description: 'System incorrectly flagged compliant item' },
  { value: 'MEASUREMENT_ERROR', label: 'Measurement Error', description: 'Lab/testing error confirmed' },
  { value: 'TEMPORARY', label: 'Temporary', description: 'Short-term exception with expiry' },
];

// Real data - no mock data
const overridesData: Override[] = [];

const pendingApprovalsData: PendingApproval[] = [];

export default function OverridesPage() {
  const [overrides, setOverrides] = useState<Override[]>(overridesData);
  const [activeTab, setActiveTab] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showApprovalModal, setShowApprovalModal] = useState(false);
  const [selectedOverride, setSelectedOverride] = useState<Override | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [lastUpdated, setLastUpdated] = useState(new Date());
  const { hasPermission } = useAdminPermissions();
  
  // New override form state
  const [newOverride, setNewOverride] = useState({
    category: '',
    justification: '',
    expiresAt: '',
  });

  // Stats
  const stats = {
    total: overrides.length,
    approved: overrides.filter(o => o.approvalStatus === 'APPROVED' || o.approvalStatus === 'NOT_REQUIRED').length,
    pending: overrides.filter(o => o.approvalStatus === 'PENDING').length,
    denied: overrides.filter(o => o.approvalStatus === 'DENIED').length,
    thisMonth: overrides.filter(o => new Date(o.requestedAt) > new Date('2026-01-01')).length,
    byCategory: OVERRIDE_CATEGORIES.reduce((acc, cat) => {
      acc[cat.value] = overrides.filter(o => o.category === cat.value).length;
      return acc;
    }, {} as Record<string, number>),
  };

  // Filtering
  const filteredOverrides = overrides.filter(ovr => {
    if (activeTab === 'pending' && ovr.approvalStatus !== 'PENDING') return false;
    if (activeTab === 'approved' && ovr.approvalStatus !== 'APPROVED' && ovr.approvalStatus !== 'NOT_REQUIRED') return false;
    if (activeTab === 'denied' && ovr.approvalStatus !== 'DENIED') return false;
    if (categoryFilter !== 'all' && ovr.category !== categoryFilter) return false;
    if (statusFilter !== 'all' && ovr.approvalStatus !== statusFilter) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      return (
        ovr.entityName.toLowerCase().includes(q) ||
        ovr.organizationName.toLowerCase().includes(q) ||
        ovr.justification.toLowerCase().includes(q) ||
        ovr.requestedBy.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const handleViewDetail = (override: Override) => {
    setSelectedOverride(override);
    setShowDetailModal(true);
  };

  const handleApprovalAction = (decision: 'APPROVED' | 'DENIED', notes: string) => {
    if (!selectedOverride) return;
    setOverrides(prev => prev.map(o => 
      o.id === selectedOverride.id 
        ? { 
            ...o, 
            approvalStatus: decision, 
            supervisorDecision: notes,
            supervisorId: 'current-admin',
            supervisorName: 'Current Admin',
            approvedAt: decision === 'APPROVED' ? new Date().toISOString() : undefined,
          }
        : o
    ));
    setShowApprovalModal(false);
    setSelectedOverride(null);
  };

  const getCategoryBadge = (category: string) => {
    const colors: Record<string, string> = {
      'POLICY_EXCEPTION': 'bg-blue-100 text-blue-700 dark:bg-blue-500/20 dark:text-blue-400',
      'EMERGENCY': 'bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-400',
      'FALSE_POSITIVE': 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400',
      'MEASUREMENT_ERROR': 'bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-400',
      'TEMPORARY': 'bg-purple-100 text-purple-700 dark:bg-purple-500/20 dark:text-purple-400',
    };
    return colors[category] || 'bg-slate-100 text-slate-700';
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'APPROVED': return <Badge variant="success">Approved</Badge>;
      case 'PENDING': return <Badge variant="warning">Pending Approval</Badge>;
      case 'DENIED': return <Badge variant="error">Denied</Badge>;
      case 'NOT_REQUIRED': return <Badge variant="info">No Approval Needed</Badge>;
      default: return <Badge variant="default">{status}</Badge>;
    }
  };

  return (
    <>
      {/* Warning Banner */}
      <div className="mb-6 p-4 bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/30 rounded-lg">
        <div className="flex items-start gap-3">
          <ShieldAlert className="h-5 w-5 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
          <div>
            <h4 className="font-semibold text-amber-800 dark:text-amber-300">Override Policy</h4>
            <p className="text-sm text-amber-700 dark:text-amber-400 mt-1">
              Overrides bypass standard compliance checks. All overrides are permanently logged, require mandatory justification, 
              and high-risk overrides require supervisor approval. Overrides should be rare exceptions, not routine practice.
            </p>
          </div>
        </div>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 mb-6">
        <StatCard
          title="Total Overrides"
          value={stats.total}
          icon={<ShieldAlert className="h-5 w-5" />}
          variant="default"
        />
        <StatCard
          title="Approved"
          value={stats.approved}
          icon={<CheckCircle className="h-5 w-5" />}
          variant="success"
        />
        <StatCard
          title="Pending Approval"
          value={stats.pending}
          icon={<Clock className="h-5 w-5" />}
          variant="warning"
        />
        <StatCard
          title="Denied"
          value={stats.denied}
          icon={<XCircle className="h-5 w-5" />}
          variant="error"
        />
        <StatCard
          title="This Month"
          value={stats.thisMonth}
          icon={<Calendar className="h-5 w-5" />}
          variant="info"
        />
      </div>

      {/* Pending Approvals Alert */}
      {pendingApprovalsData.length > 0 && (
        <PermissionGate permissions={[AdminPermission.OVERRIDE_APPROVE]}>
          <Card className="mb-6 border-amber-200 dark:border-amber-500/30 bg-amber-50/50 dark:bg-amber-500/5">
            <CardHeader className="border-b border-amber-200 dark:border-amber-500/30">
              <CardTitle className="flex items-center gap-2 text-amber-800 dark:text-amber-300">
                <UserCheck className="h-5 w-5" />
                Pending Your Approval
                <Badge variant="warning">{pendingApprovalsData.length}</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="py-4">
              <div className="space-y-3">
                {pendingApprovalsData.map((pending) => (
                  <div 
                    key={pending.id}
                    className="flex items-center justify-between p-3 bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700/50"
                  >
                    <div>
                      <p className="font-medium text-slate-900 dark:text-white">{pending.entityName}</p>
                      <p className="text-sm text-slate-500 dark:text-slate-400">
                        {pending.requestedBy} • {OVERRIDE_CATEGORIES.find(c => c.value === pending.category)?.label}
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      <Badge className={`${
                        pending.riskLevel === 'CRITICAL' ? 'bg-red-100 text-red-700' :
                        pending.riskLevel === 'HIGH' ? 'bg-orange-100 text-orange-700' :
                        pending.riskLevel === 'MEDIUM' ? 'bg-amber-100 text-amber-700' :
                        'bg-slate-100 text-slate-700'
                      }`}>
                        {pending.riskLevel} Risk
                      </Badge>
                      <Button 
                        variant="primary" 
                        size="sm"
                        onClick={() => {
                          const override = overrides.find(o => o.id === pending.overrideId);
                          if (override) {
                            setSelectedOverride(override);
                            setShowApprovalModal(true);
                          }
                        }}
                      >
                        Review
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </PermissionGate>
      )}

      {/* Tabs & Filters */}
      <Tabs value={activeTab} onChange={setActiveTab} className="mb-6">
        <Tab value="all" label="All Overrides" count={overrides.length} />
        <Tab value="pending" label="Pending Approval" count={stats.pending} />
        <Tab value="approved" label="Approved" count={stats.approved} />
        <Tab value="denied" label="Denied" count={stats.denied} />
      </Tabs>

      {/* Filters */}
      <Card className="mb-6">
        <CardContent className="py-4">
          <div className="flex flex-col lg:flex-row gap-4 items-start lg:items-center justify-between">
            <div className="flex flex-wrap gap-3 items-center">
              <SearchInput
                placeholder="Search overrides..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-64"
              />
              <Select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="w-48"
              >
                <option value="all">All Categories</option>
                {OVERRIDE_CATEGORIES.map(cat => (
                  <option key={cat.value} value={cat.value}>{cat.label}</option>
                ))}
              </Select>
            </div>
            <div className="text-sm text-slate-500 dark:text-slate-400">
              Last updated: {lastUpdated.toLocaleTimeString()}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Overrides List */}
      <Card>
        <CardHeader className="border-b border-slate-200 dark:border-slate-700/50">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <ShieldAlert className="h-5 w-5 text-amber-500" />
              Override Records
            </CardTitle>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Entity</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Original → Override</TableHead>
                <TableHead>Requested By</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredOverrides.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-slate-500 dark:text-slate-400">
                    No overrides match your filters
                  </TableCell>
                </TableRow>
              ) : (
                filteredOverrides.map((override) => (
                  <TableRow key={override.id}>
                    <TableCell>
                      <div>
                        <p className="font-medium text-slate-900 dark:text-white">{override.entityName}</p>
                        <p className="text-sm text-slate-500 dark:text-slate-400">
                          {override.organizationName} • {override.type}
                        </p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge className={getCategoryBadge(override.category)}>
                        {OVERRIDE_CATEGORIES.find(c => c.value === override.category)?.label}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2 text-sm">
                        <span className="text-red-500 line-through">{override.originalDecision}</span>
                        <ChevronRight className="h-4 w-4 text-slate-400" />
                        <span className="text-emerald-500 font-medium">{override.overrideDecision}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div>
                        <p className="text-sm text-slate-900 dark:text-white">{override.requestedBy.split('@')[0]}</p>
                        <p className="text-xs text-slate-500 dark:text-slate-400">
                          {new Date(override.requestedAt).toLocaleDateString()}
                        </p>
                      </div>
                    </TableCell>
                    <TableCell>
                      {getStatusBadge(override.approvalStatus)}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button variant="ghost" size="sm" onClick={() => handleViewDetail(override)}>
                          <Eye className="h-4 w-4 mr-1" />
                          Details
                        </Button>
                        {override.approvalStatus === 'PENDING' && (
                          <PermissionGate permissions={[AdminPermission.OVERRIDE_APPROVE]}>
                            <Button 
                              variant="primary" 
                              size="sm"
                              onClick={() => {
                                setSelectedOverride(override);
                                setShowApprovalModal(true);
                              }}
                            >
                              <UserCheck className="h-4 w-4 mr-1" />
                              Review
                            </Button>
                          </PermissionGate>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Category Distribution */}
      <Card className="mt-6">
        <CardHeader className="border-b border-slate-200 dark:border-slate-700/50">
          <CardTitle className="flex items-center gap-2">
            <Tag className="h-5 w-5 text-amber-500" />
            Override Categories (30 Days)
          </CardTitle>
        </CardHeader>
        <CardContent className="py-6">
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            {OVERRIDE_CATEGORIES.map(cat => (
              <div 
                key={cat.value} 
                className="p-4 rounded-lg bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/50"
              >
                <p className="text-2xl font-bold text-slate-900 dark:text-white">
                  {stats.byCategory[cat.value] || 0}
                </p>
                <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">{cat.label}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Detail Modal */}
      <Modal
        isOpen={showDetailModal}
        onClose={() => setShowDetailModal(false)}
        title="Override Details"
        size="lg"
      >
        {selectedOverride && (
          <div className="space-y-6">
            {/* Header */}
            <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-lg">
              <div className="flex items-start justify-between mb-2">
                <div>
                  <h4 className="font-semibold text-lg text-slate-900 dark:text-white">
                    {selectedOverride.entityName}
                  </h4>
                  <p className="text-slate-500 dark:text-slate-400">
                    {selectedOverride.organizationName} • {selectedOverride.type}
                  </p>
                </div>
                {getStatusBadge(selectedOverride.approvalStatus)}
              </div>
            </div>

            {/* Decision Flow */}
            <div className="flex items-center justify-center gap-4 py-4">
              <div className="text-center p-3 rounded-lg bg-red-50 dark:bg-red-500/10">
                <XCircle className="h-8 w-8 text-red-500 mx-auto mb-2" />
                <p className="text-sm font-medium text-red-700 dark:text-red-400">
                  {selectedOverride.originalDecision}
                </p>
                <p className="text-xs text-red-600 dark:text-red-400/70">Original</p>
              </div>
              <ChevronRight className="h-8 w-8 text-slate-400" />
              <div className="text-center p-3 rounded-lg bg-emerald-50 dark:bg-emerald-500/10">
                <CheckCircle className="h-8 w-8 text-emerald-500 mx-auto mb-2" />
                <p className="text-sm font-medium text-emerald-700 dark:text-emerald-400">
                  {selectedOverride.overrideDecision}
                </p>
                <p className="text-xs text-emerald-600 dark:text-emerald-400/70">Override</p>
              </div>
            </div>

            {/* Justification */}
            <div>
              <h5 className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-2 flex items-center gap-2">
                <MessageSquare className="h-4 w-4" />
                Justification
              </h5>
              <p className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-lg text-slate-600 dark:text-slate-300">
                {selectedOverride.justification}
              </p>
            </div>

            {/* Original Failures */}
            <div>
              <h5 className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-2 flex items-center gap-2">
                <AlertTriangle className="h-4 w-4" />
                Original Failures Overridden
              </h5>
              <ul className="space-y-1">
                {selectedOverride.originalFailures.map((failure, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-slate-600 dark:text-slate-300">
                    <XCircle className="h-4 w-4 text-red-400 flex-shrink-0 mt-0.5" />
                    {failure}
                  </li>
                ))}
              </ul>
            </div>

            {/* Supervisor Decision */}
            {selectedOverride.supervisorDecision && (
              <div className={`p-4 rounded-lg ${
                selectedOverride.approvalStatus === 'APPROVED' 
                  ? 'bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/30'
                  : 'bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/30'
              }`}>
                <h5 className="text-sm font-medium mb-2 flex items-center gap-2">
                  <UserCheck className="h-4 w-4" />
                  Supervisor Decision
                </h5>
                <p className="text-sm">{selectedOverride.supervisorDecision}</p>
                <p className="text-xs mt-2 opacity-70">
                  By {selectedOverride.supervisorName} • {selectedOverride.approvedAt ? new Date(selectedOverride.approvedAt).toLocaleString() : 'Pending'}
                </p>
              </div>
            )}

            {/* Metadata */}
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-slate-500 dark:text-slate-400">Category:</span>
                <Badge className={`ml-2 ${getCategoryBadge(selectedOverride.category)}`}>
                  {OVERRIDE_CATEGORIES.find(c => c.value === selectedOverride.category)?.label}
                </Badge>
              </div>
              <div>
                <span className="text-slate-500 dark:text-slate-400">Requested:</span>
                <span className="ml-2 text-slate-900 dark:text-white">
                  {new Date(selectedOverride.requestedAt).toLocaleString()}
                </span>
              </div>
              {selectedOverride.expiresAt && (
                <div>
                  <span className="text-slate-500 dark:text-slate-400">Expires:</span>
                  <span className="ml-2 text-amber-600 dark:text-amber-400 font-medium">
                    {new Date(selectedOverride.expiresAt).toLocaleDateString()}
                  </span>
                </div>
              )}
              {selectedOverride.auditId && (
                <div>
                  <span className="text-slate-500 dark:text-slate-400">Audit Trail:</span>
                  <Link 
                    href={`/audit-logs?id=${selectedOverride.auditId}`}
                    className="ml-2 text-amber-500 hover:underline"
                  >
                    View in Audit Log
                  </Link>
                </div>
              )}
            </div>

            <div className="flex justify-end pt-4 border-t border-slate-200 dark:border-slate-700/50">
              <Button variant="outline" onClick={() => setShowDetailModal(false)}>
                Close
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {/* Approval Modal */}
      <Modal
        isOpen={showApprovalModal}
        onClose={() => setShowApprovalModal(false)}
        title="Override Approval"
        size="lg"
      >
        {selectedOverride && (
          <ApprovalForm 
            override={selectedOverride}
            onApprove={(notes) => handleApprovalAction('APPROVED', notes)}
            onDeny={(notes) => handleApprovalAction('DENIED', notes)}
            onCancel={() => setShowApprovalModal(false)}
          />
        )}
      </Modal>
    </>
  );
}

// Approval Form Component
function ApprovalForm({ 
  override, 
  onApprove, 
  onDeny, 
  onCancel 
}: { 
  override: Override;
  onApprove: (notes: string) => void;
  onDeny: (notes: string) => void;
  onCancel: () => void;
}) {
  const [notes, setNotes] = useState('');
  const [error, setError] = useState('');

  const handleAction = (action: 'approve' | 'deny') => {
    if (!notes.trim()) {
      setError('Decision notes are required');
      return;
    }
    if (notes.length < 20) {
      setError('Please provide a more detailed explanation (min 20 characters)');
      return;
    }
    if (action === 'approve') {
      onApprove(notes);
    } else {
      onDeny(notes);
    }
  };

  return (
    <div className="space-y-6">
      {/* Override Summary */}
      <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-lg">
        <h4 className="font-semibold text-slate-900 dark:text-white mb-2">
          {override.entityName}
        </h4>
        <p className="text-sm text-slate-600 dark:text-slate-300 mb-3">
          {override.justification}
        </p>
        <div className="flex items-center gap-4 text-sm">
          <Badge className={`${
            override.category === 'EMERGENCY' ? 'bg-red-100 text-red-700' :
            override.category === 'POLICY_EXCEPTION' ? 'bg-blue-100 text-blue-700' :
            'bg-slate-100 text-slate-700'
          }`}>
            {OVERRIDE_CATEGORIES.find(c => c.value === override.category)?.label}
          </Badge>
          <span className="text-slate-500 dark:text-slate-400">
            By {override.requestedBy}
          </span>
        </div>
      </div>

      {/* Original Failures */}
      <div>
        <h5 className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
          Compliance Failures Being Overridden:
        </h5>
        <ul className="space-y-1">
          {override.originalFailures.map((failure, i) => (
            <li key={i} className="flex items-start gap-2 text-sm text-red-600 dark:text-red-400">
              <XCircle className="h-4 w-4 flex-shrink-0 mt-0.5" />
              {failure}
            </li>
          ))}
        </ul>
      </div>

      {/* Decision Notes */}
      <div>
        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
          Decision Notes <span className="text-red-500">*</span>
        </label>
        <Textarea
          value={notes}
          onChange={(e) => {
            setNotes(e.target.value);
            setError('');
          }}
          placeholder="Provide your rationale for approving or denying this override..."
          rows={4}
          className={error ? 'border-red-500' : ''}
        />
        {error && <p className="text-sm text-red-500 mt-1">{error}</p>}
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
          Your decision and notes will be permanently recorded in the audit log.
        </p>
      </div>

      {/* Warning */}
      <div className="p-3 bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/30 rounded-lg">
        <div className="flex items-start gap-2">
          <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-amber-800 dark:text-amber-300">
            Override approvals bypass standard compliance controls. Ensure you have verified the justification 
            and understand the regulatory implications before approving.
          </p>
        </div>
      </div>

      {/* Actions */}
      <div className="flex justify-end gap-3 pt-4 border-t border-slate-200 dark:border-slate-700/50">
        <Button variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button variant="error" onClick={() => handleAction('deny')}>
          <XCircle className="h-4 w-4 mr-2" />
          Deny Override
        </Button>
        <Button variant="primary" onClick={() => handleAction('approve')}>
          <CheckCircle className="h-4 w-4 mr-2" />
          Approve Override
        </Button>
      </div>
    </div>
  );
}
