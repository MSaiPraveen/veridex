'use client';

import { useState } from 'react';
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
  Boxes
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

// Mock data
const mockOrganization = {
  id: 'org-001',
  name: 'GreenLeaf Labs',
  legalName: 'GreenLeaf Labs LLC',
  type: 'MERCHANT',
  status: 'ACTIVE',
  complianceScore: 94,
  riskLevel: 'LOW',
  jurisdiction: 'California',
  email: 'contact@greenleaflabs.com',
  phone: '+1 (555) 123-4567',
  website: 'https://greenleaflabs.com',
  address: {
    street: '123 Hemp Street',
    city: 'Los Angeles',
    state: 'CA',
    zip: '90001',
    country: 'USA'
  },
  createdAt: '2025-03-15T10:00:00Z',
  verifiedAt: '2025-03-20T14:30:00Z',
  lastReviewAt: '2025-12-28T09:00:00Z',
  licenseNumber: 'CA-HEMP-2025-0142',
  ein: '**-***7890',
  description: 'Premium hemp-derived CBD products manufacturer specializing in full-spectrum tinctures and edibles. FDA registered facility with GMP certification.',
};

const mockMembers: OrganizationMember[] = [
  { id: '1', name: 'Michael Green', email: 'owner@greenleaflabs.com', role: 'OWNER', status: 'ACTIVE', lastLogin: '2026-01-02T14:00:00Z' },
  { id: '2', name: 'Sarah Leaf', email: 'staff@greenleaflabs.com', role: 'STAFF', status: 'ACTIVE', lastLogin: '2026-01-01T10:00:00Z' },
  { id: '3', name: 'John Hemp', email: 'admin@greenleaflabs.com', role: 'ADMIN', status: 'PENDING' },
];

const mockProducts: OrganizationProduct[] = [
  { id: 'prod-1', name: 'CBD Oil 500mg', sku: 'CBD-500', category: 'Tinctures', status: 'ACTIVE', complianceStatus: 'COMPLIANT', batchCount: 8, lastUpdated: '2025-12-28' },
  { id: 'prod-2', name: 'CBD Oil 1000mg', sku: 'CBD-1000', category: 'Tinctures', status: 'ACTIVE', complianceStatus: 'COMPLIANT', batchCount: 12, lastUpdated: '2025-12-30' },
  { id: 'prod-3', name: 'Hemp Gummies 25mg', sku: 'GUM-25', category: 'Edibles', status: 'ACTIVE', complianceStatus: 'COMPLIANT', batchCount: 5, lastUpdated: '2025-12-25' },
  { id: 'prod-4', name: 'CBD Topical Cream', sku: 'TOP-100', category: 'Topicals', status: 'PENDING', complianceStatus: 'PENDING_REVIEW', batchCount: 2, lastUpdated: '2025-12-20' },
  { id: 'prod-5', name: 'Full Spectrum Tincture', sku: 'FST-30', category: 'Tinctures', status: 'SUSPENDED', complianceStatus: 'NON_COMPLIANT', batchCount: 0, lastUpdated: '2025-12-15' },
  { id: 'prod-6', name: 'Sleep Aid Capsules', sku: 'SLP-30', category: 'Capsules', status: 'PENDING', complianceStatus: 'PENDING_REVIEW', batchCount: 1, lastUpdated: '2025-12-22' },
];

const mockDocuments: OrganizationDocument[] = [
  { id: 'doc-1', name: 'Business License - California', type: 'LICENSE', status: 'VERIFIED', uploadedAt: '2025-03-15', expiresAt: '2026-03-15' },
  { id: 'doc-2', name: 'Certificate of Insurance', type: 'INSURANCE', status: 'VERIFIED', uploadedAt: '2025-01-01', expiresAt: '2026-01-01' },
  { id: 'doc-3', name: 'Lab Report - Batch #2024-Q4', type: 'LAB_REPORT', status: 'VERIFIED', uploadedAt: '2025-12-28' },
  { id: 'doc-4', name: 'COA - CBD Oil 1000mg', type: 'COA', status: 'PENDING', uploadedAt: '2025-12-30' },
];

const mockActivity: OrganizationActivity[] = [
  { id: '1', action: 'Document Uploaded', description: 'COA for CBD Oil 1000mg uploaded for review', timestamp: '2025-12-30T14:30:00Z', actor: 'Michael Green' },
  { id: '2', action: 'Compliance Check', description: 'Automated compliance check passed for Hemp Gummies', timestamp: '2025-12-28T10:00:00Z', actor: 'System' },
  { id: '3', action: 'Product Suspended', description: 'Full Spectrum Tincture suspended - THC limit exceeded', timestamp: '2025-12-15T09:00:00Z', actor: 'Compliance Team' },
  { id: '4', action: 'Batch Created', description: 'New batch #2024-Q4-156 created for CBD Oil 500mg', timestamp: '2025-12-10T11:00:00Z', actor: 'Sarah Leaf' },
];

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
  
  const org = mockOrganization; // In production, fetch based on params.id
  
  const tabs: { id: TabType; label: string; icon: typeof Building2; count?: number }[] = [
    { id: 'overview', label: 'Overview', icon: Building2 },
    { id: 'products', label: 'Products', icon: Package, count: mockProducts.length },
    { id: 'documents', label: 'Documents', icon: FileText, count: mockDocuments.length },
    { id: 'members', label: 'Members', icon: Users, count: mockMembers.length },
    { id: 'activity', label: 'Activity', icon: Clock },
  ];
  
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
                  {getRiskBadge(org.riskLevel)}
                </div>
                <p className="text-slate-400 mt-1">
                  {org.legalName} • {org.type} • {org.jurisdiction}
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
            <p className={`text-3xl font-bold mt-2 ${getComplianceScoreColor(org.complianceScore)}`}>
              {org.complianceScore}%
            </p>
          </div>
          <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700/50">
            <div className="flex items-center justify-between">
              <p className="text-sm text-slate-400">Active Products</p>
              <Package className="h-4 w-4 text-slate-500" />
            </div>
            <p className="text-3xl font-bold mt-2 text-white">
              {mockProducts.filter(p => p.status === 'ACTIVE').length}
            </p>
          </div>
          <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700/50">
            <div className="flex items-center justify-between">
              <p className="text-sm text-slate-400">Documents</p>
              <FileText className="h-4 w-4 text-slate-500" />
            </div>
            <p className="text-3xl font-bold mt-2 text-white">{mockDocuments.length}</p>
          </div>
          <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700/50">
            <div className="flex items-center justify-between">
              <p className="text-sm text-slate-400">Team Members</p>
              <Users className="h-4 w-4 text-slate-500" />
            </div>
            <p className="text-3xl font-bold mt-2 text-white">{mockMembers.length}</p>
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
                  <p className="text-slate-300">{org.description}</p>
                  <div className="grid grid-cols-2 gap-6 mt-6">
                    <div>
                      <p className="text-xs text-slate-500 uppercase tracking-wide mb-1">License Number</p>
                      <p className="text-white font-medium">{org.licenseNumber}</p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-500 uppercase tracking-wide mb-1">EIN</p>
                      <p className="text-white font-medium">{org.ein}</p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-500 uppercase tracking-wide mb-1">Registered</p>
                      <p className="text-white font-medium">{new Date(org.createdAt).toLocaleDateString()}</p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-500 uppercase tracking-wide mb-1">Last Review</p>
                      <p className="text-white font-medium">{new Date(org.lastReviewAt).toLocaleDateString()}</p>
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
                    {mockProducts.slice(0, 4).map((product) => (
                      <div key={product.id} className="flex items-center justify-between p-3 rounded-lg bg-slate-700/30 hover:bg-slate-700/50 transition-colors">
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
                          <span className={`px-2 py-1 rounded text-xs font-medium ${complianceColors[product.complianceStatus].bg} ${complianceColors[product.complianceStatus].text}`}>
                            {complianceColors[product.complianceStatus].label}
                          </span>
                          <Link href={`/products/${product.id}`}>
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
                      {org.address.street}<br />
                      {org.address.city}, {org.address.state} {org.address.zip}
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
                    {mockMembers.map((member) => (
                      <div key={member.id} className="flex items-center gap-3">
                        <Avatar name={member.name} size="sm" />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-white truncate">{member.name}</p>
                          <p className="text-xs text-slate-400 truncate">{member.email}</p>
                        </div>
                        <span className={`px-2 py-0.5 text-xs font-medium rounded ${roleColors[member.role]}`}>
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
                          strokeDasharray={`${org.complianceScore} 100`}
                          strokeLinecap="round"
                          className={getComplianceScoreColor(org.complianceScore)}
                        />
                      </svg>
                      <div className="absolute inset-0 flex items-center justify-center">
                        <span className={`text-2xl font-bold ${getComplianceScoreColor(org.complianceScore)}`}>
                          {org.complianceScore}%
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-slate-400">Compliant Products</span>
                      <span className="text-emerald-400">{mockProducts.filter(p => p.complianceStatus === 'COMPLIANT').length}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Pending Review</span>
                      <span className="text-amber-400">{mockProducts.filter(p => p.complianceStatus === 'PENDING_REVIEW').length}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Non-Compliant</span>
                      <span className="text-red-400">{mockProducts.filter(p => p.complianceStatus === 'NON_COMPLIANT').length}</span>
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
                <CardTitle>Products ({mockProducts.length})</CardTitle>
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
                  {mockProducts.map((product) => (
                    <TableRow key={product.id}>
                      <TableCell className="font-medium text-white">{product.name}</TableCell>
                      <TableCell className="text-slate-400">{product.sku}</TableCell>
                      <TableCell className="text-slate-400">{product.category}</TableCell>
                      <TableCell>
                        <span className={`px-2 py-1 rounded text-xs font-medium ${statusColors[product.status].bg} ${statusColors[product.status].text}`}>
                          {product.status}
                        </span>
                      </TableCell>
                      <TableCell>
                        <span className={`px-2 py-1 rounded text-xs font-medium ${complianceColors[product.complianceStatus].bg} ${complianceColors[product.complianceStatus].text}`}>
                          {complianceColors[product.complianceStatus].label}
                        </span>
                      </TableCell>
                      <TableCell className="text-slate-400">{product.batchCount}</TableCell>
                      <TableCell className="text-slate-400">{product.lastUpdated}</TableCell>
                      <TableCell>
                        <Link href={`/products/${product.id}`}>
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
                totalPages={Math.ceil(mockProducts.length / 10)}
                totalItems={mockProducts.length}
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
                <CardTitle>Documents ({mockDocuments.length})</CardTitle>
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
                {mockDocuments.map((doc) => (
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
                <CardTitle>Team Members ({mockMembers.length})</CardTitle>
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
                  {mockMembers.map((member) => (
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
                        <span className={`px-2 py-1 text-xs font-medium rounded ${roleColors[member.role]}`}>
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
                  {mockActivity.map((activity, index) => (
                    <div key={activity.id} className="relative flex gap-4 pl-10">
                      <div className="absolute left-2.5 h-3 w-3 rounded-full bg-amber-500 ring-4 ring-slate-800" />
                      <div className="flex-1 bg-slate-700/30 rounded-xl p-4">
                        <div className="flex items-start justify-between">
                          <div>
                            <p className="font-medium text-white">{activity.action}</p>
                            <p className="text-sm text-slate-400 mt-1">{activity.description}</p>
                          </div>
                          <span className="text-xs text-slate-500">
                            {new Date(activity.timestamp).toLocaleString()}
                          </span>
                        </div>
                        <p className="text-xs text-slate-500 mt-2">by {activity.actor}</p>
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
                Suspending {org.name} will disable all {mockProducts.length} products and prevent 
                {mockMembers.length} team members from accessing the platform.
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
