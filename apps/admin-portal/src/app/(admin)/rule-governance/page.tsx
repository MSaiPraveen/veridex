'use client';

import { useState } from 'react';
import {
  BookOpen,
  Search,
  Plus,
  Eye,
  Edit,
  CheckCircle,
  Clock,
  AlertTriangle,
  Play,
  Pause,
  History,
  Copy,
  Trash2,
  TestTube,
  FileCode,
  Calendar,
  RotateCcw,
  GitBranch,
  Target,
  Shield,
  ChevronRight,
  ChevronDown,
  Save,
  X
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { SearchInput, Select, Input, Textarea, Checkbox } from '@/components/ui/input';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell, Pagination } from '@/components/ui/table';
import { Modal } from '@/components/ui/modal';
import { Dropdown, DropdownItem, DropdownDivider } from '@/components/ui/dropdown';
import { PermissionGate } from '@/components/auth/permission-gate';
import { AdminPermission } from '@/lib/admin-rbac';

// Types
interface ComplianceRule {
  id: string;
  code: string;
  name: string;
  description: string;
  category: 'THC_LIMITS' | 'LABELING' | 'DOCUMENTATION' | 'TESTING' | 'LICENSING' | 'PACKAGING';
  scope: {
    jurisdictions: string[];
    productCategories: string[];
    documentTypes: string[];
  };
  thresholds: Record<string, number | string | boolean>;
  status: 'ACTIVE' | 'INACTIVE' | 'DRAFT' | 'SCHEDULED' | 'DEPRECATED';
  version: number;
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  effectiveDate: string;
  expirationDate?: string;
  scheduledActivation?: string;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  triggersCount: number;
  impactedEntities?: number;
  changeHistory: RuleChange[];
}

interface RuleChange {
  id: string;
  version: number;
  changedBy: string;
  changedAt: string;
  changes: string;
  reason: string;
}

// Mock data
const mockRules: ComplianceRule[] = [
  {
    id: 'rule-001',
    code: 'THC-CA-001',
    name: 'California THC Limit',
    description: 'THC content must not exceed 0.3% for hemp products sold in California. This applies to all CBD and hemp-derived products intended for human consumption.',
    category: 'THC_LIMITS',
    scope: {
      jurisdictions: ['California'],
      productCategories: ['CBD', 'EDIBLES', 'TINCTURES', 'TOPICALS'],
      documentTypes: ['LAB_REPORT', 'COA'],
    },
    thresholds: { maxTHC: 0.3, unit: 'percent' },
    status: 'ACTIVE',
    version: 3,
    severity: 'CRITICAL',
    effectiveDate: '2024-01-01',
    createdBy: 'admin@veridex.io',
    createdAt: '2023-11-15T10:00:00Z',
    updatedAt: '2025-12-15T10:00:00Z',
    triggersCount: 156,
    impactedEntities: 847,
    changeHistory: [
      { id: 'ch-1', version: 3, changedBy: 'admin@veridex.io', changedAt: '2025-12-15T10:00:00Z', changes: 'Updated threshold from 0.25% to 0.3%', reason: 'Aligned with federal guidelines' },
      { id: 'ch-2', version: 2, changedBy: 'compliance@veridex.io', changedAt: '2024-06-01T09:00:00Z', changes: 'Added TOPICALS to product categories', reason: 'Regulatory update' },
    ]
  },
  {
    id: 'rule-002',
    code: 'LAB-OR-001',
    name: 'Oregon Labeling Requirements',
    description: 'All CBD products must include batch number, manufacturer info, and QR code linking to COA.',
    category: 'LABELING',
    scope: {
      jurisdictions: ['Oregon'],
      productCategories: ['CBD', 'EDIBLES'],
      documentTypes: ['BUSINESS_LICENSE', 'COA'],
    },
    thresholds: { requiresBatchNumber: true, requiresQRCode: true },
    status: 'ACTIVE',
    version: 2,
    severity: 'HIGH',
    effectiveDate: '2024-06-01',
    createdBy: 'admin@veridex.io',
    createdAt: '2024-01-10T14:30:00Z',
    updatedAt: '2024-12-01T11:00:00Z',
    triggersCount: 89,
    impactedEntities: 234,
    changeHistory: []
  },
  {
    id: 'rule-003',
    code: 'DOC-FED-001',
    name: 'COA Validity Period',
    description: 'Certificate of Analysis must be dated within the last 12 months.',
    category: 'DOCUMENTATION',
    scope: {
      jurisdictions: ['Federal'],
      productCategories: ['ALL'],
      documentTypes: ['COA'],
    },
    thresholds: { maxAge: 365, unit: 'days' },
    status: 'ACTIVE',
    version: 1,
    severity: 'MEDIUM',
    effectiveDate: '2024-01-01',
    createdBy: 'admin@veridex.io',
    createdAt: '2023-12-01T09:00:00Z',
    updatedAt: '2023-12-01T09:00:00Z',
    triggersCount: 234,
    impactedEntities: 1205,
    changeHistory: []
  },
  {
    id: 'rule-004',
    code: 'TEST-NY-001',
    name: 'New York Heavy Metals Testing',
    description: 'All products must have passed heavy metals testing (Pb, Hg, As, Cd) within acceptable limits.',
    category: 'TESTING',
    scope: {
      jurisdictions: ['New York'],
      productCategories: ['CBD', 'EDIBLES', 'CAPSULES'],
      documentTypes: ['LAB_REPORT'],
    },
    thresholds: { leadMax: 0.5, mercuryMax: 0.1, arsenicMax: 0.2, cadmiumMax: 0.2, unit: 'ppm' },
    status: 'SCHEDULED',
    version: 1,
    severity: 'CRITICAL',
    effectiveDate: '2026-03-01',
    scheduledActivation: '2026-03-01T00:00:00Z',
    createdBy: 'compliance@veridex.io',
    createdAt: '2025-12-20T10:00:00Z',
    updatedAt: '2025-12-20T10:00:00Z',
    triggersCount: 0,
    impactedEntities: 456,
    changeHistory: []
  },
  {
    id: 'rule-005',
    code: 'LIC-CO-001',
    name: 'Colorado Business License',
    description: 'Merchants must have valid Colorado hemp business license.',
    category: 'LICENSING',
    scope: {
      jurisdictions: ['Colorado'],
      productCategories: ['ALL'],
      documentTypes: ['BUSINESS_LICENSE'],
    },
    thresholds: { mustBeValid: true },
    status: 'INACTIVE',
    version: 2,
    severity: 'HIGH',
    effectiveDate: '2023-01-01',
    expirationDate: '2025-12-31',
    createdBy: 'admin@veridex.io',
    createdAt: '2022-11-01T10:00:00Z',
    updatedAt: '2025-12-01T10:00:00Z',
    triggersCount: 45,
    impactedEntities: 0,
    changeHistory: []
  },
];

const statusConfig: Record<string, { bg: string; text: string; icon: typeof Play }> = {
  ACTIVE: { bg: 'bg-emerald-500/10', text: 'text-emerald-400', icon: Play },
  INACTIVE: { bg: 'bg-slate-500/10', text: 'text-slate-400', icon: Pause },
  DRAFT: { bg: 'bg-blue-500/10', text: 'text-blue-400', icon: FileCode },
  SCHEDULED: { bg: 'bg-purple-500/10', text: 'text-purple-400', icon: Calendar },
  DEPRECATED: { bg: 'bg-red-500/10', text: 'text-red-400', icon: AlertTriangle },
};

const severityConfig: Record<string, { bg: string; text: string }> = {
  LOW: { bg: 'bg-slate-500/10', text: 'text-slate-400' },
  MEDIUM: { bg: 'bg-blue-500/10', text: 'text-blue-400' },
  HIGH: { bg: 'bg-amber-500/10', text: 'text-amber-400' },
  CRITICAL: { bg: 'bg-red-500/10', text: 'text-red-400' },
};

const categoryConfig: Record<string, { bg: string; text: string; label: string }> = {
  THC_LIMITS: { bg: 'bg-purple-500/10', text: 'text-purple-400', label: 'THC Limits' },
  LABELING: { bg: 'bg-blue-500/10', text: 'text-blue-400', label: 'Labeling' },
  DOCUMENTATION: { bg: 'bg-emerald-500/10', text: 'text-emerald-400', label: 'Documentation' },
  TESTING: { bg: 'bg-cyan-500/10', text: 'text-cyan-400', label: 'Testing' },
  LICENSING: { bg: 'bg-amber-500/10', text: 'text-amber-400', label: 'Licensing' },
  PACKAGING: { bg: 'bg-pink-500/10', text: 'text-pink-400', label: 'Packaging' },
};

type TabType = 'all' | 'active' | 'scheduled' | 'history';

export default function RuleGovernancePage() {
  const [activeTab, setActiveTab] = useState<TabType>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('ALL');
  const [severityFilter, setSeverityFilter] = useState('ALL');
  const [selectedRule, setSelectedRule] = useState<ComplianceRule | null>(null);
  const [showRuleModal, setShowRuleModal] = useState(false);
  const [showImpactModal, setShowImpactModal] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [expandedRule, setExpandedRule] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);

  const filteredRules = mockRules.filter(rule => {
    if (activeTab === 'active' && rule.status !== 'ACTIVE') return false;
    if (activeTab === 'scheduled' && rule.status !== 'SCHEDULED') return false;
    if (categoryFilter !== 'ALL' && rule.category !== categoryFilter) return false;
    if (severityFilter !== 'ALL' && rule.severity !== severityFilter) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      return rule.name.toLowerCase().includes(q) ||
        rule.code.toLowerCase().includes(q) ||
        rule.description.toLowerCase().includes(q);
    }
    return true;
  });

  const stats = {
    total: mockRules.length,
    active: mockRules.filter(r => r.status === 'ACTIVE').length,
    scheduled: mockRules.filter(r => r.status === 'SCHEDULED').length,
    critical: mockRules.filter(r => r.severity === 'CRITICAL').length,
  };

  const tabs: { id: TabType; label: string; count?: number }[] = [
    { id: 'all', label: 'All Rules', count: stats.total },
    { id: 'active', label: 'Active', count: stats.active },
    { id: 'scheduled', label: 'Scheduled', count: stats.scheduled },
    { id: 'history', label: 'Change History' },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Rule Governance</h1>
          <p className="text-slate-400 mt-1">
            Manage compliance rules, versions, and scheduling
          </p>
        </div>
        <div className="flex items-center gap-3">
          <PermissionGate permission={AdminPermission.RULES_CREATE}>
            <Button variant="primary" onClick={() => setShowCreateModal(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Create Rule
            </Button>
          </PermissionGate>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700/50">
          <div className="flex items-center justify-between">
            <p className="text-sm text-slate-400">Total Rules</p>
            <BookOpen className="h-4 w-4 text-slate-500" />
          </div>
          <p className="text-3xl font-bold text-slate-900 dark:text-white mt-1">{stats.total}</p>
        </div>
        <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700/50">
          <div className="flex items-center justify-between">
            <p className="text-sm text-slate-400">Active Rules</p>
            <Play className="h-4 w-4 text-emerald-400" />
          </div>
          <p className="text-3xl font-bold text-emerald-400 mt-1">{stats.active}</p>
        </div>
        <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700/50">
          <div className="flex items-center justify-between">
            <p className="text-sm text-slate-400">Scheduled</p>
            <Calendar className="h-4 w-4 text-purple-400" />
          </div>
          <p className="text-3xl font-bold text-purple-400 mt-1">{stats.scheduled}</p>
        </div>
        <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700/50">
          <div className="flex items-center justify-between">
            <p className="text-sm text-slate-400">Critical Severity</p>
            <AlertTriangle className="h-4 w-4 text-red-400" />
          </div>
          <p className="text-3xl font-bold text-red-400 mt-1">{stats.critical}</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-slate-700/50">
        <nav className="flex gap-1">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${activeTab === tab.id
                  ? 'border-amber-500 text-amber-400'
                  : 'border-transparent text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
            >
              {tab.label}
              {tab.count !== undefined && (
                <span className={`px-1.5 py-0.5 text-xs rounded-full ${activeTab === tab.id ? 'bg-amber-500/20' : 'bg-slate-700'
                  }`}>
                  {tab.count}
                </span>
              )}
            </button>
          ))}
        </nav>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <SearchInput
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search rules by name, code, or description..."
          className="flex-1"
        />
        <Select
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
          options={[
            { value: 'ALL', label: 'All Categories' },
            { value: 'THC_LIMITS', label: 'THC Limits' },
            { value: 'LABELING', label: 'Labeling' },
            { value: 'DOCUMENTATION', label: 'Documentation' },
            { value: 'TESTING', label: 'Testing' },
            { value: 'LICENSING', label: 'Licensing' },
            { value: 'PACKAGING', label: 'Packaging' }
          ]}
        />
        <Select
          value={severityFilter}
          onChange={(e) => setSeverityFilter(e.target.value)}
          options={[
            { value: 'ALL', label: 'All Severities' },
            { value: 'CRITICAL', label: 'Critical' },
            { value: 'HIGH', label: 'High' },
            { value: 'MEDIUM', label: 'Medium' },
            { value: 'LOW', label: 'Low' }
          ]}
        />
      </div>

      {/* Rules List */}
      {activeTab !== 'history' ? (
        <div className="space-y-4">
          {filteredRules.map((rule) => {
            const statusConf = statusConfig[rule.status];
            const severityConf = severityConfig[rule.severity];
            const categoryConf = categoryConfig[rule.category];
            const StatusIcon = statusConf.icon;
            const isExpanded = expandedRule === rule.id;

            return (
              <Card key={rule.id} className="overflow-hidden">
                <div
                  className="p-5 cursor-pointer hover:bg-slate-700/20 transition-colors"
                  onClick={() => setExpandedRule(isExpanded ? null : rule.id)}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <code className="px-2 py-0.5 bg-slate-700/50 rounded text-xs text-amber-400 font-mono">
                          {rule.code}
                        </code>
                        <span className={`flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium ${statusConf.bg} ${statusConf.text}`}>
                          <StatusIcon className="h-3 w-3" />
                          {rule.status}
                        </span>
                        <span className={`px-2 py-0.5 rounded text-xs font-medium ${severityConf.bg} ${severityConf.text}`}>
                          {rule.severity}
                        </span>
                        <span className={`px-2 py-0.5 rounded text-xs font-medium ${categoryConf.bg} ${categoryConf.text}`}>
                          {categoryConf.label}
                        </span>
                        <span className="text-xs text-slate-500">v{rule.version}</span>
                      </div>

                      <h3 className="font-medium text-slate-900 dark:text-white">{rule.name}</h3>
                      <p className="text-sm text-slate-400 mt-1 line-clamp-2">{rule.description}</p>

                      <div className="flex items-center gap-6 mt-3 text-sm text-slate-500">
                        <span className="flex items-center gap-1">
                          <Target className="h-3.5 w-3.5" />
                          {rule.scope.jurisdictions.join(', ')}
                        </span>
                        <span className="flex items-center gap-1">
                          <AlertTriangle className="h-3.5 w-3.5" />
                          {rule.triggersCount} triggers
                        </span>
                        <span className="flex items-center gap-1">
                          <Calendar className="h-3.5 w-3.5" />
                          Effective: {rule.effectiveDate}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      {isExpanded ? (
                        <ChevronDown className="h-5 w-5 text-slate-400" />
                      ) : (
                        <ChevronRight className="h-5 w-5 text-slate-400" />
                      )}
                    </div>
                  </div>
                </div>

                {/* Expanded Content */}
                {isExpanded && (
                  <div className="px-5 pb-5 border-t border-slate-700/50 pt-4 space-y-4">
                    {/* Scope Details */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="bg-slate-700/30 rounded-lg p-4">
                        <p className="text-xs text-slate-500 uppercase tracking-wide mb-2">Jurisdictions</p>
                        <div className="flex flex-wrap gap-1">
                          {rule.scope.jurisdictions.map(j => (
                            <Badge key={j}>{j}</Badge>
                          ))}
                        </div>
                      </div>
                      <div className="bg-slate-700/30 rounded-lg p-4">
                        <p className="text-xs text-slate-500 uppercase tracking-wide mb-2">Product Categories</p>
                        <div className="flex flex-wrap gap-1">
                          {rule.scope.productCategories.map(c => (
                            <Badge key={c}>{c}</Badge>
                          ))}
                        </div>
                      </div>
                      <div className="bg-slate-700/30 rounded-lg p-4">
                        <p className="text-xs text-slate-500 uppercase tracking-wide mb-2">Document Types</p>
                        <div className="flex flex-wrap gap-1">
                          {rule.scope.documentTypes.map(d => (
                            <Badge key={d}>{d}</Badge>
                          ))}
                        </div>
                      </div>
                    </div>

                    {/* Thresholds */}
                    <div className="bg-slate-700/30 rounded-lg p-4">
                      <p className="text-xs text-slate-500 uppercase tracking-wide mb-2">Thresholds</p>
                      <div className="flex flex-wrap gap-4">
                        {Object.entries(rule.thresholds).map(([key, value]) => (
                          <div key={key} className="flex items-center gap-2">
                            <span className="text-slate-400">{key}:</span>
                            <span className="text-slate-900 dark:text-white font-medium">{String(value)}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Impact Analysis */}
                    {rule.impactedEntities !== undefined && (
                      <div className="bg-amber-500/10 rounded-lg p-4 border border-amber-500/20">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-sm font-medium text-amber-400">Impact Analysis</p>
                            <p className="text-sm text-slate-300 mt-1">
                              This rule affects <strong>{rule.impactedEntities}</strong> entities across the platform.
                            </p>
                          </div>
                          <Button
                            variant="secondary"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedRule(rule);
                              setShowImpactModal(true);
                            }}
                          >
                            View Details
                          </Button>
                        </div>
                      </div>
                    )}

                    {/* Change History */}
                    {rule.changeHistory.length > 0 && (
                      <div>
                        <p className="text-xs text-slate-500 uppercase tracking-wide mb-2">Recent Changes</p>
                        <div className="space-y-2">
                          {rule.changeHistory.slice(0, 3).map(change => (
                            <div key={change.id} className="flex items-start gap-3 bg-slate-700/30 rounded-lg p-3">
                              <GitBranch className="h-4 w-4 text-slate-500 mt-0.5" />
                              <div className="flex-1">
                                <div className="flex items-center gap-2">
                                  <span className="text-xs text-amber-400">v{change.version}</span>
                                  <span className="text-xs text-slate-500">{new Date(change.changedAt).toLocaleDateString()}</span>
                                  <span className="text-xs text-slate-500">by {change.changedBy}</span>
                                </div>
                                <p className="text-sm text-slate-900 dark:text-white mt-1">{change.changes}</p>
                                <p className="text-xs text-slate-400 mt-1">Reason: {change.reason}</p>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Actions */}
                    <div className="flex items-center gap-2 pt-2">
                      <PermissionGate permission={AdminPermission.RULES_UPDATE}>
                        <Button variant="secondary" size="sm">
                          <Edit className="h-4 w-4 mr-1" />
                          Edit Rule
                        </Button>
                      </PermissionGate>
                      <Button variant="secondary" size="sm">
                        <Copy className="h-4 w-4 mr-1" />
                        Duplicate
                      </Button>
                      <Button variant="secondary" size="sm">
                        <TestTube className="h-4 w-4 mr-1" />
                        Test Rule
                      </Button>
                      <Button variant="secondary" size="sm">
                        <History className="h-4 w-4 mr-1" />
                        Full History
                      </Button>
                      {rule.status === 'ACTIVE' && (
                        <PermissionGate permission={AdminPermission.RULES_UPDATE}>
                          <Button variant="ghost" size="sm">
                            <Pause className="h-4 w-4 mr-1" />
                            Deactivate
                          </Button>
                        </PermissionGate>
                      )}
                      {rule.status === 'INACTIVE' && (
                        <PermissionGate permission={AdminPermission.RULES_UPDATE}>
                          <Button variant="ghost" size="sm">
                            <Play className="h-4 w-4 mr-1" />
                            Activate
                          </Button>
                        </PermissionGate>
                      )}
                      {rule.changeHistory.length > 0 && (
                        <PermissionGate permission={AdminPermission.RULES_UPDATE}>
                          <Button variant="ghost" size="sm" className="text-amber-400">
                            <RotateCcw className="h-4 w-4 mr-1" />
                            Rollback
                          </Button>
                        </PermissionGate>
                      )}
                    </div>
                  </div>
                )}
              </Card>
            );
          })}

          {filteredRules.length === 0 && (
            <div className="text-center py-12">
              <BookOpen className="h-12 w-12 text-slate-600 mx-auto mb-3" />
              <h3 className="text-lg font-medium text-slate-900 dark:text-white">No rules found</h3>
              <p className="text-slate-400 mt-1">Try adjusting your filters</p>
            </div>
          )}
        </div>
      ) : (
        /* Change History Tab */
        <Card>
          <CardHeader>
            <CardTitle>Rule Change History</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {mockRules.flatMap(rule =>
                rule.changeHistory.map(change => ({
                  ...change,
                  ruleCode: rule.code,
                  ruleName: rule.name,
                }))
              ).sort((a, b) => new Date(b.changedAt).getTime() - new Date(a.changedAt).getTime()).map((change) => (
                <div key={change.id} className="flex items-start gap-4 p-4 bg-slate-700/30 rounded-lg">
                  <div className="h-10 w-10 rounded-lg bg-slate-600/50 flex items-center justify-center">
                    <GitBranch className="h-5 w-5 text-amber-400" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <code className="text-xs text-amber-400 font-mono">{change.ruleCode}</code>
                      <span className="text-xs text-slate-500">v{change.version}</span>
                    </div>
                    <p className="text-slate-900 dark:text-white font-medium">{change.ruleName}</p>
                    <p className="text-sm text-slate-300 mt-1">{change.changes}</p>
                    <p className="text-xs text-slate-400 mt-1">Reason: {change.reason}</p>
                    <div className="flex items-center gap-2 mt-2 text-xs text-slate-500">
                      <span>{change.changedBy}</span>
                      <span>•</span>
                      <span>{new Date(change.changedAt).toLocaleString()}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Create Rule Modal */}
      <Modal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        title="Create Compliance Rule"
        description="Define a new compliance rule with thresholds and scope."
      >
        <div className="space-y-4 max-h-[60vh] overflow-y-auto">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">Rule Code</label>
              <Input placeholder="e.g., THC-CA-002" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">Category</label>
              <Select
                options={[
                  { value: '', label: 'Select category' },
                  { value: 'THC_LIMITS', label: 'THC Limits' },
                  { value: 'LABELING', label: 'Labeling' },
                  { value: 'DOCUMENTATION', label: 'Documentation' },
                  { value: 'TESTING', label: 'Testing' },
                  { value: 'LICENSING', label: 'Licensing' }
                ]}
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">Rule Name</label>
            <Input placeholder="Enter rule name" />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">Description</label>
            <Textarea placeholder="Describe what this rule checks..." rows={3} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">Severity</label>
              <Select
                options={[
                  { value: 'LOW', label: 'Low' },
                  { value: 'MEDIUM', label: 'Medium' },
                  { value: 'HIGH', label: 'High' },
                  { value: 'CRITICAL', label: 'Critical' }
                ]}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">Effective Date</label>
              <Input type="date" />
            </div>
          </div>
          <div className="flex justify-end gap-3 pt-4 border-t border-slate-700">
            <Button variant="secondary" onClick={() => setShowCreateModal(false)}>Cancel</Button>
            <Button variant="primary">
              <Save className="h-4 w-4 mr-2" />
              Save as Draft
            </Button>
          </div>
        </div>
      </Modal>

      {/* Impact Analysis Modal */}
      <Modal
        isOpen={showImpactModal}
        onClose={() => setShowImpactModal(false)}
        title="Impact Analysis"
        description={`Entities affected by rule: ${selectedRule?.code}`}
      >
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-slate-700/30 rounded-lg p-4 text-center">
              <p className="text-3xl font-bold text-slate-900 dark:text-white">{selectedRule?.impactedEntities}</p>
              <p className="text-sm text-slate-400">Total Entities</p>
            </div>
            <div className="bg-slate-700/30 rounded-lg p-4 text-center">
              <p className="text-3xl font-bold text-amber-400">{selectedRule?.triggersCount}</p>
              <p className="text-sm text-slate-400">Current Triggers</p>
            </div>
          </div>
          <div className="bg-amber-500/10 rounded-lg p-4 border border-amber-500/20">
            <p className="text-sm text-amber-400 font-medium">Impact Summary</p>
            <p className="text-sm text-slate-300 mt-1">
              Activating/modifying this rule will trigger compliance re-evaluation for all affected entities.
              This may result in status changes for products currently in compliance.
            </p>
          </div>
          <div className="flex justify-end gap-3">
            <Button variant="secondary" onClick={() => setShowImpactModal(false)}>Close</Button>
            <Button variant="primary">Download Full Report</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
