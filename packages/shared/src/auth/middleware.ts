import { FastifyRequest, FastifyReply } from 'fastify';

// User context headers from gateway
export const USER_HEADERS = {
  USER_ID: 'x-user-id',
  USER_ROLE: 'x-user-role',
  USER_EMAIL: 'x-user-email',
  ORG_ID: 'x-organization-id',
  REQUEST_ID: 'x-request-id',
} as const;

export interface UserContext {
  userId: string;
  role: string;
  email?: string;
  organizationId?: string;
  requestId?: string;
}

declare module 'fastify' {
  interface FastifyRequest {
    userContext?: UserContext;
  }
}

/**
 * Extract user context from headers injected by the API gateway
 */
export function getUserContext(req: FastifyRequest): UserContext | undefined {
  const userId = req.headers[USER_HEADERS.USER_ID] as string | undefined;
  const role = req.headers[USER_HEADERS.USER_ROLE] as string | undefined;

  if (!userId || !role) {
    return undefined;
  }

  return {
    userId,
    role,
    email: req.headers[USER_HEADERS.USER_EMAIL] as string | undefined,
    organizationId: req.headers[USER_HEADERS.ORG_ID] as string | undefined,
    requestId: req.headers[USER_HEADERS.REQUEST_ID] as string | undefined,
  };
}

/**
 * Middleware that requires authentication
 * Expects user context headers from the gateway
 */
export function requireAuth() {
  return async (req: FastifyRequest, reply: FastifyReply) => {
    const context = getUserContext(req);

    if (!context) {
      return reply.status(401).send({
        error: 'Unauthorized',
        message: 'Authentication required',
      });
    }

    // Attach context to request for use in handlers
    req.userContext = context;
  };
}

/**
 * Middleware that requires specific roles
 */
export function requireRole(allowedRoles: string[]) {
  return async (req: FastifyRequest, reply: FastifyReply) => {
    const context = getUserContext(req);

    if (!context) {
      return reply.status(401).send({
        error: 'Unauthorized',
        message: 'Authentication required',
      });
    }

    if (!allowedRoles.includes(context.role)) {
      return reply.status(403).send({
        error: 'Forbidden',
        message: 'Insufficient role permissions',
      });
    }

    req.userContext = context;
  };
}

/**
 * Middleware that checks if user owns the resource or is admin
 */
export function requireOwnerOrAdmin(getOwnerId: (req: FastifyRequest) => string | Promise<string>) {
  return async (req: FastifyRequest, reply: FastifyReply) => {
    const context = getUserContext(req);

    if (!context) {
      return reply.status(401).send({
        error: 'Unauthorized',
        message: 'Authentication required',
      });
    }

    // Admins can access anything
    if (context.role === 'ADMIN') {
      req.userContext = context;
      return;
    }

    // Check if user owns the resource
    const ownerId = await getOwnerId(req);
    if (ownerId !== context.userId) {
      return reply.status(403).send({
        error: 'Forbidden',
        message: 'You do not have permission to access this resource',
      });
    }

    req.userContext = context;
  };
}

/**
 * Middleware that requires user to belong to the same organization
 */
export function requireSameOrg(getResourceOrgId: (req: FastifyRequest) => string | Promise<string>) {
  return async (req: FastifyRequest, reply: FastifyReply) => {
    const context = getUserContext(req);

    if (!context) {
      return reply.status(401).send({
        error: 'Unauthorized',
        message: 'Authentication required',
      });
    }

    // Admins can access any organization
    if (context.role === 'ADMIN') {
      req.userContext = context;
      return;
    }

    // Check organization match
    const resourceOrgId = await getResourceOrgId(req);
    if (context.organizationId !== resourceOrgId) {
      return reply.status(403).send({
        error: 'Forbidden',
        message: 'You do not have access to this organization\'s resources',
      });
    }

    req.userContext = context;
  };
}

/**
 * Optional auth - extracts context if available but doesn't require it
 */
export function optionalAuth() {
  return async (req: FastifyRequest) => {
    const context = getUserContext(req);
    if (context) {
      req.userContext = context;
    }
  };
}
