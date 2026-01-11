import { z } from 'zod';
import { ValidationError } from '../errors/service.errors';

// Action enum
const actionEnum = z.enum([
  'CREATE', 'READ', 'UPDATE', 'DELETE', 'LOGIN', 'LOGOUT', 
  'EXPORT', 'IMPORT', 'APPROVE', 'REJECT', 'UPLOAD', 'DOWNLOAD'
]);

// Resource type enum
const resourceTypeEnum = z.enum([
  'USER', 'ORGANIZATION', 'PRODUCT', 'DOCUMENT', 
  'COMPLIANCE_RULE', 'COMPLIANCE_RESULT', 'NOTIFICATION', 'SESSION'
]);

// Severity enum
const severityEnum = z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']);

// =====================
// Validate helper
// =====================

export function validate<T extends z.ZodType>(schema: T, data: unknown): z.infer<T> {
  const result = schema.safeParse(data);
  if (!result.success) {
    throw new ValidationError(
      result.error.errors.map(e => `${e.path.join('.')}: ${e.message}`).join(', ')
    );
  }
  return result.data;
}

// =====================
// Create Audit Log Schema
// =====================

export const createAuditLogSchema = z.object({
  actorId: z.string().min(1),
  actorEmail: z.string().email().optional(),
  actorRole: z.string().min(1),
  organizationId: z.string().optional(),
  action: actionEnum,
  resourceType: resourceTypeEnum,
  resourceId: z.string().min(1),
  resourceName: z.string().max(200).optional(),
  description: z.string().max(1000).optional(),
  severity: severityEnum.optional().default('LOW'),
  metadata: z.record(z.string(), z.any()).optional().default({}),
  changes: z.object({
    before: z.record(z.string(), z.any()).optional(),
    after: z.record(z.string(), z.any()).optional(),
  }).optional(),
  ipAddress: z.string().optional(),
  userAgent: z.string().optional(),
  requestId: z.string().optional(),
  sessionId: z.string().optional(),
  success: z.boolean().optional().default(true),
  errorMessage: z.string().optional(),
  duration: z.number().positive().optional(),
});

// =====================
// Query Schema (with coercion for query strings)
// =====================

export const auditQuerySchema = z.object({
  actorId: z.string().optional(),
  organizationId: z.string().optional(),
  action: actionEnum.optional(),
  resourceType: resourceTypeEnum.optional(),
  resourceId: z.string().optional(),
  severity: severityEnum.optional(),
  success: z.preprocess(
    (val) => val === 'true' ? true : val === 'false' ? false : undefined,
    z.boolean().optional()
  ),
  fromDate: z.string().optional(),
  toDate: z.string().optional(),
  page: z.coerce.number().int().positive().optional().default(1),
  limit: z.coerce.number().int().positive().max(100).optional().default(50),
  sortBy: z.enum(['createdAt', 'action', 'severity', 'resourceType']).optional().default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).optional().default('desc'),
});

// =====================
// Route Params Schemas
// =====================

export const idParamSchema = z.object({
  id: z.string().min(1),
});

export const resourceParamsSchema = z.object({
  resourceType: resourceTypeEnum,
  resourceId: z.string().min(1),
});

// Type exports
export type CreateAuditLogInput = z.infer<typeof createAuditLogSchema>;
export type AuditQueryInput = z.infer<typeof auditQuerySchema>;
