import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { services } from '../config/services';
import { requireAuth, requireRole } from '../auth/role-guard';
import { validateRequest, objectIdSchema } from '../plugins/validation';
import { Role } from '@veridex/roles-permissions';
import {
  createProductBodySchema,
  updateProductBodySchema,
  productQuerySchema,
  updateStatusBodySchema,
  updateComplianceBodySchema,
  updateInventoryBodySchema,
} from '../schemas/product.schemas';
import { z } from 'zod';

// Product ID param schema
const productIdParamsSchema = z.object({
  id: objectIdSchema,
}).strict();

// Helper to proxy request to product service
async function proxyToProduct(
  request: FastifyRequest,
  reply: FastifyReply,
  method: string,
  path: string
) {
  const url = `${services.product}${path}`;

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

export async function productRoutes(app: FastifyInstance) {
  // List products - auth required for proper org-based filtering

  // STRICT Tenant Isolation Routes
  app.get('/merchant/products', {
    preHandler: requireAuth(),
    preValidation: validateRequest({ query: productQuerySchema }),
  }, async (request, reply) => {
    const qs = buildQueryString(request.query as Record<string, unknown>);
    // Proxy to /my-products on product service
    return proxyToProduct(request, reply, 'GET', `/my-products${qs}`);
  });

  app.get('/products/global', {
    preHandler: requireAuth(),
    preValidation: validateRequest({ query: productQuerySchema }),
  }, async (request, reply) => {
    const qs = buildQueryString(request.query as Record<string, unknown>);
    // Proxy to /global on product service
    return proxyToProduct(request, reply, 'GET', `/global${qs}`);
  });

  app.get('/products', {
    preHandler: requireAuth(),
    preValidation: validateRequest({ query: productQuerySchema }),
  }, async (request, reply) => {
    const qs = buildQueryString(request.query as Record<string, unknown>);
    return proxyToProduct(request, reply, 'GET', `/products${qs}`);
  });

  // Get single product - auth required
  app.get('/products/:id', {
    preHandler: requireAuth(),
    preValidation: validateRequest({ params: productIdParamsSchema }),
  }, async (request, reply) => {
    const params = request.params as { id: string };
    return proxyToProduct(request, reply, 'GET', `/products/${params.id}`);
  });

  // Create product - auth required, validate body
  app.post('/products', {
    preHandler: requireAuth(),
    preValidation: validateRequest({ body: createProductBodySchema }),
  }, async (request, reply) => {
    return proxyToProduct(request, reply, 'POST', '/products');
  });

  // Update product - auth required, validate ID and body
  app.put('/products/:id', {
    preHandler: requireAuth(),
    preValidation: validateRequest({
      params: productIdParamsSchema,
      body: updateProductBodySchema,
    }),
  }, async (request, reply) => {
    const params = request.params as { id: string };
    return proxyToProduct(request, reply, 'PUT', `/products/${params.id}`);
  });

  // Delete product - auth required, validate ID
  app.delete('/products/:id', {
    preHandler: requireAuth(),
    preValidation: validateRequest({ params: productIdParamsSchema }),
  }, async (request, reply) => {
    const params = request.params as { id: string };
    return proxyToProduct(request, reply, 'DELETE', `/products/${params.id}`);
  });

  // Update product status - auth required
  app.patch('/products/:id/status', {
    preHandler: requireAuth(),
    preValidation: validateRequest({
      params: productIdParamsSchema,
      body: updateStatusBodySchema,
    }),
  }, async (request, reply) => {
    const params = request.params as { id: string };
    return proxyToProduct(request, reply, 'PATCH', `/products/${params.id}/status`);
  });

  // Update compliance status - auth required
  app.patch('/products/:id/compliance', {
    preHandler: requireAuth(),
    preValidation: validateRequest({
      params: productIdParamsSchema,
      body: updateComplianceBodySchema,
    }),
  }, async (request, reply) => {
    const params = request.params as { id: string };
    return proxyToProduct(request, reply, 'PATCH', `/products/${params.id}/compliance`);
  });

  // Update inventory - auth required
  app.patch('/products/:id/inventory', {
    preHandler: requireAuth(),
    preValidation: validateRequest({
      params: productIdParamsSchema,
      body: updateInventoryBodySchema,
    }),
  }, async (request, reply) => {
    const params = request.params as { id: string };
    return proxyToProduct(request, reply, 'PATCH', `/products/${params.id}/inventory`);
  });

  // ============================================
  // PUBLIC CATALOG ROUTES (FOR CONSUMERS)
  // No authentication required - sanitized data only
  // ============================================

  // List all products for consumers - NO AUTH
  app.get('/public/products', {
    preValidation: validateRequest({ query: productQuerySchema }),
  }, async (request, reply) => {
    const qs = buildQueryString(request.query as Record<string, unknown>);
    return proxyToProduct(request, reply, 'GET', `/public/products${qs}`);
  });

  // Get single product for consumers - NO AUTH
  app.get('/public/products/:id', {
    preValidation: validateRequest({ params: productIdParamsSchema }),
  }, async (request, reply) => {
    const params = request.params as { id: string };
    return proxyToProduct(request, reply, 'GET', `/public/products/${params.id}`);
  });

  // ============================================
  // ADMIN ROUTES (ADMIN only)
  // Returns ALL products with full data
  // ============================================

  // List ALL products for admin - requires admin role
  app.get('/admin/products', {
    preHandler: requireRole([Role.ADMIN]),
    preValidation: validateRequest({ query: productQuerySchema }),
  }, async (request, reply) => {
    const qs = buildQueryString(request.query as Record<string, unknown>);
    // Admin gets all products - no org filtering
    return proxyToProduct(request, reply, 'GET', `/products${qs}&scope=all`);
  });

  // Get single product for admin - requires admin role
  app.get('/admin/products/:id', {
    preHandler: requireRole([Role.ADMIN]),
    preValidation: validateRequest({ params: productIdParamsSchema }),
  }, async (request, reply) => {
    const params = request.params as { id: string };
    return proxyToProduct(request, reply, 'GET', `/products/${params.id}`);
  });
}
