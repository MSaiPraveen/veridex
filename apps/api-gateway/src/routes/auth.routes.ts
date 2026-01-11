import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { services } from '../config/services';
import { validateRequest } from '../plugins/validation';
import { verifyToken } from '../auth/jwt';
import {
  registerBodySchema,
  loginBodySchema,
  refreshTokenBodySchema,
  logoutBodySchema,
  changePasswordBodySchema,
  forgotPasswordBodySchema,
  resetPasswordBodySchema,
  verifyEmailQuerySchema,
} from '../schemas/auth.schemas';

// Helper to proxy request to auth service
async function proxyToAuth(
  request: FastifyRequest,
  reply: FastifyReply,
  method: string,
  path: string
) {
  const url = `${services.auth}${path}`;
  
  const response = await fetch(url, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(request.headers.authorization && { 
        Authorization: request.headers.authorization 
      }),
      'x-request-id': request.id,
    },
    body: method !== 'GET' ? JSON.stringify(request.body) : undefined,
  });

  const data = await response.json();
  return reply.status(response.status).send(data);
}

export async function authRoutes(app: FastifyInstance) {
  // Register - validate request body
  app.post('/auth/register', {
    preValidation: validateRequest({ body: registerBodySchema }),
  }, async (request, reply) => {
    return proxyToAuth(request, reply, 'POST', '/auth/register');
  });

  // Login - validate request body
  app.post('/auth/login', {
    preValidation: validateRequest({ body: loginBodySchema }),
  }, async (request, reply) => {
    return proxyToAuth(request, reply, 'POST', '/auth/login');
  });

  // Refresh token - validate request body
  app.post('/auth/refresh', {
    preValidation: validateRequest({ body: refreshTokenBodySchema }),
  }, async (request, reply) => {
    return proxyToAuth(request, reply, 'POST', '/auth/refresh');
  });

  // Logout - validate request body
  app.post('/auth/logout', {
    preValidation: validateRequest({ body: logoutBodySchema }),
  }, async (request, reply) => {
    return proxyToAuth(request, reply, 'POST', '/auth/logout');
  });

  // Get current user (me) - also fetches user's primary organization
  app.get('/auth/me', async (request, reply) => {
    // First, get user data from auth service
    const authUrl = `${services.auth}/auth/me`;
    
    const authResponse = await fetch(authUrl, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        ...(request.headers.authorization && { 
          Authorization: request.headers.authorization 
        }),
        'x-request-id': request.id,
      },
    });

    const authData = await authResponse.json();
    
    // If auth failed, return the error
    if (!authResponse.ok || !authData.success) {
      return reply.status(authResponse.status).send(authData);
    }

    // Try to get user's organization from user-org service
    try {
      // Verify token to get user ID
      const token = request.headers.authorization?.replace('Bearer ', '');
      if (token) {
        const jwtPayload = verifyToken(token);
        const userId = jwtPayload.sub;
        
        // Fetch user's organizations
        const orgsUrl = `${services.userOrg}/users/${userId}/organizations`;
        const orgsResponse = await fetch(orgsUrl, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            'x-request-id': request.id,
          },
        });
        
        if (orgsResponse.ok) {
          const orgsData = await orgsResponse.json();
          // Get the first/primary organization
          if (orgsData.success && orgsData.data && orgsData.data.length > 0) {
            const primaryOrg = orgsData.data[0];
            authData.data.user.organizationId = String(primaryOrg._id);
            authData.data.user.organizationName = primaryOrg.name;
          }
        }
      }
    } catch (error) {
      // Log error but don't fail the request - organization is optional for some users
      request.log.warn({ error }, 'Failed to fetch user organization');
    }

    return reply.status(authResponse.status).send(authData);
  });

  // Change password - validate request body
  app.post('/auth/change-password', {
    preValidation: validateRequest({ body: changePasswordBodySchema }),
  }, async (request, reply) => {
    return proxyToAuth(request, reply, 'POST', '/auth/change-password');
  });

  // Forgot password - validate request body  
  app.post('/auth/forgot-password', {
    preValidation: validateRequest({ body: forgotPasswordBodySchema }),
  }, async (request, reply) => {
    return proxyToAuth(request, reply, 'POST', '/auth/forgot-password');
  });

  // Reset password - validate request body
  app.post('/auth/reset-password', {
    preValidation: validateRequest({ body: resetPasswordBodySchema }),
  }, async (request, reply) => {
    return proxyToAuth(request, reply, 'POST', '/auth/reset-password');
  });

  // Verify email - validate query params
  app.get('/auth/verify-email', {
    preValidation: validateRequest({ query: verifyEmailQuerySchema }),
  }, async (request, reply) => {
    const query = request.query as { token: string };
    return proxyToAuth(request, reply, 'GET', `/auth/verify-email?token=${query.token}`);
  });
}
