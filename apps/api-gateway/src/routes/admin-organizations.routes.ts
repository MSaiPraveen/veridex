/**
 * Admin Organizations Routes
 * 
 * Admin API endpoints for organization management.
 * All routes require admin authentication and specific permissions.
 */

import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';
import { services } from '../config/services';
import { AdminGuards, AdminPermission, requireAdminPermissions, injectAdminContext } from '../auth/admin-permission-guard';
import { validateRequest, objectIdSchema } from '../plugins/validation';

// Schemas
const orgIdParams = z.object({
  id: objectIdSchema,
});

const orgListQuery = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  status: z.enum(['PENDING', 'ACTIVE', 'SUSPENDED', 'REJECTED']).optional(),
  search: z.string().optional(),
  sortBy: z.enum(['createdAt', 'name', 'status']).default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
});

const orgReviewBody = z.object({
  action: z.enum(['APPROVE', 'REJECT']),
  reasonCode: z.string().min(1).max(50),
  reasonDetails: z.string().max(1000).optional(),
  conditions: z.array(z.string()).optional(),
});

const orgSuspendBody = z.object({
  reasonCode: z.string().min(1).max(50),
  reasonDetails: z.string().max(1000),
  suspensionType: z.enum(['TEMPORARY', 'PERMANENT']),
  reviewDate: z.string().datetime().optional(),
});

const orgReactivateBody = z.object({
  reasonCode: z.string().min(1).max(50),
  reasonDetails: z.string().max(1000).optional(),
  conditions: z.array(z.string()).optional(),
});

// Helper to proxy to service
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

export async function adminOrganizationRoutes(app: FastifyInstance) {
  /**
   * GET /admin/organizations
   * List organizations with filters
   * Permission: org.read
   */
  app.get('/admin/organizations', {
    preHandler: AdminGuards.canReadOrganizations,
    preValidation: validateRequest({ query: orgListQuery }),
  }, async (request, reply) => {
    const qs = buildQueryString(request.query as Record<string, unknown>);
    return proxyToService(request, reply, services.userOrg, 'GET', `/organizations${qs}`);
  });

  /**
   * GET /admin/organizations/:id
   * Get organization details
   * Permission: org.read
   */
  app.get<{ Params: { id: string } }>('/admin/organizations/:id', {
    preHandler: AdminGuards.canReadOrganizations,
    preValidation: validateRequest({ params: orgIdParams }),
  }, async (request, reply) => {
    return proxyToService(request, reply, services.userOrg, 'GET', `/organizations/${request.params.id}`);
  });

  /**
   * GET /admin/organizations/:id/documents
   * Get organization's documents
   * Permission: org.read + doc.read
   */
  app.get<{ Params: { id: string } }>('/admin/organizations/:id/documents', {
    preHandler: requireAdminPermissions([AdminPermission.ORG_READ, AdminPermission.DOC_READ], true),
    preValidation: validateRequest({ params: orgIdParams }),
  }, async (request, reply) => {
    return proxyToService(request, reply, services.document, 'GET', `/admin/organizations/${request.params.id}/documents`);
  });

  /**
   * GET /admin/organizations/:id/products
   * Get organization's products
   * Permission: org.read + product.read
   */
  app.get<{ Params: { id: string } }>('/admin/organizations/:id/products', {
    preHandler: requireAdminPermissions([AdminPermission.ORG_READ, AdminPermission.PRODUCT_READ], true),
    preValidation: validateRequest({ params: orgIdParams }),
  }, async (request, reply) => {
    return proxyToService(request, reply, services.product, 'GET', `/admin/organizations/${request.params.id}/products`);
  });

  /**
   * GET /admin/organizations/:id/compliance
   * Get organization's compliance status
   * Permission: org.read + compliance.read
   */
  app.get<{ Params: { id: string } }>('/admin/organizations/:id/compliance', {
    preHandler: requireAdminPermissions([AdminPermission.ORG_READ, AdminPermission.COMPLIANCE_READ], true),
    preValidation: validateRequest({ params: orgIdParams }),
  }, async (request, reply) => {
    return proxyToService(request, reply, services.compliance, 'GET', `/admin/organizations/${request.params.id}/compliance`);
  });

  /**
   * GET /admin/organizations/:id/audit-trail
   * Get organization's audit history
   * Permission: org.read + audit.read
   */
  app.get<{ Params: { id: string } }>('/admin/organizations/:id/audit-trail', {
    preHandler: requireAdminPermissions([AdminPermission.ORG_READ, AdminPermission.AUDIT_READ], true),
    preValidation: validateRequest({ params: orgIdParams }),
  }, async (request, reply) => {
    return proxyToService(request, reply, services.audit, 'GET', `/audit?entityType=ORGANIZATION&entityId=${request.params.id}`);
  });

  /**
   * POST /admin/organizations/:id/review
   * Approve or reject pending organization
   * Permission: org.approve OR org.reject
   */
  app.post<{ Params: { id: string }; Body: z.infer<typeof orgReviewBody> }>('/admin/organizations/:id/review', {
    preHandler: requireAdminPermissions([AdminPermission.ORG_APPROVE, AdminPermission.ORG_REJECT]),
    preValidation: validateRequest({ params: orgIdParams, body: orgReviewBody }),
  }, async (request, reply) => {
    const { action, reasonCode, reasonDetails, conditions } = request.body;

    // Verify specific permission based on action
    if (action === 'APPROVE') {
      const user = (request as any).user;
      if (!user.permissions?.includes(AdminPermission.ORG_APPROVE) && user.role !== 'ADMIN') {
        return reply.status(403).send({
          success: false,
          error: { code: 'PERMISSION_DENIED', message: 'Cannot approve organizations' },
        });
      }
    }

    return proxyToService(request, reply, services.userOrg, 'POST', `/organizations/${request.params.id}/verify`, {
      action,
      reasonCode,
      reasonDetails,
      conditions,
      reviewedBy: request.adminUser?.id,
      reviewedAt: new Date().toISOString(),
    });
  });

  /**
   * POST /admin/organizations/:id/suspend
   * Suspend an active organization
   * Permission: org.suspend
   */
  app.post<{ Params: { id: string }; Body: z.infer<typeof orgSuspendBody> }>('/admin/organizations/:id/suspend', {
    preHandler: AdminGuards.canSuspendOrganizations,
    preValidation: validateRequest({ params: orgIdParams, body: orgSuspendBody }),
  }, async (request, reply) => {
    return proxyToService(request, reply, services.userOrg, 'PATCH', `/organizations/${request.params.id}`, {
      ...request.body,
      suspendedBy: request.adminUser?.id,
      suspendedAt: new Date().toISOString(),
    });
  });

  /**
   * POST /admin/organizations/:id/reactivate
   * Reactivate a suspended organization
   * Permission: org.reactivate
   */
  app.post<{ Params: { id: string }; Body: z.infer<typeof orgReactivateBody> }>('/admin/organizations/:id/reactivate', {
    preHandler: requireAdminPermissions([AdminPermission.ORG_REACTIVATE]),
    preValidation: validateRequest({ params: orgIdParams, body: orgReactivateBody }),
  }, async (request, reply) => {
    return proxyToService(request, reply, services.userOrg, 'PATCH', `/organizations/${request.params.id}`, {
      ...request.body,
      reactivatedBy: request.adminUser?.id,
      reactivatedAt: new Date().toISOString(),
    });
  });

  /**
   * GET /admin/organizations/queue
   * Get organizations pending review
   * Permission: org.review
   */
  app.get('/admin/organizations/queue', {
    preHandler: AdminGuards.canReviewOrganizations,
  }, async (request, reply) => {
    return proxyToService(request, reply, services.userOrg, 'GET', '/organizations?status=PENDING&sortBy=createdAt&sortOrder=asc');
  });

  /**
   * GET /admin/organizations/stats
   * Get organization statistics
   * Permission: org.read
   */
  app.get('/admin/organizations/stats', {
    preHandler: AdminGuards.canReadOrganizations,
  }, async (request, reply) => {
    return proxyToService(request, reply, services.userOrg, 'GET', '/organizations/stats');
  });

  /**
   * GET /admin/organizations/:id/members
   * Get organization members
   * Permission: org.read
   */
  app.get<{ Params: { id: string } }>('/admin/organizations/:id/members', {
    preHandler: AdminGuards.canReadOrganizations,
    preValidation: validateRequest({ params: orgIdParams }),
  }, async (request, reply) => {
    return proxyToService(request, reply, services.userOrg, 'GET', `/organizations/${request.params.id}/members`);
  });
}
