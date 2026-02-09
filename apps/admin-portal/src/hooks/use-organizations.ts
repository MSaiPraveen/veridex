/**
 * Organizations API Hooks
 * 
 * React hooks for interacting with the organizations API.
 */

'use client';

import { useState, useCallback, useEffect } from 'react';
import { adminApi, ApiResponse, PaginatedResponse } from '../lib/api-client';

// ===================
// Types
// ===================

export type OrgStatus = 'PENDING' | 'ACTIVE' | 'SUSPENDED' | 'REJECTED';
export type OrgType = 'MERCHANT' | 'LAB' | 'CERTIFIER' | 'DISTRIBUTOR';

export interface Organization {
  _id: string;
  name: string;
  type: OrgType;
  status: OrgStatus;
  legalName?: string;
  taxId?: string;
  ein?: string;
  email: string;
  phone?: string;
  address?: {
    street?: string;
    city?: string;
    state?: string;
    postalCode?: string;
    zip?: string;
    country?: string;
  };
  website?: string;
  licenseNumber?: string;
  licenseExpiry?: string;
  jurisdiction?: string;
  description?: string;
  riskLevel?: 'LOW' | 'MEDIUM' | 'HIGH';
  complianceScore?: number;
  totalProducts?: number;
  totalDocuments?: number;
  pendingDocuments?: number;
  lastReviewAt?: string;
  createdAt: string;
  updatedAt: string;
  approvedAt?: string;
  approvedBy?: string;
  suspendedAt?: string;
  suspendedBy?: string;
  suspensionReason?: string;
  metadata: Record<string, unknown>;
}

export interface OrgFilters {
  status?: OrgStatus;
  type?: OrgType;
  search?: string;
  page?: number;
  limit?: number;
  sortBy?: 'name' | 'createdAt' | 'complianceScore' | 'status';
  sortOrder?: 'asc' | 'desc';
}

export interface OrgDecision {
  action: 'APPROVE' | 'REJECT' | 'SUSPEND' | 'REACTIVATE';
  reasonCode: string;
  reasonDetails: string;
  conditions?: string[];
}

// ===================
// Hooks
// ===================

/**
 * Hook for fetching organizations
 */
export function useOrganizations(initialFilters?: OrgFilters) {
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [pagination, setPagination] = useState({
    total: 0,
    page: 1,
    limit: 20,
    totalPages: 0,
    hasMore: false,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState<OrgFilters>(initialFilters || {});

  const fetchOrganizations = useCallback(async (newFilters?: OrgFilters) => {
    setLoading(true);
    setError(null);
    
    const params = { ...filters, ...newFilters };
    if (newFilters) setFilters(params);
    
    const response = await adminApi.get<PaginatedResponse<Organization>>(
      '/admin/organizations',
      params as Record<string, string | number | boolean | undefined>
    );
    
    if (response.success && response.data) {
      setOrganizations(response.data.items);
      setPagination({
        total: response.data.total,
        page: response.data.page,
        limit: response.data.limit,
        totalPages: response.data.totalPages,
        hasMore: response.data.hasMore,
      });
    } else {
      setError(response.error?.message || 'Failed to fetch organizations');
    }
    
    setLoading(false);
  }, [filters]);

  const changePage = useCallback((page: number) => {
    fetchOrganizations({ ...filters, page });
  }, [filters, fetchOrganizations]);

  return {
    organizations,
    pagination,
    loading,
    error,
    filters,
    fetchOrganizations,
    setFilters,
    changePage,
    refresh: () => fetchOrganizations(filters),
  };
}

/**
 * Hook for fetching a single organization
 */
export function useOrganization(id: string | null) {
  const [organization, setOrganization] = useState<Organization | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchOrganization = useCallback(async () => {
    if (!id) return;
    
    setLoading(true);
    setError(null);
    
    const response = await adminApi.get<Organization>(`/admin/organizations/${id}`);
    
    if (response.success && response.data) {
      setOrganization(response.data);
    } else {
      setError(response.error?.message || 'Failed to fetch organization');
    }
    
    setLoading(false);
  }, [id]);

  useEffect(() => {
    if (id) fetchOrganization();
  }, [id, fetchOrganization]);

  return { organization, loading, error, refresh: fetchOrganization };
}

/**
 * Hook for organization actions
 */
export function useOrganizationActions() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submitDecision = useCallback(async (
    orgId: string,
    decision: OrgDecision
  ): Promise<ApiResponse<Organization>> => {
    setLoading(true);
    setError(null);
    
    const endpoint = `/admin/organizations/${orgId}/${decision.action.toLowerCase()}`;
    const response = await adminApi.post<Organization>(endpoint, {
      reasonCode: decision.reasonCode,
      reasonDetails: decision.reasonDetails,
      conditions: decision.conditions,
    });
    
    if (!response.success) {
      setError(response.error?.message || 'Failed to submit decision');
    }
    
    setLoading(false);
    return response;
  }, []);

  const approveOrganization = useCallback(async (
    orgId: string,
    reasonCode: string,
    reasonDetails: string
  ): Promise<ApiResponse<Organization>> => {
    return submitDecision(orgId, { action: 'APPROVE', reasonCode, reasonDetails });
  }, [submitDecision]);

  const rejectOrganization = useCallback(async (
    orgId: string,
    reasonCode: string,
    reasonDetails: string
  ): Promise<ApiResponse<Organization>> => {
    return submitDecision(orgId, { action: 'REJECT', reasonCode, reasonDetails });
  }, [submitDecision]);

  const suspendOrganization = useCallback(async (
    orgId: string,
    reasonCode: string,
    reasonDetails: string
  ): Promise<ApiResponse<Organization>> => {
    return submitDecision(orgId, { action: 'SUSPEND', reasonCode, reasonDetails });
  }, [submitDecision]);

  const reactivateOrganization = useCallback(async (
    orgId: string,
    reasonCode: string,
    reasonDetails: string
  ): Promise<ApiResponse<Organization>> => {
    return submitDecision(orgId, { action: 'REACTIVATE', reasonCode, reasonDetails });
  }, [submitDecision]);

  return {
    loading,
    error,
    submitDecision,
    approveOrganization,
    rejectOrganization,
    suspendOrganization,
    reactivateOrganization,
  };
}

/**
 * Hook for pending organizations count
 */
export function usePendingOrganizationsCount() {
  const [count, setCount] = useState(0);
  const [loading, setLoading] = useState(false);

  const fetchCount = useCallback(async () => {
    setLoading(true);
    
    const response = await adminApi.get<{ count: number }>('/admin/organizations/pending/count');
    
    if (response.success && response.data) {
      setCount(response.data.count);
    }
    
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchCount();
  }, [fetchCount]);

  return { count, loading, refresh: fetchCount };
}
