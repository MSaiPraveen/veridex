/**
 * Admin Compliance Routes
 * 
 * Admin API endpoints for compliance review and management.
 * All routes require admin authentication and specific permissions.
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

const complianceQueueQuery = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  status: z.enum(['PENDING', 'AUTO_FAILED', 'NEEDS_REVIEW', 'APPROVED', 'REJECTED']).optional(),
  entityType: z.enum(['DOCUMENT', 'PRODUCT', 'BATCH', 'ORGANIZATION']).optional(),
  severity: z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']).optional(),
  assignedTo: z.string().optional(),
  sortBy: z.enum(['createdAt', 'severity', 'status']).default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).default('asc'),
});

const complianceDecisionBody = z.object({
  action: z.enum(['APPROVE', 'REJECT', 'REQUEST_RESUBMIT']),
  reasonCode: z.string().min(1).max(50),
  reasonDetails: z.string().max(2000),
  ruleReferences: z.array(z.string()).optional(),
  conditions: z.array(z.string()).optional(),
  internalNotes: z.string().max(2000).optional(),
});

const complianceOverrideBody = z.object({
  originalDecision: z.enum(['AUTO_FAILED', 'REJECTED']),
  newDecision: z.enum(['APPROVED', 'NEEDS_REVIEW']),
  reasonCode: z.string().min(1).max(50),
  reasonDetails: z.string().min(10).max(2000),
  ruleReferences: z.array(z.string()).min(1),
  justification: z.string().min(50).max(5000),
  riskAssessment: z.enum(['LOW', 'MEDIUM', 'HIGH']),
  expirationDate: z.string().datetime().optional(),
  conditions: z.array(z.string()).optional(),
});

const complianceAssignBody = z.object({
  assignTo: objectIdSchema,
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'URGENT']).optional(),
  notes: z.string().max(500).optional(),
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

export async function adminComplianceRoutes(app: FastifyInstance) {
  // ============================================
  // COMPLIANCE QUEUE
  // ============================================
  
  /**
   * GET /admin/compliance/queue
   * Get items pending compliance review
   * Permission: compliance.read
   */
  app.get('/admin/compliance/queue', {
    preHandler: AdminGuards.canReadCompliance,
    preValidation: validateRequest({ query: complianceQueueQuery }),
  }, async (request, reply) => {
    const qs = buildQueryString(request.query as Record<string, unknown>);
    return proxyToService(request, reply, services.compliance, 'GET', `/admin/queue${qs}`);
  });
  
  /**
   * GET /admin/compliance/queue/my-items
   * Get items assigned to current admin
   * Permission: compliance.review
   */
  app.get('/admin/compliance/queue/my-items', {
    preHandler: AdminGuards.canReviewCompliance,
  }, async (request, reply) => {
    const adminId = request.adminUser?.id;
    return proxyToService(request, reply, services.compliance, 'GET', `/admin/queue?assignedTo=${adminId}`);
  });
  
  /**
   * GET /admin/compliance/:id
   * Get compliance check details
   * Permission: compliance.read
   */
  app.get<{ Params: { id: string } }>('/admin/compliance/:id', {
    preHandler: AdminGuards.canReadCompliance,
    preValidation: validateRequest({ params: idParams }),
  }, async (request, reply) => {
    return proxyToService(request, reply, services.compliance, 'GET', `/admin/checks/${request.params.id}`);
  });
  
  /**
   * GET /admin/compliance/:id/history
   * Get compliance check history
   * Permission: compliance.read
   */
  app.get<{ Params: { id: string } }>('/admin/compliance/:id/history', {
    preHandler: AdminGuards.canReadCompliance,
    preValidation: validateRequest({ params: idParams }),
  }, async (request, reply) => {
    return proxyToService(request, reply, services.compliance, 'GET', `/admin/checks/${request.params.id}/history`);
  });
  
  /**
   * GET /admin/compliance/:id/rules-evaluated
   * Get rules that were evaluated
   * Permission: compliance.read + rules.read
   */
  app.get<{ Params: { id: string } }>('/admin/compliance/:id/rules-evaluated', {
    preHandler: requireAdminPermissions([AdminPermission.COMPLIANCE_READ, AdminPermission.RULES_READ], true),
    preValidation: validateRequest({ params: idParams }),
  }, async (request, reply) => {
    return proxyToService(request, reply, services.compliance, 'GET', `/admin/checks/${request.params.id}/rules`);
  });
  
  // ============================================
  // COMPLIANCE DECISIONS
  // ============================================
  
  /**
   * POST /admin/compliance/:id/decide
   * Make compliance decision (approve/reject)
   * Permission: compliance.approve OR compliance.reject
   */
  app.post<{ Params: { id: string }; Body: z.infer<typeof complianceDecisionBody> }>('/admin/compliance/:id/decide', {
    preHandler: requireAdminPermissions([AdminPermission.COMPLIANCE_APPROVE, AdminPermission.COMPLIANCE_REJECT]),
    preValidation: validateRequest({ params: idParams, body: complianceDecisionBody }),
  }, async (request, reply) => {
    const { action, reasonCode, reasonDetails, ruleReferences, conditions, internalNotes } = request.body;
    
    // Verify specific permission
    const user = (request as any).user;
    const isAdmin = user.role === 'ADMIN';
    
    if (action === 'APPROVE' && !isAdmin && !user.permissions?.includes(AdminPermission.COMPLIANCE_APPROVE)) {
      return reply.status(403).send({
        success: false,
        error: { code: 'PERMISSION_DENIED', message: 'Cannot approve compliance checks' },
      });
    }
    
    if (action === 'REJECT' && !isAdmin && !user.permissions?.includes(AdminPermission.COMPLIANCE_REJECT)) {
      return reply.status(403).send({
        success: false,
        error: { code: 'PERMISSION_DENIED', message: 'Cannot reject compliance checks' },
      });
    }
    
    return proxyToService(request, reply, services.compliance, 'POST', `/admin/checks/${request.params.id}/decide`, {
      action,
      reasonCode,
      reasonDetails,
      ruleReferences,
      conditions,
      internalNotes,
      decidedBy: request.adminUser?.id,
      decidedAt: new Date().toISOString(),
    });
  });
  
  /**
   * POST /admin/compliance/:id/override
   * Override automated compliance decision
   * Permission: compliance.override (ADMIN only)
   */
  app.post<{ Params: { id: string }; Body: z.infer<typeof complianceOverrideBody> }>('/admin/compliance/:id/override', {
    preHandler: AdminGuards.canOverrideCompliance,
    preValidation: validateRequest({ params: idParams, body: complianceOverrideBody }),
  }, async (request, reply) => {
    // This is a critical action - ensure it's logged extensively
    const adminUser = request.adminUser;
    
    request.log.warn({
      event: 'COMPLIANCE_OVERRIDE',
      adminId: adminUser?.id,
      adminRole: adminUser?.role,
      checkId: request.params.id,
      originalDecision: request.body.originalDecision,
      newDecision: request.body.newDecision,
      justification: request.body.justification,
    }, 'Compliance override initiated');
    
    return proxyToService(request, reply, services.compliance, 'POST', `/admin/checks/${request.params.id}/override`, {
      ...request.body,
      overriddenBy: adminUser?.id,
      overriddenAt: new Date().toISOString(),
    });
  });
  
  /**
   * POST /admin/compliance/:id/assign
   * Assign compliance check to reviewer
   * Permission: compliance.review
   */
  app.post<{ Params: { id: string }; Body: z.infer<typeof complianceAssignBody> }>('/admin/compliance/:id/assign', {
    preHandler: AdminGuards.canReviewCompliance,
    preValidation: validateRequest({ params: idParams, body: complianceAssignBody }),
  }, async (request, reply) => {
    return proxyToService(request, reply, services.compliance, 'POST', `/admin/checks/${request.params.id}/assign`, {
      ...request.body,
      assignedBy: request.adminUser?.id,
      assignedAt: new Date().toISOString(),
    });
  });
  
  // ============================================
  // COMPLIANCE STATISTICS
  // ============================================
  
  /**
   * GET /admin/compliance/stats
   * Get compliance statistics
   * Permission: compliance.read
   */
  app.get('/admin/compliance/stats', {
    preHandler: AdminGuards.canReadCompliance,
  }, async (request, reply) => {
    try {
      // Try to get real stats from compliance service
      const response = await fetch(`${services.compliance}/admin/stats`, {
        method: 'GET',
        headers: injectAdminContext(request),
      });
      
      if (response.ok) {
        const data = await response.json();
        return reply.send(data);
      }
      
      // Fallback: return zeros if compliance service doesn't have stats endpoint
      return reply.send({
        success: true,
        data: {
          pending: 0,
          approved: 0,
          rejected: 0,
          inReview: 0,
          totalReviewed: 0,
          averageReviewTime: '0h',
          slaComplianceRate: 100,
        }
      });
    } catch {
      // Return fallback stats on error
      return reply.send({
        success: true,
        data: {
          pending: 0,
          approved: 0,
          rejected: 0,
          inReview: 0,
          totalReviewed: 0,
          averageReviewTime: '0h',
          slaComplianceRate: 100,
        }
      });
    }
  });
  
  /**
   * GET /admin/compliance/stats/reviewer/:id
   * Get reviewer performance stats
   * Permission: compliance.read + admin.user.read
   */
  app.get<{ Params: { id: string } }>('/admin/compliance/stats/reviewer/:id', {
    preHandler: requireAdminPermissions([AdminPermission.COMPLIANCE_READ, AdminPermission.ADMIN_USER_READ], true),
    preValidation: validateRequest({ params: idParams }),
  }, async (request, reply) => {
    return proxyToService(request, reply, services.compliance, 'GET', `/admin/stats/reviewer/${request.params.id}`);
  });
  
  /**
   * GET /admin/compliance/dashboard
   * Get compliance dashboard data
   * Permission: compliance.read
   */
  app.get('/admin/compliance/dashboard', {
    preHandler: AdminGuards.canReadCompliance,
  }, async (request, reply) => {
    return proxyToService(request, reply, services.compliance, 'GET', '/admin/dashboard');
  });
}
