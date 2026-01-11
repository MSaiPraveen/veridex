'use client';

import { useState, useEffect } from 'react';
import { 
  AlertOctagon, 
  Clock, 
  User,
  ChevronRight,
  CheckCircle,
  AlertTriangle,
  XCircle,
  ArrowUpRight,
  Timer,
  FileText,
  Building2,
  UserPlus,
  RefreshCw,
  Filter,
  Eye,
  Play,
  UserCog,
  History,
  Calendar,
  TrendingUp,
  Zap
} from 'lucide-react';
import Link from 'next/link';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge, StatusBadge } from '@/components/ui/badge';
import { SearchInput, Select } from '@/components/ui/input';
import { Modal } from '@/components/ui/modal';
import { StatCard } from '@/components/ui/stat-card';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import { PermissionGate, useAdminPermissions } from '@/components/auth/permission-gate';
import { AdminPermission } from '@/lib/admin-rbac';

// Types
interface EscalationHistoryItem {
  id: string;
  action: string;
  actor: string;
  timestamp: string;
  details?: string;
}

interface EscalationItem {
  id: string;
  type: 'DOCUMENT' | 'COMPLIANCE' | 'ORGANIZATION' | 'PRODUCT';
  entityId: string;
  entityName: string;
  organizationId: string;
  organizationName: string;
  reason: string;
  escalationLevel: 1 | 2 | 3;
  escalatedBy: 'SYSTEM' | 'ADMIN';
  escalatedByName?: string;
  escalatedAt: string;
  originalAssignee?: string;
  currentAssignee?: string;
  slaDeadline: string;
  slaStatus: 'ON_TRACK' | 'AT_RISK' | 'BREACHED';
  timeRemaining: string;
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  status: 'PENDING' | 'ASSIGNED' | 'IN_PROGRESS' | 'RESOLVED';
  notes?: string;
  history: EscalationHistoryItem[];
}

interface AdminAssignee {
  id: string;
  name: string;
  email: string;
  role: string;
  activeEscalations: number;
  avgResolutionTime: string;
}

// Mock data
const mockEscalations: EscalationItem[] = [
  {
    id: 'esc-001',
    type: 'DOCUMENT',
    entityId: 'doc-456',
    entityName: 'Lab Report - THC Override Required',
    organizationId: 'org-001',
    organizationName: 'GreenLeaf Labs',
    escalatedAt: '2026-01-02T10:30:00Z',
    escalatedBy: 'SYSTEM',
    escalationLevel: 2,
    reason: 'THC limit exceeded - requires senior review',
    originalAssignee: 'john.reviewer@veridex.io',
    currentAssignee: 'sarah.senior@veridex.io',
    slaDeadline: '2026-01-03T10:30:00Z',
    slaStatus: 'AT_RISK',
    timeRemaining: '4h 32m',
    priority: 'CRITICAL',
    status: 'IN_PROGRESS',
    history: [
      { id: 'h1', action: 'Auto-escalated to Level 2', actor: 'System', timestamp: '2026-01-02T10:30:00Z', details: 'SLA at 50% with no decision' },
      { id: 'h2', action: 'Assigned to Sarah Miller', actor: 'System', timestamp: '2026-01-02T10:31:00Z' },
      { id: 'h3', action: 'Review started', actor: 'Sarah Miller', timestamp: '2026-01-02T11:00:00Z' },
    ],
  },
  {
    id: 'esc-002',
    type: 'ORGANIZATION',
    entityId: 'org-999',
    entityName: 'Suspect CBD Corp',
    organizationId: 'org-999',
    organizationName: 'Suspect CBD Corp',
    escalatedAt: '2026-01-01T14:00:00Z',
    escalatedBy: 'ADMIN',
    escalatedByName: 'john.admin@veridex.io',
    escalationLevel: 3,
    reason: 'Multiple compliance failures - suspension review',
    currentAssignee: undefined,
    slaDeadline: '2026-01-02T14:00:00Z',
    slaStatus: 'BREACHED',
    timeRemaining: '-18h 45m',
    priority: 'CRITICAL',
    status: 'PENDING',
    notes: 'Requires super admin review for potential permanent suspension',
    history: [
      { id: 'h1', action: 'Manually escalated to Level 3', actor: 'John Admin', timestamp: '2026-01-01T14:00:00Z', details: '5 compliance failures in 30 days' },
    ],
  },
  {
    id: 'esc-003',
    type: 'DOCUMENT',
    entityId: 'doc-789',
    entityName: 'Business License - Expiry Unclear',
    organizationId: 'org-002',
    organizationName: 'Pure Wellness Co',
    escalatedAt: '2026-01-02T16:00:00Z',
    escalatedBy: 'SYSTEM',
    escalationLevel: 1,
    reason: 'OCR extraction failed for critical date fields',
    currentAssignee: 'mike.reviewer@veridex.io',
    slaDeadline: '2026-01-04T16:00:00Z',
    slaStatus: 'ON_TRACK',
    timeRemaining: '47h 15m',
    priority: 'MEDIUM',
    status: 'ASSIGNED',
    history: [
      { id: 'h1', action: 'Escalated due to low OCR confidence', actor: 'System', timestamp: '2026-01-02T16:00:00Z', details: 'Confidence: 45%' },
      { id: 'h2', action: 'Assigned to Mike Johnson', actor: 'System', timestamp: '2026-01-02T16:01:00Z' },
    ],
  },
  {
    id: 'esc-004',
    type: 'COMPLIANCE',
    entityId: 'prod-123',
    entityName: 'Full Spectrum CBD Oil 1000mg',
    organizationId: 'org-001',
    organizationName: 'GreenLeaf Labs',
    escalatedAt: '2026-01-02T09:00:00Z',
    escalatedBy: 'SYSTEM',
    escalationLevel: 2,
    reason: 'Multiple rule violations on single product',
    currentAssignee: 'sarah.senior@veridex.io',
    slaDeadline: '2026-01-03T09:00:00Z',
    slaStatus: 'AT_RISK',
    timeRemaining: '2h 15m',
    priority: 'HIGH',
    status: 'IN_PROGRESS',
    history: [
      { id: 'h1', action: 'Auto-escalated due to 3+ rule violations', actor: 'System', timestamp: '2026-01-02T09:00:00Z' },
    ],
  },
  {
    id: 'esc-005',
    type: 'PRODUCT',
    entityId: 'prod-456',
    entityName: 'Hemp Gummies 25mg',
    organizationId: 'org-003',
    organizationName: 'Herbal Remedies Inc',
    escalatedAt: '2026-01-02T08:00:00Z',
    escalatedBy: 'ADMIN',
    escalatedByName: 'sarah.senior@veridex.io',
    escalationLevel: 3,
    reason: 'Product recall consideration - contamination risk',
    currentAssignee: 'admin@veridex.io',
    slaDeadline: '2026-01-02T20:00:00Z',
    slaStatus: 'AT_RISK',
    timeRemaining: '6h 00m',
    priority: 'CRITICAL',
    status: 'IN_PROGRESS',
    history: [
      { id: 'h1', action: 'Escalated for recall consideration', actor: 'Sarah Miller', timestamp: '2026-01-02T08:00:00Z', details: 'Potential contamination in batch' },
      { id: 'h2', action: 'Assigned to Super Admin', actor: 'System', timestamp: '2026-01-02T08:01:00Z' },
    ],
  },
];

const mockAdmins: AdminAssignee[] = [
  { id: 'admin-001', name: 'John Admin', email: 'john.admin@veridex.io', role: 'ADMIN', activeEscalations: 2, avgResolutionTime: '2.5h' },
  { id: 'admin-002', name: 'Sarah Miller', email: 'sarah.senior@veridex.io', role: 'ADMIN', activeEscalations: 3, avgResolutionTime: '1.8h' },
  { id: 'admin-003', name: 'Mike Johnson', email: 'mike.reviewer@veridex.io', role: 'ADMIN', activeEscalations: 1, avgResolutionTime: '3.2h' },
  { id: 'admin-004', name: 'Emily Chen', email: 'emily.reviewer@veridex.io', role: 'ADMIN', activeEscalations: 0, avgResolutionTime: '2.1h' },
];

export default function EscalationsPage() {
  const [escalations, setEscalations] = useState<EscalationItem[]>(mockEscalations);
  const [searchQuery, setSearchQuery] = useState('');
  const [levelFilter, setLevelFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [priorityFilter, setPriorityFilter] = useState('all');
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [selectedEscalation, setSelectedEscalation] = useState<EscalationItem | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [lastUpdated, setLastUpdated] = useState(new Date());
  const { hasPermission } = useAdminPermissions();

  // Stats calculation
  const stats = {
    total: escalations.length,
    pending: escalations.filter(e => e.status === 'PENDING').length,
    inProgress: escalations.filter(e => e.status === 'IN_PROGRESS').length,
    breached: escalations.filter(e => e.slaStatus === 'BREACHED').length,
    atRisk: escalations.filter(e => e.slaStatus === 'AT_RISK').length,
    level3: escalations.filter(e => e.escalationLevel === 3).length,
  };

  // Filtering
  const filteredEscalations = escalations.filter(esc => {
    if (levelFilter !== 'all' && esc.escalationLevel !== parseInt(levelFilter)) return false;
    if (statusFilter !== 'all' && esc.status !== statusFilter) return false;
    if (priorityFilter !== 'all' && esc.priority !== priorityFilter) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      return (
        esc.entityName.toLowerCase().includes(q) ||
        esc.organizationName.toLowerCase().includes(q) ||
        esc.reason.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const handleRefresh = () => {
    setIsLoading(true);
    setTimeout(() => {
      setLastUpdated(new Date());
      setIsLoading(false);
    }, 500);
  };

  const handleAssign = (escalation: EscalationItem) => {
    setSelectedEscalation(escalation);
    setShowAssignModal(true);
  };

  const handleViewDetails = (escalation: EscalationItem) => {
    setSelectedEscalation(escalation);
    setShowDetailModal(true);
  };

  const handleAssignAdmin = (adminId: string) => {
    if (!selectedEscalation) return;
    const admin = mockAdmins.find(a => a.id === adminId);
    setEscalations(prev => prev.map(e =>
      e.id === selectedEscalation.id
        ? { ...e, currentAssignee: admin?.email, status: 'ASSIGNED' as const }
        : e
    ));
    setShowAssignModal(false);
    setSelectedEscalation(null);
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'CRITICAL': return 'bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-400';
      case 'HIGH': return 'bg-orange-100 text-orange-700 dark:bg-orange-500/20 dark:text-orange-400';
      case 'MEDIUM': return 'bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-400';
      default: return 'bg-slate-100 text-slate-700 dark:bg-slate-500/20 dark:text-slate-400';
    }
  };

  const getSlaColor = (status: string) => {
    switch (status) {
      case 'BREACHED': return 'text-red-500';
      case 'AT_RISK': return 'text-amber-500';
      default: return 'text-emerald-500';
    }
  };

  const getLevelBadge = (level: number) => {
    switch (level) {
      case 3: return <Badge variant="danger">Level 3 - Executive</Badge>;
      case 2: return <Badge variant="warning">Level 2 - Senior</Badge>;
      default: return <Badge variant="info">Level 1 - Standard</Badge>;
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'DOCUMENT': return <FileText className="h-4 w-4" />;
      case 'ORGANIZATION': return <Building2 className="h-4 w-4" />;
      case 'COMPLIANCE': return <AlertTriangle className="h-4 w-4" />;
      case 'PRODUCT': return <AlertOctagon className="h-4 w-4" />;
      default: return <AlertOctagon className="h-4 w-4" />;
    }
  };

  return (
    <>
      {/* Stats Row */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-6">
        <StatCard
          title="Total Active"
          value={stats.total}
          icon={<AlertOctagon className="h-5 w-5" />}
          variant="default"
        />
        <StatCard
          title="Pending Assignment"
          value={stats.pending}
          icon={<UserPlus className="h-5 w-5" />}
          variant="warning"
        />
        <StatCard
          title="In Progress"
          value={stats.inProgress}
          icon={<Play className="h-5 w-5" />}
          variant="info"
        />
        <StatCard
          title="SLA Breached"
          value={stats.breached}
          icon={<XCircle className="h-5 w-5" />}
          variant="error"
        />
        <StatCard
          title="At Risk"
          value={stats.atRisk}
          icon={<Timer className="h-5 w-5" />}
          variant="warning"
        />
        <StatCard
          title="Level 3 (Executive)"
          value={stats.level3}
          icon={<Zap className="h-5 w-5" />}
          variant="error"
        />
      </div>

      {/* Filters & Actions */}
      <Card className="mb-6">
        <CardContent className="py-4">
          <div className="flex flex-col lg:flex-row gap-4 items-start lg:items-center justify-between">
            <div className="flex flex-wrap gap-3 items-center">
              <SearchInput
                placeholder="Search escalations..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-64"
              />
              <Select
                value={levelFilter}
                onChange={(e) => setLevelFilter(e.target.value)}
                className="w-40"
              >
                <option value="all">All Levels</option>
                <option value="1">Level 1</option>
                <option value="2">Level 2</option>
                <option value="3">Level 3</option>
              </Select>
              <Select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-40"
              >
                <option value="all">All Statuses</option>
                <option value="PENDING">Pending</option>
                <option value="ASSIGNED">Assigned</option>
                <option value="IN_PROGRESS">In Progress</option>
                <option value="RESOLVED">Resolved</option>
              </Select>
              <Select
                value={priorityFilter}
                onChange={(e) => setPriorityFilter(e.target.value)}
                className="w-40"
              >
                <option value="all">All Priorities</option>
                <option value="CRITICAL">Critical</option>
                <option value="HIGH">High</option>
                <option value="MEDIUM">Medium</option>
                <option value="LOW">Low</option>
              </Select>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-xs text-slate-500 dark:text-slate-400">
                Updated: {lastUpdated.toLocaleTimeString()}
              </span>
              <Button variant="secondary" size="sm" onClick={handleRefresh} disabled={isLoading}>
                <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Escalations List */}
      <Card>
        <CardHeader className="border-b border-slate-200 dark:border-slate-700/50">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <AlertOctagon className="h-5 w-5 text-amber-500" />
              Active Escalations
              <Badge variant="default">{filteredEscalations.length}</Badge>
            </CardTitle>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="divide-y divide-slate-200 dark:divide-slate-700/50">
            {filteredEscalations.length === 0 ? (
              <div className="p-8 text-center text-slate-500 dark:text-slate-400">
                No escalations match your filters
              </div>
            ) : (
              filteredEscalations.map((escalation) => (
                <div
                  key={escalation.id}
                  className="p-4 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
                >
                  <div className="flex items-start justify-between gap-4">
                    {/* Left: Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-3 mb-2">
                        <span className={`p-1.5 rounded-lg ${
                          escalation.priority === 'CRITICAL' ? 'bg-red-100 dark:bg-red-500/20' :
                          escalation.priority === 'HIGH' ? 'bg-orange-100 dark:bg-orange-500/20' :
                          'bg-slate-100 dark:bg-slate-700/50'
                        }`}>
                          {getTypeIcon(escalation.type)}
                        </span>
                        <div>
                          <h4 className="font-medium text-slate-900 dark:text-white">
                            {escalation.entityName}
                          </h4>
                          <p className="text-sm text-slate-500 dark:text-slate-400">
                            {escalation.organizationName} • {escalation.type}
                          </p>
                        </div>
                      </div>
                      <p className="text-sm text-slate-600 dark:text-slate-300 mb-3">
                        {escalation.reason}
                      </p>
                      <div className="flex flex-wrap items-center gap-2">
                        {getLevelBadge(escalation.escalationLevel)}
                        <Badge className={getPriorityColor(escalation.priority)}>
                          {escalation.priority}
                        </Badge>
                        <Badge variant={escalation.status === 'RESOLVED' ? 'success' : 'default'}>
                          {escalation.status.replace('_', ' ')}
                        </Badge>
                        {escalation.escalatedBy === 'ADMIN' && (
                          <Badge variant="info">Manual Escalation</Badge>
                        )}
                      </div>
                    </div>
                    
                    {/* Middle: SLA Timer */}
                    <div className="flex flex-col items-center px-6 border-l border-r border-slate-200 dark:border-slate-700/50">
                      <span className="text-xs text-slate-500 dark:text-slate-400 mb-1">SLA</span>
                      <div className={`text-lg font-mono font-bold ${getSlaColor(escalation.slaStatus)}`}>
                        {escalation.timeRemaining}
                      </div>
                      <span className={`text-xs mt-1 ${getSlaColor(escalation.slaStatus)}`}>
                        {escalation.slaStatus.replace('_', ' ')}
                      </span>
                    </div>
                    
                    {/* Right: Assignee & Actions */}
                    <div className="flex flex-col items-end gap-2 min-w-[180px]">
                      <div className="text-right">
                        <span className="text-xs text-slate-500 dark:text-slate-400 block">
                          Assigned To
                        </span>
                        <span className="text-sm font-medium text-slate-900 dark:text-white">
                          {escalation.currentAssignee || 'Unassigned'}
                        </span>
                      </div>
                      <div className="flex gap-2">
                        <Button variant="secondary" size="sm" onClick={() => handleViewDetails(escalation)}>
                          <Eye className="h-4 w-4 mr-1" />
                          Details
                        </Button>
                        <PermissionGate permission={AdminPermission.ESCALATION_ASSIGN}>
                          <Button
                            variant={escalation.currentAssignee ? 'secondary' : 'primary'}
                            size="sm"
                            onClick={() => handleAssign(escalation)}
                          >
                            <UserPlus className="h-4 w-4 mr-1" />
                            {escalation.currentAssignee ? 'Reassign' : 'Assign'}
                          </Button>
                        </PermissionGate>
                      </div>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>

      {/* Admin Workload Summary */}
      <Card className="mt-6">
        <CardHeader className="border-b border-slate-200 dark:border-slate-700/50">
          <CardTitle className="flex items-center gap-2">
            <UserCog className="h-5 w-5 text-amber-500" />
            Admin Workload
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Admin</TableHead>
                <TableHead>Role</TableHead>
                <TableHead className="text-center">Active Escalations</TableHead>
                <TableHead className="text-center">Avg Resolution</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {mockAdmins.map((admin) => (
                <TableRow key={admin.id}>
                  <TableCell>
                    <div>
                      <p className="font-medium text-slate-900 dark:text-white">{admin.name}</p>
                      <p className="text-sm text-slate-500 dark:text-slate-400">{admin.email}</p>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="warning">
                      {admin.role}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-center">
                    <span className={`font-semibold ${admin.activeEscalations > 2 ? 'text-amber-500' : 'text-slate-900 dark:text-white'}`}>
                      {admin.activeEscalations}
                    </span>
                  </TableCell>
                  <TableCell className="text-center text-slate-600 dark:text-slate-300">
                    {admin.avgResolutionTime}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="sm">
                      <Eye className="h-4 w-4 mr-1" />
                      View Activity
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Assign Modal */}
      <Modal
        isOpen={showAssignModal}
        onClose={() => setShowAssignModal(false)}
        title="Assign Escalation"
      >
        <div className="space-y-4">
          {selectedEscalation && (
            <div className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-lg">
              <h4 className="font-medium text-slate-900 dark:text-white mb-1">
                {selectedEscalation.entityName}
              </h4>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                {selectedEscalation.reason}
              </p>
            </div>
          )}
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
              Select Admin
            </label>
            <div className="space-y-2">
              {mockAdmins.map((admin) => (
                <button
                  key={admin.id}
                  onClick={() => handleAssignAdmin(admin.id)}
                  className="w-full p-3 text-left border border-slate-200 dark:border-slate-700/50 rounded-lg hover:border-amber-500 hover:bg-amber-50 dark:hover:bg-amber-500/10 transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium text-slate-900 dark:text-white">{admin.name}</p>
                      <p className="text-sm text-slate-500 dark:text-slate-400">{admin.email}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-medium text-slate-600 dark:text-slate-300">
                        {admin.activeEscalations} active
                      </p>
                      <p className="text-xs text-slate-400">Avg: {admin.avgResolutionTime}</p>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      </Modal>

      {/* Detail Modal */}
      <Modal
        isOpen={showDetailModal}
        onClose={() => setShowDetailModal(false)}
        title="Escalation Details"
        size="lg"
      >
        {selectedEscalation && (
          <div className="space-y-6">
            {/* Header Info */}
            <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-lg">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <h4 className="font-semibold text-lg text-slate-900 dark:text-white">
                    {selectedEscalation.entityName}
                  </h4>
                  <p className="text-slate-500 dark:text-slate-400">
                    {selectedEscalation.organizationName}
                  </p>
                </div>
                {getLevelBadge(selectedEscalation.escalationLevel)}
              </div>
              <p className="text-slate-600 dark:text-slate-300 mb-3">
                {selectedEscalation.reason}
              </p>
              {selectedEscalation.notes && (
                <div className="p-2 bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/30 rounded text-sm text-amber-800 dark:text-amber-300">
                  <strong>Note:</strong> {selectedEscalation.notes}
                </div>
              )}
            </div>

            {/* Timeline */}
            <div>
              <h5 className="font-medium text-slate-900 dark:text-white mb-3 flex items-center gap-2">
                <History className="h-4 w-4" />
                Escalation Timeline
              </h5>
              <div className="space-y-3">
                {selectedEscalation.history.map((item, index) => (
                  <div key={item.id} className="flex gap-3">
                    <div className="flex flex-col items-center">
                      <div className={`w-2.5 h-2.5 rounded-full ${index === 0 ? 'bg-amber-500' : 'bg-slate-300 dark:bg-slate-600'}`} />
                      {index < selectedEscalation.history.length - 1 && (
                        <div className="w-0.5 h-full bg-slate-200 dark:bg-slate-700" />
                      )}
                    </div>
                    <div className="flex-1 pb-4">
                      <p className="font-medium text-slate-900 dark:text-white text-sm">
                        {item.action}
                      </p>
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        {item.actor} • {new Date(item.timestamp).toLocaleString()}
                      </p>
                      {item.details && (
                        <p className="text-xs text-slate-600 dark:text-slate-300 mt-1">
                          {item.details}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Actions */}
            <div className="flex justify-end gap-3 pt-4 border-t border-slate-200 dark:border-slate-700/50">
              <Button variant="secondary" onClick={() => setShowDetailModal(false)}>
                Close
              </Button>
              <PermissionGate permission={AdminPermission.ESCALATION_ASSIGN}>
                <Button variant="primary" onClick={() => {
                  setShowDetailModal(false);
                  handleAssign(selectedEscalation);
                }}>
                  <UserPlus className="h-4 w-4 mr-2" />
                  {selectedEscalation.currentAssignee ? 'Reassign' : 'Assign'}
                </Button>
              </PermissionGate>
            </div>
          </div>
        )}
    </Modal>
    </>
  );
}
