import Fastify, { FastifyInstance, FastifyError, FastifyRequest, FastifyReply } from 'fastify';
import { authRoutes } from './routes/auth.routes';
import { AuthError } from './errors/auth.errors';

export function buildApp(): FastifyInstance {
  const app = Fastify({ 
    logger: {
      level: process.env.NODE_ENV === 'production' ? 'info' : 'debug',
    },
    requestIdHeader: 'x-request-id',
    requestIdLogLabel: 'requestId',
  });

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

  return app;
}

// Export for backward compatibility
export const app = buildApp();
