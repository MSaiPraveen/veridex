import { FastifyRequest, FastifyReply } from 'fastify';
import { Role, Permission, RolePermissions, Admin } from '@veridex/roles-permissions';
import { JwtUser } from './types';

const { AdminRole, isRoleAtLeast } = Admin;

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
 * Supports both regular user roles and admin roles with hierarchy
 */
export function requireRole(allowed: (Role | string)[]) {
  return async (request: FastifyRequest, reply: FastifyReply) => {
    const user = request.user as JwtUser | undefined;

    if (!user) {
      return reply.status(401).send({
        error: 'Unauthorized',
        message: 'Authentication required',
      });
    }

    const userRole = user.role as string;
    
    // Check if user has an admin role (SUPER_ADMIN, ADMIN, COMPLIANCE_REVIEWER, VIEWER)
    const adminRoles = Object.values(AdminRole) as string[];
    if (adminRoles.includes(userRole)) {
      // For admin roles, use hierarchy - SUPER_ADMIN >= ADMIN >= COMPLIANCE_REVIEWER >= VIEWER
      // If any allowed role is an admin role, check if user role is at least that level
      for (const allowedRole of allowed) {
        if (adminRoles.includes(allowedRole as string)) {
          if (isRoleAtLeast(userRole as Admin.AdminRole, allowedRole as Admin.AdminRole)) {
            return; // Access granted
          }
        }
        // SUPER_ADMIN and ADMIN can also access routes that require Role.ADMIN
        if (allowedRole === Role.ADMIN && (userRole === 'SUPER_ADMIN' || userRole === 'ADMIN')) {
          return; // Access granted
        }
      }
      return reply.status(403).send({
        error: 'Forbidden',
        message: 'Insufficient role permissions',
      });
    }
    
    // For regular user roles, do exact match
    if (!allowed.includes(userRole as Role)) {
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

    const userRole = user.role as Role;
    const userPermissions = RolePermissions[userRole] || [];
    if (!userPermissions.includes(required)) {
      return reply.status(403).send({
        error: 'Forbidden',
        message: 'Insufficient permissions',
      });
    }
  };
}
