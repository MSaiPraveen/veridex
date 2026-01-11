import { NotificationRepo, NotificationQueryOptions, PaginatedNotifications, NotificationStats } from '../repositories/notification.repo';
import { PreferencesRepo } from '../repositories/preferences.repo';
import { sendEmail, sendTemplatedEmail } from './email.service';
import { INotification, LeanNotification, INotificationBase, NotificationChannel, NotificationCategory } from '../domain/notification.entity';
import { LeanNotificationPreferences, INotificationPreferencesBase } from '../domain/notification-preferences.entity';
import { NotFoundError, ValidationError, NotificationDeliveryError } from '../errors/service.errors';
import { Types } from 'mongoose';

type NotificationResult = INotification | LeanNotification;

// =====================
// Notification Sending
// =====================

export interface SendNotificationInput {
  userId: string;
  email?: string;
  phone?: string;
  title: string;
  message: string;
  category?: NotificationCategory;
  priority?: 'LOW' | 'NORMAL' | 'HIGH' | 'URGENT';
  channels?: NotificationChannel[];
  data?: Record<string, unknown>;
  actionUrl?: string;
  actionLabel?: string;
  organizationId?: string;
  templateId?: string;
  templateData?: Record<string, unknown>;
  sourceService?: string;
  sourceEventId?: string;
}

export async function notifyUser(input: SendNotificationInput): Promise<NotificationResult[]> {
  const {
    userId,
    email,
    phone,
    title,
    message,
    category = 'SYSTEM',
    priority = 'NORMAL',
    channels = ['IN_APP'],
    data,
    actionUrl,
    actionLabel,
    organizationId,
    templateId,
    templateData,
    sourceService,
    sourceEventId,
  } = input;

  const results: NotificationResult[] = [];

  // Get user preferences to check which channels are enabled
  const preferences = await PreferencesRepo.findByUserId(userId);

  for (const channel of channels) {
    // Check if channel is enabled in preferences
    if (preferences && !isChannelEnabled(preferences, channel, category)) {
      continue;
    }

    try {
      const notification = await NotificationRepo.create({
        userId: new Types.ObjectId(userId) as unknown as Types.ObjectId,
        organizationId: organizationId ? new Types.ObjectId(organizationId) as unknown as Types.ObjectId : undefined,
        channel,
        category,
        priority,
        status: 'PENDING',
        title,
        message,
        data,
        recipientEmail: email,
        recipientPhone: phone,
        actionUrl,
        actionLabel,
        templateId,
        templateData,
        sourceService,
        sourceEventId,
        retryCount: 0,
        maxRetries: 3,
        read: false,
      } as unknown as Partial<INotificationBase>);

      // Process based on channel
      switch (channel) {
        case 'EMAIL':
          if (email) {
            try {
              if (templateId && templateData) {
                await sendTemplatedEmail(email, templateId, templateData);
              } else {
                await sendEmail(email, title, message);
              }
              await NotificationRepo.updateStatus(notification._id.toString(), 'SENT');
            } catch (error) {
              await NotificationRepo.updateStatus(notification._id.toString(), 'FAILED', {
                failureReason: (error as Error).message,
              });
            }
          }
          break;

        case 'IN_APP':
          // In-app notifications are immediately delivered
          await NotificationRepo.updateStatus(notification._id.toString(), 'DELIVERED');
          break;

        case 'SMS':
          // SMS delivery would be implemented here
          await NotificationRepo.updateStatus(notification._id.toString(), 'PENDING');
          break;

        case 'PUSH':
          // Push notification delivery would be implemented here
          await NotificationRepo.updateStatus(notification._id.toString(), 'PENDING');
          break;

        case 'WEBHOOK':
          // Webhook delivery would be implemented here
          await NotificationRepo.updateStatus(notification._id.toString(), 'PENDING');
          break;
      }

      results.push(notification);
    } catch (error) {
      console.error(`Failed to send notification via ${channel}:`, error);
    }
  }

  return results;
}

function isChannelEnabled(
  preferences: LeanNotificationPreferences,
  channel: NotificationChannel,
  category: NotificationCategory
): boolean {
  // Check global channel settings
  switch (channel) {
    case 'EMAIL':
      if (!preferences.email?.enabled) return false;
      break;
    case 'IN_APP':
      if (!preferences.inApp?.enabled) return false;
      break;
    case 'SMS':
      if (!preferences.sms?.enabled) return false;
      break;
    case 'PUSH':
      if (!preferences.push?.enabled) return false;
      break;
    case 'WEBHOOK':
      if (!preferences.webhook?.enabled) return false;
      break;
  }

  // Check category-specific preferences
  const categoryPref = preferences.categoryPreferences?.find((p) => p.category === category);
  if (categoryPref) {
    if (!categoryPref.enabled) return false;
    if (!categoryPref.channels.includes(channel)) return false;
  }

  return true;
}

export async function sendBulkNotifications(
  notifications: SendNotificationInput[]
): Promise<NotificationResult[][]> {
  const results: NotificationResult[][] = [];

  for (const notification of notifications) {
    const result = await notifyUser(notification);
    results.push(result);
  }

  return results;
}

// =====================
// Notification Management
// =====================

export async function getNotificationById(id: string): Promise<NotificationResult> {
  const notification = await NotificationRepo.findById(id);
  if (!notification) {
    throw new NotFoundError('Notification', id);
  }
  return notification;
}

export async function listNotifications(options: NotificationQueryOptions): Promise<PaginatedNotifications> {
  return NotificationRepo.findAll(options);
}

export async function getNotificationsByUser(userId: string, limit?: number): Promise<LeanNotification[]> {
  return NotificationRepo.findByUser(userId, limit);
}

export async function getUnreadNotifications(userId: string): Promise<LeanNotification[]> {
  return NotificationRepo.findUnreadByUser(userId);
}

export async function getUnreadCount(userId: string): Promise<number> {
  return NotificationRepo.getUnreadCount(userId);
}

export async function markAsRead(id: string): Promise<NotificationResult> {
  const notification = await NotificationRepo.markAsRead(id);
  if (!notification) {
    throw new NotFoundError('Notification', id);
  }
  return notification;
}

export async function markManyAsRead(ids: string[]): Promise<number> {
  return NotificationRepo.markManyAsRead(ids);
}

export async function markAllAsRead(userId: string): Promise<number> {
  return NotificationRepo.markAllAsReadForUser(userId);
}

export async function deleteNotification(id: string): Promise<void> {
  const deleted = await NotificationRepo.delete(id);
  if (!deleted) {
    throw new NotFoundError('Notification', id);
  }
}

export async function deleteAllForUser(userId: string): Promise<number> {
  return NotificationRepo.deleteByUser(userId);
}

export async function deleteReadForUser(userId: string): Promise<number> {
  return NotificationRepo.deleteReadByUser(userId);
}

export async function getNotificationStats(userId: string): Promise<NotificationStats> {
  return NotificationRepo.getStatsForUser(userId);
}

// =====================
// Preferences Management
// =====================

export async function getPreferences(userId: string): Promise<LeanNotificationPreferences> {
  let preferences = await PreferencesRepo.findByUserId(userId);
  
  if (!preferences) {
    // Create default preferences
    const defaults = await PreferencesRepo.getDefaultPreferences();
    const created = await PreferencesRepo.upsert(userId, defaults);
    preferences = created as unknown as LeanNotificationPreferences;
  }
  
  return preferences;
}

export async function updatePreferences(
  userId: string,
  data: Partial<INotificationPreferencesBase>
): Promise<LeanNotificationPreferences> {
  const updated = await PreferencesRepo.update(userId, data);
  if (!updated) {
    // If no preferences exist, create with the new data
    const defaults = await PreferencesRepo.getDefaultPreferences();
    const created = await PreferencesRepo.upsert(userId, { ...defaults, ...data });
    return created as unknown as LeanNotificationPreferences;
  }
  return updated;
}

export async function addDeviceToken(userId: string, token: string): Promise<LeanNotificationPreferences> {
  const updated = await PreferencesRepo.addDeviceToken(userId, token);
  if (!updated) {
    throw new NotFoundError('Notification preferences', userId);
  }
  return updated;
}

export async function removeDeviceToken(userId: string, token: string): Promise<LeanNotificationPreferences> {
  const updated = await PreferencesRepo.removeDeviceToken(userId, token);
  if (!updated) {
    throw new NotFoundError('Notification preferences', userId);
  }
  return updated;
}

// =====================
// Scheduled & Retry Jobs
// =====================

export async function processScheduledNotifications(): Promise<number> {
  const pending = await NotificationRepo.findPendingScheduled();
  let processed = 0;

  for (const notification of pending) {
    try {
      // Process based on channel
      switch (notification.channel) {
        case 'EMAIL':
          if (notification.recipientEmail) {
            if (notification.templateId && notification.templateData) {
              await sendTemplatedEmail(
                notification.recipientEmail,
                notification.templateId,
                notification.templateData as Record<string, unknown>
              );
            } else {
              await sendEmail(notification.recipientEmail, notification.title, notification.message);
            }
          }
          break;
        // Handle other channels...
      }

      await NotificationRepo.updateStatus(notification._id.toString(), 'SENT');
      processed++;
    } catch (error) {
      await NotificationRepo.updateStatus(notification._id.toString(), 'FAILED', {
        failureReason: (error as Error).message,
      });
    }
  }

  return processed;
}

export async function retryFailedNotifications(): Promise<number> {
  const failed = await NotificationRepo.findFailedForRetry();
  let retried = 0;

  for (const notification of failed) {
    await NotificationRepo.incrementRetryCount(notification._id.toString());

    try {
      switch (notification.channel) {
        case 'EMAIL':
          if (notification.recipientEmail) {
            await sendEmail(notification.recipientEmail, notification.title, notification.message);
          }
          break;
        // Handle other channels...
      }

      await NotificationRepo.updateStatus(notification._id.toString(), 'SENT');
      retried++;
    } catch (error) {
      if (notification.retryCount >= notification.maxRetries - 1) {
        await NotificationRepo.updateStatus(notification._id.toString(), 'FAILED', {
          failureReason: `Max retries exceeded: ${(error as Error).message}`,
        });
      } else {
        await NotificationRepo.updateStatus(notification._id.toString(), 'FAILED', {
          failureReason: (error as Error).message,
        });
      }
    }
  }

  return retried;
}
