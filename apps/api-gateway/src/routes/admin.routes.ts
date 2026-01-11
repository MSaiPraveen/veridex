import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { services } from '../config/services';
import { requireRole } from '../auth/role-guard';
import { validateRequest, objectIdSchema } from '../plugins/validation';
import { Role } from '@veridex/roles-permissions';
import {
  userQuerySchema,
  createUserBodySchema,
  updateUserBodySchema,
  updateUserStatusBodySchema,
} from '../schemas/user.schemas';
import { auditQuerySchema } from '../schemas/audit.schemas';
import { z } from 'zod';

// Common param schemas
const idParamsSchema = z.object({
  id: objectIdSchema,
}).strict();

// Helper to proxy request to a service
async function proxyToService(
  request: FastifyRequest,
  reply: FastifyReply,
  serviceUrl: string,
  method: string,
  path: string
) {
  const url = `${serviceUrl}${path}`;
  
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

export async function adminRoutes(app: FastifyInstance) {
  // ============================================
  // Admin Audit Log Routes
  // ============================================

  // List audit logs
  app.get('/admin/audits', {
    preHandler: requireRole([Role.ADMIN]),
    preValidation: validateRequest({ query: auditQuerySchema }),
  }, async (request, reply) => {
    const qs = buildQueryString(request.query as Record<string, unknown>);
    return proxyToService(request, reply, services.audit, 'GET', `/audit${qs}`);
  });

  // Get single audit log
  app.get('/admin/audits/:id', {
    preHandler: requireRole([Role.ADMIN]),
    preValidation: validateRequest({ params: idParamsSchema }),
  }, async (request, reply) => {
    const params = request.params as { id: string };
    return proxyToService(request, reply, services.audit, 'GET', `/audit/${params.id}`);
  });

  // Get audit stats
  app.get('/admin/audit-stats', {
    preHandler: requireRole([Role.ADMIN]),
  }, async (request, reply) => {
    return proxyToService(request, reply, services.audit, 'GET', '/audit/stats');
  });

  // ============================================
  // Admin User Management Routes
  // ============================================

  // List users
  app.get('/admin/users', {
    preHandler: requireRole([Role.ADMIN]),
    preValidation: validateRequest({ query: userQuerySchema }),
  }, async (request, reply) => {
    const qs = buildQueryString(request.query as Record<string, unknown>);
    return proxyToService(request, reply, services.userOrg, 'GET', `/users${qs}`);
  });

  // Get user by ID
  app.get('/admin/users/:id', {
    preHandler: requireRole([Role.ADMIN]),
    preValidation: validateRequest({ params: idParamsSchema }),
  }, async (request, reply) => {
    const params = request.params as { id: string };
    return proxyToService(request, reply, services.userOrg, 'GET', `/users/${params.id}`);
  });

  // Create user
  app.post('/admin/users', {
    preHandler: requireRole([Role.ADMIN]),
    preValidation: validateRequest({ body: createUserBodySchema }),
  }, async (request, reply) => {
    return proxyToService(request, reply, services.userOrg, 'POST', '/users');
  });

  // Update user
  app.put('/admin/users/:id', {
    preHandler: requireRole([Role.ADMIN]),
    preValidation: validateRequest({
      params: idParamsSchema,
      body: updateUserBodySchema,
    }),
  }, async (request, reply) => {
    const params = request.params as { id: string };
    return proxyToService(request, reply, services.userOrg, 'PUT', `/users/${params.id}`);
  });

  // Update user status (activate/deactivate)
  app.patch('/admin/users/:id/status', {
    preHandler: requireRole([Role.ADMIN]),
    preValidation: validateRequest({
      params: idParamsSchema,
      body: updateUserStatusBodySchema,
    }),
  }, async (request, reply) => {
    const params = request.params as { id: string };
    return proxyToService(request, reply, services.userOrg, 'PATCH', `/users/${params.id}/status`);
  });

  // Delete user
  app.delete('/admin/users/:id', {
    preHandler: requireRole([Role.ADMIN]),
    preValidation: validateRequest({ params: idParamsSchema }),
  }, async (request, reply) => {
    const params = request.params as { id: string };
    return proxyToService(request, reply, services.userOrg, 'DELETE', `/users/${params.id}`);
  });
}
