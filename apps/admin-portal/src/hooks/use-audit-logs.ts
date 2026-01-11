/**
 * Audit Logs API Hooks
 * 
 * React hooks for interacting with the admin audit log API.
 */

'use client';

import { useState, useCallback, useEffect } from 'react';
import { adminApi, PaginatedResponse } from '../lib/api-client';

// ===================
// Types
// ===================

export type AdminAuditAction =
  | 'ADMIN_LOGIN'
  | 'ADMIN_LOGOUT'
  | 'ADMIN_LOGIN_FAILED'
  | 'ADMIN_MFA_ENABLED'
  | 'ADMIN_MFA_DISABLED'
  | 'ADMIN_PASSWORD_CHANGED'
  | 'ADMIN_CREATED'
  | 'ADMIN_UPDATED'
  | 'ADMIN_DEACTIVATED'
  | 'ADMIN_REACTIVATED'
  | 'ADMIN_ROLE_CHANGED'
  | 'ORG_VIEWED'
  | 'ORG_APPROVED'
  | 'ORG_REJECTED'
  | 'ORG_SUSPENDED'
  | 'ORG_REACTIVATED'
  | 'DOC_VIEWED'
  | 'DOC_APPROVED'
  | 'DOC_REJECTED'
  | 'COMPLIANCE_RESULT_VIEWED'
  | 'COMPLIANCE_OVERRIDE'
  | 'COMPLIANCE_ASSIGNED'
  | 'COMPLIANCE_ESCALATED'
  | 'PRODUCT_VIEWED'
  | 'PRODUCT_APPROVED'
  | 'PRODUCT_SUSPENDED'
  | 'PRODUCT_RECALLED'
  | 'BATCH_VIEWED'
  | 'BATCH_APPROVED'
  | 'BATCH_QUARANTINED'
  | 'BATCH_RECALLED'
  | 'RULE_CREATED'
  | 'RULE_UPDATED'
  | 'RULE_ACTIVATED'
  | 'RULE_DEACTIVATED'
  | 'RULE_VERSION_CREATED'
  | 'SETTINGS_VIEWED'
  | 'SETTINGS_UPDATED'
  | 'API_KEY_CREATED'
  | 'API_KEY_REVOKED'
  | 'AUDIT_LOG_EXPORTED';

export type AdminAuditSeverity = 'INFO' | 'WARNING' | 'CRITICAL' | 'SECURITY';

export type AdminAuditEntityType =
  | 'ADMIN_USER'
  | 'ORGANIZATION'
  | 'DOCUMENT'
  | 'PRODUCT'
  | 'BATCH'
  | 'COMPLIANCE_RESULT'
  | 'COMPLIANCE_RULE'
  | 'SETTINGS'
  | 'API_KEY';

export interface AuditLogEntry {
  _id: string;
  action: AdminAuditAction;
  entityType: AdminAuditEntityType;
  entityId?: string;
  entityName?: string;
  adminId: string;
  adminEmail: string;
  adminRole: string;
  previousValue?: Record<string, unknown>;
  newValue?: Record<string, unknown>;
  reasonCode?: string;
  reasonDetails?: string;
  metadata: Record<string, unknown>;
  severity: AdminAuditSeverity;
  success: boolean;
  errorMessage?: string;
  ipAddress: string;
  userAgent: string;
  sessionId?: string;
  requestId?: string;
  timestamp: string;
  createdAt: string;
}

export interface AuditLogFilters {
  action?: string;
  entityType?: AdminAuditEntityType;
  entityId?: string;
  adminId?: string;
  severity?: AdminAuditSeverity;
  success?: boolean;
  startDate?: string;
  endDate?: string;
  page?: number;
  limit?: number;
  sortBy?: 'timestamp' | 'action' | 'severity';
  sortOrder?: 'asc' | 'desc';
}

export interface AuditStats {
  totalLogs: number;
  byAction: Record<string, number>;
  bySeverity: Record<AdminAuditSeverity, number>;
  byAdmin: Array<{ adminId: string; adminEmail: string; count: number }>;
  securityAlerts: number;
  failedActions: number;
}

// ===================
// Hooks
// ===================

/**
 * Hook for fetching audit logs
 */
export function useAuditLogs(initialFilters?: AuditLogFilters) {
  const [logs, setLogs] = useState<AuditLogEntry[]>([]);
  const [pagination, setPagination] = useState({
    total: 0,
    page: 1,
    limit: 50,
    totalPages: 0,
    hasMore: false,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState<AuditLogFilters>(initialFilters || {});

  const fetchLogs = useCallback(async (newFilters?: AuditLogFilters) => {
    setLoading(true);
    setError(null);
    
    const params = { ...filters, ...newFilters };
    if (newFilters) setFilters(params);
    
    const response = await adminApi.get<PaginatedResponse<AuditLogEntry>>(
      '/admin/audit-logs',
      params as Record<string, string | number | boolean | undefined>
    );
    
    if (response.success && response.data) {
      setLogs(response.data.items);
      setPagination({
        total: response.data.total,
        page: response.data.page,
        limit: response.data.limit,
        totalPages: response.data.totalPages,
        hasMore: response.data.hasMore,
      });
    } else {
      setError(response.error?.message || 'Failed to fetch audit logs');
    }
    
    setLoading(false);
  }, [filters]);

  const changePage = useCallback((page: number) => {
    fetchLogs({ ...filters, page });
  }, [filters, fetchLogs]);

  return {
    logs,
    pagination,
    loading,
    error,
    filters,
    fetchLogs,
    setFilters,
    changePage,
    refresh: () => fetchLogs(filters),
  };
}

/**
 * Hook for fetching a single audit log entry
 */
export function useAuditLogEntry(id: string | null) {
  const [entry, setEntry] = useState<AuditLogEntry | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchEntry = useCallback(async () => {
    if (!id) return;
    
    setLoading(true);
    setError(null);
    
    const response = await adminApi.get<AuditLogEntry>(`/admin/audit-logs/${id}`);
    
    if (response.success && response.data) {
      setEntry(response.data);
    } else {
      setError(response.error?.message || 'Failed to fetch audit log entry');
    }
    
    setLoading(false);
  }, [id]);

  useEffect(() => {
    if (id) fetchEntry();
  }, [id, fetchEntry]);

  return { entry, loading, error, refresh: fetchEntry };
}

/**
 * Hook for entity timeline
 */
export function useEntityTimeline(entityType: AdminAuditEntityType | null, entityId: string | null) {
  const [timeline, setTimeline] = useState<AuditLogEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchTimeline = useCallback(async () => {
    if (!entityType || !entityId) return;
    
    setLoading(true);
    setError(null);
    
    const response = await adminApi.get<AuditLogEntry[]>(
      `/admin/audit-logs/timeline/${entityType}/${entityId}`
    );
    
    if (response.success && response.data) {
      setTimeline(response.data);
    } else {
      setError(response.error?.message || 'Failed to fetch timeline');
    }
    
    setLoading(false);
  }, [entityType, entityId]);

  useEffect(() => {
    if (entityType && entityId) fetchTimeline();
  }, [entityType, entityId, fetchTimeline]);

  return { timeline, loading, error, refresh: fetchTimeline };
}

/**
 * Hook for audit statistics
 */
export function useAuditStats(dateRange?: { startDate: string; endDate: string }) {
  const [stats, setStats] = useState<AuditStats | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchStats = useCallback(async () => {
    setLoading(true);
    setError(null);
    
    const params = dateRange ? dateRange : undefined;
    const response = await adminApi.get<AuditStats>('/admin/audit-logs/stats', params);
    
    if (response.success && response.data) {
      setStats(response.data);
    } else {
      setError(response.error?.message || 'Failed to fetch stats');
    }
    
    setLoading(false);
  }, [dateRange]);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  return { stats, loading, error, refresh: fetchStats };
}

/**
 * Hook for security alerts
 */
export function useSecurityAlerts() {
  const [alerts, setAlerts] = useState<AuditLogEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchAlerts = useCallback(async () => {
    setLoading(true);
    setError(null);
    
    const response = await adminApi.get<AuditLogEntry[]>('/admin/audit-logs/security-alerts');
    
    if (response.success && response.data) {
      setAlerts(response.data);
    } else {
      setError(response.error?.message || 'Failed to fetch security alerts');
    }
    
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchAlerts();
  }, [fetchAlerts]);

  return { alerts, loading, error, refresh: fetchAlerts };
}

/**
 * Hook for failed actions
 */
export function useFailedActions() {
  const [actions, setActions] = useState<AuditLogEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchFailedActions = useCallback(async () => {
    setLoading(true);
    setError(null);
    
    const response = await adminApi.get<AuditLogEntry[]>('/admin/audit-logs/failed-actions');
    
    if (response.success && response.data) {
      setActions(response.data);
    } else {
      setError(response.error?.message || 'Failed to fetch failed actions');
    }
    
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchFailedActions();
  }, [fetchFailedActions]);

  return { actions, loading, error, refresh: fetchFailedActions };
}

/**
 * Hook for exporting audit logs
 */
export function useAuditExport() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const exportLogs = useCallback(async (filters: AuditLogFilters): Promise<Blob | null> => {
    setLoading(true);
    setError(null);
    
    const response = await adminApi.get<{ url: string }>('/admin/audit-logs/export', 
      filters as Record<string, string | number | boolean | undefined>
    );
    
    if (response.success && response.data) {
      // In a real implementation, this would return the file blob
      // For now, we'll simulate the download
      setLoading(false);
      return null;
    } else {
      setError(response.error?.message || 'Failed to export logs');
      setLoading(false);
      return null;
    }
  }, []);

  return { exportLogs, loading, error };
}
