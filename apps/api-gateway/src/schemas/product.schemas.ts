import { z } from 'zod';
import { paginationSchema, objectIdSchema } from '../plugins/validation';

/**
 * Product API Schemas
 * Validates all product-related requests at the gateway
 */

// ================== ENUMS ==================

export const productCategoryEnum = z.enum([
  'FLOWER', 'EDIBLE', 'CONCENTRATE', 'TOPICAL', 'TINCTURE', 'PRE_ROLL', 'ACCESSORY', 'OTHER',
  'CANNABIS', 'HEMP_CBD', 'SUPPLEMENT', 'PHARMA', 'PEPTIDE'
]);

export const strainTypeEnum = z.enum(['INDICA', 'SATIVA', 'HYBRID']);

export const weightUnitEnum = z.enum(['g', 'oz', 'lb', 'kg']);

export const productStatusEnum = z.enum(['DRAFT', 'ACTIVE', 'INACTIVE', 'ARCHIVED']);

export const complianceStatusEnum = z.enum(['PENDING', 'COMPLIANT', 'NON_COMPLIANT', 'UNDER_REVIEW']);

// ================== CREATE PRODUCT ==================

export const createProductBodySchema = z.object({
  merchantId: z.string().optional(), // Auto-assigned from auth context
  organizationId: z.string().optional(), // Auto-assigned from auth context
  
  // Required
  name: z.string().min(1, 'Name is required').max(200).trim(),
  sku: z.string().min(1, 'SKU is required').max(50).trim(),
  category: productCategoryEnum,
  price: z.number().min(0, 'Price must be positive'),
  
  // Optional fields
  description: z.string().max(2000).optional(),
  subcategory: z.string().max(100).optional(),
  brand: z.string().max(100).optional(),
  
  // Cannabis-specific
  thcContent: z.number().min(0).max(100).optional(),
  cbdContent: z.number().min(0).max(100).optional(),
  strain: z.string().max(100).optional(),
  strainType: strainTypeEnum.optional(),
  
  // Pricing
  costPrice: z.number().min(0).optional(),
  currency: z.string().length(3).default('USD'),
  
  // Inventory
  quantity: z.number().min(0).default(0),
  unit: z.string().default('unit'),
  weight: z.number().min(0).optional(),
  weightUnit: weightUnitEnum.optional(),
  
  // Tracking
  batchNumber: z.string().max(100).optional(),
  lotNumber: z.string().max(100).optional(),
  expirationDate: z.coerce.date().optional(),
  harvestDate: z.coerce.date().optional(),
  
  // Lab Testing
  labTested: z.boolean().default(false),
  labTestUrl: z.string().url().optional(),
  labTestDate: z.coerce.date().optional(),
  
  // Media
  images: z.array(z.string().url()).optional(),
  thumbnailUrl: z.string().url().optional(),
  
  // Metadata
  tags: z.array(z.string()).optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
}).passthrough(); // Allow extra fields to pass through

export type CreateProductInput = z.infer<typeof createProductBodySchema>;

// ================== UPDATE PRODUCT ==================

export const updateProductBodySchema = z.object({
  name: z.string().min(1).max(200).trim().optional(),
  description: z.string().max(2000).optional().nullable(),
  subcategory: z.string().max(100).optional().nullable(),
  brand: z.string().max(100).optional().nullable(),
  
  thcContent: z.number().min(0).max(100).optional().nullable(),
  cbdContent: z.number().min(0).max(100).optional().nullable(),
  strain: z.string().max(100).optional().nullable(),
  strainType: strainTypeEnum.optional().nullable(),
  
  price: z.number().min(0).optional(),
  costPrice: z.number().min(0).optional().nullable(),
  
  quantity: z.number().min(0).optional(),
  weight: z.number().min(0).optional().nullable(),
  weightUnit: weightUnitEnum.optional().nullable(),
  
  status: productStatusEnum.optional(),
  isActive: z.boolean().optional(),
  
  batchNumber: z.string().max(100).optional().nullable(),
  lotNumber: z.string().max(100).optional().nullable(),
  expirationDate: z.coerce.date().optional().nullable(),
  
  labTested: z.boolean().optional(),
  labTestUrl: z.string().url().optional().nullable(),
  labTestDate: z.coerce.date().optional().nullable(),
  
  images: z.array(z.string().url()).optional(),
  thumbnailUrl: z.string().url().optional().nullable(),
  tags: z.array(z.string()).optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
}).strict();

export type UpdateProductInput = z.infer<typeof updateProductBodySchema>;

// ================== QUERY PRODUCTS ==================

// Scope for organization vs global product queries (plus 'all' for admin)
export const productScopeEnum = z.enum(['organization', 'global', 'ORGANIZATION', 'GLOBAL', 'all']);

// Import status for products imported from global catalog
export const importStatusEnum = z.enum(['imported', 'not_imported', 'outdated']);

// Sync status for products with global catalog
export const syncStatusEnum = z.enum(['synced', 'pending', 'out_of_sync']);

// Availability for global products
export const availabilityEnum = z.enum(['available', 'unavailable', 'limited']);

export const productQuerySchema = paginationSchema.extend({
  category: productCategoryEnum.optional(),
  status: productStatusEnum.optional(),
  complianceStatus: complianceStatusEnum.optional(),
  organizationId: z.string().optional(),
  merchantId: z.string().optional(),
  search: z.string().optional(),
  minPrice: z.coerce.number().optional(),
  maxPrice: z.coerce.number().optional(),
  tags: z.string().optional(), // Comma-separated
  labTested: z.coerce.boolean().optional(),
  // New query parameters for scope-based product queries
  scope: productScopeEnum.optional(),
  importStatus: importStatusEnum.optional(),
  syncStatus: syncStatusEnum.optional(),
  availability: availabilityEnum.optional(),
}).passthrough(); // Allow extra fields for flexibility

export type ProductQueryInput = z.infer<typeof productQuerySchema>;

// ================== PRODUCT ID PARAM ==================

export const productIdParamSchema = z.object({
  id: objectIdSchema,
});

// ================== UPDATE STATUS ==================

export const updateStatusBodySchema = z.object({
  status: productStatusEnum,
}).strict();

// ================== UPDATE COMPLIANCE ==================

export const updateComplianceBodySchema = z.object({
  complianceStatus: complianceStatusEnum,
  complianceNotes: z.string().max(2000).optional(),
}).strict();

// ================== INVENTORY ==================

export const updateInventoryBodySchema = z.object({
  quantity: z.number().int().min(0),
  reason: z.string().max(500).optional(),
}).strict();

export const adjustInventoryBodySchema = z.object({
  adjustment: z.number().int(),
  reason: z.string().max(500).optional(),
}).strict();

// ================== RESPONSE SCHEMAS ==================

export const productResponseSchema = z.object({
  _id: z.string(),
  merchantId: z.string(),
  organizationId: z.string(),
  name: z.string(),
  sku: z.string(),
  category: productCategoryEnum,
  status: productStatusEnum,
  complianceStatus: complianceStatusEnum,
  price: z.number(),
  quantity: z.number(),
  isActive: z.boolean(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export type ProductResponse = z.infer<typeof productResponseSchema>;
