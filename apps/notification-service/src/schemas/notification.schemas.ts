import { z } from 'zod';

// Notification channel enum
const channelEnum = z.enum(['EMAIL', 'IN_APP', 'SMS', 'PUSH', 'WEBHOOK']);

// Notification priority enum
const priorityEnum = z.enum(['LOW', 'NORMAL', 'HIGH', 'URGENT']);

// Notification status enum
const statusEnum = z.enum(['PENDING', 'SENT', 'DELIVERED', 'FAILED', 'READ']);

// Notification category enum
const categoryEnum = z.enum(['COMPLIANCE', 'DOCUMENT', 'PRODUCT', 'USER', 'SYSTEM', 'ALERT', 'REMINDER']);

// =====================
// Notification Schemas
// =====================

export const createNotificationSchema = z.object({
  userId: z.string().min(1),
  organizationId: z.string().optional(),
  channel: channelEnum,
  category: categoryEnum,
  priority: priorityEnum.optional().default('NORMAL'),
  title: z.string().min(1).max(200),
  message: z.string().min(1).max(2000),
  htmlContent: z.string().max(50000).optional(),
  data: z.record(z.string(), z.any()).optional(),
  recipientEmail: z.string().email().optional(),
  recipientPhone: z.string().optional(),
  webhookUrl: z.string().url().optional(),
  scheduledFor: z.string().datetime().optional(),
  expiresAt: z.string().datetime().optional(),
  actionUrl: z.string().url().optional(),
  actionLabel: z.string().max(50).optional(),
  templateId: z.string().optional(),
  templateData: z.record(z.string(), z.any()).optional(),
  sourceService: z.string().optional(),
  sourceEventId: z.string().optional(),
});

export const sendNotificationSchema = z.object({
  userId: z.string().min(1),
  email: z.string().email().optional(),
  phone: z.string().optional(),
  title: z.string().min(1).max(200),
  message: z.string().min(1).max(2000),
  category: categoryEnum.optional().default('SYSTEM'),
  priority: priorityEnum.optional().default('NORMAL'),
  channels: z.array(channelEnum).optional().default(['IN_APP']),
  data: z.record(z.string(), z.any()).optional(),
  actionUrl: z.string().url().optional(),
  actionLabel: z.string().max(50).optional(),
});

export const notificationQuerySchema = z.object({
  userId: z.string().optional(),
  organizationId: z.string().optional(),
  channel: channelEnum.optional(),
  category: categoryEnum.optional(),
  priority: priorityEnum.optional(),
  status: statusEnum.optional(),
  read: z.enum(['true', 'false']).optional(),
  fromDate: z.string().datetime().optional(),
  toDate: z.string().datetime().optional(),
  page: z.string().regex(/^\d+$/).optional().default('1'),
  limit: z.string().regex(/^\d+$/).optional().default('20'),
  sortBy: z.enum(['createdAt', 'priority', 'status', 'category']).optional().default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).optional().default('desc'),
});

// =====================
// Notification Preferences Schemas
// =====================

const categoryPreferenceSchema = z.object({
  category: categoryEnum,
  channels: z.array(channelEnum),
  enabled: z.boolean().default(true),
});

export const updatePreferencesSchema = z.object({
  email: z.object({
    enabled: z.boolean().optional(),
    address: z.string().email().optional(),
    digestEnabled: z.boolean().optional(),
    digestFrequency: z.enum(['DAILY', 'WEEKLY', 'NONE']).optional(),
  }).optional(),
  inApp: z.object({
    enabled: z.boolean().optional(),
    showBadge: z.boolean().optional(),
    playSound: z.boolean().optional(),
  }).optional(),
  sms: z.object({
    enabled: z.boolean().optional(),
    phoneNumber: z.string().optional(),
  }).optional(),
  push: z.object({
    enabled: z.boolean().optional(),
    deviceTokens: z.array(z.string()).optional(),
  }).optional(),
  webhook: z.object({
    enabled: z.boolean().optional(),
    url: z.string().url().optional(),
    secret: z.string().optional(),
  }).optional(),
  categoryPreferences: z.array(categoryPreferenceSchema).optional(),
  quietHours: z.object({
    enabled: z.boolean().optional(),
    start: z.string().regex(/^\d{2}:\d{2}$/).optional(),
    end: z.string().regex(/^\d{2}:\d{2}$/).optional(),
    timezone: z.string().optional(),
  }).optional(),
});

// =====================
// Bulk Operations Schemas
// =====================

export const bulkSendSchema = z.object({
  notifications: z.array(sendNotificationSchema).min(1).max(100),
});

export const markReadSchema = z.object({
  notificationIds: z.array(z.string().min(1)).min(1).max(100),
});

// =====================
// Route Params Schemas
// =====================

export const idParamSchema = z.object({
  id: z.string().min(1),
});

export const userIdParamSchema = z.object({
  userId: z.string().min(1),
});

// Type exports
export type CreateNotificationInput = z.infer<typeof createNotificationSchema>;
export type SendNotificationInput = z.infer<typeof sendNotificationSchema>;
export type NotificationQueryInput = z.infer<typeof notificationQuerySchema>;
export type UpdatePreferencesInput = z.infer<typeof updatePreferencesSchema>;
export type BulkSendInput = z.infer<typeof bulkSendSchema>;
export type MarkReadInput = z.infer<typeof markReadSchema>;
