import { z } from 'zod';

/**
 * Auth API Schemas
 * Validates all auth-related requests at the gateway
 */

// ================== REGISTER ==================

export const registerBodySchema = z.object({
  email: z.string().email('Invalid email format'),
  password: z.string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
    .regex(/[0-9]/, 'Password must contain at least one number'),
  firstName: z.string().min(1).max(100).optional(),
  lastName: z.string().min(1).max(100).optional(),
  role: z.enum(['MERCHANT', 'CONSUMER']).default('CONSUMER'),
  organizationId: z.string().optional(),
  companyName: z.string().optional(),
  industry: z.string().optional(),
}).strict();

export type RegisterInput = z.infer<typeof registerBodySchema>;

// ================== LOGIN ==================

export const loginBodySchema = z.object({
  email: z.string().email('Invalid email format'),
  password: z.string().min(1, 'Password is required'),
}).strict();

export type LoginInput = z.infer<typeof loginBodySchema>;

// ================== REFRESH TOKEN ==================

export const refreshTokenBodySchema = z.object({
  refreshToken: z.string().min(1, 'Refresh token is required'),
}).strict();

export type RefreshTokenInput = z.infer<typeof refreshTokenBodySchema>;

// ================== LOGOUT ==================

export const logoutBodySchema = z.object({
  allDevices: z.boolean().default(false),
}).strict();

export type LogoutInput = z.infer<typeof logoutBodySchema>;

// ================== CHANGE PASSWORD ==================

export const changePasswordBodySchema = z.object({
  currentPassword: z.string().min(1, 'Current password is required'),
  newPassword: z.string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
    .regex(/[0-9]/, 'Password must contain at least one number'),
}).strict().refine(
  (data) => data.currentPassword !== data.newPassword,
  { message: 'New password must be different from current password' }
);

export type ChangePasswordInput = z.infer<typeof changePasswordBodySchema>;

// ================== FORGOT PASSWORD ==================

export const forgotPasswordBodySchema = z.object({
  email: z.string().email('Invalid email format'),
}).strict();

export type ForgotPasswordInput = z.infer<typeof forgotPasswordBodySchema>;

// ================== RESET PASSWORD ==================

export const resetPasswordBodySchema = z.object({
  token: z.string().min(1, 'Reset token is required'),
  newPassword: z.string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
    .regex(/[0-9]/, 'Password must contain at least one number'),
}).strict();

export type ResetPasswordInput = z.infer<typeof resetPasswordBodySchema>;

// ================== VERIFY EMAIL ==================

export const verifyEmailQuerySchema = z.object({
  token: z.string().min(1, 'Verification token is required'),
}).strict();

export type VerifyEmailInput = z.infer<typeof verifyEmailQuerySchema>;

// ================== AUTH RESPONSE SCHEMAS ==================

export const userResponseSchema = z.object({
  id: z.string(),
  email: z.string().email(),
  role: z.enum(['ADMIN', 'MERCHANT', 'CONSUMER']),
  firstName: z.string().optional().nullable(),
  lastName: z.string().optional().nullable(),
  emailVerified: z.boolean(),
  organizationId: z.string().optional().nullable(),
  createdAt: z.string(),
});

export const authResponseSchema = z.object({
  success: z.literal(true),
  data: z.object({
    user: userResponseSchema,
    tokens: z.object({
      accessToken: z.string(),
      refreshToken: z.string(),
    }),
  }),
});

export type AuthResponse = z.infer<typeof authResponseSchema>;
