/**
 * Admin Audit Logs Routes
 * 
 * Admin API endpoints for viewing and exporting audit logs.
 * Audit logs are IMMUTABLE - no delete or update operations.
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

const auditListQuery = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(50),
  
  // Actor filters
  actorId: z.string().optional(),
  actorType: z.enum(['USER', 'ADMIN', 'SYSTEM', 'SERVICE']).optional(),
  actorRole: z.string().optional(),
  
  // Action filters
  eventType: z.string().optional(),
  action: z.string().optional(),
  
  // Entity filters
  entityType: z.enum([
    'ORGANIZATION', 'USER', 'PRODUCT', 'BATCH', 
    'DOCUMENT', 'COMPLIANCE', 'RULE', 'ADMIN_USER', 'SETTING'
  ]).optional(),
  entityId: z.string().optional(),
  
  // Time filters
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
  
  // Other filters
  ipAddress: z.string().optional(),
  sourceService: z.string().optional(),
  
  // Sorting
  sortBy: z.enum(['timestamp', 'eventType', 'entityType']).default('timestamp'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
});

const auditExportQuery = auditListQuery.extend({
  format: z.enum(['json', 'csv']).default('json'),
  includeStateChanges: z.boolean().default(false),
});

const auditSearchBody = z.object({
  query: z.string().min(3).max(200),
  filters: z.object({
    actorType: z.array(z.string()).optional(),
    entityType: z.array(z.string()).optional(),
    eventType: z.array(z.string()).optional(),
    dateRange: z.object({
      start: z.string().datetime(),
      end: z.string().datetime(),
    }).optional(),
  }).optional(),
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

export async function adminAuditLogsRoutes(app: FastifyInstance) {
  // ============================================
  // AUDIT LOG VIEWING
  // ============================================
  
  /**
   * GET /admin/audit-logs
   * List audit logs with filters
   * Permission: audit.read
   */
  app.get('/admin/audit-logs', {
    preHandler: AdminGuards.canReadAudit,
    preValidation: validateRequest({ query: auditListQuery }),
  }, async (request, reply) => {
    const qs = buildQueryString(request.query as Record<string, unknown>);
    return proxyToService(request, reply, services.audit, 'GET', `/admin/logs${qs}`);
  });
  
  /**
   * GET /admin/audit-logs/:id
   * Get single audit log entry
   * Permission: audit.read
   */
  app.get<{ Params: { id: string } }>('/admin/audit-logs/:id', {
    preHandler: AdminGuards.canReadAudit,
    preValidation: validateRequest({ params: idParams }),
  }, async (request, reply) => {
    return proxyToService(request, reply, services.audit, 'GET', `/admin/logs/${request.params.id}`);
  });
  
  /**
   * GET /admin/audit-logs/:id/details
   * Get audit log with full state changes (requires sensitive permission)
   * Permission: audit.sensitive
   */
  app.get<{ Params: { id: string } }>('/admin/audit-logs/:id/details', {
    preHandler: requireAdminPermissions([AdminPermission.AUDIT_SENSITIVE]),
    preValidation: validateRequest({ params: idParams }),
  }, async (request, reply) => {
    return proxyToService(request, reply, services.audit, 'GET', `/admin/logs/${request.params.id}/details`);
  });
  
  // ============================================
  // ENTITY AUDIT TRAILS
  // ============================================
  
  /**
   * GET /admin/audit-logs/entity/:entityType/:entityId
   * Get audit trail for specific entity
   * Permission: audit.read
   */
  app.get<{ Params: { entityType: string; entityId: string } }>('/admin/audit-logs/entity/:entityType/:entityId', {
    preHandler: AdminGuards.canReadAudit,
  }, async (request, reply) => {
    const { entityType, entityId } = request.params;
    return proxyToService(
      request, reply, services.audit, 'GET', 
      `/admin/logs?entityType=${entityType}&entityId=${entityId}&sortOrder=desc`
    );
  });
  
  /**
   * GET /admin/audit-logs/actor/:actorId
   * Get all actions by specific actor
   * Permission: audit.read
   */
  app.get<{ Params: { actorId: string } }>('/admin/audit-logs/actor/:actorId', {
    preHandler: AdminGuards.canReadAudit,
  }, async (request, reply) => {
    return proxyToService(
      request, reply, services.audit, 'GET',
      `/admin/logs?actorId=${request.params.actorId}&sortOrder=desc`
    );
  });
  
  // ============================================
  // AUDIT SEARCH
  // ============================================
  
  /**
   * POST /admin/audit-logs/search
   * Full-text search across audit logs
   * Permission: audit.read
   */
  app.post<{ Body: z.infer<typeof auditSearchBody> }>('/admin/audit-logs/search', {
    preHandler: AdminGuards.canReadAudit,
    preValidation: validateRequest({ body: auditSearchBody }),
  }, async (request, reply) => {
    // Log audit search
    request.log.info({
      event: 'AUDIT_SEARCH',
      adminId: request.adminUser?.id,
      searchQuery: request.body.query,
    });
    
    return proxyToService(request, reply, services.audit, 'POST', '/admin/logs/search', request.body);
  });
  
  // ============================================
  // AUDIT EXPORT
  // ============================================
  
  /**
   * GET /admin/audit-logs/export
   * Export audit logs (requires export permission)
   * Permission: audit.export
   */
  app.get('/admin/audit-logs/export', {
    preHandler: AdminGuards.canExportAudit,
    preValidation: validateRequest({ query: auditExportQuery }),
  }, async (request, reply) => {
    const adminUser = request.adminUser;
    
    // Log export action
    request.log.warn({
      event: 'AUDIT_EXPORT',
      adminId: adminUser?.id,
      adminRole: adminUser?.role,
      filters: request.query,
    }, 'Audit log export initiated');
    
    const qs = buildQueryString(request.query as Record<string, unknown>);
    return proxyToService(request, reply, services.audit, 'GET', `/admin/logs/export${qs}`);
  });
  
  /**
   * POST /admin/audit-logs/export/async
   * Request async export for large datasets
   * Permission: audit.export
   */
  app.post('/admin/audit-logs/export/async', {
    preHandler: AdminGuards.canExportAudit,
  }, async (request, reply) => {
    const adminUser = request.adminUser;
    
    request.log.warn({
      event: 'AUDIT_EXPORT_ASYNC',
      adminId: adminUser?.id,
      filters: request.body,
    }, 'Async audit export requested');
    
    return proxyToService(request, reply, services.audit, 'POST', '/admin/logs/export/async', {
      ...(request.body as Record<string, unknown>),
      requestedBy: adminUser?.id,
      requestedAt: new Date().toISOString(),
    });
  });
  
  // ============================================
  // AUDIT STATISTICS
  // ============================================
  
  /**
   * GET /admin/audit-logs/stats
   * Get audit log statistics
   * Permission: audit.read
   */
  app.get('/admin/audit-logs/stats', {
    preHandler: AdminGuards.canReadAudit,
  }, async (request, reply) => {
    return proxyToService(request, reply, services.audit, 'GET', '/admin/logs/stats');
  });
  
  /**
   * GET /admin/audit-logs/stats/events
   * Get event type distribution
   * Permission: audit.read
   */
  app.get('/admin/audit-logs/stats/events', {
    preHandler: AdminGuards.canReadAudit,
  }, async (request, reply) => {
    return proxyToService(request, reply, services.audit, 'GET', '/admin/logs/stats/events');
  });
  
  /**
   * GET /admin/audit-logs/stats/actors
   * Get most active actors
   * Permission: audit.read + audit.sensitive
   */
  app.get('/admin/audit-logs/stats/actors', {
    preHandler: requireAdminPermissions([AdminPermission.AUDIT_READ, AdminPermission.AUDIT_SENSITIVE], true),
  }, async (request, reply) => {
    return proxyToService(request, reply, services.audit, 'GET', '/admin/logs/stats/actors');
  });
  
  // ============================================
  // SECURITY ALERTS
  // ============================================
  
  /**
   * GET /admin/audit-logs/alerts
   * Get security-related audit events
   * Permission: audit.read + audit.sensitive
   */
  app.get('/admin/audit-logs/alerts', {
    preHandler: requireAdminPermissions([AdminPermission.AUDIT_READ, AdminPermission.AUDIT_SENSITIVE], true),
  }, async (request, reply) => {
    // Return security-sensitive events like failed logins, permission changes
    return proxyToService(request, reply, services.audit, 'GET', '/admin/logs/alerts');
  });
  
  /**
   * GET /admin/audit-logs/failed-logins
   * Get failed login attempts
   * Permission: audit.sensitive
   */
  app.get('/admin/audit-logs/failed-logins', {
    preHandler: requireAdminPermissions([AdminPermission.AUDIT_SENSITIVE]),
  }, async (request, reply) => {
    return proxyToService(
      request, reply, services.audit, 'GET',
      '/admin/logs?eventType=AUTH_LOGIN_FAILURE&sortOrder=desc&limit=100'
    );
  });
}
