/**
 * Audit Event Schemas - Runtime validation with Zod
 */
import { z } from 'zod';
import { baseEventSchema } from './auth.event.schemas';

// ================== AUDIT EVENTS ==================

/**
 * Schema for audit log event
 */
export const auditEventSchema = baseEventSchema.extend({
  // Action details
  action: z.enum([
    'CREATE', 'UPDATE', 'DELETE', 'VIEW', 'LOGIN', 'LOGOUT',
    'EXPORT', 'IMPORT', 'APPROVE', 'REJECT', 'SUBMIT', 'ARCHIVE'
  ]),
  
  // Resource being acted upon
  resourceType: z.enum([
    'USER', 'PRODUCT', 'DOCUMENT', 'ORGANIZATION', 
    'COMPLIANCE_RULE', 'COMPLIANCE_RESULT', 'NOTIFICATION', 'AUDIT_LOG'
  ]),
  resourceId: z.string().min(1),
  resourceName: z.string().max(255).optional(),
  
  // Actor information
  actorId: z.string().min(1),
  actorEmail: z.string().email().optional(),
  actorRole: z.enum(['ADMIN', 'MERCHANT', 'CONSUMER']).optional(),
  
  // Organization context
  organizationId: z.string().optional(),
  
  // Result
  success: z.boolean().default(true),
  errorMessage: z.string().max(1000).optional(),
  
  // Severity for filtering/alerting
  severity: z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']).default('LOW'),
  
  // Change tracking
  changes: z.object({
    before: z.record(z.unknown()).optional(),
    after: z.record(z.unknown()).optional(),
  }).optional(),
  
  // Request context
  ipAddress: z.string().ip().optional(),
  userAgent: z.string().max(500).optional(),
  requestId: z.string().optional(),
  
  // Additional metadata
  metadata: z.record(z.unknown()).optional(),
});

export type AuditEvent = z.infer<typeof auditEventSchema>;

/**
 * Simplified audit event for quick logging
 */
export const simpleAuditEventSchema = z.object({
  action: auditEventSchema.shape.action,
  resourceType: auditEventSchema.shape.resourceType,
  resourceId: z.string().min(1),
  actorId: z.string().min(1),
  timestamp: z.string().datetime(),
  success: z.boolean().default(true),
  metadata: z.record(z.unknown()).optional(),
});

export type SimpleAuditEvent = z.infer<typeof simpleAuditEventSchema>;
