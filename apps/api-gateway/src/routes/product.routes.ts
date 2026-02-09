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
  // Enriches products with organization names
  app.get('/admin/products', {
    preHandler: requireRole([Role.ADMIN]),
    preValidation: validateRequest({ query: productQuerySchema }),
  }, async (request, reply) => {
    const qs = buildQueryString(request.query as Record<string, unknown>);
    const user = request.user as any;
    const adminHeaders = {
      'Content-Type': 'application/json',
      'x-request-id': request.id,
      'x-user-id': user?.id || 'admin',
      'x-user-role': 'ADMIN',
    };
    
    // Get products from product service
    const productRes = await fetch(`${services.product}/products${qs}&scope=all`, {
      method: 'GET',
      headers: adminHeaders,
    });
    
    if (!productRes.ok) {
      const error = await productRes.json().catch(() => ({}));
      return reply.status(productRes.status).send(error);
    }
    
    const productData = await productRes.json();
    const products = productData.data || productData.products || [];
    
    // Collect unique organization IDs
    const orgIds: string[] = [...new Set(products.map((p: any) => p.organizationId).filter(Boolean))] as string[];
    
    // Fetch organization names in batch using the new batch endpoint
    let orgMap: Record<string, { name: string; type: string }> = {};
    if (orgIds.length > 0) {
      try {
        const orgRes = await fetch(`${services.userOrg}/organizations/batch`, {
          method: 'POST',
          headers: adminHeaders,
          body: JSON.stringify({ ids: orgIds }),
        });
        if (orgRes.ok) {
          const orgData = await orgRes.json();
          orgMap = orgData.success ? orgData.data : {};
        }
      } catch (e) {
        console.warn('Failed to fetch organization names:', e);
      }
    }
    
    // Collect unique product IDs for document count
    const productIds: string[] = products.map((p: any) => p._id?.toString() || p.id).filter(Boolean);
    
    // Fetch document counts per product
    let docCountMap: Record<string, number> = {};
    if (productIds.length > 0) {
      try {
        const docsRes = await fetch(`${services.document}/documents/counts-by-product`, {
          method: 'POST',
          headers: adminHeaders,
          body: JSON.stringify({ productIds }),
        });
        if (docsRes.ok) {
          const docsData = await docsRes.json();
          docCountMap = docsData.success ? docsData.data : {};
        }
      } catch (e) {
        console.warn('Failed to fetch document counts:', e);
      }
    }
    
    // Enrich products with organization names and document counts
    const enrichedProducts = products.map((p: any) => {
      const productId = p._id?.toString() || p.id;
      return {
        ...p,
        organizationName: p.organizationId ? (orgMap[p.organizationId]?.name || undefined) : undefined,
        organizationType: p.organizationId ? orgMap[p.organizationId]?.type : undefined,
        documentCount: docCountMap[productId] || 0,
      };
    });
    
    return reply.send({
      success: true,
      data: enrichedProducts,
      products: enrichedProducts, // For backwards compatibility
      total: productData.total,
      totalPages: productData.totalPages,
      page: productData.page,
    });
  });

  // Get single product for admin - requires admin role
  app.get('/admin/products/:id', {
    preHandler: requireRole([Role.ADMIN]),
    preValidation: validateRequest({ params: productIdParamsSchema }),
  }, async (request, reply) => {
    const params = request.params as { id: string };
    return proxyToProduct(request, reply, 'GET', `/products/${params.id}`);
  });

  // Update product status - requires admin role
  app.patch('/admin/products/:id/status', {
    preHandler: requireRole([Role.ADMIN]),
    preValidation: validateRequest({ params: productIdParamsSchema }),
  }, async (request, reply) => {
    const params = request.params as { id: string };
    return proxyToProduct(request, reply, 'PATCH', `/products/${params.id}/status`);
  });

  // Update product compliance - requires admin role
  app.patch('/admin/products/:id/compliance', {
    preHandler: requireRole([Role.ADMIN]),
    preValidation: validateRequest({ params: productIdParamsSchema }),
  }, async (request, reply) => {
    const params = request.params as { id: string };
    return proxyToProduct(request, reply, 'PATCH', `/products/${params.id}/compliance`);
  });

  // Get pending compliance products - requires admin role
  app.get('/admin/products/pending-compliance', {
    preHandler: requireRole([Role.ADMIN]),
  }, async (request, reply) => {
    return proxyToProduct(request, reply, 'GET', '/products/pending-compliance');
  });

  // Get non-compliant products - requires admin role
  app.get('/admin/products/non-compliant', {
    preHandler: requireRole([Role.ADMIN]),
  }, async (request, reply) => {
    return proxyToProduct(request, reply, 'GET', '/products/non-compliant');
  });

  // Archive product - requires admin role
  app.post('/admin/products/:id/archive', {
    preHandler: requireRole([Role.ADMIN]),
    preValidation: validateRequest({ params: productIdParamsSchema }),
  }, async (request, reply) => {
    const params = request.params as { id: string };
    return proxyToProduct(request, reply, 'POST', `/products/${params.id}/archive`);
  });

  // Get products by organization - requires admin role
  app.get('/admin/organizations/:id/products', {
    preHandler: requireRole([Role.ADMIN]),
    preValidation: validateRequest({ params: productIdParamsSchema }),
  }, async (request, reply) => {
    const params = request.params as { id: string };
    return proxyToProduct(request, reply, 'GET', `/products/organization/${params.id}`);
  });
}
