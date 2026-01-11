'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  Store,
  Search,
  Filter,
  Eye,
  CheckCircle,
  XCircle,
  Clock,
  AlertTriangle,
  Building2,
  Package,
  FileText,
  MoreVertical,
  ExternalLink,
  Mail,
  Phone,
  MapPin,
  TrendingUp,
  TrendingDown,
  RefreshCw,
  ChevronRight,
  Ban,
  ShieldCheck,
  User
} from 'lucide-react';
import Link from 'next/link';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge, StatusBadge } from '@/components/ui/badge';
import { SearchInput, Select } from '@/components/ui/input';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell, Pagination } from '@/components/ui/table';
import { Dropdown, DropdownItem, DropdownDivider } from '@/components/ui/dropdown';
import { SkeletonTable } from '@/components/ui/skeleton';
import { EmptyState, ErrorState } from '@/components/ui/empty-state';
import { PermissionGate, useAdminPermissions } from '@/components/auth/permission-gate';
import { AdminPermission } from '@/lib/admin-rbac';
import { adminApi } from '@/lib/admin-api';

// Types
interface Merchant {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  phone?: string;
  status: 'ACTIVE' | 'PENDING' | 'SUSPENDED' | 'INACTIVE';
  organizationId?: string;
  organizationName?: string;
  role: string;
  createdAt: string;
  lastLoginAt?: string;
  productsCount: number;
  documentsCount: number;
  complianceScore?: number;
  pendingDocuments: number;
}

interface MerchantStats {
  total: number;
  active: number;
  pending: number;
  suspended: number;
  withPendingDocs: number;
}

const statusConfig: Record<string, { bg: string; text: string; icon: typeof CheckCircle }> = {
  ACTIVE: { bg: 'bg-emerald-500/10', text: 'text-emerald-400', icon: CheckCircle },
  PENDING: { bg: 'bg-amber-500/10', text: 'text-amber-400', icon: Clock },
  SUSPENDED: { bg: 'bg-red-500/10', text: 'text-red-400', icon: Ban },
  INACTIVE: { bg: 'bg-slate-500/10', text: 'text-slate-400', icon: XCircle },
};

export default function MerchantsPage() {
  const [merchants, setMerchants] = useState<Merchant[]>([]);
  const [stats, setStats] = useState<MerchantStats>({ total: 0, active: 0, pending: 0, suspended: 0, withPendingDocs: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const itemsPerPage = 15;

  const permissions = useAdminPermissions();

  // Fetch merchants from API - NO MOCK FALLBACKS
  const fetchMerchants = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const params: Record<string, string | number> = {
        page: currentPage,
        limit: itemsPerPage,
        role: 'merchant', // Filter to only merchant users
      };

      if (statusFilter !== 'ALL') {
        params.status = statusFilter;
      }
      if (searchQuery) {
        params.search = searchQuery;
      }

      const response = await adminApi.get<{ data: Merchant[]; total: number; totalPages: number }>(
        `/admin/users?${new URLSearchParams(params as Record<string, string>).toString()}`
      );

      if (response.success && response.data) {
        // Use real API data - enrich with counts from API (or show 0 if not available)
        const apiData = response.data.data || [];
        const enrichedMerchants = apiData.map((user: any) => ({
          ...user,
          id: user._id || user.id,
          status: user.status || (user.isActive ? 'ACTIVE' : 'INACTIVE'),
          productsCount: user.productsCount || 0,
          documentsCount: user.documentsCount || 0,
          pendingDocuments: user.pendingDocuments || 0,
          complianceScore: user.complianceScore || 0,
        }));
        setMerchants(enrichedMerchants);
        setTotalPages(response.data.totalPages || 1);

        // Calculate stats from real data
        setStats({
          total: response.data.total || enrichedMerchants.length,
          active: enrichedMerchants.filter((m: Merchant) => m.status === 'ACTIVE').length,
          pending: enrichedMerchants.filter((m: Merchant) => m.status === 'PENDING').length,
          suspended: enrichedMerchants.filter((m: Merchant) => m.status === 'SUSPENDED').length,
          withPendingDocs: enrichedMerchants.filter((m: Merchant) => m.pendingDocuments > 0).length,
        });
      } else {
        // Show error state - NO MOCK FALLBACKS
        setError('Failed to load merchants. Please check API connection.');
        setMerchants([]);
        setStats({ total: 0, active: 0, pending: 0, suspended: 0, withPendingDocs: 0 });
      }
    } catch (err) {
      console.error('Failed to fetch merchants:', err);
      // Show error state - NO MOCK FALLBACKS
      setError(`Failed to fetch merchants: ${err instanceof Error ? err.message : 'Unknown error'}`);
      setMerchants([]);
      setStats({ total: 0, active: 0, pending: 0, suspended: 0, withPendingDocs: 0 });
    } finally {
      setLoading(false);
    }
  }, [currentPage, statusFilter, searchQuery]);

  useEffect(() => {
    fetchMerchants();
  }, [fetchMerchants]);

  // Filter merchants locally for search
  const filteredMerchants = merchants.filter(merchant => {
    const matchesSearch = !searchQuery ||
      merchant.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      `${merchant.firstName} ${merchant.lastName}`.toLowerCase().includes(searchQuery.toLowerCase()) ||
      merchant.organizationName?.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesStatus = statusFilter === 'ALL' || merchant.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const getComplianceColor = (score: number) => {
    if (score >= 90) return 'text-emerald-400';
    if (score >= 70) return 'text-amber-400';
    return 'text-red-400';
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Merchants</h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1">
            Manage merchant accounts, view compliance status, and review activity
          </p>
        </div>
        <Button variant="secondary" onClick={fetchMerchants}>
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-500 dark:text-slate-400">Total Merchants</p>
              <p className="text-2xl font-bold text-slate-900 dark:text-white mt-1">{stats.total}</p>
            </div>
            <Store className="h-8 w-8 text-slate-400" />
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-500 dark:text-slate-400">Active</p>
              <p className="text-2xl font-bold text-emerald-500 mt-1">{stats.active}</p>
            </div>
            <CheckCircle className="h-8 w-8 text-emerald-400" />
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-500 dark:text-slate-400">Pending Review</p>
              <p className="text-2xl font-bold text-amber-500 mt-1">{stats.pending}</p>
            </div>
            <Clock className="h-8 w-8 text-amber-400" />
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-500 dark:text-slate-400">Suspended</p>
              <p className="text-2xl font-bold text-red-500 mt-1">{stats.suspended}</p>
            </div>
            <Ban className="h-8 w-8 text-red-400" />
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-500 dark:text-slate-400">Pending Docs</p>
              <p className="text-2xl font-bold text-blue-500 mt-1">{stats.withPendingDocs}</p>
            </div>
            <FileText className="h-8 w-8 text-blue-400" />
          </div>
        </Card>
      </div>

      {/* Filters */}
      <Card className="p-4">
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex-1 min-w-[250px]">
            <SearchInput
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by name, email, or organization..."
            />
          </div>
          <Select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            options={[
              { value: 'ALL', label: 'All Statuses' },
              { value: 'ACTIVE', label: 'Active' },
              { value: 'PENDING', label: 'Pending' },
              { value: 'SUSPENDED', label: 'Suspended' },
              { value: 'INACTIVE', label: 'Inactive' },
            ]}
          />
        </div>
      </Card>

      {/* Merchants Table */}
      {loading ? (
        <SkeletonTable rows={8} cols={7} />
      ) : error ? (
        <ErrorState
          title="Failed to load merchants"
          description={error}
          onRetry={fetchMerchants}
        />
      ) : filteredMerchants.length === 0 ? (
        <EmptyState
          icon={<Store className="h-12 w-12" />}
          title="No merchants found"
          description="No merchants match your current filters"
        />
      ) : (
        <Card padding="none">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Merchant</TableHead>
                <TableHead>Organization</TableHead>
                <TableHead>Status</TableHead>
                <TableHead align="center">Products</TableHead>
                <TableHead align="center">Documents</TableHead>
                <TableHead align="center">Compliance</TableHead>
                <TableHead>Last Active</TableHead>
                <TableHead align="right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredMerchants.map((merchant) => {
                const status = statusConfig[merchant.status];
                const StatusIcon = status.icon;

                return (
                  <TableRow key={merchant.id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-full bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center text-white font-semibold shadow-lg shadow-amber-500/25">
                          {merchant.firstName?.[0]}{merchant.lastName?.[0]}
                        </div>
                        <div>
                          <p className="font-medium text-slate-900 dark:text-white">
                            {merchant.firstName} {merchant.lastName}
                          </p>
                          <p className="text-sm text-slate-500 dark:text-slate-400">{merchant.email}</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      {merchant.organizationName ? (
                        <Link
                          href={`/organizations/${merchant.organizationId}`}
                          className="flex items-center gap-2 text-slate-700 dark:text-slate-300 hover:text-amber-500 transition-colors"
                        >
                          <Building2 className="h-4 w-4" />
                          {merchant.organizationName}
                        </Link>
                      ) : (
                        <span className="text-slate-400">—</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${status.bg} ${status.text}`}>
                        <StatusIcon className="h-3 w-3" />
                        {merchant.status}
                      </span>
                    </TableCell>
                    <TableCell align="center">
                      <div className="flex items-center justify-center gap-1">
                        <Package className="h-4 w-4 text-slate-400" />
                        <span className="font-medium text-slate-900 dark:text-white">{merchant.productsCount}</span>
                      </div>
                    </TableCell>
                    <TableCell align="center">
                      <div className="flex items-center justify-center gap-2">
                        <span className="font-medium text-slate-900 dark:text-white">{merchant.documentsCount}</span>
                        {merchant.pendingDocuments > 0 && (
                          <span className="px-1.5 py-0.5 rounded-full bg-amber-500/10 text-amber-400 text-xs font-medium">
                            +{merchant.pendingDocuments}
                          </span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell align="center">
                      {merchant.complianceScore !== undefined ? (
                        <div className="flex items-center justify-center gap-1">
                          <span className={`font-bold ${getComplianceColor(merchant.complianceScore)}`}>
                            {merchant.complianceScore}%
                          </span>
                          {merchant.complianceScore >= 90 ? (
                            <TrendingUp className="h-4 w-4 text-emerald-400" />
                          ) : merchant.complianceScore < 70 ? (
                            <TrendingDown className="h-4 w-4 text-red-400" />
                          ) : null}
                        </div>
                      ) : (
                        <span className="text-slate-400">—</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <span className="text-slate-500 dark:text-slate-400 text-sm">
                        {merchant.lastLoginAt ? formatDate(merchant.lastLoginAt) : 'Never'}
                      </span>
                    </TableCell>
                    <TableCell align="right">
                      <div className="flex items-center justify-end gap-2">
                        <Link href={`/merchants/${merchant.id}`}>
                          <Button variant="ghost" size="sm">
                            <Eye className="h-4 w-4 mr-1" />
                            View
                          </Button>
                        </Link>
                        <Dropdown
                          trigger={
                            <button className="p-1.5 rounded-lg text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
                              <MoreVertical className="h-4 w-4" />
                            </button>
                          }
                          align="end"
                        >
                          <DropdownItem icon={<User className="h-4 w-4" />}>
                            View Profile
                          </DropdownItem>
                          <DropdownItem icon={<FileText className="h-4 w-4" />}>
                            View Documents
                          </DropdownItem>
                          <DropdownItem icon={<Package className="h-4 w-4" />}>
                            View Products
                          </DropdownItem>
                          <DropdownDivider />
                          <PermissionGate permission={AdminPermission.ORG_SUSPEND}>
                            {merchant.status === 'ACTIVE' ? (
                              <DropdownItem icon={<Ban className="h-4 w-4" />} danger>
                                Suspend Merchant
                              </DropdownItem>
                            ) : (
                              <DropdownItem icon={<CheckCircle className="h-4 w-4" />}>
                                Activate Merchant
                              </DropdownItem>
                            )}
                          </PermissionGate>
                        </Dropdown>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>

          {/* Pagination */}
          <div className="px-4 py-3 border-t border-slate-200 dark:border-slate-700">
            <Pagination
              currentPage={currentPage}
              totalPages={totalPages}
              totalItems={filteredMerchants.length}
              itemsPerPage={itemsPerPage}
              onPageChange={setCurrentPage}
            />
          </div>
        </Card>
      )}
    </div>
  );
}

// Mock data for development/demo
function getMockMerchants(): Merchant[] {
  return [
    {
      id: 'usr-001',
      email: 'owner@greenleaflabs.com',
      firstName: 'Michael',
      lastName: 'Green',
      status: 'ACTIVE',
      organizationId: 'org-001',
      organizationName: 'GreenLeaf Labs',
      role: 'OWNER',
      createdAt: '2025-06-15T10:00:00Z',
      lastLoginAt: '2026-01-03T08:30:00Z',
      productsCount: 6,
      documentsCount: 12,
      pendingDocuments: 2,
      complianceScore: 94,
    },
    {
      id: 'usr-002',
      email: 'owner@purewellness.co',
      firstName: 'Jennifer',
      lastName: 'Pure',
      status: 'ACTIVE',
      organizationId: 'org-002',
      organizationName: 'Pure Wellness Co',
      role: 'OWNER',
      createdAt: '2025-08-20T14:00:00Z',
      lastLoginAt: '2026-01-02T16:45:00Z',
      productsCount: 7,
      documentsCount: 15,
      pendingDocuments: 0,
      complianceScore: 88,
    },
    {
      id: 'usr-003',
      email: 'owner@herbalremedies.inc',
      firstName: 'Patricia',
      lastName: 'Herbal',
      status: 'PENDING',
      organizationId: 'org-003',
      organizationName: 'Herbal Remedies Inc',
      role: 'OWNER',
      createdAt: '2025-12-01T09:00:00Z',
      lastLoginAt: '2025-12-28T11:00:00Z',
      productsCount: 7,
      documentsCount: 8,
      pendingDocuments: 5,
      complianceScore: 65,
    },
    {
      id: 'usr-004',
      email: 'admin@purewellness.co',
      firstName: 'Robert',
      lastName: 'Wellness',
      status: 'ACTIVE',
      organizationId: 'org-002',
      organizationName: 'Pure Wellness Co',
      role: 'ADMIN',
      createdAt: '2025-09-10T10:00:00Z',
      lastLoginAt: '2026-01-03T07:00:00Z',
      productsCount: 0,
      documentsCount: 5,
      pendingDocuments: 1,
      complianceScore: 91,
    },
    {
      id: 'usr-005',
      email: 'staff@greenleaflabs.com',
      firstName: 'Sarah',
      lastName: 'Leaf',
      status: 'SUSPENDED',
      organizationId: 'org-001',
      organizationName: 'GreenLeaf Labs',
      role: 'STAFF',
      createdAt: '2025-07-01T12:00:00Z',
      lastLoginAt: '2025-11-15T10:00:00Z',
      productsCount: 0,
      documentsCount: 3,
      pendingDocuments: 0,
      complianceScore: 72,
    },
  ];
}
