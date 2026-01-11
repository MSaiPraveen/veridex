import { z } from 'zod';
import { Role } from '@veridex/roles-permissions';

/**
 * Validation schemas for user-org-service
 */

// ================== USER SCHEMAS ==================

export const createUserSchema = z.object({
  authUserId: z.string().min(1, 'Auth user ID is required'),
  email: z.string().email('Invalid email format').toLowerCase().trim(),
  role: z.nativeEnum(Role),
  firstName: z.string().max(50).trim().optional(),
  lastName: z.string().max(50).trim().optional(),
  phone: z.string().max(20).trim().optional(),
});

export const updateUserSchema = z.object({
  firstName: z.string().max(50).trim().optional(),
  lastName: z.string().max(50).trim().optional(),
  phone: z.string().max(20).trim().optional(),
  avatarUrl: z.string().url().optional().nullable(),
  isActive: z.boolean().optional(),
});

export const userQuerySchema = z.object({
  role: z.string().transform(v => v.toUpperCase()).pipe(z.nativeEnum(Role)).optional(),
  isActive: z.boolean().optional(),
  search: z.string().optional(),
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(100).default(20),
  sortBy: z.enum(['createdAt', 'email', 'firstName', 'lastName']).default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
});

// ================== ORGANIZATION SCHEMAS ==================

export const createOrganizationSchema = z.object({
  name: z.string().min(1).max(100).trim(),
  type: z.enum(['MERCHANT', 'VENDOR', 'DISPENSARY', 'CULTIVATOR', 'MANUFACTURER']),
  description: z.string().max(500).optional(),
  website: z.string().url().optional(),
  phone: z.string().max(20).optional(),
  email: z.string().email().toLowerCase().optional(),
  address: z.object({
    street: z.string().optional(),
    city: z.string().optional(),
    state: z.string().max(2).optional(),
    zipCode: z.string().optional(),
    country: z.string().default('USA'),
  }).optional(),
  licenseNumber: z.string().optional(),
  licenseState: z.string().max(2).optional(),
  ownerUserId: z.string().optional(),
});

export const updateOrganizationSchema = z.object({
  name: z.string().min(1).max(100).trim().optional(),
  description: z.string().max(500).optional().nullable(),
  logo: z.string().url().optional().nullable(),
  website: z.string().url().optional().nullable(),
  phone: z.string().max(20).optional().nullable(),
  email: z.string().email().toLowerCase().optional().nullable(),
  address: z.object({
    street: z.string().optional(),
    city: z.string().optional(),
    state: z.string().max(2).optional(),
    zipCode: z.string().optional(),
    country: z.string().optional(),
  }).optional(),
  licenseNumber: z.string().optional().nullable(),
  licenseState: z.string().max(2).optional().nullable(),
  isActive: z.boolean().optional(),
});

export const orgQuerySchema = z.object({
  type: z.enum(['MERCHANT', 'VENDOR', 'DISPENSARY', 'CULTIVATOR', 'MANUFACTURER']).optional(),
  isActive: z.boolean().optional(),
  isVerified: z.boolean().optional(),
  search: z.string().optional(),
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(100).default(20),
  sortBy: z.enum(['createdAt', 'name']).default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
});

// ================== MEMBERSHIP SCHEMAS ==================

export const addMemberSchema = z.object({
  userId: z.string().min(1, 'User ID is required'),
  role: z.enum(['ADMIN', 'MANAGER', 'STAFF', 'VIEWER']),
  permissions: z.array(z.string()).optional(),
});

export const updateMemberSchema = z.object({
  role: z.enum(['ADMIN', 'MANAGER', 'STAFF', 'VIEWER']).optional(),
  status: z.enum(['ACTIVE', 'SUSPENDED']).optional(),
  permissions: z.array(z.string()).optional(),
});

// Type exports for use in routes
export type CreateUserInput = z.infer<typeof createUserSchema>;
export type UpdateUserInput = z.infer<typeof updateUserSchema>;
export type UserQueryInput = z.infer<typeof userQuerySchema>;
export type CreateOrganizationInput = z.infer<typeof createOrganizationSchema>;
export type UpdateOrganizationInput = z.infer<typeof updateOrganizationSchema>;
export type OrgQueryInput = z.infer<typeof orgQuerySchema>;
export type AddMemberInput = z.infer<typeof addMemberSchema>;
export type UpdateMemberInput = z.infer<typeof updateMemberSchema>;
