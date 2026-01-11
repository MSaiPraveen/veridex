import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';
import * as WorkflowService from '../services/workflow.service';
import { DECISION_REASON_CODES } from '../engine/workflow-state-machine';
import { AppError } from '../errors/service.errors';

// ===================
// Zod Schemas
// ===================

const WorkflowIdParamsSchema = z.object({
  id: z.string().length(24, 'Invalid workflow ID'),
});

const EntityParamsSchema = z.object({
  entityType: z.enum(['DOCUMENT', 'PRODUCT', 'BATCH', 'ORGANIZATION']),
  entityId: z.string().length(24, 'Invalid entity ID'),
});

const CreateWorkflowBodySchema = z.object({
  entityType: z.enum(['DOCUMENT', 'PRODUCT', 'BATCH', 'ORGANIZATION']),
  entityId: z.string().length(24),
  entityName: z.string().min(1).max(255),
  organizationId: z.string().length(24),
  documentType: z.string().optional(),
  extractedData: z.record(z.unknown()).optional(),
  dueDate: z.string().datetime().optional(),
  metadata: z.record(z.unknown()).optional(),
  tags: z.array(z.string()).optional(),
});

const ListWorkflowsQuerySchema = z.object({
  state: z.string().optional(),
  entityType: z.enum(['DOCUMENT', 'PRODUCT', 'BATCH', 'ORGANIZATION']).optional(),
  organizationId: z.string().optional(),
  assignedTo: z.string().optional(),
  priority: z.string().optional(),
  slaStatus: z.string().optional(),
  isEscalated: z.enum(['true', 'false']).optional(),
  unassignedOnly: z.enum(['true', 'false']).optional(),
  needsReviewOnly: z.enum(['true', 'false']).optional(),
  hasCriticalFailures: z.enum(['true', 'false']).optional(),
  page: z.string().regex(/^\d+$/).optional(),
  limit: z.string().regex(/^\d+$/).optional(),
  sortBy: z.enum(['submittedAt', 'priority', 'dueDate', 'state', 'updatedAt']).optional(),
  sortOrder: z.enum(['asc', 'desc']).optional(),
});

const SubmitDecisionBodySchema = z.object({
  action: z.enum(['APPROVE', 'REJECT', 'OVERRIDE', 'REQUEST_INFO', 'ESCALATE']),
  reasonCode: z.string().min(1),
  reasonDetails: z.string().min(1),
  notes: z.string().optional(),
  conditions: z.array(z.string()).optional(),
});

const AssignBodySchema = z.object({
  assignedTo: z.string().length(24, 'Invalid admin ID'),
});

const EscalateBodySchema = z.object({
  reason: z.string().min(10, 'Escalation reason must be at least 10 characters'),
});

const RunAutoCheckBodySchema = z.object({
  documentType: z.string().min(1),
  extractedData: z.record(z.unknown()),
});

// ===================
// Types
// ===================

interface AdminContext {
  adminId: string;
  adminEmail: string;
  adminRole: string;
}

// ===================
// Helper Functions
// ===================

function getAdminContext(request: FastifyRequest): AdminContext {
  // In production, this would come from verified JWT claims
  const adminId = request.headers['x-admin-id'] as string;
  const adminEmail = request.headers['x-admin-email'] as string;
  const adminRole = request.headers['x-admin-role'] as string;

  if (!adminId || !adminEmail || !adminRole) {
    throw new Error('Missing admin context headers');
  }

  return { adminId, adminEmail, adminRole };
}

function hasPermission(role: string, requiredPermissions: string[]): boolean {
  // Permission matrix - in production this would be from the RBAC package
  const rolePermissions: Record<string, string[]> = {
    SUPER_ADMIN: ['*'],
    ADMIN: [
      'compliance:read',
      'compliance:review',
      'compliance:override',
      'workflow:read',
      'workflow:manage',
      'workflow:assign',
    ],
    COMPLIANCE_REVIEWER: [
      'compliance:read',
      'compliance:review',
      'workflow:read',
      'workflow:manage',
    ],
    VIEWER: ['compliance:read', 'workflow:read'],
  };

  const permissions = rolePermissions[role] || [];
  if (permissions.includes('*')) return true;
  return requiredPermissions.every((p) => permissions.includes(p));
}

// ===================
// Routes
// ===================

export async function adminWorkflowRoutes(fastify: FastifyInstance): Promise<void> {
  // Error handler
  fastify.setErrorHandler((error, request, reply) => {
    if (error instanceof AppError) {
      return reply.status(error.statusCode).send({
        success: false,
        error: {
          code: error.code,
          message: error.message,
        },
      });
    }

    if (error instanceof z.ZodError) {
      return reply.status(400).send({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid request data',
          details: error.errors,
        },
      });
    }

    fastify.log.error(error);
    return reply.status(500).send({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'An unexpected error occurred',
      },
    });
  });

  // ===================
  // Queue & Stats
  // ===================

  /**
   * GET /admin/workflows/queue
   * Get the review queue
   */
  fastify.get('/queue', async (request, reply) => {
    const admin = getAdminContext(request);

    if (!hasPermission(admin.adminRole, ['workflow:read'])) {
      return reply.status(403).send({ success: false, error: { message: 'Insufficient permissions' } });
    }

    const query = request.query as Record<string, string>;
    const priority = query.priority?.split(',') as ('LOW' | 'MEDIUM' | 'HIGH' | 'URGENT')[] | undefined;
    const assignedTo = admin.adminRole === 'SUPER_ADMIN' || admin.adminRole === 'ADMIN'
      ? query.assignedTo
      : admin.adminId; // Non-admins only see their own queue

    const items = await WorkflowService.getReviewQueue({
      assignedTo,
      priority,
      limit: parseInt(query.limit || '50', 10),
    });

    return reply.send({ success: true, data: items });
  });

  /**
   * GET /admin/workflows/stats
   * Get queue statistics
   */
  fastify.get('/stats', async (request, reply) => {
    const admin = getAdminContext(request);

    if (!hasPermission(admin.adminRole, ['workflow:read'])) {
      return reply.status(403).send({ success: false, error: { message: 'Insufficient permissions' } });
    }

    const query = request.query as Record<string, string>;
    const stats = await WorkflowService.getQueueStats(query.organizationId);

    return reply.send({ success: true, data: stats });
  });

  /**
   * GET /admin/workflows/reviewer-workload
   * Get workload for reviewers
   */
  fastify.get('/reviewer-workload', async (request, reply) => {
    const admin = getAdminContext(request);

    if (!hasPermission(admin.adminRole, ['workflow:manage'])) {
      return reply.status(403).send({ success: false, error: { message: 'Insufficient permissions' } });
    }

    const query = request.query as Record<string, string>;
    const adminIds = query.adminIds?.split(',') || [];

    if (adminIds.length === 0) {
      return reply.status(400).send({
        success: false,
        error: { message: 'adminIds query parameter is required' },
      });
    }

    const workload = await WorkflowService.getReviewerWorkload(adminIds);

    return reply.send({ success: true, data: workload });
  });

  /**
   * GET /admin/workflows/reason-codes
   * Get valid reason codes for actions
   */
  fastify.get('/reason-codes', async (request, reply) => {
    return reply.send({
      success: true,
      data: DECISION_REASON_CODES,
    });
  });

  // ===================
  // CRUD Operations
  // ===================

  /**
   * POST /admin/workflows
   * Create a new workflow
   */
  fastify.post('/', async (request, reply) => {
    const admin = getAdminContext(request);

    if (!hasPermission(admin.adminRole, ['workflow:manage'])) {
      return reply.status(403).send({ success: false, error: { message: 'Insufficient permissions' } });
    }

    const body = CreateWorkflowBodySchema.parse(request.body);

    const workflow = await WorkflowService.createWorkflow({
      ...body,
      dueDate: body.dueDate ? new Date(body.dueDate) : undefined,
      extractedData: body.extractedData as Record<string, unknown> | undefined,
    });

    return reply.status(201).send({ success: true, data: workflow });
  });

  /**
   * GET /admin/workflows
   * List workflows with filters
   */
  fastify.get('/', async (request, reply) => {
    const admin = getAdminContext(request);

    if (!hasPermission(admin.adminRole, ['workflow:read'])) {
      return reply.status(403).send({ success: false, error: { message: 'Insufficient permissions' } });
    }

    const query = ListWorkflowsQuerySchema.parse(request.query);

    const options: Parameters<typeof WorkflowService.listWorkflows>[0] = {
      page: query.page ? parseInt(query.page, 10) : 1,
      limit: query.limit ? parseInt(query.limit, 10) : 20,
      sortBy: query.sortBy,
      sortOrder: query.sortOrder,
      entityType: query.entityType,
      organizationId: query.organizationId,
      isEscalated: query.isEscalated === 'true',
      unassignedOnly: query.unassignedOnly === 'true',
      needsReviewOnly: query.needsReviewOnly === 'true',
      hasCriticalFailures: query.hasCriticalFailures === 'true',
    };

    // Parse comma-separated values
    if (query.state) {
      options.state = query.state.split(',') as Parameters<typeof WorkflowService.listWorkflows>[0]['state'];
    }
    if (query.priority) {
      options.priority = query.priority.split(',') as ('LOW' | 'MEDIUM' | 'HIGH' | 'URGENT')[];
    }
    if (query.slaStatus) {
      options.slaStatus = query.slaStatus.split(',') as ('ON_TRACK' | 'AT_RISK' | 'BREACHED')[];
    }
    if (query.assignedTo) {
      options.assignedTo = query.assignedTo;
    }

    const result = await WorkflowService.listWorkflows(options);

    return reply.send({ success: true, data: result });
  });

  /**
   * GET /admin/workflows/:id
   * Get workflow by ID
   */
  fastify.get('/:id', async (request, reply) => {
    const admin = getAdminContext(request);

    if (!hasPermission(admin.adminRole, ['workflow:read'])) {
      return reply.status(403).send({ success: false, error: { message: 'Insufficient permissions' } });
    }

    const params = WorkflowIdParamsSchema.parse(request.params);
    const workflow = await WorkflowService.getWorkflowById(params.id);

    return reply.send({ success: true, data: workflow });
  });

  /**
   * GET /admin/workflows/entity/:entityType/:entityId
   * Get workflow by entity
   */
  fastify.get('/entity/:entityType/:entityId', async (request, reply) => {
    const admin = getAdminContext(request);

    if (!hasPermission(admin.adminRole, ['workflow:read'])) {
      return reply.status(403).send({ success: false, error: { message: 'Insufficient permissions' } });
    }

    const params = EntityParamsSchema.parse(request.params);
    const workflow = await WorkflowService.getWorkflowByEntity(params.entityType, params.entityId);

    if (!workflow) {
      return reply.status(404).send({
        success: false,
        error: { message: 'No workflow found for this entity' },
      });
    }

    return reply.send({ success: true, data: workflow });
  });

  /**
   * GET /admin/workflows/:id/history
   * Get workflow history
   */
  fastify.get('/:id/history', async (request, reply) => {
    const admin = getAdminContext(request);

    if (!hasPermission(admin.adminRole, ['workflow:read'])) {
      return reply.status(403).send({ success: false, error: { message: 'Insufficient permissions' } });
    }

    const params = WorkflowIdParamsSchema.parse(request.params);
    const history = await WorkflowService.getWorkflowHistory(params.id);

    return reply.send({ success: true, data: history });
  });

  // ===================
  // Review Actions
  // ===================

  /**
   * POST /admin/workflows/:id/start-review
   * Start reviewing a workflow
   */
  fastify.post('/:id/start-review', async (request, reply) => {
    const admin = getAdminContext(request);

    if (!hasPermission(admin.adminRole, ['workflow:manage'])) {
      return reply.status(403).send({ success: false, error: { message: 'Insufficient permissions' } });
    }

    const params = WorkflowIdParamsSchema.parse(request.params);
    const workflow = await WorkflowService.startReview(params.id, admin.adminId);

    return reply.send({ success: true, data: workflow });
  });

  /**
   * POST /admin/workflows/:id/decision
   * Submit a decision on a workflow
   */
  fastify.post('/:id/decision', async (request, reply) => {
    const admin = getAdminContext(request);

    const body = SubmitDecisionBodySchema.parse(request.body);

    // Check permissions based on action
    if (body.action === 'OVERRIDE' && !hasPermission(admin.adminRole, ['compliance:override'])) {
      return reply.status(403).send({
        success: false,
        error: { message: 'Override permission required' },
      });
    }

    if (!hasPermission(admin.adminRole, ['compliance:review'])) {
      return reply.status(403).send({ success: false, error: { message: 'Insufficient permissions' } });
    }

    const params = WorkflowIdParamsSchema.parse(request.params);

    const workflow = await WorkflowService.submitDecision(params.id, {
      adminId: admin.adminId,
      adminEmail: admin.adminEmail,
      adminRole: admin.adminRole,
      action: body.action,
      reasonCode: body.reasonCode,
      reasonDetails: body.reasonDetails,
      notes: body.notes,
      conditions: body.conditions,
      ipAddress: request.ip,
      userAgent: request.headers['user-agent'],
    });

    return reply.send({ success: true, data: workflow });
  });

  /**
   * POST /admin/workflows/:id/assign
   * Assign workflow to a reviewer
   */
  fastify.post('/:id/assign', async (request, reply) => {
    const admin = getAdminContext(request);

    if (!hasPermission(admin.adminRole, ['workflow:assign'])) {
      return reply.status(403).send({ success: false, error: { message: 'Insufficient permissions' } });
    }

    const params = WorkflowIdParamsSchema.parse(request.params);
    const body = AssignBodySchema.parse(request.body);

    const workflow = await WorkflowService.assignWorkflow({
      workflowId: params.id,
      assignedTo: body.assignedTo,
      assignedBy: admin.adminId,
    });

    return reply.send({ success: true, data: workflow });
  });

  /**
   * DELETE /admin/workflows/:id/assign
   * Unassign workflow from reviewer
   */
  fastify.delete('/:id/assign', async (request, reply) => {
    const admin = getAdminContext(request);

    if (!hasPermission(admin.adminRole, ['workflow:assign'])) {
      return reply.status(403).send({ success: false, error: { message: 'Insufficient permissions' } });
    }

    const params = WorkflowIdParamsSchema.parse(request.params);
    const workflow = await WorkflowService.unassignWorkflow(params.id);

    return reply.send({ success: true, data: workflow });
  });

  /**
   * POST /admin/workflows/:id/escalate
   * Escalate workflow for senior review
   */
  fastify.post('/:id/escalate', async (request, reply) => {
    const admin = getAdminContext(request);

    if (!hasPermission(admin.adminRole, ['workflow:manage'])) {
      return reply.status(403).send({ success: false, error: { message: 'Insufficient permissions' } });
    }

    const params = WorkflowIdParamsSchema.parse(request.params);
    const body = EscalateBodySchema.parse(request.body);

    const workflow = await WorkflowService.escalateWorkflow(params.id, admin.adminId, body.reason);

    return reply.send({ success: true, data: workflow });
  });

  /**
   * POST /admin/workflows/:id/lock
   * Lock workflow for exclusive review
   */
  fastify.post('/:id/lock', async (request, reply) => {
    const admin = getAdminContext(request);

    if (!hasPermission(admin.adminRole, ['workflow:manage'])) {
      return reply.status(403).send({ success: false, error: { message: 'Insufficient permissions' } });
    }

    const params = WorkflowIdParamsSchema.parse(request.params);
    const workflow = await WorkflowService.lockWorkflow(params.id, admin.adminId);

    return reply.send({ success: true, data: workflow });
  });

  /**
   * DELETE /admin/workflows/:id/lock
   * Unlock workflow
   */
  fastify.delete('/:id/lock', async (request, reply) => {
    const admin = getAdminContext(request);

    if (!hasPermission(admin.adminRole, ['workflow:manage'])) {
      return reply.status(403).send({ success: false, error: { message: 'Insufficient permissions' } });
    }

    const params = WorkflowIdParamsSchema.parse(request.params);
    const workflow = await WorkflowService.unlockWorkflow(params.id, admin.adminId);

    return reply.send({ success: true, data: workflow });
  });

  /**
   * POST /admin/workflows/:id/auto-check
   * Run auto-check on workflow
   */
  fastify.post('/:id/auto-check', async (request, reply) => {
    const admin = getAdminContext(request);

    if (!hasPermission(admin.adminRole, ['workflow:manage'])) {
      return reply.status(403).send({ success: false, error: { message: 'Insufficient permissions' } });
    }

    const params = WorkflowIdParamsSchema.parse(request.params);
    const body = RunAutoCheckBodySchema.parse(request.body);

    const workflow = await WorkflowService.runAutoCheck(
      params.id,
      body.documentType,
      body.extractedData as Record<string, unknown>
    );

    return reply.send({ success: true, data: workflow });
  });

  // ===================
  // Maintenance
  // ===================

  /**
   * POST /admin/workflows/update-sla
   * Update SLA statuses (internal/cron)
   */
  fastify.post('/update-sla', async (request, reply) => {
    // This should be called by internal cron, verify caller
    const callerType = request.headers['x-caller-type'];
    if (callerType !== 'INTERNAL') {
      return reply.status(403).send({
        success: false,
        error: { message: 'Internal access only' },
      });
    }

    const updated = await WorkflowService.updateSLAStatuses();

    return reply.send({ success: true, data: { updatedCount: updated } });
  });
}
