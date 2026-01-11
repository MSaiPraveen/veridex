/**
 * Admin Workflow Routes
 * 
 * API Gateway routes for the compliance workflow engine.
 * Proxies requests to the compliance service workflow endpoints.
 */

import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';
import { services } from '../config/services';
import { AdminGuards, AdminPermission, requireAdminPermissions, injectAdminContext } from '../auth/admin-permission-guard';
import { validateRequest, objectIdSchema } from '../plugins/validation';

// ===================
// Schemas
// ===================

const idParams = z.object({
  id: objectIdSchema,
});

const entityParams = z.object({
  entityType: z.enum(['DOCUMENT', 'PRODUCT', 'BATCH', 'ORGANIZATION']),
  entityId: objectIdSchema,
});

const workflowListQuery = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  state: z.string().optional(), // Comma-separated states
  entityType: z.enum(['DOCUMENT', 'PRODUCT', 'BATCH', 'ORGANIZATION']).optional(),
  organizationId: objectIdSchema.optional(),
  assignedTo: objectIdSchema.optional(),
  priority: z.string().optional(), // Comma-separated priorities
  slaStatus: z.string().optional(), // Comma-separated statuses
  isEscalated: z.enum(['true', 'false']).optional(),
  unassignedOnly: z.enum(['true', 'false']).optional(),
  needsReviewOnly: z.enum(['true', 'false']).optional(),
  hasCriticalFailures: z.enum(['true', 'false']).optional(),
  sortBy: z.enum(['submittedAt', 'priority', 'dueDate', 'state', 'updatedAt']).default('submittedAt'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
});

const queueQuery = z.object({
  assignedTo: objectIdSchema.optional(),
  priority: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(100).default(50),
});

const createWorkflowBody = z.object({
  entityType: z.enum(['DOCUMENT', 'PRODUCT', 'BATCH', 'ORGANIZATION']),
  entityId: objectIdSchema,
  entityName: z.string().min(1).max(255),
  organizationId: objectIdSchema,
  documentType: z.string().optional(),
  extractedData: z.record(z.unknown()).optional(),
  dueDate: z.string().datetime().optional(),
  metadata: z.record(z.unknown()).optional(),
  tags: z.array(z.string()).optional(),
});

const decisionBody = z.object({
  action: z.enum(['APPROVE', 'REJECT', 'OVERRIDE', 'REQUEST_INFO', 'ESCALATE']),
  reasonCode: z.string().min(1),
  reasonDetails: z.string().min(1),
  notes: z.string().optional(),
  conditions: z.array(z.string()).optional(),
});

const assignBody = z.object({
  assignedTo: objectIdSchema,
});

const escalateBody = z.object({
  reason: z.string().min(10),
});

const autoCheckBody = z.object({
  documentType: z.string().min(1),
  extractedData: z.record(z.unknown()),
});

const reviewerWorkloadQuery = z.object({
  adminIds: z.string().min(24), // Comma-separated IDs
});

// ===================
// Helpers
// ===================

async function proxyToWorkflowService(
  request: FastifyRequest,
  reply: FastifyReply,
  method: string,
  path: string,
  body?: unknown
) {
  const headers = injectAdminContext(request);
  headers['Content-Type'] = 'application/json';
  
  const serviceUrl = services.compliance;
  
  const response = await fetch(`${serviceUrl}/admin/workflows${path}`, {
    method,
    headers: headers as Record<string, string>,
    body: body ? JSON.stringify(body) : undefined,
  });
  
  const data = await response.json();
  return reply.status(response.status).send(data);
}

function buildQueryString(query: Record<string, unknown>): string {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(query)) {
    if (value !== undefined && value !== null && value !== '') {
      params.append(key, String(value));
    }
  }
  const str = params.toString();
  return str ? `?${str}` : '';
}

// ===================
// Routes
// ===================

export async function adminWorkflowRoutes(fastify: FastifyInstance): Promise<void> {
  
  // ===================
  // Queue & Statistics
  // ===================

  /**
   * GET /admin/workflows/queue
   * Get the review queue - items needing attention
   */
  fastify.get(
    '/queue',
    {
      preHandler: [
        AdminGuards.verifyToken,
        requireAdminPermissions([AdminPermission.COMPLIANCE_READ]),
      ],
    },
    async (request, reply) => {
      const query = queueQuery.parse(request.query);
      const queryString = buildQueryString(query);
      return proxyToWorkflowService(request, reply, 'GET', `/queue${queryString}`);
    }
  );

  /**
   * GET /admin/workflows/stats
   * Get queue statistics
   */
  fastify.get(
    '/stats',
    {
      preHandler: [
        AdminGuards.verifyToken,
        requireAdminPermissions([AdminPermission.COMPLIANCE_READ]),
      ],
    },
    async (request, reply) => {
      const query = request.query as Record<string, string>;
      const queryString = query.organizationId ? `?organizationId=${query.organizationId}` : '';
      return proxyToWorkflowService(request, reply, 'GET', `/stats${queryString}`);
    }
  );

  /**
   * GET /admin/workflows/reviewer-workload
   * Get workload distribution for reviewers
   */
  fastify.get(
    '/reviewer-workload',
    {
      preHandler: [
        AdminGuards.verifyToken,
        requireAdminPermissions([AdminPermission.ADMIN_READ]),
      ],
    },
    async (request, reply) => {
      const query = reviewerWorkloadQuery.parse(request.query);
      return proxyToWorkflowService(request, reply, 'GET', `/reviewer-workload?adminIds=${query.adminIds}`);
    }
  );

  /**
   * GET /admin/workflows/reason-codes
   * Get valid reason codes for decisions
   */
  fastify.get(
    '/reason-codes',
    {
      preHandler: [
        AdminGuards.verifyToken,
        requireAdminPermissions([AdminPermission.COMPLIANCE_READ]),
      ],
    },
    async (request, reply) => {
      return proxyToWorkflowService(request, reply, 'GET', '/reason-codes');
    }
  );

  // ===================
  // CRUD Operations
  // ===================

  /**
   * POST /admin/workflows
   * Create a new workflow item
   */
  fastify.post(
    '/',
    {
      preHandler: [
        AdminGuards.verifyToken,
        requireAdminPermissions([AdminPermission.COMPLIANCE_MANAGE]),
      ],
    },
    async (request, reply) => {
      const body = createWorkflowBody.parse(request.body);
      return proxyToWorkflowService(request, reply, 'POST', '', body);
    }
  );

  /**
   * GET /admin/workflows
   * List workflows with filtering
   */
  fastify.get(
    '/',
    {
      preHandler: [
        AdminGuards.verifyToken,
        requireAdminPermissions([AdminPermission.COMPLIANCE_READ]),
      ],
    },
    async (request, reply) => {
      const query = workflowListQuery.parse(request.query);
      const queryString = buildQueryString(query);
      return proxyToWorkflowService(request, reply, 'GET', queryString);
    }
  );

  /**
   * GET /admin/workflows/:id
   * Get workflow by ID
   */
  fastify.get(
    '/:id',
    {
      preHandler: [
        AdminGuards.verifyToken,
        requireAdminPermissions([AdminPermission.COMPLIANCE_READ]),
      ],
    },
    async (request, reply) => {
      const params = idParams.parse(request.params);
      return proxyToWorkflowService(request, reply, 'GET', `/${params.id}`);
    }
  );

  /**
   * GET /admin/workflows/entity/:entityType/:entityId
   * Get workflow by entity
   */
  fastify.get(
    '/entity/:entityType/:entityId',
    {
      preHandler: [
        AdminGuards.verifyToken,
        requireAdminPermissions([AdminPermission.COMPLIANCE_READ]),
      ],
    },
    async (request, reply) => {
      const params = entityParams.parse(request.params);
      return proxyToWorkflowService(request, reply, 'GET', `/entity/${params.entityType}/${params.entityId}`);
    }
  );

  /**
   * GET /admin/workflows/:id/history
   * Get workflow history
   */
  fastify.get(
    '/:id/history',
    {
      preHandler: [
        AdminGuards.verifyToken,
        requireAdminPermissions([AdminPermission.COMPLIANCE_READ]),
      ],
    },
    async (request, reply) => {
      const params = idParams.parse(request.params);
      return proxyToWorkflowService(request, reply, 'GET', `/${params.id}/history`);
    }
  );

  // ===================
  // Review Actions
  // ===================

  /**
   * POST /admin/workflows/:id/start-review
   * Start reviewing a workflow (locks it)
   */
  fastify.post(
    '/:id/start-review',
    {
      preHandler: [
        AdminGuards.verifyToken,
        requireAdminPermissions([AdminPermission.COMPLIANCE_REVIEW]),
      ],
    },
    async (request, reply) => {
      const params = idParams.parse(request.params);
      return proxyToWorkflowService(request, reply, 'POST', `/${params.id}/start-review`);
    }
  );

  /**
   * POST /admin/workflows/:id/decision
   * Submit a decision on a workflow
   */
  fastify.post(
    '/:id/decision',
    {
      preHandler: [
        AdminGuards.verifyToken,
        requireAdminPermissions([AdminPermission.COMPLIANCE_REVIEW]),
      ],
    },
    async (request, reply) => {
      const params = idParams.parse(request.params);
      const body = decisionBody.parse(request.body);
      
      // Check for override permission
      if (body.action === 'OVERRIDE') {
        // Additional permission check happens in the service, but we can pre-check here
        const adminRole = (request as unknown as { adminUser?: { role: string } }).adminUser?.role;
        if (adminRole !== 'ADMIN') {
          return reply.status(403).send({
            success: false,
            error: { code: 'FORBIDDEN', message: 'Override requires ADMIN role' },
          });
        }
      }
      
      return proxyToWorkflowService(request, reply, 'POST', `/${params.id}/decision`, body);
    }
  );

  /**
   * POST /admin/workflows/:id/assign
   * Assign workflow to a reviewer
   */
  fastify.post(
    '/:id/assign',
    {
      preHandler: [
        AdminGuards.verifyToken,
        requireAdminPermissions([AdminPermission.ADMIN_MANAGE]),
      ],
    },
    async (request, reply) => {
      const params = idParams.parse(request.params);
      const body = assignBody.parse(request.body);
      return proxyToWorkflowService(request, reply, 'POST', `/${params.id}/assign`, body);
    }
  );

  /**
   * DELETE /admin/workflows/:id/assign
   * Unassign workflow
   */
  fastify.delete(
    '/:id/assign',
    {
      preHandler: [
        AdminGuards.verifyToken,
        requireAdminPermissions([AdminPermission.ADMIN_MANAGE]),
      ],
    },
    async (request, reply) => {
      const params = idParams.parse(request.params);
      return proxyToWorkflowService(request, reply, 'DELETE', `/${params.id}/assign`);
    }
  );

  /**
   * POST /admin/workflows/:id/escalate
   * Escalate for senior review
   */
  fastify.post(
    '/:id/escalate',
    {
      preHandler: [
        AdminGuards.verifyToken,
        requireAdminPermissions([AdminPermission.COMPLIANCE_REVIEW]),
      ],
    },
    async (request, reply) => {
      const params = idParams.parse(request.params);
      const body = escalateBody.parse(request.body);
      return proxyToWorkflowService(request, reply, 'POST', `/${params.id}/escalate`, body);
    }
  );

  /**
   * POST /admin/workflows/:id/lock
   * Lock workflow for exclusive review
   */
  fastify.post(
    '/:id/lock',
    {
      preHandler: [
        AdminGuards.verifyToken,
        requireAdminPermissions([AdminPermission.COMPLIANCE_REVIEW]),
      ],
    },
    async (request, reply) => {
      const params = idParams.parse(request.params);
      return proxyToWorkflowService(request, reply, 'POST', `/${params.id}/lock`);
    }
  );

  /**
   * DELETE /admin/workflows/:id/lock
   * Unlock workflow
   */
  fastify.delete(
    '/:id/lock',
    {
      preHandler: [
        AdminGuards.verifyToken,
        requireAdminPermissions([AdminPermission.COMPLIANCE_REVIEW]),
      ],
    },
    async (request, reply) => {
      const params = idParams.parse(request.params);
      return proxyToWorkflowService(request, reply, 'DELETE', `/${params.id}/lock`);
    }
  );

  /**
   * POST /admin/workflows/:id/auto-check
   * Run auto-check on workflow
   */
  fastify.post(
    '/:id/auto-check',
    {
      preHandler: [
        AdminGuards.verifyToken,
        requireAdminPermissions([AdminPermission.COMPLIANCE_MANAGE]),
      ],
    },
    async (request, reply) => {
      const params = idParams.parse(request.params);
      const body = autoCheckBody.parse(request.body);
      return proxyToWorkflowService(request, reply, 'POST', `/${params.id}/auto-check`, body);
    }
  );
}
