/**
 * Compliance Rule Evaluation Engine
 * 
 * This is the CORE of the compliance system.
 * It evaluates JSON Logic rules against an evaluation context.
 * 
 * Key principles:
 * - Deterministic: Same inputs = Same result
 * - Explainable: Every decision can be traced to a specific rule
 * - Auditable: All evaluations are logged with full context
 * - No code logic: All decisions come from rule definitions
 * 
 * Evaluation flow:
 * 1. Load rules for product category
 * 2. For each rule, evaluate "when" condition (should this rule apply?)
 * 3. If "when" matches, evaluate "condition" (does this rule fail?)
 * 4. If "condition" is true, rule fails with specified failure status
 * 5. BLOCKER rules stop evaluation immediately
 * 6. Aggregate all results into final compliance status
 */

import * as jsonLogic from 'json-logic-js';
import {
  ComplianceRule,
  EvaluationContext,
  RuleEvaluationResult,
  BatchComplianceResult,
  ALLOWED_OPERATORS,
  AllowedOperator,
} from '../types/rule-schema';
import { ComplianceStatus, RuleSeverity, ProductCategory } from '../types/categories';

/**
 * Custom operations for JSON Logic
 * We extend JSON Logic with operations we need
 */
const setupCustomOperators = () => {
  // Add 'abs' operator for absolute value (used in variance calculations)
  if (!jsonLogic.is_logic({ 'abs': 1 })) {
    jsonLogic.add_operation('abs', (value: unknown) => Math.abs(value as number));
  }
};

// Initialize custom operators
setupCustomOperators();

// Create a Set for fast operator lookup
const ALLOWED_OPERATORS_SET = new Set<string>(ALLOWED_OPERATORS as readonly string[]);

/**
 * Validates that a rule only uses allowed operators
 * This is a security measure to prevent arbitrary code execution
 */
export function validateRuleOperators(rule: ComplianceRule): { valid: boolean; invalidOperators: string[] } {
  const invalidOperators: string[] = [];

  const checkNode = (node: unknown): void => {
    if (node === null || node === undefined) return;
    if (typeof node !== 'object') return;

    if (Array.isArray(node)) {
      node.forEach(checkNode);
      return;
    }

    const obj = node as Record<string, unknown>;
    for (const key of Object.keys(obj)) {
      // 'var' is always allowed (it's how we reference data)
      if (key === 'var') continue;

      // Check if this is a JSON Logic operator (not a data key)
      if (jsonLogic.is_logic({ [key]: obj[key] })) {
        if (!ALLOWED_OPERATORS_SET.has(key)) {
          invalidOperators.push(key);
        }
      }

      // Recursively check children
      checkNode(obj[key]);
    }
  };

  checkNode(rule.when);
  checkNode(rule.condition);

  return {
    valid: invalidOperators.length === 0,
    invalidOperators: [...new Set(invalidOperators)], // Deduplicate
  };
}

/**
 * Evaluates a single rule against the context
 * Returns the evaluation result
 */
export function evaluateRule(
  rule: ComplianceRule,
  context: EvaluationContext,
): RuleEvaluationResult {
  const startTime = Date.now();

  try {
    // First, check if this rule applies (evaluate "when" condition)
    const whenResult = jsonLogic.apply(rule.when, context);

    if (!whenResult) {
      // Rule does not apply to this context
      return {
        ruleId: rule.ruleId,
        version: rule.version,
        passed: true,
        applied: false,
        evaluatedAt: context.evaluatedAt,
        durationMs: Date.now() - startTime,
      };
    }

    // Rule applies, now check if it fails (evaluate "condition")
    // If condition is TRUE, the rule FAILS
    const conditionResult = jsonLogic.apply(rule.condition, context);

    if (conditionResult) {
      // Condition matched = rule failed
      return {
        ruleId: rule.ruleId,
        version: rule.version,
        passed: false,
        applied: true,
        evaluatedAt: context.evaluatedAt,
        durationMs: Date.now() - startTime,
        failure: {
          status: rule.failure.status,
          reasonCode: rule.failure.reasonCode,
          message: rule.failure.message,
          severity: rule.severity,
        },
      };
    }

    // Condition did not match = rule passed
    return {
      ruleId: rule.ruleId,
      version: rule.version,
      passed: true,
      applied: true,
      evaluatedAt: context.evaluatedAt,
      durationMs: Date.now() - startTime,
    };
  } catch (error) {
    // Rule evaluation error - treat as requires review
    return {
      ruleId: rule.ruleId,
      version: rule.version,
      passed: false,
      applied: true,
      evaluatedAt: context.evaluatedAt,
      durationMs: Date.now() - startTime,
      failure: {
        status: ComplianceStatus.REQUIRES_REVIEW,
        reasonCode: 'RULE_EVALUATION_ERROR',
        message: `Rule evaluation error: ${error instanceof Error ? error.message : 'Unknown error'}`,
        severity: RuleSeverity.BLOCKER,
      },
    };
  }
}

/**
 * Determines the final compliance status from all rule results
 * Priority: NON_COMPLIANT > EXPIRED > REQUIRES_REVIEW > PENDING > COMPLIANT
 */
function determineOverallStatus(results: RuleEvaluationResult[]): ComplianceStatus {
  const statusPriority: Record<ComplianceStatus, number> = {
    [ComplianceStatus.NON_COMPLIANT]: 5,
    [ComplianceStatus.EXPIRED]: 4,
    [ComplianceStatus.REQUIRES_REVIEW]: 3,
    [ComplianceStatus.PENDING]: 2,
    [ComplianceStatus.COMPLIANT]: 1,
  };

  let worstStatus = ComplianceStatus.COMPLIANT;
  let worstPriority = 1;

  for (const result of results) {
    if (!result.passed && result.failure) {
      const failureStatus = result.failure.status as ComplianceStatus;
      const priority = statusPriority[failureStatus] ?? 1;
      if (priority > worstPriority) {
        worstPriority = priority;
        worstStatus = failureStatus;
      }
    }
  }

  return worstStatus;
}

/**
 * Main evaluation function - evaluates all rules for a batch
 * 
 * @param rules - Array of compliance rules to evaluate
 * @param context - The evaluation context (product, batch, documents, etc.)
 * @returns Complete batch compliance result
 */
export function evaluateBatchCompliance(
  rules: ComplianceRule[],
  context: EvaluationContext,
): BatchComplianceResult {
  const startTime = Date.now();
  const results: RuleEvaluationResult[] = [];
  let stoppedByBlocker = false;
  let blockerRuleId: string | undefined;

  // Evaluate rules in order
  for (const rule of rules) {
    // Skip inactive rules
    if (rule.status !== 'ACTIVE') {
      continue;
    }

    const result = evaluateRule(rule, context);
    results.push(result);

    // If this is a BLOCKER that failed, stop evaluation
    if (!result.passed && rule.severity === RuleSeverity.BLOCKER) {
      stoppedByBlocker = true;
      blockerRuleId = rule.ruleId;
      break;
    }
  }

  // Calculate statistics
  const appliedRules = results.filter((r) => r.applied);
  const passedRules = results.filter((r) => r.passed && r.applied);
  const failedRules = results.filter((r) => !r.passed && r.applied);
  const blockerFailures = failedRules.filter(
    (r) => r.failure?.severity === RuleSeverity.BLOCKER,
  );
  const warningFailures = failedRules.filter(
    (r) => r.failure?.severity === RuleSeverity.WARNING,
  );

  // Determine overall status
  const overallStatus = determineOverallStatus(results);

  // Build the decision trail - human readable explanation
  const decisionTrail = results
    .filter((r) => r.applied)
    .map((r) => {
      if (r.passed) {
        return `✓ ${r.ruleId}: PASSED`;
      } else {
        return `✗ ${r.ruleId}: FAILED - ${r.failure?.message}`;
      }
    });

  return {
    batchId: context.batch.batchId,
    productId: context.product.productId,
    evaluatedAt: context.evaluatedAt,
    overallStatus,
    results,
    summary: {
      totalRules: rules.length,
      rulesApplied: appliedRules.length,
      rulesPassed: passedRules.length,
      rulesFailed: failedRules.length,
      blockersFailed: blockerFailures.length,
      warningsFailed: warningFailures.length,
    },
    stoppedByBlocker,
    blockerRuleId,
    decisionTrail,
    durationMs: Date.now() - startTime,
  };
}

/**
 * Creates an evaluation context from raw data
 * This normalizes all the data into the shape rules expect
 */
export function createEvaluationContext(data: {
  product: {
    productId: string;
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
  batch: {
    batchId: string;
    batchNumber: string;
    manufacturedAt?: number;
    expiresAt?: number;
    shelfLifeMonths?: number;
    ndcOnLabel?: string;
    isRecalled?: boolean;
  };
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
  license?: {
    isExpired?: boolean;
    state?: string;
    expiresAt?: number;
  };
  insurance?: {
    isActive?: boolean;
    coversCannabis?: boolean;
    expiresAt?: number;
  };
  manufacturer?: {
    name?: string;
    isGmpCertified?: boolean;
    isFdaRegistered?: boolean;
  };
  saleState?: string;
}): EvaluationContext {
  const now = Date.now();

  return {
    evaluatedAt: now,
    product: {
      productId: data.product.productId,
      sku: data.product.sku,
      category: data.product.category,
      manufacturerName: data.product.manufacturerName,
      declaredPotency: data.product.declaredPotency,
      declaredCbdPercent: data.product.declaredCbdPercent,
      declaredPurity: data.product.declaredPurity,
      declaredSequence: data.product.declaredSequence,
      expectedMolecularWeight: data.product.expectedMolecularWeight,
      declaredServingSize: data.product.declaredServingSize,
      ndcNumber: data.product.ndcNumber,
      requiresSterility: data.product.requiresSterility,
      isInjectable: data.product.isInjectable,
      isOralSolid: data.product.isOralSolid,
      isLyophilized: data.product.isLyophilized,
      storageConditions: data.product.storageConditions,
      hasMedicalClaims: data.product.hasMedicalClaims,
      hasFdaDisclaimer: data.product.hasFdaDisclaimer,
      hasResearchDisclaimer: data.product.hasResearchDisclaimer,
      hasThirdPartyCertification: data.product.hasThirdPartyCertification,
      marketedForHumanUse: data.product.marketedForHumanUse,
      isDeaControlled: data.product.isDeaControlled,
      isFdaBanned: data.product.isFdaBanned,
    },
    batch: {
      batchId: data.batch.batchId,
      batchNumber: data.batch.batchNumber,
      manufacturedAt: data.batch.manufacturedAt,
      expiresAt: data.batch.expiresAt,
      shelfLifeMonths: data.batch.shelfLifeMonths,
      ndcOnLabel: data.batch.ndcOnLabel,
      isRecalled: data.batch.isRecalled ?? false,
    },
    lab: data.lab ?? {},
    documents: data.documents ?? {},
    license: data.license ?? {},
    insurance: data.insurance ?? {},
    manufacturer: data.manufacturer ?? {},
    saleState: data.saleState,
  };
}

/**
 * Generates a human-readable compliance report
 */
export function generateComplianceReport(result: BatchComplianceResult): string {
  const lines: string[] = [];

  lines.push('═══════════════════════════════════════════════════════════════');
  lines.push('                    COMPLIANCE EVALUATION REPORT');
  lines.push('═══════════════════════════════════════════════════════════════');
  lines.push('');
  lines.push(`Batch ID:       ${result.batchId}`);
  lines.push(`Product ID:     ${result.productId}`);
  lines.push(`Evaluated At:   ${new Date(result.evaluatedAt).toISOString()}`);
  lines.push(`Duration:       ${result.durationMs}ms`);
  lines.push('');
  lines.push('───────────────────────────────────────────────────────────────');
  lines.push('                         OVERALL STATUS');
  lines.push('───────────────────────────────────────────────────────────────');
  lines.push('');

  const statusEmoji: Record<ComplianceStatus, string> = {
    [ComplianceStatus.COMPLIANT]: '✅',
    [ComplianceStatus.NON_COMPLIANT]: '❌',
    [ComplianceStatus.PENDING]: '⏳',
    [ComplianceStatus.EXPIRED]: '⏰',
    [ComplianceStatus.REQUIRES_REVIEW]: '🔍',
  };

  const overallStatus = result.overallStatus as ComplianceStatus;
  lines.push(`  ${statusEmoji[overallStatus]} ${overallStatus}`);
  lines.push('');

  if (result.stoppedByBlocker) {
    lines.push(`  ⚠️  Evaluation stopped by blocker: ${result.blockerRuleId}`);
    lines.push('');
  }

  lines.push('───────────────────────────────────────────────────────────────');
  lines.push('                           SUMMARY');
  lines.push('───────────────────────────────────────────────────────────────');
  lines.push('');
  lines.push(`  Total Rules:      ${result.summary.totalRules}`);
  lines.push(`  Rules Applied:    ${result.summary.rulesApplied}`);
  lines.push(`  Rules Passed:     ${result.summary.rulesPassed}`);
  lines.push(`  Rules Failed:     ${result.summary.rulesFailed}`);
  lines.push(`  Blockers Failed:  ${result.summary.blockersFailed}`);
  lines.push(`  Warnings:         ${result.summary.warningsFailed}`);
  lines.push('');
  lines.push('───────────────────────────────────────────────────────────────');
  lines.push('                       DECISION TRAIL');
  lines.push('───────────────────────────────────────────────────────────────');
  lines.push('');

  for (const decision of result.decisionTrail) {
    lines.push(`  ${decision}`);
  }

  lines.push('');
  lines.push('═══════════════════════════════════════════════════════════════');

  return lines.join('\n');
}
