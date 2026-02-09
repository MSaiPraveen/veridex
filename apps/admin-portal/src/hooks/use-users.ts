/**
 * Users API Hooks
 * 
 * React hooks for interacting with the users API (merchants & admin users).
 */

'use client';

import { useState, useCallback, useEffect } from 'react';
import { adminApi, ApiResponse, PaginatedResponse } from '../lib/api-client';

// ===================
// Types
// ===================

export type UserStatus = 'ACTIVE' | 'INACTIVE' | 'SUSPENDED' | 'PENDING';
export type UserRole = 'ADMIN' | 'MERCHANT' | 'CONSUMER' | 'SUPER_ADMIN';

export interface User {
  _id: string;
  authUserId: string;
  email: string;
  role: UserRole;
  firstName?: string;
  lastName?: string;
  phone?: string;
  avatarUrl?: string;
  isActive: boolean;
  status?: UserStatus;
  lastLoginAt?: string;
  createdAt: string;
  updatedAt: string;
  organizationId?: string;
  organizationName?: string;
  membershipRole?: string;
  mfaEnabled?: boolean;
  loginAttempts?: number;
  metadata?: Record<string, unknown>;
}

export interface UserFilters {
  role?: UserRole;
  status?: UserStatus;
  search?: string;
  page?: number;
  limit?: number;
  sortBy?: 'email' | 'createdAt' | 'firstName' | 'lastName' | 'role';
  sortOrder?: 'asc' | 'desc';
  isActive?: boolean;
}

export interface CreateUserInput {
  email: string;
  role: UserRole;
  firstName?: string;
  lastName?: string;
  phone?: string;
}

export interface UpdateUserInput {
  firstName?: string;
  lastName?: string;
  phone?: string;
  avatarUrl?: string;
  isActive?: boolean;
  metadata?: Record<string, unknown>;
}

// ===================
// Hooks
// ===================

/**
 * Hook for fetching users (merchants and admins)
 */
export function useUsers(initialFilters?: UserFilters) {
  const [users, setUsers] = useState<User[]>([]);
  const [pagination, setPagination] = useState({
    total: 0,
    page: 1,
    limit: 20,
    totalPages: 0,
    hasMore: false,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState<UserFilters>(initialFilters || {});

  const fetchUsers = useCallback(async (newFilters?: UserFilters) => {
    setLoading(true);
    setError(null);
    
    const params = { ...filters, ...newFilters };
    if (newFilters) setFilters(params);
    
    const response = await adminApi.get<PaginatedResponse<User>>(
      '/admin/users',
      params as Record<string, string | number | boolean | undefined>
    );
    
    if (response.success && response.data) {
      // Handle different response structures
      const data = response.data as any;
      const items = data.items || data.data || [];
      setUsers(items);
      setPagination({
        total: data.total || items.length,
        page: data.page || params.page || 1,
        limit: data.limit || params.limit || 20,
        totalPages: data.totalPages || Math.ceil((data.total || items.length) / (params.limit || 20)),
        hasMore: data.hasMore || (data.page < data.totalPages),
      });
    } else {
      setError(response.error?.message || 'Failed to fetch users');
      setUsers([]);
    }
    
    setLoading(false);
    return response;
  }, [filters]);

  // Initial fetch
  useEffect(() => {
    fetchUsers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return {
    users,
    pagination,
    loading,
    error,
    filters,
    fetchUsers,
    setFilters,
    refresh: () => fetchUsers(),
  };
}

/**
 * Hook for fetching a single user
 */
export function useUser(userId: string | null) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchUser = useCallback(async () => {
    if (!userId) return;
    
    setLoading(true);
    setError(null);
    
    const response = await adminApi.get<User>(`/admin/users/${userId}`);
    
    if (response.success && response.data) {
      setUser(response.data);
    } else {
      setError(response.error?.message || 'Failed to fetch user');
      setUser(null);
    }
    
    setLoading(false);
  }, [userId]);

  useEffect(() => {
    if (userId) {
      fetchUser();
    }
  }, [userId, fetchUser]);

  return {
    user,
    loading,
    error,
    refresh: fetchUser,
  };
}

/**
 * Hook for user management actions
 */
export function useUserActions() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const updateUserStatus = useCallback(async (
    userId: string, 
    isActive: boolean,
    reason?: string
  ): Promise<ApiResponse<User>> => {
    setLoading(true);
    setError(null);
    
    const response = await adminApi.patch<User>(`/admin/users/${userId}/status`, {
      isActive,
      reason,
      updatedAt: new Date().toISOString(),
    });
    
    if (!response.success) {
      setError(response.error?.message || 'Failed to update user status');
    }
    
    setLoading(false);
    return response;
  }, []);

  const updateUser = useCallback(async (
    userId: string, 
    data: UpdateUserInput
  ): Promise<ApiResponse<User>> => {
    setLoading(true);
    setError(null);
    
    const response = await adminApi.patch<User>(`/admin/users/${userId}`, data);
    
    if (!response.success) {
      setError(response.error?.message || 'Failed to update user');
    }
    
    setLoading(false);
    return response;
  }, []);

  const createUser = useCallback(async (
    data: CreateUserInput
  ): Promise<ApiResponse<User>> => {
    setLoading(true);
    setError(null);
    
    const response = await adminApi.post<User>('/admin/users', data);
    
    if (!response.success) {
      setError(response.error?.message || 'Failed to create user');
    }
    
    setLoading(false);
    return response;
  }, []);

  const deleteUser = useCallback(async (userId: string): Promise<ApiResponse<void>> => {
    setLoading(true);
    setError(null);
    
    const response = await adminApi.delete<void>(`/admin/users/${userId}`);
    
    if (!response.success) {
      setError(response.error?.message || 'Failed to delete user');
    }
    
    setLoading(false);
    return response;
  }, []);

  const resetMfa = useCallback(async (userId: string): Promise<ApiResponse<void>> => {
    setLoading(true);
    setError(null);
    
    const response = await adminApi.post<void>(`/admin/users/${userId}/reset-mfa`, {});
    
    if (!response.success) {
      setError(response.error?.message || 'Failed to reset MFA');
    }
    
    setLoading(false);
    return response;
  }, []);

  const unlockUser = useCallback(async (userId: string): Promise<ApiResponse<User>> => {
    setLoading(true);
    setError(null);
    
    const response = await adminApi.post<User>(`/admin/users/${userId}/unlock`, {});
    
    if (!response.success) {
      setError(response.error?.message || 'Failed to unlock user');
    }
    
    setLoading(false);
    return response;
  }, []);

  return {
    loading,
    error,
    updateUserStatus,
    updateUser,
    createUser,
    deleteUser,
    resetMfa,
    unlockUser,
  };
}
