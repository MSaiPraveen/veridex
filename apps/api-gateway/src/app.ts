import Fastify, { FastifyError, FastifyRequest, FastifyReply } from 'fastify';
import fastifyCors from '@fastify/cors';
import { ZodError } from 'zod';
import { verifyToken, verifyAnyToken } from './auth/jwt';
import { requestIdPlugin } from './plugins/request-id';
import { rateLimitPlugin } from './plugins/rate-limit';
import { helmetPlugin } from './plugins/helmet';
import { httpsEnforcementPlugin } from './plugins/https-enforcement';
import apiVersionPlugin, { getVersionInfo } from './plugins/api-versioning';
import idempotencyPlugin from './plugins/idempotency';
import openApiPlugin from './plugins/openapi';
import validationPlugin, { formatZodError } from './plugins/validation';
import userContextPlugin from './plugins/user-context';
import ipWhitelistPlugin from './plugins/ip-whitelist';
import adminSecurityPlugin from './plugins/admin-security';
import metricsPlugin from './plugins/metrics';

import { authRoutes } from './routes/auth.routes';
import { adminAuthRoutes } from './routes/admin-auth.routes';
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

import { env } from './config/env';

export async function buildApp() {
  const isProduction = env.NODE_ENV === 'production';
  
  const app = Fastify({
    logger: true,
    requestIdHeader: 'x-request-id',
    // Trust proxy headers when behind load balancer
    trustProxy: isProduction,
  });

  // Security: HTTPS enforcement (runs first in production)
  await app.register(httpsEnforcementPlugin);
  
  // Security: Helmet security headers
  await app.register(helmetPlugin);

  // Build CORS origins list - no localhost in production
  const corsOrigins = isProduction
    ? [
        env.FRONTEND_URL,
        env.ADMIN_FRONTEND_URL,
        ...env.ALLOWED_ORIGINS,
      ].filter(Boolean)
    : [
        // Development origins
        'http://localhost:3000',
        'http://localhost:3008',
        'http://localhost:4000',
        env.FRONTEND_URL,
        env.ADMIN_FRONTEND_URL,
      ].filter(Boolean);

  // CORS support for frontend portals
  await app.register(fastifyCors as unknown as Parameters<typeof app.register>[0], {
    origin: corsOrigins,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Request-ID', 'X-Admin-Portal', 'X-Idempotency-Key', 'X-API-Version'],
    exposedHeaders: ['X-API-Version', 'X-RateLimit-Limit', 'X-RateLimit-Remaining', 'X-RateLimit-Reset'],
  });

  await app.register(requestIdPlugin);
  await app.register(rateLimitPlugin);
  await app.register(apiVersionPlugin);
  await app.register(idempotencyPlugin);
  await app.register(openApiPlugin);
  await app.register(validationPlugin);
  
  // Prometheus metrics endpoint
  await app.register(metricsPlugin, {
    serviceName: 'api-gateway',
    serviceVersion: '1.0.0',
  });

  // JWT extraction hook - MUST run before admin security plugin
  app.addHook('preHandler', async (req) => {
    const auth = req.headers.authorization;
    if (!auth) return;

    const token = auth.replace('Bearer ', '');
    
    // Try to verify with both secrets (admin and regular user)
    const user = verifyAnyToken(token);
    if (user) {
      req.user = user;
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

  /**
   * API Version Info endpoint
   */
  app.get('/api/version', async () => getVersionInfo());
  app.get('/api/versions', async () => getVersionInfo());

  // Register all routes
  await app.register(authRoutes);
  await app.register(adminAuthRoutes);
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
