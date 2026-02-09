import Fastify, { FastifyInstance, FastifyError, FastifyRequest, FastifyReply } from 'fastify';
import mongoose from 'mongoose';
import { authRoutes } from './routes/auth.routes';
import { adminAuthRoutes } from './routes/admin-auth.routes';
import { AuthError } from './errors/auth.errors';

// Service start time for uptime calculation
const startTime = Date.now();

export function buildApp(): FastifyInstance {
  const app = Fastify({
    logger: {
      level: process.env.NODE_ENV === 'production' ? 'info' : 'debug',
    },
    requestIdHeader: 'x-request-id',
    requestIdLogLabel: 'requestId',
  });

  // ==================== HEALTH CHECK ROUTES ====================

  /**
   * Liveness probe - is the process alive?
   * Used by Kubernetes to determine if the container should be restarted
   */
  app.get('/health/live', async () => ({
    status: 'healthy',
    service: 'auth-service',
    timestamp: new Date().toISOString(),
    uptime: Math.floor((Date.now() - startTime) / 1000),
  }));

  /**
   * Readiness probe - is the service ready to accept traffic?
   * Checks all dependencies (MongoDB, etc.)
   */
  app.get('/health/ready', async (request, reply) => {
    const checks: Record<string, { status: 'up' | 'down'; latency?: number; message?: string }> = {};
    let isHealthy = true;

    // Check MongoDB
    const mongoStart = Date.now();
    try {
      const state = mongoose.connection.readyState;
      if (state === 1) {
        await mongoose.connection.db?.admin().ping();
        checks.mongodb = { status: 'up', latency: Date.now() - mongoStart };
      } else {
        checks.mongodb = { status: 'down', message: `Not connected (state: ${state})` };
        isHealthy = false;
      }
    } catch (error) {
      checks.mongodb = {
        status: 'down',
        message: error instanceof Error ? error.message : 'Unknown error',
        latency: Date.now() - mongoStart,
      };
      isHealthy = false;
    }

    const response = {
      status: isHealthy ? 'healthy' : 'unhealthy',
      service: 'auth-service',
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
   * Legacy health endpoint (for backward compatibility)
   */
  app.get('/health', async () => ({
    status: 'ok',
    service: 'auth-service',
    timestamp: new Date().toISOString(),
  }));

  // ==================== ERROR HANDLERS ====================

  // Global error handler
  app.setErrorHandler((error: FastifyError | AuthError, request: FastifyRequest, reply: FastifyReply) => {
    request.log.error(error);

    // Handle custom AuthError
    if (error instanceof AuthError) {
      return reply.code(error.statusCode).send({
        success: false,
        error: {
          code: error.code,
          message: error.message,
          ...(('errors' in error) && { details: (error as any).errors }),
        },
      });
    }

    // Handle Fastify validation errors
    if (error.validation) {
      return reply.code(400).send({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Request validation failed',
          details: error.validation,
        },
      });
    }

    // Handle unknown errors
    const statusCode = error.statusCode || 500;
    return reply.code(statusCode).send({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: process.env.NODE_ENV === 'production'
          ? 'An unexpected error occurred'
          : error.message,
      },
    });
  });

  // Not found handler
  app.setNotFoundHandler((_request: FastifyRequest, reply: FastifyReply) => {
    return reply.code(404).send({
      success: false,
      error: {
        code: 'NOT_FOUND',
        message: 'The requested resource was not found',
      },
    });
  });

  // Register routes
  app.register(authRoutes);
  app.register(adminAuthRoutes);

  return app;
}

// Export for backward compatibility
export const app = buildApp();
