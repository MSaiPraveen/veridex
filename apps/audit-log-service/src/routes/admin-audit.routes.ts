import { FastifyInstance, FastifyRequest, FastifyReply, preHandlerHookHandler } from 'fastify';
import { AdminAuditLogService } from '../services/admin-audit-log.service';
import { z } from 'zod';
import { AdminAuditAction, AdminAuditEntityType, AdminAuditSeverity, AdminReasonCode } from '../domain/admin-audit-log.entity';

// Validation schemas
const recordAuditSchema = z.object({
  adminId: z.string().min(1),
  adminEmail: z.string().email(),
  adminRole: z.string().min(1),
  action: z.string() as z.ZodType<AdminAuditAction>,
  entityType: z.string() as z.ZodType<AdminAuditEntityType>,
  entityId: z.string().min(1),
  entityName: z.string().optional(),
  severity: z.enum(['INFO', 'WARNING', 'CRITICAL', 'SECURITY']).optional(),
  reasonCode: z.string() as z.ZodType<AdminReasonCode>,
  reasonDetails: z.string().max(2000).optional(),
  ipAddress: z.string().min(1),
  userAgent: z.string().optional(),
  requestId: z.string().optional(),
  sessionId: z.string().optional(),
  previousState: z.record(z.unknown()).optional(),
  newState: z.record(z.unknown()).optional(),
  metadata: z.record(z.unknown()).optional(),
  success: z.boolean().optional(),
  errorCode: z.string().optional(),
  errorMessage: z.string().optional(),
  duration: z.number().optional(),
});

const querySchema = z.object({
  adminId: z.string().optional(),
  action: z.string().optional(),
  entityType: z.string().optional(),
  entityId: z.string().optional(),
  severity: z.enum(['INFO', 'WARNING', 'CRITICAL', 'SECURITY']).optional(),
  reasonCode: z.string().optional(),
  fromDate: z.string().optional(),
  toDate: z.string().optional(),
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(100).default(50),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
});

const idParamSchema = z.object({
  id: z.string().min(1),
});

const entityParamsSchema = z.object({
  entityType: z.string().min(1),
  entityId: z.string().min(1),
});

const searchSchema = z.object({
  q: z.string().min(1),
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(100).default(50),
});

function validate<T>(schema: z.ZodType<T>, data: unknown): T {
  return schema.parse(data);
}

// Admin authentication middleware (simplified - actual implementation in gateway)
const requireAdminAuth = async (req: FastifyRequest, reply: FastifyReply) => {
  const adminId = req.headers['x-admin-id'];
  const adminRole = req.headers['x-admin-role'];
  
  if (!adminId || !adminRole) {
    return reply.status(401).send({
      success: false,
      error: { code: 'UNAUTHORIZED', message: 'Admin authentication required' }
    });
  }
  
  // Attach admin context to request
  (req as any).adminContext = { adminId, adminRole };
};

// Super admin only middleware
const requireSuperAdmin = async (req: FastifyRequest, reply: FastifyReply) => {
  await requireAdminAuth(req, reply);
  
  const adminRole = req.headers['x-admin-role'];
  if (adminRole !== 'SUPER_ADMIN') {
    return reply.status(403).send({
      success: false,
      error: { code: 'FORBIDDEN', message: 'Super admin access required' }
    });
  }
};

export async function adminAuditRoutes(app: FastifyInstance) {
  // Record admin audit log (internal use - called from other services)
  app.post('/admin-audit', async (req: FastifyRequest, reply: FastifyReply) => {
    // Verify internal service call
    const callerType = req.headers['x-caller-type'];
    if (callerType !== 'SERVICE' && callerType !== 'ADMIN_GATEWAY') {
      return reply.status(403).send({
        success: false,
        error: { code: 'FORBIDDEN', message: 'Service-to-service call required' }
      });
    }

    const input = validate(recordAuditSchema, req.body);
    
    const auditLog = await AdminAuditLogService.record({
      ...input,
      action: input.action as AdminAuditAction,
      entityType: input.entityType as AdminAuditEntityType,
      severity: input.severity as AdminAuditSeverity | undefined,
      reasonCode: input.reasonCode as AdminReasonCode,
    });

    return reply.status(201).send({
      success: true,
      data: auditLog,
    });
  });

  // Get all admin audit logs (Super Admin only)
  app.get('/admin-audit', { preHandler: requireSuperAdmin }, async (req, reply) => {
    const query = validate(querySchema, req.query);
    
    const result = await AdminAuditLogService.findAll({
      adminId: query.adminId,
      action: query.action as AdminAuditAction | undefined,
      entityType: query.entityType as AdminAuditEntityType | undefined,
      entityId: query.entityId,
      severity: query.severity,
      reasonCode: query.reasonCode,
      fromDate: query.fromDate ? new Date(query.fromDate) : undefined,
      toDate: query.toDate ? new Date(query.toDate) : undefined,
      page: query.page,
      limit: query.limit,
      sortOrder: query.sortOrder,
    });

    return reply.send({
      success: true,
      ...result,
    });
  });

  // Get single admin audit log (Admin only)
  app.get('/admin-audit/:id', { preHandler: requireAdminAuth }, async (req, reply) => {
    const { id } = validate(idParamSchema, req.params);
    const auditLog = await AdminAuditLogService.getById(id);
    
    return reply.send({
      success: true,
      data: auditLog,
    });
  });

  // Get audit logs for a specific entity
  app.get('/admin-audit/entity/:entityType/:entityId', { preHandler: requireAdminAuth }, async (req, reply) => {
    const { entityType, entityId } = validate(entityParamsSchema, req.params);
    const auditLogs = await AdminAuditLogService.getByEntity(entityType as AdminAuditEntityType, entityId);
    
    return reply.send({
      success: true,
      data: auditLogs,
    });
  });

  // Get entity timeline
  app.get('/admin-audit/timeline/:entityType/:entityId', { preHandler: requireAdminAuth }, async (req, reply) => {
    const { entityType, entityId } = validate(entityParamsSchema, req.params);
    const timeline = await AdminAuditLogService.getEntityTimeline(entityType as AdminAuditEntityType, entityId);
    
    return reply.send({
      success: true,
      data: timeline,
    });
  });

  // Get security alerts (Super Admin only)
  app.get('/admin-audit/security-alerts', { preHandler: requireSuperAdmin }, async (req, reply) => {
    const days = (req.query as { days?: string }).days ? parseInt((req.query as { days?: string }).days!, 10) : 7;
    const alerts = await AdminAuditLogService.getSecurityAlerts(days);
    
    return reply.send({
      success: true,
      data: alerts,
    });
  });

  // Get failed actions (Super Admin only)
  app.get('/admin-audit/failed-actions', { preHandler: requireSuperAdmin }, async (req, reply) => {
    const days = (req.query as { days?: string }).days ? parseInt((req.query as { days?: string }).days!, 10) : 7;
    const failedActions = await AdminAuditLogService.getFailedActions(days);
    
    return reply.send({
      success: true,
      data: failedActions,
    });
  });

  // Get statistics (Super Admin only)
  app.get('/admin-audit/stats', { preHandler: requireSuperAdmin }, async (req, reply) => {
    const days = (req.query as { days?: string }).days ? parseInt((req.query as { days?: string }).days!, 10) : 30;
    const stats = await AdminAuditLogService.getStats(days);
    
    return reply.send({
      success: true,
      data: stats,
    });
  });

  // Search audit logs (Admin only)
  app.get('/admin-audit/search', { preHandler: requireAdminAuth }, async (req, reply) => {
    const { q, page, limit } = validate(searchSchema, req.query);
    const result = await AdminAuditLogService.search(q, { page, limit });
    
    return reply.send({
      success: true,
      ...result,
    });
  });

  // Export audit logs (Super Admin only - sensitive operation)
  app.get('/admin-audit/export', { preHandler: requireSuperAdmin }, async (req, reply) => {
    const query = validate(querySchema, req.query);
    
    // Log the export action itself
    const adminContext = (req as any).adminContext;
    await AdminAuditLogService.record({
      adminId: adminContext.adminId,
      adminEmail: req.headers['x-admin-email'] as string || 'unknown',
      adminRole: adminContext.adminRole,
      action: 'AUDIT_EXPORT',
      entityType: 'SYSTEM',
      entityId: 'admin-audit-logs',
      reasonCode: 'ROUTINE_REVIEW',
      reasonDetails: `Exported audit logs with filters: ${JSON.stringify(query)}`,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
      requestId: req.id as string,
    });
    
    const data = await AdminAuditLogService.exportLogs({
      adminId: query.adminId,
      action: query.action as AdminAuditAction | undefined,
      entityType: query.entityType as AdminAuditEntityType | undefined,
      entityId: query.entityId,
      severity: query.severity,
      fromDate: query.fromDate ? new Date(query.fromDate) : undefined,
      toDate: query.toDate ? new Date(query.toDate) : undefined,
    });
    
    return reply.send({
      success: true,
      data,
      count: data.length,
    });
  });

  // Health check
  app.get('/admin-audit/health', async (_req, reply) => {
    return reply.send({ 
      status: 'healthy', 
      service: 'admin-audit-log-service',
      timestamp: new Date().toISOString(),
    });
  });
}
