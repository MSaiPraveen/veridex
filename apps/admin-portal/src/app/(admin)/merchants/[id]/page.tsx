'use client';

import { useState, useEffect, useCallback, use } from 'react';
import { 
  Store, 
  ArrowLeft, 
  Building2, 
  Package, 
  FileText, 
  CheckCircle, 
  XCircle,
  Clock,
  AlertTriangle,
  Mail,
  Phone,
  Calendar,
  MapPin,
  Shield,
  TrendingUp,
  TrendingDown,
  MoreVertical,
  Eye,
  ExternalLink,
  Ban,
  ShieldCheck,
  Activity,
  User,
  Edit,
  RefreshCw
} from 'lucide-react';
import Link from 'next/link';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge, StatusBadge } from '@/components/ui/badge';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import { Dropdown, DropdownItem, DropdownDivider } from '@/components/ui/dropdown';
import { Tabs, Tab } from '@/components/ui/tabs';
import { SkeletonCard, SkeletonTable } from '@/components/ui/skeleton';
import { EmptyState, ErrorState } from '@/components/ui/empty-state';
import { PermissionGate, useAdminPermissions } from '@/components/auth/permission-gate';
import { AdminPermission } from '@/lib/admin-rbac';
import { adminApi } from '@/lib/admin-api';

// Types
interface MerchantDetail {
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
  address?: {
    street?: string;
    city?: string;
    state?: string;
    zip?: string;
  };
}

interface Product {
  id: string;
  name: string;
  sku: string;
  status: 'ACTIVE' | 'PENDING' | 'SUSPENDED' | 'REJECTED';
  complianceStatus: 'COMPLIANT' | 'NON_COMPLIANT' | 'PENDING_REVIEW' | 'UNDER_REVIEW';
  category?: string;
  createdAt: string;
}

interface Document {
  id: string;
  fileName: string;
  documentType: string;
  status: 'PENDING_REVIEW' | 'APPROVED' | 'REJECTED' | 'PROCESSING';
  uploadedAt: string;
  productId?: string;
  productName?: string;
}

interface ActivityLog {
  id: string;
  action: string;
  description: string;
  timestamp: string;
  ipAddress?: string;
}

const statusConfig = {
  ACTIVE: { bg: 'bg-emerald-500/10', text: 'text-emerald-400', icon: CheckCircle },
  PENDING: { bg: 'bg-amber-500/10', text: 'text-amber-400', icon: Clock },
  SUSPENDED: { bg: 'bg-red-500/10', text: 'text-red-400', icon: Ban },
  INACTIVE: { bg: 'bg-slate-500/10', text: 'text-slate-400', icon: XCircle },
};

const complianceConfig = {
  COMPLIANT: { bg: 'bg-emerald-500/10', text: 'text-emerald-400' },
  NON_COMPLIANT: { bg: 'bg-red-500/10', text: 'text-red-400' },
  PENDING_REVIEW: { bg: 'bg-amber-500/10', text: 'text-amber-400' },
  UNDER_REVIEW: { bg: 'bg-blue-500/10', text: 'text-blue-400' },
};

const documentStatusConfig = {
  PENDING_REVIEW: { bg: 'bg-amber-500/10', text: 'text-amber-400' },
  APPROVED: { bg: 'bg-emerald-500/10', text: 'text-emerald-400' },
  REJECTED: { bg: 'bg-red-500/10', text: 'text-red-400' },
  PROCESSING: { bg: 'bg-blue-500/10', text: 'text-blue-400' },
};

export default function MerchantDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const merchantId = resolvedParams.id;

  const [merchant, setMerchant] = useState<MerchantDetail | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [documents, setDocuments] = useState<Document[]>([]);
  const [activityLogs, setActivityLogs] = useState<ActivityLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('overview');

  const permissions = useAdminPermissions();

  // Fetch merchant data
  const fetchMerchant = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await adminApi.get<{ user: MerchantDetail }>(`/admin/users/${merchantId}`);
      
      if (response.success && response.data) {
        setMerchant(response.data.user);
        // Also fetch related data
        await Promise.all([
          fetchProducts(),
          fetchDocuments(),
          fetchActivityLogs(),
        ]);
      } else {
        // Use mock data for demo
        setMerchant(getMockMerchant());
        setProducts(getMockProducts());
        setDocuments(getMockDocuments());
        setActivityLogs(getMockActivityLogs());
      }
    } catch (err) {
      console.error('Failed to fetch merchant:', err);
      // Use mock data on error
      setMerchant(getMockMerchant());
      setProducts(getMockProducts());
      setDocuments(getMockDocuments());
      setActivityLogs(getMockActivityLogs());
    } finally {
      setLoading(false);
    }
  }, [merchantId]);

  const fetchProducts = async () => {
    try {
      const response = await adminApi.get<{ products: Product[] }>(`/admin/users/${merchantId}/products`);
      if (response.success && response.data) {
        setProducts(response.data.products);
      }
    } catch (err) {
      console.error('Failed to fetch products:', err);
    }
  };

  const fetchDocuments = async () => {
    try {
      const response = await adminApi.get<{ documents: Document[] }>(`/admin/users/${merchantId}/documents`);
      if (response.success && response.data) {
        setDocuments(response.data.documents);
      }
    } catch (err) {
      console.error('Failed to fetch documents:', err);
    }
  };

  const fetchActivityLogs = async () => {
    try {
      const response = await adminApi.get<{ logs: ActivityLog[] }>(`/admin/audits?userId=${merchantId}&limit=10`);
      if (response.success && response.data) {
        setActivityLogs(response.data.logs);
      }
    } catch (err) {
      console.error('Failed to fetch activity logs:', err);
    }
  };

  useEffect(() => {
    fetchMerchant();
  }, [fetchMerchant]);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const formatDateTime = (dateString: string) => {
    return new Date(dateString).toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <SkeletonCard className="h-48" />
        <div className="grid grid-cols-3 gap-4">
          <SkeletonCard className="h-24" />
          <SkeletonCard className="h-24" />
          <SkeletonCard className="h-24" />
        </div>
        <SkeletonTable rows={5} cols={5} />
      </div>
    );
  }

  if (error || !merchant) {
    return (
      <ErrorState
        title="Failed to load merchant"
        description={error || 'Merchant not found'}
        onRetry={() => window.history.back()}
      />
    );
  }

  const status = statusConfig[merchant.status];
  const StatusIcon = status.icon;

  return (
    <div className="space-y-6">
      {/* Back Button */}
      <Link 
        href="/merchants"
          className="inline-flex items-center gap-2 text-slate-500 hover:text-slate-900 dark:hover:text-white transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Merchants
        </Link>

        {/* Header Card */}
        <Card className="overflow-hidden">
          <div className="bg-gradient-to-r from-amber-500 to-amber-600 h-24" />
          <div className="px-6 pb-6 -mt-12">
            <div className="flex items-end gap-6">
              <div className="h-24 w-24 rounded-2xl bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center text-white text-3xl font-bold border-4 border-white dark:border-slate-800 shadow-lg">
                {merchant.firstName?.[0]}{merchant.lastName?.[0]}
              </div>
              <div className="flex-1 pb-2">
                <div className="flex items-center gap-3">
                  <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
                    {merchant.firstName} {merchant.lastName}
                  </h1>
                  <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-medium ${status.bg} ${status.text}`}>
                    <StatusIcon className="h-4 w-4" />
                    {merchant.status}
                  </span>
                </div>
                <p className="text-slate-500 dark:text-slate-400 mt-1">{merchant.role}</p>
              </div>
              <div className="flex items-center gap-2 pb-2">
                <PermissionGate permission={AdminPermission.ORG_SUSPEND}>
                  {merchant.status === 'ACTIVE' ? (
                    <Button variant="secondary" className="text-red-500 border-red-500/30 hover:bg-red-500/10">
                      <Ban className="h-4 w-4 mr-2" />
                      Suspend
                    </Button>
                  ) : (
                    <Button variant="secondary" className="text-emerald-500 border-emerald-500/30 hover:bg-emerald-500/10">
                      <CheckCircle className="h-4 w-4 mr-2" />
                      Activate
                    </Button>
                  )}
                </PermissionGate>
                <Button variant="ghost" onClick={fetchMerchant}>
                  <RefreshCw className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        </Card>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-500 dark:text-slate-400">Total Products</p>
                <p className="text-2xl font-bold text-slate-900 dark:text-white mt-1">{products.length}</p>
              </div>
              <Package className="h-8 w-8 text-amber-400" />
            </div>
          </Card>
          <Card className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-500 dark:text-slate-400">Documents</p>
                <p className="text-2xl font-bold text-slate-900 dark:text-white mt-1">{documents.length}</p>
              </div>
              <FileText className="h-8 w-8 text-blue-400" />
            </div>
          </Card>
          <Card className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-500 dark:text-slate-400">Compliant</p>
                <p className="text-2xl font-bold text-emerald-500 mt-1">
                  {products.filter(p => p.complianceStatus === 'COMPLIANT').length}
                </p>
              </div>
              <ShieldCheck className="h-8 w-8 text-emerald-400" />
            </div>
          </Card>
          <Card className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-500 dark:text-slate-400">Pending Review</p>
                <p className="text-2xl font-bold text-amber-500 mt-1">
                  {documents.filter(d => d.status === 'PENDING_REVIEW').length}
                </p>
              </div>
              <Clock className="h-8 w-8 text-amber-400" />
            </div>
          </Card>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onChange={setActiveTab}>
          <Tab value="overview" label="Overview" />
          <Tab value="products" label={`Products (${products.length})`} />
          <Tab value="documents" label={`Documents (${documents.length})`} />
          <Tab value="activity" label="Activity" />
        </Tabs>

        {/* Tab Content */}
        {activeTab === 'overview' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Contact Information */}
            <Card>
              <CardHeader>
                <CardTitle>Contact Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-slate-100 dark:bg-slate-800">
                    <Mail className="h-4 w-4 text-slate-500" />
                  </div>
                  <div>
                    <p className="text-sm text-slate-500 dark:text-slate-400">Email</p>
                    <p className="font-medium text-slate-900 dark:text-white">{merchant.email}</p>
                  </div>
                </div>
                {merchant.phone && (
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-slate-100 dark:bg-slate-800">
                      <Phone className="h-4 w-4 text-slate-500" />
                    </div>
                    <div>
                      <p className="text-sm text-slate-500 dark:text-slate-400">Phone</p>
                      <p className="font-medium text-slate-900 dark:text-white">{merchant.phone}</p>
                    </div>
                  </div>
                )}
                {merchant.organizationName && (
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-slate-100 dark:bg-slate-800">
                      <Building2 className="h-4 w-4 text-slate-500" />
                    </div>
                    <div>
                      <p className="text-sm text-slate-500 dark:text-slate-400">Organization</p>
                      <Link 
                        href={`/organizations/${merchant.organizationId}`}
                        className="font-medium text-amber-500 hover:text-amber-400 transition-colors"
                      >
                        {merchant.organizationName}
                      </Link>
                    </div>
                  </div>
                )}
                {merchant.address && (
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-slate-100 dark:bg-slate-800">
                      <MapPin className="h-4 w-4 text-slate-500" />
                    </div>
                    <div>
                      <p className="text-sm text-slate-500 dark:text-slate-400">Address</p>
                      <p className="font-medium text-slate-900 dark:text-white">
                        {merchant.address.street}, {merchant.address.city}, {merchant.address.state} {merchant.address.zip}
                      </p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Account Details */}
            <Card>
              <CardHeader>
                <CardTitle>Account Details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-slate-100 dark:bg-slate-800">
                    <Calendar className="h-4 w-4 text-slate-500" />
                  </div>
                  <div>
                    <p className="text-sm text-slate-500 dark:text-slate-400">Member Since</p>
                    <p className="font-medium text-slate-900 dark:text-white">{formatDate(merchant.createdAt)}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-slate-100 dark:bg-slate-800">
                    <Activity className="h-4 w-4 text-slate-500" />
                  </div>
                  <div>
                    <p className="text-sm text-slate-500 dark:text-slate-400">Last Login</p>
                    <p className="font-medium text-slate-900 dark:text-white">
                      {merchant.lastLoginAt ? formatDateTime(merchant.lastLoginAt) : 'Never'}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-slate-100 dark:bg-slate-800">
                    <Shield className="h-4 w-4 text-slate-500" />
                  </div>
                  <div>
                    <p className="text-sm text-slate-500 dark:text-slate-400">Role</p>
                    <p className="font-medium text-slate-900 dark:text-white">{merchant.role}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {activeTab === 'products' && (
          <Card padding="none">
            {products.length === 0 ? (
              <EmptyState
                icon={<Package className="h-12 w-12" />}
                title="No products"
                description="This merchant has not created any products yet"
                className="py-12"
              />
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Product Name</TableHead>
                    <TableHead>SKU</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Compliance</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead align="right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {products.map(product => {
                    const compliance = complianceConfig[product.complianceStatus];
                    return (
                      <TableRow key={product.id}>
                        <TableCell>
                          <span className="font-medium text-slate-900 dark:text-white">{product.name}</span>
                        </TableCell>
                        <TableCell>
                          <code className="text-sm text-slate-500">{product.sku}</code>
                        </TableCell>
                        <TableCell>
                          <span className="text-slate-500">{product.category || '—'}</span>
                        </TableCell>
                        <TableCell>
                          <StatusBadge status={product.status.toLowerCase() as 'active' | 'pending'} />
                        </TableCell>
                        <TableCell>
                          <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${compliance.bg} ${compliance.text}`}>
                            {product.complianceStatus.replace('_', ' ')}
                          </span>
                        </TableCell>
                        <TableCell>
                          <span className="text-slate-500 text-sm">{formatDate(product.createdAt)}</span>
                        </TableCell>
                        <TableCell align="right">
                          <Link href={`/products/${product.id}`}>
                            <Button variant="ghost" size="sm">
                              <Eye className="h-4 w-4 mr-1" />
                              View
                            </Button>
                          </Link>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            )}
          </Card>
        )}

        {activeTab === 'documents' && (
          <Card padding="none">
            {documents.length === 0 ? (
              <EmptyState
                icon={<FileText className="h-12 w-12" />}
                title="No documents"
                description="This merchant has not uploaded any documents yet"
                className="py-12"
              />
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Document</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Product</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Uploaded</TableHead>
                    <TableHead align="right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {documents.map(doc => {
                    const docStatus = documentStatusConfig[doc.status];
                    return (
                      <TableRow key={doc.id}>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <FileText className="h-4 w-4 text-slate-400" />
                            <span className="font-medium text-slate-900 dark:text-white">{doc.fileName}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge>{doc.documentType}</Badge>
                        </TableCell>
                        <TableCell>
                          {doc.productName ? (
                            <Link 
                              href={`/products/${doc.productId}`}
                              className="text-amber-500 hover:text-amber-400 transition-colors"
                            >
                              {doc.productName}
                            </Link>
                          ) : (
                            <span className="text-slate-400">—</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${docStatus.bg} ${docStatus.text}`}>
                            {doc.status.replace('_', ' ')}
                          </span>
                        </TableCell>
                        <TableCell>
                          <span className="text-slate-500 text-sm">{formatDate(doc.uploadedAt)}</span>
                        </TableCell>
                        <TableCell align="right">
                          <Link href={`/documents/${doc.id}`}>
                            <Button variant="ghost" size="sm">
                              <Eye className="h-4 w-4 mr-1" />
                              View
                            </Button>
                          </Link>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            )}
          </Card>
        )}

        {activeTab === 'activity' && (
          <Card padding="none">
            {activityLogs.length === 0 ? (
              <EmptyState
                icon={<Activity className="h-12 w-12" />}
                title="No activity"
                description="No recent activity for this merchant"
                className="py-12"
              />
            ) : (
              <div className="divide-y divide-slate-200 dark:divide-slate-700/50">
                {activityLogs.map(log => (
                  <div key={log.id} className="px-6 py-4 flex items-start gap-4">
                    <div className="p-2 rounded-lg bg-slate-100 dark:bg-slate-800">
                      <Activity className="h-4 w-4 text-slate-500" />
                    </div>
                    <div className="flex-1">
                      <p className="font-medium text-slate-900 dark:text-white">{log.action}</p>
                      <p className="text-sm text-slate-500 dark:text-slate-400">{log.description}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm text-slate-500">{formatDateTime(log.timestamp)}</p>
                      {log.ipAddress && (
                        <p className="text-xs text-slate-400">IP: {log.ipAddress}</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
      </Card>
    )}
    </div>
  );
}

// Mock data
function getMockMerchant(): MerchantDetail {
  return {
    id: 'usr-001',
    email: 'owner@greenleaflabs.com',
    firstName: 'Michael',
    lastName: 'Green',
    phone: '+1 (555) 123-4567',
    status: 'ACTIVE',
    organizationId: 'org-001',
    organizationName: 'GreenLeaf Labs',
    role: 'OWNER',
    createdAt: '2025-06-15T10:00:00Z',
    lastLoginAt: '2026-01-03T08:30:00Z',
    address: {
      street: '123 Cannabis Way',
      city: 'Denver',
      state: 'CO',
      zip: '80202',
    },
  };
}

function getMockProducts(): Product[] {
  return [
    {
      id: 'prod-001',
      name: 'Premium CBD Tincture',
      sku: 'CBD-TINC-001',
      status: 'ACTIVE',
      complianceStatus: 'COMPLIANT',
      category: 'Tinctures',
      createdAt: '2025-08-15T10:00:00Z',
    },
    {
      id: 'prod-002',
      name: 'Full Spectrum Gummies',
      sku: 'CBD-GUM-001',
      status: 'ACTIVE',
      complianceStatus: 'PENDING_REVIEW',
      category: 'Edibles',
      createdAt: '2025-09-20T14:00:00Z',
    },
    {
      id: 'prod-003',
      name: 'Hemp Flower - Sour Diesel',
      sku: 'HEMP-FLW-001',
      status: 'PENDING',
      complianceStatus: 'UNDER_REVIEW',
      category: 'Flower',
      createdAt: '2025-12-01T09:00:00Z',
    },
  ];
}

function getMockDocuments(): Document[] {
  return [
    {
      id: 'doc-001',
      fileName: 'CBD_Tincture_COA.pdf',
      documentType: 'COA',
      status: 'APPROVED',
      uploadedAt: '2025-08-20T10:00:00Z',
      productId: 'prod-001',
      productName: 'Premium CBD Tincture',
    },
    {
      id: 'doc-002',
      fileName: 'Gummies_Lab_Report.pdf',
      documentType: 'LAB_REPORT',
      status: 'PENDING_REVIEW',
      uploadedAt: '2025-12-28T14:00:00Z',
      productId: 'prod-002',
      productName: 'Full Spectrum Gummies',
    },
    {
      id: 'doc-003',
      fileName: 'Business_License.pdf',
      documentType: 'LICENSE',
      status: 'APPROVED',
      uploadedAt: '2025-06-15T11:00:00Z',
    },
  ];
}

function getMockActivityLogs(): ActivityLog[] {
  return [
    {
      id: 'log-001',
      action: 'Document Uploaded',
      description: 'Uploaded Gummies_Lab_Report.pdf for Full Spectrum Gummies',
      timestamp: '2025-12-28T14:00:00Z',
      ipAddress: '192.168.1.100',
    },
    {
      id: 'log-002',
      action: 'Product Created',
      description: 'Created new product: Hemp Flower - Sour Diesel',
      timestamp: '2025-12-01T09:00:00Z',
      ipAddress: '192.168.1.100',
    },
    {
      id: 'log-003',
      action: 'Login',
      description: 'Successfully logged in',
      timestamp: '2026-01-03T08:30:00Z',
      ipAddress: '192.168.1.100',
    },
  ];
}
