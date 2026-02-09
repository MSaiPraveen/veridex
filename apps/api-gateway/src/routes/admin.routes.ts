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

  // Helper to get admin headers for downstream service calls
  function getAdminHeaders(request: FastifyRequest): Record<string, string> {
    const user = request.user as any;
    return {
      'Content-Type': 'application/json',
      'x-request-id': request.id,
      'x-user-id': user?.id || 'admin',
      'x-user-role': 'ADMIN',
      'x-user-email': user?.email || '',
    };
  }

  // List users with enriched counts (products, documents)
  app.get('/admin/users', {
    preHandler: requireRole([Role.ADMIN]),
    preValidation: validateRequest({ query: userQuerySchema }),
  }, async (request, reply) => {
    const qs = buildQueryString(request.query as Record<string, unknown>);
    const headers = getAdminHeaders(request);
    
    // Get users from user-org service
    const userRes = await fetch(`${services.userOrg}/users${qs}`, {
      method: 'GET',
      headers,
    });
    
    if (!userRes.ok) {
      const error = await userRes.json().catch(() => ({}));
      return reply.status(userRes.status).send(error);
    }
    
    const userData = await userRes.json();
    const users = userData.data || [];
    
    // Fetch all organizations once for email domain matching
    let allOrganizations: any[] = [];
    try {
      const orgsRes = await fetch(`${services.userOrg}/organizations?limit=100`, {
        method: 'GET',
        headers,
      });
      if (orgsRes.ok) {
        const orgsData = await orgsRes.json();
        allOrganizations = orgsData.data || [];
      }
    } catch (e) {
      // Ignore errors
    }
    
    // Helper to find organization for a user by email domain matching
    const findOrgByEmailDomain = (email: string): any | null => {
      if (!email || !allOrganizations.length) return null;
      
      const emailDomain = email.split('@')[1]?.toLowerCase() || '';
      if (!emailDomain || emailDomain === 'example.com' || emailDomain === 'gmail.com') {
        return null;
      }
      
      // Try to match email domain to org name
      // e.g., "owner@greenleaflabs.com" -> "GreenLeaf Labs"
      // e.g., "owner@herbalremedies.inc" -> "Herbal Remedies Inc"
      const domainBase = emailDomain.split('.')[0]; // "greenleaflabs" or "herbalremedies"
      
      for (const org of allOrganizations) {
        const orgNameNormalized = org.name.toLowerCase().replace(/\s+/g, '');
        if (orgNameNormalized.includes(domainBase) || domainBase.includes(orgNameNormalized.replace(/inc|co|corp|labs|llc/g, ''))) {
          return org;
        }
      }
      
      return null;
    };
    
    // Helper to find organization by ID
    const findOrgById = (orgId: string): any | null => {
      if (!orgId || !allOrganizations.length) return null;
      return allOrganizations.find((org: any) => org._id === orgId || org.id === orgId) || null;
    };
    
    // Enrich users with product and document counts
    const enrichedUsers = await Promise.all(users.map(async (user: any) => {
      const userId = user._id || user.id;
      
      let productsCount = 0;
      let documentsCount = 0;
      let orgId = user.organizationId;
      let organizationName = user.organizationName;
      
      // If user has organizationId but no name, look up the org name
      if (orgId && !organizationName) {
        const org = findOrgById(orgId);
        if (org) {
          organizationName = org.name;
        }
      }
      
      // If user doesn't have organizationId, look up their memberships
      if (!orgId) {
        try {
          const membershipRes = await fetch(
            `${services.userOrg}/users/${userId}/memberships`,
            { method: 'GET', headers }
          );
          if (membershipRes.ok) {
            const membershipData = await membershipRes.json();
            const memberships = membershipData.data || [];
            if (memberships.length > 0) {
              // Use the first (primary) organization
              orgId = memberships[0].organizationId;
              organizationName = memberships[0].organizationName;
            }
          }
        } catch (e) {
          // Ignore errors
        }
      }
      
      // If still no org, try to find org by email domain matching
      if (!orgId && user.email) {
        const matchedOrg = findOrgByEmailDomain(user.email);
        if (matchedOrg) {
          orgId = matchedOrg._id;
          organizationName = matchedOrg.name;
        }
      }
      
      try {
        // Get product count for this organization
        // Products use merchantId which is actually organizationId
        if (orgId) {
          const productCountRes = await fetch(
            `${services.product}/products?scope=all&merchantId=${orgId}&limit=1`,
            { method: 'GET', headers }
          );
          if (productCountRes.ok) {
            const productData = await productCountRes.json();
            productsCount = productData.total || 0;
          }
        }
      } catch (e) {
        // Ignore errors
      }
      
      try {
        // Get document count - try by organizationId first, then by ownerId (which is also org ID for our data)
        if (orgId) {
          let docCountRes = await fetch(
            `${services.document}/documents?organizationId=${orgId}&limit=1`,
            { method: 'GET', headers }
          );
          if (docCountRes.ok) {
            const docData = await docCountRes.json();
            documentsCount = docData.total || 0;
          }
          
          // Also check documents by ownerId (some docs use ownerId = orgId)
          if (documentsCount === 0) {
            docCountRes = await fetch(
              `${services.document}/documents?ownerId=${orgId}&limit=1`,
              { method: 'GET', headers }
            );
            if (docCountRes.ok) {
              const docData = await docCountRes.json();
              documentsCount = docData.total || 0;
            }
          }
        }
      } catch (e) {
        // Ignore errors
      }
      
      return {
        ...user,
        organizationId: orgId,
        organizationName,
        productsCount,
        documentsCount,
        complianceScore: user.complianceScore || (productsCount > 0 ? 85 : 0), // Placeholder
      };
    }));
    
    return reply.send({
      success: true,
      data: enrichedUsers,
      total: userData.total,
      totalPages: userData.totalPages,
      page: userData.page,
    });
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
