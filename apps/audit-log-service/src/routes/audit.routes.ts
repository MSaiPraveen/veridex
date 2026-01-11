import { FastifyInstance, FastifyRequest, FastifyReply, preHandlerHookHandler } from 'fastify';
import { AuditLogService } from '../services/audit-log.service';
import { validate, createAuditLogSchema, auditQuerySchema, idParamSchema } from '../schemas/audit.schemas';
import { z } from 'zod';
import { requireRole, requireAuth, getUserContext } from '@veridex/shared';

const resourceParamsSchema = z.object({
  resourceType: z.string().min(1),
  resourceId: z.string().min(1),
});

// Cast preHandler to fix Fastify type inference issues
const authRequired = requireAuth() as preHandlerHookHandler;
const adminOnly = requireRole(['ADMIN']) as preHandlerHookHandler;

export async function auditRoutes(app: FastifyInstance) {
  // Create audit log entry (internal services only - no auth as it comes from gateway)
  app.post('/audit', async (req: FastifyRequest, reply: FastifyReply) => {
    const input = validate(createAuditLogSchema, req.body);
    
    const auditLog = await AuditLogService.createFromEvent({
      ...input,
      ipAddress: input.ipAddress || req.ip,
      userAgent: input.userAgent || req.headers['user-agent'] as string,
      requestId: input.requestId || (req.id as string),
    });

    return reply.status(201).send(auditLog);
  });

  // Get all audit logs with filtering and pagination (Admin only)
  app.get('/audit', { preHandler: adminOnly }, async (req, reply) => {
    const query = validate(auditQuerySchema, req.query);
    const result = await AuditLogService.findAll(query);
    return reply.send(result);
  });

  // Get single audit log by ID (Admin only)
  app.get('/audit/:id', { preHandler: adminOnly }, async (req, reply) => {
    const { id } = validate(idParamSchema, req.params);
    const auditLog = await AuditLogService.getById(id);
    return reply.send(auditLog);
  });

  // Get audit logs for a specific resource (Admin only)
  app.get('/audit/resource/:resourceType/:resourceId', { preHandler: adminOnly }, async (req, reply) => {
    const { resourceType, resourceId } = validate(resourceParamsSchema, req.params);
    const auditLogs = await AuditLogService.getByResource(resourceType, resourceId);
    return reply.send(auditLogs);
  });

  // Get resource timeline (Admin only)
  app.get('/audit/timeline/:resourceType/:resourceId', { preHandler: adminOnly }, async (req, reply) => {
    const { resourceType, resourceId } = validate(resourceParamsSchema, req.params);
    const timeline = await AuditLogService.getResourceTimeline(resourceType, resourceId);
    return reply.send(timeline);
  });

  // Get audit logs for a specific actor (Admin or the actor themselves)
  app.get('/audit/actor/:actorId', { preHandler: authRequired }, async (req, reply) => {
    const { id: actorId } = validate(idParamSchema, { id: (req.params as { actorId: string }).actorId });
    const userContext = getUserContext(req);
    
    // Only admins can view other users' audit logs
    if (userContext?.role !== 'ADMIN' && userContext?.userId !== actorId) {
      return reply.status(403).send({
        success: false,
        error: { code: 'FORBIDDEN', message: 'You can only view your own audit logs' }
      });
    }
    
    const auditLogs = await AuditLogService.getByActor(actorId);
    return reply.send(auditLogs);
  });

  // Get audit statistics (Admin only)
  app.get('/audit/stats', { preHandler: adminOnly }, async (req, reply) => {
    const query = req.query as { organizationId?: string; days?: string };
    const organizationId = query.organizationId;
    const days = query.days ? parseInt(query.days, 10) : 30;
    
    const stats = await AuditLogService.getStats(organizationId, days);
    return reply.send(stats);
  });

  // Get activity trend (Admin only)
  app.get('/audit/trend', { preHandler: adminOnly }, async (req, reply) => {
    const query = req.query as { organizationId?: string; days?: string };
    const organizationId = query.organizationId;
    const days = query.days ? parseInt(query.days, 10) : 30;
    
    const trend = await AuditLogService.getActivityTrend(organizationId, days);
    return reply.send(trend);
  });

  // Health check (Public)
  app.get('/audit/health', async (_req: FastifyRequest, reply: FastifyReply) => {
    return reply.send({ status: 'healthy', service: 'audit-log-service' });
  });
}
