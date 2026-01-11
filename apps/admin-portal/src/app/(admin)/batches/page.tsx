'use client';

import { useState } from 'react';
import { 
  Boxes, 
  Search, 
  Eye, 
  CheckCircle, 
  XCircle,
  Clock,
  AlertTriangle,
  Building2,
  RefreshCw,
  Package,
  QrCode,
  FileText,
  Ban
} from 'lucide-react';
import { PermissionGate, useAdminPermissions } from '@/components/auth/permission-gate';
import { ActionConfirmDialog } from '@/components/ui/action-confirm-dialog';
import { AdminPermission } from '@/lib/admin-rbac';

// Types
interface Batch {
  id: string;
  batchNumber: string;
  productId: string;
  productName: string;
  organizationId: string;
  organizationName: string;
  status: 'PENDING' | 'APPROVED' | 'RECALLED' | 'EXPIRED' | 'QUARANTINED';
  complianceStatus: 'COMPLIANT' | 'NON_COMPLIANT' | 'PENDING_REVIEW';
  quantity: number;
  manufactureDate: string;
  expirationDate: string;
  documentsCount: number;
  createdAt: string;
}

const statusColors: Record<string, { bg: string; text: string }> = {
  PENDING: { bg: 'bg-amber-100 dark:bg-amber-900/30', text: 'text-yellow-700 dark:text-yellow-300' },
  APPROVED: { bg: 'bg-emerald-100 dark:bg-emerald-900/30', text: 'text-green-700 dark:text-green-300' },
  RECALLED: { bg: 'bg-red-100 dark:bg-red-900/30', text: 'text-red-700 dark:text-red-300' },
  EXPIRED: { bg: 'bg-slate-100 dark:bg-slate-800', text: 'text-slate-700 dark:text-slate-300' },
  QUARANTINED: { bg: 'bg-orange-100 dark:bg-orange-900/30', text: 'text-orange-700 dark:text-orange-300' },
};

const complianceColors: Record<string, string> = {
  COMPLIANT: 'text-emerald-600',
  NON_COMPLIANT: 'text-red-600',
  PENDING_REVIEW: 'text-amber-600',
};

export default function BatchesPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [selectedBatch, setSelectedBatch] = useState<Batch | null>(null);
  const [actionType, setActionType] = useState<'recall' | 'quarantine' | 'approve' | null>(null);
  
  const permissions = useAdminPermissions();
  
  // Mock data
  const mockBatches: Batch[] = [
    {
      id: 'batch-001',
      batchNumber: '2024-Q4-142',
      productId: 'prod-001',
      productName: 'Full Spectrum CBD Oil 1000mg',
      organizationId: 'org-001',
      organizationName: 'GreenLeaf Labs',
      status: 'APPROVED',
      complianceStatus: 'COMPLIANT',
      quantity: 5000,
      manufactureDate: '2025-10-15',
      expirationDate: '2026-10-15',
      documentsCount: 4,
      createdAt: '2025-10-15T10:00:00Z',
    },
    {
      id: 'batch-002',
      batchNumber: '2024-Q4-189',
      productId: 'prod-002',
      productName: 'CBD Gummies 25mg',
      organizationId: 'org-002',
      organizationName: 'Pure Hemp Co',
      status: 'PENDING',
      complianceStatus: 'PENDING_REVIEW',
      quantity: 10000,
      manufactureDate: '2025-12-20',
      expirationDate: '2026-06-20',
      documentsCount: 2,
      createdAt: '2025-12-20T14:30:00Z',
    },
    {
      id: 'batch-003',
      batchNumber: '2024-Q3-078',
      productId: 'prod-003',
      productName: 'Hemp Extract Capsules',
      organizationId: 'org-003',
      organizationName: 'Herbal Solutions',
      status: 'RECALLED',
      complianceStatus: 'NON_COMPLIANT',
      quantity: 3000,
      manufactureDate: '2025-08-10',
      expirationDate: '2026-08-10',
      documentsCount: 5,
      createdAt: '2025-08-10T09:00:00Z',
    },
    {
      id: 'batch-004',
      batchNumber: '2024-Q4-205',
      productId: 'prod-001',
      productName: 'Full Spectrum CBD Oil 1000mg',
      organizationId: 'org-001',
      organizationName: 'GreenLeaf Labs',
      status: 'QUARANTINED',
      complianceStatus: 'PENDING_REVIEW',
      quantity: 2500,
      manufactureDate: '2025-12-28',
      expirationDate: '2026-12-28',
      documentsCount: 3,
      createdAt: '2025-12-28T11:00:00Z',
    },
  ];
  
  const filteredBatches = mockBatches.filter(batch => {
    if (statusFilter !== 'ALL' && batch.status !== statusFilter) return false;
    if (searchQuery) {
      const searchLower = searchQuery.toLowerCase();
      return (
        batch.batchNumber.toLowerCase().includes(searchLower) ||
        batch.productName.toLowerCase().includes(searchLower) ||
        batch.organizationName.toLowerCase().includes(searchLower)
      );
    }
    return true;
  });
  
  const handleAction = (batch: Batch, action: 'recall' | 'quarantine' | 'approve') => {
    setSelectedBatch(batch);
    setActionType(action);
  };
  
  const executeAction = async () => {
    // API call would go here
    console.log(`${actionType} batch:`, selectedBatch?.id);
    setSelectedBatch(null);
    setActionType(null);
  };
  
  // Stats
  const stats = {
    total: mockBatches.length,
    approved: mockBatches.filter(b => b.status === 'APPROVED').length,
    pending: mockBatches.filter(b => b.status === 'PENDING').length,
    issues: mockBatches.filter(b => b.status === 'RECALLED' || b.status === 'QUARANTINED').length,
  };
  
  return (
    <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
              Batches
            </h1>
            <p className="text-slate-600 dark:text-slate-400 mt-1">
              Track and manage product batches
            </p>
          </div>
          <button className="admin-button-secondary">
            <RefreshCw className="h-4 w-4" />
            Refresh
          </button>
        </div>
        
        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="admin-card p-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
                <Boxes className="h-5 w-5 text-slate-600" />
              </div>
              <div>
                <p className="text-sm text-slate-600 dark:text-slate-400">Total Batches</p>
                <p className="text-2xl font-bold text-slate-900 dark:text-white">{stats.total}</p>
              </div>
            </div>
          </div>
          <div className="admin-card p-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center">
                <CheckCircle className="h-5 w-5 text-emerald-600" />
              </div>
              <div>
                <p className="text-sm text-slate-600 dark:text-slate-400">Approved</p>
                <p className="text-2xl font-bold text-emerald-600">{stats.approved}</p>
              </div>
            </div>
          </div>
          <div className="admin-card p-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
                <Clock className="h-5 w-5 text-amber-600" />
              </div>
              <div>
                <p className="text-sm text-slate-600 dark:text-slate-400">Pending</p>
                <p className="text-2xl font-bold text-amber-600">{stats.pending}</p>
              </div>
            </div>
          </div>
          <div className="admin-card p-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
                <AlertTriangle className="h-5 w-5 text-red-600" />
              </div>
              <div>
                <p className="text-sm text-slate-600 dark:text-slate-400">Issues</p>
                <p className="text-2xl font-bold text-red-600">{stats.issues}</p>
              </div>
            </div>
          </div>
        </div>
        
        {/* Filters */}
        <div className="admin-card">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
              <input
                type="text"
                placeholder="Search batches..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="admin-input pl-10"
              />
            </div>
            
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="admin-input"
            >
              <option value="ALL">All Status</option>
              <option value="PENDING">Pending</option>
              <option value="APPROVED">Approved</option>
              <option value="RECALLED">Recalled</option>
              <option value="QUARANTINED">Quarantined</option>
              <option value="EXPIRED">Expired</option>
            </select>
          </div>
        </div>
        
        {/* Batches Table */}
        <div className="admin-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-50 dark:bg-slate-800">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                    Batch
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                    Product
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                    Organization
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                    Quantity
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                    Expiration
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-slate-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                {filteredBatches.map((batch) => (
                  <tr key={batch.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                    <td className="px-4 py-4">
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-lg bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
                          <QrCode className="h-5 w-5 text-amber-600" />
                        </div>
                        <div>
                          <p className="font-medium text-slate-900 dark:text-white">
                            #{batch.batchNumber}
                          </p>
                          <p className="text-xs text-slate-500">
                            {batch.documentsCount} docs
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex items-center gap-2">
                        <Package className="h-4 w-4 text-slate-400" />
                        <span className="text-sm text-slate-900 dark:text-white">
                          {batch.productName}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex items-center gap-2">
                        <Building2 className="h-4 w-4 text-slate-400" />
                        <span className="text-sm text-slate-600 dark:text-slate-400">
                          {batch.organizationName}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <div className="space-y-1">
                        <span className={`px-2 py-1 rounded text-xs font-medium ${statusColors[batch.status].bg} ${statusColors[batch.status].text}`}>
                          {batch.status}
                        </span>
                        <p className={`text-xs ${complianceColors[batch.complianceStatus]}`}>
                          {batch.complianceStatus.replace('_', ' ')}
                        </p>
                      </div>
                    </td>
                    <td className="px-4 py-4 text-sm text-slate-600 dark:text-slate-400">
                      {batch.quantity.toLocaleString()} units
                    </td>
                    <td className="px-4 py-4 text-sm text-slate-600 dark:text-slate-400">
                      {new Date(batch.expirationDate).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex items-center justify-end gap-2">
                        <button className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 rounded">
                          <Eye className="h-4 w-4" />
                        </button>
                        
                        <PermissionGate permission={AdminPermission.BATCH_APPROVE}>
                          {batch.status === 'PENDING' && (
                            <button
                              onClick={() => handleAction(batch, 'approve')}
                              className="p-2 text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-900/30 rounded"
                              title="Approve"
                            >
                              <CheckCircle className="h-4 w-4" />
                            </button>
                          )}
                        </PermissionGate>
                        
                        <PermissionGate permission={AdminPermission.BATCH_QUARANTINE}>
                          {batch.status === 'APPROVED' && (
                            <button
                              onClick={() => handleAction(batch, 'quarantine')}
                              className="p-2 text-orange-600 hover:bg-orange-50 dark:hover:bg-orange-900/30 rounded"
                              title="Quarantine"
                            >
                              <AlertTriangle className="h-4 w-4" />
                            </button>
                          )}
                        </PermissionGate>
                        
                        <PermissionGate permission={AdminPermission.BATCH_RECALL}>
                          {(batch.status === 'APPROVED' || batch.status === 'QUARANTINED') && (
                            <button
                              onClick={() => handleAction(batch, 'recall')}
                              className="p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/30 rounded"
                              title="Recall"
                            >
                              <Ban className="h-4 w-4" />
                            </button>
                          )}
                        </PermissionGate>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          
          {filteredBatches.length === 0 && (
            <div className="p-8 text-center">
              <Boxes className="h-12 w-12 text-slate-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-slate-900 dark:text-white">
                No batches found
              </h3>
              <p className="text-slate-500 mt-1">
                Try adjusting your filters
              </p>
            </div>
          )}
        </div>
        
        {/* Action Confirmation */}
        <ActionConfirmDialog
          isOpen={!!selectedBatch && !!actionType}
          onClose={() => { setSelectedBatch(null); setActionType(null); }}
          onConfirm={executeAction}
          title={
            actionType === 'approve' ? 'Approve Batch' :
            actionType === 'quarantine' ? 'Quarantine Batch' :
            'Recall Batch'
          }
          description={
            actionType === 'approve'
              ? `Are you sure you want to approve batch #${selectedBatch?.batchNumber}?`
              : actionType === 'quarantine'
              ? `Are you sure you want to quarantine batch #${selectedBatch?.batchNumber}? It will be flagged for review.`
              : `Are you sure you want to recall batch #${selectedBatch?.batchNumber}? This is a critical action that cannot be undone.`
          }
          severity={actionType === 'recall' ? 'danger' : actionType === 'quarantine' ? 'warning' : 'info'}
          confirmText={actionType ? actionType.charAt(0).toUpperCase() + actionType.slice(1) : ''}
          auditMessage="This action will be logged in the audit trail and may trigger notifications."
          requireConfirmPhrase={actionType === 'recall'}
          confirmPhrase={selectedBatch?.batchNumber}
        />
    </div>
  );
}
