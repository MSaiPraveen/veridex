import Fastify, { FastifyError, FastifyRequest, FastifyReply } from 'fastify';
import mongoose from 'mongoose';
import { ruleRoutes } from './routes/rule.routes';
import { resultRoutes } from './routes/result.routes';
import { batchComplianceRoutes } from './routes/batch-compliance.routes';
import { adminWorkflowRoutes } from './routes/admin-workflow.routes';
import { AppError } from './errors/service.errors';

const startTime = Date.now();

export const app = Fastify({ logger: true });

// ============================================
// Health Check Endpoints
// ============================================

// Liveness probe - basic check that process is running
app.get('/health/live', async (_request, reply) => {
  return reply.status(200).send({
    status: 'ok',
    service: 'compliance-service',
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
    service: 'compliance-service',
    timestamp: new Date().toISOString(),
    uptime: Math.floor((Date.now() - startTime) / 1000),
    checks,
  });
});

// Legacy health endpoint for backward compatibility
app.get('/health', async () => ({ status: 'ok', service: 'compliance-service' }));

// Register routes
app.register(ruleRoutes);
app.register(resultRoutes);
app.register(batchComplianceRoutes, { prefix: '/api/v1' });

// Admin workflow routes (protected by admin auth)
app.register(adminWorkflowRoutes, { prefix: '/admin/workflows' });

// Global error handler
app.setErrorHandler((error: FastifyError | AppError, request: FastifyRequest, reply: FastifyReply) => {
  const statusCode = (error as AppError).statusCode || error.statusCode || 500;
  const code = (error as AppError).code || 'INTERNAL_ERROR';

  request.log.error({
    err: error,
    statusCode,
    code,
    url: request.url,
    method: request.method,
  });

  return reply.status(statusCode).send({
    error: {
      code,
      message: error.message,
      statusCode,
    },
  });
});

// Not found handler
app.setNotFoundHandler((request: FastifyRequest, reply: FastifyReply) => {
  return reply.status(404).send({
    error: {
      code: 'NOT_FOUND',
      message: `Route ${request.method} ${request.url} not found`,
      statusCode: 404,
    },
  });
});
