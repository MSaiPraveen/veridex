import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { services } from '../config/services';
import { requireAuth, requireRole } from '../auth/role-guard';
import { validateRequest, objectIdSchema } from '../plugins/validation';
import { Role } from '@veridex/roles-permissions';
import {
  createRuleBodySchema,
  updateRuleBodySchema,
  complianceCheckBodySchema,
  ruleQuerySchema,
  complianceResultQuerySchema,
  complianceStatsQuerySchema,
} from '../schemas/compliance.schemas';
import { z } from 'zod';

// ID param schema
const idParamsSchema = z.object({
  id: objectIdSchema,
}).strict();

// Helper to proxy request to compliance service
async function proxyToCompliance(
  request: FastifyRequest,
  reply: FastifyReply,
  method: string,
  path: string
) {
  const url = `${services.compliance}${path}`;
  
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

export async function complianceRoutes(app: FastifyInstance) {
  // ============================================
  // Compliance Rules (Admin only)
  // ============================================

  // List rules
  app.get('/compliance/rules', {
    preHandler: requireRole([Role.ADMIN]),
    preValidation: validateRequest({ query: ruleQuerySchema }),
  }, async (request, reply) => {
    const qs = buildQueryString(request.query as Record<string, unknown>);
    return proxyToCompliance(request, reply, 'GET', `/rules${qs}`);
  });

  // Get single rule
  app.get('/compliance/rules/:id', {
    preHandler: requireRole([Role.ADMIN]),
    preValidation: validateRequest({ params: idParamsSchema }),
  }, async (request, reply) => {
    const params = request.params as { id: string };
    return proxyToCompliance(request, reply, 'GET', `/rules/${params.id}`);
  });

  // Create rule
  app.post('/compliance/rules', {
    preHandler: requireRole([Role.ADMIN]),
    preValidation: validateRequest({ body: createRuleBodySchema }),
  }, async (request, reply) => {
    return proxyToCompliance(request, reply, 'POST', '/rules');
  });

  // Update rule
  app.put('/compliance/rules/:id', {
    preHandler: requireRole([Role.ADMIN]),
    preValidation: validateRequest({
      params: idParamsSchema,
      body: updateRuleBodySchema,
    }),
  }, async (request, reply) => {
    const params = request.params as { id: string };
    return proxyToCompliance(request, reply, 'PUT', `/rules/${params.id}`);
  });

  // Delete rule
  app.delete('/compliance/rules/:id', {
    preHandler: requireRole([Role.ADMIN]),
    preValidation: validateRequest({ params: idParamsSchema }),
  }, async (request, reply) => {
    const params = request.params as { id: string };
    return proxyToCompliance(request, reply, 'DELETE', `/rules/${params.id}`);
  });

  // ============================================
  // Compliance Checks (Authenticated users)
  // ============================================

  // Run compliance check
  app.post('/compliance/check', {
    preHandler: requireAuth(),
    preValidation: validateRequest({ body: complianceCheckBodySchema }),
  }, async (request, reply) => {
    return proxyToCompliance(request, reply, 'POST', '/compliance/check');
  });

  // ============================================
  // Compliance Results (Authenticated users)
  // ============================================

  // List compliance results
  app.get('/compliance/results', {
    preHandler: requireAuth(),
    preValidation: validateRequest({ query: complianceResultQuerySchema }),
  }, async (request, reply) => {
    const qs = buildQueryString(request.query as Record<string, unknown>);
    return proxyToCompliance(request, reply, 'GET', `/results${qs}`);
  });

  // Get single result
  app.get('/compliance/results/:id', {
    preHandler: requireAuth(),
    preValidation: validateRequest({ params: idParamsSchema }),
  }, async (request, reply) => {
    const params = request.params as { id: string };
    return proxyToCompliance(request, reply, 'GET', `/results/${params.id}`);
  });

  // ============================================
  // Compliance Stats (Admin only)
  // ============================================

  app.get('/compliance/stats', {
    preHandler: requireRole([Role.ADMIN]),
    preValidation: validateRequest({ query: complianceStatsQuerySchema }),
  }, async (request, reply) => {
    const qs = buildQueryString(request.query as Record<string, unknown>);
    return proxyToCompliance(request, reply, 'GET', `/stats${qs}`);
  });
}
