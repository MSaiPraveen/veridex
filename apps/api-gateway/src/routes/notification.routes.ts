import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { services } from '../config/services';
import { requireAuth, requireRole } from '../auth/role-guard';
import { validateRequest, objectIdSchema } from '../plugins/validation';
import { Role } from '@veridex/roles-permissions';
import {
  markNotificationBodySchema,
  bulkMarkNotificationsBodySchema,
  notificationQuerySchema,
  sendNotificationBodySchema,
  createTemplateBodySchema,
  updateTemplateBodySchema,
  templateQuerySchema,
} from '../schemas/notification.schemas';
import { z } from 'zod';

// ID param schema
const idParamsSchema = z.object({
  id: objectIdSchema,
}).strict();

// Helper to proxy request to notification service
async function proxyToNotification(
  request: FastifyRequest,
  reply: FastifyReply,
  method: string,
  path: string
) {
  const url = `${services.notification}${path}`;
  
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'x-request-id': request.id,
  };
  
  // Forward auth headers
  if (request.headers.authorization) {
    headers['Authorization'] = request.headers.authorization;
  }
  if (request.headers['x-user-id']) {
    headers['x-user-id'] = request.headers['x-user-id'] as string;
  }
  if (request.headers['x-user-role']) {
    headers['x-user-role'] = request.headers['x-user-role'] as string;
  }
  if (request.headers['x-organization-id']) {
    headers['x-organization-id'] = request.headers['x-organization-id'] as string;
  }

  const response = await fetch(url, {
    method,
    headers,
    body: method !== 'GET' && method !== 'DELETE' ? JSON.stringify(request.body) : undefined,
  });

  const data = await response.json();
  return reply.status(response.status).send(data);
}

// Build query string from validated query object
function buildQueryString(query: Record<string, unknown>): string {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(query)) {
    if (value !== undefined && value !== null) {
      params.append(key, String(value));
    }
  }
  const qs = params.toString();
  return qs ? `?${qs}` : '';
}

export async function notificationRoutes(app: FastifyInstance) {
  // ============================================
  // User Notifications
  // ============================================

  // List user's notifications
  app.get('/notifications', {
    preHandler: requireAuth(),
    preValidation: validateRequest({ query: notificationQuerySchema }),
  }, async (request, reply) => {
    const qs = buildQueryString(request.query as Record<string, unknown>);
    return proxyToNotification(request, reply, 'GET', `/notifications${qs}`);
  });

  // Get single notification
  app.get('/notifications/:id', {
    preHandler: requireAuth(),
    preValidation: validateRequest({ params: idParamsSchema }),
  }, async (request, reply) => {
    const params = request.params as { id: string };
    return proxyToNotification(request, reply, 'GET', `/notifications/${params.id}`);
  });

  // Mark notification as read/unread
  app.patch('/notifications/:id', {
    preHandler: requireAuth(),
    preValidation: validateRequest({
      params: idParamsSchema,
      body: markNotificationBodySchema,
    }),
  }, async (request, reply) => {
    const params = request.params as { id: string };
    return proxyToNotification(request, reply, 'PATCH', `/notifications/${params.id}`);
  });

  // Bulk mark notifications
  app.post('/notifications/bulk-mark', {
    preHandler: requireAuth(),
    preValidation: validateRequest({ body: bulkMarkNotificationsBodySchema }),
  }, async (request, reply) => {
    return proxyToNotification(request, reply, 'POST', '/notifications/bulk-mark');
  });

  // Delete notification
  app.delete('/notifications/:id', {
    preHandler: requireAuth(),
    preValidation: validateRequest({ params: idParamsSchema }),
  }, async (request, reply) => {
    const params = request.params as { id: string };
    return proxyToNotification(request, reply, 'DELETE', `/notifications/${params.id}`);
  });

  // Get unread count
  app.get('/notifications/unread-count', {
    preHandler: requireAuth(),
  }, async (request, reply) => {
    return proxyToNotification(request, reply, 'GET', '/notifications/unread-count');
  });

  // ============================================
  // Admin Notification Management
  // ============================================

  // Send notification
  app.post('/admin/notifications', {
    preHandler: requireRole([Role.ADMIN]),
    preValidation: validateRequest({ body: sendNotificationBodySchema }),
  }, async (request, reply) => {
    return proxyToNotification(request, reply, 'POST', '/notifications');
  });

  // ============================================
  // Admin Template Management
  // ============================================

  // List templates
  app.get('/admin/notification-templates', {
    preHandler: requireRole([Role.ADMIN]),
    preValidation: validateRequest({ query: templateQuerySchema }),
  }, async (request, reply) => {
    const qs = buildQueryString(request.query as Record<string, unknown>);
    return proxyToNotification(request, reply, 'GET', `/templates${qs}`);
  });

  // Get single template
  app.get('/admin/notification-templates/:id', {
    preHandler: requireRole([Role.ADMIN]),
    preValidation: validateRequest({ params: idParamsSchema }),
  }, async (request, reply) => {
    const params = request.params as { id: string };
    return proxyToNotification(request, reply, 'GET', `/templates/${params.id}`);
  });

  // Create template
  app.post('/admin/notification-templates', {
    preHandler: requireRole([Role.ADMIN]),
    preValidation: validateRequest({ body: createTemplateBodySchema }),
  }, async (request, reply) => {
    return proxyToNotification(request, reply, 'POST', '/templates');
  });

  // Update template
  app.put('/admin/notification-templates/:id', {
    preHandler: requireRole([Role.ADMIN]),
    preValidation: validateRequest({
      params: idParamsSchema,
      body: updateTemplateBodySchema,
    }),
  }, async (request, reply) => {
    const params = request.params as { id: string };
    return proxyToNotification(request, reply, 'PUT', `/templates/${params.id}`);
  });

  // Delete template
  app.delete('/admin/notification-templates/:id', {
    preHandler: requireRole([Role.ADMIN]),
    preValidation: validateRequest({ params: idParamsSchema }),
  }, async (request, reply) => {
    const params = request.params as { id: string };
    return proxyToNotification(request, reply, 'DELETE', `/templates/${params.id}`);
  });
}
