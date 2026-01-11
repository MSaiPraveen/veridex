'use client';

import { useState, useEffect } from 'react';
import { 
  Server,
  RefreshCw,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Clock,
  RotateCcw,
  Play,
  Pause,
  Trash2,
  Eye,
  FileText,
  Cpu,
  Activity,
  Zap,
  Database,
  AlertOctagon,
  ArrowRight,
  Download,
  Upload,
  HardDrive,
  Timer,
  TrendingUp,
  TrendingDown,
  ChevronDown,
  ChevronRight,
  Inbox,
  Send,
  Ban,
  Settings
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge, StatusBadge } from '@/components/ui/badge';
import { SearchInput, Select } from '@/components/ui/input';
import { Modal } from '@/components/ui/modal';
import { StatCard } from '@/components/ui/stat-card';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import { Tabs, Tab, TabPanel } from '@/components/ui/tabs';
import { PermissionGate, useAdminPermissions } from '@/components/auth/permission-gate';
import { AdminPermission } from '@/lib/admin-rbac';

// Types
interface QueueItem {
  id: string;
  queue: string;
  type: 'DOCUMENT' | 'COMPLIANCE' | 'NOTIFICATION' | 'AUDIT';
  entityId: string;
  entityName: string;
  status: 'PENDING' | 'PROCESSING' | 'FAILED' | 'COMPLETED';
  attempts: number;
  maxAttempts: number;
  error?: string;
  createdAt: string;
  lastAttempt?: string;
  nextRetry?: string;
  priority: 'LOW' | 'NORMAL' | 'HIGH' | 'CRITICAL';
}

interface DeadLetterItem {
  id: string;
  queue: string;
  type: string;
  payload: string;
  error: string;
  originalTimestamp: string;
  failedAt: string;
  retries: number;
  canRetry: boolean;
}

interface OcrFailure {
  id: string;
  documentId: string;
  documentName: string;
  organizationName: string;
  failureType: 'QUALITY' | 'FORMAT' | 'TIMEOUT' | 'EXTRACTION' | 'UNKNOWN';
  errorMessage: string;
  confidence?: number;
  failedAt: string;
  canRetry: boolean;
  manualOverride: boolean;
}

interface EventLag {
  topic: string;
  partition: number;
  currentOffset: number;
  latestOffset: number;
  lag: number;
  lagTrend: 'INCREASING' | 'DECREASING' | 'STABLE';
  consumerGroup: string;
  lastUpdated: string;
}

// Mock data
const mockRetryQueue: QueueItem[] = [
  {
    id: 'retry-001',
    queue: 'document.processing',
    type: 'DOCUMENT',
    entityId: 'doc-456',
    entityName: 'Lab Report - Batch #2024-Q4-142.pdf',
    status: 'FAILED',
    attempts: 3,
    maxAttempts: 5,
    error: 'OCR timeout after 60s',
    createdAt: '2026-01-02T10:00:00Z',
    lastAttempt: '2026-01-02T14:30:00Z',
    nextRetry: '2026-01-02T15:30:00Z',
    priority: 'HIGH',
  },
  {
    id: 'retry-002',
    queue: 'compliance.evaluation',
    type: 'COMPLIANCE',
    entityId: 'prod-789',
    entityName: 'Hemp Gummies Compliance Check',
    status: 'PENDING',
    attempts: 1,
    maxAttempts: 3,
    error: 'Rule engine timeout',
    createdAt: '2026-01-02T11:00:00Z',
    lastAttempt: '2026-01-02T11:05:00Z',
    nextRetry: '2026-01-02T11:35:00Z',
    priority: 'CRITICAL',
  },
  {
    id: 'retry-003',
    queue: 'notification.email',
    type: 'NOTIFICATION',
    entityId: 'notif-123',
    entityName: 'Approval notification to GreenLeaf Labs',
    status: 'PROCESSING',
    attempts: 2,
    maxAttempts: 5,
    error: 'SMTP connection failed',
    createdAt: '2026-01-02T09:00:00Z',
    lastAttempt: '2026-01-02T14:00:00Z',
    priority: 'NORMAL',
  },
];

const mockDeadLetters: DeadLetterItem[] = [
  {
    id: 'dlq-001',
    queue: 'document.processing',
    type: 'DOCUMENT_UPLOAD',
    payload: '{"documentId":"doc-999","fileName":"corrupted_file.pdf","size":0}',
    error: 'File corrupted or empty - hash mismatch',
    originalTimestamp: '2026-01-01T08:00:00Z',
    failedAt: '2026-01-01T08:05:00Z',
    retries: 5,
    canRetry: false,
  },
  {
    id: 'dlq-002',
    queue: 'compliance.evaluation',
    type: 'PRODUCT_COMPLIANCE',
    payload: '{"productId":"prod-deleted","action":"evaluate"}',
    error: 'Product not found - may have been deleted',
    originalTimestamp: '2026-01-01T12:00:00Z',
    failedAt: '2026-01-01T12:15:00Z',
    retries: 3,
    canRetry: false,
  },
  {
    id: 'dlq-003',
    queue: 'notification.webhook',
    type: 'WEBHOOK_DELIVERY',
    payload: '{"url":"https://invalid-endpoint.com/webhook","event":"document.approved"}',
    error: 'Endpoint not reachable after 5 attempts',
    originalTimestamp: '2025-12-28T10:00:00Z',
    failedAt: '2025-12-28T12:00:00Z',
    retries: 5,
    canRetry: true,
  },
];

const mockOcrFailures: OcrFailure[] = [
  {
    id: 'ocr-001',
    documentId: 'doc-456',
    documentName: 'Lab Report - Batch #2024-Q4-142.pdf',
    organizationName: 'GreenLeaf Labs',
    failureType: 'TIMEOUT',
    errorMessage: 'Processing exceeded 60s timeout. Document may be too large or complex.',
    failedAt: '2026-01-02T14:30:00Z',
    canRetry: true,
    manualOverride: false,
  },
  {
    id: 'ocr-002',
    documentId: 'doc-789',
    documentName: 'Business License - Pure Wellness.pdf',
    organizationName: 'Pure Wellness Co',
    failureType: 'QUALITY',
    errorMessage: 'Image quality too low for reliable extraction. DPI: 72 (min required: 150)',
    confidence: 45,
    failedAt: '2026-01-02T10:00:00Z',
    canRetry: false,
    manualOverride: true,
  },
  {
    id: 'ocr-003',
    documentId: 'doc-111',
    documentName: 'COA - Hemp Extract.pdf',
    organizationName: 'Herbal Remedies Inc',
    failureType: 'EXTRACTION',
    errorMessage: 'Failed to extract THC/CBD values - non-standard format detected',
    confidence: 78,
    failedAt: '2026-01-01T16:00:00Z',
    canRetry: true,
    manualOverride: true,
  },
];

const mockEventLags: EventLag[] = [
  {
    topic: 'document.events',
    partition: 0,
    currentOffset: 145892,
    latestOffset: 145910,
    lag: 18,
    lagTrend: 'STABLE',
    consumerGroup: 'compliance-service',
    lastUpdated: '2026-01-02T14:59:00Z',
  },
  {
    topic: 'compliance.events',
    partition: 0,
    currentOffset: 89234,
    latestOffset: 89390,
    lag: 156,
    lagTrend: 'INCREASING',
    consumerGroup: 'notification-service',
    lastUpdated: '2026-01-02T14:59:00Z',
  },
  {
    topic: 'audit.events',
    partition: 0,
    currentOffset: 234567,
    latestOffset: 234570,
    lag: 3,
    lagTrend: 'DECREASING',
    consumerGroup: 'audit-log-service',
    lastUpdated: '2026-01-02T14:59:00Z',
  },
  {
    topic: 'notification.events',
    partition: 0,
    currentOffset: 67890,
    latestOffset: 67895,
    lag: 5,
    lagTrend: 'STABLE',
    consumerGroup: 'email-service',
    lastUpdated: '2026-01-02T14:59:00Z',
  },
];

export default function SystemOperationsPage() {
  const [activeTab, setActiveTab] = useState('retry');
  const [retryQueue, setRetryQueue] = useState<QueueItem[]>(mockRetryQueue);
  const [deadLetters, setDeadLetters] = useState<DeadLetterItem[]>(mockDeadLetters);
  const [ocrFailures, setOcrFailures] = useState<OcrFailure[]>(mockOcrFailures);
  const [showPayloadModal, setShowPayloadModal] = useState(false);
  const [selectedPayload, setSelectedPayload] = useState<string>('');
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [confirmAction, setConfirmAction] = useState<{ type: string; item: string; action: string } | null>(null);
  const [lastUpdated, setLastUpdated] = useState(new Date());
  const [isRefreshing, setIsRefreshing] = useState(false);
  const { hasPermission } = useAdminPermissions();

  // Stats
  const stats = {
    retryPending: retryQueue.filter(i => i.status === 'PENDING' || i.status === 'FAILED').length,
    deadLetters: deadLetters.length,
    ocrFailures: ocrFailures.length,
    totalLag: mockEventLags.reduce((sum, e) => sum + e.lag, 0),
    criticalQueue: retryQueue.filter(i => i.priority === 'CRITICAL').length,
    lagIncreasing: mockEventLags.filter(e => e.lagTrend === 'INCREASING').length,
  };

  const handleRefresh = () => {
    setIsRefreshing(true);
    setTimeout(() => {
      setLastUpdated(new Date());
      setIsRefreshing(false);
    }, 1000);
  };

  const handleRetryItem = (id: string) => {
    setRetryQueue(prev => prev.map(item => 
      item.id === id ? { ...item, status: 'PROCESSING' as const, attempts: item.attempts + 1 } : item
    ));
  };

  const handleRemoveFromDlq = (id: string) => {
    setDeadLetters(prev => prev.filter(item => item.id !== id));
  };

  const handleReprocessDlq = (id: string) => {
    const item = deadLetters.find(d => d.id === id);
    if (item) {
      // Move to retry queue
      setDeadLetters(prev => prev.filter(d => d.id !== id));
    }
  };

  const handleOcrRetry = (id: string) => {
    setOcrFailures(prev => prev.map(item =>
      item.id === id ? { ...item, canRetry: false } : item
    ));
  };

  const viewPayload = (payload: string) => {
    setSelectedPayload(payload);
    setShowPayloadModal(true);
  };

  const getFailureTypeColor = (type: string) => {
    switch (type) {
      case 'QUALITY': return 'bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-400';
      case 'TIMEOUT': return 'bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-400';
      case 'FORMAT': return 'bg-blue-100 text-blue-700 dark:bg-blue-500/20 dark:text-blue-400';
      case 'EXTRACTION': return 'bg-purple-100 text-purple-700 dark:bg-purple-500/20 dark:text-purple-400';
      default: return 'bg-slate-100 text-slate-700 dark:bg-slate-500/20 dark:text-slate-400';
    }
  };

  return (
    <>
      {/* Stats Row */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-6">
        <StatCard
          title="Retry Queue"
          value={stats.retryPending}
          icon={<RotateCcw className="h-5 w-5" />}
          variant={stats.retryPending > 5 ? 'warning' : 'default'}
        />
        <StatCard
          title="Dead Letters"
          value={stats.deadLetters}
          icon={<Inbox className="h-5 w-5" />}
          variant={stats.deadLetters > 0 ? 'error' : 'default'}
        />
        <StatCard
          title="OCR Failures"
          value={stats.ocrFailures}
          icon={<FileText className="h-5 w-5" />}
          variant={stats.ocrFailures > 0 ? 'warning' : 'default'}
        />
        <StatCard
          title="Event Lag"
          value={stats.totalLag}
          icon={<Timer className="h-5 w-5" />}
          variant={stats.totalLag > 100 ? 'warning' : 'default'}
        />
        <StatCard
          title="Critical Items"
          value={stats.criticalQueue}
          icon={<AlertOctagon className="h-5 w-5" />}
          variant="error"
        />
        <StatCard
          title="Lag Increasing"
          value={stats.lagIncreasing}
          icon={<TrendingUp className="h-5 w-5" />}
          variant={stats.lagIncreasing > 0 ? 'warning' : 'success'}
        />
      </div>

      {/* Refresh Banner */}
      <div className="flex items-center justify-between mb-6 p-4 bg-slate-50 dark:bg-slate-800/50 rounded-lg border border-slate-200 dark:border-slate-700/50">
        <div className="flex items-center gap-3">
          <Activity className="h-5 w-5 text-amber-500" />
          <div>
            <p className="font-medium text-slate-900 dark:text-white">System Status</p>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Last updated: {lastUpdated.toLocaleTimeString()}
            </p>
          </div>
        </div>
        <Button variant="outline" onClick={handleRefresh} disabled={isRefreshing}>
          <RefreshCw className={`h-4 w-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
          Refresh All
        </Button>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onChange={setActiveTab} className="mb-6">
        <Tab 
          value="retry" 
          label="Retry Queue" 
          icon={<RotateCcw className="h-4 w-4" />}
          count={stats.retryPending} 
        />
        <Tab 
          value="deadletter" 
          label="Dead Letters" 
          icon={<Inbox className="h-4 w-4" />}
          count={stats.deadLetters} 
        />
        <Tab 
          value="ocr" 
          label="OCR Failures" 
          icon={<FileText className="h-4 w-4" />}
          count={stats.ocrFailures} 
        />
        <Tab 
          value="events" 
          label="Event Lag" 
          icon={<Activity className="h-4 w-4" />}
        />
      </Tabs>

      {/* Retry Queue Tab */}
      <TabPanel value="retry" activeValue={activeTab}>
        <Card>
          <CardHeader className="border-b border-slate-200 dark:border-slate-700/50">
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <RotateCcw className="h-5 w-5 text-amber-500" />
                Retry Queue
              </CardTitle>
              <PermissionGate permissions={[AdminPermission.SYSTEM_MANAGE]}>
                <Button variant="outline" size="sm">
                  <Play className="h-4 w-4 mr-2" />
                  Process All
                </Button>
              </PermissionGate>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Item</TableHead>
                  <TableHead>Queue</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-center">Attempts</TableHead>
                  <TableHead>Error</TableHead>
                  <TableHead>Next Retry</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {retryQueue.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8 text-slate-500 dark:text-slate-400">
                      <CheckCircle className="h-8 w-8 mx-auto mb-2 text-emerald-500" />
                      Retry queue is empty
                    </TableCell>
                  </TableRow>
                ) : (
                  retryQueue.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell>
                        <div>
                          <p className="font-medium text-slate-900 dark:text-white">{item.entityName}</p>
                          <p className="text-xs text-slate-500 dark:text-slate-400">{item.type}</p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="default">{item.queue}</Badge>
                      </TableCell>
                      <TableCell>
                        <StatusBadge
                          status={
                            item.status === 'COMPLETED' ? 'success' :
                            item.status === 'PROCESSING' ? 'info' :
                            item.status === 'FAILED' ? 'error' :
                            'warning'
                          }
                          label={item.status}
                        />
                      </TableCell>
                      <TableCell className="text-center">
                        <span className={`font-semibold ${item.attempts >= item.maxAttempts - 1 ? 'text-red-500' : ''}`}>
                          {item.attempts}/{item.maxAttempts}
                        </span>
                      </TableCell>
                      <TableCell>
                        <p className="text-sm text-red-600 dark:text-red-400 max-w-xs truncate">
                          {item.error}
                        </p>
                      </TableCell>
                      <TableCell>
                        {item.nextRetry ? (
                          <span className="text-sm text-slate-600 dark:text-slate-300">
                            {new Date(item.nextRetry).toLocaleTimeString()}
                          </span>
                        ) : (
                          <span className="text-slate-400">—</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <PermissionGate permissions={[AdminPermission.SYSTEM_MANAGE]}>
                          <div className="flex justify-end gap-2">
                            <Button 
                              variant="outline" 
                              size="sm"
                              onClick={() => handleRetryItem(item.id)}
                              disabled={item.status === 'PROCESSING'}
                            >
                              <RotateCcw className="h-4 w-4 mr-1" />
                              Retry Now
                            </Button>
                            <Button variant="ghost" size="sm">
                              <Trash2 className="h-4 w-4 text-red-500" />
                            </Button>
                          </div>
                        </PermissionGate>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </TabPanel>

      {/* Dead Letter Tab */}
      <TabPanel value="deadletter" activeValue={activeTab}>
        <Card>
          <CardHeader className="border-b border-slate-200 dark:border-slate-700/50">
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Inbox className="h-5 w-5 text-amber-500" />
                Dead Letter Queue
              </CardTitle>
              <PermissionGate permissions={[AdminPermission.SYSTEM_MANAGE]}>
                <Button variant="error" size="sm">
                  <Trash2 className="h-4 w-4 mr-2" />
                  Purge All
                </Button>
              </PermissionGate>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Queue</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Error</TableHead>
                  <TableHead>Failed At</TableHead>
                  <TableHead className="text-center">Retries</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {deadLetters.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-slate-500 dark:text-slate-400">
                      <CheckCircle className="h-8 w-8 mx-auto mb-2 text-emerald-500" />
                      No dead letter items
                    </TableCell>
                  </TableRow>
                ) : (
                  deadLetters.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell>
                        <Badge variant="default">{item.queue}</Badge>
                      </TableCell>
                      <TableCell>
                        <span className="text-sm text-slate-600 dark:text-slate-300">{item.type}</span>
                      </TableCell>
                      <TableCell>
                        <p className="text-sm text-red-600 dark:text-red-400 max-w-xs truncate">
                          {item.error}
                        </p>
                      </TableCell>
                      <TableCell>
                        <span className="text-sm text-slate-600 dark:text-slate-300">
                          {new Date(item.failedAt).toLocaleString()}
                        </span>
                      </TableCell>
                      <TableCell className="text-center">
                        <span className="font-semibold text-red-500">{item.retries}</span>
                      </TableCell>
                      <TableCell className="text-right">
                        <PermissionGate permissions={[AdminPermission.SYSTEM_MANAGE]}>
                          <div className="flex justify-end gap-2">
                            <Button 
                              variant="ghost" 
                              size="sm"
                              onClick={() => viewPayload(item.payload)}
                            >
                              <Eye className="h-4 w-4 mr-1" />
                              Payload
                            </Button>
                            {item.canRetry && (
                              <Button 
                                variant="outline" 
                                size="sm"
                                onClick={() => handleReprocessDlq(item.id)}
                              >
                                <RotateCcw className="h-4 w-4 mr-1" />
                                Requeue
                              </Button>
                            )}
                            <Button 
                              variant="ghost" 
                              size="sm"
                              onClick={() => handleRemoveFromDlq(item.id)}
                            >
                              <Trash2 className="h-4 w-4 text-red-500" />
                            </Button>
                          </div>
                        </PermissionGate>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </TabPanel>

      {/* OCR Failures Tab */}
      <TabPanel value="ocr" activeValue={activeTab}>
        <Card>
          <CardHeader className="border-b border-slate-200 dark:border-slate-700/50">
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-amber-500" />
              OCR Processing Failures
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Document</TableHead>
                  <TableHead>Organization</TableHead>
                  <TableHead>Failure Type</TableHead>
                  <TableHead>Error</TableHead>
                  <TableHead className="text-center">Confidence</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {ocrFailures.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-slate-500 dark:text-slate-400">
                      <CheckCircle className="h-8 w-8 mx-auto mb-2 text-emerald-500" />
                      No OCR failures
                    </TableCell>
                  </TableRow>
                ) : (
                  ocrFailures.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell>
                        <p className="font-medium text-slate-900 dark:text-white">{item.documentName}</p>
                      </TableCell>
                      <TableCell>
                        <span className="text-slate-600 dark:text-slate-300">{item.organizationName}</span>
                      </TableCell>
                      <TableCell>
                        <Badge className={getFailureTypeColor(item.failureType)}>
                          {item.failureType}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <p className="text-sm text-red-600 dark:text-red-400 max-w-xs">
                          {item.errorMessage}
                        </p>
                      </TableCell>
                      <TableCell className="text-center">
                        {item.confidence !== undefined ? (
                          <span className={`font-semibold ${
                            item.confidence >= 80 ? 'text-emerald-500' :
                            item.confidence >= 60 ? 'text-amber-500' :
                            'text-red-500'
                          }`}>
                            {item.confidence}%
                          </span>
                        ) : (
                          <span className="text-slate-400">—</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <PermissionGate permissions={[AdminPermission.SYSTEM_MANAGE]}>
                          <div className="flex justify-end gap-2">
                            {item.canRetry && (
                              <Button 
                                variant="outline" 
                                size="sm"
                                onClick={() => handleOcrRetry(item.id)}
                              >
                                <RotateCcw className="h-4 w-4 mr-1" />
                                Retry OCR
                              </Button>
                            )}
                            {item.manualOverride && (
                              <Button variant="primary" size="sm">
                                <Settings className="h-4 w-4 mr-1" />
                                Manual Entry
                              </Button>
                            )}
                          </div>
                        </PermissionGate>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* OCR Stats */}
        <Card className="mt-6">
          <CardHeader className="border-b border-slate-200 dark:border-slate-700/50">
            <CardTitle>OCR Failure Analysis (7 Days)</CardTitle>
          </CardHeader>
          <CardContent className="py-6">
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              {[
                { type: 'QUALITY', label: 'Quality Issues', count: 12, color: 'bg-amber-500' },
                { type: 'TIMEOUT', label: 'Timeouts', count: 5, color: 'bg-red-500' },
                { type: 'FORMAT', label: 'Format Errors', count: 8, color: 'bg-blue-500' },
                { type: 'EXTRACTION', label: 'Extraction Failed', count: 15, color: 'bg-purple-500' },
                { type: 'UNKNOWN', label: 'Unknown', count: 2, color: 'bg-slate-500' },
              ].map((stat) => (
                <div key={stat.type} className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <div className={`w-3 h-3 rounded-full ${stat.color}`} />
                    <span className="text-sm text-slate-600 dark:text-slate-400">{stat.label}</span>
                  </div>
                  <p className="text-2xl font-bold text-slate-900 dark:text-white">{stat.count}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </TabPanel>

      {/* Event Lag Tab */}
      <TabPanel value="events" activeValue={activeTab}>
        <Card>
          <CardHeader className="border-b border-slate-200 dark:border-slate-700/50">
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5 text-amber-500" />
              Event Lag Monitoring
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Topic</TableHead>
                  <TableHead>Consumer Group</TableHead>
                  <TableHead className="text-center">Current Offset</TableHead>
                  <TableHead className="text-center">Latest Offset</TableHead>
                  <TableHead className="text-center">Lag</TableHead>
                  <TableHead className="text-center">Trend</TableHead>
                  <TableHead>Last Updated</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {mockEventLags.map((event) => (
                  <TableRow key={`${event.topic}-${event.partition}`}>
                    <TableCell>
                      <p className="font-medium text-slate-900 dark:text-white">{event.topic}</p>
                      <p className="text-xs text-slate-500">Partition {event.partition}</p>
                    </TableCell>
                    <TableCell>
                      <Badge variant="default">{event.consumerGroup}</Badge>
                    </TableCell>
                    <TableCell className="text-center font-mono text-slate-600 dark:text-slate-300">
                      {event.currentOffset.toLocaleString()}
                    </TableCell>
                    <TableCell className="text-center font-mono text-slate-600 dark:text-slate-300">
                      {event.latestOffset.toLocaleString()}
                    </TableCell>
                    <TableCell className="text-center">
                      <span className={`font-bold ${
                        event.lag > 100 ? 'text-red-500' :
                        event.lag > 50 ? 'text-amber-500' :
                        'text-emerald-500'
                      }`}>
                        {event.lag}
                      </span>
                    </TableCell>
                    <TableCell className="text-center">
                      <div className="flex items-center justify-center gap-1">
                        {event.lagTrend === 'INCREASING' && <TrendingUp className="h-4 w-4 text-red-500" />}
                        {event.lagTrend === 'DECREASING' && <TrendingDown className="h-4 w-4 text-emerald-500" />}
                        {event.lagTrend === 'STABLE' && <Activity className="h-4 w-4 text-slate-400" />}
                        <span className={`text-xs ${
                          event.lagTrend === 'INCREASING' ? 'text-red-500' :
                          event.lagTrend === 'DECREASING' ? 'text-emerald-500' :
                          'text-slate-400'
                        }`}>
                          {event.lagTrend}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className="text-sm text-slate-600 dark:text-slate-300">
                        {new Date(event.lastUpdated).toLocaleTimeString()}
                      </span>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Lag Alert Thresholds */}
        <Card className="mt-6">
          <CardHeader className="border-b border-slate-200 dark:border-slate-700/50">
            <div className="flex items-center justify-between">
              <CardTitle>Alert Thresholds</CardTitle>
              <PermissionGate permissions={[AdminPermission.SYSTEM_MANAGE]}>
                <Button variant="outline" size="sm">
                  <Settings className="h-4 w-4 mr-2" />
                  Configure
                </Button>
              </PermissionGate>
            </div>
          </CardHeader>
          <CardContent className="py-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="p-4 bg-emerald-50 dark:bg-emerald-500/10 rounded-lg border border-emerald-200 dark:border-emerald-500/30">
                <p className="text-sm font-medium text-emerald-800 dark:text-emerald-300 mb-1">Normal</p>
                <p className="text-2xl font-bold text-emerald-600">&lt; 50</p>
                <p className="text-xs text-emerald-600/70">messages behind</p>
              </div>
              <div className="p-4 bg-amber-50 dark:bg-amber-500/10 rounded-lg border border-amber-200 dark:border-amber-500/30">
                <p className="text-sm font-medium text-amber-800 dark:text-amber-300 mb-1">Warning</p>
                <p className="text-2xl font-bold text-amber-600">50-100</p>
                <p className="text-xs text-amber-600/70">messages behind</p>
              </div>
              <div className="p-4 bg-red-50 dark:bg-red-500/10 rounded-lg border border-red-200 dark:border-red-500/30">
                <p className="text-sm font-medium text-red-800 dark:text-red-300 mb-1">Critical</p>
                <p className="text-2xl font-bold text-red-600">&gt; 100</p>
                <p className="text-xs text-red-600/70">messages behind</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </TabPanel>

      {/* Payload Modal */}
      <Modal
        isOpen={showPayloadModal}
        onClose={() => setShowPayloadModal(false)}
        title="Event Payload"
      >
        <div className="space-y-4">
          <pre className="p-4 bg-slate-900 text-slate-100 rounded-lg overflow-x-auto text-sm font-mono">
            {JSON.stringify(JSON.parse(selectedPayload || '{}'), null, 2)}
          </pre>
          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={() => setShowPayloadModal(false)}>
              Close
            </Button>
            <Button variant="primary" onClick={() => navigator.clipboard.writeText(selectedPayload)}>
              Copy Payload
            </Button>
          </div>
        </div>
    </Modal>
    </>
  );
}
