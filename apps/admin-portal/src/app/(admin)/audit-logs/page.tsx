'use client';

import { useState, useEffect } from 'react';
import {
  History,
  Search,
  Download,
  Eye,
  User,
  Server,
  Settings,
  FileText,
  Building2,
  Package,
  Shield,
  ChevronDown,
  ChevronRight,
  Calendar,
  Clock,
  Filter,
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Rewind,
  FastForward,
  GitCompare,
  ArrowRight,
  ExternalLink,
  Copy,
  Check,
  AlertTriangle,
  Plus,
  Minus,
  X
} from 'lucide-react';
import Link from 'next/link';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { SearchInput, Select } from '@/components/ui/input';
import { Modal } from '@/components/ui/modal';
import { PermissionGate } from '@/components/auth/permission-gate';
import { AdminPermission } from '@/lib/admin-rbac';

// Types
interface AuditLog {
  id: string;
  timestamp: string;
  actorType: 'USER' | 'ADMIN' | 'SYSTEM' | 'SERVICE';
  actorId: string;
  actorEmail?: string;
  actorRole?: string;
  eventType: string;
  action: string;
  entityType: string;
  entityId: string;
  entityName?: string;
  ipAddress?: string;
  userAgent?: string;
  justification?: string;
  metadata?: Record<string, unknown>;
  previousState?: Record<string, unknown>;
  newState?: Record<string, unknown>;
}

type TabType = 'timeline' | 'entity' | 'actor' | 'diffs';

const mockLogs: AuditLog[] = [
  {
    id: 'audit-001',
    timestamp: '2026-01-02T14:32:45Z',
    actorType: 'ADMIN',
    actorId: 'admin-001',
    actorEmail: 'john.admin@veridex.io',
    actorRole: 'ADMIN',
    eventType: 'COMPLIANCE',
    action: 'COMPLIANCE_OVERRIDE',
    entityType: 'DOCUMENT',
    entityId: 'doc-123',
    entityName: 'Lab Report - Batch #2024-001',
    ipAddress: '192.168.1.100',
    justification: 'THC level is marginally over limit but within measurement error tolerance. Lab confirmed retesting shows 0.28%',
    previousState: { status: 'FAILED', thcContent: '0.32%', autoDecision: 'REJECTED' },
    newState: { status: 'APPROVED', thcContent: '0.32%', overrideApproved: true },
  },
  {
    id: 'audit-002',
    timestamp: '2026-01-02T14:30:00Z',
    actorType: 'SYSTEM',
    actorId: 'compliance-service',
    eventType: 'COMPLIANCE',
    action: 'AUTO_COMPLIANCE_FAILED',
    entityType: 'DOCUMENT',
    entityId: 'doc-123',
    entityName: 'Lab Report - Batch #2024-001',
    previousState: { status: 'PENDING' },
    newState: { status: 'FAILED', failedRules: ['THC-CA-001'] },
    metadata: { rule: 'THC-CA-001', threshold: '0.3%', actual: '0.32%' },
  },
  {
    id: 'audit-003',
    timestamp: '2026-01-02T14:28:00Z',
    actorType: 'SERVICE',
    actorId: 'document-service',
    eventType: 'DOCUMENT',
    action: 'OCR_COMPLETED',
    entityType: 'DOCUMENT',
    entityId: 'doc-123',
    entityName: 'Lab Report - Batch #2024-001',
    previousState: { status: 'PROCESSING', ocrConfidence: null },
    newState: { status: 'EXTRACTED', ocrConfidence: 94.2 },
    metadata: { processingTime: '3.2s', extractedFields: 10 },
  },
  {
    id: 'audit-004',
    timestamp: '2026-01-02T14:25:00Z',
    actorType: 'USER',
    actorId: 'user-456',
    actorEmail: 'owner@greenleaflabs.com',
    eventType: 'DOCUMENT',
    action: 'DOCUMENT_UPLOADED',
    entityType: 'DOCUMENT',
    entityId: 'doc-123',
    entityName: 'Lab Report - Batch #2024-001',
    previousState: undefined,
    newState: { status: 'PENDING', fileName: 'lab-report-2024-001.pdf', size: '2.4MB' },
  },
  {
    id: 'audit-005',
    timestamp: '2026-01-02T13:00:00Z',
    actorType: 'ADMIN',
    actorId: 'admin-002',
    actorEmail: 'sarah.reviewer@veridex.io',
    actorRole: 'ADMIN',
    eventType: 'RULE',
    action: 'RULE_UPDATED',
    entityType: 'RULE',
    entityId: 'THC-CA-001',
    entityName: 'California THC Limit',
    justification: 'Updated threshold per 2026 regulatory changes',
    previousState: { version: 2, threshold: '0.3%', status: 'ACTIVE' },
    newState: { version: 3, threshold: '0.3%', status: 'ACTIVE', effectiveDate: '2026-02-01' },
  },
  {
    id: 'audit-006',
    timestamp: '2026-01-02T12:00:00Z',
    actorType: 'ADMIN',
    actorId: 'admin-001',
    actorEmail: 'john.admin@veridex.io',
    actorRole: 'ADMIN',
    eventType: 'ORGANIZATION',
    action: 'ORGANIZATION_SUSPENDED',
    entityType: 'ORGANIZATION',
    entityId: 'org-999',
    entityName: 'Suspect CBD Corp',
    justification: 'Multiple compliance failures over 30 days. Pending investigation.',
    previousState: { status: 'ACTIVE', complianceScore: 45 },
    newState: { status: 'SUSPENDED', suspensionReason: 'COMPLIANCE_VIOLATION' },
  },
];

export default function EnhancedAuditLogsPage() {
  const [activeTab, setActiveTab] = useState<TabType>('timeline');
  const [searchQuery, setSearchQuery] = useState('');
  const [eventTypeFilter, setEventTypeFilter] = useState('all');
  const [actorTypeFilter, setActorTypeFilter] = useState('all');
  const [dateRange, setDateRange] = useState('7d');
  const [selectedEntityId, setSelectedEntityId] = useState<string | null>(null);
  const [selectedActorId, setSelectedActorId] = useState<string | null>(null);
  const [expandedLog, setExpandedLog] = useState<string | null>(null);
  const [showDiffModal, setShowDiffModal] = useState(false);
  const [diffLog, setDiffLog] = useState<AuditLog | null>(null);
  const [showExportModal, setShowExportModal] = useState(false);

  // Timeline replay state
  const [isPlaying, setIsPlaying] = useState(false);
  const [replayIndex, setReplayIndex] = useState(0);
  const [replaySpeed, setReplaySpeed] = useState(1);

  const tabs: { id: TabType; label: string; icon: React.ReactNode }[] = [
    { id: 'timeline', label: 'Timeline View', icon: <History className="h-4 w-4" /> },
    { id: 'entity', label: 'Entity-Centric', icon: <FileText className="h-4 w-4" /> },
    { id: 'actor', label: 'Actor View', icon: <User className="h-4 w-4" /> },
    { id: 'diffs', label: 'Change Diffs', icon: <GitCompare className="h-4 w-4" /> },
  ];

  const filteredLogs = mockLogs.filter(log => {
    if (eventTypeFilter !== 'all' && log.eventType !== eventTypeFilter) return false;
    if (actorTypeFilter !== 'all' && log.actorType !== actorTypeFilter) return false;
    if (searchQuery) {
      const searchLower = searchQuery.toLowerCase();
      return (
        log.action.toLowerCase().includes(searchLower) ||
        log.entityName?.toLowerCase().includes(searchLower) ||
        log.actorEmail?.toLowerCase().includes(searchLower) ||
        log.justification?.toLowerCase().includes(searchLower)
      );
    }
    return true;
  });

  // Group logs by entity for entity-centric view
  const logsByEntity = filteredLogs.reduce((acc, log) => {
    const key = `${log.entityType}:${log.entityId}`;
    if (!acc[key]) acc[key] = [];
    acc[key].push(log);
    return acc;
  }, {} as Record<string, AuditLog[]>);

  // Group logs by actor for actor view
  const logsByActor = filteredLogs.reduce((acc, log) => {
    const key = log.actorId;
    if (!acc[key]) acc[key] = [];
    acc[key].push(log);
    return acc;
  }, {} as Record<string, AuditLog[]>);

  // Logs with changes for diff view
  const logsWithChanges = filteredLogs.filter(log => log.previousState || log.newState);

  // Timeline replay effect
  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (isPlaying && replayIndex < filteredLogs.length - 1) {
      timer = setTimeout(() => {
        setReplayIndex(prev => prev + 1);
      }, 2000 / replaySpeed);
    } else if (replayIndex >= filteredLogs.length - 1) {
      setIsPlaying(false);
    }
    return () => clearTimeout(timer);
  }, [isPlaying, replayIndex, replaySpeed, filteredLogs.length]);

  const getEventColor = (eventType: string) => {
    switch (eventType) {
      case 'AUTH': return 'bg-blue-500/10 text-blue-400 border-blue-500/30';
      case 'DOCUMENT': return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30';
      case 'COMPLIANCE': return 'bg-amber-500/10 text-amber-400 border-amber-500/30';
      case 'ORGANIZATION': return 'bg-purple-500/10 text-purple-400 border-purple-500/30';
      case 'RULE': return 'bg-red-500/10 text-red-400 border-red-500/30';
      default: return 'bg-slate-500/10 text-slate-400 border-slate-500/30';
    }
  };

  const getActorIcon = (actorType: string) => {
    switch (actorType) {
      case 'USER': return <User className="h-4 w-4" />;
      case 'ADMIN': return <Shield className="h-4 w-4" />;
      case 'SYSTEM': return <Server className="h-4 w-4" />;
      case 'SERVICE': return <Settings className="h-4 w-4" />;
      default: return <User className="h-4 w-4" />;
    }
  };

  const getEntityIcon = (entityType: string) => {
    switch (entityType) {
      case 'DOCUMENT': return <FileText className="h-4 w-4" />;
      case 'ORGANIZATION': return <Building2 className="h-4 w-4" />;
      case 'PRODUCT': return <Package className="h-4 w-4" />;
      case 'RULE': return <Shield className="h-4 w-4" />;
      default: return <FileText className="h-4 w-4" />;
    }
  };

  const openDiffModal = (log: AuditLog) => {
    setDiffLog(log);
    setShowDiffModal(true);
  };

  const renderDiff = (prev: Record<string, unknown> | null | undefined, next: Record<string, unknown> | null | undefined) => {
    const allKeys = new Set([
      ...Object.keys(prev || {}),
      ...Object.keys(next || {}),
    ]);

    return Array.from(allKeys).map(key => {
      const prevVal = prev?.[key];
      const nextVal = next?.[key];
      const changed = JSON.stringify(prevVal) !== JSON.stringify(nextVal);

      if (!changed) {
        return (
          <div key={key} className="flex items-center gap-2 py-1 text-sm">
            <span className="w-40 text-slate-500">{key}:</span>
            <span className="text-slate-400">{JSON.stringify(nextVal)}</span>
          </div>
        );
      }

      return (
        <div key={key} className="py-2">
          <div className="flex items-center gap-2 text-sm">
            <span className="w-40 text-slate-900 dark:text-white font-medium">{key}:</span>
          </div>
          {prevVal !== undefined && (
            <div className="flex items-center gap-2 ml-4 py-1">
              <Minus className="h-4 w-4 text-red-400" />
              <span className="text-red-400 bg-red-500/10 px-2 py-0.5 rounded">
                {JSON.stringify(prevVal)}
              </span>
            </div>
          )}
          {nextVal !== undefined && (
            <div className="flex items-center gap-2 ml-4 py-1">
              <Plus className="h-4 w-4 text-emerald-400" />
              <span className="text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded">
                {JSON.stringify(nextVal)}
              </span>
            </div>
          )}
        </div>
      );
    });
  };

  const renderLogCard = (log: AuditLog, showEntity = true, highlight = false) => {
    const isExpanded = expandedLog === log.id;

    return (
      <div
        key={log.id}
        className={`p-4 rounded-lg border transition-all ${highlight
          ? 'bg-amber-50 dark:bg-amber-900/10 border-amber-500/30'
          : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600'
          }`}
      >
        <div className="flex items-start justify-between">
          <div className="flex items-start gap-3">
            <div className={`p-2 rounded-lg ${getEventColor(log.eventType)}`}>
              {getActorIcon(log.actorType)}
            </div>
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="text-slate-900 dark:text-white font-medium">{log.action.replace(/_/g, ' ')}</span>
                <span className={`px-2 py-0.5 rounded text-xs font-medium ${getEventColor(log.eventType)}`}>
                  {log.eventType}
                </span>
                {log.justification && (
                  <span className="px-2 py-0.5 rounded text-xs font-medium bg-amber-500/10 text-amber-400">
                    OVERRIDE
                  </span>
                )}
              </div>
              {showEntity && (
                <div className="flex items-center gap-2 text-sm text-slate-400">
                  {getEntityIcon(log.entityType)}
                  <span>{log.entityName || log.entityId}</span>
                </div>
              )}
              <div className="flex items-center gap-4 mt-2 text-xs text-slate-500">
                <span className="flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  {new Date(log.timestamp).toLocaleString()}
                </span>
                {log.actorEmail && (
                  <span className="flex items-center gap-1">
                    <User className="h-3 w-3" />
                    {log.actorEmail}
                  </span>
                )}
                {log.ipAddress && (
                  <span>{log.ipAddress}</span>
                )}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {(log.previousState || log.newState) && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => openDiffModal(log)}
              >
                <GitCompare className="h-4 w-4" />
              </Button>
            )}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setExpandedLog(isExpanded ? null : log.id)}
            >
              {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
            </Button>
          </div>
        </div>

        {isExpanded && (
          <div className="mt-4 pt-4 border-t border-slate-700/50 space-y-3">
            {log.justification && (
              <div>
                <p className="text-xs text-slate-500 uppercase tracking-wide mb-1">Justification</p>
                <p className="text-sm text-amber-400 bg-amber-500/10 p-3 rounded-lg border border-amber-500/20">
                  {log.justification}
                </p>
              </div>
            )}
            {log.metadata && (
              <div>
                <p className="text-xs text-slate-500 uppercase tracking-wide mb-1">Metadata</p>
                <pre className="text-xs text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-900 p-3 rounded-lg overflow-x-auto">
                  {JSON.stringify(log.metadata, null, 2)}
                </pre>
              </div>
            )}
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-xs text-slate-500 uppercase tracking-wide mb-1">Actor ID</p>
                <p className="text-slate-900 dark:text-white font-mono">{log.actorId}</p>
              </div>
              <div>
                <p className="text-xs text-slate-500 uppercase tracking-wide mb-1">Entity ID</p>
                <p className="text-slate-900 dark:text-white font-mono">{log.entityId}</p>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Audit Intelligence</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">Immutable, append-only record of all system activities</p>
        </div>
        <div className="flex items-center gap-2">
          <PermissionGate permission={AdminPermission.AUDIT_EXPORT}>
            <Button variant="secondary" onClick={() => setShowExportModal(true)}>
              <Download className="h-4 w-4 mr-2" />
              Export
            </Button>
          </PermissionGate>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <Card>
          <CardContent className="pt-4">
            <p className="text-sm text-slate-500 dark:text-slate-400">Total Events</p>
            <p className="text-2xl font-bold text-slate-900 dark:text-white">{mockLogs.length}</p>
          </CardContent>
        </Card>
        <Card className="border-amber-500/30">
          <CardContent className="pt-4">
            <p className="text-sm text-slate-500 dark:text-slate-400">Overrides</p>
            <p className="text-2xl font-bold text-amber-500 dark:text-amber-400">
              {mockLogs.filter(l => l.justification).length}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <p className="text-sm text-slate-500 dark:text-slate-400">Admin Actions</p>
            <p className="text-2xl font-bold text-purple-500 dark:text-purple-400">
              {mockLogs.filter(l => l.actorType === 'ADMIN').length}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <p className="text-sm text-slate-500 dark:text-slate-400">System Events</p>
            <p className="text-2xl font-bold text-blue-500 dark:text-blue-400">
              {mockLogs.filter(l => l.actorType === 'SYSTEM' || l.actorType === 'SERVICE').length}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <p className="text-sm text-slate-500 dark:text-slate-400">Rule Changes</p>
            <p className="text-2xl font-bold text-red-500 dark:text-red-400">
              {mockLogs.filter(l => l.eventType === 'RULE').length}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-4">
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex-1 min-w-[200px]">
              <SearchInput
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search logs, actors, entities, justifications..."
              />
            </div>
            <Select
              value={eventTypeFilter}
              onChange={(e) => setEventTypeFilter(e.target.value)}
              options={[
                { value: 'all', label: 'All Events' },
                { value: 'AUTH', label: 'Authentication' },
                { value: 'DOCUMENT', label: 'Documents' },
                { value: 'COMPLIANCE', label: 'Compliance' },
                { value: 'ORGANIZATION', label: 'Organizations' },
                { value: 'RULE', label: 'Rules' },
              ]}
            />
            <Select
              value={actorTypeFilter}
              onChange={(e) => setActorTypeFilter(e.target.value)}
              options={[
                { value: 'all', label: 'All Actors' },
                { value: 'ADMIN', label: 'Admin Users' },
                { value: 'USER', label: 'Public Users' },
                { value: 'SYSTEM', label: 'System' },
                { value: 'SERVICE', label: 'Services' },
              ]}
            />
            <Select
              value={dateRange}
              onChange={(e) => setDateRange(e.target.value)}
              options={[
                { value: '1d', label: 'Last 24 hours' },
                { value: '7d', label: 'Last 7 days' },
                { value: '30d', label: 'Last 30 days' },
                { value: '90d', label: 'Last 90 days' },
              ]}
            />
          </div>
        </CardContent>
      </Card>

      {/* Tabs */}
      <div className="border-b border-slate-700/50">
        <nav className="flex gap-1">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${activeTab === tab.id
                ? 'border-amber-500 text-amber-400'
                : 'border-transparent text-slate-400 hover:text-white'
                }`}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Timeline View */}
      {activeTab === 'timeline' && (
        <div className="space-y-4">
          {/* Timeline Replay Controls */}
          <Card>
            <CardContent className="py-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <span className="text-sm text-slate-400">Timeline Replay</span>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setReplayIndex(0)}
                      disabled={replayIndex === 0}
                    >
                      <SkipBack className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setReplayIndex(Math.max(0, replayIndex - 1))}
                      disabled={replayIndex === 0}
                    >
                      <Rewind className="h-4 w-4" />
                    </Button>
                    <Button
                      variant={isPlaying ? 'secondary' : 'primary'}
                      size="sm"
                      onClick={() => setIsPlaying(!isPlaying)}
                    >
                      {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setReplayIndex(Math.min(filteredLogs.length - 1, replayIndex + 1))}
                      disabled={replayIndex >= filteredLogs.length - 1}
                    >
                      <FastForward className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setReplayIndex(filteredLogs.length - 1)}
                      disabled={replayIndex >= filteredLogs.length - 1}
                    >
                      <SkipForward className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <span className="text-sm text-slate-400">
                    Event {replayIndex + 1} of {filteredLogs.length}
                  </span>
                  <Select
                    value={replaySpeed.toString()}
                    onChange={(e) => setReplaySpeed(Number(e.target.value))}
                    options={[
                      { value: '0.5', label: '0.5x' },
                      { value: '1', label: '1x' },
                      { value: '2', label: '2x' },
                      { value: '4', label: '4x' },
                    ]}
                  />
                </div>
              </div>
              {/* Progress bar */}
              <div className="mt-3 h-1 bg-slate-700 rounded-full overflow-hidden">
                <div
                  className="h-full bg-amber-500 transition-all duration-300"
                  style={{ width: `${((replayIndex + 1) / filteredLogs.length) * 100}%` }}
                />
              </div>
            </CardContent>
          </Card>

          {/* Timeline */}
          <div className="relative">
            <div className="absolute left-6 top-0 bottom-0 w-px bg-slate-700" />
            <div className="space-y-4">
              {filteredLogs.map((log, index) => (
                <div key={log.id} className="relative pl-14">
                  <div className={`absolute left-4 h-4 w-4 rounded-full ring-4 ring-slate-800 ${index <= replayIndex ? 'bg-amber-500' : 'bg-slate-600'
                    }`} />
                  {renderLogCard(log, true, index === replayIndex && isPlaying)}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Entity-Centric View */}
      {activeTab === 'entity' && (
        <div className="grid grid-cols-3 gap-6">
          {/* Entity List */}
          <Card className="col-span-1">
            <CardHeader>
              <CardTitle>Entities</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="divide-y divide-slate-700/50">
                {Object.entries(logsByEntity).map(([key, logs]) => {
                  const [type, id] = key.split(':');
                  const entityName = logs[0]?.entityName || id;
                  const isSelected = selectedEntityId === key;

                  return (
                    <button
                      key={key}
                      onClick={() => setSelectedEntityId(isSelected ? null : key)}
                      className={`w-full p-4 text-left transition-colors ${isSelected ? 'bg-amber-500/10' : 'hover:bg-slate-700/30'
                        }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-lg ${getEventColor(type)}`}>
                          {getEntityIcon(type)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-slate-900 dark:text-white font-medium truncate">{entityName}</p>
                          <p className="text-xs text-slate-500">{type} • {logs.length} events</p>
                        </div>
                        <ChevronRight className={`h-4 w-4 text-slate-500 transition-transform ${isSelected ? 'rotate-90' : ''
                          }`} />
                      </div>
                    </button>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          {/* Entity Events */}
          <Card className="col-span-2">
            <CardHeader>
              <CardTitle>
                {selectedEntityId
                  ? `Events for ${logsByEntity[selectedEntityId]?.[0]?.entityName || selectedEntityId.split(':')[1]}`
                  : 'Select an entity'
                }
              </CardTitle>
            </CardHeader>
            <CardContent>
              {selectedEntityId ? (
                <div className="space-y-3">
                  {logsByEntity[selectedEntityId]?.map(log => renderLogCard(log, false))}
                </div>
              ) : (
                <div className="text-center py-12">
                  <FileText className="h-12 w-12 text-slate-600 mx-auto mb-3" />
                  <p className="text-slate-400">Select an entity to view its audit trail</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* Actor View */}
      {activeTab === 'actor' && (
        <div className="grid grid-cols-3 gap-6">
          {/* Actor List */}
          <Card className="col-span-1">
            <CardHeader>
              <CardTitle>Actors</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="divide-y divide-slate-700/50">
                {Object.entries(logsByActor).map(([actorId, logs]) => {
                  const actorEmail = logs[0]?.actorEmail || actorId;
                  const actorType = logs[0]?.actorType;
                  const isSelected = selectedActorId === actorId;

                  return (
                    <button
                      key={actorId}
                      onClick={() => setSelectedActorId(isSelected ? null : actorId)}
                      className={`w-full p-4 text-left transition-colors ${isSelected ? 'bg-amber-500/10' : 'hover:bg-slate-700/30'
                        }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className="p-2 rounded-lg bg-slate-700/50">
                          {getActorIcon(actorType || 'USER')}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-slate-900 dark:text-white font-medium truncate">{actorEmail}</p>
                          <p className="text-xs text-slate-500">{actorType} • {logs.length} actions</p>
                        </div>
                        <ChevronRight className={`h-4 w-4 text-slate-500 transition-transform ${isSelected ? 'rotate-90' : ''
                          }`} />
                      </div>
                    </button>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          {/* Actor Events */}
          <Card className="col-span-2">
            <CardHeader>
              <CardTitle>
                {selectedActorId
                  ? `Actions by ${logsByActor[selectedActorId]?.[0]?.actorEmail || selectedActorId}`
                  : 'Select an actor'
                }
              </CardTitle>
            </CardHeader>
            <CardContent>
              {selectedActorId ? (
                <div className="space-y-3">
                  {logsByActor[selectedActorId]?.map(log => renderLogCard(log))}
                </div>
              ) : (
                <div className="text-center py-12">
                  <User className="h-12 w-12 text-slate-600 mx-auto mb-3" />
                  <p className="text-slate-400">Select an actor to view their actions</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* Change Diffs View */}
      {activeTab === 'diffs' && (
        <div className="space-y-4">
          <p className="text-sm text-slate-400">
            Showing {logsWithChanges.length} events with state changes
          </p>
          {logsWithChanges.map(log => (
            <Card key={log.id}>
              <CardContent className="pt-4">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-lg ${getEventColor(log.eventType)}`}>
                      {getActorIcon(log.actorType)}
                    </div>
                    <div>
                      <p className="text-white font-medium">{log.action.replace(/_/g, ' ')}</p>
                      <p className="text-sm text-slate-400">{log.entityName} • {new Date(log.timestamp).toLocaleString()}</p>
                    </div>
                  </div>
                  {log.actorEmail && (
                    <span className="text-sm text-slate-500">{log.actorEmail}</span>
                  )}
                </div>
                <div className="bg-slate-900 rounded-lg p-4 border border-slate-700/50">
                  {renderDiff(log.previousState, log.newState)}
                </div>
                {log.justification && (
                  <div className="mt-4 p-3 bg-amber-500/10 rounded-lg border border-amber-500/20">
                    <p className="text-xs text-amber-500 uppercase tracking-wide mb-1">Justification</p>
                    <p className="text-sm text-amber-400">{log.justification}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Diff Modal */}
      <Modal
        isOpen={showDiffModal}
        onClose={() => setShowDiffModal(false)}
        title="State Change Diff"
        description={diffLog ? `${diffLog.action.replace(/_/g, ' ')} - ${diffLog.entityName}` : ''}
      >
        {diffLog && (
          <div className="space-y-4">
            <div className="bg-slate-900 rounded-lg p-4 border border-slate-700/50">
              {renderDiff(diffLog.previousState, diffLog.newState)}
            </div>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-xs text-slate-500 uppercase tracking-wide mb-1">Actor</p>
                <p className="text-white">{diffLog.actorEmail || diffLog.actorId}</p>
              </div>
              <div>
                <p className="text-xs text-slate-500 uppercase tracking-wide mb-1">Timestamp</p>
                <p className="text-white">{new Date(diffLog.timestamp).toLocaleString()}</p>
              </div>
            </div>
            {diffLog.justification && (
              <div className="p-3 bg-amber-500/10 rounded-lg border border-amber-500/20">
                <p className="text-xs text-amber-500 uppercase tracking-wide mb-1">Justification</p>
                <p className="text-sm text-amber-400">{diffLog.justification}</p>
              </div>
            )}
          </div>
        )}
      </Modal>

      {/* Export Modal */}
      <Modal
        isOpen={showExportModal}
        onClose={() => setShowExportModal(false)}
        title="Export Audit Logs"
        description="Download audit logs in your preferred format"
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">Format</label>
            <Select
              value="csv"
              onChange={() => { }}
              options={[
                { value: 'csv', label: 'CSV' },
                { value: 'json', label: 'JSON' },
                { value: 'pdf', label: 'PDF Report' },
              ]}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">Date Range</label>
            <Select
              value={dateRange}
              onChange={(e) => setDateRange(e.target.value)}
              options={[
                { value: '1d', label: 'Last 24 hours' },
                { value: '7d', label: 'Last 7 days' },
                { value: '30d', label: 'Last 30 days' },
                { value: '90d', label: 'Last 90 days' },
                { value: 'all', label: 'All time' },
              ]}
            />
          </div>
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="include-metadata"
              className="h-4 w-4 rounded border-slate-600 bg-slate-700 text-amber-500"
              defaultChecked
            />
            <label htmlFor="include-metadata" className="text-sm text-slate-300">
              Include metadata and state diffs
            </label>
          </div>
          <div className="flex justify-end gap-3 pt-4">
            <Button variant="secondary" onClick={() => setShowExportModal(false)}>Cancel</Button>
            <Button variant="primary">
              <Download className="h-4 w-4 mr-2" />
              Export
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
