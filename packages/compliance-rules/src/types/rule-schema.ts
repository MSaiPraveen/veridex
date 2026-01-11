/**
 * Compliance Rule Schema - Authoritative Definition
 * 
 * Rules are DATA, not code.
 * Every rule follows this exact shape.
 * No exceptions.
 */

import { ProductCategory, ComplianceStatus, RuleSeverity, RuleStatus, Jurisdiction } from './categories';

/**
 * JSON Logic operators - LOCKED SET
 * Only these operators are allowed in rule conditions.
 * Anything else is rejected at rule creation.
 */
export const ALLOWED_OPERATORS = [
  '==', '!=', '===', '!==',
  '>', '<', '>=', '<=',
  'and', 'or', 'all', 'some', 'none',
  '!', '!!',
  'var',
  'in',
  'missing', 'missing_some',
  'if', 'cat', 'substr', 'merge',
  '+', '-', '*', '/', '%',
  'min', 'max',
  'map', 'filter', 'reduce',
  'abs', // Custom operator for variance calculations
] as const;

export type AllowedOperator = typeof ALLOWED_OPERATORS[number];

/**
 * JSON Logic condition type
 * This is intentionally loosely typed to allow JSON Logic expressions
 */
export type JsonLogicCondition = Record<string, unknown> | boolean;

/**
 * Rule failure definition
 */
export interface RuleFailure {
  /** The compliance status when this rule fails */
  status: ComplianceStatus;
  
  /** Machine-readable reason code */
  reasonCode: string;
  
  /** Human-readable failure message */
  message: string;
}

/**
 * Rule metadata
 */
export interface RuleMetadata {
  /** Jurisdiction this rule applies to */
  jurisdiction?: Jurisdiction;
  
  /** Legal source/reference for this rule */
  source: string;
  
  /** What level the rule applies at */
  appliesAt: 'BATCH_LEVEL' | 'PRODUCT_LEVEL' | 'DOCUMENT_LEVEL';
  
  /** Optional notes */
  notes?: string;
  
  /** Effective date of this rule */
  effectiveFrom?: string;
  
  /** Expiration date (if rule has sunset clause) */
  effectiveUntil?: string;
}

/**
 * Compliance Rule - Canonical Schema
 * 
 * This is the authoritative rule structure.
 * All rules in the system follow this exact shape.
 */
export interface ComplianceRule {
  /** Immutable identifier - never reused, never deleted */
  ruleId: string;
  
  /** Increment on any logic change - old versions stored forever */
  version: number;
  
  /** Product category this rule applies to */
  category: ProductCategory;
  
  /** BLOCKER stops evaluation, WARNING is informational */
  severity: RuleSeverity;
  
  /** Only ACTIVE rules are evaluated */
  status: RuleStatus;
  
  /** Human-readable description of what this rule checks */
  description: string;
  
  /**
   * Preconditions - if this doesn't match, rule is SKIPPED
   * Example: Only apply to products in specific category
   */
  when: JsonLogicCondition;
  
  /**
   * The actual failure logic
   * If this evaluates to TRUE, the rule FAILS
   * 
   * IMPORTANT: True = failure, False = pass
   */
  condition: JsonLogicCondition;
  
  /** What happens when rule fails */
  failure: RuleFailure;
  
  /** Additional metadata */
  metadata: RuleMetadata;
  
  /** When this rule version was created */
  createdAt: string;
  
  /** Who created this rule version */
  createdBy: string;
}

/**
 * Evaluation context - what rules run against
 * 
 * Rules ONLY see this object.
 * No DB access. No side effects.
 * 
 * All fields are optional except the required identifiers
 * because rules use "when" conditions to check if data exists.
 */
export interface EvaluationContext {
  /** Timestamp of evaluation in milliseconds */
  evaluatedAt: number;
  
  product: {
    productId: string;
    category: ProductCategory;
    sku?: string;
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
  
  lab: {
    thcPercent?: number | null;
    cbdPercent?: number | null;
    purityPercent?: number | null;
    apiPotency?: number | null;
    activeIngredientPotency?: number | null;
    actualServingSize?: number | null;
    batchIdOnReport?: string | null;
    skuOnReport?: string | null;
    manufacturerName?: string | null;
    molecularWeight?: number | null;
    sequence?: string | null;
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
    tfaContentPercent?: number | null;
  };
  
  documents: {
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
  
  license: {
    isExpired?: boolean;
    state?: string;
    expiresAt?: number;
  };
  
  insurance: {
    isActive?: boolean;
    coversCannabis?: boolean;
    expiresAt?: number;
  };
  
  manufacturer: {
    name?: string;
    isGmpCertified?: boolean;
    isFdaRegistered?: boolean;
  };
  
  /** Sale state (for jurisdiction matching) */
  saleState?: string;
}

/**
 * Failure info attached to a rule evaluation result
 */
export interface EvaluationFailure {
  status: ComplianceStatus;
  reasonCode: string;
  message: string;
  severity: RuleSeverity;
}

/**
 * Result of a single rule evaluation
 */
export interface RuleEvaluationResult {
  ruleId: string;
  version: number;
  passed: boolean;
  /** Whether the rule was applied (when condition matched) */
  applied: boolean;
  evaluatedAt: number;
  durationMs: number;
  /** Present only when passed=false */
  failure?: EvaluationFailure;
}

/**
 * Compliance summary statistics
 */
export interface ComplianceSummary {
  totalRules: number;
  rulesApplied: number;
  rulesPassed: number;
  rulesFailed: number;
  blockersFailed: number;
  warningsFailed: number;
}

/**
 * Complete batch compliance result
 */
export interface BatchComplianceResult {
  batchId: string;
  productId: string;
  evaluatedAt: number;
  overallStatus: ComplianceStatus;
  results: RuleEvaluationResult[];
  summary: ComplianceSummary;
  stoppedByBlocker: boolean;
  blockerRuleId?: string;
  decisionTrail: string[];
  durationMs: number;
}

/**
 * Rule set version (for audit trail)
 */
export interface RuleSetVersion {
  version: string;
  category: ProductCategory;
  activeRuleIds: string[];
  createdAt: string;
  description?: string;
}
