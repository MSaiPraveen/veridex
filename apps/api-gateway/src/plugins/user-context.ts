import { FastifyInstance, FastifyRequest } from 'fastify';
import fp from 'fastify-plugin';
import { JwtUser } from '../auth/types';

declare module 'fastify' {
  interface FastifyRequest {
    user?: JwtUser;
  }
}

// Headers injected to downstream services
export const USER_HEADERS = {
  USER_ID: 'x-user-id',
  USER_ROLE: 'x-user-role',
  USER_EMAIL: 'x-user-email',
  ORG_ID: 'x-organization-id',
  REQUEST_ID: 'x-request-id',
} as const;

/**
 * Extract user context headers from a request
 * These headers are injected by the gateway when proxying to downstream services
 */
export function getUserContext(req: FastifyRequest): {
  userId?: string;
  role?: string;
  email?: string;
  organizationId?: string;
  requestId?: string;
} {
  return {
    userId: req.headers[USER_HEADERS.USER_ID] as string | undefined,
    role: req.headers[USER_HEADERS.USER_ROLE] as string | undefined,
    email: req.headers[USER_HEADERS.USER_EMAIL] as string | undefined,
    organizationId: req.headers[USER_HEADERS.ORG_ID] as string | undefined,
    requestId: req.headers[USER_HEADERS.REQUEST_ID] as string | undefined,
  };
}

/**
 * Plugin that adds user context to request headers for proxy forwarding
 * Uses preHandler hook so it runs AFTER JWT verification in app.ts
 */
async function userContextPlugin(app: FastifyInstance) {
  app.addHook('preHandler', async (request) => {
    // If user is authenticated, add their info to headers for downstream services
    if (request.user) {
      // Use sub or id (admin tokens may have id instead of sub)
      const userId = request.user.sub || request.user.id;
      if (userId) {
        request.headers[USER_HEADERS.USER_ID] = userId;
      }
      
      if (request.user.role) {
        request.headers[USER_HEADERS.USER_ROLE] = request.user.role;
      }
      
      const orgId = request.user.orgId || request.user.organizationId;
      if (orgId) {
        request.headers[USER_HEADERS.ORG_ID] = orgId;
      }
    }
    
    // Ensure request ID is set
    if (request.id && !request.headers[USER_HEADERS.REQUEST_ID]) {
      request.headers[USER_HEADERS.REQUEST_ID] = request.id as string;
    }
  });
}

export default fp(userContextPlugin, {
  name: 'user-context',
  dependencies: [],
});
