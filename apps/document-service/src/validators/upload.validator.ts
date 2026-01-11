/**
 * Upload Validation Schemas for Document Service
 * 
 * Defines validation schemas for document upload with strict
 * required field enforcement.
 */

import { z } from 'zod';
import { ALLOWED_MIME_TYPES } from '../validators/file.validator';

// ================== DOCUMENT TYPE ENUM ==================

export const DocumentTypeEnum = z.enum([
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

export type DocumentType = z.infer<typeof DocumentTypeEnum>;

// ================== REQUIRED FIELDS BY DOCUMENT TYPE ==================

/**
 * Maps document types to their required metadata fields
 * These fields MUST be provided during upload
 */
export const REQUIRED_FIELDS_BY_TYPE: Record<DocumentType, string[]> = {
  LAB_REPORT: ['productId', 'organizationId'],
  BUSINESS_LICENSE: ['organizationId'],
  LICENSE: ['organizationId'],
  INSURANCE: ['organizationId'],
  COA: ['productId', 'organizationId'],
  INVOICE: ['organizationId'],
  CONTRACT: ['organizationId'],
  COMPLIANCE_CERT: ['organizationId'],
  CERTIFICATE: ['organizationId'],
  PRODUCT_PHOTO: ['productId', 'organizationId'],
  OTHER: ['organizationId'],
};

/**
 * Document types that REQUIRE a productId for compliance flow
 */
export const PRODUCT_REQUIRED_TYPES: DocumentType[] = [
  'LAB_REPORT',
  'COA',
  'PRODUCT_PHOTO',
];

// ================== UPLOAD VALIDATION SCHEMA ==================

/**
 * Strict upload validation schema with required field checks
 */
export const strictUploadSchema = z.object({
  // Required ownership fields
  ownerId: z.string().min(1, 'Owner ID is required'),
  organizationId: z.string().min(1, 'Organization ID is required'),
  
  // Product ID - required for certain document types
  productId: z.string().optional(),
  
  // Document metadata
  name: z.string().min(1, 'Document name is required').max(255, 'Name too long'),
  type: DocumentTypeEnum,
  description: z.string().max(1000).optional(),
  
  // Visibility
  visibility: z.enum(['PRIVATE', 'ORGANIZATION', 'PUBLIC']).default('ORGANIZATION'),
  
  // Expiration
  expiresAt: z.coerce.date().optional(),
  
  // Tags
  tags: z.array(z.string().max(50)).max(20).optional(),
  
  // Additional metadata
  metadata: z.record(z.string(), z.any()).optional(),
}).refine((data) => {
  // Validate productId is present for product-specific documents
  if (PRODUCT_REQUIRED_TYPES.includes(data.type) && !data.productId) {
    return false;
  }
  return true;
}, {
  message: 'productId is required for LAB_REPORT, COA, and PRODUCT_PHOTO document types',
  path: ['productId'],
});

export type StrictUploadInput = z.infer<typeof strictUploadSchema>;

// ================== VALIDATION ERROR TYPES ==================

export interface UploadValidationError {
  code: 'MISSING_PRODUCT_ID' | 'MISSING_ORGANIZATION_ID' | 'INVALID_DOCUMENT_TYPE' | 'MISSING_REQUIRED_FIELD';
  message: string;
  field: string;
  documentType?: string;
}

/**
 * Validates upload input and returns detailed errors
 */
export function validateUploadInput(input: unknown): { isValid: boolean; data?: StrictUploadInput; errors: UploadValidationError[] } {
  const errors: UploadValidationError[] = [];
  
  const result = strictUploadSchema.safeParse(input);
  
  if (!result.success) {
    for (const issue of result.error.issues) {
      const field = issue.path.join('.');
      
      if (field === 'productId') {
        errors.push({
          code: 'MISSING_PRODUCT_ID',
          message: issue.message,
          field: 'productId',
          documentType: (input as any)?.type,
        });
      } else if (field === 'organizationId') {
        errors.push({
          code: 'MISSING_ORGANIZATION_ID',
          message: 'Organization ID is required for document upload',
          field: 'organizationId',
        });
      } else if (field === 'type') {
        errors.push({
          code: 'INVALID_DOCUMENT_TYPE',
          message: `Invalid document type. Allowed: ${DocumentTypeEnum.options.join(', ')}`,
          field: 'type',
        });
      } else {
        errors.push({
          code: 'MISSING_REQUIRED_FIELD',
          message: issue.message,
          field,
        });
      }
    }
    
    return { isValid: false, errors };
  }
  
  return { isValid: true, data: result.data, errors: [] };
}

/**
 * Get list of allowed MIME types for file uploads
 */
export function getAllowedMimeTypes(): string[] {
  return Object.keys(ALLOWED_MIME_TYPES);
}

/**
 * Check if a document type requires product linkage
 */
export function requiresProductId(type: DocumentType): boolean {
  return PRODUCT_REQUIRED_TYPES.includes(type);
}
