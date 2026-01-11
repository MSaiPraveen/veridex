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
  FileCode
} from 'lucide-react';
import { PermissionGate, useAdminPermissions } from '@/components/auth/permission-gate';
import { ActionConfirmDialog } from '@/components/ui/action-confirm-dialog';
import { AdminPermission } from '@/lib/admin-rbac';

// Types
interface ComplianceRule {
  id: string;
  name: string;
  description: string;
  category: 'THC_LIMITS' | 'LABELING' | 'DOCUMENTATION' | 'TESTING' | 'LICENSING' | 'PACKAGING';
  jurisdiction: string;
  status: 'ACTIVE' | 'INACTIVE' | 'DRAFT' | 'DEPRECATED';
  version: number;
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  effectiveDate: string;
  expirationDate?: string;
  createdBy: string;
  updatedAt: string;
  triggersCount: number;
}

const statusColors: Record<string, { bg: string; text: string; icon: typeof CheckCircle }> = {
  ACTIVE: { bg: 'bg-emerald-100 dark:bg-emerald-900/30', text: 'text-green-700 dark:text-green-300', icon: Play },
  INACTIVE: { bg: 'bg-slate-100 dark:bg-slate-800', text: 'text-slate-700 dark:text-slate-300', icon: Pause },
  DRAFT: { bg: 'bg-amber-100 dark:bg-amber-900/30', text: 'text-yellow-700 dark:text-yellow-300', icon: Clock },
  DEPRECATED: { bg: 'bg-red-100 dark:bg-red-900/30', text: 'text-red-700 dark:text-red-300', icon: AlertTriangle },
};

const severityColors: Record<string, string> = {
  LOW: 'text-blue-700 bg-blue-100 dark:bg-blue-900/30',
  MEDIUM: 'text-yellow-700 bg-amber-100 dark:bg-amber-900/30',
  HIGH: 'text-orange-700 bg-orange-100 dark:bg-orange-900/30',
  CRITICAL: 'text-red-700 bg-red-100 dark:bg-red-900/30',
};

const categoryColors: Record<string, string> = {
  THC_LIMITS: 'bg-purple-100 text-purple-700',
  LABELING: 'bg-blue-100 text-blue-700',
  DOCUMENTATION: 'bg-emerald-100 text-green-700',
  TESTING: 'bg-cyan-100 text-cyan-700',
  LICENSING: 'bg-amber-100 text-amber-700',
  PACKAGING: 'bg-pink-100 text-pink-700',
};

export default function RulesPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [categoryFilter, setCategoryFilter] = useState('ALL');
  const [selectedRule, setSelectedRule] = useState<ComplianceRule | null>(null);
  const [showTestModal, setShowTestModal] = useState(false);
  
  const permissions = useAdminPermissions();
  
  // Mock data
  const mockRules: ComplianceRule[] = [
    {
      id: 'rule-001',
      name: 'California THC Limit',
      description: 'THC content must not exceed 0.3% for hemp products sold in California',
      category: 'THC_LIMITS',
      jurisdiction: 'California',
      status: 'ACTIVE',
      version: 3,
      severity: 'CRITICAL',
      effectiveDate: '2024-01-01',
      createdBy: 'admin@veridex.io',
      updatedAt: '2025-12-15T10:00:00Z',
      triggersCount: 156,
    },
    {
      id: 'rule-002',
      name: 'Oregon Labeling Requirements',
      description: 'All CBD products must include batch number, manufacturer info, and QR code linking to COA',
      category: 'LABELING',
      jurisdiction: 'Oregon',
      status: 'ACTIVE',
      version: 2,
      severity: 'HIGH',
      effectiveDate: '2024-06-01',
      createdBy: 'admin@veridex.io',
      updatedAt: '2025-11-20T14:30:00Z',
      triggersCount: 89,
    },
    {
      id: 'rule-003',
      name: 'Lab Certification Required',
      description: 'All products must have a valid COA from an accredited third-party lab',
      category: 'DOCUMENTATION',
      jurisdiction: 'Federal',
      status: 'ACTIVE',
      version: 1,
      severity: 'CRITICAL',
      effectiveDate: '2023-01-01',
      createdBy: 'system',
      updatedAt: '2025-10-01T09:00:00Z',
      triggersCount: 342,
    },
    {
      id: 'rule-004',
      name: 'Colorado Testing Protocol',
      description: 'Products must be tested for pesticides, heavy metals, and residual solvents',
      category: 'TESTING',
      jurisdiction: 'Colorado',
      status: 'DRAFT',
      version: 1,
      severity: 'HIGH',
      effectiveDate: '2026-01-15',
      createdBy: 'admin@veridex.io',
      updatedAt: '2025-12-28T11:00:00Z',
      triggersCount: 0,
    },
    {
      id: 'rule-005',
      name: 'Nevada THC Limit (Legacy)',
      description: 'Legacy THC limit rule for Nevada - superseded by new 2025 regulations',
      category: 'THC_LIMITS',
      jurisdiction: 'Nevada',
      status: 'DEPRECATED',
      version: 2,
      severity: 'CRITICAL',
      effectiveDate: '2022-01-01',
      expirationDate: '2025-01-01',
      createdBy: 'system',
      updatedAt: '2024-12-01T16:00:00Z',
      triggersCount: 0,
    },
  ];
  
  const filteredRules = mockRules.filter(rule => {
    if (statusFilter !== 'ALL' && rule.status !== statusFilter) return false;
    if (categoryFilter !== 'ALL' && rule.category !== categoryFilter) return false;
    if (searchQuery) {
      const searchLower = searchQuery.toLowerCase();
      return (
        rule.name.toLowerCase().includes(searchLower) ||
        rule.description.toLowerCase().includes(searchLower) ||
        rule.jurisdiction.toLowerCase().includes(searchLower)
      );
    }
    return true;
  });
  
  // Stats
  const stats = {
    total: mockRules.length,
    active: mockRules.filter(r => r.status === 'ACTIVE').length,
    draft: mockRules.filter(r => r.status === 'DRAFT').length,
    totalTriggers: mockRules.reduce((acc, r) => acc + r.triggersCount, 0),
  };
  
  return (
    <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
              Compliance Rules
            </h1>
            <p className="text-slate-600 dark:text-slate-400 mt-1">
              Manage compliance rules and validation logic
            </p>
          </div>
          
          <PermissionGate permission={AdminPermission.RULES_CREATE}>
            <button className="admin-button-primary">
              <Plus className="h-4 w-4" />
              Create Rule
            </button>
          </PermissionGate>
        </div>
        
        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="admin-card p-4">
            <p className="text-sm text-slate-600 dark:text-slate-400">Total Rules</p>
            <p className="text-2xl font-bold text-slate-900 dark:text-white">{stats.total}</p>
          </div>
          <div className="admin-card p-4">
            <p className="text-sm text-slate-600 dark:text-slate-400">Active Rules</p>
            <p className="text-2xl font-bold text-emerald-600">{stats.active}</p>
          </div>
          <div className="admin-card p-4">
            <p className="text-sm text-slate-600 dark:text-slate-400">Draft Rules</p>
            <p className="text-2xl font-bold text-amber-600">{stats.draft}</p>
          </div>
          <div className="admin-card p-4">
            <p className="text-sm text-slate-600 dark:text-slate-400">Total Triggers</p>
            <p className="text-2xl font-bold text-amber-600">{stats.totalTriggers}</p>
          </div>
        </div>
        
        {/* Filters */}
        <div className="admin-card">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
              <input
                type="text"
                placeholder="Search rules..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="admin-input pl-10"
              />
            </div>
            
            <div className="flex gap-2">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="admin-input"
              >
                <option value="ALL">All Status</option>
                <option value="ACTIVE">Active</option>
                <option value="INACTIVE">Inactive</option>
                <option value="DRAFT">Draft</option>
                <option value="DEPRECATED">Deprecated</option>
              </select>
              
              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="admin-input"
              >
                <option value="ALL">All Categories</option>
                <option value="THC_LIMITS">THC Limits</option>
                <option value="LABELING">Labeling</option>
                <option value="DOCUMENTATION">Documentation</option>
                <option value="TESTING">Testing</option>
                <option value="LICENSING">Licensing</option>
                <option value="PACKAGING">Packaging</option>
              </select>
            </div>
          </div>
        </div>
        
        {/* Rules List */}
        <div className="space-y-4">
          {filteredRules.map((rule) => {
            const StatusIcon = statusColors[rule.status].icon;
            
            return (
              <div key={rule.id} className="admin-card hover:shadow-md transition-shadow">
                <div className="flex items-start gap-4">
                  {/* Icon */}
                  <div className="h-12 w-12 rounded-lg bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center flex-shrink-0">
                    <BookOpen className="h-6 w-6 text-amber-600" />
                  </div>
                  
                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="font-medium text-slate-900 dark:text-white">
                            {rule.name}
                          </h3>
                          <span className="text-xs text-slate-500">v{rule.version}</span>
                        </div>
                        <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
                          {rule.description}
                        </p>
                      </div>
                      
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <span className={`px-2 py-1 rounded text-xs font-medium ${severityColors[rule.severity]}`}>
                          {rule.severity}
                        </span>
                        <span className={`inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-medium ${statusColors[rule.status].bg} ${statusColors[rule.status].text}`}>
                          <StatusIcon className="h-3 w-3" />
                          {rule.status}
                        </span>
                      </div>
                    </div>
                    
                    {/* Meta Info */}
                    <div className="mt-3 flex items-center gap-4 flex-wrap text-sm">
                      <span className={`px-2 py-0.5 rounded text-xs font-medium ${categoryColors[rule.category]}`}>
                        {rule.category.replace(/_/g, ' ')}
                      </span>
                      <span className="text-slate-500">
                        📍 {rule.jurisdiction}
                      </span>
                      <span className="text-slate-500">
                        Effective: {new Date(rule.effectiveDate).toLocaleDateString()}
                      </span>
                      {rule.expirationDate && (
                        <span className="text-red-500">
                          Expires: {new Date(rule.expirationDate).toLocaleDateString()}
                        </span>
                      )}
                      <span className="text-slate-500">
                        {rule.triggersCount} triggers
                      </span>
                    </div>
                    
                    {/* Actions */}
                    <div className="mt-4 flex items-center gap-2">
                      <button className="admin-button-secondary text-sm">
                        <Eye className="h-4 w-4" />
                        View
                      </button>
                      
                      <PermissionGate permission={AdminPermission.RULES_UPDATE}>
                        <button className="admin-button-secondary text-sm">
                          <Edit className="h-4 w-4" />
                          Edit
                        </button>
                      </PermissionGate>
                      
                      <PermissionGate permission={AdminPermission.RULES_READ}>
                        <button
                          onClick={() => {
                            setSelectedRule(rule);
                            setShowTestModal(true);
                          }}
                          className="admin-button-secondary text-sm"
                        >
                          <TestTube className="h-4 w-4" />
                          Test
                        </button>
                      </PermissionGate>
                      
                      <button className="admin-button-secondary text-sm">
                        <History className="h-4 w-4" />
                        History
                      </button>
                      
                      <PermissionGate permission={AdminPermission.RULES_CREATE}>
                        <button className="admin-button-secondary text-sm">
                          <Copy className="h-4 w-4" />
                          Clone
                        </button>
                      </PermissionGate>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
        
        {filteredRules.length === 0 && (
          <div className="admin-card p-8 text-center">
            <BookOpen className="h-12 w-12 text-slate-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-slate-900 dark:text-white">
              No rules found
            </h3>
            <p className="text-slate-500 mt-1">
              Try adjusting your filters
            </p>
          </div>
        )}
        
        {/* Test Modal */}
        {showTestModal && selectedRule && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-white dark:bg-slate-900 rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[80vh] overflow-auto">
              <div className="p-6 border-b border-slate-200 dark:border-slate-700">
                <h2 className="text-xl font-semibold text-slate-900 dark:text-white">
                  Test Rule: {selectedRule.name}
                </h2>
                <p className="text-sm text-slate-500 mt-1">
                  Enter test data to validate rule behavior
                </p>
              </div>
              
              <div className="p-6 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                    Test Input (JSON)
                  </label>
                  <textarea
                    rows={8}
                    className="admin-input font-mono text-sm"
                    placeholder={`{
  "thcContent": 0.25,
  "cbdContent": 18.5,
  "testDate": "2025-12-28",
  "labName": "Test Lab Inc"
}`}
                  />
                </div>
                
                <div className="p-4 bg-slate-50 dark:bg-slate-800 rounded-lg">
                  <h4 className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                    Rule Logic Preview
                  </h4>
                  <pre className="text-xs text-slate-600 dark:text-slate-400 overflow-x-auto">
{`if (input.thcContent > 0.3) {
  return { pass: false, message: "THC exceeds limit" };
}
return { pass: true };`}
                  </pre>
                </div>
              </div>
              
              <div className="p-6 border-t border-slate-200 dark:border-slate-700 flex justify-end gap-3">
                <button
                  onClick={() => {
                    setShowTestModal(false);
                    setSelectedRule(null);
                  }}
                  className="admin-button-secondary"
                >
                  Cancel
                </button>
                <button className="admin-button-primary">
                  <Play className="h-4 w-4" />
                  Run Test
                </button>
              </div>
            </div>
          </div>
        )}
    </div>
  );
}
