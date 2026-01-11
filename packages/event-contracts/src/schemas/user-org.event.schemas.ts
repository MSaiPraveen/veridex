/**
 * User/Organization Event Schemas - Runtime validation with Zod
 */
import { z } from 'zod';
import { baseEventSchema } from './auth.event.schemas';

// ================== USER EVENTS ==================

/**
 * Schema for user created event
 */
export const userCreatedEventSchema = baseEventSchema.extend({
  userId: z.string().min(1),
  email: z.string().email(),
  role: z.enum(['ADMIN', 'MERCHANT', 'CONSUMER']),
  firstName: z.string().optional(),
  lastName: z.string().optional(),
  organizationId: z.string().optional(),
  createdBy: z.string().optional(),
});

export type UserCreatedEvent = z.infer<typeof userCreatedEventSchema>;

/**
 * Schema for user updated event
 */
export const userUpdatedEventSchema = baseEventSchema.extend({
  userId: z.string().min(1),
  updatedBy: z.string().min(1),
  changes: z.record(z.object({
    from: z.unknown(),
    to: z.unknown(),
  })),
});

export type UserUpdatedEvent = z.infer<typeof userUpdatedEventSchema>;

/**
 * Schema for user profile created event
 */
export const userProfileCreatedEventSchema = baseEventSchema.extend({
  userId: z.string().min(1),
  profileId: z.string().min(1),
  firstName: z.string().optional(),
  lastName: z.string().optional(),
  phone: z.string().optional(),
});

export type UserProfileCreatedEvent = z.infer<typeof userProfileCreatedEventSchema>;

/**
 * Schema for user profile updated event
 */
export const userProfileUpdatedEventSchema = baseEventSchema.extend({
  userId: z.string().min(1),
  profileId: z.string().min(1),
  changes: z.record(z.object({
    from: z.unknown(),
    to: z.unknown(),
  })),
});

export type UserProfileUpdatedEvent = z.infer<typeof userProfileUpdatedEventSchema>;

// ================== ORGANIZATION EVENTS ==================

/**
 * Schema for organization created event
 */
export const organizationCreatedEventSchema = baseEventSchema.extend({
  organizationId: z.string().min(1),
  name: z.string().min(1).max(255),
  legalName: z.string().max(255).optional(),
  type: z.enum(['cultivator', 'manufacturer', 'distributor', 'dispensary', 'testing_lab', 'transporter']),
  status: z.enum(['pending', 'active', 'suspended', 'revoked']).default('pending'),
  createdBy: z.string().min(1),
});

export type OrganizationCreatedEvent = z.infer<typeof organizationCreatedEventSchema>;

/**
 * Schema for organization updated event
 */
export const organizationUpdatedEventSchema = baseEventSchema.extend({
  organizationId: z.string().min(1),
  updatedBy: z.string().min(1),
  changes: z.record(z.object({
    from: z.unknown(),
    to: z.unknown(),
  })),
});

export type OrganizationUpdatedEvent = z.infer<typeof organizationUpdatedEventSchema>;

/**
 * Schema for organization status changed event
 */
export const organizationStatusChangedEventSchema = baseEventSchema.extend({
  organizationId: z.string().min(1),
  previousStatus: z.enum(['pending', 'active', 'suspended', 'revoked']),
  newStatus: z.enum(['pending', 'active', 'suspended', 'revoked']),
  changedBy: z.string().min(1),
  reason: z.string().max(500).optional(),
});

export type OrganizationStatusChangedEvent = z.infer<typeof organizationStatusChangedEventSchema>;

/**
 * Schema for organization member added event
 */
export const organizationMemberAddedEventSchema = baseEventSchema.extend({
  organizationId: z.string().min(1),
  userId: z.string().min(1),
  role: z.string(),
  addedBy: z.string().min(1),
});

export type OrganizationMemberAddedEvent = z.infer<typeof organizationMemberAddedEventSchema>;

/**
 * Schema for organization member removed event
 */
export const organizationMemberRemovedEventSchema = baseEventSchema.extend({
  organizationId: z.string().min(1),
  userId: z.string().min(1),
  removedBy: z.string().min(1),
  reason: z.string().max(500).optional(),
});

export type OrganizationMemberRemovedEvent = z.infer<typeof organizationMemberRemovedEventSchema>;
