import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import fp from 'fastify-plugin';
import { getClientIp, isIpWhitelisted } from './ip-whitelist';

/**
 * Admin Security Plugin
 * 
 * Comprehensive security layer for admin routes:
 * 1. IP whitelist verification
 * 2. Admin portal header check
 * 3. Role validation (ADMIN or SUPER_ADMIN)
 * 4. MFA verification check
 * 5. Audit logging of all admin requests
 * 
 * Returns 404 for unauthorized access to hide admin existence.
 */

interface AdminUser {
  id: string;
  email: string;
  role: string;
  mfaVerified?: boolean;
  organizationId?: string;
}

// Extend FastifyRequest to include admin user
declare module 'fastify' {
  interface FastifyRequest {
    adminUser?: AdminUser;
  }
}

// Routes that don't require MFA (login flow)
const MFA_EXEMPT_ROUTES = [
  '/admin/auth/login',
  '/admin/auth/mfa/verify',
  '/admin/auth/mfa/setup',
];

/**
 * Check if request is from the admin portal
 */
function isFromAdminPortal(request: FastifyRequest): boolean {
  return request.headers['x-admin-portal'] === 'true';
}

/**
 * Check if user has admin role
 */
function isAdminRole(role: string): boolean {
  const upperRole = role?.toUpperCase();
  return upperRole === 'ADMIN';
}

/**
 * Log admin access attempt for audit trail
 */
function logAdminAccess(
  request: FastifyRequest,
  status: 'ALLOWED' | 'BLOCKED',
  reason?: string
) {
  const logData = {
    event: 'ADMIN_ACCESS',
    status,
    reason,
    path: request.url,
    method: request.method,
    clientIp: getClientIp(request),
    userId: (request as any).user?.id,
    userEmail: (request as any).user?.email,
    userAgent: request.headers['user-agent'],
    timestamp: new Date().toISOString(),
    requestId: request.id,
  };

  if (status === 'BLOCKED') {
    request.log.warn(logData, `Admin access blocked: ${reason}`);
  } else {
    request.log.info(logData, 'Admin access allowed');
  }
}

/**
 * Admin security hook for all /admin routes
 */
async function adminSecurityHook(
  request: FastifyRequest,
  reply: FastifyReply
): Promise<void> {
  // Skip non-admin routes
  if (!request.url.startsWith('/admin')) {
    return;
  }

  const clientIp = getClientIp(request);

  // Step 1: IP Whitelist Check (production only)
  if (process.env.NODE_ENV === 'production') {
    if (!isIpWhitelisted(clientIp)) {
      logAdminAccess(request, 'BLOCKED', 'IP not whitelisted');
      return reply.status(404).send({ error: 'Not Found' });
    }
  }

  // Step 2: Admin Portal Header Check (production only)
  if (process.env.NODE_ENV === 'production') {
    if (!isFromAdminPortal(request)) {
      logAdminAccess(request, 'BLOCKED', 'Missing admin portal header');
      return reply.status(404).send({ error: 'Not Found' });
    }
  }

  // Step 3: Authentication Check (skip for login routes)
  const isLoginRoute = request.url.includes('/auth/login');
  if (!isLoginRoute) {
    const user = (request as any).user;
    
    if (!user) {
      logAdminAccess(request, 'BLOCKED', 'Not authenticated');
      return reply.status(401).send({ 
        error: 'Unauthorized',
        message: 'Authentication required'
      });
    }

    // Step 4: Role Check
    if (!isAdminRole(user.role)) {
      logAdminAccess(request, 'BLOCKED', `Invalid role: ${user.role}`);
      // Return 404 to hide admin existence from non-admins
      return reply.status(404).send({ error: 'Not Found' });
    }

    // Step 5: MFA Verification Check (skip exempt routes, skip in development)
    const isMfaExempt = MFA_EXEMPT_ROUTES.some(route => 
      request.url.startsWith(route)
    );
    
    // Skip MFA check in development mode
    if (process.env.NODE_ENV !== 'production' && !isMfaExempt && !user.mfaVerified) {
      // In development, we just log but don't block
      request.log.info('MFA not verified, but skipping check in development mode');
    } else if (!isMfaExempt && !user.mfaVerified && process.env.NODE_ENV === 'production') {
      logAdminAccess(request, 'BLOCKED', 'MFA not verified');
      return reply.status(403).send({
        error: 'MFA Required',
        message: 'Multi-factor authentication required',
        code: 'MFA_REQUIRED'
      });
    }

    // Attach admin user to request for route handlers
    request.adminUser = {
      id: user.id,
      email: user.email,
      role: user.role,
      mfaVerified: user.mfaVerified,
      organizationId: user.organizationId,
    };
  }

  logAdminAccess(request, 'ALLOWED');
}

/**
 * Admin Security Plugin
 */
async function adminSecurityPlugin(app: FastifyInstance) {
  app.addHook('preHandler', adminSecurityHook);
}

export default fp(adminSecurityPlugin, {
  name: 'admin-security',
  fastify: '4.x',
  dependencies: ['ip-whitelist'],
});

/**
 * Helper: Require specific admin permissions
 * Use in route handlers for fine-grained access control
 */
export function requireAdminPermission(permissions: string[]) {
  return async (request: FastifyRequest, reply: FastifyReply) => {
    const adminUser = request.adminUser;
    
    if (!adminUser) {
      return reply.status(401).send({ error: 'Unauthorized' });
    }

    // ADMIN has all permissions
    if (adminUser.role === 'ADMIN') {
      return;
    }

    // Check specific permissions (implement based on your permission system)
    // This is a placeholder - integrate with your RBAC system
    const userPermissions = (request as any).user?.permissions || [];
    const hasPermission = permissions.some(p => userPermissions.includes(p));

    if (!hasPermission) {
      request.log.warn({
        event: 'ADMIN_PERMISSION_DENIED',
        userId: adminUser.id,
        requiredPermissions: permissions,
        userPermissions,
      }, 'Admin permission denied');
      
      return reply.status(403).send({
        error: 'Forbidden',
        message: 'Insufficient permissions'
      });
    }
  };
}

export { adminSecurityHook };
