/**
 * Batch Entity - Core compliance unit
 * 
 * CRITICAL: Compliance is evaluated at BATCH level, not product level.
 * 
 * Why:
 * - Lab results are batch-specific
 * - Expiry applies per batch
 * - Recalls are batch-scoped
 * - This is immutable truth
 * 
 * A product is compliant ONLY if at least one active batch is compliant.
 */

import { ProductCategory, BatchStatus, ComplianceStatus } from './categories';

/**
 * Batch entity
 */
export interface Batch {
  /** Unique batch identifier */
  id: string;
  
  /** Merchant-assigned batch number */
  batchNumber: string;
  
  /** Associated product ID */
  productId: string;
  
  /** Product category (denormalized for performance) */
  category: ProductCategory;
  
  /** Batch lifecycle status */
  status: BatchStatus;
  
  /** Compliance status (result of evaluation) */
  complianceStatus: ComplianceStatus;
  
  /** Manufacturing date */
  manufacturedAt?: string;
  
  /** Expiration date (required for most categories) */
  expiresAt?: string;
  
  /** Quantity in this batch */
  quantity: number;
  
  /** Unit of measure */
  quantityUnit: string;
  
  /** Remaining quantity (after sales) */
  remainingQuantity: number;
  
  /** Document IDs attached to this batch */
  documentIds: string[];
  
  /** Lab report ID (primary COA) */
  primaryLabReportId?: string;
  
  /** Category-specific attributes */
  attributes: Record<string, unknown>;
  
  /** Last compliance evaluation ID */
  lastEvaluationId?: string;
  
  /** Last evaluation timestamp */
  lastEvaluatedAt?: string;
  
  /** Recall flag - overrides all compliance */
  isRecalled: boolean;
  
  /** Recall reason if recalled */
  recallReason?: string;
  
  /** Recall date if recalled */
  recalledAt?: string;
  
  /** Merchant/organization ID */
  merchantId: string;
  
  /** Organization ID */
  organizationId?: string;
  
  /** Created by user ID */
  createdBy: string;
  
  /** Creation timestamp */
  createdAt: string;
  
  /** Last update timestamp */
  updatedAt: string;
}

/**
 * Batch creation input
 */
export interface CreateBatchInput {
  batchNumber: string;
  productId: string;
  category: ProductCategory;
  manufacturedAt?: string;
  expiresAt?: string;
  quantity: number;
  quantityUnit: string;
  attributes?: Record<string, unknown>;
  merchantId: string;
  organizationId?: string;
  createdBy: string;
}

/**
 * Batch update input
 */
export interface UpdateBatchInput {
  quantity?: number;
  remainingQuantity?: number;
  expiresAt?: string;
  attributes?: Record<string, unknown>;
}

/**
 * Batch document attachment input
 */
export interface AttachDocumentInput {
  batchId: string;
  documentId: string;
  documentType: string;
  isPrimaryLabReport?: boolean;
}

/**
 * Batch query filters
 */
export interface BatchQueryFilters {
  productId?: string;
  merchantId?: string;
  organizationId?: string;
  category?: ProductCategory;
  status?: BatchStatus;
  complianceStatus?: ComplianceStatus;
  isRecalled?: boolean;
  expiresAfter?: string;
  expiresBefore?: string;
  page?: number;
  limit?: number;
}

/**
 * Batch compliance summary (for product-level view)
 */
export interface BatchComplianceSummary {
  productId: string;
  totalBatches: number;
  compliantBatches: number;
  nonCompliantBatches: number;
  pendingBatches: number;
  expiredBatches: number;
  recalledBatches: number;
  hasAnyCompliantBatch: boolean;
  overallStatus: ComplianceStatus;
}
