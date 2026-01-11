/**
 * Notification Event Schemas - Runtime validation with Zod
 */
import { z } from 'zod';
import { baseEventSchema } from './auth.event.schemas';

// ================== NOTIFICATION EVENTS ==================

/**
 * Schema for notification send requested event
 */
export const notificationSendRequestedEventSchema = baseEventSchema.extend({
  notificationId: z.string().min(1),
  userId: z.string().optional(),
  organizationId: z.string().optional(),
  broadcast: z.boolean().default(false),
  type: z.enum(['info', 'success', 'warning', 'error', 'action_required']),
  priority: z.enum(['low', 'normal', 'high', 'urgent']).default('normal'),
  channels: z.array(z.enum(['in_app', 'email', 'sms', 'push'])).min(1),
  title: z.string().min(1).max(255),
  message: z.string().min(1).max(2000),
  actionUrl: z.string().url().optional(),
  templateId: z.string().optional(),
  templateData: z.record(z.unknown()).optional(),
  scheduledFor: z.string().datetime().optional(),
});

export type NotificationSendRequestedEvent = z.infer<typeof notificationSendRequestedEventSchema>;

/**
 * Schema for notification sent event
 */
export const notificationSentEventSchema = baseEventSchema.extend({
  notificationId: z.string().min(1),
  userId: z.string().min(1),
  channel: z.enum(['in_app', 'email', 'sms', 'push']),
  status: z.enum(['sent', 'delivered', 'failed']),
  externalId: z.string().optional(),
  failureReason: z.string().max(500).optional(),
});

export type NotificationSentEvent = z.infer<typeof notificationSentEventSchema>;

/**
 * Schema for notification read event
 */
export const notificationReadEventSchema = baseEventSchema.extend({
  notificationId: z.string().min(1),
  userId: z.string().min(1),
});

export type NotificationReadEvent = z.infer<typeof notificationReadEventSchema>;

/**
 * Schema for notification action taken event
 */
export const notificationActionTakenEventSchema = baseEventSchema.extend({
  notificationId: z.string().min(1),
  userId: z.string().min(1),
  action: z.string().max(100),
  actionUrl: z.string().url().optional(),
});

export type NotificationActionTakenEvent = z.infer<typeof notificationActionTakenEventSchema>;
