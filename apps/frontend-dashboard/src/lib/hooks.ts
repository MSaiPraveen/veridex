'use client';

import { useState, useEffect, useCallback } from 'react';
import { api, PaginatedResponse, ApiResponse, ApiRequestError } from './api';

// ============================================
// Types
// ============================================

export interface Product {
  _id: string;
  id?: string; // Alias for _id (returned by public API)
  name: string;
  sku?: string;
  description?: string;
  category: string;
  organizationId?: string;
  merchantId?: string;
  scope?: 'GLOBAL' | 'ORGANIZATION';
  sourceProductId?: string; // For imported products, reference to original global product
  status?: 'DRAFT' | 'PENDING_REVIEW' | 'APPROVED' | 'REJECTED' | 'ARCHIVED';
  complianceStatus?: 'COMPLIANT' | 'NON_COMPLIANT' | 'PENDING' | 'EXPIRED' | 'REQUIRES_REVIEW';
  metadata?: Record<string, unknown>;
  // Pricing & Inventory
  price?: number;
  currency?: string;
  quantity?: number;
  unit?: string;
  brand?: string;
  images?: string[];
  // Additional fields
  originCountry?: string;
  commodityType?: string;
  // Cannabis/CBD fields
  thcContent?: number;
  cbdContent?: number;
  strainType?: string;
  // Batch tracking
  batchNumber?: string;
  lotNumber?: string;
  harvestDate?: string;
  expirationDate?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateProductInput {
  name: string;
  sku: string;
  description?: string;
  category: string;
  organizationId?: string; // Optional - backend derives from user context if not provided
  price: number;
  quantity?: number;
  thcContent?: number;
  cbdContent?: number;
  strainType?: string;
  batchNumber?: string;
  harvestDate?: string;
  expirationDate?: string;
}

export interface UpdateProductInput extends Partial<CreateProductInput> {
  status?: Product['status'];
  complianceStatus?: Product['complianceStatus'];
}

export interface Organization {
  _id: string;
  name: string;
  type: 'MANUFACTURER' | 'DISTRIBUTOR' | 'RETAILER' | 'IMPORTER' | 'EXPORTER' | 'LABORATORY';
  status: 'ACTIVE' | 'PENDING' | 'SUSPENDED';
  contactEmail: string;
  phone?: string;
  address?: {
    street?: string;
    city?: string;
    state?: string;
    zipCode?: string;
    country?: string;
  };
  createdAt: string;
  updatedAt: string;
}

export interface CreateOrganizationInput {
  name: string;
  type: Organization['type'];
  contactEmail: string;
  phone?: string;
  address?: Organization['address'];
}

export interface Document {
  _id: string;
  name: string;
  type: 'LAB_REPORT' | 'LICENSE' | 'INSURANCE' | 'CERTIFICATE' | 'INVOICE' | 'COA' | 'OTHER';
  productId?: string;
  batchId?: string;
  organizationId: string;
  status: 'PENDING' | 'PROCESSING' | 'SUCCESS' | 'FAILED' | 'EXPIRED';
  extractionStatus?: 'PENDING' | 'PROCESSING' | 'SUCCESS' | 'FAILED';
  fileUrl?: string;
  url?: string; // Alias for fileUrl
  fileName: string;
  fileSize: number;
  mimeType: string;
  format?: string; // File format extension
  uploadedBy?: string;
  uploadedAt?: string;
  extractedData?: Record<string, unknown>;
  expiryDate?: string; // Human-readable expiry date
  expiresAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ComplianceRule {
  _id: string;
  ruleId: string;
  name: string;
  description: string;
  category: 'CANNABIS' | 'HEMP_CBD' | 'SUPPLEMENT' | 'PHARMA' | 'PEPTIDE';
  severity: 'BLOCKER' | 'WARNING';
  status: 'ACTIVE' | 'INACTIVE' | 'DRAFT';
  version: number;
  condition: Record<string, unknown>;
  failure: {
    status: string;
    reasonCode: string;
    message: string;
  };
  metadata?: {
    jurisdiction?: string;
    source?: string;
  };
  createdAt: string;
  updatedAt: string;
}

export interface CreateRuleInput {
  ruleId: string;
  name: string;
  description: string;
  category: ComplianceRule['category'];
  severity: ComplianceRule['severity'];
  condition: Record<string, unknown>;
  failure: ComplianceRule['failure'];
  metadata?: ComplianceRule['metadata'];
}

export interface ComplianceResult {
  _id: string;
  productId: string;
  batchId?: string;
  ruleId: string;
  passed: boolean;
  status: 'COMPLIANT' | 'NON_COMPLIANT' | 'PENDING' | 'EXPIRED' | 'REQUIRES_REVIEW';
  failure?: {
    reasonCode: string;
    message: string;
  };
  evaluatedAt: string;
}

export interface AuditLog {
  _id: string;
  actorId: string;
  actorEmail?: string;
  actorRole: string;
  action: string;
  resourceType: string;
  resourceId: string;
  resourceName?: string;
  description?: string;
  details?: Record<string, unknown>;
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  success: boolean;
  timestamp: string; // When the action occurred
  changes?: {
    before?: Record<string, unknown>;
    after?: Record<string, unknown>;
  };
  createdAt: string;
}

export interface Notification {
  _id: string;
  userId: string;
  type: string;
  title: string;
  message: string;
  channel: 'IN_APP' | 'EMAIL' | 'SMS' | 'PUSH';
  status: 'PENDING' | 'SENT' | 'READ' | 'FAILED';
  createdAt: string;
}

export interface User {
  _id: string;
  email: string;
  firstName?: string;
  lastName?: string;
  role: 'CONSUMER' | 'MERCHANT' | 'ADMIN' | 'SUPER_ADMIN';
  status: 'ACTIVE' | 'INACTIVE' | 'LOCKED';
  organizationId?: string;
  createdAt: string;
}

// ============================================
// Generic Fetch Hook with Error Handling
// ============================================

interface UseFetchResult<T> {
  data: T | null;
  isLoading: boolean;
  error: string | null;
  statusCode: number | null;
  refetch: () => Promise<void>;
}

function useFetch<T>(endpoint: string | null, deps: unknown[] = []): UseFetchResult<T> {
  const [data, setData] = useState<T | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [statusCode, setStatusCode] = useState<number | null>(null);

  const fetchData = useCallback(async () => {
    if (!endpoint) return;

    setIsLoading(true);
    setError(null);
    setStatusCode(null);

    try {
      const response = await api.get<T>(endpoint);
      setData(response);
      setStatusCode(200);
    } catch (err) {
      if (err instanceof ApiRequestError) {
        setError(err.message);
        setStatusCode(err.statusCode);
        // Don't throw for 401/403 - let auth context handle
        if (err.statusCode !== 401 && err.statusCode !== 403) {
          console.error(`[API] ${endpoint} failed:`, err.message);
        }
      } else {
        setError(err instanceof Error ? err.message : 'Failed to fetch data');
        setStatusCode(0);
      }
    } finally {
      setIsLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [endpoint, ...deps]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return { data, isLoading, error, statusCode, refetch: fetchData };
}

// ============================================
// Products Hooks & Functions
// ============================================

/**
 * useProducts - For authenticated users (merchants see their org products)
 */
export function useProducts(query?: Record<string, string>) {
  const queryString = query ? '?' + new URLSearchParams(query).toString() : '';
  return useFetch<PaginatedResponse<Product>>(`/products${queryString}`, [queryString]);
}

/**
 * useMyProducts - STRICT Endpoint for Merchant's own products
 */
export function useMyProducts(query?: Record<string, string>) {
  const queryString = query ? '?' + new URLSearchParams(query).toString() : '';
  return useFetch<PaginatedResponse<Product>>(`/merchant/products${queryString}`, [queryString]);
}

/**
 * useGlobalProducts - STRICT Endpoint for Global products
 */
export function useGlobalProducts(query?: Record<string, string>) {
  const queryString = query ? '?' + new URLSearchParams(query).toString() : '';
  return useFetch<PaginatedResponse<Product>>(`/products/global${queryString}`, [queryString]);
}

export function useScopedProducts(scope: 'my' | 'global', query?: Record<string, string>) {
  const endpoint = scope === 'global' ? '/products/global' : '/merchant/products';
  const queryString = query ? '?' + new URLSearchParams(query).toString() : '';
  return useFetch<PaginatedResponse<Product>>(`${endpoint}${queryString}`, [endpoint, queryString]);
}

/**
 * usePublicProducts - For consumers (public catalog with sanitized data)
 * NO authentication required
 * Returns: productId, name, brand, category, complianceScore, complianceStatus
 * NEVER returns: documents, reports, internal flags
 */
export function usePublicProducts(query?: Record<string, string>) {
  const queryString = query ? '?' + new URLSearchParams(query).toString() : '';
  return useFetch<PaginatedResponse<Product>>(`/public/products${queryString}`, [queryString]);
}

/**
 * usePublicProduct - Get single product for consumers (sanitized)
 */
export function usePublicProduct(id: string | null) {
  return useFetch<ApiResponse<Product>>(id ? `/public/products/${id}` : null);
}

export function useProduct(id: string | null) {
  return useFetch<ApiResponse<Product>>(id ? `/products/${id}` : null);
}

export async function createProduct(data: CreateProductInput): Promise<ApiResponse<Product>> {
  return api.post<ApiResponse<Product>>('/products', data);
}

export async function updateProduct(id: string, data: UpdateProductInput): Promise<ApiResponse<Product>> {
  return api.patch<ApiResponse<Product>>(`/products/${id}`, data);
}

export async function deleteProduct(id: string): Promise<void> {
  return api.delete(`/products/${id}`);
}

// ============================================
// Organizations Hooks & Functions
// ============================================

export function useOrganizations(query?: Record<string, string>) {
  const queryString = query ? '?' + new URLSearchParams(query).toString() : '';
  return useFetch<PaginatedResponse<Organization>>(`/organizations${queryString}`, [queryString]);
}

export function useOrganization(id: string | null) {
  return useFetch<ApiResponse<Organization>>(id ? `/organizations/${id}` : null);
}

export async function createOrganization(data: CreateOrganizationInput): Promise<ApiResponse<Organization>> {
  return api.post<ApiResponse<Organization>>('/organizations', data);
}

export async function updateOrganization(id: string, data: Partial<CreateOrganizationInput>): Promise<ApiResponse<Organization>> {
  return api.patch<ApiResponse<Organization>>(`/organizations/${id}`, data);
}

export async function deleteOrganization(id: string): Promise<void> {
  return api.delete(`/organizations/${id}`);
}

// ============================================
// Documents Hooks & Functions
// ============================================

export function useDocuments(query?: Record<string, string>) {
  const queryString = query ? '?' + new URLSearchParams(query).toString() : '';
  return useFetch<PaginatedResponse<Document>>(`/documents${queryString}`, [queryString]);
}

export function useDocument(id: string | null) {
  return useFetch<ApiResponse<Document>>(id ? `/documents/${id}` : null);
}

export async function uploadDocument(
  file: File,
  metadata: {
    type: Document['type'];
    organizationId: string;
    productId?: string;
    batchId?: string;
  }
): Promise<ApiResponse<Document>> {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('type', metadata.type);
  formData.append('organizationId', metadata.organizationId);
  if (metadata.productId) formData.append('productId', metadata.productId);
  if (metadata.batchId) formData.append('batchId', metadata.batchId);

  // Use the api.upload method for proper auth header handling
  return api.upload<ApiResponse<Document>>('/documents/upload', formData);
}

export async function deleteDocument(id: string): Promise<void> {
  return api.delete(`/documents/${id}`);
}

export async function updateDocument(
  id: string,
  data: Partial<{ status: Document['status']; extractionStatus?: Document['extractionStatus'] }>
): Promise<ApiResponse<Document>> {
  return api.patch<ApiResponse<Document>>(`/documents/${id}`, data);
}

// ============================================
// Compliance Hooks & Functions
// ============================================

export function useComplianceRules(query?: Record<string, string>) {
  const queryString = query ? '?' + new URLSearchParams(query).toString() : '';
  return useFetch<PaginatedResponse<ComplianceRule>>(`/compliance/rules${queryString}`, [queryString]);
}

export function useComplianceRule(id: string | null) {
  return useFetch<ApiResponse<ComplianceRule>>(id ? `/compliance/rules/${id}` : null);
}

export async function createComplianceRule(data: CreateRuleInput): Promise<ApiResponse<ComplianceRule>> {
  return api.post<ApiResponse<ComplianceRule>>('/compliance/rules', data);
}

export async function updateComplianceRule(id: string, data: Partial<CreateRuleInput>): Promise<ApiResponse<ComplianceRule>> {
  return api.patch<ApiResponse<ComplianceRule>>(`/compliance/rules/${id}`, data);
}

export async function toggleRuleStatus(id: string, status: 'ACTIVE' | 'INACTIVE'): Promise<ApiResponse<ComplianceRule>> {
  return api.patch<ApiResponse<ComplianceRule>>(`/compliance/rules/${id}`, { status });
}

export async function deleteComplianceRule(id: string): Promise<void> {
  return api.delete(`/compliance/rules/${id}`);
}

export function useComplianceResults(productId: string | null) {
  return useFetch<PaginatedResponse<ComplianceResult>>(
    productId ? `/compliance/results?productId=${productId}` : null
  );
}

export async function runComplianceCheck(productId: string): Promise<ApiResponse<{ results: ComplianceResult[] }>> {
  return api.post<ApiResponse<{ results: ComplianceResult[] }>>(`/compliance/check/${productId}`);
}

// ============================================
// Audit Logs Hooks (Admin Only)
// ============================================

export function useAuditLogs(query?: Record<string, string>) {
  const queryString = query ? '?' + new URLSearchParams(query).toString() : '';
  // API Gateway route: /admin/audits (admin only)
  return useFetch<PaginatedResponse<AuditLog>>(`/admin/audits${queryString}`, [queryString]);
}

export function useAuditStats(days = 30) {
  // API Gateway route: /admin/audits/stats (admin only)
  return useFetch<ApiResponse<{
    total: number;
    byAction: { _id: string; count: number }[];
    byResourceType: { _id: string; count: number }[];
    bySeverity: { _id: string; count: number }[];
    successRate: number;
  }>>(`/admin/audits/stats?days=${days}`);
}

// ============================================
// Notifications Hooks
// ============================================

export function useNotifications(query?: Record<string, string>) {
  const queryString = query ? '?' + new URLSearchParams(query).toString() : '';
  return useFetch<PaginatedResponse<Notification>>(`/notifications${queryString}`, [queryString]);
}

export async function markNotificationRead(id: string): Promise<void> {
  return api.patch(`/notifications/${id}/read`, {});
}

// ============================================
// Users Hooks
// ============================================

export function useUsers(query?: Record<string, string>) {
  const queryString = query ? '?' + new URLSearchParams(query).toString() : '';
  return useFetch<PaginatedResponse<User>>(`/users${queryString}`, [queryString]);
}

export function useUser(id: string | null) {
  return useFetch<ApiResponse<User>>(id ? `/users/${id}` : null);
}

export async function updateUser(
  id: string,
  data: Partial<{ firstName: string; lastName: string; role: User['role']; status: User['status'] }>
): Promise<ApiResponse<User>> {
  return api.patch<ApiResponse<User>>(`/users/${id}`, data);
}

export async function deleteUser(id: string): Promise<void> {
  return api.delete(`/users/${id}`);
}

// ============================================
// Dashboard Stats Hook
// Role-aware: Only fetches data the current user has access to
// ============================================

interface DashboardStats {
  productsCount: number;
  documentsCount: number;
  pendingReviews: number;
  complianceScore: number;
  activeRules: number;
  organizationsCount: number;
  compliantProducts: number;
  nonCompliantProducts: number;
}

/**
 * Hook for fetching dashboard statistics
 * @param userRole - The current user's role (determines which endpoints to call)
 */
export function useDashboardStats(userRole?: string) {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchStats = async () => {
      // Don't fetch if no user role (not authenticated)
      if (!userRole) {
        setIsLoading(false);
        return;
      }

      try {
        const isAdmin = userRole === 'ADMIN' || userRole === 'SUPER_ADMIN';
        const isMerchant = userRole === 'MERCHANT';

        // Build list of promises based on role
        // This prevents 401 errors by only calling endpoints the user has access to
        const promises: Promise<unknown>[] = [];
        const promiseKeys: string[] = [];

        // Products - accessible to all authenticated users
        // STRICT Isolation: Merchants use /merchant/products, Admins use /products
        const productsEndpoint = isMerchant ? '/merchant/products' : '/products';

        promises.push(api.get<PaginatedResponse<Product>>(`${productsEndpoint}?limit=1`));
        promiseKeys.push('productsCount');

        promises.push(api.get<PaginatedResponse<Product>>(`${productsEndpoint}?limit=1000`));
        promiseKeys.push('allProducts');

        // Documents - accessible to merchants and admins
        if (isMerchant || isAdmin) {
          promises.push(api.get<PaginatedResponse<Document>>('/documents?limit=1'));
          promiseKeys.push('documents');
        }

        // Compliance rules - accessible to all
        promises.push(api.get<PaginatedResponse<ComplianceRule>>('/compliance/rules?status=ACTIVE&limit=1'));
        promiseKeys.push('rules');

        // Organizations - ADMIN ONLY
        if (isAdmin) {
          promises.push(api.get<PaginatedResponse<Organization>>('/organizations?limit=1'));
          promiseKeys.push('orgs');
        }

        const results = await Promise.allSettled(promises);

        // Map results to their keys
        const resultMap: Record<string, PaginatedResponse<unknown> | null> = {};
        results.forEach((result, index) => {
          const key = promiseKeys[index];
          resultMap[key] = result.status === 'fulfilled' ? result.value as PaginatedResponse<unknown> : null;
        });

        // Extract data
        const productsCountData = resultMap['productsCount'] as PaginatedResponse<Product> | null;
        const allProductsData = resultMap['allProducts'] as PaginatedResponse<Product> | null;
        const documentsData = resultMap['documents'] as PaginatedResponse<Document> | null;
        const rulesData = resultMap['rules'] as PaginatedResponse<ComplianceRule> | null;
        const orgsData = resultMap['orgs'] as PaginatedResponse<Organization> | null;

        // Calculate real compliance score from products
        const productsList = allProductsData?.data || [];
        const totalProducts = productsList.length;
        const compliantProducts = productsList.filter(
          (p: Product) => p.complianceStatus === 'COMPLIANT'
        ).length;
        const nonCompliantProducts = productsList.filter(
          (p: Product) => p.complianceStatus === 'NON_COMPLIANT'
        ).length;
        const pendingReviews = productsList.filter(
          (p: Product) => p.status === 'PENDING_REVIEW' || p.complianceStatus === 'REQUIRES_REVIEW' || p.complianceStatus === 'PENDING'
        ).length;

        // Compliance score = (compliant / total) * 100
        const complianceScore = totalProducts > 0
          ? Math.round((compliantProducts / totalProducts) * 100)
          : 0;

        setStats({
          productsCount: productsCountData?.total || 0,
          documentsCount: documentsData?.total || 0,
          pendingReviews,
          complianceScore,
          activeRules: rulesData?.total || 0,
          organizationsCount: orgsData?.total || 0,
          compliantProducts,
          nonCompliantProducts,
        });
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load stats');
        setStats({
          productsCount: 0,
          documentsCount: 0,
          pendingReviews: 0,
          complianceScore: 0,
          activeRules: 0,
          organizationsCount: 0,
          compliantProducts: 0,
          nonCompliantProducts: 0,
        });
      } finally {
        setIsLoading(false);
      }
    };

    fetchStats();
  }, [userRole]);

  return { stats, isLoading, error };
}
