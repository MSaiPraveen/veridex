import { z } from 'zod';

/**
 * Validation schemas for document-service
 */

// Document type enum - includes aliases for frontend compatibility
const DocumentTypeEnum = z.enum([
  'LAB_REPORT', 'BUSINESS_LICENSE', 'LICENSE', 'INSURANCE', 'COA', 
  'INVOICE', 'CONTRACT', 'COMPLIANCE_CERT', 'CERTIFICATE', 'PRODUCT_PHOTO', 'OTHER'
]);

// Document status enum
const DocumentStatusEnum = z.enum(['ACTIVE', 'ARCHIVED', 'DELETED']);

// Visibility level enum
const VisibilityEnum = z.enum(['PRIVATE', 'ORGANIZATION', 'PUBLIC']);

// ================== CREATE DOCUMENT SCHEMA ==================

export const createDocumentSchema = z.object({
  ownerId: z.string().min(1, 'Owner ID is required'),
  organizationId: z.string().min(1, 'Organization ID is required'),
  productId: z.string().optional(),
  
  name: z.string().min(1).max(255).trim(),
  type: DocumentTypeEnum,
  description: z.string().max(1000).optional(),
  
  visibility: VisibilityEnum.default('ORGANIZATION'),
  expiresAt: z.coerce.date().optional(),
  
  tags: z.array(z.string()).optional(),
  metadata: z.record(z.string(), z.any()).optional(),
});

// ================== UPDATE DOCUMENT SCHEMA ==================

export const updateDocumentSchema = z.object({
  name: z.string().min(1).max(255).trim().optional(),
  description: z.string().max(1000).optional().nullable(),
  visibility: VisibilityEnum.optional(),
  expiresAt: z.coerce.date().optional().nullable(),
  tags: z.array(z.string()).optional(),
  metadata: z.record(z.string(), z.any()).optional(),
});

// ================== QUERY SCHEMA ==================

export const documentQuerySchema = z.object({
  ownerId: z.string().optional(),
  organizationId: z.string().optional(),
  productId: z.string().optional(),
  type: DocumentTypeEnum.optional(),
  status: DocumentStatusEnum.optional(),
  extractionStatus: z.enum(['PENDING', 'PROCESSING', 'SUCCESS', 'FAILED']).optional(),
  visibility: VisibilityEnum.optional(),
  isExpired: z.coerce.boolean().optional(),
  search: z.string().optional(),
  tags: z.string().optional(), // comma-separated
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(100).default(20),
  sortBy: z.enum(['createdAt', 'name', 'type', 'expiresAt']).default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
});

// ================== EXTRACTION UPDATE SCHEMA ==================

export const updateExtractionSchema = z.object({
  extractionStatus: z.enum(['PENDING', 'PROCESSING', 'SUCCESS', 'FAILED']),
  extracted: z.object({
    validUntil: z.coerce.date().optional(),
    issuedTo: z.string().optional(),
    issuedBy: z.string().optional(),
    issuedDate: z.coerce.date().optional(),
    licenseNumber: z.string().optional(),
    thcContent: z.number().optional(),
    cbdContent: z.number().optional(),
    batchNumber: z.string().optional(),
    testResults: z.record(z.string(), z.any()).optional(),
    rawText: z.string().optional(),
    confidence: z.number().min(0).max(1).optional(),
  }).optional(),
  failureReason: z.string().max(500).optional(),
});

// Type exports
export type CreateDocumentInput = z.infer<typeof createDocumentSchema>;
export type UpdateDocumentInput = z.infer<typeof updateDocumentSchema>;
export type DocumentQueryInput = z.infer<typeof documentQuerySchema>;
export type UpdateExtractionInput = z.infer<typeof updateExtractionSchema>;
