import { z } from 'zod';

// ============================================
// Compliance Schemas
// ============================================

// Compliance rule severity
const ruleSeverityEnum = z.enum(['info', 'warning', 'error', 'critical']);

// Rule status
const ruleStatusEnum = z.enum(['active', 'inactive', 'draft']);

// Compliance check result
const checkResultEnum = z.enum(['pass', 'fail', 'warning', 'pending']);

// Jurisdiction type
const jurisdictionTypeEnum = z.enum([
  'federal',
  'state',
  'county',
  'city',
  'tribal'
]);

// Create compliance rule
export const createRuleBodySchema = z.object({
  name: z.string().min(1).max(255),
  description: z.string().max(2000),
  code: z.string().regex(/^[A-Z]{2,5}-\d{3,6}$/, 'Invalid rule code format (e.g., THC-001)'),
  severity: ruleSeverityEnum,
  category: z.enum([
    'thc_limits',
    'labeling',
    'packaging',
    'testing',
    'tracking',
    'licensing',
    'age_verification',
    'storage',
    'transportation',
    'other'
  ]),
  jurisdictions: z.array(z.object({
    type: jurisdictionTypeEnum,
    code: z.string().max(50),
    name: z.string().max(255),
  })).min(1),
  conditions: z.object({
    field: z.string(),
    operator: z.enum(['eq', 'ne', 'gt', 'gte', 'lt', 'lte', 'in', 'nin', 'regex', 'exists']),
    value: z.unknown(),
  }).array().optional(),
  effectiveDate: z.string().datetime(),
  expirationDate: z.string().datetime().optional(),
  status: ruleStatusEnum.default('draft'),
  autoEnforce: z.boolean().default(false),
  enforcementAction: z.enum(['block', 'warn', 'flag', 'notify']).optional(),
}).strict();

// Update compliance rule
export const updateRuleBodySchema = z.object({
  name: z.string().min(1).max(255).optional(),
  description: z.string().max(2000).optional(),
  severity: ruleSeverityEnum.optional(),
  conditions: z.object({
    field: z.string(),
    operator: z.enum(['eq', 'ne', 'gt', 'gte', 'lt', 'lte', 'in', 'nin', 'regex', 'exists']),
    value: z.unknown(),
  }).array().optional(),
  effectiveDate: z.string().datetime().optional(),
  expirationDate: z.string().datetime().nullable().optional(),
  status: ruleStatusEnum.optional(),
  autoEnforce: z.boolean().optional(),
  enforcementAction: z.enum(['block', 'warn', 'flag', 'notify']).optional(),
}).strict();

// Compliance check request
export const complianceCheckBodySchema = z.object({
  entityType: z.enum(['product', 'batch', 'transaction', 'organization']),
  entityId: z.string().regex(/^[a-f\d]{24}$/i, 'Invalid ObjectId'),
  jurisdictions: z.array(z.string().max(50)).optional(),
  ruleIds: z.array(z.string().regex(/^[a-f\d]{24}$/i, 'Invalid ObjectId')).optional(),
  dryRun: z.boolean().default(false),
}).strict();

// Rule query params
export const ruleQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  status: ruleStatusEnum.optional(),
  severity: ruleSeverityEnum.optional(),
  category: z.string().max(50).optional(),
  jurisdiction: z.string().max(50).optional(),
  search: z.string().max(100).optional(),
  sortBy: z.enum(['createdAt', 'name', 'severity', 'effectiveDate']).default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
}).strict();

// Compliance result query params
export const complianceResultQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  entityType: z.enum(['product', 'batch', 'transaction', 'organization']).optional(),
  entityId: z.string().regex(/^[a-f\d]{24}$/i, 'Invalid ObjectId').optional(),
  result: checkResultEnum.optional(),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
  sortBy: z.enum(['createdAt', 'result']).default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
}).strict();

// Compliance stats query
export const complianceStatsQuerySchema = z.object({
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
  entityType: z.enum(['product', 'batch', 'transaction', 'organization']).optional(),
  jurisdiction: z.string().max(50).optional(),
}).strict();

// Rule response DTO
export const ruleResponseSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string(),
  code: z.string(),
  severity: ruleSeverityEnum,
  category: z.string(),
  jurisdictions: z.array(z.object({
    type: jurisdictionTypeEnum,
    code: z.string(),
    name: z.string(),
  })),
  status: ruleStatusEnum,
  effectiveDate: z.string().datetime(),
  expirationDate: z.string().datetime().nullable().optional(),
  autoEnforce: z.boolean(),
  enforcementAction: z.string().nullable().optional(),
  createdBy: z.string(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

// Compliance check result response
export const complianceCheckResponseSchema = z.object({
  id: z.string(),
  entityType: z.string(),
  entityId: z.string(),
  overallResult: checkResultEnum,
  ruleResults: z.array(z.object({
    ruleId: z.string(),
    ruleName: z.string(),
    ruleCode: z.string(),
    result: checkResultEnum,
    message: z.string().optional(),
    details: z.record(z.unknown()).optional(),
  })),
  checkedAt: z.string().datetime(),
  checkedBy: z.string(),
});

// Infer types
export type CreateRuleBody = z.infer<typeof createRuleBodySchema>;
export type UpdateRuleBody = z.infer<typeof updateRuleBodySchema>;
export type ComplianceCheckBody = z.infer<typeof complianceCheckBodySchema>;
export type RuleQuery = z.infer<typeof ruleQuerySchema>;
export type ComplianceResultQuery = z.infer<typeof complianceResultQuerySchema>;
export type ComplianceStatsQuery = z.infer<typeof complianceStatsQuerySchema>;
export type RuleResponse = z.infer<typeof ruleResponseSchema>;
export type ComplianceCheckResponse = z.infer<typeof complianceCheckResponseSchema>;
