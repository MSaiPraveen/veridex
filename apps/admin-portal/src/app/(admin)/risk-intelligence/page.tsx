'use client';

import { useState, useEffect } from 'react';
import { 
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  Shield,
  Building2,
  Package,
  FileText,
  Eye,
  Filter,
  ChevronRight,
  Activity,
  Target,
  Gauge,
  ArrowUpRight,
  ArrowDownRight,
  Clock,
  RefreshCw,
  BarChart3,
  History,
  AlertOctagon,
  XCircle,
  CheckCircle,
  Flame,
  Snowflake
} from 'lucide-react';
import Link from 'next/link';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge, StatusBadge } from '@/components/ui/badge';
import { SearchInput, Select } from '@/components/ui/input';
import { StatCard } from '@/components/ui/stat-card';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import { Tabs, Tab, TabPanel } from '@/components/ui/tabs';
import { Modal } from '@/components/ui/modal';
import { PermissionGate, useAdminPermissions } from '@/components/auth/permission-gate';
import { AdminPermission } from '@/lib/admin-rbac';

// Types
interface RiskEntity {
  id: string;
  type: 'MERCHANT' | 'PRODUCT';
  name: string;
  organizationId?: string;
  organizationName?: string;
  riskScore: number;
  riskTrend: 'INCREASING' | 'DECREASING' | 'STABLE';
  riskLevel: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
  factors: RiskFactor[];
  violationCount30d: number;
  lastViolation?: string;
  repeatViolations: number;
  status: 'ACTIVE' | 'FLAGGED' | 'UNDER_REVIEW' | 'SUSPENDED';
  complianceRate: number;
}

interface RiskFactor {
  category: string;
  description: string;
  weight: number;
  score: number;
  trend: 'UP' | 'DOWN' | 'STABLE';
}

interface RiskAlert {
  id: string;
  type: 'THRESHOLD_BREACH' | 'TREND_ALERT' | 'REPEAT_VIOLATION' | 'SUDDEN_CHANGE';
  entityId: string;
  entityName: string;
  entityType: 'MERCHANT' | 'PRODUCT';
  message: string;
  severity: 'CRITICAL' | 'HIGH' | 'MEDIUM';
  triggeredAt: string;
  acknowledged: boolean;
}

interface RiskTrend {
  date: string;
  avgRiskScore: number;
  criticalCount: number;
  highCount: number;
}

// Mock data
const mockMerchantRisks: RiskEntity[] = [
  {
    id: 'org-001',
    type: 'MERCHANT',
    name: 'GreenLeaf Labs',
    riskScore: 32,
    riskTrend: 'DECREASING',
    riskLevel: 'LOW',
    factors: [
      { category: 'Document Compliance', description: 'High document approval rate', weight: 30, score: 15, trend: 'STABLE' },
      { category: 'Product Compliance', description: 'Some products pending review', weight: 25, score: 20, trend: 'DOWN' },
      { category: 'Violation History', description: 'Minor violations in past', weight: 25, score: 18, trend: 'DOWN' },
      { category: 'Response Time', description: 'Quick response to issues', weight: 20, score: 10, trend: 'STABLE' },
    ],
    violationCount30d: 2,
    lastViolation: '2025-12-28',
    repeatViolations: 0,
    status: 'ACTIVE',
    complianceRate: 94,
  },
  {
    id: 'org-002',
    type: 'MERCHANT',
    name: 'Suspect CBD Corp',
    riskScore: 87,
    riskTrend: 'INCREASING',
    riskLevel: 'CRITICAL',
    factors: [
      { category: 'Document Compliance', description: 'Multiple document rejections', weight: 30, score: 85, trend: 'UP' },
      { category: 'Product Compliance', description: 'THC violations detected', weight: 25, score: 95, trend: 'UP' },
      { category: 'Violation History', description: 'Repeat offender pattern', weight: 25, score: 90, trend: 'UP' },
      { category: 'Response Time', description: 'Slow to respond', weight: 20, score: 75, trend: 'STABLE' },
    ],
    violationCount30d: 8,
    lastViolation: '2026-01-02',
    repeatViolations: 5,
    status: 'UNDER_REVIEW',
    complianceRate: 45,
  },
  {
    id: 'org-003',
    type: 'MERCHANT',
    name: 'Pure Wellness Co',
    riskScore: 54,
    riskTrend: 'STABLE',
    riskLevel: 'MEDIUM',
    factors: [
      { category: 'Document Compliance', description: 'Occasional late submissions', weight: 30, score: 45, trend: 'STABLE' },
      { category: 'Product Compliance', description: 'Labeling issues noted', weight: 25, score: 60, trend: 'STABLE' },
      { category: 'Violation History', description: 'Moderate history', weight: 25, score: 55, trend: 'STABLE' },
      { category: 'Response Time', description: 'Average response time', weight: 20, score: 50, trend: 'STABLE' },
    ],
    violationCount30d: 3,
    lastViolation: '2025-12-30',
    repeatViolations: 1,
    status: 'ACTIVE',
    complianceRate: 78,
  },
  {
    id: 'org-004',
    type: 'MERCHANT',
    name: 'Herbal Remedies Inc',
    riskScore: 71,
    riskTrend: 'INCREASING',
    riskLevel: 'HIGH',
    factors: [
      { category: 'Document Compliance', description: 'Missing documentation', weight: 30, score: 70, trend: 'UP' },
      { category: 'Product Compliance', description: 'Testing gaps identified', weight: 25, score: 80, trend: 'UP' },
      { category: 'Violation History', description: 'Recent uptick in issues', weight: 25, score: 65, trend: 'UP' },
      { category: 'Response Time', description: 'Declining responsiveness', weight: 20, score: 60, trend: 'UP' },
    ],
    violationCount30d: 5,
    lastViolation: '2026-01-01',
    repeatViolations: 2,
    status: 'FLAGGED',
    complianceRate: 67,
  },
];

const mockProductRisks: RiskEntity[] = [
  {
    id: 'prod-001',
    type: 'PRODUCT',
    name: 'Full Spectrum CBD Oil 1000mg',
    organizationId: 'org-001',
    organizationName: 'GreenLeaf Labs',
    riskScore: 28,
    riskTrend: 'STABLE',
    riskLevel: 'LOW',
    factors: [
      { category: 'THC Compliance', description: 'Always within limits', weight: 35, score: 10, trend: 'STABLE' },
      { category: 'Documentation', description: 'Complete COA history', weight: 30, score: 15, trend: 'STABLE' },
      { category: 'Testing Frequency', description: 'Regular testing', weight: 20, score: 20, trend: 'STABLE' },
      { category: 'Batch History', description: 'No recalls', weight: 15, score: 5, trend: 'STABLE' },
    ],
    violationCount30d: 0,
    repeatViolations: 0,
    status: 'ACTIVE',
    complianceRate: 100,
  },
  {
    id: 'prod-002',
    type: 'PRODUCT',
    name: 'Hemp Gummies 25mg',
    organizationId: 'org-003',
    organizationName: 'Herbal Remedies Inc',
    riskScore: 82,
    riskTrend: 'INCREASING',
    riskLevel: 'CRITICAL',
    factors: [
      { category: 'THC Compliance', description: 'Recent THC limit breach', weight: 35, score: 95, trend: 'UP' },
      { category: 'Documentation', description: 'Missing test panels', weight: 30, score: 85, trend: 'UP' },
      { category: 'Testing Frequency', description: 'Overdue testing', weight: 20, score: 70, trend: 'UP' },
      { category: 'Batch History', description: 'Contamination concern', weight: 15, score: 60, trend: 'UP' },
    ],
    violationCount30d: 4,
    lastViolation: '2026-01-02',
    repeatViolations: 3,
    status: 'UNDER_REVIEW',
    complianceRate: 52,
  },
];

const mockRiskAlerts: RiskAlert[] = [
  {
    id: 'alert-001',
    type: 'THRESHOLD_BREACH',
    entityId: 'org-002',
    entityName: 'Suspect CBD Corp',
    entityType: 'MERCHANT',
    message: 'Risk score exceeded critical threshold (85)',
    severity: 'CRITICAL',
    triggeredAt: '2026-01-02T14:30:00Z',
    acknowledged: false,
  },
  {
    id: 'alert-002',
    type: 'REPEAT_VIOLATION',
    entityId: 'prod-002',
    entityName: 'Hemp Gummies 25mg',
    entityType: 'PRODUCT',
    message: '3rd THC violation in 30 days',
    severity: 'CRITICAL',
    triggeredAt: '2026-01-02T10:15:00Z',
    acknowledged: false,
  },
  {
    id: 'alert-003',
    type: 'TREND_ALERT',
    entityId: 'org-004',
    entityName: 'Herbal Remedies Inc',
    entityType: 'MERCHANT',
    message: 'Risk score increased by 15 points in 7 days',
    severity: 'HIGH',
    triggeredAt: '2026-01-01T16:00:00Z',
    acknowledged: true,
  },
  {
    id: 'alert-004',
    type: 'SUDDEN_CHANGE',
    entityId: 'org-003',
    entityName: 'Pure Wellness Co',
    entityType: 'MERCHANT',
    message: 'Document rejection rate spiked 40%',
    severity: 'MEDIUM',
    triggeredAt: '2025-12-30T09:00:00Z',
    acknowledged: true,
  },
];

export default function RiskIntelligencePage() {
  const [activeTab, setActiveTab] = useState('merchants');
  const [riskLevelFilter, setRiskLevelFilter] = useState('all');
  const [trendFilter, setTrendFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedEntity, setSelectedEntity] = useState<RiskEntity | null>(null);
  const [alerts, setAlerts] = useState<RiskAlert[]>(mockRiskAlerts);
  const [lastUpdated, setLastUpdated] = useState(new Date());
  const { hasPermission } = useAdminPermissions();

  // Stats
  const allEntities = [...mockMerchantRisks, ...mockProductRisks];
  const stats = {
    criticalRisk: allEntities.filter(e => e.riskLevel === 'CRITICAL').length,
    highRisk: allEntities.filter(e => e.riskLevel === 'HIGH').length,
    increasing: allEntities.filter(e => e.riskTrend === 'INCREASING').length,
    activeAlerts: alerts.filter(a => !a.acknowledged).length,
    avgRiskScore: Math.round(allEntities.reduce((sum, e) => sum + e.riskScore, 0) / allEntities.length),
    repeatViolators: allEntities.filter(e => e.repeatViolations >= 2).length,
  };

  const entities = activeTab === 'merchants' ? mockMerchantRisks : mockProductRisks;

  // Filtering
  const filteredEntities = entities.filter(entity => {
    if (riskLevelFilter !== 'all' && entity.riskLevel !== riskLevelFilter) return false;
    if (trendFilter !== 'all' && entity.riskTrend !== trendFilter) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      return (
        entity.name.toLowerCase().includes(q) ||
        entity.organizationName?.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const handleViewDetails = (entity: RiskEntity) => {
    setSelectedEntity(entity);
    setShowDetailModal(true);
  };

  const handleAcknowledgeAlert = (alertId: string) => {
    setAlerts(prev => prev.map(a => 
      a.id === alertId ? { ...a, acknowledged: true } : a
    ));
  };

  const getRiskColor = (level: string) => {
    switch (level) {
      case 'CRITICAL': return 'text-red-500';
      case 'HIGH': return 'text-orange-500';
      case 'MEDIUM': return 'text-amber-500';
      default: return 'text-emerald-500';
    }
  };

  const getRiskBgColor = (level: string) => {
    switch (level) {
      case 'CRITICAL': return 'bg-red-100 dark:bg-red-500/20';
      case 'HIGH': return 'bg-orange-100 dark:bg-orange-500/20';
      case 'MEDIUM': return 'bg-amber-100 dark:bg-amber-500/20';
      default: return 'bg-emerald-100 dark:bg-emerald-500/20';
    }
  };

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case 'INCREASING': return <TrendingUp className="h-4 w-4 text-red-500" />;
      case 'DECREASING': return <TrendingDown className="h-4 w-4 text-emerald-500" />;
      default: return <Activity className="h-4 w-4 text-slate-400" />;
    }
  };

  return (
    <>
      {/* Stats Row */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-6">
        <StatCard
          title="Critical Risk"
          value={stats.criticalRisk}
          icon={<AlertOctagon className="h-5 w-5" />}
          variant="error"
        />
        <StatCard
          title="High Risk"
          value={stats.highRisk}
          icon={<AlertTriangle className="h-5 w-5" />}
          variant="warning"
        />
        <StatCard
          title="Risk Increasing"
          value={stats.increasing}
          icon={<TrendingUp className="h-5 w-5" />}
          variant="warning"
        />
        <StatCard
          title="Active Alerts"
          value={stats.activeAlerts}
          icon={<Flame className="h-5 w-5" />}
          variant="error"
        />
        <StatCard
          title="Avg Risk Score"
          value={stats.avgRiskScore}
          icon={<Gauge className="h-5 w-5" />}
          variant="default"
        />
        <StatCard
          title="Repeat Violators"
          value={stats.repeatViolators}
          icon={<History className="h-5 w-5" />}
          variant="warning"
        />
      </div>

      {/* Risk Alerts Panel */}
      {alerts.filter(a => !a.acknowledged).length > 0 && (
        <Card className="mb-6 border-red-200 dark:border-red-500/30 bg-red-50/50 dark:bg-red-500/5">
          <CardHeader className="border-b border-red-200 dark:border-red-500/30">
            <CardTitle className="flex items-center gap-2 text-red-800 dark:text-red-300">
              <Flame className="h-5 w-5" />
              Active Risk Alerts
              <Badge variant="error">{alerts.filter(a => !a.acknowledged).length}</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="py-4">
            <div className="space-y-3">
              {alerts.filter(a => !a.acknowledged).map((alert) => (
                <div 
                  key={alert.id}
                  className="flex items-center justify-between p-3 bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700/50"
                >
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-lg ${
                      alert.severity === 'CRITICAL' ? 'bg-red-100 dark:bg-red-500/20' :
                      alert.severity === 'HIGH' ? 'bg-orange-100 dark:bg-orange-500/20' :
                      'bg-amber-100 dark:bg-amber-500/20'
                    }`}>
                      <AlertTriangle className={`h-5 w-5 ${
                        alert.severity === 'CRITICAL' ? 'text-red-500' :
                        alert.severity === 'HIGH' ? 'text-orange-500' :
                        'text-amber-500'
                      }`} />
                    </div>
                    <div>
                      <p className="font-medium text-slate-900 dark:text-white">{alert.entityName}</p>
                      <p className="text-sm text-slate-600 dark:text-slate-400">{alert.message}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <Badge variant={alert.severity === 'CRITICAL' ? 'error' : alert.severity === 'HIGH' ? 'warning' : 'default'}>
                      {alert.severity}
                    </Badge>
                    <span className="text-xs text-slate-500 dark:text-slate-400">
                      {new Date(alert.triggeredAt).toLocaleString()}
                    </span>
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => handleAcknowledgeAlert(alert.id)}
                    >
                      Acknowledge
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Tabs */}
      <Tabs value={activeTab} onChange={setActiveTab} className="mb-6">
        <Tab 
          value="merchants" 
          label="Merchant Risk" 
          icon={<Building2 className="h-4 w-4" />}
          count={mockMerchantRisks.length} 
        />
        <Tab 
          value="products" 
          label="Product Risk" 
          icon={<Package className="h-4 w-4" />}
          count={mockProductRisks.length} 
        />
      </Tabs>

      {/* Filters */}
      <Card className="mb-6">
        <CardContent className="py-4">
          <div className="flex flex-col lg:flex-row gap-4 items-start lg:items-center justify-between">
            <div className="flex flex-wrap gap-3 items-center">
              <SearchInput
                placeholder={`Search ${activeTab}...`}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-64"
              />
              <Select
                value={riskLevelFilter}
                onChange={(e) => setRiskLevelFilter(e.target.value)}
                className="w-40"
              >
                <option value="all">All Risk Levels</option>
                <option value="CRITICAL">Critical</option>
                <option value="HIGH">High</option>
                <option value="MEDIUM">Medium</option>
                <option value="LOW">Low</option>
              </Select>
              <Select
                value={trendFilter}
                onChange={(e) => setTrendFilter(e.target.value)}
                className="w-40"
              >
                <option value="all">All Trends</option>
                <option value="INCREASING">Increasing</option>
                <option value="STABLE">Stable</option>
                <option value="DECREASING">Decreasing</option>
              </Select>
            </div>
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => setLastUpdated(new Date())}
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Risk Table */}
      <Card>
        <CardHeader className="border-b border-slate-200 dark:border-slate-700/50">
          <CardTitle className="flex items-center gap-2">
            {activeTab === 'merchants' ? <Building2 className="h-5 w-5 text-amber-500" /> : <Package className="h-5 w-5 text-amber-500" />}
            {activeTab === 'merchants' ? 'Merchant' : 'Product'} Risk Scores
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{activeTab === 'merchants' ? 'Merchant' : 'Product'}</TableHead>
                <TableHead className="text-center">Risk Score</TableHead>
                <TableHead className="text-center">Trend</TableHead>
                <TableHead className="text-center">Violations (30d)</TableHead>
                <TableHead className="text-center">Repeat</TableHead>
                <TableHead className="text-center">Compliance</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredEntities.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8 text-slate-500 dark:text-slate-400">
                    No entities match your filters
                  </TableCell>
                </TableRow>
              ) : (
                filteredEntities.map((entity) => (
                  <TableRow key={entity.id} className={entity.riskLevel === 'CRITICAL' ? 'bg-red-50/50 dark:bg-red-500/5' : ''}>
                    <TableCell>
                      <div>
                        <p className="font-medium text-slate-900 dark:text-white">{entity.name}</p>
                        {entity.organizationName && (
                          <p className="text-sm text-slate-500 dark:text-slate-400">{entity.organizationName}</p>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-center">
                      <div className="inline-flex items-center gap-2">
                        <div className={`w-12 h-12 rounded-full flex items-center justify-center font-bold text-lg ${getRiskBgColor(entity.riskLevel)} ${getRiskColor(entity.riskLevel)}`}>
                          {entity.riskScore}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="text-center">
                      <div className="flex items-center justify-center gap-1">
                        {getTrendIcon(entity.riskTrend)}
                        <span className={`text-sm ${
                          entity.riskTrend === 'INCREASING' ? 'text-red-500' :
                          entity.riskTrend === 'DECREASING' ? 'text-emerald-500' :
                          'text-slate-400'
                        }`}>
                          {entity.riskTrend.toLowerCase()}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="text-center">
                      <span className={`font-semibold ${entity.violationCount30d > 3 ? 'text-red-500' : 'text-slate-900 dark:text-white'}`}>
                        {entity.violationCount30d}
                      </span>
                    </TableCell>
                    <TableCell className="text-center">
                      {entity.repeatViolations > 0 ? (
                        <Badge variant="error">{entity.repeatViolations} repeat</Badge>
                      ) : (
                        <span className="text-slate-400">—</span>
                      )}
                    </TableCell>
                    <TableCell className="text-center">
                      <div className="flex items-center justify-center gap-2">
                        <div className="w-16 h-2 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                          <div 
                            className={`h-full rounded-full ${
                              entity.complianceRate >= 90 ? 'bg-emerald-500' :
                              entity.complianceRate >= 70 ? 'bg-amber-500' :
                              'bg-red-500'
                            }`}
                            style={{ width: `${entity.complianceRate}%` }}
                          />
                        </div>
                        <span className="text-sm text-slate-600 dark:text-slate-300">{entity.complianceRate}%</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <StatusBadge
                        status={
                          entity.status === 'SUSPENDED' ? 'error' :
                          entity.status === 'UNDER_REVIEW' ? 'warning' :
                          entity.status === 'FLAGGED' ? 'warning' :
                          'success'
                        }
                        label={entity.status.replace('_', ' ')}
                      />
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button variant="ghost" size="sm" onClick={() => handleViewDetails(entity)}>
                          <Eye className="h-4 w-4 mr-1" />
                          Details
                        </Button>
                        <Link href={`/${activeTab}/${entity.id}`}>
                          <Button variant="outline" size="sm">
                            View {activeTab === 'merchants' ? 'Merchant' : 'Product'}
                          </Button>
                        </Link>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Risk Distribution Summary */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
        {/* Risk Level Distribution */}
        <Card>
          <CardHeader className="border-b border-slate-200 dark:border-slate-700/50">
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5 text-amber-500" />
              Risk Level Distribution
            </CardTitle>
          </CardHeader>
          <CardContent className="py-6">
            <div className="space-y-4">
              {[
                { level: 'CRITICAL', count: allEntities.filter(e => e.riskLevel === 'CRITICAL').length, color: 'bg-red-500' },
                { level: 'HIGH', count: allEntities.filter(e => e.riskLevel === 'HIGH').length, color: 'bg-orange-500' },
                { level: 'MEDIUM', count: allEntities.filter(e => e.riskLevel === 'MEDIUM').length, color: 'bg-amber-500' },
                { level: 'LOW', count: allEntities.filter(e => e.riskLevel === 'LOW').length, color: 'bg-emerald-500' },
              ].map((item) => (
                <div key={item.level} className="flex items-center gap-4">
                  <span className="w-20 text-sm font-medium text-slate-600 dark:text-slate-300">{item.level}</span>
                  <div className="flex-1 h-6 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                    <div 
                      className={`h-full ${item.color} rounded-full transition-all duration-500`}
                      style={{ width: `${(item.count / allEntities.length) * 100}%` }}
                    />
                  </div>
                  <span className="w-8 text-sm font-semibold text-slate-900 dark:text-white">{item.count}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Top Risk Factors */}
        <Card>
          <CardHeader className="border-b border-slate-200 dark:border-slate-700/50">
            <CardTitle className="flex items-center gap-2">
              <Target className="h-5 w-5 text-amber-500" />
              Top Risk Factors
            </CardTitle>
          </CardHeader>
          <CardContent className="py-6">
            <div className="space-y-4">
              {[
                { factor: 'THC Limit Violations', count: 12, trend: 'UP' },
                { factor: 'Missing Documentation', count: 8, trend: 'STABLE' },
                { factor: 'Expired Certifications', count: 6, trend: 'DOWN' },
                { factor: 'Testing Gaps', count: 5, trend: 'UP' },
                { factor: 'Labeling Non-Compliance', count: 4, trend: 'STABLE' },
              ].map((item, i) => (
                <div key={i} className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-800/50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <span className="w-6 h-6 flex items-center justify-center bg-amber-500/10 text-amber-500 rounded-full text-sm font-semibold">
                      {i + 1}
                    </span>
                    <span className="font-medium text-slate-900 dark:text-white">{item.factor}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <Badge variant="default">{item.count} entities</Badge>
                    {item.trend === 'UP' && <TrendingUp className="h-4 w-4 text-red-500" />}
                    {item.trend === 'DOWN' && <TrendingDown className="h-4 w-4 text-emerald-500" />}
                    {item.trend === 'STABLE' && <Activity className="h-4 w-4 text-slate-400" />}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Detail Modal */}
      <Modal
        isOpen={showDetailModal}
        onClose={() => setShowDetailModal(false)}
        title="Risk Analysis"
        size="lg"
      >
        {selectedEntity && (
          <div className="space-y-6">
            {/* Header */}
            <div className="flex items-start justify-between">
              <div>
                <h4 className="font-semibold text-lg text-slate-900 dark:text-white">
                  {selectedEntity.name}
                </h4>
                {selectedEntity.organizationName && (
                  <p className="text-slate-500 dark:text-slate-400">{selectedEntity.organizationName}</p>
                )}
              </div>
              <div className={`w-16 h-16 rounded-full flex items-center justify-center font-bold text-2xl ${getRiskBgColor(selectedEntity.riskLevel)} ${getRiskColor(selectedEntity.riskLevel)}`}>
                {selectedEntity.riskScore}
              </div>
            </div>

            {/* Risk Factors Breakdown */}
            <div>
              <h5 className="font-medium text-slate-900 dark:text-white mb-3">Risk Factor Breakdown</h5>
              <div className="space-y-3">
                {selectedEntity.factors.map((factor, i) => (
                  <div key={i} className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-medium text-slate-900 dark:text-white">{factor.category}</span>
                      <div className="flex items-center gap-2">
                        <span className={`font-semibold ${
                          factor.score >= 70 ? 'text-red-500' :
                          factor.score >= 40 ? 'text-amber-500' :
                          'text-emerald-500'
                        }`}>
                          {factor.score}
                        </span>
                        {factor.trend === 'UP' && <TrendingUp className="h-4 w-4 text-red-500" />}
                        {factor.trend === 'DOWN' && <TrendingDown className="h-4 w-4 text-emerald-500" />}
                      </div>
                    </div>
                    <p className="text-sm text-slate-600 dark:text-slate-400">{factor.description}</p>
                    <div className="mt-2 h-2 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                      <div 
                        className={`h-full rounded-full ${
                          factor.score >= 70 ? 'bg-red-500' :
                          factor.score >= 40 ? 'bg-amber-500' :
                          'bg-emerald-500'
                        }`}
                        style={{ width: `${factor.score}%` }}
                      />
                    </div>
                    <p className="text-xs text-slate-500 mt-1">Weight: {factor.weight}%</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Violation History */}
            <div className="grid grid-cols-3 gap-4">
              <div className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-lg text-center">
                <p className="text-2xl font-bold text-slate-900 dark:text-white">{selectedEntity.violationCount30d}</p>
                <p className="text-xs text-slate-500">Violations (30d)</p>
              </div>
              <div className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-lg text-center">
                <p className="text-2xl font-bold text-red-500">{selectedEntity.repeatViolations}</p>
                <p className="text-xs text-slate-500">Repeat Violations</p>
              </div>
              <div className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-lg text-center">
                <p className="text-2xl font-bold text-slate-900 dark:text-white">{selectedEntity.complianceRate}%</p>
                <p className="text-xs text-slate-500">Compliance Rate</p>
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t border-slate-200 dark:border-slate-700/50">
              <Button variant="outline" onClick={() => setShowDetailModal(false)}>
                Close
              </Button>
              <Link href={`/${selectedEntity.type === 'MERCHANT' ? 'merchants' : 'products'}/${selectedEntity.id}`}>
                <Button variant="primary">
                  View Full Profile
                </Button>
              </Link>
            </div>
          </div>
        )}
    </Modal>
    </>
  );
}
