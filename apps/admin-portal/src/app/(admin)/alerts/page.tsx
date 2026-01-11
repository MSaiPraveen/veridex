'use client';

import { useState, useEffect } from 'react';
import {
  AlertTriangle,
  Bell,
  Clock,
  CheckCircle,
  XCircle,
  Eye,
  EyeOff,
  User,
  Users,
  Filter,
  ChevronDown,
  ChevronUp,
  ArrowUpRight,
  Shield,
  FileText,
  Building2,
  Timer,
  AlertOctagon,
  Zap,
  Volume2,
  VolumeX,
  MoreVertical,
  Trash2,
  UserPlus,
  RefreshCw
} from 'lucide-react';
import Link from 'next/link';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { SearchInput, Select, Textarea } from '@/components/ui/input';
import { Modal } from '@/components/ui/modal';
import { Dropdown, DropdownItem } from '@/components/ui/dropdown';
import { PermissionGate } from '@/components/auth/permission-gate';
import { AdminPermission } from '@/lib/admin-rbac';

type AlertSeverity = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
type AlertStatus = 'OPEN' | 'ACKNOWLEDGED' | 'IN_PROGRESS' | 'RESOLVED' | 'SUPPRESSED';
type AlertCategory = 'COMPLIANCE' | 'DOCUMENT' | 'SYSTEM' | 'SECURITY' | 'SLA';

interface Alert {
  id: string;
  title: string;
  description: string;
  severity: AlertSeverity;
  status: AlertStatus;
  category: AlertCategory;
  createdAt: string;
  slaDeadline: string | null;
  escalationLevel: number;
  escalationRule: string | null;
  assignedTo: string | null;
  relatedEntity: {
    type: 'document' | 'organization' | 'product' | 'rule';
    id: string;
    name: string;
  } | null;
  acknowledgedAt: string | null;
  resolvedAt: string | null;
  notes: string[];
}

const mockAlerts: Alert[] = [
  {
    id: 'alert-001',
    title: 'THC Limit Exceeded - Multiple Products',
    description: 'GreenLeaf Labs has 5 documents flagged for THC content above California limit (0.3%)',
    severity: 'CRITICAL',
    status: 'OPEN',
    category: 'COMPLIANCE',
    createdAt: '2026-01-02T10:30:00Z',
    slaDeadline: '2026-01-02T14:30:00Z',
    escalationLevel: 1,
    escalationRule: 'Auto-escalate to Senior Analyst after 2h',
    assignedTo: null,
    relatedEntity: { type: 'organization', id: 'org-001', name: 'GreenLeaf Labs' },
    acknowledgedAt: null,
    resolvedAt: null,
    notes: [],
  },
  {
    id: 'alert-002',
    title: 'SLA Breach Risk - 12 Pending Reviews',
    description: 'Review queue approaching SLA limit. 12 documents will breach 24h SLA within 2 hours.',
    severity: 'HIGH',
    status: 'ACKNOWLEDGED',
    category: 'SLA',
    createdAt: '2026-01-02T09:00:00Z',
    slaDeadline: '2026-01-02T12:00:00Z',
    escalationLevel: 2,
    escalationRule: 'Escalated to Compliance Manager',
    assignedTo: 'Sarah Chen',
    relatedEntity: null,
    acknowledgedAt: '2026-01-02T09:15:00Z',
    resolvedAt: null,
    notes: ['Working on clearing backlog', 'Assigned additional reviewer'],
  },
  {
    id: 'alert-003',
    title: 'OCR Processing Failure Rate Spike',
    description: 'Document processing failure rate increased to 15% (threshold: 5%). Likely format issue.',
    severity: 'HIGH',
    status: 'IN_PROGRESS',
    category: 'SYSTEM',
    createdAt: '2026-01-02T08:30:00Z',
    slaDeadline: null,
    escalationLevel: 0,
    escalationRule: null,
    assignedTo: 'DevOps Team',
    relatedEntity: null,
    acknowledgedAt: '2026-01-02T08:45:00Z',
    resolvedAt: null,
    notes: ['Investigating OCR engine logs', 'Found issue with rotated PDFs'],
  },
  {
    id: 'alert-004',
    title: 'New Merchant High-Risk Flag',
    description: 'FastCBD Distribution marked as high-risk by compliance scoring. Requires review.',
    severity: 'MEDIUM',
    status: 'OPEN',
    category: 'COMPLIANCE',
    createdAt: '2026-01-02T07:45:00Z',
    slaDeadline: '2026-01-03T07:45:00Z',
    escalationLevel: 0,
    escalationRule: 'Auto-escalate after 24h if unassigned',
    assignedTo: null,
    relatedEntity: { type: 'organization', id: 'org-003', name: 'FastCBD Distribution' },
    acknowledgedAt: null,
    resolvedAt: null,
    notes: [],
  },
  {
    id: 'alert-005',
    title: 'Suspicious Login Attempt',
    description: 'Multiple failed login attempts from new IP for admin user admin@veridex.io',
    severity: 'CRITICAL',
    status: 'RESOLVED',
    category: 'SECURITY',
    createdAt: '2026-01-01T22:00:00Z',
    slaDeadline: '2026-01-01T22:30:00Z',
    escalationLevel: 0,
    escalationRule: null,
    assignedTo: 'Security Team',
    relatedEntity: null,
    acknowledgedAt: '2026-01-01T22:05:00Z',
    resolvedAt: '2026-01-01T22:20:00Z',
    notes: ['IP blocked', 'User notified', 'Password reset enforced'],
  },
  {
    id: 'alert-006',
    title: 'Document Expiration Warning',
    description: 'CBD Labs Inc has 8 COA documents expiring within 30 days',
    severity: 'LOW',
    status: 'SUPPRESSED',
    category: 'DOCUMENT',
    createdAt: '2026-01-01T10:00:00Z',
    slaDeadline: null,
    escalationLevel: 0,
    escalationRule: null,
    assignedTo: null,
    relatedEntity: { type: 'organization', id: 'org-002', name: 'CBD Labs Inc' },
    acknowledgedAt: null,
    resolvedAt: null,
    notes: ['Suppressed: Merchant already notified via email'],
  },
];

const suppressionRules = [
  { id: 'supp-001', name: 'Expiration Warnings (30-day)', pattern: 'Document Expiration Warning', duration: '7 days' },
  { id: 'supp-002', name: 'Low severity after hours', pattern: 'severity=LOW AND time=18:00-08:00', duration: 'Until next business day' },
];

export default function AlertsPage() {
  const [alerts, setAlerts] = useState<Alert[]>(mockAlerts);
  const [searchQuery, setSearchQuery] = useState('');
  const [severityFilter, setSeverityFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [selectedAlerts, setSelectedAlerts] = useState<string[]>([]);
  const [showActionModal, setShowActionModal] = useState(false);
  const [actionType, setActionType] = useState<'acknowledge' | 'assign' | 'resolve' | 'suppress' | null>(null);
  const [actionNote, setActionNote] = useState('');
  const [expandedAlert, setExpandedAlert] = useState<string | null>(null);
  const [showSuppressRulesModal, setShowSuppressRulesModal] = useState(false);
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const filteredAlerts = alerts.filter(alert => {
    const matchesSearch = alert.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      alert.description.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesSeverity = severityFilter === 'all' || alert.severity === severityFilter;
    const matchesStatus = statusFilter === 'all' || alert.status === statusFilter;
    const matchesCategory = categoryFilter === 'all' || alert.category === categoryFilter;
    return matchesSearch && matchesSeverity && matchesStatus && matchesCategory;
  });

  const openAlerts = alerts.filter(a => a.status === 'OPEN').length;
  const criticalAlerts = alerts.filter(a => a.severity === 'CRITICAL' && a.status !== 'RESOLVED').length;
  const slaAtRisk = alerts.filter(a => {
    if (!a.slaDeadline || a.status === 'RESOLVED') return false;
    const remaining = new Date(a.slaDeadline).getTime() - now.getTime();
    return remaining > 0 && remaining < 2 * 60 * 60 * 1000; // 2 hours
  }).length;

  const getSeverityColor = (severity: AlertSeverity) => {
    switch (severity) {
      case 'CRITICAL': return 'bg-red-500/10 text-red-400 border-red-500/30';
      case 'HIGH': return 'bg-amber-500/10 text-amber-400 border-amber-500/30';
      case 'MEDIUM': return 'bg-blue-500/10 text-blue-400 border-blue-500/30';
      case 'LOW': return 'bg-slate-500/10 text-slate-400 border-slate-500/30';
    }
  };

  const getStatusColor = (status: AlertStatus) => {
    switch (status) {
      case 'OPEN': return 'bg-red-500/10 text-red-400';
      case 'ACKNOWLEDGED': return 'bg-amber-500/10 text-amber-400';
      case 'IN_PROGRESS': return 'bg-blue-500/10 text-blue-400';
      case 'RESOLVED': return 'bg-emerald-500/10 text-emerald-400';
      case 'SUPPRESSED': return 'bg-slate-500/10 text-slate-400';
    }
  };

  const getCategoryIcon = (category: AlertCategory) => {
    switch (category) {
      case 'COMPLIANCE': return <Shield className="h-4 w-4" />;
      case 'DOCUMENT': return <FileText className="h-4 w-4" />;
      case 'SYSTEM': return <AlertOctagon className="h-4 w-4" />;
      case 'SECURITY': return <Zap className="h-4 w-4" />;
      case 'SLA': return <Timer className="h-4 w-4" />;
    }
  };

  const getSlaStatus = (deadline: string) => {
    const remaining = new Date(deadline).getTime() - now.getTime();
    if (remaining <= 0) return { label: 'BREACHED', color: 'text-red-400', urgent: true };
    if (remaining < 60 * 60 * 1000) return { label: formatTime(remaining), color: 'text-red-400', urgent: true };
    if (remaining < 2 * 60 * 60 * 1000) return { label: formatTime(remaining), color: 'text-amber-400', urgent: true };
    return { label: formatTime(remaining), color: 'text-slate-400', urgent: false };
  };

  const formatTime = (ms: number) => {
    if (ms <= 0) return 'Overdue';
    const hours = Math.floor(ms / (1000 * 60 * 60));
    const minutes = Math.floor((ms % (1000 * 60 * 60)) / (1000 * 60));
    if (hours > 24) return `${Math.floor(hours / 24)}d ${hours % 24}h`;
    if (hours > 0) return `${hours}h ${minutes}m`;
    return `${minutes}m`;
  };

  const handleBulkAction = (type: 'acknowledge' | 'assign' | 'resolve' | 'suppress') => {
    setActionType(type);
    setShowActionModal(true);
  };

  const toggleSelectAll = () => {
    if (selectedAlerts.length === filteredAlerts.length) {
      setSelectedAlerts([]);
    } else {
      setSelectedAlerts(filteredAlerts.map(a => a.id));
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Alerts Management</h1>
          <p className="text-sm text-slate-600 dark:text-slate-400">Monitor and respond to system alerts and compliance issues</p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="secondary"
            size="sm"
            onClick={() => setShowSuppressRulesModal(true)}
          >
            <VolumeX className="h-4 w-4 mr-1" />
            Suppression Rules
          </Button>
          <Button variant="secondary" size="sm">
            <RefreshCw className="h-4 w-4 mr-1" />
            Refresh
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-4 gap-4">
        <Card className="bg-red-500/10 border-red-500/20">
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-400">Critical Alerts</p>
                <p className="text-3xl font-bold text-red-400">{criticalAlerts}</p>
              </div>
              <AlertOctagon className="h-10 w-10 text-red-400/50" />
            </div>
          </CardContent>
        </Card>
        <Card className="bg-amber-500/10 border-amber-500/20">
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-400">Open Alerts</p>
                <p className="text-3xl font-bold text-amber-400">{openAlerts}</p>
              </div>
              <AlertTriangle className="h-10 w-10 text-amber-400/50" />
            </div>
          </CardContent>
        </Card>
        <Card className="bg-blue-500/10 border-blue-500/20">
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-400">SLA At Risk</p>
                <p className="text-3xl font-bold text-blue-400">{slaAtRisk}</p>
              </div>
              <Clock className="h-10 w-10 text-blue-400/50" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-400">Resolved Today</p>
                <p className="text-3xl font-bold text-emerald-400">
                  {alerts.filter(a => a.status === 'RESOLVED').length}
                </p>
              </div>
              <CheckCircle className="h-10 w-10 text-emerald-400/50" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-4">
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex-1 min-w-[200px]">
              <SearchInput
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search alerts..."
              />
            </div>
            <Select
              value={severityFilter}
              onChange={(e) => setSeverityFilter(e.target.value)}
              options={[
                { value: 'all', label: 'All Severities' },
                { value: 'CRITICAL', label: 'Critical' },
                { value: 'HIGH', label: 'High' },
                { value: 'MEDIUM', label: 'Medium' },
                { value: 'LOW', label: 'Low' },
              ]}
            />
            <Select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              options={[
                { value: 'all', label: 'All Statuses' },
                { value: 'OPEN', label: 'Open' },
                { value: 'ACKNOWLEDGED', label: 'Acknowledged' },
                { value: 'IN_PROGRESS', label: 'In Progress' },
                { value: 'RESOLVED', label: 'Resolved' },
                { value: 'SUPPRESSED', label: 'Suppressed' },
              ]}
            />
            <Select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              options={[
                { value: 'all', label: 'All Categories' },
                { value: 'COMPLIANCE', label: 'Compliance' },
                { value: 'DOCUMENT', label: 'Document' },
                { value: 'SYSTEM', label: 'System' },
                { value: 'SECURITY', label: 'Security' },
                { value: 'SLA', label: 'SLA' },
              ]}
            />
          </div>
        </CardContent>
      </Card>

      {/* Bulk Actions */}
      {selectedAlerts.length > 0 && (
        <div className="bg-amber-500/10 rounded-xl p-4 border border-amber-500/20 flex items-center justify-between">
          <span className="text-amber-400">
            {selectedAlerts.length} alert(s) selected
          </span>
          <div className="flex items-center gap-2">
            <Button variant="secondary" size="sm" onClick={() => handleBulkAction('acknowledge')}>
              <Eye className="h-4 w-4 mr-1" />
              Acknowledge
            </Button>
            <Button variant="secondary" size="sm" onClick={() => handleBulkAction('assign')}>
              <UserPlus className="h-4 w-4 mr-1" />
              Assign
            </Button>
            <Button variant="secondary" size="sm" onClick={() => handleBulkAction('resolve')}>
              <CheckCircle className="h-4 w-4 mr-1" />
              Resolve
            </Button>
            <Button variant="secondary" size="sm" onClick={() => handleBulkAction('suppress')}>
              <VolumeX className="h-4 w-4 mr-1" />
              Suppress
            </Button>
            <Button variant="ghost" size="sm" onClick={() => setSelectedAlerts([])}>
              Clear
            </Button>
          </div>
        </div>
      )}

      {/* Alerts List */}
      <div className="space-y-3">
        {/* Select All Header */}
        <div className="flex items-center gap-3 px-4">
          <input
            type="checkbox"
            checked={selectedAlerts.length === filteredAlerts.length && filteredAlerts.length > 0}
            onChange={toggleSelectAll}
            className="h-4 w-4 rounded border-slate-600 bg-slate-700 text-amber-500 focus:ring-amber-500/20"
          />
          <span className="text-sm text-slate-400">
            {filteredAlerts.length} alerts
          </span>
        </div>

        {filteredAlerts.map((alert) => {
          const isExpanded = expandedAlert === alert.id;
          const slaStatus = alert.slaDeadline ? getSlaStatus(alert.slaDeadline) : null;

          return (
            <Card
              key={alert.id}
              className={`transition-all ${alert.severity === 'CRITICAL' && alert.status === 'OPEN'
                ? 'border-red-500/50 animate-pulse-subtle'
                : ''
                }`}
            >
              <CardContent className="p-4">
                <div className="flex items-start gap-4">
                  {/* Checkbox */}
                  <input
                    type="checkbox"
                    checked={selectedAlerts.includes(alert.id)}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setSelectedAlerts([...selectedAlerts, alert.id]);
                      } else {
                        setSelectedAlerts(selectedAlerts.filter(id => id !== alert.id));
                      }
                    }}
                    className="h-4 w-4 mt-1 rounded border-slate-600 bg-slate-700 text-amber-500 focus:ring-amber-500/20"
                  />

                  {/* Severity Indicator */}
                  <div className={`p-2 rounded-lg ${getSeverityColor(alert.severity)}`}>
                    {getCategoryIcon(alert.category)}
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between mb-1">
                      <div>
                        <h3 className="text-slate-900 dark:text-white font-medium">{alert.title}</h3>
                        <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">{alert.description}</p>
                      </div>
                      <div className="flex items-center gap-2 ml-4 flex-shrink-0">
                        <span className={`px-2 py-0.5 rounded text-xs font-medium ${getStatusColor(alert.status)}`}>
                          {alert.status.replace('_', ' ')}
                        </span>
                        <span className={`px-2 py-0.5 rounded text-xs font-medium ${getSeverityColor(alert.severity)}`}>
                          {alert.severity}
                        </span>
                      </div>
                    </div>

                    {/* Meta Row */}
                    <div className="flex items-center gap-4 mt-3 text-sm">
                      <span className="text-slate-500 flex items-center gap-1">
                        <Clock className="h-3.5 w-3.5" />
                        {new Date(alert.createdAt).toLocaleString()}
                      </span>

                      {alert.assignedTo && (
                        <span className="text-slate-400 flex items-center gap-1">
                          <User className="h-3.5 w-3.5" />
                          {alert.assignedTo}
                        </span>
                      )}

                      {alert.relatedEntity && (
                        <Link
                          href={`/${alert.relatedEntity.type}s/${alert.relatedEntity.id}`}
                          className="text-amber-400 hover:text-amber-300 flex items-center gap-1"
                        >
                          <Building2 className="h-3.5 w-3.5" />
                          {alert.relatedEntity.name}
                          <ArrowUpRight className="h-3 w-3" />
                        </Link>
                      )}

                      {slaStatus && (
                        <span className={`flex items-center gap-1 ${slaStatus.color} ${slaStatus.urgent ? 'font-medium' : ''}`}>
                          <Timer className="h-3.5 w-3.5" />
                          SLA: {slaStatus.label}
                        </span>
                      )}

                      {alert.escalationLevel > 0 && (
                        <span className="text-purple-400 flex items-center gap-1">
                          <ArrowUpRight className="h-3.5 w-3.5" />
                          Escalation L{alert.escalationLevel}
                        </span>
                      )}
                    </div>

                    {/* Expanded Content */}
                    {isExpanded && (
                      <div className="mt-4 pt-4 border-t border-slate-700/50 space-y-4">
                        {alert.escalationRule && (
                          <div>
                            <p className="text-xs text-slate-500 uppercase tracking-wide mb-1">Escalation Rule</p>
                            <p className="text-sm text-slate-300">{alert.escalationRule}</p>
                          </div>
                        )}

                        {alert.notes.length > 0 && (
                          <div>
                            <p className="text-xs text-slate-500 uppercase tracking-wide mb-2">Notes</p>
                            <div className="space-y-2">
                              {alert.notes.map((note, idx) => (
                                <div key={idx} className="text-sm text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 rounded p-2">
                                  {note}
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Quick Actions */}
                        <div className="flex items-center gap-2">
                          {alert.status === 'OPEN' && (
                            <Button variant="secondary" size="sm">
                              <Eye className="h-4 w-4 mr-1" />
                              Acknowledge
                            </Button>
                          )}
                          {alert.status !== 'RESOLVED' && alert.status !== 'SUPPRESSED' && (
                            <>
                              <Button variant="secondary" size="sm">
                                <UserPlus className="h-4 w-4 mr-1" />
                                Assign
                              </Button>
                              <Button variant="primary" size="sm">
                                <CheckCircle className="h-4 w-4 mr-1" />
                                Resolve
                              </Button>
                            </>
                          )}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setExpandedAlert(isExpanded ? null : alert.id)}
                    >
                      {isExpanded ? (
                        <ChevronUp className="h-4 w-4" />
                      ) : (
                        <ChevronDown className="h-4 w-4" />
                      )}
                    </Button>
                    <Dropdown
                      trigger={
                        <button className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-700/50">
                          <MoreVertical className="h-4 w-4" />
                        </button>
                      }
                    >
                      <DropdownItem>
                        <Eye className="h-4 w-4 mr-2" />
                        Acknowledge
                      </DropdownItem>
                      <DropdownItem>
                        <UserPlus className="h-4 w-4 mr-2" />
                        Assign
                      </DropdownItem>
                      <DropdownItem>
                        <CheckCircle className="h-4 w-4 mr-2" />
                        Resolve
                      </DropdownItem>
                      <DropdownItem>
                        <VolumeX className="h-4 w-4 mr-2" />
                        Suppress
                      </DropdownItem>
                      <DropdownItem danger>
                        <Trash2 className="h-4 w-4 mr-2" />
                        Delete
                      </DropdownItem>
                    </Dropdown>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {filteredAlerts.length === 0 && (
        <div className="text-center py-12">
          <Bell className="h-16 w-16 text-slate-600 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-slate-900 dark:text-white mb-2">No alerts found</h3>
          <p className="text-slate-600 dark:text-slate-400">No alerts match your current filters</p>
        </div>
      )}

      {/* Bulk Action Modal */}
      <Modal
        isOpen={showActionModal}
        onClose={() => {
          setShowActionModal(false);
          setActionNote('');
        }}
        title={
          actionType === 'acknowledge' ? 'Acknowledge Alerts' :
            actionType === 'assign' ? 'Assign Alerts' :
              actionType === 'resolve' ? 'Resolve Alerts' :
                'Suppress Alerts'
        }
        description={`Apply this action to ${selectedAlerts.length} selected alert(s)`}
      >
        <div className="space-y-4">
          {actionType === 'assign' && (
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Assign to
              </label>
              <Select
                value=""
                onChange={() => { }}
                options={[
                  { value: '', label: 'Select assignee...' },
                  { value: 'sarah', label: 'Sarah Chen' },
                  { value: 'mike', label: 'Mike Johnson' },
                  { value: 'devops', label: 'DevOps Team' },
                  { value: 'security', label: 'Security Team' },
                ]}
              />
            </div>
          )}

          {actionType === 'suppress' && (
            <div className="p-3 bg-amber-500/10 rounded-lg border border-amber-500/20">
              <p className="text-sm text-amber-400">
                Suppressed alerts will not generate notifications but remain visible in the system.
              </p>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Note (optional)
            </label>
            <Textarea
              value={actionNote}
              onChange={(e) => setActionNote(e.target.value)}
              placeholder="Add a note for this action..."
              rows={3}
            />
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <Button variant="secondary" onClick={() => setShowActionModal(false)}>
              Cancel
            </Button>
            <Button variant="primary">
              Apply to {selectedAlerts.length} Alert(s)
            </Button>
          </div>
        </div>
      </Modal>

      {/* Suppression Rules Modal */}
      <Modal
        isOpen={showSuppressRulesModal}
        onClose={() => setShowSuppressRulesModal(false)}
        title="Alert Suppression Rules"
        description="Manage automatic suppression of alerts matching specific patterns"
      >
        <div className="space-y-4">
          {suppressionRules.map((rule) => (
            <div key={rule.id} className="p-4 bg-slate-100 dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-slate-900 dark:text-white font-medium">{rule.name}</p>
                  <p className="text-sm text-slate-600 dark:text-slate-400 font-mono mt-1">{rule.pattern}</p>
                  <p className="text-xs text-slate-500 mt-2">Duration: {rule.duration}</p>
                </div>
                <Button variant="ghost" size="sm" className="text-red-400">
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ))}

          <Button variant="secondary" className="w-full">
            <VolumeX className="h-4 w-4 mr-2" />
            Add Suppression Rule
          </Button>
        </div>
      </Modal>
    </div>
  );
}
