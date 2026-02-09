/**
 * Admin Auth Routes
 * 
 * REST API endpoints for admin authentication.
 * These routes are ONLY accessible from the admin portal.
 */

import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import fastifyCookie from '@fastify/cookie';
import { adminAuthService } from '../services/admin-auth.service';
import { AdminAuthError } from '../errors/admin-auth.errors';

// Cookie options
const COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'strict' as const,
  path: '/admin/auth',
  maxAge: 24 * 60 * 60, // 24 hours in seconds
};

// Request schemas
interface LoginBody {
  email: string;
  password: string;
  deviceId?: string;
}

interface MFAVerifyBody {
  mfaSessionToken: string;
  mfaCode: string;
}

interface RefreshBody {
  refreshToken?: string;
}

interface MFAConfirmBody {
  verificationCode: string;
}

export async function adminAuthRoutes(app: FastifyInstance) {
  // Register cookie plugin
  await app.register(fastifyCookie, {
    secret: process.env.ADMIN_COOKIE_SECRET || 'admin-cookie-secret-change-me',
    parseOptions: {},
  });

  // Error handler for admin auth routes
  const handleError = (error: unknown, reply: FastifyReply) => {
    if (error instanceof AdminAuthError) {
      return reply.status(error.statusCode).send(error.toJSON());
    }
    
    console.error('[Admin Auth] Unexpected error:', error);
    return reply.status(500).send({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'An unexpected error occurred',
      },
    });
  };
  
  /**
   * POST /admin/auth/login
   * Step 1: Validate credentials, return MFA challenge if enabled
   */
  app.post<{ Body: LoginBody }>('/admin/auth/login', async (request, reply) => {
    try {
      const { email, password, deviceId } = request.body;
      const ipAddress = request.ip || request.headers['x-forwarded-for'] as string || 'unknown';
      const userAgent = request.headers['user-agent'] || 'unknown';
      
      const result = await adminAuthService.login(email, password, ipAddress, userAgent, deviceId);
      
      if (result.requiresMfa) {
        return reply.send({
          success: true,
          requiresMfa: true,
          mfaSessionToken: result.mfaSessionToken,
        });
      }
      
      // Set refresh token as httpOnly cookie
      if (result.refreshToken) {
        reply.setCookie('admin_refresh_token', result.refreshToken, COOKIE_OPTIONS);
      }
      
      return reply.send({
        success: true,
        requiresMfa: false,
        tokens: {
          accessToken: result.accessToken,
          refreshToken: result.refreshToken,
        },
        user: result.admin,
      });
    } catch (error) {
      return handleError(error, reply);
    }
  });
  
  /**
   * POST /admin/auth/mfa/verify
   * Step 2: Verify MFA code and complete login
   */
  app.post<{ Body: MFAVerifyBody }>('/admin/auth/mfa/verify', async (request, reply) => {
    try {
      const { mfaSessionToken, mfaCode } = request.body;
      const ipAddress = request.ip || request.headers['x-forwarded-for'] as string || 'unknown';
      const userAgent = request.headers['user-agent'] || 'unknown';
      
      const result = await adminAuthService.verifyMFA(mfaSessionToken, mfaCode, ipAddress, userAgent);
      
      // Set refresh token as httpOnly cookie
      reply.setCookie('admin_refresh_token', result.refreshToken, COOKIE_OPTIONS);
      
      return reply.send({
        success: true,
        tokens: {
          accessToken: result.accessToken,
          refreshToken: result.refreshToken,
        },
        user: result.admin,
      });
    } catch (error) {
      return handleError(error, reply);
    }
  });
  
  /**
   * POST /admin/auth/mfa/setup
   * Initialize MFA setup for admin user
   * Requires authentication
   */
  app.post('/admin/auth/mfa/setup', async (request, reply) => {
    try {
      const adminId = (request as any).adminUser?.adminId;
      
      if (!adminId) {
        throw new AdminAuthError('PERMISSION_DENIED', 'Authentication required', 401);
      }
      
      const result = await adminAuthService.setupMFA(adminId);
      
      return reply.send({
        success: true,
        mfa: {
          secret: result.secret,
          qrCodeUrl: result.qrCodeUrl,
          backupCodes: result.backupCodes,
        },
      });
    } catch (error) {
      return handleError(error, reply);
    }
  });
  
  /**
   * POST /admin/auth/mfa/confirm
   * Confirm MFA setup with verification code
   */
  app.post<{ Body: MFAConfirmBody }>('/admin/auth/mfa/confirm', async (request, reply) => {
    try {
      const adminId = (request as any).adminUser?.adminId;
      const { verificationCode } = request.body;
      
      if (!adminId) {
        throw new AdminAuthError('PERMISSION_DENIED', 'Authentication required', 401);
      }
      
      const result = await adminAuthService.confirmMFASetup(adminId, verificationCode);
      
      return reply.send({
        success: true,
        mfaEnabled: result.success,
      });
    } catch (error) {
      return handleError(error, reply);
    }
  });
  
  /**
   * POST /admin/auth/refresh
   * Refresh access token
   */
  app.post<{ Body: RefreshBody }>('/admin/auth/refresh', async (request, reply) => {
    try {
      const refreshToken = request.body.refreshToken || request.cookies?.['admin_refresh_token'];
      
      if (!refreshToken) {
        throw new AdminAuthError('INVALID_REFRESH_TOKEN', 'Refresh token required', 401);
      }
      
      const ipAddress = request.ip || request.headers['x-forwarded-for'] as string || 'unknown';
      const userAgent = request.headers['user-agent'] || 'unknown';
      
      const result = await adminAuthService.refreshTokens(refreshToken, ipAddress, userAgent);
      
      // Update refresh token cookie
      reply.setCookie('admin_refresh_token', result.refreshToken, COOKIE_OPTIONS);
      
      return reply.send({
        success: true,
        tokens: {
          accessToken: result.accessToken,
          refreshToken: result.refreshToken,
        },
      });
    } catch (error) {
      return handleError(error, reply);
    }
  });
  
  /**
   * POST /admin/auth/logout
   * Logout current session
   */
  app.post('/admin/auth/logout', async (request, reply) => {
    try {
      const sessionId = (request as any).adminUser?.sessionId;
      const adminId = (request as any).adminUser?.adminId;
      
      if (sessionId) {
        await adminAuthService.logout(sessionId, adminId);
      }
      
      // Clear cookie
      reply.clearCookie('admin_refresh_token', {
        path: '/admin/auth',
      });
      
      return reply.send({
        success: true,
        message: 'Logged out successfully',
      });
    } catch (error) {
      return handleError(error, reply);
    }
  });
  
  /**
   * POST /admin/auth/logout-all
   * Logout all sessions for current admin
   */
  app.post('/admin/auth/logout-all', async (request, reply) => {
    try {
      const adminId = (request as any).adminUser?.adminId;
      
      if (!adminId) {
        throw new AdminAuthError('PERMISSION_DENIED', 'Authentication required', 401);
      }
      
      const count = await adminAuthService.logoutAll(adminId, adminId);
      
      // Clear cookie
      reply.clearCookie('admin_refresh_token', {
        path: '/admin/auth',
      });
      
      return reply.send({
        success: true,
        message: `Logged out from ${count} session(s)`,
        sessionsRevoked: count,
      });
    } catch (error) {
      return handleError(error, reply);
    }
  });
  
  /**
   * GET /admin/auth/me
   * Get current admin user info
   */
  app.get('/admin/auth/me', async (request, reply) => {
    try {
      const adminUser = (request as any).adminUser;
      
      if (!adminUser) {
        throw new AdminAuthError('PERMISSION_DENIED', 'Authentication required', 401);
      }
      
      return reply.send({
        success: true,
        user: {
          id: adminUser.adminId,
          email: adminUser.email,
          name: adminUser.name,
          role: adminUser.role,
          permissions: adminUser.permissions,
        },
      });
    } catch (error) {
      return handleError(error, reply);
    }
  });

  // ============================================
  // ADMIN USER MANAGEMENT ROUTES
  // ============================================

  /**
   * GET /admin/auth/admins
   * Get all admin users (for admin management)
   */
  app.get('/admin/auth/admins', async (request, reply) => {
    try {
      const query = request.query as { status?: string; role?: string; search?: string };
      const admins = await adminAuthService.getAllAdmins(query);
      
      return reply.send({
        success: true,
        data: admins,
        total: admins.length,
      });
    } catch (error) {
      return handleError(error, reply);
    }
  });

  /**
   * POST /admin/auth/admins
   * Create a new admin user
   */
  app.post<{ Body: { email: string; password?: string; firstName: string; lastName?: string; role: string; createdBy?: string } }>(
    '/admin/auth/admins',
    async (request, reply) => {
      try {
        const { email, password, firstName, lastName, role, createdBy } = request.body;
        
        if (!email || !firstName || !role) {
          throw new AdminAuthError('VALIDATION_ERROR', 'Missing required fields: email, firstName, role', 400);
        }

        // Validate password if provided
        if (password && password.length < 8) {
          throw new AdminAuthError('VALIDATION_ERROR', 'Password must be at least 8 characters', 400);
        }

        const validRoles = ['ADMIN', 'COMPLIANCE_REVIEWER', 'VIEWER'];
        if (!validRoles.includes(role)) {
          throw new AdminAuthError('VALIDATION_ERROR', `Invalid role. Must be one of: ${validRoles.join(', ')}`, 400);
        }

        const result = await adminAuthService.createAdmin({
          email,
          password,
          firstName,
          lastName,
          role: role as 'ADMIN' | 'COMPLIANCE_REVIEWER' | 'VIEWER',
          createdBy,
        });

        return reply.status(201).send({
          success: true,
          message: 'Admin user created successfully',
          data: result.admin,
          temporaryPassword: result.temporaryPassword,
        });
      } catch (error) {
        return handleError(error, reply);
      }
    }
  );

  /**
   * PATCH /admin/auth/admins/:id/status
   * Update admin status (activate/deactivate/unlock)
   */
  app.patch<{ Params: { id: string }; Body: { status: string; reason?: string } }>(
    '/admin/auth/admins/:id/status',
    async (request, reply) => {
      try {
        const { id } = request.params;
        const { status, reason } = request.body;
        const updatedBy = request.headers['x-user-id'] as string || 'system';
        
        const validStatuses = ['ACTIVE', 'DEACTIVATED', 'LOCKED'];
        if (!validStatuses.includes(status)) {
          throw new AdminAuthError('VALIDATION_ERROR', `Invalid status. Must be one of: ${validStatuses.join(', ')}`, 400);
        }

        const admin = await adminAuthService.updateAdminStatus(
          id, 
          status as 'ACTIVE' | 'DEACTIVATED' | 'LOCKED',
          updatedBy,
          reason
        );

        return reply.send({
          success: true,
          message: `Admin status updated to ${status}`,
          data: admin,
        });
      } catch (error) {
        return handleError(error, reply);
      }
    }
  );
}
