/**
 * Admin Rules Routes
 * 
 * Admin API endpoints for compliance rules management.
 * Rules are versioned and non-retroactive.
 */

import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';
import { services } from '../config/services';
import { AdminGuards, AdminPermission, requireAdminPermissions, injectAdminContext } from '../auth/admin-permission-guard';
import { validateRequest, objectIdSchema } from '../plugins/validation';

// Schemas
const idParams = z.object({
  id: objectIdSchema,
});

const ruleListQuery = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  status: z.enum(['ACTIVE', 'ARCHIVED', 'DRAFT']).optional(),
  jurisdiction: z.string().optional(),
  productType: z.string().optional(),
  documentType: z.string().optional(),
  severity: z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']).optional(),
  search: z.string().optional(),
});

const ruleCondition = z.object({
  field: z.string().min(1).max(100),
  operator: z.enum(['equals', 'not_equals', 'contains', 'not_contains', 'greater_than', 'less_than', 'regex', 'exists', 'not_exists']),
  value: z.union([z.string(), z.number(), z.boolean(), z.null()]),
  valueType: z.enum(['string', 'number', 'boolean', 'date', 'array']).optional(),
});

const createRuleBody = z.object({
  name: z.string().min(3).max(100),
  description: z.string().max(1000),
  jurisdiction: z.array(z.string()).min(1),
  productTypes: z.array(z.string()).optional(),
  documentTypes: z.array(z.string()).optional(),
  conditions: z.array(ruleCondition).min(1),
  severity: z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']),
  failureMessage: z.string().min(10).max(500),
  effectiveDate: z.string().datetime(),
  expirationDate: z.string().datetime().optional(),
  tags: z.array(z.string()).optional(),
  metadata: z.record(z.unknown()).optional(),
});

const updateRuleBody = createRuleBody.partial().extend({
  changeReason: z.string().min(10).max(500),
});

const archiveRuleBody = z.object({
  reason: z.string().min(10).max(500),
  replacedBy: objectIdSchema.optional(),
});

// Helper functions
async function proxyToService(
  request: FastifyRequest,
  reply: FastifyReply,
  serviceUrl: string,
  method: string,
  path: string,
  body?: unknown
) {
  const headers = injectAdminContext(request);
  headers['Content-Type'] = 'application/json';
  
  const response = await fetch(`${serviceUrl}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });
  
  const data = await response.json();
  return reply.status(response.status).send(data);
}

function buildQueryString(query: Record<string, unknown>): string {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(query)) {
    if (value !== undefined && value !== null) {
      params.append(key, String(value));
    }
  }
  const qs = params.toString();
  return qs ? `?${qs}` : '';
}

export async function adminRulesRoutes(app: FastifyInstance) {
  // ============================================
  // RULES LISTING & VIEWING
  // ============================================
  
  /**
   * GET /admin/rules
   * List compliance rules
   * Permission: rules.read
   */
  app.get('/admin/rules', {
    preHandler: AdminGuards.canReadRules,
    preValidation: validateRequest({ query: ruleListQuery }),
  }, async (request, reply) => {
    const qs = buildQueryString(request.query as Record<string, unknown>);
    return proxyToService(request, reply, services.compliance, 'GET', `/admin/rules${qs}`);
  });
  
  /**
   * GET /admin/rules/:id
   * Get rule details
   * Permission: rules.read
   */
  app.get<{ Params: { id: string } }>('/admin/rules/:id', {
    preHandler: AdminGuards.canReadRules,
    preValidation: validateRequest({ params: idParams }),
  }, async (request, reply) => {
    return proxyToService(request, reply, services.compliance, 'GET', `/admin/rules/${request.params.id}`);
  });
  
  /**
   * GET /admin/rules/:id/versions
   * Get all versions of a rule
   * Permission: rules.read + rules.history
   */
  app.get<{ Params: { id: string } }>('/admin/rules/:id/versions', {
    preHandler: requireAdminPermissions([AdminPermission.RULES_READ, AdminPermission.RULES_HISTORY], true),
    preValidation: validateRequest({ params: idParams }),
  }, async (request, reply) => {
    return proxyToService(request, reply, services.compliance, 'GET', `/admin/rules/${request.params.id}/versions`);
  });
  
  /**
   * GET /admin/rules/:id/usage
   * Get where rule is being used
   * Permission: rules.read
   */
  app.get<{ Params: { id: string } }>('/admin/rules/:id/usage', {
    preHandler: AdminGuards.canReadRules,
    preValidation: validateRequest({ params: idParams }),
  }, async (request, reply) => {
    return proxyToService(request, reply, services.compliance, 'GET', `/admin/rules/${request.params.id}/usage`);
  });
  
  // ============================================
  // RULES MANAGEMENT (ADMIN only)
  // ============================================
  
  /**
   * POST /admin/rules
   * Create new compliance rule
   * Permission: rules.create (ADMIN only)
   */
  app.post<{ Body: z.infer<typeof createRuleBody> }>('/admin/rules', {
    preHandler: AdminGuards.canCreateRules,
    preValidation: validateRequest({ body: createRuleBody }),
  }, async (request, reply) => {
    const adminUser = request.adminUser;
    
    // Log rule creation
    request.log.info({
      event: 'RULE_CREATE',
      adminId: adminUser?.id,
      adminRole: adminUser?.role,
      ruleName: request.body.name,
      jurisdiction: request.body.jurisdiction,
      effectiveDate: request.body.effectiveDate,
    }, 'Creating new compliance rule');
    
    return proxyToService(request, reply, services.compliance, 'POST', '/admin/rules', {
      ...request.body,
      version: 1,
      status: 'ACTIVE',
      createdBy: adminUser?.id,
      createdAt: new Date().toISOString(),
    });
  });
  
  /**
   * PUT /admin/rules/:id
   * Update rule (creates new version)
   * Permission: rules.update (ADMIN only)
   */
  app.put<{ Params: { id: string }; Body: z.infer<typeof updateRuleBody> }>('/admin/rules/:id', {
    preHandler: AdminGuards.canUpdateRules,
    preValidation: validateRequest({ params: idParams, body: updateRuleBody }),
  }, async (request, reply) => {
    const adminUser = request.adminUser;
    
    // Log rule update
    request.log.warn({
      event: 'RULE_UPDATE',
      adminId: adminUser?.id,
      adminRole: adminUser?.role,
      ruleId: request.params.id,
      changeReason: request.body.changeReason,
    }, 'Updating compliance rule');
    
    return proxyToService(request, reply, services.compliance, 'PUT', `/admin/rules/${request.params.id}`, {
      ...request.body,
      updatedBy: adminUser?.id,
      updatedAt: new Date().toISOString(),
    });
  });
  
  /**
   * POST /admin/rules/:id/archive
   * Archive a rule (soft delete)
   * Permission: rules.archive (ADMIN only)
   */
  app.post<{ Params: { id: string }; Body: z.infer<typeof archiveRuleBody> }>('/admin/rules/:id/archive', {
    preHandler: requireAdminPermissions([AdminPermission.RULES_ARCHIVE]),
    preValidation: validateRequest({ params: idParams, body: archiveRuleBody }),
  }, async (request, reply) => {
    const adminUser = request.adminUser;
    
    // Log rule archival
    request.log.warn({
      event: 'RULE_ARCHIVE',
      adminId: adminUser?.id,
      adminRole: adminUser?.role,
      ruleId: request.params.id,
      reason: request.body.reason,
      replacedBy: request.body.replacedBy,
    }, 'Archiving compliance rule');
    
    return proxyToService(request, reply, services.compliance, 'POST', `/admin/rules/${request.params.id}/archive`, {
      ...request.body,
      archivedBy: adminUser?.id,
      archivedAt: new Date().toISOString(),
    });
  });
  
  /**
   * POST /admin/rules/:id/duplicate
   * Duplicate a rule as starting point
   * Permission: rules.create (ADMIN only)
   */
  app.post<{ Params: { id: string } }>('/admin/rules/:id/duplicate', {
    preHandler: AdminGuards.canCreateRules,
    preValidation: validateRequest({ params: idParams }),
  }, async (request, reply) => {
    return proxyToService(request, reply, services.compliance, 'POST', `/admin/rules/${request.params.id}/duplicate`, {
      createdBy: request.adminUser?.id,
    });
  });
  
  // ============================================
  // RULES TESTING
  // ============================================
  
  /**
   * POST /admin/rules/:id/test
   * Test rule against sample data
   * Permission: rules.read
   */
  app.post<{ Params: { id: string } }>('/admin/rules/:id/test', {
    preHandler: AdminGuards.canReadRules,
    preValidation: validateRequest({ params: idParams }),
  }, async (request, reply) => {
    return proxyToService(request, reply, services.compliance, 'POST', `/admin/rules/${request.params.id}/test`, request.body);
  });
  
  /**
   * POST /admin/rules/validate
   * Validate rule definition without saving
   * Permission: rules.create
   */
  app.post<{ Body: z.infer<typeof createRuleBody> }>('/admin/rules/validate', {
    preHandler: AdminGuards.canCreateRules,
    preValidation: validateRequest({ body: createRuleBody }),
  }, async (request, reply) => {
    return proxyToService(request, reply, services.compliance, 'POST', '/admin/rules/validate', request.body);
  });
  
  // ============================================
  // RULES STATISTICS
  // ============================================
  
  /**
   * GET /admin/rules/stats
   * Get rules statistics
   * Permission: rules.read
   */
  app.get('/admin/rules/stats', {
    preHandler: AdminGuards.canReadRules,
  }, async (request, reply) => {
    return proxyToService(request, reply, services.compliance, 'GET', '/admin/rules/stats');
  });
  
  /**
   * GET /admin/rules/jurisdictions
   * Get available jurisdictions
   * Permission: rules.read
   */
  app.get('/admin/rules/jurisdictions', {
    preHandler: AdminGuards.canReadRules,
  }, async (request, reply) => {
    return proxyToService(request, reply, services.compliance, 'GET', '/admin/rules/jurisdictions');
  });
}
