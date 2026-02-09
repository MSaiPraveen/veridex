'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  Users,
  Search,
  Eye,
  CheckCircle,
  XCircle,
  Clock,
  Mail,
  RefreshCw,
  ChevronRight,
  Ban,
  User,
  Calendar,
  Activity,
  MoreVertical
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
interface Consumer {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  phone?: string;
  status: 'ACTIVE' | 'PENDING' | 'SUSPENDED' | 'INACTIVE';
  role: string;
  createdAt: string;
  lastLoginAt?: string;
  isEmailVerified?: boolean;
}

interface ConsumerStats {
  total: number;
  active: number;
  pending: number;
  suspended: number;
  inactive: number;
}

const statusConfig: Record<string, { bg: string; text: string; icon: typeof CheckCircle }> = {
  ACTIVE: { bg: 'bg-emerald-500/10', text: 'text-emerald-400', icon: CheckCircle },
  PENDING: { bg: 'bg-amber-500/10', text: 'text-amber-400', icon: Clock },
  SUSPENDED: { bg: 'bg-red-500/10', text: 'text-red-400', icon: Ban },
  INACTIVE: { bg: 'bg-slate-500/10', text: 'text-slate-400', icon: XCircle },
};

export default function ConsumersPage() {
  const [consumers, setConsumers] = useState<Consumer[]>([]);
  const [stats, setStats] = useState<ConsumerStats>({ total: 0, active: 0, pending: 0, suspended: 0, inactive: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const itemsPerPage = 15;

  const permissions = useAdminPermissions();

  // Fetch consumers from API
  const fetchConsumers = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const params: Record<string, string | number> = {
        role: 'CONSUMER',
        page: currentPage,
        limit: itemsPerPage,
      };

      if (statusFilter !== 'ALL') {
        params.status = statusFilter;
      }

      const queryString = new URLSearchParams(params as Record<string, string>).toString();
      const response = await adminApi.get<{
        data: any[];
        total: number;
        totalPages: number;
      }>(`/admin/users?${queryString}`);

      if (response.success && response.data) {
        const users = response.data.data || [];
        const enrichedConsumers = users.map((user: any) => ({
          id: user._id || user.id,
          email: user.email,
          firstName: user.firstName || '',
          lastName: user.lastName || '',
          phone: user.phone,
          status: user.status || 'ACTIVE',
          role: user.role || user.primaryRole || 'CONSUMER',
          createdAt: user.createdAt,
          lastLoginAt: user.lastLoginAt,
          isEmailVerified: user.isEmailVerified,
        }));
        setConsumers(enrichedConsumers);
        setTotalPages(response.data.totalPages || 1);

        // Calculate stats from real data
        setStats({
          total: response.data.total || enrichedConsumers.length,
          active: enrichedConsumers.filter((c: Consumer) => c.status === 'ACTIVE').length,
          pending: enrichedConsumers.filter((c: Consumer) => c.status === 'PENDING').length,
          suspended: enrichedConsumers.filter((c: Consumer) => c.status === 'SUSPENDED').length,
          inactive: enrichedConsumers.filter((c: Consumer) => c.status === 'INACTIVE').length,
        });
      } else {
        setError('Failed to load consumers. Please check API connection.');
        setConsumers([]);
        setStats({ total: 0, active: 0, pending: 0, suspended: 0, inactive: 0 });
      }
    } catch (err) {
      console.error('Failed to fetch consumers:', err);
      setError(`Failed to fetch consumers: ${err instanceof Error ? err.message : 'Unknown error'}`);
      setConsumers([]);
      setStats({ total: 0, active: 0, pending: 0, suspended: 0, inactive: 0 });
    } finally {
      setLoading(false);
    }
  }, [currentPage, statusFilter]);

  useEffect(() => {
    fetchConsumers();
  }, [fetchConsumers]);

  // Filter consumers locally for search
  const filteredConsumers = consumers.filter(consumer => {
    const matchesSearch = !searchQuery ||
      consumer.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      `${consumer.firstName} ${consumer.lastName}`.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesStatus = statusFilter === 'ALL' || consumer.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  const formatDate = (dateString: string) => {
    if (!dateString) return 'Never';
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Consumers</h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1">
            Manage consumer accounts and view activity
          </p>
        </div>
        <Button variant="secondary" onClick={fetchConsumers}>
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
              <Users className="h-5 w-5 text-slate-400" />
            </div>
            <div>
              <p className="text-sm text-slate-500 dark:text-slate-400">Total</p>
              <p className="text-2xl font-bold text-slate-900 dark:text-white">{stats.total}</p>
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-emerald-500/10 flex items-center justify-center">
              <CheckCircle className="h-5 w-5 text-emerald-400" />
            </div>
            <div>
              <p className="text-sm text-slate-500 dark:text-slate-400">Active</p>
              <p className="text-2xl font-bold text-emerald-400">{stats.active}</p>
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-amber-500/10 flex items-center justify-center">
              <Clock className="h-5 w-5 text-amber-400" />
            </div>
            <div>
              <p className="text-sm text-slate-500 dark:text-slate-400">Pending</p>
              <p className="text-2xl font-bold text-amber-400">{stats.pending}</p>
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-red-500/10 flex items-center justify-center">
              <Ban className="h-5 w-5 text-red-400" />
            </div>
            <div>
              <p className="text-sm text-slate-500 dark:text-slate-400">Suspended</p>
              <p className="text-2xl font-bold text-red-400">{stats.suspended}</p>
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
              <XCircle className="h-5 w-5 text-slate-400" />
            </div>
            <div>
              <p className="text-sm text-slate-500 dark:text-slate-400">Inactive</p>
              <p className="text-2xl font-bold text-slate-400">{stats.inactive}</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Filters */}
      <Card className="p-4">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1">
            <SearchInput
              placeholder="Search by email or name..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <Select
            value={statusFilter}
            onChange={(e) => { setStatusFilter(e.target.value); setCurrentPage(1); }}
            options={[
              { value: 'ALL', label: 'All Status' },
              { value: 'ACTIVE', label: 'Active' },
              { value: 'PENDING', label: 'Pending' },
              { value: 'SUSPENDED', label: 'Suspended' },
              { value: 'INACTIVE', label: 'Inactive' },
            ]}
          />
        </div>
      </Card>

      {/* Content */}
      {loading ? (
        <Card className="p-4">
          <SkeletonTable rows={5} cols={5} />
        </Card>
      ) : error ? (
        <ErrorState
          title="Failed to Load Consumers"
          description={error}
          onRetry={fetchConsumers}
        />
      ) : filteredConsumers.length === 0 ? (
        <EmptyState
          icon={<Users className="h-12 w-12" />}
          title="No Consumers Found"
          description={searchQuery || statusFilter !== 'ALL'
            ? "No consumers match your current filters. Try adjusting your search."
            : "No consumer accounts have been created yet."
          }
        />
      ) : (
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Consumer</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Joined</TableHead>
                <TableHead>Last Login</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredConsumers.map((consumer) => {
                const StatusIcon = statusConfig[consumer.status]?.icon || Clock;
                return (
                  <TableRow key={consumer.id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
                          <User className="h-5 w-5 text-slate-400" />
                        </div>
                        <div>
                          <p className="font-medium text-slate-900 dark:text-white">
                            {consumer.firstName} {consumer.lastName}
                          </p>
                          <p className="text-sm text-slate-500">Consumer</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Mail className="h-4 w-4 text-slate-400" />
                        <span className="text-slate-600 dark:text-slate-300">{consumer.email}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge className={`${statusConfig[consumer.status]?.bg} ${statusConfig[consumer.status]?.text}`}>
                        <StatusIcon className="h-3 w-3 mr-1" />
                        {consumer.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2 text-slate-500">
                        <Calendar className="h-4 w-4" />
                        {formatDate(consumer.createdAt)}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2 text-slate-500">
                        <Activity className="h-4 w-4" />
                        {formatDate(consumer.lastLoginAt || '')}
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <PermissionGate permission={AdminPermission.USERS_READ}>
                        <Dropdown
                          trigger={
                            <button className="p-1.5 rounded-lg text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
                              <MoreVertical className="h-4 w-4" />
                            </button>
                          }
                        >
                          <DropdownItem 
                            onClick={() => window.open(`mailto:${consumer.email}`)}
                            icon={<Mail className="h-4 w-4" />}
                          >
                            Send Email
                          </DropdownItem>
                          <DropdownDivider />
                          {consumer.status === 'ACTIVE' ? (
                            <DropdownItem icon={<Ban className="h-4 w-4" />} danger>
                              Suspend Account
                            </DropdownItem>
                          ) : (
                            <DropdownItem icon={<CheckCircle className="h-4 w-4" />}>
                              Activate Account
                            </DropdownItem>
                          )}
                        </Dropdown>
                      </PermissionGate>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="p-4 border-t border-slate-200 dark:border-slate-700">
              <Pagination
                currentPage={currentPage}
                totalPages={totalPages}
                totalItems={filteredConsumers.length}
                itemsPerPage={itemsPerPage}
                onPageChange={setCurrentPage}
              />
            </div>
          )}
        </Card>
      )}
    </div>
  );
}
