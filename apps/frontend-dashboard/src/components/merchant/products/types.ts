// ============================================
// Product Types for Multi-Tenant Merchant Page
// ============================================

export type ProductScope = 'organization' | 'global';

export type ProductStatus = 'DRAFT' | 'PENDING_REVIEW' | 'APPROVED' | 'REJECTED' | 'ARCHIVED';
export type ComplianceStatus = 'COMPLIANT' | 'NON_COMPLIANT' | 'PENDING' | 'EXPIRED' | 'REQUIRES_REVIEW';
export type SyncStatus = 'IN_SYNC' | 'OUT_OF_SYNC' | 'DETACHED' | 'LOCAL_ONLY';
export type LifecycleStage = 'PROPOSED' | 'UNDER_REVIEW' | 'APPROVED' | 'LIVE' | 'DEPRECATED';

export interface ProductOverrides {
  price?: number;
  visibility?: 'PUBLIC' | 'PRIVATE' | 'RESTRICTED';
  description?: string;
  tags?: string[];
  customFields?: Record<string, unknown>;
}

export interface Product {
  _id: string;
  name: string;
  sku?: string;
  description?: string;
  category: string;
  organizationId?: string;
  merchantId?: string;
  scope?: 'GLOBAL' | 'ORGANIZATION';
  sourceProductId?: string;
  status?: ProductStatus;
  complianceStatus?: ComplianceStatus;
  // Pricing
  price?: number;
  currency?: string;
  // Sync tracking
  syncStatus?: SyncStatus;
  lastGlobalUpdate?: string;
  lastLocalOverride?: string;
  overriddenBy?: string;
  overrides?: ProductOverrides;
  // Lifecycle
  lifecycleStage?: LifecycleStage;
  lifecycleChangedBy?: string;
  lifecycleChangedAt?: string;
  // Import tracking
  importedAt?: string;
  importedBy?: string;
  autoSyncEnabled?: boolean;
  // Metadata
  metadata?: Record<string, unknown>;
  originCountry?: string;
  commodityType?: string;
  thcContent?: number;
  cbdContent?: number;
  strainType?: string;
  batchNumber?: string;
  lotNumber?: string;
  manufacturedAt?: string;
  expiresAt?: string;
  tags?: string[];
  createdAt: string;
  updatedAt: string;
}

export interface ImportProductPayload {
  globalProductId: string;
  organizationId: string;
  overrides?: ProductOverrides;
  autoSync?: boolean;
}

export interface BulkImportPayload {
  productIds: string[];
  organizationId: string;
  defaultOverrides?: ProductOverrides;
}

export interface BulkImportResult {
  imported: number;
  skipped: number;
  errors: Array<{ productId: string; error: string }>;
}

export interface ProductFilters {
  search?: string;
  status?: ProductStatus | '';
  category?: string;
  importStatus?: 'IMPORTED' | 'LOCAL_ONLY' | '';
  syncStatus?: SyncStatus | '';
  lifecycleStage?: LifecycleStage | '';
  tags?: string[];
}

export interface GlobalProductFilters {
  search?: string;
  category?: string;
  productType?: string;
  provider?: string;
  availability?: 'AVAILABLE' | 'COMING_SOON' | 'DEPRECATED' | '';
}

// Permission types for RBAC
export type ProductPermission = 
  | 'products:view'
  | 'products:create'
  | 'products:edit'
  | 'products:delete'
  | 'products:import'
  | 'products:bulk_actions'
  | 'products:manage_lifecycle'
  | 'products:approve';

export interface ProductAuditEntry {
  action: string;
  timestamp: string;
  userId: string;
  userName?: string;
  details?: Record<string, unknown>;
}

export interface ProductProvenance {
  origin: 'ORGANIZATION' | 'GLOBAL';
  importedAt?: string;
  importedBy?: string;
  lastGlobalUpdate?: string;
  lastLocalOverride?: string;
  lastOverrideBy?: string;
  auditTrail: ProductAuditEntry[];
}
