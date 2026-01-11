'use client';

import { useState } from 'react';
import { 
  Users, 
  Search, 
  Plus, 
  Shield, 
  Eye, 
  Edit,
  Key,
  Ban,
  RefreshCw,
  Mail,
  Clock,
  CheckCircle,
  XCircle,
  AlertTriangle,
  MoreVertical,
  Smartphone
} from 'lucide-react';
import { PermissionGate, useAdminPermissions } from '@/components/auth/permission-gate';
import { ActionConfirmDialog } from '@/components/ui/action-confirm-dialog';
import { AdminPermission, AdminRole, ROLE_DISPLAY_INFO } from '@/lib/admin-rbac';

// Types
interface AdminUser {
  id: string;
  email: string;
  name: string;
  role: AdminRole;
  status: 'ACTIVE' | 'INACTIVE' | 'LOCKED' | 'PENDING_MFA';
  mfaEnabled: boolean;
  lastLogin?: string;
  createdAt: string;
  createdBy: string;
  loginAttempts: number;
  ipWhitelist?: string[];
}

const statusColors: Record<string, { bg: string; text: string; icon: typeof CheckCircle }> = {
  ACTIVE: { bg: 'bg-emerald-100 dark:bg-emerald-500/20', text: 'text-emerald-700 dark:text-emerald-400', icon: CheckCircle },
  INACTIVE: { bg: 'bg-slate-100 dark:bg-slate-700', text: 'text-slate-600 dark:text-slate-400', icon: XCircle },
  LOCKED: { bg: 'bg-red-100 dark:bg-red-500/20', text: 'text-red-700 dark:text-red-400', icon: Ban },
  PENDING_MFA: { bg: 'bg-amber-100 dark:bg-amber-500/20', text: 'text-amber-700 dark:text-amber-400', icon: AlertTriangle },
};

export default function AdminUsersPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [selectedUser, setSelectedUser] = useState<AdminUser | null>(null);
  const [actionType, setActionType] = useState<'deactivate' | 'reactivate' | 'unlock' | 'resetMfa' | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  
  const permissions = useAdminPermissions();
  
  // Mock data
  const mockUsers: AdminUser[] = [
    {
      id: 'admin-001',
      email: 'admin@veridex.io',
      name: 'System Admin',
      role: AdminRole.ADMIN,
      status: 'ACTIVE',
      mfaEnabled: true,
      lastLogin: '2026-01-02T14:32:00Z',
      createdAt: '2025-01-15T09:00:00Z',
      createdBy: 'system',
      loginAttempts: 0,
    },
    {
      id: 'admin-002',
      email: 'sarah.admin@veridex.io',
      name: 'Sarah Miller',
      role: AdminRole.ADMIN,
      status: 'ACTIVE',
      mfaEnabled: true,
      lastLogin: '2026-01-02T10:15:00Z',
      createdAt: '2025-06-20T14:30:00Z',
      createdBy: 'admin-001',
      loginAttempts: 0,
    },
    {
      id: 'admin-003',
      email: 'mike.admin@veridex.io',
      name: 'Mike Johnson',
      role: AdminRole.ADMIN,
      status: 'LOCKED',
      mfaEnabled: true,
      lastLogin: '2025-12-28T09:00:00Z',
      createdAt: '2025-08-10T11:00:00Z',
      createdBy: 'admin-001',
      loginAttempts: 5,
    },
    {
      id: 'admin-004',
      email: 'jane.admin@veridex.io',
      name: 'Jane Smith',
      role: AdminRole.ADMIN,
      status: 'PENDING_MFA',
      mfaEnabled: false,
      createdAt: '2025-12-30T16:00:00Z',
      createdBy: 'admin-001',
      loginAttempts: 0,
    },
    {
      id: 'admin-005',
      email: 'alex.admin@veridex.io',
      name: 'Alex Chen',
      role: AdminRole.ADMIN,
      status: 'INACTIVE',
      mfaEnabled: true,
      lastLogin: '2025-10-15T14:00:00Z',
      createdAt: '2025-03-01T08:00:00Z',
      createdBy: 'admin-001',
      loginAttempts: 0,
    },
  ];
  
  const filteredUsers = mockUsers.filter(user => {
    if (roleFilter !== 'ALL' && user.role !== roleFilter) return false;
    if (statusFilter !== 'ALL' && user.status !== statusFilter) return false;
    if (searchQuery) {
      const searchLower = searchQuery.toLowerCase();
      return (
        user.name.toLowerCase().includes(searchLower) ||
        user.email.toLowerCase().includes(searchLower)
      );
    }
    return true;
  });
  
  const handleAction = (user: AdminUser, action: 'deactivate' | 'reactivate' | 'unlock' | 'resetMfa') => {
    setSelectedUser(user);
    setActionType(action);
  };
  
  const executeAction = async () => {
    // API call would go here
    console.log(`${actionType} user:`, selectedUser?.id);
    setSelectedUser(null);
    setActionType(null);
  };
  
  const getActionTitle = () => {
    switch (actionType) {
      case 'deactivate': return 'Deactivate Admin User';
      case 'reactivate': return 'Reactivate Admin User';
      case 'unlock': return 'Unlock Admin User';
      case 'resetMfa': return 'Reset MFA';
      default: return '';
    }
  };
  
  const getActionDescription = () => {
    switch (actionType) {
      case 'deactivate': return `Are you sure you want to deactivate ${selectedUser?.name}? They will lose access to the admin portal.`;
      case 'reactivate': return `Are you sure you want to reactivate ${selectedUser?.name}? They will regain access to the admin portal.`;
      case 'unlock': return `Are you sure you want to unlock ${selectedUser?.name}? Their login attempts will be reset.`;
      case 'resetMfa': return `Are you sure you want to reset MFA for ${selectedUser?.name}? They will need to set up MFA again on next login.`;
      default: return '';
    }
  };
  
  // Stats
  const stats = {
    total: mockUsers.length,
    active: mockUsers.filter(u => u.status === 'ACTIVE').length,
    locked: mockUsers.filter(u => u.status === 'LOCKED').length,
    pendingMfa: mockUsers.filter(u => u.status === 'PENDING_MFA').length,
  };
  
  return (
    <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
              Admin Users
            </h1>
            <p className="text-slate-600 dark:text-slate-400 mt-1">
              Manage admin portal access and permissions
            </p>
          </div>
          
          <PermissionGate permission={AdminPermission.ADMIN_CREATE}>
            <button
              onClick={() => setShowCreateModal(true)}
              className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white font-medium rounded-lg transition-all shadow-lg shadow-amber-500/25"
            >
              <Plus className="h-4 w-4" />
              Add Admin
            </button>
          </PermissionGate>
        </div>
        
        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-white dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-700/50 p-4 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-slate-100 dark:bg-slate-700 flex items-center justify-center">
                <Users className="h-5 w-5 text-slate-600 dark:text-slate-400" />
              </div>
              <div>
                <p className="text-sm text-slate-600 dark:text-slate-400">Total Admins</p>
                <p className="text-2xl font-bold text-slate-900 dark:text-white">{stats.total}</p>
              </div>
            </div>
          </div>
          <div className="bg-white dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-700/50 p-4 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-emerald-100 dark:bg-emerald-500/20 flex items-center justify-center">
                <CheckCircle className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
              </div>
              <div>
                <p className="text-sm text-slate-600 dark:text-slate-400">Active</p>
                <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">{stats.active}</p>
              </div>
            </div>
          </div>
          <div className="bg-white dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-700/50 p-4 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-red-100 dark:bg-red-500/20 flex items-center justify-center">
                <Ban className="h-5 w-5 text-red-600 dark:text-red-400" />
              </div>
              <div>
                <p className="text-sm text-slate-600 dark:text-slate-400">Locked</p>
                <p className="text-2xl font-bold text-red-600 dark:text-red-400">{stats.locked}</p>
              </div>
            </div>
          </div>
          <div className="bg-white dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-700/50 p-4 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-amber-100 dark:bg-amber-500/20 flex items-center justify-center">
                <Smartphone className="h-5 w-5 text-amber-600 dark:text-amber-400" />
              </div>
              <div>
                <p className="text-sm text-slate-600 dark:text-slate-400">Pending MFA</p>
                <p className="text-2xl font-bold text-amber-600 dark:text-amber-400">{stats.pendingMfa}</p>
              </div>
            </div>
          </div>
        </div>
        
        {/* Filters */}
        <div className="bg-white dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-700/50 p-4 shadow-sm">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
              <input
                type="text"
                placeholder="Search admins..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full h-10 pl-10 pr-4 rounded-lg border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-700/50 text-slate-900 dark:text-white placeholder:text-slate-400 focus:border-amber-500 dark:focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 transition-all"
              />
            </div>
            
            <div className="flex gap-2">
              <select
                value={roleFilter}
                onChange={(e) => setRoleFilter(e.target.value)}
                className="h-10 px-3 rounded-lg border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-700/50 text-slate-900 dark:text-white focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 transition-all"
              >
                <option value="ALL">All Roles</option>
                <option value={AdminRole.ADMIN}>Admin</option>
              </select>
              
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="h-10 px-3 rounded-lg border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-700/50 text-slate-900 dark:text-white focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 transition-all"
              >
                <option value="ALL">All Status</option>
                <option value="ACTIVE">Active</option>
                <option value="INACTIVE">Inactive</option>
                <option value="LOCKED">Locked</option>
                <option value="PENDING_MFA">Pending MFA</option>
              </select>
            </div>
          </div>
        </div>
        
        {/* Users Table */}
        <div className="bg-white dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-700/50 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-50 dark:bg-slate-800/80">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                    Admin User
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                    Role
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                    MFA
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                    Last Login
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-700/50">
                {filteredUsers.map((user) => {
                  const StatusIcon = statusColors[user.status].icon;
                  const roleInfo = ROLE_DISPLAY_INFO[user.role];
                  
                  return (
                    <tr key={user.id} className="bg-white dark:bg-slate-800/30 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors">
                      <td className="px-4 py-4">
                        <div className="flex items-center gap-3">
                          <div className="h-10 w-10 rounded-full bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center shadow-lg">
                            <span className="text-white font-semibold">
                              {user.name.charAt(0)}
                            </span>
                          </div>
                          <div>
                            <p className="font-medium text-slate-900 dark:text-white">
                              {user.name}
                            </p>
                            <p className="text-sm text-slate-500 dark:text-slate-400">
                              {user.email}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        <div className="flex items-center gap-2">
                          <Shield className={`h-4 w-4 ${roleInfo.colorClass}`} />
                          <span className="text-sm font-medium text-slate-900 dark:text-white">
                            {roleInfo.label}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${statusColors[user.status].bg} ${statusColors[user.status].text}`}>
                          <StatusIcon className="h-3 w-3" />
                          {user.status.replace('_', ' ')}
                        </span>
                        {user.loginAttempts > 0 && (
                          <span className="ml-2 text-xs text-red-500 dark:text-red-400">
                            ({user.loginAttempts} failed attempts)
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-4">
                        {user.mfaEnabled ? (
                          <span className="inline-flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400">
                            <Smartphone className="h-4 w-4" />
                            <span className="text-sm font-medium">Enabled</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 text-amber-600 dark:text-amber-400">
                            <AlertTriangle className="h-4 w-4" />
                            <span className="text-sm font-medium">Not Set</span>
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-4 text-sm text-slate-600 dark:text-slate-400">
                        {user.lastLogin ? (
                          <div className="flex items-center gap-1.5">
                            <Clock className="h-4 w-4 text-slate-400" />
                            {new Date(user.lastLogin).toLocaleString()}
                          </div>
                        ) : (
                          <span className="text-slate-400">Never</span>
                        )}
                      </td>
                      <td className="px-4 py-4">
                        <div className="flex items-center justify-end gap-1">
                          <button className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700/50 rounded-lg transition-colors">
                            <Eye className="h-4 w-4" />
                          </button>
                          
                          <PermissionGate permission={AdminPermission.ADMIN_EDIT}>
                            <button className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700/50 rounded-lg transition-colors">
                              <Edit className="h-4 w-4" />
                            </button>
                          </PermissionGate>
                          
                          <PermissionGate permission={AdminPermission.ADMIN_RESET_MFA}>
                            {user.mfaEnabled && (
                              <button
                                onClick={() => handleAction(user, 'resetMfa')}
                                className="p-2 text-amber-600 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-500/10 rounded-lg transition-colors"
                                title="Reset MFA"
                              >
                                <Key className="h-4 w-4" />
                              </button>
                            )}
                          </PermissionGate>
                          
                          <PermissionGate permission={AdminPermission.ADMIN_DEACTIVATE}>
                            {user.status === 'LOCKED' && (
                              <button
                                onClick={() => handleAction(user, 'unlock')}
                                className="p-2 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-500/10 rounded-lg transition-colors"
                                title="Unlock"
                              >
                                <RefreshCw className="h-4 w-4" />
                              </button>
                            )}
                            
                            {user.status === 'ACTIVE' && (
                              <button
                                onClick={() => handleAction(user, 'deactivate')}
                                className="p-2 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-lg transition-colors"
                                title="Deactivate"
                              >
                                <Ban className="h-4 w-4" />
                              </button>
                            )}
                            
                            {user.status === 'INACTIVE' && (
                              <button
                                onClick={() => handleAction(user, 'reactivate')}
                                className="p-2 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-500/10 rounded-lg transition-colors"
                                title="Reactivate"
                              >
                                <CheckCircle className="h-4 w-4" />
                              </button>
                            )}
                          </PermissionGate>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          
          {filteredUsers.length === 0 && (
            <div className="p-8 text-center">
              <Users className="h-12 w-12 text-slate-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-slate-900 dark:text-white">
                No admin users found
              </h3>
              <p className="text-slate-500 dark:text-slate-400 mt-1">
                Try adjusting your filters
              </p>
            </div>
          )}
        </div>
        
        {/* Action Confirmation */}
        <ActionConfirmDialog
          isOpen={!!selectedUser && !!actionType}
          onClose={() => { setSelectedUser(null); setActionType(null); }}
          onConfirm={executeAction}
          title={getActionTitle()}
          description={getActionDescription()}
          severity={actionType === 'deactivate' ? 'danger' : 'warning'}
          confirmText={actionType ? actionType.charAt(0).toUpperCase() + actionType.slice(1) : ''}
          auditMessage="This action will be logged in the security audit trail with your admin ID and timestamp."
          requireConfirmPhrase={actionType === 'deactivate'}
          confirmPhrase={selectedUser?.email}
        />
        
        {/* Create Admin Modal */}
        {showCreateModal && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
            <div className="bg-white dark:bg-slate-800 rounded-xl shadow-2xl max-w-lg w-full mx-4 border border-slate-200 dark:border-slate-700">
              <div className="p-6 border-b border-slate-200 dark:border-slate-700">
                <h2 className="text-xl font-semibold text-slate-900 dark:text-white">
                  Add Admin User
                </h2>
                <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                  Create a new administrator account
                </p>
              </div>
              
              <div className="p-6 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                    Full Name
                  </label>
                  <input type="text" className="w-full h-10 px-3 rounded-lg border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-700/50 text-slate-900 dark:text-white placeholder:text-slate-400 focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20" placeholder="John Smith" />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                    Email Address
                  </label>
                  <input type="email" className="w-full h-10 px-3 rounded-lg border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-700/50 text-slate-900 dark:text-white placeholder:text-slate-400 focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20" placeholder="john@veridex.io" />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                    Role
                  </label>
                  <select className="w-full h-10 px-3 rounded-lg border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-700/50 text-slate-900 dark:text-white focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20">
                    <option value="">Select a role...</option>
                    <option value={AdminRole.ADMIN}>Admin</option>
                  </select>
                </div>
                
                <div className="p-4 bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/30 rounded-lg">
                  <p className="text-sm text-amber-800 dark:text-amber-300">
                    <strong>Note:</strong> The new admin will receive an email invitation with a temporary password. 
                    They will be required to set up MFA on first login.
                  </p>
                </div>
              </div>
              
              <div className="p-6 border-t border-slate-200 dark:border-slate-700 flex justify-end gap-3">
                <button
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 font-medium rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white font-medium rounded-lg transition-all shadow-lg shadow-amber-500/25">
                  <Plus className="h-4 w-4" />
                  Create Admin
                </button>
              </div>
            </div>
          </div>
        )}
    </div>
  );
}
