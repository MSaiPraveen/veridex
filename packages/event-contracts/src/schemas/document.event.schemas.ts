/**
 * Document Event Schemas - Runtime validation with Zod
 */
import { z } from 'zod';
import { baseEventSchema } from './auth.event.schemas';

// ================== DOCUMENT EVENTS ==================

/**
 * Schema for document uploaded event
 */
export const documentUploadedEventSchema = baseEventSchema.extend({
  documentId: z.string().min(1),
  uploadedBy: z.string().min(1),
  organizationId: z.string().optional(),
  fileName: z.string().min(1).max(255),
  mimeType: z.string().max(100),
  fileSize: z.number().int().positive(),
  type: z.enum(['license', 'permit', 'certificate', 'coa', 'manifest', 'invoice', 'contract', 'other']),
  relatedEntityType: z.enum(['product', 'organization', 'user', 'batch']).optional(),
  relatedEntityId: z.string().optional(),
});

export type DocumentUploadedEvent = z.infer<typeof documentUploadedEventSchema>;

/**
 * Schema for document updated event
 */
export const documentUpdatedEventSchema = baseEventSchema.extend({
  documentId: z.string().min(1),
  updatedBy: z.string().min(1),
  changes: z.record(z.object({
    from: z.unknown(),
    to: z.unknown(),
  })),
});

export type DocumentUpdatedEvent = z.infer<typeof documentUpdatedEventSchema>;

/**
 * Schema for document deleted event
 */
export const documentDeletedEventSchema = baseEventSchema.extend({
  documentId: z.string().min(1),
  deletedBy: z.string().min(1),
  reason: z.string().max(500).optional(),
});

export type DocumentDeletedEvent = z.infer<typeof documentDeletedEventSchema>;

/**
 * Schema for document processed event
 */
export const documentProcessedEventSchema = baseEventSchema.extend({
  documentId: z.string().min(1),
  productId: z.string().optional(),
  ownerId: z.string().min(1),
  processingStatus: z.enum(['success', 'partial', 'failed']),
  extracted: z.record(z.unknown()).optional(),
  failureReason: z.string().max(1000).optional(),
  processingDuration: z.number().positive().optional(),
});

export type DocumentProcessedEvent = z.infer<typeof documentProcessedEventSchema>;

/**
 * Schema for document extraction completed event
 */
export const documentExtractionCompletedEventSchema = baseEventSchema.extend({
  documentId: z.string().min(1),
  productId: z.string().optional(),
  extractedData: z.object({
    thcContent: z.number().optional(),
    cbdContent: z.number().optional(),
    terpenes: z.record(z.number()).optional(),
    testDate: z.string().datetime().optional(),
    labName: z.string().optional(),
    batchNumber: z.string().optional(),
    expirationDate: z.string().datetime().optional(),
    // Other extracted fields
  }).passthrough().optional(),
  confidence: z.number().min(0).max(1).optional(),
});

export type DocumentExtractionCompletedEvent = z.infer<typeof documentExtractionCompletedEventSchema>;

/**
 * Schema for document extraction failed event
 */
export const documentExtractionFailedEventSchema = baseEventSchema.extend({
  documentId: z.string().min(1),
  reason: z.string().max(1000),
  errorCode: z.string().optional(),
  retryable: z.boolean().default(false),
});

export type DocumentExtractionFailedEvent = z.infer<typeof documentExtractionFailedEventSchema>;

/**
 * Schema for document expiring event (notification trigger)
 */
export const documentExpiringEventSchema = baseEventSchema.extend({
  documentId: z.string().min(1),
  ownerId: z.string().min(1),
  organizationId: z.string().optional(),
  documentType: z.string(),
  documentTitle: z.string(),
  expiresAt: z.string().datetime(),
  daysUntilExpiry: z.number().int(),
});

export type DocumentExpiringEvent = z.infer<typeof documentExpiringEventSchema>;
