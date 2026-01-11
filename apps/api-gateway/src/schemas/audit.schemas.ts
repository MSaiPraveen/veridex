import { z } from 'zod';
import { paginationSchema, objectIdSchema } from '../plugins/validation';

/**
 * Audit Log API Schemas
 * Validates all audit-related requests at the gateway
 */

// ================== ENUMS ==================

export const auditActionEnum = z.enum([
  'CREATE', 'UPDATE', 'DELETE', 'VIEW', 'LOGIN', 'LOGOUT', 
  'EXPORT', 'IMPORT', 'APPROVE', 'REJECT', 'SUBMIT', 'ARCHIVE'
]);

export const auditSeverityEnum = z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']);

export const resourceTypeEnum = z.enum([
  'USER', 'PRODUCT', 'DOCUMENT', 'ORGANIZATION', 'COMPLIANCE_RULE',
  'COMPLIANCE_RESULT', 'NOTIFICATION', 'AUDIT_LOG'
]);

// ================== QUERY AUDITS ==================

export const auditQuerySchema = paginationSchema.extend({
  // Date range
  startDate: z.coerce.date().optional(),
  endDate: z.coerce.date().optional(),
  // Filters
  action: auditActionEnum.optional(),
  resourceType: resourceTypeEnum.optional(),
  resourceId: z.string().optional(),
  actorId: z.string().optional(),
  severity: auditSeverityEnum.optional(),
  success: z.coerce.boolean().optional(),
  organizationId: z.string().optional(),
}).refine(
  (data) => {
    if (data.startDate && data.endDate) {
      return data.startDate <= data.endDate;
    }
    return true;
  },
  { message: 'Start date must be before end date' }
);

export type AuditQueryInput = z.infer<typeof auditQuerySchema>;

// ================== CREATE AUDIT (Internal) ==================

export const createAuditBodySchema = z.object({
  action: auditActionEnum,
  resourceType: resourceTypeEnum,
  resourceId: z.string().min(1),
  resourceName: z.string().max(200).optional(),
  
  actorId: z.string().min(1),
  actorEmail: z.string().email().optional(),
  actorRole: z.string().optional(),
  
  organizationId: z.string().optional(),
  
  severity: auditSeverityEnum.default('LOW'),
  success: z.boolean().default(true),
  
  description: z.string().max(2000).optional(),
  changes: z.object({
    before: z.record(z.unknown()).optional(),
    after: z.record(z.unknown()).optional(),
  }).optional(),
  
  metadata: z.record(z.unknown()).optional(),
  
  ipAddress: z.string().optional(),
  userAgent: z.string().optional(),
  requestId: z.string().optional(),
}).strict();

export type CreateAuditInput = z.infer<typeof createAuditBodySchema>;

// ================== AUDIT ID PARAM ==================

export const auditIdParamSchema = z.object({
  id: objectIdSchema,
});

// ================== RESOURCE PARAMS ==================

export const resourceParamsSchema = z.object({
  resourceType: resourceTypeEnum,
  resourceId: z.string().min(1),
});

// ================== ACTOR PARAM ==================

export const actorParamSchema = z.object({
  actorId: z.string().min(1),
});

// ================== STATS QUERY ==================

export const statsQuerySchema = z.object({
  organizationId: z.string().optional(),
  days: z.coerce.number().int().positive().max(365).default(30),
});

// ================== RESPONSE SCHEMAS ==================

export const auditResponseSchema = z.object({
  _id: z.string(),
  action: auditActionEnum,
  resourceType: resourceTypeEnum,
  resourceId: z.string(),
  resourceName: z.string().optional(),
  actorId: z.string(),
  actorEmail: z.string().optional(),
  actorRole: z.string().optional(),
  organizationId: z.string().optional(),
  severity: auditSeverityEnum,
  success: z.boolean(),
  description: z.string().optional(),
  ipAddress: z.string().optional(),
  createdAt: z.string(),
});

export type AuditResponse = z.infer<typeof auditResponseSchema>;

export const auditStatsResponseSchema = z.object({
  total: z.number(),
  successRate: z.number(),
  byAction: z.array(z.object({
    _id: z.string(),
    count: z.number(),
  })),
  byResourceType: z.array(z.object({
    _id: z.string(),
    count: z.number(),
  })),
  bySeverity: z.array(z.object({
    _id: z.string(),
    count: z.number(),
  })),
});

export type AuditStatsResponse = z.infer<typeof auditStatsResponseSchema>;
