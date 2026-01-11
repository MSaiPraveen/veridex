'use client';

import { useState, useEffect } from 'react';
import {
  Building2,
  Search,
  Filter,
  Eye,
  CheckCircle,
  XCircle,
  Ban,
  RefreshCw,
  ExternalLink,
  Clock,
  AlertTriangle,
  MoreHorizontal,
  Plus,
  ChevronDown
} from 'lucide-react';
import { PermissionGate, useAdminPermissions } from '@/components/auth/permission-gate';
import { AdminPermission } from '@/lib/admin-rbac';
import { adminApi } from '@/lib/admin-api';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge, StatusBadge } from '@/components/ui/badge';
import { SearchInput } from '@/components/ui/input';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell, Pagination } from '@/components/ui/table';
import { Dropdown, DropdownItem, DropdownDivider } from '@/components/ui/dropdown';
import { Modal } from '@/components/ui/modal';
import { SkeletonTable } from '@/components/ui/skeleton';
import { EmptyState, ErrorState } from '@/components/ui/empty-state';

// Types
interface Organization {
  id: string;
  name: string;
  email: string;
  status: 'PENDING' | 'ACTIVE' | 'SUSPENDED' | 'REJECTED';
  type: string;
  jurisdiction: string;
  createdAt: string;
  documentsCount: number;
  productsCount: number;
  complianceScore?: number;
}

type StatusFilter = 'ALL' | 'PENDING' | 'ACTIVE' | 'SUSPENDED' | 'REJECTED';

const statusMap: Record<string, 'pending' | 'active' | 'suspended' | 'rejected'> = {
  PENDING: 'pending',
  ACTIVE: 'active',
  SUSPENDED: 'suspended',
  REJECTED: 'rejected',
};

export default function OrganizationsPage() {
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('ALL');
  const [selectedOrg, setSelectedOrg] = useState<Organization | null>(null);
  const [actionType, setActionType] = useState<'approve' | 'reject' | 'suspend' | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [actionLoading, setActionLoading] = useState(false);

  const permissions = useAdminPermissions();
  const itemsPerPage = 10;

  // Fetch organizations
  useEffect(() => {
    fetchOrganizations();
  }, [statusFilter]);

  async function fetchOrganizations() {
    setLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams();
      if (statusFilter !== 'ALL') {
        params.append('status', statusFilter);
      }
      if (searchQuery) {
        params.append('search', searchQuery);
      }

      const response = await adminApi.get<{ organizations: Organization[] }>(
        `/admin/organizations?${params.toString()}`
      );

      if (response.success && response.data) {
        // Handle both API response formats (data array or organizations array)
        const orgsData = (response.data as any).organizations || (response.data as any).data || [];
        const mappedOrgs = orgsData.map((org: any) => ({
          ...org,
          id: org._id || org.id,
          status: org.status || (org.isVerified ? 'ACTIVE' : org.isActive ? 'PENDING' : 'SUSPENDED'),
          jurisdiction: org.address?.state || org.address?.country || 'Unknown',
          documentsCount: org.documentsCount || 0,
          productsCount: org.productsCount || 0,
        }));
        setOrganizations(mappedOrgs);
      } else {
        setError(response.error?.message || 'Failed to fetch organizations');
      }
    } catch (err) {
      setError('Failed to fetch organizations');
    } finally {
      setLoading(false);
    }
  }

  const handleAction = (org: Organization, action: 'approve' | 'reject' | 'suspend') => {
    setSelectedOrg(org);
    setActionType(action);
  };

  const executeAction = async () => {
    if (!selectedOrg || !actionType) return;

    setActionLoading(true);
    try {
      const endpoint = actionType === 'suspend'
        ? `/admin/organizations/${selectedOrg.id}/suspend`
        : `/admin/organizations/${selectedOrg.id}/review`;

      const body = actionType === 'suspend'
        ? { reasonCode: 'ADMIN_ACTION', reasonDetails: 'Suspended by admin', suspensionType: 'TEMPORARY' }
        : { action: actionType.toUpperCase(), reasonCode: 'ADMIN_DECISION', reasonDetails: `${actionType}d by admin` };

      await adminApi.post(endpoint, body);
      await fetchOrganizations();
    } finally {
      setActionLoading(false);
      setSelectedOrg(null);
      setActionType(null);
    }
  };

  // Mock data for demo
  const mockOrganizations: Organization[] = [
    { id: '1', name: 'GreenLeaf Labs', email: 'contact@greenleaflabs.com', status: 'PENDING', type: 'Manufacturer', jurisdiction: 'California', createdAt: '2025-12-28T10:00:00Z', documentsCount: 5, productsCount: 12, complianceScore: undefined },
    { id: '2', name: 'Pure Hemp Co', email: 'info@purehemp.co', status: 'ACTIVE', type: 'Distributor', jurisdiction: 'Colorado', createdAt: '2025-12-20T14:30:00Z', documentsCount: 8, productsCount: 24, complianceScore: 94 },
    { id: '3', name: 'CBD Wellness Inc', email: 'admin@cbdwellness.com', status: 'SUSPENDED', type: 'Retailer', jurisdiction: 'Oregon', createdAt: '2025-12-15T09:00:00Z', documentsCount: 3, productsCount: 8, complianceScore: 65 },
    { id: '4', name: 'Natural Extracts LLC', email: 'hello@naturalextracts.com', status: 'PENDING', type: 'Manufacturer', jurisdiction: 'Nevada', createdAt: '2025-12-30T16:45:00Z', documentsCount: 2, productsCount: 0, complianceScore: undefined },
    { id: '5', name: 'Herbal Solutions', email: 'support@herbalsolutions.io', status: 'ACTIVE', type: 'Manufacturer', jurisdiction: 'Washington', createdAt: '2025-12-01T11:20:00Z', documentsCount: 12, productsCount: 45, complianceScore: 98 },
  ];

  const displayOrgs = organizations.length > 0 ? organizations : mockOrganizations.filter(
    org => statusFilter === 'ALL' || org.status === statusFilter
  ).filter(
    org => !searchQuery || org.name.toLowerCase().includes(searchQuery.toLowerCase()) || org.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const paginatedOrgs = displayOrgs.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);
  const totalPages = Math.ceil(displayOrgs.length / itemsPerPage);

  // Stats
  const stats = [
    { label: 'Pending Review', value: mockOrganizations.filter(o => o.status === 'PENDING').length, variant: 'warning' as const },
    { label: 'Active', value: mockOrganizations.filter(o => o.status === 'ACTIVE').length, variant: 'success' as const },
    { label: 'Suspended', value: mockOrganizations.filter(o => o.status === 'SUSPENDED').length, variant: 'danger' as const },
    { label: 'Total', value: mockOrganizations.length, variant: 'info' as const },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">Organizations</h1>
          <p className="text-slate-400 mt-1">
            Manage and review organization applications
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="secondary" onClick={fetchOrganizations}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
          <PermissionGate permission={AdminPermission.ORG_APPROVE}>
            <Button variant="primary">
              <Plus className="h-4 w-4 mr-2" />
              Add Organization
            </Button>
          </PermissionGate>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat) => (
          <Card key={stat.label} className="p-4">
            <div className="flex items-center justify-between">
              <p className="text-sm text-slate-400">{stat.label}</p>
              <Badge variant={stat.variant} size="xs">{stat.value}</Badge>
            </div>
            <p className="text-2xl font-bold text-white mt-1">{stat.value}</p>
          </Card>
        ))}
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <SearchInput
                placeholder="Search organizations by name or email..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
              className="w-full md:w-48 px-3 py-2.5 rounded-lg appearance-none bg-slate-900/50 border border-slate-700 text-white focus:outline-none focus:ring-2 focus:ring-amber-500/50 focus:border-amber-500 transition-all"
            >
              <option value="ALL">All Status</option>
              <option value="PENDING">Pending Review</option>
              <option value="ACTIVE">Active</option>
              <option value="SUSPENDED">Suspended</option>
              <option value="REJECTED">Rejected</option>
            </select>
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card>
        {loading ? (
          <CardContent className="p-6">
            <SkeletonTable rows={5} cols={7} />
          </CardContent>
        ) : error ? (
          <CardContent className="p-6">
            <ErrorState
              title="Failed to load organizations"
              description={error}
              onRetry={fetchOrganizations}
            />
          </CardContent>
        ) : displayOrgs.length === 0 ? (
          <CardContent className="p-6">
            <EmptyState
              icon={<Building2 className="h-8 w-8" />}
              title="No organizations found"
              description={searchQuery ? "Try adjusting your search or filters" : "Organizations will appear here once they register"}
            />
          </CardContent>
        ) : (
          <>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Organization</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Jurisdiction</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Compliance</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedOrgs.map((org) => (
                  <TableRow key={org.id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-amber-500/20 to-amber-600/10 flex items-center justify-center">
                          <Building2 className="h-5 w-5 text-amber-500" />
                        </div>
                        <div>
                          <p className="font-medium text-white">{org.name}</p>
                          <p className="text-sm text-slate-400">{org.email}</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="text-slate-300">{org.type}</TableCell>
                    <TableCell className="text-slate-300">{org.jurisdiction}</TableCell>
                    <TableCell>
                      <StatusBadge status={statusMap[org.status] || 'pending'} />
                    </TableCell>
                    <TableCell>
                      {org.complianceScore !== undefined ? (
                        <div className="flex items-center gap-2">
                          <div className="w-16 h-2 bg-slate-700 rounded-full overflow-hidden">
                            <div
                              className={`h-full rounded-full transition-all ${org.complianceScore >= 90 ? 'bg-emerald-500' :
                                  org.complianceScore >= 70 ? 'bg-amber-500' : 'bg-red-500'
                                }`}
                              style={{ width: `${org.complianceScore}%` }}
                            />
                          </div>
                          <span className="text-sm text-slate-400">{org.complianceScore}%</span>
                        </div>
                      ) : (
                        <span className="text-sm text-slate-500">N/A</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1 text-slate-400">
                        <Clock className="h-4 w-4" />
                        <span className="text-sm">{new Date(org.createdAt).toLocaleDateString()}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center justify-end gap-1">
                        <Button variant="ghost" size="sm" className="p-2">
                          <Eye className="h-4 w-4" />
                        </Button>

                        <Dropdown
                          trigger={
                            <Button variant="ghost" size="sm" className="p-2">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          }
                          align="end"
                        >
                          <DropdownItem icon={<Eye className="h-4 w-4" />}>
                            View Details
                          </DropdownItem>
                          <DropdownItem icon={<ExternalLink className="h-4 w-4" />}>
                            Open Portal
                          </DropdownItem>
                          <DropdownDivider />

                          {org.status === 'PENDING' && (
                            <>
                              <PermissionGate permission={AdminPermission.ORG_APPROVE}>
                                <DropdownItem
                                  icon={<CheckCircle className="h-4 w-4 text-emerald-400" />}
                                  onClick={() => handleAction(org, 'approve')}
                                >
                                  Approve
                                </DropdownItem>
                              </PermissionGate>
                              <PermissionGate permission={AdminPermission.ORG_REJECT}>
                                <DropdownItem
                                  icon={<XCircle className="h-4 w-4 text-red-400" />}
                                  onClick={() => handleAction(org, 'reject')}
                                  danger
                                >
                                  Reject
                                </DropdownItem>
                              </PermissionGate>
                            </>
                          )}

                          {org.status === 'ACTIVE' && (
                            <PermissionGate permission={AdminPermission.ORG_SUSPEND}>
                              <DropdownItem
                                icon={<Ban className="h-4 w-4 text-amber-400" />}
                                onClick={() => handleAction(org, 'suspend')}
                                danger
                              >
                                Suspend
                              </DropdownItem>
                            </PermissionGate>
                          )}
                        </Dropdown>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>

            {totalPages > 1 && (
              <div className="border-t border-slate-700/50 px-4 py-3">
                <Pagination
                  currentPage={currentPage}
                  totalPages={totalPages}
                  totalItems={displayOrgs.length}
                  itemsPerPage={itemsPerPage}
                  onPageChange={setCurrentPage}
                />
              </div>
            )}
          </>
        )}
      </Card>

      {/* Action Confirmation Modal */}
      <Modal
        isOpen={!!selectedOrg && !!actionType}
        onClose={() => { setSelectedOrg(null); setActionType(null); }}
        title={
          actionType === 'approve' ? 'Approve Organization' :
            actionType === 'reject' ? 'Reject Organization' :
              'Suspend Organization'
        }
      >
        <div className="space-y-4">
          <p className="text-slate-300">
            {actionType === 'approve'
              ? `Are you sure you want to approve ${selectedOrg?.name}? They will gain access to the platform.`
              : actionType === 'reject'
                ? `Are you sure you want to reject ${selectedOrg?.name}? This action can be reversed.`
                : `Are you sure you want to suspend ${selectedOrg?.name}? All their products will be hidden.`}
          </p>

          <div className="p-3 bg-slate-700/30 rounded-lg">
            <p className="text-xs text-slate-400">
              This action will be logged in the audit trail with your admin ID and timestamp.
            </p>
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <Button
              variant="secondary"
              onClick={() => { setSelectedOrg(null); setActionType(null); }}
            >
              Cancel
            </Button>
            <Button
              variant={actionType === 'approve' ? 'success' : 'danger'}
              onClick={executeAction}
              disabled={actionLoading}
            >
              {actionLoading ? (
                <>
                  <span className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Processing...
                </>
              ) : (
                actionType === 'approve' ? 'Approve' : actionType === 'reject' ? 'Reject' : 'Suspend'
              )}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
