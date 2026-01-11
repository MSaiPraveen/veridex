import Fastify, { FastifyError, FastifyRequest, FastifyReply } from 'fastify';
import { ruleRoutes } from './routes/rule.routes';
import { resultRoutes } from './routes/result.routes';
import { batchComplianceRoutes } from './routes/batch-compliance.routes';
import { adminWorkflowRoutes } from './routes/admin-workflow.routes';
import { AppError } from './errors/service.errors';

export const app = Fastify({ logger: true });

// Health check
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
