import { z } from 'zod';

// ============================================
// Document Schemas
// ============================================

// Document type enum - aligned with document-service
const documentTypeEnum = z.enum([
  'license',
  'permit',
  'certificate',
  'coa',           // Certificate of Analysis
  'manifest',
  'invoice',
  'contract',
  'other',
  // Also accept uppercase variants from frontend
  'LAB_REPORT',
  'BUSINESS_LICENSE',
  'LICENSE',
  'INSURANCE',
  'COA',
  'INVOICE',
  'CONTRACT',
  'COMPLIANCE_CERT',
  'CERTIFICATE',
  'PRODUCT_PHOTO',
  'OTHER'
]);

// Document status enum - aligned with document-service
const documentStatusEnum = z.enum([
  'pending',
  'approved',
  'rejected',
  'expired',
  // Also accept uppercase variants
  'PENDING',
  'PROCESSING',
  'SUCCESS',
  'FAILED',
  'EXPIRED',
  'ACTIVE',
  'ARCHIVED',
  'DELETED'
]);

// Upload document (multipart/form-data metadata)
export const uploadDocumentBodySchema = z.object({
  type: documentTypeEnum,
  title: z.string().min(1).max(255),
  description: z.string().max(1000).optional(),
  relatedEntityType: z.enum(['product', 'organization', 'user', 'batch']).optional(),
  relatedEntityId: z.string().regex(/^[a-f\d]{24}$/i, 'Invalid ObjectId').optional(),
  expiresAt: z.string().datetime().optional(),
  tags: z.array(z.string().max(50)).max(20).optional(),
}).strict();

// Update document metadata
export const updateDocumentBodySchema = z.object({
  title: z.string().min(1).max(255).optional(),
  description: z.string().max(1000).optional(),
  type: documentTypeEnum.optional(),
  tags: z.array(z.string().max(50)).max(20).optional(),
  expiresAt: z.string().datetime().nullable().optional(),
}).strict();

// Document query params - permissive to allow various frontend queries
export const documentQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  type: documentTypeEnum.optional(),
  status: documentStatusEnum.optional(),
  // Support both document-service and legacy patterns
  extractionStatus: z.enum(['PENDING', 'PROCESSING', 'SUCCESS', 'FAILED']).optional(),
  visibility: z.enum(['PRIVATE', 'ORGANIZATION', 'PUBLIC']).optional(),
  relatedEntityType: z.enum(['product', 'organization', 'user', 'batch']).optional(),
  relatedEntityId: z.string().regex(/^[a-f\d]{24}$/i, 'Invalid ObjectId').optional(),
  organizationId: z.string().optional(),
  productId: z.string().optional(),
  ownerId: z.string().optional(),
  search: z.string().max(100).optional(),
  uploadedBy: z.string().regex(/^[a-f\d]{24}$/i, 'Invalid ObjectId').optional(),
  expiresAfter: z.string().datetime().optional(),
  expiresBefore: z.string().datetime().optional(),
  isExpired: z.coerce.boolean().optional(),
  tags: z.string().optional(), // comma-separated
  sortBy: z.enum(['createdAt', 'title', 'type', 'expiresAt', 'name']).default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
}).passthrough(); // Allow extra fields instead of strict

// Update document status
export const updateDocumentStatusBodySchema = z.object({
  status: documentStatusEnum,
  reviewNote: z.string().max(500).optional(),
}).strict();

// Document response DTO
export const documentResponseSchema = z.object({
  id: z.string(),
  title: z.string(),
  description: z.string().nullable().optional(),
  type: documentTypeEnum,
  status: documentStatusEnum,
  fileName: z.string(),
  fileSize: z.number(),
  mimeType: z.string(),
  fileUrl: z.string().url(),
  relatedEntityType: z.string().nullable().optional(),
  relatedEntityId: z.string().nullable().optional(),
  tags: z.array(z.string()).optional(),
  uploadedBy: z.string(),
  reviewedBy: z.string().nullable().optional(),
  reviewNote: z.string().nullable().optional(),
  expiresAt: z.string().datetime().nullable().optional(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

// Infer types
export type UploadDocumentBody = z.infer<typeof uploadDocumentBodySchema>;
export type UpdateDocumentBody = z.infer<typeof updateDocumentBodySchema>;
export type DocumentQuery = z.infer<typeof documentQuerySchema>;
export type UpdateDocumentStatusBody = z.infer<typeof updateDocumentStatusBodySchema>;
export type DocumentResponse = z.infer<typeof documentResponseSchema>;
