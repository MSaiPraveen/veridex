import Fastify, { FastifyError, FastifyRequest, FastifyReply } from 'fastify';
import { userOrgRoutes } from './routes/user-org.routes';
import { ServiceError } from './errors/service.errors';

export const app = Fastify({ 
  logger: {
    level: process.env.LOG_LEVEL || 'info',
  },
});

// Request logging
app.addHook('onRequest', async (request) => {
  request.log.info({ 
    url: request.url, 
    method: request.method,
    id: request.id,
  }, 'Incoming request');
});

// Global error handler
app.setErrorHandler((error: FastifyError | ServiceError, request: FastifyRequest, reply: FastifyReply) => {
  request.log.error({ 
    err: error, 
    url: request.url,
    method: request.method,
  }, 'Request error');

  // Handle our custom service errors
  if (error instanceof ServiceError) {
    return reply.status(error.statusCode).send({
      success: false,
      error: {
        code: error.code,
        message: error.message,
      },
    });
  }

  // Handle Fastify validation errors
  if (error.validation) {
    return reply.status(400).send({
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Validation failed',
        details: error.validation,
      },
    });
  }

  // Handle MongoDB duplicate key errors
  if ((error as any).code === 11000) {
    return reply.status(409).send({
      success: false,
      error: {
        code: 'DUPLICATE_KEY',
        message: 'A record with this value already exists',
      },
    });
  }

  // Handle MongoDB cast errors (invalid ObjectId)
  if (error.name === 'CastError') {
    return reply.status(400).send({
      success: false,
      error: {
        code: 'INVALID_ID',
        message: 'Invalid ID format',
      },
    });
  }

  // Default server error
  return reply.status(500).send({
    success: false,
    error: {
      code: 'INTERNAL_SERVER_ERROR',
      message: 'An unexpected error occurred',
    },
  });
});

// 404 handler
app.setNotFoundHandler((_request, reply) => {
  return reply.status(404).send({
    success: false,
    error: {
      code: 'NOT_FOUND',
      message: 'Route not found',
    },
  });
});

// Register routes
app.register(userOrgRoutes);
