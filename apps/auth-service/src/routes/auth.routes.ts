import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import {
  register,
  login,
  refreshTokens,
  logout,
  getCurrentUser,
} from '../services/auth.service';
import {
  loginSchema,
  registerSchema,
  refreshTokenSchema,
  logoutSchema,
} from '../schemas/auth.schemas';
import { ValidationError } from '../errors/auth.errors';
import { verifyAccessToken } from '../config/jwt';
import { z } from 'zod';

// Helper to extract token context from request
function getTokenContext(req: FastifyRequest) {
  return {
    userAgent: req.headers['user-agent'],
    ipAddress: req.ip,
  };
}

// Helper to validate request body using Zod safeParse
function validateBody<T>(schema: z.ZodSchema<T>, body: unknown): T {
  const result = schema.safeParse(body);
  if (!result.success) {
    const errors: Record<string, string[]> = {};
    result.error.issues.forEach((issue: z.ZodIssue) => {
      const path = issue.path.join('.') || 'body';
      if (!errors[path]) errors[path] = [];
      errors[path].push(issue.message);
    });
    throw new ValidationError('Validation failed', errors);
  }
  return result.data;
}

export async function authRoutes(app: FastifyInstance) {
  /**
   * POST /auth/register
   * Create a new user account
   */
  app.post('/auth/register', async (req: FastifyRequest, reply: FastifyReply) => {
    const input = validateBody(registerSchema, req.body);
    const context = getTokenContext(req);

    const result = await register(input, context);

    return reply.code(201).send({
      success: true,
      message: 'User registered successfully',
      data: result,
    });
  });

  /**
   * POST /auth/login
   * Authenticate user and get tokens
   */
  app.post('/auth/login', async (req: FastifyRequest, reply: FastifyReply) => {
    const input = validateBody(loginSchema, req.body);
    const context = getTokenContext(req);

    const result = await login(input, context);

    return reply.send({
      success: true,
      message: 'Login successful',
      data: result,
    });
  });

  /**
   * POST /auth/refresh
   * Refresh access token using refresh token
   */
  app.post('/auth/refresh', async (req: FastifyRequest, reply: FastifyReply) => {
    const input = validateBody(refreshTokenSchema, req.body);
    const context = getTokenContext(req);

    const tokens = await refreshTokens(input.refreshToken, context);

    return reply.send({
      success: true,
      message: 'Tokens refreshed successfully',
      data: { tokens },
    });
  });

  /**
   * POST /auth/logout
   * Revoke refresh token(s)
   */
  app.post('/auth/logout', async (req: FastifyRequest, reply: FastifyReply) => {
    const input = validateBody(logoutSchema, req.body);

    // Try to get user ID from authorization header (optional)
    let userId: string | undefined;
    const authHeader = req.headers.authorization;
    if (authHeader?.startsWith('Bearer ')) {
      try {
        const token = authHeader.substring(7);
        const payload = verifyAccessToken(token);
        userId = payload.sub;
      } catch {
        // Token invalid/expired - still allow logout with refresh token
      }
    }

    const result = await logout(input, userId);

    return reply.send({
      success: true,
      message: 'Logged out successfully',
      data: result,
    });
  });

  /**
   * GET /auth/me
   * Get current authenticated user
   */
  app.get('/auth/me', async (req: FastifyRequest, reply: FastifyReply) => {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
      return reply.code(401).send({
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          message: 'No authorization token provided',
        },
      });
    }

    const token = authHeader.substring(7);
    const payload = verifyAccessToken(token);

    const user = await getCurrentUser(payload.sub);
    if (!user) {
      return reply.code(404).send({
        success: false,
        error: {
          code: 'USER_NOT_FOUND',
          message: 'User not found',
        },
      });
    }

    return reply.send({
      success: true,
      data: {
        user: {
          id: String(user._id),
          email: user.email,
          role: user.role,
          firstName: user.firstName,
          lastName: user.lastName,
          organizationId: user.organizationId,
          emailVerified: user.emailVerified,
          createdAt: user.createdAt,
        },
      },
    });
  });

  /**
   * PATCH /auth/internal/users/:userId/organization
   * Internal endpoint to update user's organization ID
   * Called by user-org-service when creating an organization
   */
  app.patch('/auth/internal/users/:userId/organization', async (req: FastifyRequest, reply: FastifyReply) => {
    // Verify internal service call (check for internal header)
    const internalKey = req.headers['x-internal-key'] as string;
    const expectedKey = process.env.INTERNAL_SERVICE_KEY;
    if (!expectedKey || internalKey !== expectedKey) {
      return reply.code(403).send({
        success: false,
        error: {
          code: 'FORBIDDEN',
          message: 'Internal endpoint',
        },
      });
    }

    const { userId } = req.params as { userId: string };
    const { organizationId } = req.body as { organizationId: string };

    if (!organizationId) {
      return reply.code(400).send({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'organizationId is required',
        },
      });
    }

    const { UserRepo } = await import('../repositories/user.repository');
    const user = await UserRepo.update(userId, { organizationId });

    if (!user) {
      return reply.code(404).send({
        success: false,
        error: {
          code: 'USER_NOT_FOUND',
          message: 'User not found',
        },
      });
    }

    return reply.send({
      success: true,
      data: { userId, organizationId },
    });
  });

  /**
   * GET /health
   * Health check endpoint
   */
  app.get('/health', async (_req: FastifyRequest, reply: FastifyReply) => {
    return reply.send({
      status: 'ok',
      service: 'auth-service',
      timestamp: new Date().toISOString(),
    });
  });
}
