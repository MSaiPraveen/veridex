import { z } from 'zod';

// ============================================
// User Schemas
// ============================================

// Role enum for user operations - case insensitive, transforms to lowercase
const userRoleEnum = z.string().transform(v => v.toLowerCase()).pipe(
  z.enum(['consumer', 'merchant', 'admin'])
);

// User profile update
export const updateProfileBodySchema = z.object({
  firstName: z.string().min(1).max(100).optional(),
  lastName: z.string().min(1).max(100).optional(),
  phone: z.string().regex(/^\+?[1-9]\d{1,14}$/, 'Invalid phone number format').optional(),
  avatar: z.string().url().optional(),
  preferences: z.object({
    notifications: z.boolean().optional(),
    newsletter: z.boolean().optional(),
    language: z.string().min(2).max(10).optional(),
    timezone: z.string().max(50).optional(),
  }).optional(),
}).strict();

// User query params for listing
export const userQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  search: z.string().max(100).optional(),
  role: userRoleEnum.optional(),
  organizationId: z.string().regex(/^[a-f\d]{24}$/i, 'Invalid ObjectId').optional(),
  isActive: z.coerce.boolean().optional(),
  sortBy: z.enum(['createdAt', 'email', 'lastName', 'role']).default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
}).strict();

// Admin: Create user
export const createUserBodySchema = z.object({
  email: z.string().email('Invalid email format').max(255),
  password: z.string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/[A-Z]/, 'Password must contain uppercase letter')
    .regex(/[a-z]/, 'Password must contain lowercase letter')
    .regex(/[0-9]/, 'Password must contain a number'),
  firstName: z.string().min(1).max(100),
  lastName: z.string().min(1).max(100),
  role: userRoleEnum.default('consumer'),
  organizationId: z.string().regex(/^[a-f\d]{24}$/i, 'Invalid ObjectId').optional(),
  phone: z.string().regex(/^\+?[1-9]\d{1,14}$/, 'Invalid phone number format').optional(),
}).strict();

// Admin: Update user
export const updateUserBodySchema = z.object({
  email: z.string().email('Invalid email format').max(255).optional(),
  firstName: z.string().min(1).max(100).optional(),
  lastName: z.string().min(1).max(100).optional(),
  role: userRoleEnum.optional(),
  organizationId: z.string().regex(/^[a-f\d]{24}$/i, 'Invalid ObjectId').nullable().optional(),
  phone: z.string().regex(/^\+?[1-9]\d{1,14}$/, 'Invalid phone number format').optional(),
  isActive: z.boolean().optional(),
  isEmailVerified: z.boolean().optional(),
}).strict();

// Admin: Update user status
export const updateUserStatusBodySchema = z.object({
  isActive: z.boolean(),
  reason: z.string().max(500).optional(),
}).strict();

// User profile response DTO (full user details)
export const userProfileResponseSchema = z.object({
  id: z.string(),
  email: z.string().email(),
  firstName: z.string(),
  lastName: z.string(),
  role: userRoleEnum,
  organizationId: z.string().nullable().optional(),
  phone: z.string().nullable().optional(),
  avatar: z.string().nullable().optional(),
  isActive: z.boolean(),
  isEmailVerified: z.boolean(),
  lastLoginAt: z.string().datetime().nullable().optional(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

// Infer types
export type UpdateProfileBody = z.infer<typeof updateProfileBodySchema>;
export type UserQuery = z.infer<typeof userQuerySchema>;
export type CreateUserBody = z.infer<typeof createUserBodySchema>;
export type UpdateUserBody = z.infer<typeof updateUserBodySchema>;
export type UpdateUserStatusBody = z.infer<typeof updateUserStatusBodySchema>;
export type UserProfileResponse = z.infer<typeof userProfileResponseSchema>;
