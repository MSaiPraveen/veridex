import { z } from 'zod';

/**
 * Validation schemas for product-service
 */

// Product category enum
const ProductCategoryEnum = z.enum([
  'FLOWER', 'EDIBLE', 'CONCENTRATE', 'TOPICAL', 'TINCTURE', 'PRE_ROLL', 'ACCESSORY', 'OTHER',
  'CANNABIS', 'HEMP_CBD', 'SUPPLEMENT', 'PHARMA', 'PEPTIDE'
]);

// Strain type enum
const StrainTypeEnum = z.enum(['INDICA', 'SATIVA', 'HYBRID']);

// Weight unit enum
const WeightUnitEnum = z.enum(['g', 'oz', 'lb', 'kg']);

// Product status enum
const ProductStatusEnum = z.enum(['DRAFT', 'ACTIVE', 'INACTIVE', 'ARCHIVED']);

// Compliance status enum
const ComplianceStatusEnum = z.enum(['PENDING', 'COMPLIANT', 'NON_COMPLIANT', 'UNDER_REVIEW']);

// ================== CREATE PRODUCT SCHEMA ==================

export const createProductSchema = z.object({
  // These are optional in request body - derived from user context if not provided
  merchantId: z.string().min(1).optional(),
  organizationId: z.string().min(1).optional(),
  
  // Basic Info
  name: z.string().min(1).max(200).trim(),
  sku: z.string().min(1).max(50).trim().toUpperCase(),
  description: z.string().max(2000).optional(),
  category: ProductCategoryEnum,
  subcategory: z.string().max(100).optional(),
  brand: z.string().max(100).optional(),
  
  // Cannabis-specific
  thcContent: z.number().min(0).max(100).optional(),
  cbdContent: z.number().min(0).max(100).optional(),
  strain: z.string().max(100).optional(),
  strainType: StrainTypeEnum.optional(),
  
  // Pricing
  price: z.number().min(0),
  costPrice: z.number().min(0).optional(),
  currency: z.string().length(3).default('USD'),
  
  // Inventory
  quantity: z.number().min(0).default(0),
  unit: z.string().default('unit'),
  weight: z.number().min(0).optional(),
  weightUnit: WeightUnitEnum.optional(),
  
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
  metadata: z.record(z.string(), z.any()).optional(),
});

// ================== UPDATE PRODUCT SCHEMA ==================

export const updateProductSchema = z.object({
  name: z.string().min(1).max(200).trim().optional(),
  description: z.string().max(2000).optional().nullable(),
  subcategory: z.string().max(100).optional().nullable(),
  brand: z.string().max(100).optional().nullable(),
  
  // Cannabis-specific
  thcContent: z.number().min(0).max(100).optional().nullable(),
  cbdContent: z.number().min(0).max(100).optional().nullable(),
  strain: z.string().max(100).optional().nullable(),
  strainType: StrainTypeEnum.optional().nullable(),
  
  // Pricing
  price: z.number().min(0).optional(),
  costPrice: z.number().min(0).optional().nullable(),
  
  // Inventory
  quantity: z.number().min(0).optional(),
  weight: z.number().min(0).optional().nullable(),
  weightUnit: WeightUnitEnum.optional().nullable(),
  
  // Status
  status: ProductStatusEnum.optional(),
  isActive: z.boolean().optional(),
  
  // Tracking
  batchNumber: z.string().max(100).optional().nullable(),
  lotNumber: z.string().max(100).optional().nullable(),
  expirationDate: z.coerce.date().optional().nullable(),
  harvestDate: z.coerce.date().optional().nullable(),
  
  // Lab Testing
  labTested: z.boolean().optional(),
  labTestUrl: z.string().url().optional().nullable(),
  labTestDate: z.coerce.date().optional().nullable(),
  
  // Media
  images: z.array(z.string().url()).optional(),
  thumbnailUrl: z.string().url().optional().nullable(),
  
  // Metadata
  tags: z.array(z.string()).optional(),
  metadata: z.record(z.string(), z.any()).optional(),
});

// ================== QUERY SCHEMA ==================

export const productQuerySchema = z.object({
  merchantId: z.string().optional(),
  organizationId: z.string().optional(),
  category: ProductCategoryEnum.optional(),
  status: ProductStatusEnum.optional(),
  complianceStatus: ComplianceStatusEnum.optional(),
  isActive: z.coerce.boolean().optional(),
  labTested: z.coerce.boolean().optional(),
  minPrice: z.coerce.number().min(0).optional(),
  maxPrice: z.coerce.number().min(0).optional(),
  search: z.string().optional(),
  tags: z.string().optional(), // comma-separated
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(100).default(20),
  sortBy: z.enum(['createdAt', 'updatedAt', 'name', 'price', 'quantity', 'complianceStatus']).default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
  // Scope and sync parameters for organization/global product queries (plus 'all' for admin)
  scope: z.enum(['organization', 'global', 'ORGANIZATION', 'GLOBAL', 'all']).optional(),
  importStatus: z.enum(['imported', 'not_imported', 'outdated']).optional(),
  syncStatus: z.enum(['synced', 'pending', 'out_of_sync']).optional(),
  availability: z.enum(['available', 'unavailable', 'limited']).optional(),
});

// ================== UPDATE COMPLIANCE SCHEMA ==================

export const updateComplianceSchema = z.object({
  complianceStatus: ComplianceStatusEnum,
  complianceNotes: z.string().max(1000).optional(),
});

// ================== INVENTORY UPDATE SCHEMA ==================

export const inventoryUpdateSchema = z.object({
  quantity: z.number().min(0),
  reason: z.string().max(200).optional(),
});

// Type exports
export type CreateProductInput = z.infer<typeof createProductSchema>;
export type UpdateProductInput = z.infer<typeof updateProductSchema>;
export type ProductQueryInput = z.infer<typeof productQuerySchema>;
export type UpdateComplianceInput = z.infer<typeof updateComplianceSchema>;
export type InventoryUpdateInput = z.infer<typeof inventoryUpdateSchema>;
