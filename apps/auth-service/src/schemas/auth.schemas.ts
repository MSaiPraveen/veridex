import { z } from 'zod';
import { Role } from '@veridex/roles-permissions';

/**
 * Validation schemas for auth-service endpoints
 */

export const emailSchema = z
  .string()
  .email('Invalid email format')
  .min(5, 'Email is too short')
  .max(255, 'Email is too long')
  .toLowerCase()
  .trim();

export const passwordSchema = z
  .string()
  .min(8, 'Password must be at least 8 characters')
  .max(128, 'Password is too long')
  .regex(
    /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/,
    'Password must contain at least one uppercase letter, one lowercase letter, and one number'
  );

export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, 'Password is required'),
});

export const registerSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
  role: z.nativeEnum(Role).optional().default(Role.CONSUMER),
  firstName: z
    .string()
    .min(1, 'First name is required')
    .max(50, 'First name is too long')
    .trim()
    .optional(),
  lastName: z
    .string()
    .max(50, 'Last name is too long')
    .trim()
    .optional(),
  // Merchant-specific fields
  companyName: z
    .string()
    .min(2, 'Company name must be at least 2 characters')
    .max(100, 'Company name is too long')
    .trim()
    .optional(),
  industry: z
    .string()
    .max(50, 'Industry is too long')
    .trim()
    .optional(),
});

export const refreshTokenSchema = z.object({
  refreshToken: z.string().min(1, 'Refresh token is required'),
});

export const logoutSchema = z.object({
  refreshToken: z.string().min(1, 'Refresh token is required'),
  allDevices: z.boolean().optional().default(false),
});

// Type exports for use in services
export type LoginInput = z.infer<typeof loginSchema>;
export type RegisterInput = z.infer<typeof registerSchema>;
export type RefreshTokenInput = z.infer<typeof refreshTokenSchema>;
export type LogoutInput = z.infer<typeof logoutSchema>;
