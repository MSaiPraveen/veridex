import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { services } from '../config/services';
import { requireAuth, requireRole } from '../auth/role-guard';
import { validateRequest, objectIdSchema } from '../plugins/validation';
import { Role } from '@veridex/roles-permissions';
import {
  createOrganizationBodySchema,
  updateOrganizationBodySchema,
  updateOrganizationStatusBodySchema,
  addLicenseBodySchema,
  updateLicenseBodySchema,
  organizationQuerySchema,
} from '../schemas/organization.schemas';
import { z } from 'zod';

// ID param schema
const idParamsSchema = z.object({
  id: objectIdSchema,
}).strict();

// Org + License ID params
const orgLicenseParamsSchema = z.object({
  id: objectIdSchema,
  licenseId: objectIdSchema,
}).strict();

// Helper to proxy request to user-org service
async function proxyToUserOrg(
  request: FastifyRequest,
  reply: FastifyReply,
  method: string,
  path: string
) {
  const url = `${services.userOrg}${path}`;
  
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'x-request-id': request.id,
  };
  
  // Forward auth headers
  if (request.headers.authorization) {
    headers['Authorization'] = request.headers.authorization;
  }
  if (request.headers['x-user-id']) {
    headers['x-user-id'] = request.headers['x-user-id'] as string;
  }
  if (request.headers['x-user-role']) {
    headers['x-user-role'] = request.headers['x-user-role'] as string;
  }
  if (request.headers['x-organization-id']) {
    headers['x-organization-id'] = request.headers['x-organization-id'] as string;
  }

  const response = await fetch(url, {
    method,
    headers,
    body: method !== 'GET' && method !== 'DELETE' ? JSON.stringify(request.body) : undefined,
  });

  const data = await response.json();
  return reply.status(response.status).send(data);
}

// Build query string from validated query object
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

export async function organizationRoutes(app: FastifyInstance) {
  // ============================================
  // User Organization Routes (Authenticated users)
  // ============================================

  // List organizations (user can view)
  app.get('/organizations', {
    preHandler: requireAuth(),
    preValidation: validateRequest({ query: organizationQuerySchema }),
  }, async (request, reply) => {
    const qs = buildQueryString(request.query as Record<string, unknown>);
    return proxyToUserOrg(request, reply, 'GET', `/organizations${qs}`);
  });

  // Get single organization
  app.get('/organizations/:id', {
    preHandler: requireAuth(),
    preValidation: validateRequest({ params: idParamsSchema }),
  }, async (request, reply) => {
    const params = request.params as { id: string };
    return proxyToUserOrg(request, reply, 'GET', `/organizations/${params.id}`);
  });

  // ============================================
  // Admin Organization Management
  // ============================================

  // List organizations (admin - with full query options)
  app.get('/admin/organizations', {
    preHandler: requireRole([Role.ADMIN]),
    preValidation: validateRequest({ query: organizationQuerySchema }),
  }, async (request, reply) => {
    const qs = buildQueryString(request.query as Record<string, unknown>);
    return proxyToUserOrg(request, reply, 'GET', `/organizations${qs}`);
  });

  // Get single organization (admin)
  app.get('/admin/organizations/:id', {
    preHandler: requireRole([Role.ADMIN]),
    preValidation: validateRequest({ params: idParamsSchema }),
  }, async (request, reply) => {
    const params = request.params as { id: string };
    return proxyToUserOrg(request, reply, 'GET', `/organizations/${params.id}`);
  });

  // Create organization
  app.post('/admin/organizations', {
    preHandler: requireRole([Role.ADMIN]),
    preValidation: validateRequest({ body: createOrganizationBodySchema }),
  }, async (request, reply) => {
    return proxyToUserOrg(request, reply, 'POST', '/organizations');
  });

  // Update organization
  app.put('/admin/organizations/:id', {
    preHandler: requireRole([Role.ADMIN]),
    preValidation: validateRequest({
      params: idParamsSchema,
      body: updateOrganizationBodySchema,
    }),
  }, async (request, reply) => {
    const params = request.params as { id: string };
    return proxyToUserOrg(request, reply, 'PUT', `/organizations/${params.id}`);
  });

  // Update organization status
  app.patch('/admin/organizations/:id/status', {
    preHandler: requireRole([Role.ADMIN]),
    preValidation: validateRequest({
      params: idParamsSchema,
      body: updateOrganizationStatusBodySchema,
    }),
  }, async (request, reply) => {
    const params = request.params as { id: string };
    return proxyToUserOrg(request, reply, 'PATCH', `/organizations/${params.id}/status`);
  });

  // Delete organization
  app.delete('/admin/organizations/:id', {
    preHandler: requireRole([Role.ADMIN]),
    preValidation: validateRequest({ params: idParamsSchema }),
  }, async (request, reply) => {
    const params = request.params as { id: string };
    return proxyToUserOrg(request, reply, 'DELETE', `/organizations/${params.id}`);
  });

  // ============================================
  // Organization License Management
  // ============================================

  // Add license to organization
  app.post('/admin/organizations/:id/licenses', {
    preHandler: requireRole([Role.ADMIN]),
    preValidation: validateRequest({
      params: idParamsSchema,
      body: addLicenseBodySchema,
    }),
  }, async (request, reply) => {
    const params = request.params as { id: string };
    return proxyToUserOrg(request, reply, 'POST', `/organizations/${params.id}/licenses`);
  });

  // Update license
  app.patch('/admin/organizations/:id/licenses/:licenseId', {
    preHandler: requireRole([Role.ADMIN]),
    preValidation: validateRequest({
      params: orgLicenseParamsSchema,
      body: updateLicenseBodySchema,
    }),
  }, async (request, reply) => {
    const params = request.params as { id: string; licenseId: string };
    return proxyToUserOrg(request, reply, 'PATCH', `/organizations/${params.id}/licenses/${params.licenseId}`);
  });

  // Delete license
  app.delete('/admin/organizations/:id/licenses/:licenseId', {
    preHandler: requireRole([Role.ADMIN]),
    preValidation: validateRequest({ params: orgLicenseParamsSchema }),
  }, async (request, reply) => {
    const params = request.params as { id: string; licenseId: string };
    return proxyToUserOrg(request, reply, 'DELETE', `/organizations/${params.id}/licenses/${params.licenseId}`);
  });
}
