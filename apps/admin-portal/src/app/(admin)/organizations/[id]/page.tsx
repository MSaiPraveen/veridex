'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { 
  ArrowLeft, 
  Building2, 
  Mail, 
  Phone, 
  MapPin, 
  Globe, 
  Calendar,
  Shield,
  Package,
  FileText,
  Users,
  AlertTriangle,
  CheckCircle,
  Clock,
  ExternalLink,
  MoreVertical,
  Edit,
  Ban,
  RefreshCw,
  Download,
  Eye,
  TrendingUp,
  Boxes,
  Loader2
} from 'lucide-react';
import Link from 'next/link';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge, StatusBadge } from '@/components/ui/badge';
import { Avatar } from '@/components/ui/avatar';
import { Dropdown, DropdownItem, DropdownDivider } from '@/components/ui/dropdown';
import { Modal } from '@/components/ui/modal';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell, Pagination } from '@/components/ui/table';
import { PermissionGate, useAdminPermissions } from '@/components/auth/permission-gate';
import { AdminPermission } from '@/lib/admin-rbac';
import { useOrganization } from '@/hooks/use-organizations';
import { useOrganizationProducts, Product } from '@/hooks/use-products';
import { adminApi } from '@/lib/api-client';

// Types
interface OrganizationMember {
  id: string;
  name: string;
  email: string;
  role: 'OWNER' | 'ADMIN' | 'STAFF';
  status: 'ACTIVE' | 'PENDING' | 'INACTIVE';
  lastLogin?: string;
}

interface OrganizationProduct {
  id: string;
  name: string;
  sku: string;
  category: string;
  status: 'ACTIVE' | 'PENDING' | 'SUSPENDED';
  complianceStatus: 'COMPLIANT' | 'NON_COMPLIANT' | 'PENDING_REVIEW';
  batchCount: number;
  lastUpdated: string;
}

interface OrganizationDocument {
  id: string;
  name: string;
  type: 'COA' | 'LICENSE' | 'INSURANCE' | 'LAB_REPORT';
  status: 'VERIFIED' | 'PENDING' | 'EXPIRED' | 'REJECTED';
  uploadedAt: string;
  expiresAt?: string;
}

interface OrganizationActivity {
  id: string;
  action: string;
  description: string;
  timestamp: string;
  actor: string;
}

// Type aliases for shorter names in JSX
type Member = OrganizationMember;
type Document = OrganizationDocument;
type Activity = OrganizationActivity;

const statusColors: Record<string, { bg: string; text: string }> = {
  ACTIVE: { bg: 'bg-emerald-500/10', text: 'text-emerald-400' },
  PENDING: { bg: 'bg-amber-500/10', text: 'text-amber-400' },
  SUSPENDED: { bg: 'bg-red-500/10', text: 'text-red-400' },
  INACTIVE: { bg: 'bg-slate-500/10', text: 'text-slate-400' },
};

const complianceColors: Record<string, { bg: string; text: string; label: string }> = {
  COMPLIANT: { bg: 'bg-emerald-500/10', text: 'text-emerald-400', label: 'Compliant' },
  NON_COMPLIANT: { bg: 'bg-red-500/10', text: 'text-red-400', label: 'Non-Compliant' },
  PENDING_REVIEW: { bg: 'bg-amber-500/10', text: 'text-amber-400', label: 'Pending Review' },
};

const roleColors: Record<string, string> = {
  OWNER: 'text-amber-400 bg-amber-500/10',
  ADMIN: 'text-purple-400 bg-purple-500/10',
  STAFF: 'text-blue-400 bg-blue-500/10',
};

type TabType = 'overview' | 'products' | 'documents' | 'members' | 'activity';

export default function OrganizationDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { hasPermission } = useAdminPermissions();
  
  const [activeTab, setActiveTab] = useState<TabType>('overview');
  const [showSuspendModal, setShowSuspendModal] = useState(false);
  const [productPage, setProductPage] = useState(1);
  const [members, setMembers] = useState<OrganizationMember[]>([]);
  const [documents, setDocuments] = useState<OrganizationDocument[]>([]);
  const [activity, setActivity] = useState<OrganizationActivity[]>([]);
  const [loadingMembers, setLoadingMembers] = useState(false);
  const [loadingDocuments, setLoadingDocuments] = useState(false);
  const [loadingActivity, setLoadingActivity] = useState(false);
  
  const orgId = params.id as string;
  
  // Fetch organization from API
  const { organization: org, loading: orgLoading, error: orgError, refresh: refreshOrg } = useOrganization(orgId);
  
  // Fetch products for this organization
  const { products: orgProducts, loading: productsLoading, refresh: refreshProducts } = useOrganizationProducts(orgId);
  
  // Fetch members, documents, and activity when tab changes
  useEffect(() => {
    if (activeTab === 'members' && members.length === 0 && orgId) {
      setLoadingMembers(true);
      adminApi.get<OrganizationMember[]>(`/admin/organizations/${orgId}/members`)
        .then(res => {
          if (res.success && res.data) {
            setMembers(Array.isArray(res.data) ? res.data : []);
          }
        })
        .finally(() => setLoadingMembers(false));
    }
    
    if (activeTab === 'documents' && documents.length === 0 && orgId) {
      setLoadingDocuments(true);
      adminApi.get<OrganizationDocument[]>(`/admin/organizations/${orgId}/documents`)
        .then(res => {
          if (res.success && res.data) {
            setDocuments(Array.isArray(res.data) ? res.data : []);
          }
        })
        .finally(() => setLoadingDocuments(false));
    }
    
    if (activeTab === 'activity' && activity.length === 0 && orgId) {
      setLoadingActivity(true);
      adminApi.get<OrganizationActivity[]>(`/admin/organizations/${orgId}/audit-trail`)
        .then(res => {
          if (res.success && res.data) {
            setActivity(Array.isArray(res.data) ? res.data : []);
          }
        })
        .finally(() => setLoadingActivity(false));
    }
  }, [activeTab, orgId, members.length, documents.length, activity.length]);
  
  const tabs: { id: TabType; label: string; icon: typeof Building2; count?: number }[] = [
    { id: 'overview', label: 'Overview', icon: Building2 },
    { id: 'products', label: 'Products', icon: Package, count: orgProducts.length },
    { id: 'documents', label: 'Documents', icon: FileText, count: documents.length },
    { id: 'members', label: 'Members', icon: Users, count: members.length },
    { id: 'activity', label: 'Activity', icon: Clock },
  ];
  
  // Loading state
  if (orgLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-amber-500" />
        <span className="ml-3 text-slate-600 dark:text-slate-400">Loading organization...</span>
      </div>
    );
  }
  
  // Error state
  if (orgError || !org) {
    return (
      <div className="flex flex-col items-center justify-center h-64">
        <AlertTriangle className="h-12 w-12 text-red-500 mb-4" />
        <h3 className="text-lg font-medium text-slate-900 dark:text-white">Organization not found</h3>
        <p className="text-slate-500 dark:text-slate-400 mt-1">{orgError || 'The organization could not be loaded.'}</p>
        <button
          onClick={() => router.back()}
          className="mt-4 px-4 py-2 bg-amber-500 text-white rounded-lg hover:bg-amber-600 transition-colors"
        >
          Go Back
        </button>
      </div>
    );
  }
  
  const getComplianceScoreColor = (score: number) => {
    if (score >= 90) return 'text-emerald-400';
    if (score >= 70) return 'text-amber-400';
    return 'text-red-400';
  };

  const getRiskBadge = (risk: string) => {
    switch (risk) {
      case 'LOW': return <Badge variant="success">Low Risk</Badge>;
      case 'MEDIUM': return <Badge variant="warning">Medium Risk</Badge>;
      case 'HIGH': return <Badge variant="danger">High Risk</Badge>;
      default: return null;
    }
  };

  return (
    <div className="space-y-6">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={() => router.back()}
              className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-700/50 transition-colors"
            >
              <ArrowLeft className="h-5 w-5" />
            </button>
            <div className="flex items-center gap-4">
              <div className="h-16 w-16 rounded-2xl bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center shadow-lg">
                <Building2 className="h-8 w-8 text-white" />
              </div>
              <div>
                <div className="flex items-center gap-3">
                  <h1 className="text-2xl font-bold text-white">{org.name}</h1>
                  <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${statusColors[org.status].bg} ${statusColors[org.status].text}`}>
                    {org.status}
                  </span>
                  {org.riskLevel && getRiskBadge(org.riskLevel)}
                </div>
                <p className="text-slate-400 mt-1">
                  {org.legalName || org.name} • {org.type} {org.jurisdiction ? `• ${org.jurisdiction}` : ''}
                </p>
              </div>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <PermissionGate permission={AdminPermission.ORG_REVIEW}>
              <Button variant="secondary">
                <Edit className="h-4 w-4 mr-2" />
                Edit
              </Button>
            </PermissionGate>
            <Dropdown
              trigger={
                <Button variant="ghost">
                  <MoreVertical className="h-4 w-4" />
                </Button>
              }
              align="end"
            >
              <DropdownItem icon={<RefreshCw className="h-4 w-4" />} onClick={() => {}}>
                Trigger Compliance Check
              </DropdownItem>
              <DropdownItem icon={<Download className="h-4 w-4" />} onClick={() => {}}>
                Export Data
              </DropdownItem>
              <DropdownDivider />
              <DropdownItem 
                icon={<Ban className="h-4 w-4" />} 
                variant="danger"
                onClick={() => setShowSuspendModal(true)}
              >
                Suspend Organization
              </DropdownItem>
            </Dropdown>
          </div>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700/50">
            <div className="flex items-center justify-between">
              <p className="text-sm text-slate-400">Compliance Score</p>
              <Shield className="h-4 w-4 text-slate-500" />
            </div>
            <p className={`text-3xl font-bold mt-2 ${getComplianceScoreColor(org.complianceScore ?? 0)}`}>
              {org.complianceScore ?? 0}%
            </p>
          </div>
          <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700/50">
            <div className="flex items-center justify-between">
              <p className="text-sm text-slate-400">Active Products</p>
              <Package className="h-4 w-4 text-slate-500" />
            </div>
            <p className="text-3xl font-bold mt-2 text-white">
              {orgProducts.filter((p: Product) => p.status === 'ACTIVE').length}
            </p>
          </div>
          <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700/50">
            <div className="flex items-center justify-between">
              <p className="text-sm text-slate-400">Documents</p>
              <FileText className="h-4 w-4 text-slate-500" />
            </div>
            <p className="text-3xl font-bold mt-2 text-white">{documents.length}</p>
          </div>
          <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700/50">
            <div className="flex items-center justify-between">
              <p className="text-sm text-slate-400">Team Members</p>
              <Users className="h-4 w-4 text-slate-500" />
            </div>
            <p className="text-3xl font-bold mt-2 text-white">{members.length}</p>
          </div>
        </div>

        {/* Tabs */}
        <div className="border-b border-slate-700/50">
          <nav className="flex gap-1">
            {tabs.map((tab) => {
              const TabIcon = tab.icon;
              const isActive = activeTab === tab.id;
              
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                    isActive
                      ? 'border-amber-500 text-amber-400'
                      : 'border-transparent text-slate-400 hover:text-white'
                  }`}
                >
                  <TabIcon className="h-4 w-4" />
                  {tab.label}
                  {tab.count !== undefined && (
                    <span className={`ml-1 px-1.5 py-0.5 text-xs rounded-full ${
                      isActive ? 'bg-amber-500/20' : 'bg-slate-700'
                    }`}>
                      {tab.count}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Tab Content */}
        {activeTab === 'overview' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Main Info */}
            <div className="lg:col-span-2 space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>About</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-slate-300">{org.description || 'No description available.'}</p>
                  <div className="grid grid-cols-2 gap-6 mt-6">
                    <div>
                      <p className="text-xs text-slate-500 uppercase tracking-wide mb-1">License Number</p>
                      <p className="text-white font-medium">{org.licenseNumber || 'N/A'}</p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-500 uppercase tracking-wide mb-1">EIN</p>
                      <p className="text-white font-medium">{org.ein || org.taxId || 'N/A'}</p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-500 uppercase tracking-wide mb-1">Registered</p>
                      <p className="text-white font-medium">{new Date(org.createdAt).toLocaleDateString()}</p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-500 uppercase tracking-wide mb-1">Last Review</p>
                      <p className="text-white font-medium">{org.lastReviewAt ? new Date(org.lastReviewAt).toLocaleDateString() : 'Never'}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Recent Products */}
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle>Products</CardTitle>
                    <button 
                      onClick={() => setActiveTab('products')}
                      className="text-sm text-amber-400 hover:text-amber-300"
                    >
                      View all
                    </button>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {orgProducts.slice(0, 4).map((product: Product) => (
                      <div key={product._id} className="flex items-center justify-between p-3 rounded-lg bg-slate-700/30 hover:bg-slate-700/50 transition-colors">
                        <div className="flex items-center gap-3">
                          <div className="h-10 w-10 rounded-lg bg-slate-600/50 flex items-center justify-center">
                            <Package className="h-5 w-5 text-slate-400" />
                          </div>
                          <div>
                            <p className="text-white font-medium">{product.name}</p>
                            <p className="text-sm text-slate-400">{product.sku} • {product.category}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className={`px-2 py-1 rounded text-xs font-medium ${complianceColors[product.complianceStatus]?.bg || 'bg-slate-500/10'} ${complianceColors[product.complianceStatus]?.text || 'text-slate-400'}`}>
                            {complianceColors[product.complianceStatus]?.label || product.complianceStatus}
                          </span>
                          <Link href={`/products/${product._id}`}>
                            <Button variant="ghost" size="sm">
                              <Eye className="h-4 w-4" />
                            </Button>
                          </Link>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Sidebar */}
            <div className="space-y-6">
              {/* Contact Info */}
              <Card>
                <CardHeader>
                  <CardTitle>Contact</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <a href={`mailto:${org.email}`} className="flex items-center gap-3 text-slate-300 hover:text-white transition-colors">
                    <Mail className="h-4 w-4 text-slate-500" />
                    <span className="text-sm">{org.email}</span>
                  </a>
                  <a href={`tel:${org.phone}`} className="flex items-center gap-3 text-slate-300 hover:text-white transition-colors">
                    <Phone className="h-4 w-4 text-slate-500" />
                    <span className="text-sm">{org.phone}</span>
                  </a>
                  <a href={org.website} target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 text-slate-300 hover:text-white transition-colors">
                    <Globe className="h-4 w-4 text-slate-500" />
                    <span className="text-sm">{org.website}</span>
                    <ExternalLink className="h-3 w-3 text-slate-500" />
                  </a>
                  <div className="flex items-start gap-3 text-slate-300">
                    <MapPin className="h-4 w-4 text-slate-500 mt-0.5" />
                    <span className="text-sm">
                      {org.address?.street || 'No address'}<br />
                      {org.address?.city ? `${org.address.city}, ` : ''}{org.address?.state || ''} {org.address?.postalCode || org.address?.zip || ''}
                    </span>
                  </div>
                </CardContent>
              </Card>

              {/* Team Members Preview */}
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle>Team</CardTitle>
                    <button 
                      onClick={() => setActiveTab('members')}
                      className="text-sm text-amber-400 hover:text-amber-300"
                    >
                      View all
                    </button>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {members.map((member: Member) => (
                      <div key={member.id} className="flex items-center gap-3">
                        <Avatar name={member.name} size="sm" />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-white truncate">{member.name}</p>
                          <p className="text-xs text-slate-400 truncate">{member.email}</p>
                        </div>
                        <span className={`px-2 py-0.5 text-xs font-medium rounded ${roleColors[member.role as keyof typeof roleColors] || 'bg-slate-500/20 text-slate-400'}`}>
                          {member.role}
                        </span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Compliance Status */}
              <Card>
                <CardHeader>
                  <CardTitle>Compliance</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-center mb-4">
                    <div className="relative h-32 w-32">
                      <svg className="h-full w-full -rotate-90" viewBox="0 0 36 36">
                        <circle
                          cx="18" cy="18" r="15.5"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="3"
                          className="text-slate-700"
                        />
                        <circle
                          cx="18" cy="18" r="15.5"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="3"
                          strokeDasharray={`${org.complianceScore ?? 0} 100`}
                          strokeLinecap="round"
                          className={getComplianceScoreColor(org.complianceScore ?? 0)}
                        />
                      </svg>
                      <div className="absolute inset-0 flex items-center justify-center">
                        <span className={`text-2xl font-bold ${getComplianceScoreColor(org.complianceScore ?? 0)}`}>
                          {org.complianceScore ?? 0}%
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-slate-400">Compliant Products</span>
                      <span className="text-emerald-400">{orgProducts.filter((p: Product) => p.complianceStatus === 'COMPLIANT').length}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Pending Review</span>
                      <span className="text-amber-400">{orgProducts.filter((p: Product) => p.complianceStatus === 'PENDING' || p.complianceStatus === 'UNDER_REVIEW').length}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Non-Compliant</span>
                      <span className="text-red-400">{orgProducts.filter((p: Product) => p.complianceStatus === 'NON_COMPLIANT').length}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        )}

        {activeTab === 'products' && (
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Products ({orgProducts.length})</CardTitle>
                <PermissionGate permission={AdminPermission.PRODUCT_REVIEW}>
                  <Button variant="secondary" size="sm">
                    <Package className="h-4 w-4 mr-2" />
                    Add Product
                  </Button>
                </PermissionGate>
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Product</TableHead>
                    <TableHead>SKU</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Compliance</TableHead>
                    <TableHead>Batches</TableHead>
                    <TableHead>Last Updated</TableHead>
                    <TableHead></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {orgProducts.map((product: Product) => (
                    <TableRow key={product._id}>
                      <TableCell className="font-medium text-white">{product.name}</TableCell>
                      <TableCell className="text-slate-400">{product.sku}</TableCell>
                      <TableCell className="text-slate-400">{product.category}</TableCell>
                      <TableCell>
                        <span className={`px-2 py-1 rounded text-xs font-medium ${statusColors[product.status as keyof typeof statusColors]?.bg || 'bg-slate-500/20'} ${statusColors[product.status as keyof typeof statusColors]?.text || 'text-slate-400'}`}>
                          {product.status}
                        </span>
                      </TableCell>
                      <TableCell>
                        <span className={`px-2 py-1 rounded text-xs font-medium ${complianceColors[product.complianceStatus as keyof typeof complianceColors]?.bg || 'bg-slate-500/20'} ${complianceColors[product.complianceStatus as keyof typeof complianceColors]?.text || 'text-slate-400'}`}>
                          {complianceColors[product.complianceStatus as keyof typeof complianceColors]?.label || product.complianceStatus}
                        </span>
                      </TableCell>
                      <TableCell className="text-slate-400">{product.batchNumber || '-'}</TableCell>
                      <TableCell className="text-slate-400">{product.updatedAt ? new Date(product.updatedAt).toLocaleDateString() : 'N/A'}</TableCell>
                      <TableCell>
                        <Link href={`/products/${product._id}`}>
                          <Button variant="ghost" size="sm">
                            <Eye className="h-4 w-4" />
                          </Button>
                        </Link>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              <Pagination
                currentPage={productPage}
                totalPages={Math.ceil(orgProducts.length / 10)}
                totalItems={orgProducts.length}
                itemsPerPage={10}
                onPageChange={setProductPage}
              />
            </CardContent>
          </Card>
        )}

        {activeTab === 'documents' && (
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Documents ({documents.length})</CardTitle>
                <PermissionGate permission={AdminPermission.DOC_APPROVE}>
                  <Button variant="secondary" size="sm">
                    <FileText className="h-4 w-4 mr-2" />
                    Upload Document
                  </Button>
                </PermissionGate>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {documents.map((doc: Document) => (
                  <div key={doc.id} className="flex items-center justify-between p-4 rounded-xl bg-slate-700/30 hover:bg-slate-700/50 transition-colors">
                    <div className="flex items-center gap-4">
                      <div className="h-12 w-12 rounded-xl bg-slate-600/50 flex items-center justify-center">
                        <FileText className="h-6 w-6 text-slate-400" />
                      </div>
                      <div>
                        <p className="text-white font-medium">{doc.name}</p>
                        <div className="flex items-center gap-3 mt-1">
                          <Badge>{doc.type}</Badge>
                          <span className="text-xs text-slate-500">Uploaded {doc.uploadedAt}</span>
                          {doc.expiresAt && (
                            <span className="text-xs text-slate-500">Expires {doc.expiresAt}</span>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <StatusBadge status={doc.status === 'VERIFIED' ? 'success' : doc.status === 'PENDING' ? 'pending' : doc.status === 'EXPIRED' ? 'warning' : 'error'} />
                      <Button variant="ghost" size="sm">
                        <Download className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="sm">
                        <Eye className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {activeTab === 'members' && (
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Team Members ({members.length})</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Member</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Last Login</TableHead>
                    <TableHead></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {members.map((member: Member) => (
                    <TableRow key={member.id}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <Avatar name={member.name} size="sm" />
                          <div>
                            <p className="font-medium text-white">{member.name}</p>
                            <p className="text-sm text-slate-400">{member.email}</p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className={`px-2 py-1 text-xs font-medium rounded ${roleColors[member.role as keyof typeof roleColors] || 'bg-slate-500/20 text-slate-400'}`}>
                          {member.role}
                        </span>
                      </TableCell>
                      <TableCell>
                        <StatusBadge status={member.status === 'ACTIVE' ? 'active' : member.status === 'PENDING' ? 'pending' : 'suspended'} />
                      </TableCell>
                      <TableCell className="text-slate-400">
                        {member.lastLogin ? new Date(member.lastLogin).toLocaleString() : 'Never'}
                      </TableCell>
                      <TableCell>
                        <Button variant="ghost" size="sm">
                          <Eye className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        )}

        {activeTab === 'activity' && (
          <Card>
            <CardHeader>
              <CardTitle>Activity Timeline</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="relative">
                <div className="absolute left-4 top-0 bottom-0 w-px bg-slate-700" />
                <div className="space-y-6">
                  {activity.map((act: Activity) => (
                    <div key={act.id} className="relative flex gap-4 pl-10">
                      <div className="absolute left-2.5 h-3 w-3 rounded-full bg-amber-500 ring-4 ring-slate-800" />
                      <div className="flex-1 bg-slate-700/30 rounded-xl p-4">
                        <div className="flex items-start justify-between">
                          <div>
                            <p className="font-medium text-white">{act.action}</p>
                            <p className="text-sm text-slate-400 mt-1">{act.description}</p>
                          </div>
                          <span className="text-xs text-slate-500">
                            {new Date(act.timestamp).toLocaleString()}
                          </span>
                        </div>
                        <p className="text-xs text-slate-500 mt-2">by {act.actor}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        )}

      {/* Suspend Modal */}
      <Modal
        isOpen={showSuspendModal}
        onClose={() => setShowSuspendModal(false)}
        title="Suspend Organization"
        description="Are you sure you want to suspend this organization? All products and services will be immediately disabled."
      >
        <div className="p-4 bg-red-500/10 rounded-lg border border-red-500/20 mb-4">
          <div className="flex items-start gap-3">
            <AlertTriangle className="h-5 w-5 text-red-400 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-red-400">Warning: This action is immediate</p>
              <p className="text-sm text-slate-400 mt-1">
                Suspending {org.name} will disable all {orgProducts.length} products and prevent {members.length} team members from accessing the platform.
              </p>
            </div>
          </div>
        </div>
        <div className="flex justify-end gap-3">
          <Button variant="secondary" onClick={() => setShowSuspendModal(false)}>
            Cancel
          </Button>
          <Button variant="danger" onClick={() => setShowSuspendModal(false)}>
            Suspend Organization
          </Button>
        </div>
      </Modal>
    </div>
  );
}
