/**
 * Compliance Event Schemas - Runtime validation with Zod
 */
import { z } from 'zod';
import { baseEventSchema } from './auth.event.schemas';

// ================== COMPLIANCE EVENTS ==================

/**
 * Schema for compliance check requested event
 */
export const complianceCheckRequestedEventSchema = baseEventSchema.extend({
  checkId: z.string().min(1),
  entityType: z.enum(['product', 'batch', 'transaction', 'organization']),
  entityId: z.string().min(1),
  requestedBy: z.string().min(1),
  organizationId: z.string().optional(),
  jurisdictions: z.array(z.string()).optional(),
  ruleIds: z.array(z.string()).optional(),
  priority: z.enum(['low', 'normal', 'high', 'urgent']).default('normal'),
});

export type ComplianceCheckRequestedEvent = z.infer<typeof complianceCheckRequestedEventSchema>;

/**
 * Schema for compliance check completed event
 */
export const complianceCheckCompletedEventSchema = baseEventSchema.extend({
  checkId: z.string().min(1),
  entityType: z.enum(['product', 'batch', 'transaction', 'organization']),
  entityId: z.string().min(1),
  overallResult: z.enum(['pass', 'fail', 'warning', 'pending']),
  rulesChecked: z.number().int().min(0),
  rulesPassed: z.number().int().min(0),
  rulesFailed: z.number().int().min(0),
  rulesWarned: z.number().int().min(0),
  processingDuration: z.number().positive().optional(),
});

export type ComplianceCheckCompletedEvent = z.infer<typeof complianceCheckCompletedEventSchema>;

/**
 * Schema for compliance result event (detailed)
 */
export const complianceResultEventSchema = baseEventSchema.extend({
  checkId: z.string().min(1),
  productId: z.string().min(1),
  organizationId: z.string().optional(),
  status: z.enum(['COMPLIANT', 'NON_COMPLIANT', 'PENDING', 'WARNING']),
  results: z.array(z.object({
    ruleId: z.string(),
    ruleCode: z.string(),
    ruleName: z.string(),
    result: z.enum(['pass', 'fail', 'warning', 'skip']),
    message: z.string().optional(),
    severity: z.enum(['info', 'warning', 'error', 'critical']),
    details: z.record(z.unknown()).optional(),
  })).optional(),
});

export type ComplianceResultEvent = z.infer<typeof complianceResultEventSchema>;

/**
 * Schema for compliance violation event (urgent notification)
 */
export const complianceViolationEventSchema = baseEventSchema.extend({
  violationId: z.string().min(1),
  checkId: z.string().optional(),
  entityType: z.enum(['product', 'batch', 'transaction', 'organization']),
  entityId: z.string().min(1),
  organizationId: z.string().optional(),
  ownerId: z.string().optional(),
  ruleId: z.string().min(1),
  ruleCode: z.string(),
  ruleName: z.string(),
  severity: z.enum(['warning', 'error', 'critical']),
  message: z.string().max(1000),
  enforcementAction: z.enum(['block', 'warn', 'flag', 'notify']).optional(),
  details: z.record(z.unknown()).optional(),
});

export type ComplianceViolationEvent = z.infer<typeof complianceViolationEventSchema>;
