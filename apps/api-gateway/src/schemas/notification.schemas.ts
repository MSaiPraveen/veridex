import { z } from 'zod';

// ============================================
// Notification Schemas
// ============================================

// Notification type enum
const notificationTypeEnum = z.enum([
  'info',
  'success',
  'warning',
  'error',
  'action_required'
]);

// Notification channel
const channelEnum = z.enum([
  'in_app',
  'email',
  'sms',
  'push'
]);

// Notification priority
const priorityEnum = z.enum(['low', 'normal', 'high', 'urgent']);

// Notification status
const notificationStatusEnum = z.enum([
  'pending',
  'sent',
  'delivered',
  'read',
  'failed'
]);

// Mark notification as read
export const markNotificationBodySchema = z.object({
  read: z.boolean(),
}).strict();

// Mark multiple notifications
export const bulkMarkNotificationsBodySchema = z.object({
  notificationIds: z.array(z.string().regex(/^[a-f\d]{24}$/i, 'Invalid ObjectId')).min(1).max(100),
  read: z.boolean(),
}).strict();

// User notification query params
export const notificationQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  type: notificationTypeEnum.optional(),
  read: z.coerce.boolean().optional(),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
  sortBy: z.enum(['createdAt', 'type']).default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
}).strict();

// Admin: Send notification
export const sendNotificationBodySchema = z.object({
  userId: z.string().regex(/^[a-f\d]{24}$/i, 'Invalid ObjectId').optional(),
  organizationId: z.string().regex(/^[a-f\d]{24}$/i, 'Invalid ObjectId').optional(),
  broadcast: z.boolean().default(false),
  roles: z.array(z.enum(['consumer', 'merchant', 'admin'])).optional(),
  type: notificationTypeEnum,
  priority: priorityEnum.default('normal'),
  channels: z.array(channelEnum).min(1).default(['in_app']),
  title: z.string().min(1).max(255),
  message: z.string().min(1).max(2000),
  actionUrl: z.string().url().optional(),
  actionLabel: z.string().max(50).optional(),
  data: z.record(z.unknown()).optional(),
  scheduledFor: z.string().datetime().optional(),
  expiresAt: z.string().datetime().optional(),
}).strict().refine(
  data => data.userId || data.organizationId || data.broadcast,
  { message: 'Must specify userId, organizationId, or set broadcast to true' }
);

// Admin: Create notification template
export const createTemplateBodySchema = z.object({
  name: z.string().min(1).max(100),
  slug: z.string().regex(/^[a-z0-9-]+$/, 'Slug must be lowercase alphanumeric with hyphens').max(100),
  description: z.string().max(500).optional(),
  type: notificationTypeEnum,
  channels: z.array(channelEnum).min(1),
  subject: z.string().max(255).optional(),
  titleTemplate: z.string().min(1).max(255),
  bodyTemplate: z.string().min(1).max(5000),
  htmlTemplate: z.string().max(50000).optional(),
  variables: z.array(z.object({
    name: z.string(),
    type: z.enum(['string', 'number', 'date', 'boolean']),
    required: z.boolean().default(true),
    defaultValue: z.unknown().optional(),
  })).optional(),
  isActive: z.boolean().default(true),
}).strict();

// Admin: Update notification template
export const updateTemplateBodySchema = z.object({
  name: z.string().min(1).max(100).optional(),
  description: z.string().max(500).optional(),
  type: notificationTypeEnum.optional(),
  channels: z.array(channelEnum).min(1).optional(),
  subject: z.string().max(255).optional(),
  titleTemplate: z.string().min(1).max(255).optional(),
  bodyTemplate: z.string().min(1).max(5000).optional(),
  htmlTemplate: z.string().max(50000).nullable().optional(),
  variables: z.array(z.object({
    name: z.string(),
    type: z.enum(['string', 'number', 'date', 'boolean']),
    required: z.boolean().default(true),
    defaultValue: z.unknown().optional(),
  })).optional(),
  isActive: z.boolean().optional(),
}).strict();

// Admin: Template query
export const templateQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  type: notificationTypeEnum.optional(),
  channel: channelEnum.optional(),
  isActive: z.coerce.boolean().optional(),
  search: z.string().max(100).optional(),
  sortBy: z.enum(['createdAt', 'name', 'type']).default('name'),
  sortOrder: z.enum(['asc', 'desc']).default('asc'),
}).strict();

// Notification response DTO
export const notificationResponseSchema = z.object({
  id: z.string(),
  userId: z.string(),
  type: notificationTypeEnum,
  priority: priorityEnum,
  title: z.string(),
  message: z.string(),
  read: z.boolean(),
  readAt: z.string().datetime().nullable().optional(),
  actionUrl: z.string().nullable().optional(),
  actionLabel: z.string().nullable().optional(),
  data: z.record(z.unknown()).optional(),
  expiresAt: z.string().datetime().nullable().optional(),
  createdAt: z.string().datetime(),
});

// Template response DTO
export const templateResponseSchema = z.object({
  id: z.string(),
  name: z.string(),
  slug: z.string(),
  description: z.string().nullable().optional(),
  type: notificationTypeEnum,
  channels: z.array(channelEnum),
  subject: z.string().nullable().optional(),
  titleTemplate: z.string(),
  bodyTemplate: z.string(),
  variables: z.array(z.object({
    name: z.string(),
    type: z.string(),
    required: z.boolean(),
    defaultValue: z.unknown().optional(),
  })).optional(),
  isActive: z.boolean(),
  createdBy: z.string(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

// Infer types
export type MarkNotificationBody = z.infer<typeof markNotificationBodySchema>;
export type BulkMarkNotificationsBody = z.infer<typeof bulkMarkNotificationsBodySchema>;
export type NotificationQuery = z.infer<typeof notificationQuerySchema>;
export type SendNotificationBody = z.infer<typeof sendNotificationBodySchema>;
export type CreateTemplateBody = z.infer<typeof createTemplateBodySchema>;
export type UpdateTemplateBody = z.infer<typeof updateTemplateBodySchema>;
export type TemplateQuery = z.infer<typeof templateQuerySchema>;
export type NotificationResponse = z.infer<typeof notificationResponseSchema>;
export type TemplateResponse = z.infer<typeof templateResponseSchema>;
