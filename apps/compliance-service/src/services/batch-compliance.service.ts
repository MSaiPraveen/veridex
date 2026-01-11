/**
 * Batch Compliance Service
 * 
 * This service evaluates batch-level compliance using the rule engine
 * from @veridex/compliance-rules package.
 * 
 * Key principles:
 * - Batch is the unit of compliance (not product)
 * - All decisions are deterministic and explainable
 * - Rules are data, not code - no business logic here
 * - All evaluations are audited
 */

import {
  RuleRegistry,
  evaluateBatchCompliance,
  createEvaluationContext,
  generateComplianceReport,
  ProductCategory,
  ComplianceStatus,
  BatchComplianceResult,
  EvaluationContext,
} from '@veridex/compliance-rules';
import { emitBatchComplianceEvaluated } from '../events/batch-compliance.producer';

/**
 * Input data for batch compliance evaluation
 */
export interface BatchEvaluationInput {
  // Core identifiers
  productId: string;
  batchId: string;
  organizationId: string;
  
  // Product info
  product: {
    sku?: string;
    category: ProductCategory;
    manufacturerName?: string;
    declaredPotency?: number;
    declaredCbdPercent?: number;
    declaredPurity?: number;
    declaredSequence?: string;
    expectedMolecularWeight?: number;
    declaredServingSize?: number;
    ndcNumber?: string;
    requiresSterility?: boolean;
    isInjectable?: boolean;
    isOralSolid?: boolean;
    isLyophilized?: boolean;
    storageConditions?: string;
    hasMedicalClaims?: boolean;
    hasFdaDisclaimer?: boolean;
    hasResearchDisclaimer?: boolean;
    hasThirdPartyCertification?: boolean;
    marketedForHumanUse?: boolean;
    isDeaControlled?: boolean;
    isFdaBanned?: boolean;
  };
  
  // Batch info
  batch: {
    batchNumber: string;
    manufacturedAt?: number;
    expiresAt?: number;
    shelfLifeMonths?: number;
    ndcOnLabel?: string;
    isRecalled?: boolean;
  };
  
  // Lab results (extracted from COA)
  lab?: {
    thcPercent?: number;
    cbdPercent?: number;
    purityPercent?: number;
    apiPotency?: number;
    activeIngredientPotency?: number;
    actualServingSize?: number;
    batchIdOnReport?: string;
    skuOnReport?: string;
    manufacturerName?: string;
    molecularWeight?: number;
    sequence?: string;
    hasPesticidePanel?: boolean;
    hasHeavyMetalPanel?: boolean;
    hasMicrobialPanel?: boolean;
    contaminantsDetected?: string[];
    residualSolvents?: boolean;
    heavyMetalsExceedLimit?: boolean;
    hasBannedSubstances?: boolean;
    hasWadaProhibitedSubstances?: boolean;
    hasSyntheticStimulants?: boolean;
    ingredientsMatchLabel?: boolean;
    undeclaredAllergens?: string[];
    impuritiesExceedLimit?: boolean;
    sterilitySterile?: boolean;
    endotoxinPass?: boolean;
    dissolutionPass?: boolean;
    contentUniformityPass?: boolean;
    sterileFiltered?: boolean;
    endotoxinExceedsLimit?: boolean;
    tfaContentPercent?: number;
  };
  
  // Document flags
  documents?: {
    hasCOA?: boolean;
    coaIssuedAt?: number;
    hasStateLicense?: boolean;
    licenseState?: string;
    hasInsurance?: boolean;
    hasGmpCertificate?: boolean;
    gmpExpiresAt?: number;
    gmpManufacturerName?: string;
    hasFdaRegistration?: boolean;
    hasStabilityData?: boolean;
    stabilityDurationMonths?: number;
    hasCertificateOfOrigin?: boolean;
    hasHplcAnalysis?: boolean;
    hasMassSpec?: boolean;
  };
  
  // License info
  license?: {
    isExpired?: boolean;
    state?: string;
    expiresAt?: number;
  };
  
  // Insurance info
  insurance?: {
    isActive?: boolean;
    coversCannabis?: boolean;
    expiresAt?: number;
  };
  
  // Manufacturer info
  manufacturer?: {
    name?: string;
    isGmpCertified?: boolean;
    isFdaRegistered?: boolean;
  };
  
  // Sale context
  saleState?: string;
}

/**
 * Result of batch compliance evaluation
 */
export interface BatchEvaluationResult extends BatchComplianceResult {
  report: string;
}

/**
 * Evaluates batch compliance against all applicable rules
 * 
 * This is the main entry point for compliance evaluation.
 * It loads rules for the product category, builds the context,
 * evaluates all rules, and returns the result.
 * 
 * @param input - The batch and related data to evaluate
 * @returns Complete compliance result with decision trail
 */
export async function evaluateBatch(input: BatchEvaluationInput): Promise<BatchEvaluationResult> {
  // Get rules for the product category
  const rules = RuleRegistry.getRulesByCategory(input.product.category);
  
  if (rules.length === 0) {
    throw new Error(`No compliance rules found for category: ${input.product.category}`);
  }
  
  // Build evaluation context
  const context = createEvaluationContext({
    product: {
      productId: input.productId,
      ...input.product,
    },
    batch: {
      batchId: input.batchId,
      ...input.batch,
    },
    lab: input.lab,
    documents: input.documents,
    license: input.license,
    insurance: input.insurance,
    manufacturer: input.manufacturer,
    saleState: input.saleState,
  });
  
  // Evaluate compliance
  const result = evaluateBatchCompliance(rules, context);
  
  // Generate human-readable report
  const report = generateComplianceReport(result);
  
  return {
    ...result,
    report,
  };
}

/**
 * Evaluates batch compliance and emits result event
 * 
 * This is the full workflow - evaluate and emit event for other services
 * 
 * @param input - The batch and related data to evaluate
 * @param previousStatus - The previous compliance status (for change detection)
 * @returns Complete compliance result
 */
export async function evaluateBatchAndEmit(
  input: BatchEvaluationInput,
  previousStatus?: ComplianceStatus,
): Promise<BatchEvaluationResult> {
  // Evaluate
  const result = await evaluateBatch(input);
  
  // Emit event
  await emitBatchComplianceEvaluated({
    batchId: input.batchId,
    productId: input.productId,
    organizationId: input.organizationId,
    evaluatedAt: result.evaluatedAt,
    overallStatus: result.overallStatus,
    previousStatus,
    statusChanged: previousStatus !== undefined && previousStatus !== result.overallStatus,
    summary: result.summary,
    results: result.results.map((r) => ({
      ruleId: r.ruleId,
      version: r.version,
      passed: r.passed,
      applied: r.applied,
      failure: r.failure,
    })),
    decisionTrail: result.decisionTrail,
    stoppedByBlocker: result.stoppedByBlocker,
    blockerRuleId: result.blockerRuleId,
    durationMs: result.durationMs,
  });
  
  return result;
}

/**
 * Get rule statistics for a category
 */
export function getRuleInfo(category: ProductCategory) {
  const rules = RuleRegistry.getRulesByCategory(category);
  const requiredDocs = RuleRegistry.getRequiredDocuments(category);
  
  return {
    totalRules: rules.length,
    blockerRules: rules.filter((r) => r.severity === 'BLOCKER').length,
    warningRules: rules.filter((r) => r.severity === 'WARNING').length,
    requiredDocuments: requiredDocs,
    rules: rules.map((r) => ({
      ruleId: r.ruleId,
      description: r.description,
      severity: r.severity,
      reasonCode: r.failure.reasonCode,
    })),
  };
}

/**
 * Get overall rule statistics
 */
export function getAllRuleStatistics() {
  return RuleRegistry.getRuleStatistics();
}

/**
 * Search rules by keyword
 */
export function searchRules(keyword: string) {
  return RuleRegistry.searchRules(keyword).map((r) => ({
    ruleId: r.ruleId,
    category: r.category,
    description: r.description,
    severity: r.severity,
    reasonCode: r.failure.reasonCode,
  }));
}

export const BatchComplianceService = {
  evaluateBatch,
  evaluateBatchAndEmit,
  getRuleInfo,
  getAllRuleStatistics,
  searchRules,
};

export default BatchComplianceService;
