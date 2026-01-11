import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';
import {
  createRuleSchema,
  updateRuleSchema,
  ruleQuerySchema,
  idParamSchema,
  CreateRuleInput,
  UpdateRuleInput,
  RuleQueryInput,
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

export async function ruleRoutes(app: FastifyInstance): Promise<void> {
  // Create a new rule
  app.post('/rules', async (req: FastifyRequest, reply: FastifyReply) => {
    const data = validate(createRuleSchema, req.body) as CreateRuleInput;
    // Convert date strings to Date objects
    const ruleData = {
      ...data,
      effectiveFrom: data.effectiveFrom ? new Date(data.effectiveFrom) : undefined,
      effectiveUntil: data.effectiveUntil ? new Date(data.effectiveUntil) : undefined,
    };
    const rule = await ComplianceService.createRule(ruleData as unknown as Parameters<typeof ComplianceService.createRule>[0]);
    return reply.status(201).send(rule);
  });

  // List all rules with pagination and filters
  app.get('/rules', async (req: FastifyRequest, reply: FastifyReply) => {
    const query = validate(ruleQuerySchema, req.query) as RuleQueryInput;
    
    const options = {
      documentType: query.documentType,
      category: query.category,
      severity: query.severity,
      active: query.active ? query.active === 'true' : undefined,
      organizationId: query.organizationId,
      page: parseInt(query.page, 10),
      limit: parseInt(query.limit, 10),
      sortBy: query.sortBy,
      sortOrder: query.sortOrder,
    };

    const result = await ComplianceService.listRules(options);
    return reply.send(result);
  });

  // Get rule statistics
  app.get('/rules/stats', async (req: FastifyRequest, reply: FastifyReply) => {
    const stats = await ComplianceService.getRuleStats();
    return reply.send(stats);
  });

  // Get rule by ID
  app.get('/rules/:id', async (req: FastifyRequest, reply: FastifyReply) => {
    const { id } = validate(idParamSchema, req.params);
    const rule = await ComplianceService.getRuleById(id);
    return reply.send(rule);
  });

  // Get rule by code
  app.get('/rules/code/:code', async (req: FastifyRequest<{ Params: { code: string } }>, reply: FastifyReply) => {
    const { code } = req.params;
    const rule = await ComplianceService.getRuleByCode(code);
    return reply.send(rule);
  });

  // Update rule
  app.patch('/rules/:id', async (req: FastifyRequest, reply: FastifyReply) => {
    const { id } = validate(idParamSchema, req.params);
    const data = validate(updateRuleSchema, req.body) as UpdateRuleInput;
    // Convert date strings to Date objects, handle null for clearing
    const updateData = {
      ...data,
      effectiveUntil: data.effectiveUntil === null ? undefined : data.effectiveUntil ? new Date(data.effectiveUntil) : undefined,
    };
    const rule = await ComplianceService.updateRule(id, updateData as unknown as Parameters<typeof ComplianceService.updateRule>[1]);
    return reply.send(rule);
  });

  // Delete rule
  app.delete('/rules/:id', async (req: FastifyRequest, reply: FastifyReply) => {
    const { id } = validate(idParamSchema, req.params);
    await ComplianceService.deleteRule(id);
    return reply.status(204).send();
  });

  // Activate rule
  app.post('/rules/:id/activate', async (req: FastifyRequest, reply: FastifyReply) => {
    const { id } = validate(idParamSchema, req.params);
    const rule = await ComplianceService.activateRule(id);
    return reply.send(rule);
  });

  // Deactivate rule
  app.post('/rules/:id/deactivate', async (req: FastifyRequest, reply: FastifyReply) => {
    const { id } = validate(idParamSchema, req.params);
    const rule = await ComplianceService.deactivateRule(id);
    return reply.send(rule);
  });

  // Create new version of rule
  app.post('/rules/:id/version', async (req: FastifyRequest, reply: FastifyReply) => {
    const { id } = validate(idParamSchema, req.params);
    const rule = await ComplianceService.createRuleVersion(id);
    return reply.status(201).send(rule);
  });
}
