import Fastify, { FastifyError, FastifyRequest, FastifyReply } from 'fastify';
import fastifyCors from '@fastify/cors';
import { auditRoutes } from './routes/audit.routes';
import { adminAuditRoutes } from './routes/admin-audit.routes';
import { AppError } from './errors/service.errors';
import { ZodError } from 'zod';

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
