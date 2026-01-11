import { FastifyRequest, FastifyReply } from 'fastify';
import { Role, Permission, RolePermissions } from '@veridex/roles-permissions';
import { JwtUser } from './types';

/**
 * Middleware that requires any authenticated user
 */
export function requireAuth() {
  return async (request: FastifyRequest, reply: FastifyReply) => {
    const user = request.user as JwtUser | undefined;

    if (!user) {
      return reply.status(401).send({
        error: 'Unauthorized',
        message: 'Authentication required',
      });
    }
  };
}

/**
 * Middleware that requires specific roles
 */
export function requireRole(allowed: Role[]) {
  return async (request: FastifyRequest, reply: FastifyReply) => {
    const user = request.user as JwtUser | undefined;

    if (!user) {
      return reply.status(401).send({
        error: 'Unauthorized',
        message: 'Authentication required',
      });
    }

    if (!allowed.includes(user.role)) {
      return reply.status(403).send({
        error: 'Forbidden',
        message: 'Insufficient role permissions',
      });
    }
  };
}

/**
 * Middleware that requires specific permissions
 */
export function requirePermission(required: Permission) {
  return async (request: FastifyRequest, reply: FastifyReply) => {
    const user = request.user as JwtUser | undefined;

    if (!user) {
      return reply.status(401).send({
        error: 'Unauthorized',
        message: 'Authentication required',
      });
    }

    const userPermissions = RolePermissions[user.role] || [];
    if (!userPermissions.includes(required)) {
      return reply.status(403).send({
        error: 'Forbidden',
        message: 'Insufficient permissions',
      });
    }
  };
}
