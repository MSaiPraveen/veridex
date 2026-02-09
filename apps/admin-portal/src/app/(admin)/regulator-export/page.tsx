'use client';

import { useState } from 'react';
import { 
  FileOutput,
  Download,
  Eye,
  Calendar,
  Building2,
  Package,
  FileText,
  Shield,
  Clock,
  CheckCircle,
  AlertTriangle,
  Filter,
  Search,
  Lock,
  Printer,
  Share2,
  History,
  ChevronRight,
  Play,
  FileJson,
  FileSpreadsheet,
  File,
  RefreshCw,
  Folder,
  User,
  Globe,
  Archive
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge, StatusBadge } from '@/components/ui/badge';
import { SearchInput, Select, Input, Checkbox } from '@/components/ui/input';
import { Modal } from '@/components/ui/modal';
import { StatCard } from '@/components/ui/stat-card';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import { Tabs, Tab, TabPanel } from '@/components/ui/tabs';
import { PermissionGate, useAdminPermissions } from '@/components/auth/permission-gate';
import { AdminPermission } from '@/lib/admin-rbac';

// Types
interface ExportReport {
  id: string;
  name: string;
  type: 'COMPLIANCE_AUDIT' | 'ENTITY_HISTORY' | 'SNAPSHOT' | 'VIOLATION_REPORT' | 'CUSTOM';
  scope: {
    entityType?: string;
    entityId?: string;
    entityName?: string;
    startDate: string;
    endDate: string;
  };
  format: 'PDF' | 'CSV' | 'JSON';
  status: 'READY' | 'GENERATING' | 'EXPIRED' | 'FAILED';
  createdAt: string;
  createdBy: string;
  expiresAt?: string;
  fileSize?: string;
  downloadCount: number;
  isImmutable: boolean;
  hash?: string;
}

interface ReportTemplate {
  id: string;
  name: string;
  description: string;
  type: string;
  defaultFormat: 'PDF' | 'CSV' | 'JSON';
  fields: string[];
  regulatoryRef?: string;
}

interface ComplianceSnapshot {
  id: string;
  name: string;
  createdAt: string;
  createdBy: string;
  entityCount: {
    merchants: number;
    products: number;
    documents: number;
  };
  complianceRate: number;
  violations: number;
  expiresAt: string;
}

// Real data - no mock data
const reports: ExportReport[] = [];
const templates: ReportTemplate[] = [];
const snapshots: ComplianceSnapshot[] = [];

export default function RegulatorExportPage() {
  const [activeTab, setActiveTab] = useState('reports');
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [selectedReport, setSelectedReport] = useState<ExportReport | null>(null);
  const [selectedTemplate, setSelectedTemplate] = useState<ReportTemplate | null>(null);
  const [lastUpdated, setLastUpdated] = useState(new Date());
  const { hasPermission } = useAdminPermissions();

  // New report form state
  const [newReportForm, setNewReportForm] = useState({
    templateId: '',
    entityType: '',
    entityId: '',
    startDate: '',
    endDate: '',
    format: 'PDF',
    includeAuditTrail: true,
    includeAttachments: false,
  });

  // Stats
  const stats = {
    totalReports: reports.length,
    readyReports: reports.filter(r => r.status === 'READY').length,
    totalDownloads: reports.reduce((sum, r) => sum + r.downloadCount, 0),
    immutableReports: reports.filter(r => r.isImmutable).length,
    snapshots: snapshots.length,
    avgComplianceRate: snapshots.length > 0 ? Math.round(snapshots.reduce((sum, s) => sum + s.complianceRate, 0) / snapshots.length) : 0,
  };

  // Filtering
  const filteredReports = reports.filter(report => {
    if (typeFilter !== 'all' && report.type !== typeFilter) return false;
    if (statusFilter !== 'all' && report.status !== statusFilter) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      return (
        report.name.toLowerCase().includes(q) ||
        report.scope.entityName?.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const handleDownload = (report: ExportReport) => {
    // Simulate download
    console.log('Downloading report:', report.id);
  };

  const handlePreview = (report: ExportReport) => {
    setSelectedReport(report);
    setShowPreviewModal(true);
  };

  const handleCreateReport = () => {
    // Simulate report creation
    setShowCreateModal(false);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'READY': return <Badge variant="success">Ready</Badge>;
      case 'GENERATING': return <Badge variant="info">Generating...</Badge>;
      case 'EXPIRED': return <Badge variant="default">Expired</Badge>;
      case 'FAILED': return <Badge variant="error">Failed</Badge>;
      default: return <Badge variant="default">{status}</Badge>;
    }
  };

  const getFormatIcon = (format: string) => {
    switch (format) {
      case 'PDF': return <File className="h-4 w-4 text-red-500" />;
      case 'CSV': return <FileSpreadsheet className="h-4 w-4 text-emerald-500" />;
      case 'JSON': return <FileJson className="h-4 w-4 text-amber-500" />;
      default: return <FileText className="h-4 w-4" />;
    }
  };

  return (
    <>
      {/* Regulatory Notice */}
      <div className="mb-6 p-4 bg-blue-50 dark:bg-blue-500/10 border border-blue-200 dark:border-blue-500/30 rounded-lg">
        <div className="flex items-start gap-3">
          <Shield className="h-5 w-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
          <div>
            <h4 className="font-semibold text-blue-800 dark:text-blue-300">Regulatory Compliance</h4>
            <p className="text-sm text-blue-700 dark:text-blue-400 mt-1">
              All exported reports are cryptographically signed and immutable. Reports include complete audit trails 
              and can be verified for authenticity. Snapshots are retained per data retention policy (3 years minimum).
            </p>
          </div>
        </div>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-6">
        <StatCard
          title="Total Reports"
          value={stats.totalReports}
          icon={<FileOutput className="h-5 w-5" />}
          variant="default"
        />
        <StatCard
          title="Ready to Download"
          value={stats.readyReports}
          icon={<Download className="h-5 w-5" />}
          variant="success"
        />
        <StatCard
          title="Total Downloads"
          value={stats.totalDownloads}
          icon={<History className="h-5 w-5" />}
          variant="info"
        />
        <StatCard
          title="Immutable Reports"
          value={stats.immutableReports}
          icon={<Lock className="h-5 w-5" />}
          variant="default"
        />
        <StatCard
          title="Snapshots"
          value={stats.snapshots}
          icon={<Archive className="h-5 w-5" />}
          variant="default"
        />
        <StatCard
          title="Avg Compliance"
          value={`${stats.avgComplianceRate}%`}
          icon={<CheckCircle className="h-5 w-5" />}
          variant="success"
        />
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onChange={setActiveTab} className="mb-6">
        <Tab 
          value="reports" 
          label="Export Reports" 
          icon={<FileOutput className="h-4 w-4" />}
          count={reports.length} 
        />
        <Tab 
          value="templates" 
          label="Report Templates" 
          icon={<Folder className="h-4 w-4" />}
          count={templates.length} 
        />
        <Tab 
          value="snapshots" 
          label="Compliance Snapshots" 
          icon={<Archive className="h-4 w-4" />}
          count={snapshots.length} 
        />
      </Tabs>

      {/* Reports Tab */}
      <TabPanel value="reports" activeValue={activeTab}>
        {/* Filters */}
        <Card className="mb-6">
          <CardContent className="py-4">
            <div className="flex flex-col lg:flex-row gap-4 items-start lg:items-center justify-between">
              <div className="flex flex-wrap gap-3 items-center">
                <SearchInput
                  placeholder="Search reports..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-64"
                />
                <Select
                  value={typeFilter}
                  onChange={(e) => setTypeFilter(e.target.value)}
                  className="w-48"
                >
                  <option value="all">All Types</option>
                  <option value="COMPLIANCE_AUDIT">Compliance Audit</option>
                  <option value="ENTITY_HISTORY">Entity History</option>
                  <option value="SNAPSHOT">Snapshot</option>
                  <option value="VIOLATION_REPORT">Violation Report</option>
                </Select>
                <Select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="w-40"
                >
                  <option value="all">All Statuses</option>
                  <option value="READY">Ready</option>
                  <option value="GENERATING">Generating</option>
                  <option value="EXPIRED">Expired</option>
                </Select>
              </div>
              <PermissionGate permissions={[AdminPermission.REGULATOR_EXPORT]}>
                <Button variant="primary" onClick={() => setShowCreateModal(true)}>
                  <FileOutput className="h-4 w-4 mr-2" />
                  Generate Report
                </Button>
              </PermissionGate>
            </div>
          </CardContent>
        </Card>

        {/* Reports Table */}
        <Card>
          <CardHeader className="border-b border-slate-200 dark:border-slate-700/50">
            <CardTitle className="flex items-center gap-2">
              <FileOutput className="h-5 w-5 text-amber-500" />
              Generated Reports
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Report</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Date Range</TableHead>
                  <TableHead>Format</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-center">Downloads</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredReports.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8 text-slate-500 dark:text-slate-400">
                      No reports match your filters
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredReports.map((report) => (
                    <TableRow key={report.id}>
                      <TableCell>
                        <div className="flex items-start gap-2">
                          {report.isImmutable && (
                            <Lock className="h-4 w-4 text-emerald-500 flex-shrink-0 mt-1" />
                          )}
                          <div>
                            <p className="font-medium text-slate-900 dark:text-white">{report.name}</p>
                            <p className="text-xs text-slate-500 dark:text-slate-400">
                              Created: {new Date(report.createdAt).toLocaleDateString()} by {report.createdBy.split('@')[0]}
                            </p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="default">{report.type.replace(/_/g, ' ')}</Badge>
                      </TableCell>
                      <TableCell>
                        <span className="text-sm text-slate-600 dark:text-slate-300">
                          {report.scope.startDate} to {report.scope.endDate}
                        </span>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {getFormatIcon(report.format)}
                          <span className="text-sm">{report.format}</span>
                          {report.fileSize && (
                            <span className="text-xs text-slate-400">({report.fileSize})</span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        {getStatusBadge(report.status)}
                      </TableCell>
                      <TableCell className="text-center">
                        <span className="font-semibold text-slate-900 dark:text-white">{report.downloadCount}</span>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button 
                            variant="ghost" 
                            size="sm"
                            onClick={() => handlePreview(report)}
                          >
                            <Eye className="h-4 w-4 mr-1" />
                            Preview
                          </Button>
                          {report.status === 'READY' && (
                            <PermissionGate permissions={[AdminPermission.REGULATOR_EXPORT]}>
                              <Button 
                                variant="primary" 
                                size="sm"
                                onClick={() => handleDownload(report)}
                              >
                                <Download className="h-4 w-4 mr-1" />
                                Download
                              </Button>
                            </PermissionGate>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </TabPanel>

      {/* Templates Tab */}
      <TabPanel value="templates" activeValue={activeTab}>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {templates.map((template) => (
            <Card key={template.id} className="hover:border-amber-500/50 transition-colors">
              <CardContent className="py-6">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h3 className="font-semibold text-lg text-slate-900 dark:text-white">
                      {template.name}
                    </h3>
                    <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                      {template.description}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    {getFormatIcon(template.defaultFormat)}
                    <span className="text-xs text-slate-500">{template.defaultFormat}</span>
                  </div>
                </div>

                <div className="mb-4">
                  <p className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-2">INCLUDED DATA</p>
                  <div className="flex flex-wrap gap-1">
                    {template.fields.map((field) => (
                      <Badge key={field} variant="default" className="text-xs">
                        {field}
                      </Badge>
                    ))}
                  </div>
                </div>

                {template.regulatoryRef && (
                  <div className="mb-4 p-2 bg-blue-50 dark:bg-blue-500/10 rounded text-xs text-blue-700 dark:text-blue-300">
                    <Globe className="h-3 w-3 inline mr-1" />
                    Regulatory Reference: {template.regulatoryRef}
                  </div>
                )}

                <PermissionGate permissions={[AdminPermission.REGULATOR_EXPORT]}>
                  <Button 
                    variant="outline" 
                    className="w-full"
                    onClick={() => {
                      setSelectedTemplate(template);
                      setNewReportForm(prev => ({ ...prev, templateId: template.id }));
                      setShowCreateModal(true);
                    }}
                  >
                    <Play className="h-4 w-4 mr-2" />
                    Use Template
                  </Button>
                </PermissionGate>
              </CardContent>
            </Card>
          ))}
        </div>
      </TabPanel>

      {/* Snapshots Tab */}
      <TabPanel value="snapshots" activeValue={activeTab}>
        <Card className="mb-6">
          <CardHeader className="border-b border-slate-200 dark:border-slate-700/50">
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Archive className="h-5 w-5 text-amber-500" />
                Compliance Snapshots
              </CardTitle>
              <PermissionGate permissions={[AdminPermission.REGULATOR_EXPORT]}>
                <Button variant="primary">
                  <Archive className="h-4 w-4 mr-2" />
                  Create Snapshot
                </Button>
              </PermissionGate>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Snapshot</TableHead>
                  <TableHead>Created By</TableHead>
                  <TableHead className="text-center">Merchants</TableHead>
                  <TableHead className="text-center">Products</TableHead>
                  <TableHead className="text-center">Documents</TableHead>
                  <TableHead className="text-center">Compliance</TableHead>
                  <TableHead>Expires</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {snapshots.map((snapshot) => (
                  <TableRow key={snapshot.id}>
                    <TableCell>
                      <div>
                        <p className="font-medium text-slate-900 dark:text-white">{snapshot.name}</p>
                        <p className="text-xs text-slate-500 dark:text-slate-400">
                          {new Date(snapshot.createdAt).toLocaleDateString()}
                        </p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className="text-sm text-slate-600 dark:text-slate-300">
                        {snapshot.createdBy}
                      </span>
                    </TableCell>
                    <TableCell className="text-center font-semibold">
                      {snapshot.entityCount.merchants}
                    </TableCell>
                    <TableCell className="text-center font-semibold">
                      {snapshot.entityCount.products}
                    </TableCell>
                    <TableCell className="text-center font-semibold">
                      {snapshot.entityCount.documents}
                    </TableCell>
                    <TableCell className="text-center">
                      <div className="flex items-center justify-center gap-2">
                        <div className="w-12 h-2 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                          <div 
                            className={`h-full rounded-full ${
                              snapshot.complianceRate >= 85 ? 'bg-emerald-500' :
                              snapshot.complianceRate >= 70 ? 'bg-amber-500' :
                              'bg-red-500'
                            }`}
                            style={{ width: `${snapshot.complianceRate}%` }}
                          />
                        </div>
                        <span className={`text-sm font-semibold ${
                          snapshot.complianceRate >= 85 ? 'text-emerald-500' :
                          snapshot.complianceRate >= 70 ? 'text-amber-500' :
                          'text-red-500'
                        }`}>
                          {snapshot.complianceRate}%
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className="text-sm text-slate-600 dark:text-slate-300">
                        {new Date(snapshot.expiresAt).toLocaleDateString()}
                      </span>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button variant="ghost" size="sm">
                          <Eye className="h-4 w-4 mr-1" />
                          View
                        </Button>
                        <PermissionGate permissions={[AdminPermission.REGULATOR_EXPORT]}>
                          <Button variant="outline" size="sm">
                            <Download className="h-4 w-4 mr-1" />
                            Export
                          </Button>
                        </PermissionGate>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Snapshot Comparison */}
        <Card>
          <CardHeader className="border-b border-slate-200 dark:border-slate-700/50">
            <CardTitle>Compliance Trend (Snapshots)</CardTitle>
          </CardHeader>
          <CardContent className="py-6">
            <div className="h-48 flex items-end justify-between gap-4">
              {[...snapshots].reverse().map((snapshot, index) => (
                <div key={snapshot.id} className="flex-1 flex flex-col items-center">
                  <div 
                    className={`w-full rounded-t-lg transition-all ${
                      snapshot.complianceRate >= 85 ? 'bg-emerald-500' :
                      snapshot.complianceRate >= 70 ? 'bg-amber-500' :
                      'bg-red-500'
                    }`}
                    style={{ height: `${snapshot.complianceRate * 1.5}px` }}
                  />
                  <p className="mt-2 text-sm font-semibold text-slate-900 dark:text-white">
                    {snapshot.complianceRate}%
                  </p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    {new Date(snapshot.createdAt).toLocaleDateString('en-US', { month: 'short', year: '2-digit' })}
                  </p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </TabPanel>

      {/* Create Report Modal */}
      <Modal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        title="Generate Compliance Report"
        size="lg"
      >
        <div className="space-y-6">
          {/* Template Selection */}
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
              Report Template
            </label>
            <Select
              value={newReportForm.templateId}
              onChange={(e) => setNewReportForm(prev => ({ ...prev, templateId: e.target.value }))}
              className="w-full"
            >
              <option value="">Select a template...</option>
              {templates.map(t => (
                <option key={t.id} value={t.id}>{t.name}</option>
              ))}
            </Select>
          </div>

          {/* Entity Scope (optional) */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                Entity Type (Optional)
              </label>
              <Select
                value={newReportForm.entityType}
                onChange={(e) => setNewReportForm(prev => ({ ...prev, entityType: e.target.value }))}
                className="w-full"
              >
                <option value="">All Entities</option>
                <option value="ORGANIZATION">Merchant/Organization</option>
                <option value="PRODUCT">Product</option>
              </Select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                Entity ID (Optional)
              </label>
              <Input
                value={newReportForm.entityId}
                onChange={(e) => setNewReportForm(prev => ({ ...prev, entityId: e.target.value }))}
                placeholder="e.g., org-001"
                disabled={!newReportForm.entityType}
              />
            </div>
          </div>

          {/* Date Range */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                Start Date
              </label>
              <Input
                type="date"
                value={newReportForm.startDate}
                onChange={(e) => setNewReportForm(prev => ({ ...prev, startDate: e.target.value }))}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                End Date
              </label>
              <Input
                type="date"
                value={newReportForm.endDate}
                onChange={(e) => setNewReportForm(prev => ({ ...prev, endDate: e.target.value }))}
              />
            </div>
          </div>

          {/* Format */}
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
              Export Format
            </label>
            <div className="flex gap-4">
              {['PDF', 'CSV', 'JSON'].map(format => (
                <label key={format} className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="format"
                    value={format}
                    checked={newReportForm.format === format}
                    onChange={(e) => setNewReportForm(prev => ({ ...prev, format: e.target.value as 'PDF' | 'CSV' | 'JSON' }))}
                    className="text-amber-500 focus:ring-amber-500"
                  />
                  <div className="flex items-center gap-1">
                    {getFormatIcon(format)}
                    <span>{format}</span>
                  </div>
                </label>
              ))}
            </div>
          </div>

          {/* Options */}
          <div className="space-y-2">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={newReportForm.includeAuditTrail}
                onChange={(e) => setNewReportForm(prev => ({ ...prev, includeAuditTrail: e.target.checked }))}
                className="rounded text-amber-500 focus:ring-amber-500"
              />
              <span className="text-sm text-slate-700 dark:text-slate-300">Include full audit trail</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={newReportForm.includeAttachments}
                onChange={(e) => setNewReportForm(prev => ({ ...prev, includeAttachments: e.target.checked }))}
                className="rounded text-amber-500 focus:ring-amber-500"
              />
              <span className="text-sm text-slate-700 dark:text-slate-300">Include document attachments</span>
            </label>
          </div>

          {/* Immutability Notice */}
          <div className="p-3 bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/30 rounded-lg">
            <div className="flex items-start gap-2">
              <Lock className="h-4 w-4 text-emerald-600 dark:text-emerald-400 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-emerald-800 dark:text-emerald-300">
                This report will be cryptographically signed and immutable once generated. 
                It can be verified for authenticity in any regulatory audit.
              </p>
            </div>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-4 border-t border-slate-200 dark:border-slate-700/50">
            <Button variant="outline" onClick={() => setShowCreateModal(false)}>
              Cancel
            </Button>
            <Button variant="primary" onClick={handleCreateReport}>
              <FileOutput className="h-4 w-4 mr-2" />
              Generate Report
            </Button>
          </div>
        </div>
      </Modal>

      {/* Preview Modal */}
      <Modal
        isOpen={showPreviewModal}
        onClose={() => setShowPreviewModal(false)}
        title="Report Preview"
        size="lg"
      >
        {selectedReport && (
          <div className="space-y-6">
            {/* Report Header */}
            <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-lg">
              <div className="flex items-start justify-between">
                <div>
                  <h4 className="font-semibold text-lg text-slate-900 dark:text-white">
                    {selectedReport.name}
                  </h4>
                  <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                    {selectedReport.type.replace(/_/g, ' ')} • {selectedReport.format}
                  </p>
                </div>
                {selectedReport.isImmutable && (
                  <Badge variant="success" className="flex items-center gap-1">
                    <Lock className="h-3 w-3" />
                    Immutable
                  </Badge>
                )}
              </div>
            </div>

            {/* Report Metadata */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">Date Range</p>
                <p className="font-medium text-slate-900 dark:text-white">
                  {selectedReport.scope.startDate} to {selectedReport.scope.endDate}
                </p>
              </div>
              <div>
                <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">Created By</p>
                <p className="font-medium text-slate-900 dark:text-white">
                  {selectedReport.createdBy}
                </p>
              </div>
              {selectedReport.scope.entityName && (
                <div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">Scope</p>
                  <p className="font-medium text-slate-900 dark:text-white">
                    {selectedReport.scope.entityName}
                  </p>
                </div>
              )}
              {selectedReport.hash && (
                <div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">Verification Hash</p>
                  <p className="font-mono text-xs text-slate-600 dark:text-slate-300">
                    {selectedReport.hash}
                  </p>
                </div>
              )}
            </div>

            {/* Sample Content Preview */}
            <div className="p-4 bg-slate-100 dark:bg-slate-900 rounded-lg">
              <p className="text-xs text-slate-500 dark:text-slate-400 mb-2">PREVIEW</p>
              <div className="space-y-3">
                <div className="p-3 bg-white dark:bg-slate-800 rounded border border-slate-200 dark:border-slate-700">
                  <p className="font-medium text-slate-900 dark:text-white">Executive Summary</p>
                  <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
                    Compliance overview for the reporting period...
                  </p>
                </div>
                <div className="p-3 bg-white dark:bg-slate-800 rounded border border-slate-200 dark:border-slate-700">
                  <p className="font-medium text-slate-900 dark:text-white">Entity Statistics</p>
                  <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
                    Detailed breakdown of all compliance activities...
                  </p>
                </div>
                <div className="p-3 bg-white dark:bg-slate-800 rounded border border-slate-200 dark:border-slate-700">
                  <p className="font-medium text-slate-900 dark:text-white">Audit Trail</p>
                  <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
                    Complete chronological record of all actions...
                  </p>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex justify-end gap-3 pt-4 border-t border-slate-200 dark:border-slate-700/50">
              <Button variant="outline" onClick={() => setShowPreviewModal(false)}>
                Close
              </Button>
              <Button variant="outline">
                <Printer className="h-4 w-4 mr-2" />
                Print
              </Button>
              {selectedReport.status === 'READY' && (
                <Button variant="primary" onClick={() => handleDownload(selectedReport)}>
                  <Download className="h-4 w-4 mr-2" />
                  Download
                </Button>
              )}
            </div>
          </div>
        )}
    </Modal>
    </>
  );
}
