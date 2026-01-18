import Fastify, { FastifyError, FastifyRequest, FastifyReply } from 'fastify';
import fastifyCors from '@fastify/cors';
import { ZodError } from 'zod';
import { verifyToken } from './auth/jwt';
import { requestIdPlugin } from './plugins/request-id';
import { rateLimitPlugin } from './plugins/rate-limit';
import validationPlugin, { formatZodError } from './plugins/validation';
import userContextPlugin from './plugins/user-context';
import ipWhitelistPlugin from './plugins/ip-whitelist';
import adminSecurityPlugin from './plugins/admin-security';

import { authRoutes } from './routes/auth.routes';
import { userRoutes } from './routes/user.routes';
import { productRoutes } from './routes/product.routes';
import { documentRoutes } from './routes/document.routes';
import { complianceRoutes } from './routes/compliance.routes';
import { notificationRoutes } from './routes/notification.routes';
import { organizationRoutes } from './routes/organization.routes';
import { adminRoutes } from './routes/admin.routes';
import { adminDocumentReviewRoutes } from './routes/admin-document-review.routes';
import { adminWorkflowRoutes } from './routes/admin-workflows.routes';
import { adminComplianceRoutes } from './routes/admin-compliance.routes';

export async function buildApp() {
  const app = Fastify({
    logger: true,
    requestIdHeader: 'x-request-id',
  });

  // CORS support for frontend portals
  // NOTE: Admin portal (localhost:4000) is on separate origin
  await app.register(fastifyCors as unknown as Parameters<typeof app.register>[0], {
    origin: [
      // Main frontend (Consumer + Merchant)
      'http://localhost:3000',
      'http://localhost:3008',
      process.env.FRONTEND_URL || '',
      // Admin portal (separate app)
      'http://localhost:4000',
      process.env.ADMIN_FRONTEND_URL || '',
      // Production domains
      'https://veridex.com',
      'https://admin.veridex.io',
    ].filter(Boolean),
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Request-ID', 'X-Admin-Portal'],
  });

  await app.register(requestIdPlugin);
  await app.register(rateLimitPlugin);
  await app.register(validationPlugin);

  // JWT extraction hook - MUST run before admin security plugin
  app.addHook('preHandler', async (req) => {
    const auth = req.headers.authorization;
    if (!auth) return;

    const token = auth.replace('Bearer ', '');
    try {
      req.user = verifyToken(token);
    } catch {
      // Token verification failed - user stays undefined
    }
  });

  // Security plugins for admin routes (runs after JWT extraction)
  await app.register(ipWhitelistPlugin);
  await app.register(adminSecurityPlugin);

  // Inject user context headers for downstream services
  await app.register(userContextPlugin);

  // ==================== HEALTH CHECK ROUTES ====================
  const startTime = Date.now();

  /**
   * Liveness probe - is the process alive?
   */
  app.get('/health/live', async () => ({
    status: 'healthy',
    service: 'api-gateway',
    timestamp: new Date().toISOString(),
    uptime: Math.floor((Date.now() - startTime) / 1000),
  }));

  /**
   * Readiness probe - is the service ready to accept traffic?
   * Checks Redis (used for rate limiting)
   */
  app.get('/health/ready', async (request, reply) => {
    const checks: Record<string, { status: 'up' | 'down'; latency?: number; message?: string }> = {};
    let isHealthy = true;

    // Check Redis (required for rate limiting)
    const redisStart = Date.now();
    try {
      const { redis } = await import('./config/redis');
      await redis.ping();
      checks.redis = { status: 'up', latency: Date.now() - redisStart };
    } catch (error) {
      checks.redis = { 
        status: 'down', 
        message: error instanceof Error ? error.message : 'Unknown error',
        latency: Date.now() - redisStart,
      };
      // Redis failure is degraded, not unhealthy (rate limiting is backup protection)
      // isHealthy = false;
    }

    const response = {
      status: isHealthy ? 'healthy' : 'unhealthy',
      service: 'api-gateway',
      timestamp: new Date().toISOString(),
      uptime: Math.floor((Date.now() - startTime) / 1000),
      checks,
    };

    if (!isHealthy) {
      return reply.status(503).send(response);
    }

    return response;
  });

  /**
   * Legacy health endpoint
   */
  app.get('/health', async () => ({
    status: 'ok',
    service: 'api-gateway',
    timestamp: new Date().toISOString(),
  }));

  // Register all routes
  await app.register(authRoutes);
  await app.register(userRoutes);
  await app.register(productRoutes);
  await app.register(documentRoutes);
  await app.register(complianceRoutes);
  await app.register(notificationRoutes);
  await app.register(organizationRoutes);
  await app.register(adminRoutes);
  await app.register(adminDocumentReviewRoutes);
  await app.register(adminWorkflowRoutes, { prefix: '/admin/workflows' });
  await app.register(adminComplianceRoutes);

  // Global error handler
  app.setErrorHandler((error: FastifyError | Error, request: FastifyRequest, reply: FastifyReply) => {
    request.log.error(error);

    // Handle Zod validation errors
    if (error instanceof ZodError) {
      return reply.status(400).send({
        error: 'Validation Error',
        message: 'Request validation failed',
        details: formatZodError(error),
      });
    }

    // Handle authentication errors
    if (error.message === 'Unauthorized' || error.message === 'Authentication required') {
      return reply.status(401).send({
        error: 'Unauthorized',
        message: 'Authentication required',
      });
    }

    if (error.message === 'Forbidden' || error.message.includes('permission')) {
      return reply.status(403).send({
        error: 'Forbidden',
        message: 'Insufficient permissions',
      });
    }

    // Handle proxy errors
    if ('statusCode' in error && typeof error.statusCode === 'number') {
      return reply.status(error.statusCode).send({
        error: error.name || 'Error',
        message: error.message,
      });
    }

    // Default error response
    return reply.status(500).send({
      error: 'Internal Server Error',
      message: 'An unexpected error occurred',
    });
  });

  return app;
}
