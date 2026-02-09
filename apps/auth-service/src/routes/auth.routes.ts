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
  forgotPasswordSchema,
  resetPasswordSchema,
  validateResetTokenSchema,
  verifyEmailSchema,
  resendVerificationSchema,
} from '../schemas/auth.schemas';
import { PasswordResetService, EmailVerificationService } from '../services/password-reset.service';
import { revokeAllUserTokens } from '../services/token.service';
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

  // ================== PASSWORD RESET ROUTES ==================

  /**
   * POST /auth/forgot-password
   * Request a password reset email
   */
  app.post('/auth/forgot-password', async (req: FastifyRequest, reply: FastifyReply) => {
    const input = validateBody(forgotPasswordSchema, req.body);

    const result = await PasswordResetService.createResetToken(input.email);

    // Always return success to prevent email enumeration
    // In production, send email here if result is not null
    if (result) {
      console.log(`[Auth] Password reset requested for user ${result.userId}`);
      // TODO: Send email with reset link containing result.token
      // Example: https://yourdomain.com/reset-password?token=${result.token}
    }

    return reply.send({
      success: true,
      message: 'If an account with that email exists, a password reset link has been sent.',
    });
  });

  /**
   * POST /auth/validate-reset-token
   * Validate a password reset token (before showing reset form)
   */
  app.post('/auth/validate-reset-token', async (req: FastifyRequest, reply: FastifyReply) => {
    const input = validateBody(validateResetTokenSchema, req.body);

    const resetRecord = await PasswordResetService.validateToken(input.token);

    if (!resetRecord) {
      return reply.code(400).send({
        success: false,
        error: {
          code: 'INVALID_TOKEN',
          message: 'Invalid or expired reset token',
        },
      });
    }

    return reply.send({
      success: true,
      message: 'Token is valid',
      data: { valid: true },
    });
  });

  /**
   * POST /auth/reset-password
   * Reset password using a valid token
   */
  app.post('/auth/reset-password', async (req: FastifyRequest, reply: FastifyReply) => {
    const input = validateBody(resetPasswordSchema, req.body);

    // Reset the password
    await PasswordResetService.resetPassword(input.token, input.password);

    // Get user ID from token to revoke all sessions
    const resetRecord = await PasswordResetService.validateToken(input.token);
    if (resetRecord) {
      await revokeAllUserTokens(String(resetRecord.userId));
    }

    return reply.send({
      success: true,
      message: 'Password has been reset successfully. Please log in with your new password.',
    });
  });

  // ================== EMAIL VERIFICATION ROUTES ==================

  /**
   * POST /auth/verify-email
   * Verify email address using token
   */
  app.post('/auth/verify-email', async (req: FastifyRequest, reply: FastifyReply) => {
    const input = validateBody(verifyEmailSchema, req.body);

    const result = await EmailVerificationService.verifyEmail(input.token);

    return reply.send({
      success: true,
      message: 'Email verified successfully',
      data: {
        userId: result.userId,
        email: result.email,
      },
    });
  });

  /**
   * POST /auth/resend-verification
   * Resend email verification link
   */
  app.post('/auth/resend-verification', async (req: FastifyRequest, reply: FastifyReply) => {
    const input = validateBody(resendVerificationSchema, req.body);

    const result = await EmailVerificationService.resendVerification(input.email);

    // Always return success to prevent email enumeration
    if (result) {
      console.log(`[Auth] Verification email resent for user ${result.userId}`);
      // TODO: Send verification email with result.token
      // Example: https://yourdomain.com/verify-email?token=${result.token}
    }

    return reply.send({
      success: true,
      message: 'If an unverified account with that email exists, a verification link has been sent.',
    });
  });

  // ================== INTERNAL ENDPOINTS ==================

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
}
