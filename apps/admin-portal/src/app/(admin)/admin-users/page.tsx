'use client';

import { useState, useMemo } from 'react';
import { 
  Users, 
  Search, 
  Plus, 
  Shield, 
  Eye, 
  Edit,
  Ban,
  RefreshCw,
  Clock,
  CheckCircle,
  XCircle,
  Loader2,
  Copy,
  Check,
  AlertTriangle
} from 'lucide-react';
import { PermissionGate, useAdminPermissions } from '@/components/auth/permission-gate';
import { ActionConfirmDialog } from '@/components/ui/action-confirm-dialog';
import { AdminPermission, AdminRole, ROLE_DISPLAY_INFO } from '@/lib/admin-rbac';
import { useAdminPortalUsers, useAdminUserActions, AdminPortalUser, AdminUserStatus } from '@/hooks/use-admin-portal-users';

// Status display configuration
const statusColors: Record<AdminUserStatus | 'DEACTIVATED', { bg: string; text: string; icon: typeof CheckCircle }> = {
  ACTIVE: { bg: 'bg-emerald-100 dark:bg-emerald-500/20', text: 'text-emerald-700 dark:text-emerald-400', icon: CheckCircle },
  DEACTIVATED: { bg: 'bg-slate-100 dark:bg-slate-700', text: 'text-slate-600 dark:text-slate-400', icon: XCircle },
  LOCKED: { bg: 'bg-red-100 dark:bg-red-500/20', text: 'text-red-700 dark:text-red-400', icon: Ban },
  PENDING_MFA: { bg: 'bg-emerald-100 dark:bg-emerald-500/20', text: 'text-emerald-700 dark:text-emerald-400', icon: CheckCircle }, // Legacy - treat as active
};

// Copy button component for credentials
function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  
  const handleCopy = async () => {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  
  return (
    <button
      onClick={handleCopy}
      className="p-2 rounded-lg bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors"
      title="Copy to clipboard"
    >
      {copied ? (
        <Check className="h-4 w-4 text-emerald-500" />
      ) : (
        <Copy className="h-4 w-4 text-slate-500" />
      )}
    </button>
  );
}

// Helper to get display name
function getDisplayName(admin: AdminPortalUser): string {
  if (admin.firstName || admin.lastName) {
    return [admin.firstName, admin.lastName].filter(Boolean).join(' ');
  }
  return admin.email.split('@')[0];
}

// Form state for creating new admin
interface CreateAdminForm {
  name: string;
  email: string;
  password: string;
  confirmPassword: string;
  role: string;
}

export default function AdminUsersPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [selectedAdmin, setSelectedAdmin] = useState<AdminPortalUser | null>(null);
  const [actionType, setActionType] = useState<'deactivate' | 'reactivate' | 'unlock' | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createForm, setCreateForm] = useState<CreateAdminForm>({ name: '', email: '', password: '', confirmPassword: '', role: '' });
  const [createLoading, setCreateLoading] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const [createSuccess, setCreateSuccess] = useState<{ email: string } | null>(null);
  
  const permissions = useAdminPermissions();
  
  // Fetch admin portal users from auth-service
  const { admins, loading, error, refresh } = useAdminPortalUsers();
  const { createAdmin, updateStatus, loading: actionLoading } = useAdminUserActions();
  
  // Filter admins based on search and status
  const filteredAdmins = useMemo(() => {
    return admins.filter(admin => {
      if (statusFilter !== 'ALL' && admin.status !== statusFilter) return false;
      if (roleFilter !== 'ALL' && admin.role !== roleFilter) return false;
      if (searchQuery) {
        const searchLower = searchQuery.toLowerCase();
        const displayName = getDisplayName(admin);
        return (
          displayName.toLowerCase().includes(searchLower) ||
          admin.email.toLowerCase().includes(searchLower)
        );
      }
      return true;
    });
  }, [admins, searchQuery, roleFilter, statusFilter]);
  
  const handleAction = (admin: AdminPortalUser, action: 'deactivate' | 'reactivate' | 'unlock') => {
    setSelectedAdmin(admin);
    setActionType(action);
  };
  
  const executeAction = async () => {
    if (!selectedAdmin || !actionType) return;
    
    try {
      let status: 'ACTIVE' | 'DEACTIVATED' | 'LOCKED';
      switch (actionType) {
        case 'deactivate':
          status = 'DEACTIVATED';
          break;
        case 'reactivate':
        case 'unlock':
          status = 'ACTIVE';
          break;
      }
      
      const result = await updateStatus(selectedAdmin.id, status, `${actionType} by admin`);
      if (result.success) {
        refresh();
      }
    } catch (err) {
      console.error(`Failed to ${actionType} admin:`, err);
    }
    
    setSelectedAdmin(null);
    setActionType(null);
  };

  // Handle create admin form submission
  const handleCreateAdmin = async () => {
    // Validate form
    if (!createForm.name || !createForm.email || !createForm.password || !createForm.role) {
      setCreateError('Please fill in all fields');
      return;
    }

    if (createForm.password.length < 8) {
      setCreateError('Password must be at least 8 characters');
      return;
    }

    if (createForm.password !== createForm.confirmPassword) {
      setCreateError('Passwords do not match');
      return;
    }

    // Parse name into first and last name
    const nameParts = createForm.name.trim().split(/\s+/);
    const firstName = nameParts[0] || '';
    const lastName = nameParts.length > 1 ? nameParts.slice(1).join(' ') : firstName;

    setCreateLoading(true);
    setCreateError(null);

    try {
      const result = await createAdmin({
        email: createForm.email,
        password: createForm.password,
        firstName,
        lastName,
        role: createForm.role as 'ADMIN' | 'COMPLIANCE_REVIEWER' | 'VIEWER',
      });

      if (result.success) {
        setCreateSuccess({ email: createForm.email });
        setCreateForm({ name: '', email: '', password: '', confirmPassword: '', role: '' });
        refresh();
      } else {
        setCreateError(result.error || 'Failed to create admin user');
      }
    } catch (err) {
      console.error('Failed to create admin:', err);
      setCreateError('An unexpected error occurred');
    } finally {
      setCreateLoading(false);
    }
  };

  // Close create modal and reset state
  const closeCreateModal = () => {
    setShowCreateModal(false);
    setCreateForm({ name: '', email: '', password: '', confirmPassword: '', role: '' });
    setCreateError(null);
    setCreateSuccess(null);
  };
  
  const getActionTitle = () => {
    switch (actionType) {
      case 'deactivate': return 'Deactivate Admin User';
      case 'reactivate': return 'Reactivate Admin User';
      case 'unlock': return 'Unlock Admin User';
      default: return '';
    }
  };
  
  const getActionDescription = () => {
    const userName = selectedAdmin ? getDisplayName(selectedAdmin) : '';
    switch (actionType) {
      case 'deactivate': return `Are you sure you want to deactivate ${userName}? They will lose access to the admin portal.`;
      case 'reactivate': return `Are you sure you want to reactivate ${userName}? They will regain access to the admin portal.`;
      case 'unlock': return `Are you sure you want to unlock ${userName}? Their login attempts will be reset.`;
      default: return '';
    }
  };
  
  // Stats from real data
  const stats = useMemo(() => ({
    total: admins.length,
    active: admins.filter(a => a.status === 'ACTIVE').length,
    locked: admins.filter(a => a.status === 'LOCKED').length,
    deactivated: admins.filter(a => a.status === 'DEACTIVATED').length,
  }), [admins]);
  
  // Loading state
  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-amber-500" />
        <span className="ml-3 text-slate-600 dark:text-slate-400">Loading admin users...</span>
      </div>
    );
  }
  
  // Error state
  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-64">
        <AlertTriangle className="h-12 w-12 text-red-500 mb-4" />
        <h3 className="text-lg font-medium text-slate-900 dark:text-white">Failed to load admin users</h3>
        <p className="text-slate-500 dark:text-slate-400 mt-1">{error}</p>
        <button
          onClick={() => refresh()}
          className="mt-4 px-4 py-2 bg-amber-500 text-white rounded-lg hover:bg-amber-600 transition-colors"
        >
          Try Again
        </button>
      </div>
    );
  }
  
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
              <div className="h-10 w-10 rounded-lg bg-slate-100 dark:bg-slate-700 flex items-center justify-center">
                <XCircle className="h-5 w-5 text-slate-600 dark:text-slate-400" />
              </div>
              <div>
                <p className="text-sm text-slate-600 dark:text-slate-400">Deactivated</p>
                <p className="text-2xl font-bold text-slate-600 dark:text-slate-400">{stats.deactivated}</p>
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
                <option value="DEACTIVATED">Deactivated</option>
                <option value="LOCKED">Locked</option>
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
                    Last Login
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-700/50">
                {filteredAdmins.map((admin) => {
                  const StatusIcon = statusColors[admin.status]?.icon || CheckCircle;
                  const statusStyle = statusColors[admin.status] || statusColors.ACTIVE;
                  const roleInfo = ROLE_DISPLAY_INFO[admin.role as AdminRole] || ROLE_DISPLAY_INFO[AdminRole.ADMIN];
                  const displayName = getDisplayName(admin);
                  
                  return (
                    <tr key={admin.id} className="bg-white dark:bg-slate-800/30 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors">
                      <td className="px-4 py-4">
                        <div className="flex items-center gap-3">
                          <div className="h-10 w-10 rounded-full bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center shadow-lg">
                            <span className="text-white font-semibold">
                              {displayName.charAt(0).toUpperCase()}
                            </span>
                          </div>
                          <div>
                            <p className="font-medium text-slate-900 dark:text-white">
                              {displayName}
                            </p>
                            <p className="text-sm text-slate-500 dark:text-slate-400">
                              {admin.email}
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
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${statusStyle.bg} ${statusStyle.text}`}>
                          <StatusIcon className="h-3 w-3" />
                          {admin.status.replace('_', ' ')}
                        </span>
                      </td>
                      <td className="px-4 py-4 text-sm text-slate-600 dark:text-slate-400">
                        {admin.lastLoginAt ? (
                          <div className="flex items-center gap-1.5">
                            <Clock className="h-4 w-4 text-slate-400" />
                            {new Date(admin.lastLoginAt).toLocaleString()}
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
                          
                          <PermissionGate permission={AdminPermission.ADMIN_DEACTIVATE}>
                            {admin.status === 'LOCKED' && (
                              <button
                                onClick={() => handleAction(admin, 'unlock')}
                                className="p-2 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-500/10 rounded-lg transition-colors"
                                title="Unlock"
                                disabled={actionLoading}
                              >
                                <RefreshCw className="h-4 w-4" />
                              </button>
                            )}
                            
                            {admin.status === 'ACTIVE' && (
                              <button
                                onClick={() => handleAction(admin, 'deactivate')}
                                className="p-2 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-lg transition-colors"
                                title="Deactivate"
                                disabled={actionLoading}
                              >
                                <Ban className="h-4 w-4" />
                              </button>
                            )}
                            
                            {admin.status === 'DEACTIVATED' && (
                              <button
                                onClick={() => handleAction(admin, 'reactivate')}
                                className="p-2 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-500/10 rounded-lg transition-colors"
                                title="Reactivate"
                                disabled={actionLoading}
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
          
          {filteredAdmins.length === 0 && (
            <div className="p-8 text-center">
              <Users className="h-12 w-12 text-slate-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-slate-900 dark:text-white">
                No admin users found
              </h3>
              <p className="text-slate-500 dark:text-slate-400 mt-1">
                {admins.length === 0 ? 'Create your first admin user to get started' : 'Try adjusting your filters'}
              </p>
            </div>
          )}
        </div>
        
        {/* Action Confirmation */}
        <ActionConfirmDialog
          isOpen={!!selectedAdmin && !!actionType}
          onClose={() => { setSelectedAdmin(null); setActionType(null); }}
          onConfirm={executeAction}
          title={getActionTitle()}
          description={getActionDescription()}
          severity={actionType === 'deactivate' ? 'danger' : 'warning'}
          confirmText={actionType ? actionType.charAt(0).toUpperCase() + actionType.slice(1) : ''}
          auditMessage="This action will be logged in the security audit trail with your admin ID and timestamp."
          requireConfirmPhrase={actionType === 'deactivate'}
          confirmPhrase={selectedAdmin?.email}
        />
        
        {/* Create Admin Modal */}
        {showCreateModal && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
            <div className="bg-white dark:bg-slate-800 rounded-xl shadow-2xl max-w-lg w-full mx-4 border border-slate-200 dark:border-slate-700">
              <div className="p-6 border-b border-slate-200 dark:border-slate-700">
                <h2 className="text-xl font-semibold text-slate-900 dark:text-white">
                  {createSuccess ? 'Admin Created Successfully' : 'Add Admin User'}
                </h2>
                <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                  {createSuccess ? 'The admin account has been created' : 'Create a new administrator account'}
                </p>
              </div>
              
              {createSuccess ? (
                // Success state
                <div className="p-6 space-y-4">
                  <div className="p-4 bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/30 rounded-lg">
                    <div className="flex items-center gap-2 mb-3">
                      <CheckCircle className="h-5 w-5 text-emerald-500" />
                      <span className="font-medium text-emerald-800 dark:text-emerald-300">Admin user created successfully!</span>
                    </div>
                    <p className="text-sm text-emerald-700 dark:text-emerald-400">
                      Account created for <strong>{createSuccess.email}</strong>. They can now log in.
                    </p>
                  </div>
                </div>
              ) : (
                // Form state
                <div className="p-6 space-y-4">
                  {createError && (
                    <div className="p-3 bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/30 rounded-lg">
                      <p className="text-sm text-red-700 dark:text-red-400">{createError}</p>
                    </div>
                  )}
                  
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                      Full Name
                    </label>
                    <input 
                      type="text" 
                      value={createForm.name}
                      onChange={(e) => setCreateForm(f => ({ ...f, name: e.target.value }))}
                      className="w-full h-10 px-3 rounded-lg border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-700/50 text-slate-900 dark:text-white placeholder:text-slate-400 focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20" 
                      placeholder="John Smith" 
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                      Email Address
                    </label>
                    <input 
                      type="email" 
                      value={createForm.email}
                      onChange={(e) => setCreateForm(f => ({ ...f, email: e.target.value }))}
                      className="w-full h-10 px-3 rounded-lg border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-700/50 text-slate-900 dark:text-white placeholder:text-slate-400 focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20" 
                      placeholder="john@veridex.io" 
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                      Password
                    </label>
                    <input 
                      type="password" 
                      value={createForm.password}
                      onChange={(e) => setCreateForm(f => ({ ...f, password: e.target.value }))}
                      className="w-full h-10 px-3 rounded-lg border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-700/50 text-slate-900 dark:text-white placeholder:text-slate-400 focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20" 
                      placeholder="••••••••" 
                    />
                    <p className="text-xs text-slate-500 mt-1">Minimum 8 characters</p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                      Confirm Password
                    </label>
                    <input 
                      type="password" 
                      value={createForm.confirmPassword}
                      onChange={(e) => setCreateForm(f => ({ ...f, confirmPassword: e.target.value }))}
                      className="w-full h-10 px-3 rounded-lg border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-700/50 text-slate-900 dark:text-white placeholder:text-slate-400 focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20" 
                      placeholder="••••••••" 
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                      Role
                    </label>
                    <select 
                      value={createForm.role}
                      onChange={(e) => setCreateForm(f => ({ ...f, role: e.target.value }))}
                      className="w-full h-10 px-3 rounded-lg border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-700/50 text-slate-900 dark:text-white focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20"
                    >
                      <option value="">Select a role...</option>
                      <option value="ADMIN">Admin</option>
                      <option value="COMPLIANCE_REVIEWER">Compliance Reviewer</option>
                      <option value="VIEWER">Viewer</option>
                    </select>
                  </div>
                  
                  <div className="p-4 bg-blue-50 dark:bg-blue-500/10 border border-blue-200 dark:border-blue-500/30 rounded-lg">
                    <p className="text-sm text-blue-800 dark:text-blue-300">
                      <strong>Note:</strong> The new admin will be able to log in immediately after creation.
                    </p>
                  </div>
                </div>
              )}
              
              <div className="p-6 border-t border-slate-200 dark:border-slate-700 flex justify-end gap-3">
                <button
                  onClick={closeCreateModal}
                  className="px-4 py-2 text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 font-medium rounded-lg transition-colors"
                >
                  {createSuccess ? 'Close' : 'Cancel'}
                </button>
                {!createSuccess && (
                  <button 
                    onClick={handleCreateAdmin}
                    disabled={createLoading}
                    className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white font-medium rounded-lg transition-all shadow-lg shadow-amber-500/25 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {createLoading ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Plus className="h-4 w-4" />
                    )}
                    {createLoading ? 'Creating...' : 'Create Admin'}
                  </button>
                )}
              </div>
            </div>
          </div>
        )}
    </div>
  );
}
