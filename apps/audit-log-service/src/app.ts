import Fastify, { FastifyError, FastifyRequest, FastifyReply } from 'fastify';
import fastifyCors from '@fastify/cors';
import mongoose from 'mongoose';
import { auditRoutes } from './routes/audit.routes';
import { adminAuditRoutes } from './routes/admin-audit.routes';
import { AppError } from './errors/service.errors';
import { ZodError } from 'zod';

const startTime = Date.now();

export async function buildApp() {
  const app = Fastify({ 
    logger: true,
    requestIdHeader: 'x-request-id',
    requestIdLogLabel: 'requestId',
  });

  // CORS support
  await app.register(fastifyCors as unknown as Parameters<typeof app.register>[0], {
    origin: true,
    credentials: true,
  });

  // ============================================
  // Health Check Endpoints
  // ============================================

  // Liveness probe - basic check that process is running
  app.get('/health/live', async (_request, reply) => {
    return reply.status(200).send({
      status: 'ok',
      service: 'audit-log-service',
      timestamp: new Date().toISOString(),
      uptime: Math.floor((Date.now() - startTime) / 1000),
    });
  });

  // Readiness probe - check all dependencies
  app.get('/health/ready', async (_request, reply) => {
    const checks: Record<string, { status: string; latency?: number; error?: string }> = {};
    let isReady = true;

    // Check MongoDB connection
    const mongoStart = Date.now();
    try {
      if (mongoose.connection.readyState === 1) {
        await mongoose.connection.db?.admin().ping();
        checks.mongodb = { status: 'ok', latency: Date.now() - mongoStart };
      } else {
        checks.mongodb = { status: 'error', error: 'Not connected' };
        isReady = false;
      }
    } catch (error) {
      checks.mongodb = { 
        status: 'error', 
        error: error instanceof Error ? error.message : 'Unknown error',
        latency: Date.now() - mongoStart,
      };
      isReady = false;
    }

    const statusCode = isReady ? 200 : 503;
    return reply.status(statusCode).send({
      status: isReady ? 'ready' : 'not_ready',
      service: 'audit-log-service',
      timestamp: new Date().toISOString(),
      uptime: Math.floor((Date.now() - startTime) / 1000),
      checks,
    });
  });

  // Legacy health endpoint for backward compatibility
  app.get('/health', async () => ({ status: 'ok', service: 'audit-log-service' }));

  // Routes
  await app.register(auditRoutes);
  await app.register(adminAuditRoutes);

  // Error handler
  app.setErrorHandler((error: FastifyError | Error, request: FastifyRequest, reply: FastifyReply) => {
    request.log.error(error);

    // Handle Zod validation errors
    if (error instanceof ZodError) {
      return reply.status(400).send({
        error: 'Validation Error',
        message: 'Invalid request data',
        details: error.errors.map(e => ({
          path: e.path.join('.'),
          message: e.message,
        })),
      });
    }

    // Handle custom application errors
    if (error instanceof AppError) {
      return reply.status(error.statusCode).send({
        error: error.name,
        message: error.message,
      });
    }

    // Handle Fastify errors
    if ('statusCode' in error && typeof error.statusCode === 'number') {
      return reply.status(error.statusCode).send({
        error: error.name || 'Error',
        message: error.message,
      });
    }

    // Default error
    return reply.status(500).send({
      error: 'Internal Server Error',
      message: 'An unexpected error occurred',
    });
  });

  return app;
}
