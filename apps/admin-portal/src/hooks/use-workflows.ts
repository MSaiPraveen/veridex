/**
 * Workflow API Hooks
 * 
 * React hooks for interacting with the compliance workflow API.
 */

'use client';

import { useState, useCallback, useEffect } from 'react';
import { adminApi, ApiResponse, PaginatedResponse } from '../lib/api-client';

// ===================
// Types
// ===================

export type WorkflowState =
  | 'PENDING'
  | 'AUTO_CHECK'
  | 'AUTO_APPROVED'
  | 'AUTO_FAILED'
  | 'NEEDS_REVIEW'
  | 'IN_REVIEW'
  | 'APPROVED'
  | 'REJECTED'
  | 'OVERRIDE_APPROVED';

export type WorkflowPriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
export type SLAStatus = 'ON_TRACK' | 'AT_RISK' | 'BREACHED';
export type EntityType = 'DOCUMENT' | 'PRODUCT' | 'BATCH' | 'ORGANIZATION';

export interface RuleResult {
  ruleId: string;
  ruleCode: string;
  ruleName: string;
  passed: boolean;
  severity: 'CRITICAL' | 'MAJOR' | 'MINOR' | 'INFO';
  message: string;
  details?: Record<string, unknown>;
}

export interface AutoCheckResult {
  passed: boolean;
  score: number;
  evaluatedAt: string;
  ruleVersion: number;
  ruleResults: RuleResult[];
  failedCritical: number;
  failedMajor: number;
  failedMinor: number;
  summary: string;
}

export interface AdminDecision {
  adminId: string;
  adminEmail: string;
  adminRole: string;
  action: 'APPROVE' | 'REJECT' | 'OVERRIDE' | 'REQUEST_INFO' | 'ESCALATE' | 'ASSIGN';
  reasonCode: string;
  reasonDetails: string;
  notes?: string;
  conditions?: string[];
  previousState: WorkflowState;
  newState: WorkflowState;
  timestamp: string;
}

export interface StateTransition {
  fromState: WorkflowState;
  toState: WorkflowState;
  event: string;
  triggeredBy: 'SYSTEM' | 'ADMIN';
  triggeredById?: string;
  timestamp: string;
}

export interface WorkflowItem {
  _id: string;
  entityType: EntityType;
  entityId: string;
  entityName: string;
  organizationId: string;
  state: WorkflowState;
  previousState?: WorkflowState;
  autoCheckResult?: AutoCheckResult;
  lastAutoCheckAt?: string;
  autoCheckCount: number;
  assignedTo?: string;
  assignedAt?: string;
  assignedBy?: string;
  decisions: AdminDecision[];
  finalDecision?: {
    action: 'APPROVED' | 'REJECTED' | 'OVERRIDE_APPROVED';
    reasonCode: string;
    reasonDetails: string;
    decidedBy: string;
    decidedAt: string;
  };
  priority: WorkflowPriority;
  priorityReason?: string;
  dueDate?: string;
  slaStatus: SLAStatus;
  submittedAt: string;
  startedReviewAt?: string;
  completedAt?: string;
  isEscalated: boolean;
  escalatedAt?: string;
  escalationReason?: string;
  lockedBy?: string;
  lockedAt?: string;
  lockExpiry?: string;
  metadata: Record<string, unknown>;
  tags: string[];
  createdAt: string;
  updatedAt: string;
}

export interface QueueStats {
  totalPending: number;
  needsReview: number;
  inReview: number;
  autoApproved: number;
  manuallyApproved: number;
  rejected: number;
  overrideApproved: number;
  byPriority: Record<WorkflowPriority, number>;
  bySLAStatus: Record<SLAStatus, number>;
  avgResolutionTime: number;
  escalated: number;
}

export interface ReviewerWorkload {
  adminId: string;
  assigned: number;
  completed24h: number;
  avgDecisionTime: number;
}

export interface DecisionReasonCodes {
  APPROVE: Array<{ code: string; label: string }>;
  REJECT: Array<{ code: string; label: string }>;
  OVERRIDE: Array<{ code: string; label: string }>;
  REQUEST_INFO: Array<{ code: string; label: string }>;
  ESCALATE: Array<{ code: string; label: string }>;
}

export interface WorkflowFilters {
  state?: string;
  entityType?: EntityType;
  organizationId?: string;
  assignedTo?: string;
  priority?: string;
  slaStatus?: string;
  isEscalated?: boolean;
  unassignedOnly?: boolean;
  needsReviewOnly?: boolean;
  hasCriticalFailures?: boolean;
  page?: number;
  limit?: number;
  sortBy?: 'submittedAt' | 'priority' | 'dueDate' | 'state' | 'updatedAt';
  sortOrder?: 'asc' | 'desc';
}

export interface DecisionInput {
  action: 'APPROVE' | 'REJECT' | 'OVERRIDE' | 'REQUEST_INFO' | 'ESCALATE';
  reasonCode: string;
  reasonDetails: string;
  notes?: string;
  conditions?: string[];
}

// ===================
// Hooks
// ===================

/**
 * Hook for fetching workflow list
 */
export function useWorkflows(initialFilters?: WorkflowFilters) {
  const [workflows, setWorkflows] = useState<WorkflowItem[]>([]);
  const [pagination, setPagination] = useState({
    total: 0,
    page: 1,
    limit: 20,
    totalPages: 0,
    hasMore: false,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState<WorkflowFilters>(initialFilters || {});

  const fetchWorkflows = useCallback(async (newFilters?: WorkflowFilters) => {
    setLoading(true);
    setError(null);
    
    const params = { ...filters, ...newFilters };
    if (newFilters) setFilters(params);
    
    const response = await adminApi.get<PaginatedResponse<WorkflowItem>>(
      '/admin/workflows',
      params as Record<string, string | number | boolean | undefined>
    );
    
    if (response.success && response.data) {
      setWorkflows(response.data.items);
      setPagination({
        total: response.data.total,
        page: response.data.page,
        limit: response.data.limit,
        totalPages: response.data.totalPages,
        hasMore: response.data.hasMore,
      });
    } else {
      setError(response.error?.message || 'Failed to fetch workflows');
    }
    
    setLoading(false);
  }, [filters]);

  const changePage = useCallback((page: number) => {
    fetchWorkflows({ ...filters, page });
  }, [filters, fetchWorkflows]);

  return {
    workflows,
    pagination,
    loading,
    error,
    filters,
    fetchWorkflows,
    setFilters,
    changePage,
    refresh: () => fetchWorkflows(filters),
  };
}

/**
 * Hook for fetching a single workflow
 */
export function useWorkflow(id: string | null) {
  const [workflow, setWorkflow] = useState<WorkflowItem | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchWorkflow = useCallback(async () => {
    if (!id) return;
    
    setLoading(true);
    setError(null);
    
    const response = await adminApi.get<WorkflowItem>(`/admin/workflows/${id}`);
    
    if (response.success && response.data) {
      setWorkflow(response.data);
    } else {
      setError(response.error?.message || 'Failed to fetch workflow');
    }
    
    setLoading(false);
  }, [id]);

  useEffect(() => {
    if (id) fetchWorkflow();
  }, [id, fetchWorkflow]);

  return { workflow, loading, error, refresh: fetchWorkflow };
}

/**
 * Hook for the review queue
 */
export function useReviewQueue(assignedTo?: string) {
  const [queue, setQueue] = useState<WorkflowItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchQueue = useCallback(async () => {
    setLoading(true);
    setError(null);
    
    const params: Record<string, string | number | undefined> = { limit: 50 };
    if (assignedTo) params.assignedTo = assignedTo;
    
    const response = await adminApi.get<WorkflowItem[]>('/admin/workflows/queue', params);
    
    if (response.success && response.data) {
      setQueue(response.data);
    } else {
      setError(response.error?.message || 'Failed to fetch queue');
    }
    
    setLoading(false);
  }, [assignedTo]);

  useEffect(() => {
    fetchQueue();
  }, [fetchQueue]);

  return { queue, loading, error, refresh: fetchQueue };
}

/**
 * Hook for queue statistics
 */
export function useQueueStats(organizationId?: string) {
  const [stats, setStats] = useState<QueueStats | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchStats = useCallback(async () => {
    setLoading(true);
    setError(null);
    
    const params = organizationId ? { organizationId } : undefined;
    const response = await adminApi.get<QueueStats>('/admin/workflows/stats', params);
    
    if (response.success && response.data) {
      setStats(response.data);
    } else {
      setError(response.error?.message || 'Failed to fetch stats');
    }
    
    setLoading(false);
  }, [organizationId]);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  return { stats, loading, error, refresh: fetchStats };
}

/**
 * Hook for reason codes
 */
export function useReasonCodes() {
  const [reasonCodes, setReasonCodes] = useState<DecisionReasonCodes | null>(null);
  const [loading, setLoading] = useState(false);

  const fetchReasonCodes = useCallback(async () => {
    setLoading(true);
    
    const response = await adminApi.get<DecisionReasonCodes>('/admin/workflows/reason-codes');
    
    if (response.success && response.data) {
      setReasonCodes(response.data);
    }
    
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchReasonCodes();
  }, [fetchReasonCodes]);

  return { reasonCodes, loading };
}

/**
 * Hook for workflow actions
 */
export function useWorkflowActions() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const startReview = useCallback(async (workflowId: string): Promise<ApiResponse<WorkflowItem>> => {
    setLoading(true);
    setError(null);
    
    const response = await adminApi.post<WorkflowItem>(`/admin/workflows/${workflowId}/start-review`);
    
    if (!response.success) {
      setError(response.error?.message || 'Failed to start review');
    }
    
    setLoading(false);
    return response;
  }, []);

  const submitDecision = useCallback(async (
    workflowId: string,
    decision: DecisionInput
  ): Promise<ApiResponse<WorkflowItem>> => {
    setLoading(true);
    setError(null);
    
    const response = await adminApi.post<WorkflowItem>(`/admin/workflows/${workflowId}/decision`, decision);
    
    if (!response.success) {
      setError(response.error?.message || 'Failed to submit decision');
    }
    
    setLoading(false);
    return response;
  }, []);

  const assignWorkflow = useCallback(async (
    workflowId: string,
    assignedTo: string
  ): Promise<ApiResponse<WorkflowItem>> => {
    setLoading(true);
    setError(null);
    
    const response = await adminApi.post<WorkflowItem>(`/admin/workflows/${workflowId}/assign`, { assignedTo });
    
    if (!response.success) {
      setError(response.error?.message || 'Failed to assign workflow');
    }
    
    setLoading(false);
    return response;
  }, []);

  const unassignWorkflow = useCallback(async (workflowId: string): Promise<ApiResponse<WorkflowItem>> => {
    setLoading(true);
    setError(null);
    
    const response = await adminApi.delete<WorkflowItem>(`/admin/workflows/${workflowId}/assign`);
    
    if (!response.success) {
      setError(response.error?.message || 'Failed to unassign workflow');
    }
    
    setLoading(false);
    return response;
  }, []);

  const escalateWorkflow = useCallback(async (
    workflowId: string,
    reason: string
  ): Promise<ApiResponse<WorkflowItem>> => {
    setLoading(true);
    setError(null);
    
    const response = await adminApi.post<WorkflowItem>(`/admin/workflows/${workflowId}/escalate`, { reason });
    
    if (!response.success) {
      setError(response.error?.message || 'Failed to escalate workflow');
    }
    
    setLoading(false);
    return response;
  }, []);

  const lockWorkflow = useCallback(async (workflowId: string): Promise<ApiResponse<WorkflowItem>> => {
    setLoading(true);
    setError(null);
    
    const response = await adminApi.post<WorkflowItem>(`/admin/workflows/${workflowId}/lock`);
    
    if (!response.success) {
      setError(response.error?.message || 'Failed to lock workflow');
    }
    
    setLoading(false);
    return response;
  }, []);

  const unlockWorkflow = useCallback(async (workflowId: string): Promise<ApiResponse<WorkflowItem>> => {
    setLoading(true);
    setError(null);
    
    const response = await adminApi.delete<WorkflowItem>(`/admin/workflows/${workflowId}/lock`);
    
    if (!response.success) {
      setError(response.error?.message || 'Failed to unlock workflow');
    }
    
    setLoading(false);
    return response;
  }, []);

  return {
    loading,
    error,
    startReview,
    submitDecision,
    assignWorkflow,
    unassignWorkflow,
    escalateWorkflow,
    lockWorkflow,
    unlockWorkflow,
  };
}

/**
 * Hook for workflow history
 */
export function useWorkflowHistory(workflowId: string | null) {
  const [history, setHistory] = useState<{
    stateHistory: StateTransition[];
    decisions: AdminDecision[];
  } | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchHistory = useCallback(async () => {
    if (!workflowId) return;
    
    setLoading(true);
    setError(null);
    
    const response = await adminApi.get<{
      stateHistory: StateTransition[];
      decisions: AdminDecision[];
    }>(`/admin/workflows/${workflowId}/history`);
    
    if (response.success && response.data) {
      setHistory(response.data);
    } else {
      setError(response.error?.message || 'Failed to fetch history');
    }
    
    setLoading(false);
  }, [workflowId]);

  useEffect(() => {
    if (workflowId) fetchHistory();
  }, [workflowId, fetchHistory]);

  return { history, loading, error, refresh: fetchHistory };
}
