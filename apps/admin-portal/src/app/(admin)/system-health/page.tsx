'use client';

import { useState, useEffect } from 'react';
import {
  Activity,
  Server,
  Database,
  Cloud,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Clock,
  RefreshCw,
  ChevronDown,
  ChevronUp,
  FileText,
  Cpu,
  HardDrive,
  Wifi,
  Zap,
  Timer,
  TrendingUp,
  TrendingDown,
  Eye,
  RotateCcw,
  Trash2,
  Play,
  Pause,
  ArrowRight
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Modal } from '@/components/ui/modal';
import { PermissionGate } from '@/components/auth/permission-gate';
import { AdminPermission } from '@/lib/admin-rbac';

type ServiceStatus = 'HEALTHY' | 'DEGRADED' | 'DOWN' | 'UNKNOWN';

interface Service {
  id: string;
  name: string;
  status: ServiceStatus;
  uptime: string;
  responseTime: number;
  lastCheck: string;
  instances: number;
  healthyInstances: number;
  version: string;
  metrics: {
    cpu: number;
    memory: number;
    requestsPerMin: number;
  };
}

interface QueueMetrics {
  name: string;
  pending: number;
  processing: number;
  completed24h: number;
  failed24h: number;
  avgProcessingTime: string;
  lag: number;
  status: 'NORMAL' | 'BACKED_UP' | 'CRITICAL';
}

interface DeadLetterItem {
  id: string;
  queue: string;
  payload: string;
  error: string;
  failedAt: string;
  retries: number;
}

interface OcrErrorStat {
  type: string;
  count: number;
  percentage: number;
  trend: 'UP' | 'DOWN' | 'STABLE';
}

const mockServices: Service[] = [
  {
    id: 'api-gateway',
    name: 'API Gateway',
    status: 'HEALTHY',
    uptime: '99.99%',
    responseTime: 45,
    lastCheck: '2026-01-02T12:00:00Z',
    instances: 3,
    healthyInstances: 3,
    version: '2.4.1',
    metrics: { cpu: 23, memory: 45, requestsPerMin: 1250 },
  },
  {
    id: 'auth-service',
    name: 'Auth Service',
    status: 'HEALTHY',
    uptime: '99.98%',
    responseTime: 32,
    lastCheck: '2026-01-02T12:00:00Z',
    instances: 2,
    healthyInstances: 2,
    version: '1.8.0',
    metrics: { cpu: 15, memory: 38, requestsPerMin: 420 },
  },
  {
    id: 'document-service',
    name: 'Document Service',
    status: 'DEGRADED',
    uptime: '99.85%',
    responseTime: 156,
    lastCheck: '2026-01-02T12:00:00Z',
    instances: 4,
    healthyInstances: 3,
    version: '3.2.0',
    metrics: { cpu: 78, memory: 82, requestsPerMin: 890 },
  },
  {
    id: 'compliance-service',
    name: 'Compliance Service',
    status: 'HEALTHY',
    uptime: '99.95%',
    responseTime: 89,
    lastCheck: '2026-01-02T12:00:00Z',
    instances: 2,
    healthyInstances: 2,
    version: '2.1.0',
    metrics: { cpu: 42, memory: 55, requestsPerMin: 650 },
  },
  {
    id: 'notification-service',
    name: 'Notification Service',
    status: 'HEALTHY',
    uptime: '99.92%',
    responseTime: 28,
    lastCheck: '2026-01-02T12:00:00Z',
    instances: 2,
    healthyInstances: 2,
    version: '1.5.2',
    metrics: { cpu: 12, memory: 28, requestsPerMin: 180 },
  },
  {
    id: 'ocr-engine',
    name: 'OCR Engine',
    status: 'HEALTHY',
    uptime: '99.90%',
    responseTime: 2450,
    lastCheck: '2026-01-02T12:00:00Z',
    instances: 6,
    healthyInstances: 6,
    version: '2.3.1',
    metrics: { cpu: 85, memory: 72, requestsPerMin: 125 },
  },
];

const mockQueues: QueueMetrics[] = [
  {
    name: 'document.processing',
    pending: 23,
    processing: 8,
    completed24h: 1456,
    failed24h: 12,
    avgProcessingTime: '3.2s',
    lag: 45,
    status: 'NORMAL',
  },
  {
    name: 'compliance.evaluation',
    pending: 156,
    processing: 12,
    completed24h: 1423,
    failed24h: 3,
    avgProcessingTime: '1.8s',
    lag: 180,
    status: 'BACKED_UP',
  },
  {
    name: 'notification.email',
    pending: 5,
    processing: 2,
    completed24h: 892,
    failed24h: 8,
    avgProcessingTime: '0.5s',
    lag: 10,
    status: 'NORMAL',
  },
  {
    name: 'audit.logging',
    pending: 12,
    processing: 4,
    completed24h: 4521,
    failed24h: 0,
    avgProcessingTime: '0.2s',
    lag: 5,
    status: 'NORMAL',
  },
];

const mockDeadLetterQueue: DeadLetterItem[] = [
  {
    id: 'dlq-001',
    queue: 'document.processing',
    payload: '{"documentId": "doc-789", "action": "process"}',
    error: 'OCR timeout after 30s - document too large (45MB)',
    failedAt: '2026-01-02T11:45:00Z',
    retries: 3,
  },
  {
    id: 'dlq-002',
    queue: 'document.processing',
    payload: '{"documentId": "doc-823", "action": "process"}',
    error: 'Invalid file format - encrypted PDF not supported',
    failedAt: '2026-01-02T11:30:00Z',
    retries: 3,
  },
  {
    id: 'dlq-003',
    queue: 'notification.email',
    payload: '{"userId": "user-456", "template": "document_approved"}',
    error: 'SMTP connection refused - email service unavailable',
    failedAt: '2026-01-02T10:15:00Z',
    retries: 5,
  },
];

const mockOcrErrors: OcrErrorStat[] = [
  { type: 'Low Confidence (<70%)', count: 23, percentage: 1.5, trend: 'DOWN' },
  { type: 'Processing Timeout', count: 8, percentage: 0.5, trend: 'STABLE' },
  { type: 'Unsupported Format', count: 12, percentage: 0.8, trend: 'UP' },
  { type: 'Corrupted File', count: 3, percentage: 0.2, trend: 'STABLE' },
  { type: 'Field Extraction Failed', count: 18, percentage: 1.2, trend: 'DOWN' },
];

export default function SystemHealthPage() {
  const [services, setServices] = useState<Service[]>(mockServices);
  const [expandedService, setExpandedService] = useState<string | null>(null);
  const [showDeadLetterModal, setShowDeadLetterModal] = useState(false);
  const [selectedDlqItem, setSelectedDlqItem] = useState<DeadLetterItem | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastRefresh, setLastRefresh] = useState(new Date());

  const healthyServices = services.filter(s => s.status === 'HEALTHY').length;
  const degradedServices = services.filter(s => s.status === 'DEGRADED').length;
  const downServices = services.filter(s => s.status === 'DOWN').length;

  const totalQueuePending = mockQueues.reduce((sum, q) => sum + q.pending, 0);
  const totalQueueFailed = mockQueues.reduce((sum, q) => sum + q.failed24h, 0);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await new Promise(resolve => setTimeout(resolve, 1000));
    setLastRefresh(new Date());
    setIsRefreshing(false);
  };

  const getStatusColor = (status: ServiceStatus) => {
    switch (status) {
      case 'HEALTHY': return 'bg-emerald-500';
      case 'DEGRADED': return 'bg-amber-500';
      case 'DOWN': return 'bg-red-500';
      case 'UNKNOWN': return 'bg-slate-500';
    }
  };

  const getStatusBadge = (status: ServiceStatus) => {
    switch (status) {
      case 'HEALTHY': return 'bg-emerald-500/10 text-emerald-400';
      case 'DEGRADED': return 'bg-amber-500/10 text-amber-400';
      case 'DOWN': return 'bg-red-500/10 text-red-400';
      case 'UNKNOWN': return 'bg-slate-500/10 text-slate-400';
    }
  };

  const getQueueStatusColor = (status: string) => {
    switch (status) {
      case 'NORMAL': return 'bg-emerald-500/10 text-emerald-400';
      case 'BACKED_UP': return 'bg-amber-500/10 text-amber-400';
      case 'CRITICAL': return 'bg-red-500/10 text-red-400';
      default: return 'bg-slate-500/10 text-slate-400';
    }
  };

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case 'UP': return <TrendingUp className="h-4 w-4 text-red-400" />;
      case 'DOWN': return <TrendingDown className="h-4 w-4 text-emerald-400" />;
      default: return <ArrowRight className="h-4 w-4 text-slate-400" />;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">System Health</h1>
          <p className="text-sm text-slate-400">
            Last updated: {lastRefresh.toLocaleTimeString()}
          </p>
        </div>
        <Button
          variant="secondary"
          onClick={handleRefresh}
          disabled={isRefreshing}
        >
          <RefreshCw className={`h-4 w-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {/* Overview Stats */}
      <div className="grid grid-cols-5 gap-4">
        <Card className={healthyServices === services.length ? 'border-emerald-500/30' : ''}>
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-lg ${healthyServices === services.length ? 'bg-emerald-500/10' : 'bg-slate-700/50'}`}>
                <CheckCircle className={`h-5 w-5 ${healthyServices === services.length ? 'text-emerald-400' : 'text-slate-400'}`} />
              </div>
              <div>
                <p className="text-sm text-slate-400">Healthy</p>
                <p className="text-2xl font-bold text-emerald-400">{healthyServices}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className={degradedServices > 0 ? 'border-amber-500/30' : ''}>
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-lg ${degradedServices > 0 ? 'bg-amber-500/10' : 'bg-slate-700/50'}`}>
                <AlertTriangle className={`h-5 w-5 ${degradedServices > 0 ? 'text-amber-400' : 'text-slate-400'}`} />
              </div>
              <div>
                <p className="text-sm text-slate-400">Degraded</p>
                <p className="text-2xl font-bold text-amber-400">{degradedServices}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className={downServices > 0 ? 'border-red-500/30' : ''}>
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-lg ${downServices > 0 ? 'bg-red-500/10' : 'bg-slate-700/50'}`}>
                <XCircle className={`h-5 w-5 ${downServices > 0 ? 'text-red-400' : 'text-slate-400'}`} />
              </div>
              <div>
                <p className="text-sm text-slate-400">Down</p>
                <p className="text-2xl font-bold text-red-400">{downServices}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-slate-700/50">
                <Timer className="h-5 w-5 text-blue-400" />
              </div>
              <div>
                <p className="text-sm text-slate-400">Queue Pending</p>
                <p className="text-2xl font-bold text-slate-900 dark:text-white">{totalQueuePending}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className={totalQueueFailed > 10 ? 'border-red-500/30' : ''}>
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-lg ${totalQueueFailed > 10 ? 'bg-red-500/10' : 'bg-slate-700/50'}`}>
                <Trash2 className={`h-5 w-5 ${totalQueueFailed > 10 ? 'text-red-400' : 'text-slate-400'}`} />
              </div>
              <div>
                <p className="text-sm text-slate-400">Failed (24h)</p>
                <p className={`text-2xl font-bold ${totalQueueFailed > 10 ? 'text-red-500 dark:text-red-400' : 'text-slate-900 dark:text-white'}`}>
                  {totalQueueFailed}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Services Grid */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Server className="h-5 w-5" />
            Services
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {services.map((service) => {
              const isExpanded = expandedService === service.id;
              return (
                <div
                  key={service.id}
                  className={`rounded-xl border transition-all ${service.status === 'DOWN' ? 'border-red-500/30 bg-red-500/5' :
                    service.status === 'DEGRADED' ? 'border-amber-500/30 bg-amber-500/5' :
                      'border-slate-700/50 bg-slate-800/30'
                    }`}
                >
                  <div
                    className="p-4 cursor-pointer"
                    onClick={() => setExpandedService(isExpanded ? null : service.id)}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className={`h-3 w-3 rounded-full ${getStatusColor(service.status)}`} />
                        <div>
                          <h3 className="text-slate-900 dark:text-white font-medium">{service.name}</h3>
                          <p className="text-sm text-slate-400">v{service.version}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-6">
                        <div className="text-right">
                          <p className="text-sm text-slate-500 dark:text-slate-400">Response Time</p>
                          <p className={`font-medium ${service.responseTime > 1000 ? 'text-red-400' :
                            service.responseTime > 200 ? 'text-amber-400' :
                              'text-emerald-400'
                            }`}>
                            {service.responseTime}ms
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm text-slate-500 dark:text-slate-400">Uptime</p>
                          <p className="font-medium text-slate-900 dark:text-white">{service.uptime}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm text-slate-500 dark:text-slate-400">Instances</p>
                          <p className={`font-medium ${service.healthyInstances < service.instances ? 'text-amber-500 dark:text-amber-400' : 'text-slate-900 dark:text-white'
                            }`}>
                            {service.healthyInstances}/{service.instances}
                          </p>
                        </div>
                        <span className={`px-2 py-1 rounded text-xs font-medium ${getStatusBadge(service.status)}`}>
                          {service.status}
                        </span>
                        {isExpanded ? (
                          <ChevronUp className="h-5 w-5 text-slate-400" />
                        ) : (
                          <ChevronDown className="h-5 w-5 text-slate-400" />
                        )}
                      </div>
                    </div>
                  </div>

                  {isExpanded && (
                    <div className="px-4 pb-4 pt-2 border-t border-slate-700/50">
                      <div className="grid grid-cols-4 gap-4">
                        <div className="p-3 bg-slate-700/30 rounded-lg">
                          <div className="flex items-center gap-2 mb-2">
                            <Cpu className="h-4 w-4 text-slate-500" />
                            <p className="text-sm text-slate-400">CPU Usage</p>
                          </div>
                          <div className="flex items-center gap-2">
                            <div className="flex-1 h-2 bg-slate-700 rounded-full overflow-hidden">
                              <div
                                className={`h-full rounded-full ${service.metrics.cpu > 80 ? 'bg-red-500' :
                                  service.metrics.cpu > 60 ? 'bg-amber-500' :
                                    'bg-emerald-500'
                                  }`}
                                style={{ width: `${service.metrics.cpu}%` }}
                              />
                            </div>
                            <span className="text-sm font-medium text-slate-900 dark:text-white">{service.metrics.cpu}%</span>
                          </div>
                        </div>
                        <div className="p-3 bg-slate-700/30 rounded-lg">
                          <div className="flex items-center gap-2 mb-2">
                            <HardDrive className="h-4 w-4 text-slate-500" />
                            <p className="text-sm text-slate-400">Memory</p>
                          </div>
                          <div className="flex items-center gap-2">
                            <div className="flex-1 h-2 bg-slate-700 rounded-full overflow-hidden">
                              <div
                                className={`h-full rounded-full ${service.metrics.memory > 80 ? 'bg-red-500' :
                                  service.metrics.memory > 60 ? 'bg-amber-500' :
                                    'bg-emerald-500'
                                  }`}
                                style={{ width: `${service.metrics.memory}%` }}
                              />
                            </div>
                            <span className="text-sm font-medium text-slate-900 dark:text-white">{service.metrics.memory}%</span>
                          </div>
                        </div>
                        <div className="p-3 bg-slate-700/30 rounded-lg">
                          <div className="flex items-center gap-2 mb-2">
                            <Zap className="h-4 w-4 text-slate-500" />
                            <p className="text-sm text-slate-400">Requests/min</p>
                          </div>
                          <p className="text-xl font-bold text-slate-900 dark:text-white">{service.metrics.requestsPerMin.toLocaleString()}</p>
                        </div>
                        <div className="p-3 bg-slate-700/30 rounded-lg flex items-center justify-center gap-2">
                          <PermissionGate permission={AdminPermission.SYSTEM_ACCESS}>
                            <Button variant="secondary" size="sm">
                              <RotateCcw className="h-4 w-4 mr-1" />
                              Restart
                            </Button>
                          </PermissionGate>
                          <Button variant="ghost" size="sm">
                            <Eye className="h-4 w-4 mr-1" />
                            Logs
                          </Button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Two Column Layout */}
      <div className="grid grid-cols-2 gap-6">
        {/* Event Queues */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5" />
              Event Queues
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {mockQueues.map((queue) => (
                <div key={queue.name} className="p-4 bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-800/50 dark:to-slate-800/30 rounded-xl border border-slate-200 dark:border-slate-700/50 hover:shadow-md transition-shadow">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                      <div className="h-2 w-2 rounded-full bg-amber-500 animate-pulse" />
                      <span className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                        {queue.name.split('.').map((part, i) => (
                          <span key={i}>
                            {i > 0 && <span className="text-slate-400 dark:text-slate-500 mx-0.5">›</span>}
                            <span className={i === 0 ? 'text-violet-600 dark:text-violet-400' : 'text-slate-700 dark:text-slate-300'}>{part}</span>
                          </span>
                        ))}
                      </span>
                    </div>
                    <span className={`px-2.5 py-1 rounded-full text-xs font-semibold uppercase tracking-wide ${getQueueStatusColor(queue.status)}`}>
                      {queue.status.replace('_', ' ')}
                    </span>
                  </div>
                  <div className="grid grid-cols-4 gap-3 text-sm">
                    <div className="bg-white dark:bg-slate-900/50 rounded-lg p-2.5 text-center">
                      <p className="text-xs text-slate-500 dark:text-slate-400 mb-0.5">Pending</p>
                      <p className={`font-bold text-lg ${queue.pending > 100 ? 'text-amber-600 dark:text-amber-400' : 'text-slate-900 dark:text-white'}`}>
                        {queue.pending}
                      </p>
                    </div>
                    <div className="bg-white dark:bg-slate-900/50 rounded-lg p-2.5 text-center">
                      <p className="text-xs text-slate-500 dark:text-slate-400 mb-0.5">Processing</p>
                      <p className="font-bold text-lg text-blue-600 dark:text-blue-400">{queue.processing}</p>
                    </div>
                    <div className="bg-white dark:bg-slate-900/50 rounded-lg p-2.5 text-center">
                      <p className="text-xs text-slate-500 dark:text-slate-400 mb-0.5">Completed (24h)</p>
                      <p className="font-bold text-lg text-emerald-600 dark:text-emerald-400">{queue.completed24h.toLocaleString()}</p>
                    </div>
                    <div className="bg-white dark:bg-slate-900/50 rounded-lg p-2.5 text-center">
                      <p className="text-xs text-slate-500 dark:text-slate-400 mb-0.5">Failed (24h)</p>
                      <p className={`font-bold text-lg ${queue.failed24h > 0 ? 'text-red-600 dark:text-red-400' : 'text-slate-900 dark:text-white'}`}>
                        {queue.failed24h}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center justify-between mt-4 pt-3 border-t border-slate-200 dark:border-slate-700/50 text-xs">
                    <div className="flex items-center gap-1.5 text-slate-500 dark:text-slate-400">
                      <Clock className="h-3.5 w-3.5" />
                      <span>Avg: <span className="font-medium text-slate-700 dark:text-slate-300">{queue.avgProcessingTime}</span></span>
                    </div>
                    <div className={`flex items-center gap-1.5 ${queue.lag > 60 ? 'text-amber-600 dark:text-amber-400' : 'text-slate-500 dark:text-slate-400'}`}>
                      <Timer className="h-3.5 w-3.5" />
                      <span>Lag: <span className="font-medium">{queue.lag}s</span></span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* OCR Error Breakdown */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              OCR Error Breakdown (24h)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {mockOcrErrors.map((error) => (
                <div key={error.type} className="flex items-center gap-4">
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm text-slate-900 dark:text-white">{error.type}</span>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-slate-900 dark:text-white">{error.count}</span>
                        {getTrendIcon(error.trend)}
                      </div>
                    </div>
                    <div className="h-2 bg-slate-700 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full ${error.percentage > 2 ? 'bg-red-500' :
                          error.percentage > 1 ? 'bg-amber-500' :
                            'bg-blue-500'
                          }`}
                        style={{ width: `${Math.min(error.percentage * 20, 100)}%` }}
                      />
                    </div>
                  </div>
                  <span className="text-sm text-slate-400 w-12 text-right">{error.percentage}%</span>
                </div>
              ))}

              <div className="pt-4 mt-4 border-t border-slate-700/50">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-slate-400">Total OCR Processed (24h)</span>
                  <span className="font-medium text-slate-900 dark:text-white">1,456</span>
                </div>
                <div className="flex items-center justify-between text-sm mt-2">
                  <span className="text-slate-400">Overall Error Rate</span>
                  <span className="font-medium text-emerald-400">4.2%</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Dead Letter Queue */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Trash2 className="h-5 w-5 text-red-400" />
              Dead Letter Queue
              <span className="ml-2 px-2 py-0.5 rounded-full text-xs bg-red-500/10 text-red-400">
                {mockDeadLetterQueue.length} items
              </span>
            </CardTitle>
            <PermissionGate permission={AdminPermission.SYSTEM_ACCESS}>
              <div className="flex items-center gap-2">
                <Button variant="secondary" size="sm">
                  <RotateCcw className="h-4 w-4 mr-1" />
                  Retry All
                </Button>
                <Button variant="danger" size="sm">
                  <Trash2 className="h-4 w-4 mr-1" />
                  Purge All
                </Button>
              </div>
            </PermissionGate>
          </div>
        </CardHeader>
        <CardContent>
          {mockDeadLetterQueue.length === 0 ? (
            <div className="text-center py-8">
              <CheckCircle className="h-12 w-12 text-emerald-400 mx-auto mb-3" />
              <p className="text-slate-400">No failed messages in dead letter queue</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-slate-700/50">
                    <th className="text-left py-3 px-4 text-xs font-medium text-slate-400 uppercase tracking-wide">Queue</th>
                    <th className="text-left py-3 px-4 text-xs font-medium text-slate-400 uppercase tracking-wide">Error</th>
                    <th className="text-left py-3 px-4 text-xs font-medium text-slate-400 uppercase tracking-wide">Retries</th>
                    <th className="text-left py-3 px-4 text-xs font-medium text-slate-400 uppercase tracking-wide">Failed At</th>
                    <th className="text-right py-3 px-4 text-xs font-medium text-slate-400 uppercase tracking-wide">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-700/50">
                  {mockDeadLetterQueue.map((item) => (
                    <tr key={item.id} className="group hover:bg-slate-700/20">
                      <td className="py-3 px-4">
                        <code className="text-sm text-amber-400 font-mono">{item.queue}</code>
                      </td>
                      <td className="py-3 px-4">
                        <p className="text-sm text-red-400 max-w-md truncate">{item.error}</p>
                      </td>
                      <td className="py-3 px-4">
                        <span className="text-sm text-slate-400">{item.retries}</span>
                      </td>
                      <td className="py-3 px-4">
                        <span className="text-sm text-slate-400">
                          {new Date(item.failedAt).toLocaleString()}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setSelectedDlqItem(item);
                              setShowDeadLetterModal(true);
                            }}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          <PermissionGate permission={AdminPermission.SYSTEM_ACCESS}>
                            <Button variant="ghost" size="sm">
                              <RotateCcw className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="sm" className="text-red-400">
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </PermissionGate>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Dead Letter Item Modal */}
      <Modal
        isOpen={showDeadLetterModal}
        onClose={() => {
          setShowDeadLetterModal(false);
          setSelectedDlqItem(null);
        }}
        title="Dead Letter Queue Item"
        description="View details of the failed message"
      >
        {selectedDlqItem && (
          <div className="space-y-4">
            <div>
              <label className="block text-xs text-slate-500 uppercase tracking-wide mb-1">Queue</label>
              <code className="text-amber-400 font-mono">{selectedDlqItem.queue}</code>
            </div>
            <div>
              <label className="block text-xs text-slate-500 uppercase tracking-wide mb-1">Error</label>
              <p className="text-red-400">{selectedDlqItem.error}</p>
            </div>
            <div>
              <label className="block text-xs text-slate-500 uppercase tracking-wide mb-1">Payload</label>
              <pre className="p-3 bg-slate-900 rounded-lg text-sm text-slate-300 overflow-x-auto">
                {JSON.stringify(JSON.parse(selectedDlqItem.payload), null, 2)}
              </pre>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs text-slate-500 uppercase tracking-wide mb-1">Retries</label>
                <p className="text-slate-900 dark:text-white">{selectedDlqItem.retries}</p>
              </div>
              <div>
                <label className="block text-xs text-slate-500 uppercase tracking-wide mb-1">Failed At</label>
                <p className="text-slate-900 dark:text-white">{new Date(selectedDlqItem.failedAt).toLocaleString()}</p>
              </div>
            </div>
            <div className="flex justify-end gap-3 pt-4">
              <Button variant="secondary" onClick={() => setShowDeadLetterModal(false)}>
                Close
              </Button>
              <PermissionGate permission={AdminPermission.SYSTEM_ACCESS}>
                <Button variant="danger">
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete
                </Button>
                <Button variant="primary">
                  <RotateCcw className="h-4 w-4 mr-2" />
                  Retry
                </Button>
              </PermissionGate>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
