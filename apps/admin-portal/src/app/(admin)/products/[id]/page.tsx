'use client';

import { useState, useEffect, useCallback, use } from 'react';
import {
  Package,
  ArrowLeft,
  Building2,
  FileText,
  CheckCircle,
  XCircle,
  Clock,
  AlertTriangle,
  Shield,
  TrendingUp,
  MoreVertical,
  Eye,
  Ban,
  ShieldCheck,
  ShieldAlert,
  ShieldQuestion,
  Activity,
  Boxes,
  Edit,
  RefreshCw,
  Calendar,
  Tag,
  Beaker,
  ExternalLink,
  Download
} from 'lucide-react';
import Link from 'next/link';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge, StatusBadge } from '@/components/ui/badge';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import { Tabs, Tab } from '@/components/ui/tabs';
import { SkeletonCard, SkeletonTable } from '@/components/ui/skeleton';
import { EmptyState, ErrorState } from '@/components/ui/empty-state';
import { PermissionGate, useAdminPermissions } from '@/components/auth/permission-gate';
import { AdminPermission } from '@/lib/admin-rbac';
import { adminApi } from '@/lib/admin-api';

// Types
interface ProductDetail {
  id: string;
  name: string;
  sku: string;
  description?: string;
  organizationId: string;
  organizationName?: string;
  category?: string;
  status: 'DRAFT' | 'PENDING' | 'ACTIVE' | 'SUSPENDED' | 'DISCONTINUED';
  complianceStatus: 'COMPLIANT' | 'NON_COMPLIANT' | 'PENDING_REVIEW' | 'NEEDS_DOCS' | 'UNDER_REVIEW';
  createdAt: string;
  updatedAt?: string;
  thcContent?: number;
  cbdContent?: number;
  ingredients?: string[];
  batchCount?: number;
}

interface Document {
  id: string;
  fileName: string;
  documentType: string;
  status: 'PENDING_REVIEW' | 'APPROVED' | 'REJECTED' | 'PROCESSING';
  uploadedAt: string;
}

interface Batch {
  id: string;
  batchNumber: string;
  status: 'ACTIVE' | 'EXPIRED' | 'RECALLED';
  quantity: number;
  manufacturedAt: string;
  expiresAt?: string;
}

interface ComplianceHistory {
  id: string;
  status: string;
  changedAt: string;
  changedBy?: string;
  note?: string;
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
  PENDING: { bg: 'bg-amber-500/10', text: 'text-amber-400', icon: ShieldQuestion }, // Backend uses PENDING
  PENDING_REVIEW: { bg: 'bg-amber-500/10', text: 'text-amber-400', icon: ShieldQuestion },
  UNDER_REVIEW: { bg: 'bg-blue-500/10', text: 'text-blue-400', icon: Shield },
  NEEDS_DOCS: { bg: 'bg-orange-500/10', text: 'text-orange-400', icon: AlertTriangle },
  // Default fallback
  UNKNOWN: { bg: 'bg-slate-500/10', text: 'text-slate-400', icon: Shield },
};

const documentStatusConfig: Record<string, { bg: string; text: string }> = {
  PENDING_REVIEW: { bg: 'bg-amber-500/10', text: 'text-amber-400' },
  APPROVED: { bg: 'bg-emerald-500/10', text: 'text-emerald-400' },
  REJECTED: { bg: 'bg-red-500/10', text: 'text-red-400' },
  PROCESSING: { bg: 'bg-blue-500/10', text: 'text-blue-400' },
};

export default function ProductDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const productId = resolvedParams.id;

  const [product, setProduct] = useState<ProductDetail | null>(null);
  const [documents, setDocuments] = useState<Document[]>([]);
  const [batches, setBatches] = useState<Batch[]>([]);
  const [complianceHistory, setComplianceHistory] = useState<ComplianceHistory[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('overview');

  const permissions = useAdminPermissions();

  // Fetch product data
  const fetchProduct = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await adminApi.get<ProductDetail>(`/admin/products/${productId}`);

      if (response.success && response.data) {
        // API returns product directly in data, map _id to id
        const productData = response.data as any;
        setProduct({
          ...productData,
          id: productData._id || productData.id,
        });
        // Fetch related data
        setDocuments(getMockDocuments());
        setBatches(getMockBatches());
        setComplianceHistory(getMockComplianceHistory());
      } else {
        setError('Product not found');
      }
    } catch (err) {
      console.error('Failed to fetch product:', err);
      setError(`Failed to load product: ${err instanceof Error ? err.message : 'Unknown error'}`);
    } finally {
      setLoading(false);
    }
  }, [productId]);

  useEffect(() => {
    fetchProduct();
  }, [fetchProduct]);

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
        <div className="grid grid-cols-4 gap-4">
          <SkeletonCard className="h-24" />
          <SkeletonCard className="h-24" />
          <SkeletonCard className="h-24" />
          <SkeletonCard className="h-24" />
        </div>
        <SkeletonTable rows={5} cols={5} />
      </div>
    );
  }

  if (error || !product) {
    return (
      <ErrorState
        title="Failed to load product"
        description={error || 'Product not found'}
        onRetry={() => window.history.back()}
      />
    );
  }

  const status = statusConfig[product.status] || statusConfig['DRAFT'] || { bg: 'bg-slate-500/10', text: 'text-slate-400', icon: Clock };
  const StatusIcon = status.icon;

  const compliance = complianceConfig[product.complianceStatus] || complianceConfig['PENDING'] || complianceConfig['UNKNOWN'];
  const ComplianceIcon = compliance.icon;

  return (
    <div className="space-y-6">
      {/* Back Button */}
      <Link
        href="/products"
        className="inline-flex items-center gap-2 text-slate-500 hover:text-slate-900 dark:hover:text-white transition-colors"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Products
      </Link>

      {/* Header Card */}
      <Card className="overflow-hidden">
        <div className="bg-gradient-to-r from-blue-500 to-indigo-600 h-24" />
        <div className="px-6 pb-6 -mt-12">
          <div className="flex items-end gap-6">
            <div className="h-24 w-24 rounded-2xl bg-gradient-to-br from-blue-400 to-indigo-600 flex items-center justify-center text-white border-4 border-white dark:border-slate-800 shadow-lg">
              <Package className="h-10 w-10" />
            </div>
            <div className="flex-1 pb-2">
              <div className="flex items-center gap-3 flex-wrap">
                <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
                  {product.name}
                </h1>
                <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-medium ${status.bg} ${status.text}`}>
                  <StatusIcon className="h-4 w-4" />
                  {product.status}
                </span>
                <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-medium ${compliance.bg} ${compliance.text}`}>
                  <ComplianceIcon className="h-4 w-4" />
                  {product.complianceStatus.replace(/_/g, ' ')}
                </span>
              </div>
              <p className="text-slate-500 dark:text-slate-400 mt-1">SKU: {product.sku}</p>
            </div>
            <div className="flex items-center gap-2 pb-2">
              <PermissionGate permission={AdminPermission.ORG_SUSPEND}>
                {product.status === 'ACTIVE' ? (
                  <Button variant="secondary" className="text-red-500 border-red-500/30 hover:bg-red-500/10">
                    <Ban className="h-4 w-4 mr-2" />
                    Suspend
                  </Button>
                ) : product.status === 'SUSPENDED' && (
                  <Button variant="secondary" className="text-emerald-500 border-emerald-500/30 hover:bg-emerald-500/10">
                    <CheckCircle className="h-4 w-4 mr-2" />
                    Reactivate
                  </Button>
                )}
              </PermissionGate>
              <Button variant="ghost" onClick={fetchProduct}>
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
              <p className="text-sm text-slate-500 dark:text-slate-400">Documents</p>
              <p className="text-2xl font-bold text-slate-900 dark:text-white mt-1">{documents.length}</p>
            </div>
            <FileText className="h-8 w-8 text-blue-400" />
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-500 dark:text-slate-400">Batches</p>
              <p className="text-2xl font-bold text-slate-900 dark:text-white mt-1">{batches.length}</p>
            </div>
            <Boxes className="h-8 w-8 text-amber-400" />
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-500 dark:text-slate-400">THC Content</p>
              <p className="text-2xl font-bold text-slate-900 dark:text-white mt-1">
                {product.thcContent !== undefined ? `${product.thcContent}%` : '—'}
              </p>
            </div>
            <Beaker className="h-8 w-8 text-purple-400" />
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-500 dark:text-slate-400">CBD Content</p>
              <p className="text-2xl font-bold text-emerald-500 mt-1">
                {product.cbdContent !== undefined ? `${product.cbdContent}%` : '—'}
              </p>
            </div>
            <Beaker className="h-8 w-8 text-emerald-400" />
          </div>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onChange={setActiveTab}>
        <Tab value="overview" label="Overview" />
        <Tab value="documents" label={`Documents (${documents.length})`} />
        <Tab value="batches" label={`Batches (${batches.length})`} />
        <Tab value="compliance" label="Compliance History" />
      </Tabs>

      {/* Tab Content */}
      {activeTab === 'overview' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Product Details */}
          <Card>
            <CardHeader>
              <CardTitle>Product Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-slate-100 dark:bg-slate-800">
                  <Tag className="h-4 w-4 text-slate-500" />
                </div>
                <div>
                  <p className="text-sm text-slate-500 dark:text-slate-400">Category</p>
                  <p className="font-medium text-slate-900 dark:text-white">{product.category || 'Uncategorized'}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-slate-100 dark:bg-slate-800">
                  <Building2 className="h-4 w-4 text-slate-500" />
                </div>
                <div>
                  <p className="text-sm text-slate-500 dark:text-slate-400">Organization</p>
                  <Link
                    href={`/organizations/${product.organizationId}`}
                    className="font-medium text-amber-500 hover:text-amber-400 transition-colors"
                  >
                    {product.organizationName || 'Unknown'}
                  </Link>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-slate-100 dark:bg-slate-800">
                  <Calendar className="h-4 w-4 text-slate-500" />
                </div>
                <div>
                  <p className="text-sm text-slate-500 dark:text-slate-400">Created</p>
                  <p className="font-medium text-slate-900 dark:text-white">{formatDate(product.createdAt)}</p>
                </div>
              </div>
              {product.updatedAt && (
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-slate-100 dark:bg-slate-800">
                    <RefreshCw className="h-4 w-4 text-slate-500" />
                  </div>
                  <div>
                    <p className="text-sm text-slate-500 dark:text-slate-400">Last Updated</p>
                    <p className="font-medium text-slate-900 dark:text-white">{formatDate(product.updatedAt)}</p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Description */}
          <Card>
            <CardHeader>
              <CardTitle>Description</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-slate-600 dark:text-slate-300">
                {product.description || 'No description provided.'}
              </p>
              {product.ingredients && product.ingredients.length > 0 && (
                <div className="mt-4">
                  <p className="text-sm font-medium text-slate-500 dark:text-slate-400 mb-2">Ingredients</p>
                  <div className="flex flex-wrap gap-2">
                    {product.ingredients.map((ingredient, index) => (
                      <span
                        key={index}
                        className="px-2.5 py-1 rounded-full bg-slate-100 dark:bg-slate-800 text-sm text-slate-600 dark:text-slate-300"
                      >
                        {ingredient}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {activeTab === 'documents' && (
        <Card padding="none">
          {documents.length === 0 ? (
            <EmptyState
              icon={<FileText className="h-12 w-12" />}
              title="No documents"
              description="No documents have been uploaded for this product"
              className="py-12"
            />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Document</TableHead>
                  <TableHead>Type</TableHead>
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
                        <Badge>{doc.documentType.replace(/_/g, ' ')}</Badge>
                      </TableCell>
                      <TableCell>
                        <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${docStatus.bg} ${docStatus.text}`}>
                          {doc.status.replace(/_/g, ' ')}
                        </span>
                      </TableCell>
                      <TableCell>
                        <span className="text-slate-500 text-sm">{formatDate(doc.uploadedAt)}</span>
                      </TableCell>
                      <TableCell align="right">
                        <div className="flex items-center justify-end gap-1">
                          <Link href={`/documents/${doc.id}`}>
                            <Button variant="ghost" size="sm">
                              <Eye className="h-4 w-4 mr-1" />
                              View
                            </Button>
                          </Link>
                          <Button variant="ghost" size="sm">
                            <Download className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </Card>
      )}

      {activeTab === 'batches' && (
        <Card padding="none">
          {batches.length === 0 ? (
            <EmptyState
              icon={<Boxes className="h-12 w-12" />}
              title="No batches"
              description="No batches have been created for this product"
              className="py-12"
            />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Batch Number</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead align="center">Quantity</TableHead>
                  <TableHead>Manufactured</TableHead>
                  <TableHead>Expires</TableHead>
                  <TableHead align="right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {batches.map(batch => (
                  <TableRow key={batch.id}>
                    <TableCell>
                      <span className="font-mono font-medium text-slate-900 dark:text-white">{batch.batchNumber}</span>
                    </TableCell>
                    <TableCell>
                      <StatusBadge status={batch.status.toLowerCase() as 'active' | 'pending'} />
                    </TableCell>
                    <TableCell align="center">
                      <span className="text-slate-900 dark:text-white">{batch.quantity.toLocaleString()}</span>
                    </TableCell>
                    <TableCell>
                      <span className="text-slate-500 text-sm">{formatDate(batch.manufacturedAt)}</span>
                    </TableCell>
                    <TableCell>
                      <span className="text-slate-500 text-sm">{batch.expiresAt ? formatDate(batch.expiresAt) : '—'}</span>
                    </TableCell>
                    <TableCell align="right">
                      <Link href={`/batches/${batch.id}`}>
                        <Button variant="ghost" size="sm">
                          <Eye className="h-4 w-4 mr-1" />
                          View
                        </Button>
                      </Link>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </Card>
      )}

      {activeTab === 'compliance' && (
        <Card padding="none">
          {complianceHistory.length === 0 ? (
            <EmptyState
              icon={<Shield className="h-12 w-12" />}
              title="No compliance history"
              description="Compliance status changes will appear here"
              className="py-12"
            />
          ) : (
            <div className="divide-y divide-slate-200 dark:divide-slate-700/50">
              {complianceHistory.map(entry => (
                <div key={entry.id} className="px-6 py-4 flex items-start gap-4">
                  <div className={`p-2 rounded-lg ${entry.status === 'COMPLIANT' ? 'bg-emerald-500/10' :
                    entry.status === 'NON_COMPLIANT' ? 'bg-red-500/10' :
                      'bg-amber-500/10'
                    }`}>
                    <Shield className={`h-4 w-4 ${entry.status === 'COMPLIANT' ? 'text-emerald-400' :
                      entry.status === 'NON_COMPLIANT' ? 'text-red-400' :
                        'text-amber-400'
                      }`} />
                  </div>
                  <div className="flex-1">
                    <p className="font-medium text-slate-900 dark:text-white">
                      Status changed to {entry.status.replace(/_/g, ' ')}
                    </p>
                    {entry.note && (
                      <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">{entry.note}</p>
                    )}
                    {entry.changedBy && (
                      <p className="text-xs text-slate-400 mt-1">By {entry.changedBy}</p>
                    )}
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-slate-500">{formatDateTime(entry.changedAt)}</p>
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
function getMockProduct(): ProductDetail {
  return {
    id: 'prod-001',
    name: 'Premium CBD Tincture 1000mg',
    sku: 'CBD-TINC-1000',
    description: 'Our premium full-spectrum CBD tincture contains 1000mg of high-quality CBD extract derived from organically grown hemp. This product is designed for daily wellness support and comes in a natural flavor.',
    organizationId: 'org-001',
    organizationName: 'GreenLeaf Labs',
    category: 'Tinctures',
    status: 'ACTIVE',
    complianceStatus: 'COMPLIANT',
    createdAt: '2025-08-15T10:00:00Z',
    updatedAt: '2025-12-28T14:30:00Z',
    thcContent: 0.25,
    cbdContent: 18.5,
    ingredients: ['Hemp Extract', 'MCT Oil', 'Natural Flavoring'],
    batchCount: 12,
  };
}

function getMockDocuments(): Document[] {
  return [
    {
      id: 'doc-001',
      fileName: 'CBD_Tincture_COA_Batch_2024-Q4.pdf',
      documentType: 'COA',
      status: 'APPROVED',
      uploadedAt: '2025-12-20T10:00:00Z',
    },
    {
      id: 'doc-002',
      fileName: 'Lab_Report_Heavy_Metals.pdf',
      documentType: 'LAB_REPORT',
      status: 'APPROVED',
      uploadedAt: '2025-12-18T14:00:00Z',
    },
    {
      id: 'doc-003',
      fileName: 'Safety_Data_Sheet.pdf',
      documentType: 'SAFETY_SHEET',
      status: 'PENDING_REVIEW',
      uploadedAt: '2025-12-28T09:00:00Z',
    },
  ];
}

function getMockBatches(): Batch[] {
  return [
    {
      id: 'batch-001',
      batchNumber: 'CBD-T-2024-Q4-001',
      status: 'ACTIVE',
      quantity: 5000,
      manufacturedAt: '2025-12-01T08:00:00Z',
      expiresAt: '2026-12-01T00:00:00Z',
    },
    {
      id: 'batch-002',
      batchNumber: 'CBD-T-2024-Q4-002',
      status: 'ACTIVE',
      quantity: 3000,
      manufacturedAt: '2025-12-15T08:00:00Z',
      expiresAt: '2026-12-15T00:00:00Z',
    },
    {
      id: 'batch-003',
      batchNumber: 'CBD-T-2024-Q3-005',
      status: 'EXPIRED',
      quantity: 2500,
      manufacturedAt: '2024-09-01T08:00:00Z',
      expiresAt: '2025-09-01T00:00:00Z',
    },
  ];
}

function getMockComplianceHistory(): ComplianceHistory[] {
  return [
    {
      id: 'ch-001',
      status: 'COMPLIANT',
      changedAt: '2025-12-28T14:30:00Z',
      changedBy: 'admin@veridex.io',
      note: 'All required documents verified. Product meets compliance standards.',
    },
    {
      id: 'ch-002',
      status: 'PENDING_REVIEW',
      changedAt: '2025-12-20T10:00:00Z',
      changedBy: 'system',
      note: 'New COA uploaded. Pending review.',
    },
    {
      id: 'ch-003',
      status: 'COMPLIANT',
      changedAt: '2025-09-15T11:00:00Z',
      changedBy: 'compliance@veridex.io',
      note: 'Initial compliance verification completed.',
    },
  ];
}
