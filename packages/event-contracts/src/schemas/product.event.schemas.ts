/**
 * Product Event Schemas - Runtime validation with Zod
 */
import { z } from 'zod';
import { baseEventSchema } from './auth.event.schemas';

// ================== PRODUCT EVENTS ==================

/**
 * Schema for product created event
 */
export const productCreatedEventSchema = baseEventSchema.extend({
  productId: z.string().min(1),
  merchantId: z.string().min(1),
  organizationId: z.string().optional(),
  name: z.string().min(1).max(255),
  sku: z.string().optional(),
  category: z.string().optional(),
  status: z.enum(['draft', 'pending_review', 'active', 'inactive', 'discontinued']).default('draft'),
});

export type ProductCreatedEvent = z.infer<typeof productCreatedEventSchema>;

/**
 * Schema for product updated event
 */
export const productUpdatedEventSchema = baseEventSchema.extend({
  productId: z.string().min(1),
  merchantId: z.string().min(1),
  updatedBy: z.string().min(1),
  changes: z.record(z.object({
    from: z.unknown(),
    to: z.unknown(),
  })),
  version: z.number().int().positive().optional(),
});

export type ProductUpdatedEvent = z.infer<typeof productUpdatedEventSchema>;

/**
 * Schema for product deleted event
 */
export const productDeletedEventSchema = baseEventSchema.extend({
  productId: z.string().min(1),
  merchantId: z.string().min(1),
  deletedBy: z.string().min(1),
  reason: z.string().max(500).optional(),
  softDelete: z.boolean().default(true),
});

export type ProductDeletedEvent = z.infer<typeof productDeletedEventSchema>;

/**
 * Schema for product status changed event
 */
export const productStatusChangedEventSchema = baseEventSchema.extend({
  productId: z.string().min(1),
  merchantId: z.string().min(1),
  previousStatus: z.enum(['draft', 'pending_review', 'active', 'inactive', 'discontinued']),
  newStatus: z.enum(['draft', 'pending_review', 'active', 'inactive', 'discontinued']),
  changedBy: z.string().min(1),
  reason: z.string().max(500).optional(),
});

export type ProductStatusChangedEvent = z.infer<typeof productStatusChangedEventSchema>;

/**
 * Schema for product compliance changed event
 */
export const productComplianceChangedEventSchema = baseEventSchema.extend({
  productId: z.string().min(1),
  merchantId: z.string().min(1),
  previousStatus: z.enum(['pending', 'compliant', 'non_compliant', 'under_review']).optional(),
  newStatus: z.enum(['pending', 'compliant', 'non_compliant', 'under_review']),
  complianceCheckId: z.string().optional(),
  violations: z.array(z.object({
    ruleId: z.string(),
    ruleCode: z.string(),
    message: z.string(),
    severity: z.enum(['info', 'warning', 'error', 'critical']),
  })).optional(),
});

export type ProductComplianceChangedEvent = z.infer<typeof productComplianceChangedEventSchema>;

/**
 * Schema for product inventory changed event
 */
export const productInventoryChangedEventSchema = baseEventSchema.extend({
  productId: z.string().min(1),
  merchantId: z.string().min(1),
  previousQuantity: z.number().int().min(0),
  newQuantity: z.number().int().min(0),
  changeType: z.enum(['sale', 'restock', 'adjustment', 'return', 'transfer', 'write_off']),
  changeAmount: z.number().int(),
  referenceId: z.string().optional(),
  referenceType: z.enum(['order', 'transfer', 'manual']).optional(),
  changedBy: z.string().min(1),
});

export type ProductInventoryChangedEvent = z.infer<typeof productInventoryChangedEventSchema>;
