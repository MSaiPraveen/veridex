import { z } from 'zod';

// Rule Conditions Schema
const ruleConditionsSchema = z.object({
  validUntilRequired: z.boolean().optional(),
  issuedToRequired: z.boolean().optional(),
  minExpiryDays: z.number().int().positive().optional(),
  requiredFields: z.array(z.string()).optional(),
  forbiddenSubstances: z.array(z.string()).optional(),
  maxContaminantLevels: z.record(z.string(), z.number()).optional(),
  certificationBodyRequired: z.boolean().optional(),
  labAccreditationRequired: z.boolean().optional(),
}).strict();

// Severity enum
const severityEnum = z.enum(['CRITICAL', 'MAJOR', 'MINOR', 'INFO']);

// Status enum
const statusEnum = z.enum(['COMPLIANT', 'NON_COMPLIANT', 'PENDING', 'ERROR']);

// =====================
// Compliance Rule Schemas
// =====================

export const createRuleSchema = z.object({
  name: z.string().min(1).max(200).trim(),
  code: z.string().min(1).max(50).toUpperCase().trim(),
  version: z.number().int().positive().optional().default(1),
  documentType: z.string().min(1).max(100),
  description: z.string().max(1000).optional(),
  severity: severityEnum.optional().default('MAJOR'),
  category: z.string().min(1).max(100),
  conditions: ruleConditionsSchema,
  errorMessage: z.string().min(1).max(500),
  active: z.boolean().optional().default(true),
  effectiveFrom: z.string().datetime().optional(),
  effectiveUntil: z.string().datetime().optional(),
  organizationId: z.string().optional(),
  createdBy: z.string().optional(),
});

export const updateRuleSchema = z.object({
  name: z.string().min(1).max(200).trim().optional(),
  description: z.string().max(1000).optional(),
  severity: severityEnum.optional(),
  category: z.string().min(1).max(100).optional(),
  conditions: ruleConditionsSchema.optional(),
  errorMessage: z.string().min(1).max(500).optional(),
  active: z.boolean().optional(),
  effectiveUntil: z.string().datetime().optional().nullable(),
});

export const ruleQuerySchema = z.object({
  documentType: z.string().optional(),
  category: z.string().optional(),
  severity: severityEnum.optional(),
  active: z.enum(['true', 'false']).optional(),
  organizationId: z.string().optional(),
  page: z.string().regex(/^\d+$/).optional().default('1'),
  limit: z.string().regex(/^\d+$/).optional().default('20'),
  sortBy: z.enum(['name', 'code', 'version', 'createdAt', 'severity']).optional().default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).optional().default('desc'),
});

// =====================
// Compliance Result Schemas
// =====================

const ruleEvaluationSchema = z.object({
  ruleId: z.string(),
  ruleCode: z.string(),
  ruleName: z.string(),
  passed: z.boolean(),
  severity: severityEnum,
  message: z.string().optional(),
  details: z.record(z.string(), z.any()).optional(),
});

export const createResultSchema = z.object({
  productId: z.string().min(1),
  documentId: z.string().optional(),
  organizationId: z.string().optional(),
  status: statusEnum,
  overallScore: z.number().min(0).max(100).optional(),
  ruleVersion: z.number().int().positive(),
  evaluations: z.array(ruleEvaluationSchema).optional().default([]),
  reasons: z.array(z.string()).optional().default([]),
  summary: z.string().max(1000).optional(),
  expiresAt: z.string().datetime().optional(),
  metadata: z.record(z.string(), z.any()).optional(),
});

export const resultQuerySchema = z.object({
  productId: z.string().optional(),
  documentId: z.string().optional(),
  organizationId: z.string().optional(),
  status: statusEnum.optional(),
  fromDate: z.string().datetime().optional(),
  toDate: z.string().datetime().optional(),
  page: z.string().regex(/^\d+$/).optional().default('1'),
  limit: z.string().regex(/^\d+$/).optional().default('20'),
  sortBy: z.enum(['evaluatedAt', 'createdAt', 'status', 'overallScore']).optional().default('evaluatedAt'),
  sortOrder: z.enum(['asc', 'desc']).optional().default('desc'),
});

// =====================
// Compliance Check Schemas
// =====================

export const checkComplianceSchema = z.object({
  productId: z.string().min(1),
  documentId: z.string().optional(),
  documentType: z.string().min(1),
  extracted: z.record(z.string(), z.any()),
  organizationId: z.string().optional(),
});

export const batchCheckSchema = z.object({
  checks: z.array(checkComplianceSchema).min(1).max(100),
});

// =====================
// Route Params Schemas
// =====================

export const idParamSchema = z.object({
  id: z.string().min(1),
});

export const productIdParamSchema = z.object({
  productId: z.string().min(1),
});

// Type exports
export type CreateRuleInput = z.infer<typeof createRuleSchema>;
export type UpdateRuleInput = z.infer<typeof updateRuleSchema>;
export type RuleQueryInput = z.infer<typeof ruleQuerySchema>;
export type CreateResultInput = z.infer<typeof createResultSchema>;
export type ResultQueryInput = z.infer<typeof resultQuerySchema>;
export type CheckComplianceInput = z.infer<typeof checkComplianceSchema>;
export type BatchCheckInput = z.infer<typeof batchCheckSchema>;
