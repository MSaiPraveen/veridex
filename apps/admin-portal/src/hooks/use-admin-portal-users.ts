/**
 * Admin Portal Users Hook
 * 
 * React hooks for managing admin portal users (admins who can log into the admin portal).
 * These are stored in the auth-service's admin_users collection, separate from platform users.
 */

'use client';

import { useState, useCallback, useEffect } from 'react';
import { adminApi } from '../lib/admin-api';

// ===================
// Types
// ===================

export type AdminUserStatus = 'ACTIVE' | 'DEACTIVATED' | 'LOCKED' | 'PENDING_MFA';
export type AdminUserRole = 'ADMIN' | 'COMPLIANCE_REVIEWER' | 'VIEWER';

export interface AdminPortalUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: AdminUserRole;
  status: AdminUserStatus;
  mfaEnabled: boolean;
  lastLoginAt?: string;
  createdAt: string;
  permissions?: string[];
}

export interface AdminUserFilters {
  status?: AdminUserStatus;
  role?: AdminUserRole;
  search?: string;
}

export interface CreateAdminInput {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  role: AdminUserRole;
}

// ===================
// Hooks
// ===================

/**
 * Hook for fetching admin portal users
 */
export function useAdminPortalUsers(initialFilters?: AdminUserFilters) {
  const [admins, setAdmins] = useState<AdminPortalUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState<AdminUserFilters>(initialFilters || {});

  const fetchAdmins = useCallback(async (newFilters?: AdminUserFilters) => {
    setLoading(true);
    setError(null);
    
    const params = { ...filters, ...newFilters };
    if (newFilters) setFilters(params);
    
    try {
      // Build query params as string record
      const queryParams: Record<string, string> = {};
      if (params.status) queryParams.status = params.status;
      if (params.role) queryParams.role = params.role;
      if (params.search) queryParams.search = params.search;
      
      const response = await adminApi.get<{ data: AdminPortalUser[]; total: number }>(
        '/admin/auth/admins',
        queryParams
      );
      
      if (response.success && response.data) {
        const data = response.data as any;
        setAdmins(data.data || []);
      } else {
        setError(response.error?.message || 'Failed to fetch admin users');
        setAdmins([]);
      }
    } catch (err) {
      console.error('Error fetching admin users:', err);
      setError('Failed to fetch admin users');
      setAdmins([]);
    } finally {
      setLoading(false);
    }
  }, [filters]);

  // Initial fetch
  useEffect(() => {
    fetchAdmins();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return {
    admins,
    loading,
    error,
    filters,
    fetchAdmins,
    setFilters,
    refresh: () => fetchAdmins(),
  };
}

/**
 * Hook for admin user actions
 */
export function useAdminUserActions() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const createAdmin = useCallback(async (input: CreateAdminInput): Promise<{ success: boolean; admin?: AdminPortalUser; error?: string }> => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await adminApi.post<{ 
        success: boolean;
        data: AdminPortalUser; 
        message: string;
      }>('/admin/auth/admins', input as unknown as Record<string, unknown>);
      
      if (response.success && response.data) {
        return { success: true, admin: response.data.data };
      } else {
        const errorMsg = response.error?.message || 'Failed to create admin user';
        setError(errorMsg);
        return { success: false, error: errorMsg };
      }
    } catch (err) {
      const errorMsg = 'An unexpected error occurred';
      setError(errorMsg);
      return { success: false, error: errorMsg };
    } finally {
      setLoading(false);
    }
  }, []);

  const updateStatus = useCallback(async (
    adminId: string, 
    status: 'ACTIVE' | 'DEACTIVATED' | 'LOCKED',
    reason?: string
  ): Promise<{ success: boolean; error?: string }> => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await adminApi.patch<{ success: boolean }>(
        `/admin/auth/admins/${adminId}/status`,
        { status, reason }
      );
      
      if (response.success) {
        return { success: true };
      } else {
        const errorMsg = response.error?.message || 'Failed to update admin status';
        setError(errorMsg);
        return { success: false, error: errorMsg };
      }
    } catch (err) {
      const errorMsg = 'An unexpected error occurred';
      setError(errorMsg);
      return { success: false, error: errorMsg };
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    createAdmin,
    updateStatus,
    loading,
    error,
  };
}
