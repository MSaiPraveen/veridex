import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';
import {
  sendNotificationSchema,
  notificationQuerySchema,
  updatePreferencesSchema,
  bulkSendSchema,
  markReadSchema,
  idParamSchema,
  userIdParamSchema,
  SendNotificationInput,
  NotificationQueryInput,
  UpdatePreferencesInput,
  BulkSendInput,
  MarkReadInput,
} from '../schemas/notification.schemas';
import * as NotificationService from '../services/notification.service';
import { ValidationError } from '../errors/service.errors';

function validate<T extends z.ZodType>(schema: T, data: unknown): z.infer<T> {
  const result = schema.safeParse(data);
  if (!result.success) {
    const message = result.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join(', ');
    throw new ValidationError(message);
  }
  return result.data;
}

export async function notificationRoutes(app: FastifyInstance): Promise<void> {
  // =====================
  // Notification Endpoints
  // =====================

  // Send a notification
  app.post('/notifications/send', async (req: FastifyRequest, reply: FastifyReply) => {
    const data = validate(sendNotificationSchema, req.body) as SendNotificationInput;
    const notifications = await NotificationService.notifyUser(data);
    return reply.status(201).send({ notifications, count: notifications.length });
  });

  // Send bulk notifications
  app.post('/notifications/send/bulk', async (req: FastifyRequest, reply: FastifyReply) => {
    const { notifications } = validate(bulkSendSchema, req.body) as BulkSendInput;
    const results = await NotificationService.sendBulkNotifications(notifications);
    return reply.status(201).send({
      results: results.map((r) => ({ count: r.length })),
      totalSent: results.reduce((sum, r) => sum + r.length, 0),
    });
  });

  // List notifications with filters
  app.get('/notifications', async (req: FastifyRequest, reply: FastifyReply) => {
    const query = validate(notificationQuerySchema, req.query) as NotificationQueryInput;

    const options = {
      userId: query.userId,
      organizationId: query.organizationId,
      channel: query.channel,
      category: query.category,
      priority: query.priority,
      status: query.status,
      read: query.read ? query.read === 'true' : undefined,
      fromDate: query.fromDate ? new Date(query.fromDate) : undefined,
      toDate: query.toDate ? new Date(query.toDate) : undefined,
      page: parseInt(query.page, 10),
      limit: parseInt(query.limit, 10),
      sortBy: query.sortBy,
      sortOrder: query.sortOrder,
    };

    const result = await NotificationService.listNotifications(options);
    return reply.send(result);
  });

  // Get notification by ID
  app.get('/notifications/:id', async (req: FastifyRequest, reply: FastifyReply) => {
    const { id } = validate(idParamSchema, req.params);
    const notification = await NotificationService.getNotificationById(id);
    return reply.send(notification);
  });

  // Delete notification
  app.delete('/notifications/:id', async (req: FastifyRequest, reply: FastifyReply) => {
    const { id } = validate(idParamSchema, req.params);
    await NotificationService.deleteNotification(id);
    return reply.status(204).send();
  });

  // Mark single notification as read
  app.post('/notifications/:id/read', async (req: FastifyRequest, reply: FastifyReply) => {
    const { id } = validate(idParamSchema, req.params);
    const notification = await NotificationService.markAsRead(id);
    return reply.send(notification);
  });

  // Mark multiple notifications as read
  app.post('/notifications/read', async (req: FastifyRequest, reply: FastifyReply) => {
    const { notificationIds } = validate(markReadSchema, req.body) as MarkReadInput;
    const count = await NotificationService.markManyAsRead(notificationIds);
    return reply.send({ marked: count });
  });

  // =====================
  // User-specific Endpoints
  // =====================

  // Get notifications for a user
  app.get('/users/:userId/notifications', async (req: FastifyRequest, reply: FastifyReply) => {
    const { userId } = validate(userIdParamSchema, req.params);
    const limit = (req.query as Record<string, string>).limit;
    const notifications = await NotificationService.getNotificationsByUser(
      userId,
      limit ? parseInt(limit, 10) : undefined
    );
    return reply.send(notifications);
  });

  // Get unread notifications for a user
  app.get('/users/:userId/notifications/unread', async (req: FastifyRequest, reply: FastifyReply) => {
    const { userId } = validate(userIdParamSchema, req.params);
    const notifications = await NotificationService.getUnreadNotifications(userId);
    return reply.send(notifications);
  });

  // Get unread count for a user
  app.get('/users/:userId/notifications/unread/count', async (req: FastifyRequest, reply: FastifyReply) => {
    const { userId } = validate(userIdParamSchema, req.params);
    const count = await NotificationService.getUnreadCount(userId);
    return reply.send({ count });
  });

  // Mark all notifications as read for a user
  app.post('/users/:userId/notifications/read-all', async (req: FastifyRequest, reply: FastifyReply) => {
    const { userId } = validate(userIdParamSchema, req.params);
    const count = await NotificationService.markAllAsRead(userId);
    return reply.send({ marked: count });
  });

  // Delete all notifications for a user
  app.delete('/users/:userId/notifications', async (req: FastifyRequest, reply: FastifyReply) => {
    const { userId } = validate(userIdParamSchema, req.params);
    const count = await NotificationService.deleteAllForUser(userId);
    return reply.send({ deleted: count });
  });

  // Delete read notifications for a user
  app.delete('/users/:userId/notifications/read', async (req: FastifyRequest, reply: FastifyReply) => {
    const { userId } = validate(userIdParamSchema, req.params);
    const count = await NotificationService.deleteReadForUser(userId);
    return reply.send({ deleted: count });
  });

  // Get notification stats for a user
  app.get('/users/:userId/notifications/stats', async (req: FastifyRequest, reply: FastifyReply) => {
    const { userId } = validate(userIdParamSchema, req.params);
    const stats = await NotificationService.getNotificationStats(userId);
    return reply.send(stats);
  });

  // =====================
  // Preferences Endpoints
  // =====================

  // Get user preferences
  app.get('/users/:userId/preferences', async (req: FastifyRequest, reply: FastifyReply) => {
    const { userId } = validate(userIdParamSchema, req.params);
    const preferences = await NotificationService.getPreferences(userId);
    return reply.send(preferences);
  });

  // Update user preferences
  app.patch('/users/:userId/preferences', async (req: FastifyRequest, reply: FastifyReply) => {
    const { userId } = validate(userIdParamSchema, req.params);
    const data = validate(updatePreferencesSchema, req.body) as UpdatePreferencesInput;
    const preferences = await NotificationService.updatePreferences(userId, data as unknown as Parameters<typeof NotificationService.updatePreferences>[1]);
    return reply.send(preferences);
  });

  // Add device token for push notifications
  app.post('/users/:userId/preferences/device-token', async (req: FastifyRequest<{ Params: { userId: string }; Body: { token: string } }>, reply: FastifyReply) => {
    const { userId } = req.params;
    const { token } = req.body;

    if (!token) {
      throw new ValidationError('Device token is required');
    }

    const preferences = await NotificationService.addDeviceToken(userId, token);
    return reply.send(preferences);
  });

  // Remove device token
  app.delete('/users/:userId/preferences/device-token', async (req: FastifyRequest<{ Params: { userId: string }; Body: { token: string } }>, reply: FastifyReply) => {
    const { userId } = req.params;
    const { token } = req.body;

    if (!token) {
      throw new ValidationError('Device token is required');
    }

    const preferences = await NotificationService.removeDeviceToken(userId, token);
    return reply.send(preferences);
  });
}
