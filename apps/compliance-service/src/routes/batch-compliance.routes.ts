/**
 * Batch Compliance Routes
 * 
 * REST API endpoints for batch compliance evaluation
 */

import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';
import {
  BatchComplianceService,
  BatchEvaluationInput,
} from '../services/batch-compliance.service';
import { ProductCategory } from '@veridex/compliance-rules';

// Request schemas
const EvaluateBatchSchema = z.object({
  productId: z.string().uuid(),
  batchId: z.string().uuid(),
  organizationId: z.string().uuid(),
  product: z.object({
    sku: z.string().optional(),
    category: z.nativeEnum(ProductCategory),
    manufacturerName: z.string().optional(),
    declaredPotency: z.number().optional(),
    declaredCbdPercent: z.number().optional(),
    declaredPurity: z.number().optional(),
    declaredSequence: z.string().optional(),
    expectedMolecularWeight: z.number().optional(),
    declaredServingSize: z.number().optional(),
    ndcNumber: z.string().optional(),
    requiresSterility: z.boolean().optional(),
    isInjectable: z.boolean().optional(),
    isOralSolid: z.boolean().optional(),
    isLyophilized: z.boolean().optional(),
    storageConditions: z.string().optional(),
    hasMedicalClaims: z.boolean().optional(),
    hasFdaDisclaimer: z.boolean().optional(),
    hasResearchDisclaimer: z.boolean().optional(),
    hasThirdPartyCertification: z.boolean().optional(),
    marketedForHumanUse: z.boolean().optional(),
    isDeaControlled: z.boolean().optional(),
    isFdaBanned: z.boolean().optional(),
  }),
  batch: z.object({
    batchNumber: z.string(),
    manufacturedAt: z.number().optional(),
    expiresAt: z.number().optional(),
    shelfLifeMonths: z.number().optional(),
    ndcOnLabel: z.string().optional(),
    isRecalled: z.boolean().optional(),
  }),
  lab: z.object({
    thcPercent: z.number().optional(),
    cbdPercent: z.number().optional(),
    purityPercent: z.number().optional(),
    apiPotency: z.number().optional(),
    activeIngredientPotency: z.number().optional(),
    actualServingSize: z.number().optional(),
    batchIdOnReport: z.string().optional(),
    skuOnReport: z.string().optional(),
    manufacturerName: z.string().optional(),
    molecularWeight: z.number().optional(),
    sequence: z.string().optional(),
    hasPesticidePanel: z.boolean().optional(),
    hasHeavyMetalPanel: z.boolean().optional(),
    hasMicrobialPanel: z.boolean().optional(),
    contaminantsDetected: z.array(z.string()).optional(),
    residualSolvents: z.boolean().optional(),
    heavyMetalsExceedLimit: z.boolean().optional(),
    hasBannedSubstances: z.boolean().optional(),
    hasWadaProhibitedSubstances: z.boolean().optional(),
    hasSyntheticStimulants: z.boolean().optional(),
    ingredientsMatchLabel: z.boolean().optional(),
    undeclaredAllergens: z.array(z.string()).optional(),
    impuritiesExceedLimit: z.boolean().optional(),
    sterilitySterile: z.boolean().optional(),
    endotoxinPass: z.boolean().optional(),
    dissolutionPass: z.boolean().optional(),
    contentUniformityPass: z.boolean().optional(),
    sterileFiltered: z.boolean().optional(),
    endotoxinExceedsLimit: z.boolean().optional(),
    tfaContentPercent: z.number().optional(),
  }).optional(),
  documents: z.object({
    hasCOA: z.boolean().optional(),
    coaIssuedAt: z.number().optional(),
    hasStateLicense: z.boolean().optional(),
    licenseState: z.string().optional(),
    hasInsurance: z.boolean().optional(),
    hasGmpCertificate: z.boolean().optional(),
    gmpExpiresAt: z.number().optional(),
    gmpManufacturerName: z.string().optional(),
    hasFdaRegistration: z.boolean().optional(),
    hasStabilityData: z.boolean().optional(),
    stabilityDurationMonths: z.number().optional(),
    hasCertificateOfOrigin: z.boolean().optional(),
    hasHplcAnalysis: z.boolean().optional(),
    hasMassSpec: z.boolean().optional(),
  }).optional(),
  license: z.object({
    isExpired: z.boolean().optional(),
    state: z.string().optional(),
    expiresAt: z.number().optional(),
  }).optional(),
  insurance: z.object({
    isActive: z.boolean().optional(),
    coversCannabis: z.boolean().optional(),
    expiresAt: z.number().optional(),
  }).optional(),
  manufacturer: z.object({
    name: z.string().optional(),
    isGmpCertified: z.boolean().optional(),
    isFdaRegistered: z.boolean().optional(),
  }).optional(),
  saleState: z.string().optional(),
});

export async function batchComplianceRoutes(fastify: FastifyInstance): Promise<void> {
  /**
   * POST /batch/evaluate
   * Evaluate batch compliance
   */
  fastify.post(
    '/batch/evaluate',
    async (
      request: FastifyRequest<{ Body: z.infer<typeof EvaluateBatchSchema> }>,
      reply: FastifyReply,
    ) => {
      try {
        const input = EvaluateBatchSchema.parse(request.body);
        const result = await BatchComplianceService.evaluateBatch(input as BatchEvaluationInput);
        
        return reply.status(200).send({
          success: true,
          data: {
            batchId: result.batchId,
            productId: result.productId,
            overallStatus: result.overallStatus,
            summary: result.summary,
            decisionTrail: result.decisionTrail,
            stoppedByBlocker: result.stoppedByBlocker,
            blockerRuleId: result.blockerRuleId,
            durationMs: result.durationMs,
            evaluatedAt: result.evaluatedAt,
          },
        });
      } catch (error) {
        if (error instanceof z.ZodError) {
          return reply.status(400).send({
            success: false,
            error: 'Validation error',
            details: error.errors,
          });
        }
        throw error;
      }
    },
  );

  /**
   * POST /batch/evaluate-with-report
   * Evaluate batch compliance and return full report
   */
  fastify.post(
    '/batch/evaluate-with-report',
    async (
      request: FastifyRequest<{ Body: z.infer<typeof EvaluateBatchSchema> }>,
      reply: FastifyReply,
    ) => {
      try {
        const input = EvaluateBatchSchema.parse(request.body);
        const result = await BatchComplianceService.evaluateBatch(input as BatchEvaluationInput);
        
        return reply.status(200).send({
          success: true,
          data: result,
        });
      } catch (error) {
        if (error instanceof z.ZodError) {
          return reply.status(400).send({
            success: false,
            error: 'Validation error',
            details: error.errors,
          });
        }
        throw error;
      }
    },
  );

  /**
   * GET /rules/category/:category
   * Get rules for a specific product category
   */
  fastify.get(
    '/rules/category/:category',
    async (
      request: FastifyRequest<{ Params: { category: string } }>,
      reply: FastifyReply,
    ) => {
      const { category } = request.params;
      
      if (!Object.values(ProductCategory).includes(category as ProductCategory)) {
        return reply.status(400).send({
          success: false,
          error: `Invalid category. Valid options: ${Object.values(ProductCategory).join(', ')}`,
        });
      }
      
      const info = BatchComplianceService.getRuleInfo(category as ProductCategory);
      
      return reply.status(200).send({
        success: true,
        data: info,
      });
    },
  );

  /**
   * GET /rules/statistics
   * Get overall rule statistics
   */
  fastify.get('/rules/statistics', async (_request, reply: FastifyReply) => {
    const stats = BatchComplianceService.getAllRuleStatistics();
    
    return reply.status(200).send({
      success: true,
      data: stats,
    });
  });

  /**
   * GET /rules/search
   * Search rules by keyword
   */
  fastify.get(
    '/rules/search',
    async (
      request: FastifyRequest<{ Querystring: { q: string } }>,
      reply: FastifyReply,
    ) => {
      const { q } = request.query;
      
      if (!q || q.length < 2) {
        return reply.status(400).send({
          success: false,
          error: 'Search query must be at least 2 characters',
        });
      }
      
      const results = BatchComplianceService.searchRules(q);
      
      return reply.status(200).send({
        success: true,
        data: {
          query: q,
          count: results.length,
          results,
        },
      });
    },
  );

  /**
   * GET /categories
   * List all product categories
   */
  fastify.get('/categories', async (_request, reply: FastifyReply) => {
    return reply.status(200).send({
      success: true,
      data: Object.values(ProductCategory).map((category) => ({
        category,
        ruleCount: BatchComplianceService.getRuleInfo(category).totalRules,
      })),
    });
  });
}

export default batchComplianceRoutes;
