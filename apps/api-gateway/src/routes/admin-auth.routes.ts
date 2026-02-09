/**
 * Admin Auth Routes
 * 
 * Proxies admin authentication requests to the auth-service.
 * These routes are exempt from normal JWT authentication.
 */

import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { services } from '../config/services';

// Helper to proxy request to auth service
async function proxyToAuth(
  request: FastifyRequest,
  reply: FastifyReply,
  method: string,
  path: string
) {
  const url = `${services.auth}${path}`;
  
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'x-request-id': request.id,
    'x-forwarded-for': request.ip || 'unknown',
  };
  
  // Forward cookies for refresh token
  if (request.headers.cookie) {
    headers['Cookie'] = request.headers.cookie;
  }
  
  // Forward authorization header if present
  if (request.headers.authorization) {
    headers['Authorization'] = request.headers.authorization;
  }

  try {
    const response = await fetch(url, {
      method,
      headers,
      body: method !== 'GET' && method !== 'DELETE' ? JSON.stringify(request.body) : undefined,
    });

    const data = await response.json();
    
    // Forward set-cookie headers from auth service
    const setCookie = response.headers.get('set-cookie');
    if (setCookie) {
      reply.header('set-cookie', setCookie);
    }
    
    return reply.status(response.status).send(data);
  } catch (error) {
    request.log.error({ error, path }, 'Failed to proxy admin auth request');
    return reply.status(502).send({
      success: false,
      error: {
        code: 'PROXY_ERROR',
        message: 'Failed to connect to authentication service',
      },
    });
  }
}

export async function adminAuthRoutes(app: FastifyInstance) {
  /**
   * POST /admin/auth/login
   * Admin login - Step 1: Validate credentials
   */
  app.post('/admin/auth/login', async (request, reply) => {
    return proxyToAuth(request, reply, 'POST', '/admin/auth/login');
  });

  /**
   * POST /admin/auth/mfa/verify
   * Admin login - Step 2: Verify MFA code
   */
  app.post('/admin/auth/mfa/verify', async (request, reply) => {
    return proxyToAuth(request, reply, 'POST', '/admin/auth/mfa/verify');
  });

  /**
   * POST /admin/auth/mfa/setup
   * Initialize MFA setup for admin user
   */
  app.post('/admin/auth/mfa/setup', async (request, reply) => {
    return proxyToAuth(request, reply, 'POST', '/admin/auth/mfa/setup');
  });

  /**
   * POST /admin/auth/mfa/confirm
   * Confirm MFA setup with verification code
   */
  app.post('/admin/auth/mfa/confirm', async (request, reply) => {
    return proxyToAuth(request, reply, 'POST', '/admin/auth/mfa/confirm');
  });

  /**
   * POST /admin/auth/refresh
   * Refresh admin access token
   */
  app.post('/admin/auth/refresh', async (request, reply) => {
    return proxyToAuth(request, reply, 'POST', '/admin/auth/refresh');
  });

  /**
   * POST /admin/auth/logout
   * Logout current admin session
   */
  app.post('/admin/auth/logout', async (request, reply) => {
    return proxyToAuth(request, reply, 'POST', '/admin/auth/logout');
  });

  /**
   * POST /admin/auth/logout-all
   * Logout all admin sessions
   */
  app.post('/admin/auth/logout-all', async (request, reply) => {
    return proxyToAuth(request, reply, 'POST', '/admin/auth/logout-all');
  });

  /**
   * GET /admin/auth/me
   * Get current admin user info
   * 
   * NOTE: This route responds directly from the API Gateway instead of proxying
   * to auth-service. The Gateway already has the decoded JWT info in request.adminUser
   * which was set by the admin-security plugin.
   */
  app.get('/admin/auth/me', async (request, reply) => {
    const adminUser = (request as any).adminUser;
    
    if (!adminUser) {
      return reply.status(401).send({
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          message: 'Authentication required',
        },
      });
    }
    
    return reply.send({
      success: true,
      user: {
        id: adminUser.id,
        email: adminUser.email,
        name: adminUser.name || `${adminUser.firstName || ''} ${adminUser.lastName || ''}`.trim() || adminUser.email,
        role: adminUser.role,
        permissions: adminUser.permissions || [],
        mfaVerified: adminUser.mfaVerified || false,
      },
    });
  });

  // ============================================
  // ADMIN USER MANAGEMENT ROUTES
  // ============================================

  /**
   * GET /admin/auth/admins
   * Get all admin users (for admin management)
   */
  app.get('/admin/auth/admins', async (request, reply) => {
    return proxyToAuth(request, reply, 'GET', '/admin/auth/admins');
  });

  /**
   * POST /admin/auth/admins
   * Create a new admin user
   */
  app.post('/admin/auth/admins', async (request, reply) => {
    // Add the current admin's ID to the request body for audit
    const adminUser = (request as any).adminUser;
    const body = request.body as Record<string, unknown> || {};
    if (adminUser?.id) {
      body.createdBy = adminUser.id;
    }
    (request as any).body = body;
    return proxyToAuth(request, reply, 'POST', '/admin/auth/admins');
  });

  /**
   * PATCH /admin/auth/admins/:id/status
   * Update admin status (activate/deactivate/unlock)
   */
  app.patch('/admin/auth/admins/:id/status', async (request, reply) => {
    const { id } = request.params as { id: string };
    return proxyToAuth(request, reply, 'PATCH', `/admin/auth/admins/${id}/status`);
  });
}
