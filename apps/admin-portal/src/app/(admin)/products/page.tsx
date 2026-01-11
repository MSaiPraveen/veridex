'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  Package,
  Eye,
  CheckCircle,
  XCircle,
  Clock,
  AlertTriangle,
  Building2,
  RefreshCw,
  Boxes,
  TrendingUp,
  Ban,
  Shield,
  MoreVertical,
  FileText,
  ExternalLink,
  ShieldCheck,
  ShieldAlert,
  ShieldQuestion,
  Loader2
} from 'lucide-react';
import Link from 'next/link';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge, StatusBadge } from '@/components/ui/badge';
import { SearchInput, Select, Textarea } from '@/components/ui/input';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell, Pagination } from '@/components/ui/table';
import { Modal } from '@/components/ui/modal';
import { Dropdown, DropdownItem, DropdownDivider } from '@/components/ui/dropdown';
import { EmptyState, ErrorState } from '@/components/ui/empty-state';
import { SkeletonTable, SkeletonCard } from '@/components/ui/skeleton';
import { PermissionGate, useAdminPermissions } from '@/components/auth/permission-gate';
import { AdminPermission } from '@/lib/admin-rbac';
import { adminApi } from '@/lib/admin-api';

// Types
interface Product {
  id: string;
  name: string;
  sku: string;
  organizationId: string;
  organizationName?: string;
  category?: string;
  status: 'DRAFT' | 'PENDING' | 'ACTIVE' | 'SUSPENDED' | 'DISCONTINUED';
  complianceStatus: 'COMPLIANT' | 'NON_COMPLIANT' | 'PENDING_REVIEW' | 'NEEDS_DOCS' | 'UNDER_REVIEW';
  createdAt: string;
  updatedAt?: string;
  batchCount?: number;
  documentsCount?: number;
  lastComplianceCheck?: string;
}

interface ProductStats {
  total: number;
  active: number;
  pending: number;
  suspended: number;
  compliant: number;
  nonCompliant: number;
}

const statusConfig: Record<string, { bg: string; text: string; icon: typeof CheckCircle }> = {
  DRAFT: { bg: 'bg-slate-500/10', text: 'text-slate-400', icon: Clock },
  PENDING: { bg: 'bg-amber-500/10', text: 'text-amber-400', icon: Clock },
  ACTIVE: { bg: 'bg-emerald-500/10', text: 'text-emerald-400', icon: CheckCircle },
  SUSPENDED: { bg: 'bg-red-500/10', text: 'text-red-400', icon: Ban },
  DISCONTINUED: { bg: 'bg-slate-500/10', text: 'text-slate-400', icon: XCircle },
};

const complianceConfig: Record<string, { bg: string; text: string; icon: typeof Shield }> = {
  COMPLIANT: { bg: 'bg-emerald-500/10', text: 'text-emerald-400', icon: ShieldCheck },
  NON_COMPLIANT: { bg: 'bg-red-500/10', text: 'text-red-400', icon: ShieldAlert },
  PENDING_REVIEW: { bg: 'bg-amber-500/10', text: 'text-amber-400', icon: ShieldQuestion },
  UNDER_REVIEW: { bg: 'bg-blue-500/10', text: 'text-blue-400', icon: Shield },
  NEEDS_DOCS: { bg: 'bg-orange-500/10', text: 'text-orange-400', icon: AlertTriangle },
};

export default function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [stats, setStats] = useState<ProductStats>({
    total: 0,
    active: 0,
    pending: 0,
    suspended: 0,
    compliant: 0,
    nonCompliant: 0,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [complianceFilter, setComplianceFilter] = useState('ALL');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const itemsPerPage = 15;

  // Action modal state
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [actionType, setActionType] = useState<'suspend' | 'reactivate' | null>(null);
  const [actionNote, setActionNote] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

  const permissions = useAdminPermissions();

  // Fetch products from API
  const fetchProducts = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const params: Record<string, string | number> = {
        page: currentPage,
        limit: itemsPerPage,
      };

      if (statusFilter !== 'ALL') {
        params.status = statusFilter;
      }
      if (complianceFilter !== 'ALL') {
        params.complianceStatus = complianceFilter;
      }
      if (searchQuery) {
        params.search = searchQuery;
      }

      const queryString = new URLSearchParams(params as Record<string, string>).toString();
      const response = await adminApi.get<{
        products: Product[];
        total: number;
        totalPages: number;
      }>(`/admin/products?${queryString}`);

      if (response.success && response.data) {
        // Handle both API response formats (data array or products array)
        const prods = (response.data as any).products || (response.data as any).data || [];
        setProducts(prods.map((p: any) => ({
          ...p,
          id: p._id || p.id,
        })));
        setTotalPages(response.data.totalPages || 1);
        setTotalItems(response.data.total || 0);

        // Calculate stats from real data
        setStats({
          total: response.data.total || prods.length,
          active: prods.filter((p: Product) => p.status === 'ACTIVE').length,
          pending: prods.filter((p: Product) => p.status === 'PENDING').length,
          suspended: prods.filter((p: Product) => p.status === 'SUSPENDED').length,
          compliant: prods.filter((p: Product) => p.complianceStatus === 'COMPLIANT').length,
          nonCompliant: prods.filter((p: Product) => p.complianceStatus === 'NON_COMPLIANT').length,
        });
      } else {
        // Show error - NO MOCK FALLBACKS
        setError('Failed to load products. Please check API connection.');
        setProducts([]);
        setStats({ total: 0, active: 0, pending: 0, suspended: 0, compliant: 0, nonCompliant: 0 });
      }
    } catch (err) {
      console.error('Failed to fetch products:', err);
      // Show error - NO MOCK FALLBACKS
      setError(`Failed to fetch products: ${err instanceof Error ? err.message : 'Unknown error'}`);
      setProducts([]);
      setStats({ total: 0, active: 0, pending: 0, suspended: 0, compliant: 0, nonCompliant: 0 });
    } finally {
      setLoading(false);
    }
  }, [currentPage, statusFilter, complianceFilter, searchQuery]);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  // Handle product action
  const handleAction = (product: Product, action: 'suspend' | 'reactivate') => {
    setSelectedProduct(product);
    setActionType(action);
    setActionNote('');
  };

  const executeAction = async () => {
    if (!selectedProduct || !actionType) return;

    setActionLoading(true);

    try {
      const newStatus = actionType === 'suspend' ? 'SUSPENDED' : 'ACTIVE';

      const response = await adminApi.patch(`/admin/products/${selectedProduct.id}/status`, {
        status: newStatus,
        note: actionNote || undefined,
      });

      if (response.success) {
        await fetchProducts();
        setSelectedProduct(null);
        setActionType(null);
        setActionNote('');
      } else {
        console.error('Failed to update product status:', response.error);
      }
    } catch (err) {
      console.error('Failed to execute action:', err);
    } finally {
      setActionLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  // Filter products locally for search
  const filteredProducts = products.filter(product => {
    if (!searchQuery) return true;
    const searchLower = searchQuery.toLowerCase();
    return (
      product.name.toLowerCase().includes(searchLower) ||
      product.sku.toLowerCase().includes(searchLower) ||
      product.organizationName?.toLowerCase().includes(searchLower) ||
      product.category?.toLowerCase().includes(searchLower)
    );
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Products</h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1">
            Manage and monitor all merchant products
          </p>
        </div>
        <Button variant="secondary" onClick={fetchProducts}>
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
              <Package className="h-5 w-5 text-slate-400" />
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
            <div className="h-10 w-10 rounded-lg bg-emerald-500/10 flex items-center justify-center">
              <ShieldCheck className="h-5 w-5 text-emerald-400" />
            </div>
            <div>
              <p className="text-sm text-slate-500 dark:text-slate-400">Compliant</p>
              <p className="text-2xl font-bold text-emerald-400">{stats.compliant}</p>
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-red-500/10 flex items-center justify-center">
              <ShieldAlert className="h-5 w-5 text-red-400" />
            </div>
            <div>
              <p className="text-sm text-slate-500 dark:text-slate-400">Non-Compliant</p>
              <p className="text-2xl font-bold text-red-400">{stats.nonCompliant}</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Filters */}
      <Card className="p-4">
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex-1 min-w-[250px]">
            <SearchInput
              placeholder="Search by name, SKU, or organization..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          <Select
            value={statusFilter}
            onChange={(e) => { setStatusFilter(e.target.value); setCurrentPage(1); }}
            options={[
              { value: 'ALL', label: 'All Status' },
              { value: 'DRAFT', label: 'Draft' },
              { value: 'PENDING', label: 'Pending' },
              { value: 'ACTIVE', label: 'Active' },
              { value: 'SUSPENDED', label: 'Suspended' },
              { value: 'DISCONTINUED', label: 'Discontinued' },
            ]}
          />

          <Select
            value={complianceFilter}
            onChange={(e) => { setComplianceFilter(e.target.value); setCurrentPage(1); }}
            options={[
              { value: 'ALL', label: 'All Compliance' },
              { value: 'COMPLIANT', label: 'Compliant' },
              { value: 'NON_COMPLIANT', label: 'Non-Compliant' },
              { value: 'PENDING_REVIEW', label: 'Pending Review' },
              { value: 'UNDER_REVIEW', label: 'Under Review' },
              { value: 'NEEDS_DOCS', label: 'Needs Documents' },
            ]}
          />
        </div>
      </Card>

      {/* Products Table */}
      {loading ? (
        <SkeletonTable rows={8} cols={7} />
      ) : error ? (
        <ErrorState
          title="Failed to load products"
          description={error}
          onRetry={fetchProducts}
        />
      ) : filteredProducts.length === 0 ? (
        <Card>
          <EmptyState
            icon={<Package className="h-12 w-12" />}
            title="No products found"
            description={searchQuery || statusFilter !== 'ALL' || complianceFilter !== 'ALL'
              ? "Try adjusting your search or filters"
              : "Products created by merchants will appear here"
            }
          />
        </Card>
      ) : (
        <Card padding="none">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Product</TableHead>
                <TableHead>Organization</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Compliance</TableHead>
                <TableHead align="center">Docs</TableHead>
                <TableHead>Created</TableHead>
                <TableHead align="right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredProducts.map((product) => {
                const status = statusConfig[product.status] || statusConfig.PENDING;
                const StatusIcon = status.icon;
                const compliance = complianceConfig[product.complianceStatus] || complianceConfig.PENDING_REVIEW;
                const ComplianceIcon = compliance.icon;

                return (
                  <TableRow key={product.id}>
                    <TableCell>
                      <div className="min-w-0">
                        <Link
                          href={`/products/${product.id}`}
                          className="font-medium text-slate-900 dark:text-white hover:text-amber-500 block truncate max-w-[200px]"
                          title={product.name}
                        >
                          {product.name}
                        </Link>
                        <p className="text-xs text-slate-500">
                          SKU: {product.sku}
                        </p>
                      </div>
                    </TableCell>
                    <TableCell>
                      {product.organizationName ? (
                        <Link
                          href={`/organizations/${product.organizationId}`}
                          className="flex items-center gap-2 text-slate-700 dark:text-slate-300 hover:text-amber-500 transition-colors"
                        >
                          <Building2 className="h-4 w-4 text-slate-500" />
                          <span className="truncate max-w-[120px]">{product.organizationName}</span>
                        </Link>
                      ) : (
                        <span className="text-slate-400">—</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <span className="text-slate-600 dark:text-slate-300">
                        {product.category || '—'}
                      </span>
                    </TableCell>
                    <TableCell>
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${status.bg} ${status.text}`}>
                        <StatusIcon className="h-3 w-3" />
                        {product.status}
                      </span>
                    </TableCell>
                    <TableCell>
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${compliance.bg} ${compliance.text}`}>
                        <ComplianceIcon className="h-3 w-3" />
                        {product.complianceStatus.replace(/_/g, ' ')}
                      </span>
                    </TableCell>
                    <TableCell align="center">
                      <div className="flex items-center justify-center gap-1">
                        <FileText className="h-4 w-4 text-slate-400" />
                        <span className="text-slate-900 dark:text-white">{product.documentsCount || 0}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className="text-slate-500 dark:text-slate-400 text-sm">
                        {formatDate(product.createdAt)}
                      </span>
                    </TableCell>
                    <TableCell align="right">
                      <div className="flex items-center justify-end gap-1">
                        <Link href={`/products/${product.id}`}>
                          <Button variant="ghost" size="sm" title="View Details">
                            <Eye className="h-4 w-4" />
                          </Button>
                        </Link>

                        <Dropdown
                          trigger={
                            <button className="p-1.5 rounded-lg text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-700/50 transition-colors">
                              <MoreVertical className="h-4 w-4" />
                            </button>
                          }
                          align="end"
                        >
                          <DropdownItem icon={<Eye className="h-4 w-4" />}>
                            <Link href={`/products/${product.id}`}>View Details</Link>
                          </DropdownItem>
                          <DropdownItem icon={<FileText className="h-4 w-4" />}>
                            View Documents
                          </DropdownItem>
                          <DropdownItem icon={<Boxes className="h-4 w-4" />}>
                            View Batches
                          </DropdownItem>
                          <DropdownDivider />
                          <PermissionGate permission={AdminPermission.ORG_SUSPEND}>
                            {product.status === 'ACTIVE' ? (
                              <DropdownItem
                                icon={<Ban className="h-4 w-4" />}
                                danger
                              >
                                <button onClick={() => handleAction(product, 'suspend')}>
                                  Suspend Product
                                </button>
                              </DropdownItem>
                            ) : product.status === 'SUSPENDED' && (
                              <DropdownItem icon={<CheckCircle className="h-4 w-4" />}>
                                <button onClick={() => handleAction(product, 'reactivate')}>
                                  Reactivate Product
                                </button>
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

          <div className="px-4 py-3 border-t border-slate-200 dark:border-slate-700">
            <Pagination
              currentPage={currentPage}
              totalPages={totalPages}
              totalItems={totalItems}
              itemsPerPage={itemsPerPage}
              onPageChange={setCurrentPage}
            />
          </div>
        </Card>
      )}

      {/* Action Confirmation Modal */}
      <Modal
        isOpen={!!selectedProduct && !!actionType}
        onClose={() => { setSelectedProduct(null); setActionType(null); setActionNote(''); }}
        title={actionType === 'suspend' ? 'Suspend Product' : 'Reactivate Product'}
        description={
          actionType === 'suspend'
            ? `You are about to suspend "${selectedProduct?.name}". This will hide it from public view.`
            : `You are about to reactivate "${selectedProduct?.name}". This will make it publicly visible again.`
        }
      >
        <div className="space-y-4 mt-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
              Note {actionType === 'suspend' && <span className="text-red-400">*</span>}
            </label>
            <Textarea
              value={actionNote}
              onChange={(e) => setActionNote(e.target.value)}
              placeholder={
                actionType === 'suspend'
                  ? 'Required: Explain why this product is being suspended...'
                  : 'Optional: Add a note about this reactivation...'
              }
              rows={3}
            />
            {actionType === 'suspend' && !actionNote && (
              <p className="text-xs text-amber-500 mt-1">A suspension reason is required</p>
            )}
          </div>

          <div className="flex justify-end gap-3">
            <Button
              variant="secondary"
              onClick={() => { setSelectedProduct(null); setActionType(null); setActionNote(''); }}
              disabled={actionLoading}
            >
              Cancel
            </Button>
            <Button
              variant={actionType === 'suspend' ? 'danger' : 'primary'}
              onClick={executeAction}
              disabled={actionLoading || (actionType === 'suspend' && !actionNote)}
            >
              {actionLoading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Processing...
                </>
              ) : (
                actionType === 'suspend' ? 'Suspend Product' : 'Reactivate Product'
              )}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

// Mock data for development/demo
function getMockProducts(): Product[] {
  return [
    {
      id: 'prod-001',
      name: 'Premium CBD Tincture 1000mg',
      sku: 'CBD-TINC-1000',
      organizationId: 'org-001',
      organizationName: 'GreenLeaf Labs',
      category: 'Tinctures',
      status: 'ACTIVE',
      complianceStatus: 'COMPLIANT',
      createdAt: '2025-08-15T10:00:00Z',
      batchCount: 12,
      documentsCount: 8,
      lastComplianceCheck: '2025-12-28T14:30:00Z',
    },
    {
      id: 'prod-002',
      name: 'Full Spectrum Gummies 25mg',
      sku: 'CBD-GUM-25-30',
      organizationId: 'org-001',
      organizationName: 'GreenLeaf Labs',
      category: 'Edibles',
      status: 'ACTIVE',
      complianceStatus: 'PENDING_REVIEW',
      createdAt: '2025-09-20T09:00:00Z',
      batchCount: 5,
      documentsCount: 4,
    },
    {
      id: 'prod-003',
      name: 'Hemp Extract Capsules 50mg',
      sku: 'HEMP-CAP-50',
      organizationId: 'org-002',
      organizationName: 'Pure Wellness Co',
      category: 'Capsules',
      status: 'PENDING',
      complianceStatus: 'UNDER_REVIEW',
      createdAt: '2025-12-01T11:00:00Z',
      batchCount: 2,
      documentsCount: 3,
    },
    {
      id: 'prod-004',
      name: 'CBD Topical Cream 500mg',
      sku: 'CBD-TOP-500',
      organizationId: 'org-002',
      organizationName: 'Pure Wellness Co',
      category: 'Topicals',
      status: 'ACTIVE',
      complianceStatus: 'COMPLIANT',
      createdAt: '2025-07-10T15:00:00Z',
      batchCount: 8,
      documentsCount: 6,
    },
    {
      id: 'prod-005',
      name: 'Full Spectrum Oil 1000mg',
      sku: 'FS-OIL-1000',
      organizationId: 'org-002',
      organizationName: 'Pure Wellness Co',
      category: 'Oils',
      status: 'SUSPENDED',
      complianceStatus: 'NON_COMPLIANT',
      createdAt: '2025-06-20T08:00:00Z',
      batchCount: 3,
      documentsCount: 5,
    },
    {
      id: 'prod-006',
      name: 'Hemp Flower - Sour Diesel',
      sku: 'HEMP-FLW-SD',
      organizationId: 'org-003',
      organizationName: 'Herbal Remedies Inc',
      category: 'Flower',
      status: 'PENDING',
      complianceStatus: 'NEEDS_DOCS',
      createdAt: '2025-12-15T14:00:00Z',
      batchCount: 1,
      documentsCount: 1,
    },
    {
      id: 'prod-007',
      name: 'CBD Isolate Powder 99%',
      sku: 'CBD-ISO-99',
      organizationId: 'org-003',
      organizationName: 'Herbal Remedies Inc',
      category: 'Isolates',
      status: 'ACTIVE',
      complianceStatus: 'COMPLIANT',
      createdAt: '2025-10-05T09:30:00Z',
      batchCount: 15,
      documentsCount: 10,
    },
    {
      id: 'prod-008',
      name: 'Delta-8 Vape Cartridge',
      sku: 'D8-VAPE-001',
      organizationId: 'org-003',
      organizationName: 'Herbal Remedies Inc',
      category: 'Vapes',
      status: 'ACTIVE',
      complianceStatus: 'NON_COMPLIANT',
      createdAt: '2025-11-20T16:00:00Z',
      batchCount: 4,
      documentsCount: 2,
    },
  ];
}
