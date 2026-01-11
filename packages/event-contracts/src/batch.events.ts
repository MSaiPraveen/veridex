/**
 * Batch Events
 * 
 * Events related to batch lifecycle and compliance evaluation.
 * Batches are the unit of compliance evaluation - lab results,
 * expiry dates, and recalls are all batch-scoped.
 */

import { z } from 'zod';

// ============================================
// Compliance Status Enum (aligned with compliance-rules package)
// ============================================
export const ComplianceStatusSchema = z.enum([
  'COMPLIANT',
  'NON_COMPLIANT',
  'PENDING',
  'EXPIRED',
  'REQUIRES_REVIEW',
]);

export type ComplianceStatus = z.infer<typeof ComplianceStatusSchema>;

// ============================================
// Batch Created Event
// ============================================
export const BatchCreatedEventSchema = z.object({
  batchId: z.string().uuid(),
  productId: z.string().uuid(),
  organizationId: z.string().uuid(),
  batchNumber: z.string(),
  manufacturedAt: z.number().optional(),
  expiresAt: z.number().optional(),
  quantity: z.number().int().positive().optional(),
  createdBy: z.string().uuid(),
  createdAt: z.number(),
});

export type BatchCreatedEvent = z.infer<typeof BatchCreatedEventSchema>;

// ============================================
// Batch Updated Event
// ============================================
export const BatchUpdatedEventSchema = z.object({
  batchId: z.string().uuid(),
  productId: z.string().uuid(),
  organizationId: z.string().uuid(),
  changes: z.record(z.unknown()),
  updatedBy: z.string().uuid(),
  updatedAt: z.number(),
});

export type BatchUpdatedEvent = z.infer<typeof BatchUpdatedEventSchema>;

// ============================================
// Batch Document Attached Event
// ============================================
export const BatchDocumentAttachedEventSchema = z.object({
  batchId: z.string().uuid(),
  productId: z.string().uuid(),
  documentId: z.string().uuid(),
  documentType: z.string(),
  attachedBy: z.string().uuid(),
  attachedAt: z.number(),
});

export type BatchDocumentAttachedEvent = z.infer<typeof BatchDocumentAttachedEventSchema>;

// ============================================
// Batch Compliance Requested Event
// ============================================
export const BatchComplianceRequestedEventSchema = z.object({
  batchId: z.string().uuid(),
  productId: z.string().uuid(),
  organizationId: z.string().uuid(),
  requestedBy: z.string().uuid(),
  requestedAt: z.number(),
  reason: z.string().optional(),
});

export type BatchComplianceRequestedEvent = z.infer<typeof BatchComplianceRequestedEventSchema>;

// ============================================
// Batch Compliance Evaluated Event
// ============================================
export const RuleResultSchema = z.object({
  ruleId: z.string(),
  version: z.number(),
  passed: z.boolean(),
  applied: z.boolean(),
  failure: z.object({
    status: ComplianceStatusSchema,
    reasonCode: z.string(),
    message: z.string(),
    severity: z.enum(['BLOCKER', 'WARNING']),
  }).optional(),
});

export const BatchComplianceEvaluatedEventSchema = z.object({
  batchId: z.string().uuid(),
  productId: z.string().uuid(),
  organizationId: z.string().uuid(),
  evaluatedAt: z.number(),
  overallStatus: ComplianceStatusSchema,
  previousStatus: ComplianceStatusSchema.optional(),
  statusChanged: z.boolean(),
  summary: z.object({
    totalRules: z.number(),
    rulesApplied: z.number(),
    rulesPassed: z.number(),
    rulesFailed: z.number(),
    blockersFailed: z.number(),
    warningsFailed: z.number(),
  }),
  results: z.array(RuleResultSchema),
  decisionTrail: z.array(z.string()),
  stoppedByBlocker: z.boolean(),
  blockerRuleId: z.string().optional(),
  durationMs: z.number(),
});

export type BatchComplianceEvaluatedEvent = z.infer<typeof BatchComplianceEvaluatedEventSchema>;

// ============================================
// Batch Recalled Event
// ============================================
export const BatchRecalledEventSchema = z.object({
  batchId: z.string().uuid(),
  productId: z.string().uuid(),
  organizationId: z.string().uuid(),
  recallReason: z.string(),
  recallType: z.enum(['VOLUNTARY', 'MANDATORY', 'MARKET_WITHDRAWAL']),
  recalledBy: z.string().uuid(),
  recalledAt: z.number(),
  affectedQuantity: z.number().int().optional(),
  regulatoryNotified: z.boolean().optional(),
});

export type BatchRecalledEvent = z.infer<typeof BatchRecalledEventSchema>;

// ============================================
// Batch Expired Event
// ============================================
export const BatchExpiredEventSchema = z.object({
  batchId: z.string().uuid(),
  productId: z.string().uuid(),
  organizationId: z.string().uuid(),
  expiresAt: z.number(),
  detectedAt: z.number(),
  remainingQuantity: z.number().int().optional(),
});

export type BatchExpiredEvent = z.infer<typeof BatchExpiredEventSchema>;

// ============================================
// Batch Expiring Soon Event (for notifications)
// ============================================
export const BatchExpiringSoonEventSchema = z.object({
  batchId: z.string().uuid(),
  productId: z.string().uuid(),
  organizationId: z.string().uuid(),
  expiresAt: z.number(),
  daysUntilExpiry: z.number().int(),
  notifiedAt: z.number(),
  remainingQuantity: z.number().int().optional(),
});

export type BatchExpiringSoonEvent = z.infer<typeof BatchExpiringSoonEventSchema>;

// ============================================
// Validation Helper Functions
// ============================================
export function validateBatchCreatedEvent(data: unknown): BatchCreatedEvent {
  return BatchCreatedEventSchema.parse(data);
}

export function validateBatchComplianceEvaluatedEvent(data: unknown): BatchComplianceEvaluatedEvent {
  return BatchComplianceEvaluatedEventSchema.parse(data);
}

export function validateBatchRecalledEvent(data: unknown): BatchRecalledEvent {
  return BatchRecalledEventSchema.parse(data);
}
