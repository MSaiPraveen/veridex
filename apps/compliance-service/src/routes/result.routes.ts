import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';
import {
  resultQuerySchema,
  checkComplianceSchema,
  batchCheckSchema,
  idParamSchema,
  productIdParamSchema,
  ResultQueryInput,
  CheckComplianceInput,
  BatchCheckInput,
} from '../schemas/compliance.schemas';
import * as ComplianceService from '../services/compliance.service';
import { ValidationError } from '../errors/service.errors';

function validate<T extends z.ZodType>(schema: T, data: unknown): z.infer<T> {
  const result = schema.safeParse(data);
  if (!result.success) {
    const message = result.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join(', ');
    throw new ValidationError(message);
  }
  return result.data;
}

export async function resultRoutes(app: FastifyInstance): Promise<void> {
  // Run compliance check
  app.post('/check', async (req: FastifyRequest, reply: FastifyReply) => {
    const data = validate(checkComplianceSchema, req.body) as CheckComplianceInput;
    const result = await ComplianceService.evaluateCompliance(data);
    return reply.status(201).send(result);
  });

  // Run batch compliance check
  app.post('/check/batch', async (req: FastifyRequest, reply: FastifyReply) => {
    const { checks } = validate(batchCheckSchema, req.body) as BatchCheckInput;
    const results = await ComplianceService.batchEvaluateCompliance(checks);
    return reply.status(201).send({ results, count: results.length });
  });

  // List all results with pagination and filters
  app.get('/results', async (req: FastifyRequest, reply: FastifyReply) => {
    const query = validate(resultQuerySchema, req.query) as ResultQueryInput;
    
    const options = {
      productId: query.productId,
      documentId: query.documentId,
      organizationId: query.organizationId,
      status: query.status,
      fromDate: query.fromDate ? new Date(query.fromDate) : undefined,
      toDate: query.toDate ? new Date(query.toDate) : undefined,
      page: parseInt(query.page, 10),
      limit: parseInt(query.limit, 10),
      sortBy: query.sortBy,
      sortOrder: query.sortOrder,
    };

    const result = await ComplianceService.listResults(options);
    return reply.send(result);
  });

  // Get compliance statistics
  app.get('/results/stats', async (req: FastifyRequest<{ Querystring: { organizationId?: string } }>, reply: FastifyReply) => {
    const { organizationId } = req.query;
    const stats = await ComplianceService.getComplianceStats(organizationId);
    return reply.send(stats);
  });

  // Get compliance trend data
  app.get('/results/trend', async (req: FastifyRequest<{ Querystring: { organizationId?: string; days?: string } }>, reply: FastifyReply) => {
    const { organizationId, days } = req.query;
    const trend = await ComplianceService.getComplianceTrend(
      organizationId,
      days ? parseInt(days, 10) : 30
    );
    return reply.send(trend);
  });

  // Get result by ID
  app.get('/results/:id', async (req: FastifyRequest, reply: FastifyReply) => {
    const { id } = validate(idParamSchema, req.params);
    const result = await ComplianceService.getResultById(id);
    return reply.send(result);
  });

  // Delete result
  app.delete('/results/:id', async (req: FastifyRequest, reply: FastifyReply) => {
    const { id } = validate(idParamSchema, req.params);
    await ComplianceService.deleteResult(id);
    return reply.status(204).send();
  });

  // Get results by product ID
  app.get('/products/:productId/compliance', async (req: FastifyRequest, reply: FastifyReply) => {
    const { productId } = validate(productIdParamSchema, req.params);
    const results = await ComplianceService.getResultsByProductId(productId);
    return reply.send(results);
  });

  // Get latest result by product ID
  app.get('/products/:productId/compliance/latest', async (req: FastifyRequest, reply: FastifyReply) => {
    const { productId } = validate(productIdParamSchema, req.params);
    const result = await ComplianceService.getLatestResultByProductId(productId);
    return reply.send(result);
  });

  // Get product compliance stats
  app.get('/products/:productId/compliance/stats', async (req: FastifyRequest, reply: FastifyReply) => {
    const { productId } = validate(productIdParamSchema, req.params);
    const stats = await ComplianceService.getProductComplianceStats(productId);
    return reply.send(stats);
  });

  // Delete all results for a product
  app.delete('/products/:productId/compliance', async (req: FastifyRequest, reply: FastifyReply) => {
    const { productId } = validate(productIdParamSchema, req.params);
    const count = await ComplianceService.deleteResultsByProductId(productId);
    return reply.send({ deleted: count });
  });
}
