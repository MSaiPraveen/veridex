import Fastify, { FastifyError, FastifyRequest, FastifyReply } from 'fastify';
import mongoose from 'mongoose';
import { notificationRoutes } from './routes/notification.routes';
import { registerWebSocketRoute } from './services/websocket.service';
import { registerSSERoutes } from './services/sse.service';
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
    service: 'notification-service',
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
    service: 'notification-service',
    timestamp: new Date().toISOString(),
    uptime: Math.floor((Date.now() - startTime) / 1000),
    checks,
  });
});

// Legacy health endpoint for backward compatibility
app.get('/health', async () => ({ status: 'ok', service: 'notification-service' }));

// Register routes
app.register(notificationRoutes);

// Register WebSocket support
registerWebSocketRoute(app).catch((err) => {
  console.error('Failed to register WebSocket routes:', err);
});

// Register SSE support
registerSSERoutes(app).catch((err) => {
  console.error('Failed to register SSE routes:', err);
});

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
