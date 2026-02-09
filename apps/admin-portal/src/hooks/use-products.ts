/**
 * Products API Hooks
 * 
 * React hooks for interacting with the products API.
 */

'use client';

import { useState, useCallback, useEffect } from 'react';
import { adminApi, ApiResponse, PaginatedResponse } from '../lib/api-client';

// ===================
// Types
// ===================

export type ProductStatus = 'DRAFT' | 'ACTIVE' | 'INACTIVE' | 'ARCHIVED';
export type ComplianceStatus = 'PENDING' | 'COMPLIANT' | 'NON_COMPLIANT' | 'UNDER_REVIEW';
export type ProductCategory = 
  | 'CANNABIS_FLOWER' 
  | 'CANNABIS_EDIBLE' 
  | 'CANNABIS_CONCENTRATE' 
  | 'CANNABIS_TOPICAL'
  | 'CANNABIS' 
  | 'HEMP_CBD' 
  | 'SUPPLEMENT' 
  | 'PHARMA' 
  | 'PEPTIDE'
  | 'OTHER';

export interface Product {
  _id: string;
  name: string;
  sku: string;
  description?: string;
  category: ProductCategory;
  subcategory?: string;
  brand?: string;
  price: number;
  costPrice?: number;
  currency?: string;
  quantity: number;
  unit?: string;
  weight?: number;
  weightUnit?: string;
  thcContent?: number;
  cbdContent?: number;
  strain?: string;
  strainType?: 'INDICA' | 'SATIVA' | 'HYBRID';
  status: ProductStatus;
  complianceStatus: ComplianceStatus;
  lastComplianceCheck?: string;
  complianceNotes?: string;
  licenseRequired?: boolean;
  labTested?: boolean;
  labTestUrl?: string;
  labTestDate?: string;
  batchNumber?: string;
  lotNumber?: string;
  expirationDate?: string;
  harvestDate?: string;
  images?: string[];
  thumbnailUrl?: string;
  tags?: string[];
  scope: 'GLOBAL' | 'ORGANIZATION';
  merchantId: string;
  organizationId?: string;
  sourceProductId?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  createdBy?: string;
  updatedBy?: string;
  metadata?: Record<string, unknown>;
  // Enriched fields from admin API
  merchantName?: string;
  organizationName?: string;
}

export interface ProductFilters {
  status?: ProductStatus;
  complianceStatus?: ComplianceStatus;
  category?: ProductCategory;
  scope?: 'GLOBAL' | 'ORGANIZATION';
  merchantId?: string;
  organizationId?: string;
  search?: string;
  page?: number;
  limit?: number;
  sortBy?: 'name' | 'createdAt' | 'price' | 'status' | 'complianceStatus';
  sortOrder?: 'asc' | 'desc';
  isActive?: boolean;
}

export interface UpdateProductInput {
  name?: string;
  description?: string;
  category?: ProductCategory;
  price?: number;
  quantity?: number;
  status?: ProductStatus;
  complianceStatus?: ComplianceStatus;
  complianceNotes?: string;
  isActive?: boolean;
  metadata?: Record<string, unknown>;
}

// ===================
// Hooks
// ===================

/**
 * Hook for fetching products
 */
export function useProducts(initialFilters?: ProductFilters) {
  const [products, setProducts] = useState<Product[]>([]);
  const [pagination, setPagination] = useState({
    total: 0,
    page: 1,
    limit: 20,
    totalPages: 0,
    hasMore: false,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState<ProductFilters>(initialFilters || {});

  const fetchProducts = useCallback(async (newFilters?: ProductFilters) => {
    setLoading(true);
    setError(null);
    
    const params = { ...filters, ...newFilters };
    if (newFilters) setFilters(params);
    
    const response = await adminApi.get<PaginatedResponse<Product>>(
      '/admin/products',
      params as Record<string, string | number | boolean | undefined>
    );
    
    if (response.success && response.data) {
      const data = response.data as any;
      const items = data.items || data.data || [];
      setProducts(items);
      setPagination({
        total: data.total || items.length,
        page: data.page || params.page || 1,
        limit: data.limit || params.limit || 20,
        totalPages: data.totalPages || Math.ceil((data.total || items.length) / (params.limit || 20)),
        hasMore: data.hasMore || (data.page < data.totalPages),
      });
    } else {
      setError(response.error?.message || 'Failed to fetch products');
      setProducts([]);
    }
    
    setLoading(false);
    return response;
  }, [filters]);

  // Initial fetch
  useEffect(() => {
    fetchProducts();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return {
    products,
    pagination,
    loading,
    error,
    filters,
    fetchProducts,
    setFilters,
    refresh: () => fetchProducts(),
  };
}

/**
 * Hook for fetching a single product
 */
export function useProduct(productId: string | null) {
  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchProduct = useCallback(async () => {
    if (!productId) return;
    
    setLoading(true);
    setError(null);
    
    const response = await adminApi.get<Product>(`/admin/products/${productId}`);
    
    if (response.success && response.data) {
      setProduct(response.data);
    } else {
      setError(response.error?.message || 'Failed to fetch product');
      setProduct(null);
    }
    
    setLoading(false);
  }, [productId]);

  useEffect(() => {
    if (productId) {
      fetchProduct();
    }
  }, [productId, fetchProduct]);

  return {
    product,
    loading,
    error,
    refresh: fetchProduct,
  };
}

/**
 * Hook for product management actions
 */
export function useProductActions() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const updateProductStatus = useCallback(async (
    productId: string, 
    status: ProductStatus,
    reason?: string
  ): Promise<ApiResponse<Product>> => {
    setLoading(true);
    setError(null);
    
    const response = await adminApi.patch<Product>(`/admin/products/${productId}/status`, {
      status,
      reason,
      updatedAt: new Date().toISOString(),
    });
    
    if (!response.success) {
      setError(response.error?.message || 'Failed to update product status');
    }
    
    setLoading(false);
    return response;
  }, []);

  const updateProductCompliance = useCallback(async (
    productId: string, 
    complianceStatus: ComplianceStatus,
    notes?: string
  ): Promise<ApiResponse<Product>> => {
    setLoading(true);
    setError(null);
    
    const response = await adminApi.patch<Product>(`/admin/products/${productId}/compliance`, {
      complianceStatus,
      complianceNotes: notes,
      lastComplianceCheck: new Date().toISOString(),
    });
    
    if (!response.success) {
      setError(response.error?.message || 'Failed to update product compliance');
    }
    
    setLoading(false);
    return response;
  }, []);

  const updateProduct = useCallback(async (
    productId: string, 
    data: UpdateProductInput
  ): Promise<ApiResponse<Product>> => {
    setLoading(true);
    setError(null);
    
    const response = await adminApi.patch<Product>(`/admin/products/${productId}`, data);
    
    if (!response.success) {
      setError(response.error?.message || 'Failed to update product');
    }
    
    setLoading(false);
    return response;
  }, []);

  const archiveProduct = useCallback(async (productId: string): Promise<ApiResponse<Product>> => {
    setLoading(true);
    setError(null);
    
    const response = await adminApi.post<Product>(`/admin/products/${productId}/archive`, {});
    
    if (!response.success) {
      setError(response.error?.message || 'Failed to archive product');
    }
    
    setLoading(false);
    return response;
  }, []);

  return {
    loading,
    error,
    updateProductStatus,
    updateProductCompliance,
    updateProduct,
    archiveProduct,
  };
}

/**
 * Hook for fetching products by organization
 */
export function useOrganizationProducts(organizationId: string | null) {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchProducts = useCallback(async () => {
    if (!organizationId) return;
    
    setLoading(true);
    setError(null);
    
    const response = await adminApi.get<Product[]>(
      `/admin/organizations/${organizationId}/products`
    );
    
    if (response.success && response.data) {
      setProducts(Array.isArray(response.data) ? response.data : []);
    } else {
      setError(response.error?.message || 'Failed to fetch organization products');
      setProducts([]);
    }
    
    setLoading(false);
  }, [organizationId]);

  useEffect(() => {
    if (organizationId) {
      fetchProducts();
    }
  }, [organizationId, fetchProducts]);

  return {
    products,
    loading,
    error,
    refresh: fetchProducts,
  };
}

/**
 * Hook for fetching compliance queue products
 */
export function useComplianceQueue(initialFilters?: { status?: ComplianceStatus }) {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchQueue = useCallback(async (status?: ComplianceStatus) => {
    setLoading(true);
    setError(null);
    
    const endpoint = status === 'NON_COMPLIANT' 
      ? '/admin/products/non-compliant'
      : '/admin/products/pending-compliance';
    
    const response = await adminApi.get<Product[]>(endpoint);
    
    if (response.success && response.data) {
      setProducts(Array.isArray(response.data) ? response.data : []);
    } else {
      setError(response.error?.message || 'Failed to fetch compliance queue');
      setProducts([]);
    }
    
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchQueue(initialFilters?.status);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return {
    products,
    loading,
    error,
    refresh: () => fetchQueue(initialFilters?.status),
  };
}
