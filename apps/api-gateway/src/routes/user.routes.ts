import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { services } from '../config/services';
import { requireAuth, requireRole } from '../auth/role-guard';
import { validateRequest, objectIdSchema } from '../plugins/validation';
import {
  updateProfileBodySchema,
  userQuerySchema,
} from '../schemas/user.schemas';
import { Role } from '@veridex/roles-permissions';
import { z } from 'zod';

// User ID param schema
const userIdParamsSchema = z.object({
  id: objectIdSchema,
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

export async function userRoutes(app: FastifyInstance) {
  // Get current user profile
  app.get('/users/me', {
    preHandler: requireAuth(),
  }, async (request, reply) => {
    return proxyToUserOrg(request, reply, 'GET', '/users/me');
  });

  // Update current user profile
  app.put('/users/me', {
    preHandler: requireAuth(),
    preValidation: validateRequest({ body: updateProfileBodySchema }),
  }, async (request, reply) => {
    return proxyToUserOrg(request, reply, 'PUT', '/users/me');
  });

  // Get user by ID (admin or self)
  app.get('/users/:id', {
    preHandler: requireRole([Role.CONSUMER, Role.MERCHANT, Role.ADMIN]),
    preValidation: validateRequest({ params: userIdParamsSchema }),
  }, async (request, reply) => {
    const params = request.params as { id: string };
    return proxyToUserOrg(request, reply, 'GET', `/users/${params.id}`);
  });

  // List users (with query validation)
  app.get('/users', {
    preHandler: requireRole([Role.ADMIN]),
    preValidation: validateRequest({ query: userQuerySchema }),
  }, async (request, reply) => {
    const qs = buildQueryString(request.query as Record<string, unknown>);
    return proxyToUserOrg(request, reply, 'GET', `/users${qs}`);
  });
}
