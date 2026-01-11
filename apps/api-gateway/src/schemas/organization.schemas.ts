import { z } from 'zod';

// ============================================
// Organization Schemas
// ============================================

// Organization type enum
const organizationTypeEnum = z.enum([
  'cultivator',
  'manufacturer',
  'distributor',
  'dispensary',
  'testing_lab',
  'transporter'
]);

// Organization status enum
const organizationStatusEnum = z.enum([
  'pending',
  'active',
  'suspended',
  'revoked'
]);

// License type enum
const licenseTypeEnum = z.enum([
  'cultivation',
  'manufacturing',
  'distribution',
  'retail',
  'testing',
  'transport',
  'microbusiness'
]);

// Address schema (reusable)
const addressSchema = z.object({
  street1: z.string().min(1).max(255),
  street2: z.string().max(255).optional(),
  city: z.string().min(1).max(100),
  state: z.string().length(2),
  zipCode: z.string().regex(/^\d{5}(-\d{4})?$/, 'Invalid ZIP code'),
  country: z.string().length(2).default('US'),
  coordinates: z.object({
    lat: z.number().min(-90).max(90),
    lng: z.number().min(-180).max(180),
  }).optional(),
}).strict();

// License schema
const licenseSchema = z.object({
  type: licenseTypeEnum,
  number: z.string().min(1).max(100),
  issuingAuthority: z.string().min(1).max(255),
  jurisdiction: z.string().max(50),
  issuedAt: z.string().datetime(),
  expiresAt: z.string().datetime(),
  status: z.enum(['active', 'pending', 'expired', 'suspended', 'revoked']),
  documentId: z.string().regex(/^[a-f\d]{24}$/i, 'Invalid ObjectId').optional(),
}).strict();

// Create organization
export const createOrganizationBodySchema = z.object({
  name: z.string().min(1).max(255),
  legalName: z.string().min(1).max(255),
  type: organizationTypeEnum,
  description: z.string().max(2000).optional(),
  ein: z.string().regex(/^\d{2}-\d{7}$/, 'Invalid EIN format (XX-XXXXXXX)').optional(),
  primaryAddress: addressSchema,
  mailingAddress: addressSchema.optional(),
  phone: z.string().regex(/^\+?[1-9]\d{1,14}$/, 'Invalid phone number'),
  email: z.string().email().max(255),
  website: z.string().url().optional(),
  licenses: z.array(licenseSchema).optional(),
  contacts: z.array(z.object({
    name: z.string().min(1).max(255),
    title: z.string().max(100).optional(),
    email: z.string().email(),
    phone: z.string().regex(/^\+?[1-9]\d{1,14}$/).optional(),
    isPrimary: z.boolean().default(false),
  })).optional(),
  settings: z.object({
    autoApproveProducts: z.boolean().default(false),
    requireDualApproval: z.boolean().default(true),
    notificationPreferences: z.record(z.boolean()).optional(),
  }).optional(),
}).strict();

// Update organization
export const updateOrganizationBodySchema = z.object({
  name: z.string().min(1).max(255).optional(),
  legalName: z.string().min(1).max(255).optional(),
  type: organizationTypeEnum.optional(),
  description: z.string().max(2000).optional(),
  ein: z.string().regex(/^\d{2}-\d{7}$/, 'Invalid EIN format').optional(),
  primaryAddress: addressSchema.optional(),
  mailingAddress: addressSchema.nullable().optional(),
  phone: z.string().regex(/^\+?[1-9]\d{1,14}$/).optional(),
  email: z.string().email().max(255).optional(),
  website: z.string().url().nullable().optional(),
  contacts: z.array(z.object({
    name: z.string().min(1).max(255),
    title: z.string().max(100).optional(),
    email: z.string().email(),
    phone: z.string().regex(/^\+?[1-9]\d{1,14}$/).optional(),
    isPrimary: z.boolean().default(false),
  })).optional(),
  settings: z.object({
    autoApproveProducts: z.boolean().optional(),
    requireDualApproval: z.boolean().optional(),
    notificationPreferences: z.record(z.boolean()).optional(),
  }).optional(),
}).strict();

// Update organization status
export const updateOrganizationStatusBodySchema = z.object({
  status: organizationStatusEnum,
  reason: z.string().max(500).optional(),
  effectiveDate: z.string().datetime().optional(),
}).strict();

// Add license to organization
export const addLicenseBodySchema = licenseSchema;

// Update license
export const updateLicenseBodySchema = z.object({
  status: z.enum(['active', 'pending', 'expired', 'suspended', 'revoked']).optional(),
  expiresAt: z.string().datetime().optional(),
  documentId: z.string().regex(/^[a-f\d]{24}$/i, 'Invalid ObjectId').optional(),
}).strict();

// Organization query params
export const organizationQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  type: organizationTypeEnum.optional(),
  status: organizationStatusEnum.optional(),
  state: z.string().length(2).optional(),
  search: z.string().max(100).optional(),
  hasLicenseType: licenseTypeEnum.optional(),
  sortBy: z.enum(['createdAt', 'name', 'type', 'status']).default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
}).strict();

// Organization response DTO
export const organizationResponseSchema = z.object({
  id: z.string(),
  name: z.string(),
  legalName: z.string(),
  type: organizationTypeEnum,
  status: organizationStatusEnum,
  description: z.string().nullable().optional(),
  ein: z.string().nullable().optional(),
  primaryAddress: addressSchema,
  mailingAddress: addressSchema.nullable().optional(),
  phone: z.string(),
  email: z.string().email(),
  website: z.string().nullable().optional(),
  licenses: z.array(licenseSchema.extend({ id: z.string() })).optional(),
  contacts: z.array(z.object({
    id: z.string(),
    name: z.string(),
    title: z.string().nullable().optional(),
    email: z.string().email(),
    phone: z.string().nullable().optional(),
    isPrimary: z.boolean(),
  })).optional(),
  memberCount: z.number().optional(),
  createdBy: z.string(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

// Infer types
export type CreateOrganizationBody = z.infer<typeof createOrganizationBodySchema>;
export type UpdateOrganizationBody = z.infer<typeof updateOrganizationBodySchema>;
export type UpdateOrganizationStatusBody = z.infer<typeof updateOrganizationStatusBodySchema>;
export type AddLicenseBody = z.infer<typeof addLicenseBodySchema>;
export type UpdateLicenseBody = z.infer<typeof updateLicenseBodySchema>;
export type OrganizationQuery = z.infer<typeof organizationQuerySchema>;
export type OrganizationResponse = z.infer<typeof organizationResponseSchema>;
