/**
 * Pharmaceutical Compliance Rules
 * 
 * Required Documents:
 * - Lab Report (COA)
 * - GMP Certificate
 * - FDA Registration
 * - NDC (National Drug Code) Assignment
 * 
 * Hard Rules:
 * - GMP certificate valid at manufacture
 * - Manufacturer name must match across all documents
 * - NDC must be valid and registered
 * - Stability data must support expiry date
 * - API (Active Pharmaceutical Ingredient) potency must be exact
 */

import { ComplianceRule } from '../types/rule-schema';
import { ProductCategory, ComplianceStatus, RuleSeverity, RuleStatus, Jurisdiction } from '../types/categories';

const now = new Date().toISOString();

export const PHARMA_RULES: ComplianceRule[] = [
  // ============================================
  // DOCUMENT REQUIREMENTS
  // ============================================
  {
    ruleId: 'PHARMA_COA_REQUIRED',
    version: 1,
    category: ProductCategory.PHARMA,
    severity: RuleSeverity.BLOCKER,
    status: RuleStatus.ACTIVE,
    description: 'Pharmaceuticals require a Certificate of Analysis (COA)',
    when: { '==': [{ 'var': 'product.category' }, 'PHARMA'] },
    condition: { '!': { 'var': 'documents.hasCOA' } },
    failure: {
      status: ComplianceStatus.REQUIRES_REVIEW,
      reasonCode: 'MISSING_COA',
      message: 'Certificate of Analysis (COA) is required for pharmaceutical products',
    },
    metadata: {
      jurisdiction: Jurisdiction.US_FEDERAL,
      source: 'FDA 21 CFR Part 211',
      appliesAt: 'BATCH_LEVEL',
    },
    createdAt: now,
    createdBy: 'system',
  },
  {
    ruleId: 'PHARMA_GMP_CERTIFICATE_REQUIRED',
    version: 1,
    category: ProductCategory.PHARMA,
    severity: RuleSeverity.BLOCKER,
    status: RuleStatus.ACTIVE,
    description: 'Pharmaceuticals require a valid GMP certificate',
    when: { '==': [{ 'var': 'product.category' }, 'PHARMA'] },
    condition: { '!': { 'var': 'documents.hasGmpCertificate' } },
    failure: {
      status: ComplianceStatus.REQUIRES_REVIEW,
      reasonCode: 'MISSING_GMP_CERTIFICATE',
      message: 'GMP (Good Manufacturing Practice) certificate is required for pharmaceuticals',
    },
    metadata: {
      jurisdiction: Jurisdiction.US_FEDERAL,
      source: 'FDA 21 CFR Part 211 (cGMP)',
      appliesAt: 'BATCH_LEVEL',
    },
    createdAt: now,
    createdBy: 'system',
  },
  {
    ruleId: 'PHARMA_FDA_REGISTRATION_REQUIRED',
    version: 1,
    category: ProductCategory.PHARMA,
    severity: RuleSeverity.BLOCKER,
    status: RuleStatus.ACTIVE,
    description: 'Manufacturer must have FDA registration',
    when: { '==': [{ 'var': 'product.category' }, 'PHARMA'] },
    condition: { '!': { 'var': 'documents.hasFdaRegistration' } },
    failure: {
      status: ComplianceStatus.REQUIRES_REVIEW,
      reasonCode: 'MISSING_FDA_REGISTRATION',
      message: 'FDA establishment registration is required for pharmaceutical manufacturing',
    },
    metadata: {
      jurisdiction: Jurisdiction.US_FEDERAL,
      source: 'FDA 21 CFR Part 207',
      appliesAt: 'BATCH_LEVEL',
    },
    createdAt: now,
    createdBy: 'system',
  },
  {
    ruleId: 'PHARMA_NDC_REQUIRED',
    version: 1,
    category: ProductCategory.PHARMA,
    severity: RuleSeverity.BLOCKER,
    status: RuleStatus.ACTIVE,
    description: 'Pharmaceuticals must have valid NDC (National Drug Code)',
    when: { '==': [{ 'var': 'product.category' }, 'PHARMA'] },
    condition: { '!': { 'var': 'product.ndcNumber' } },
    failure: {
      status: ComplianceStatus.REQUIRES_REVIEW,
      reasonCode: 'MISSING_NDC',
      message: 'National Drug Code (NDC) is required for pharmaceutical products',
    },
    metadata: {
      jurisdiction: Jurisdiction.US_FEDERAL,
      source: 'FDA NDC Requirements',
      appliesAt: 'BATCH_LEVEL',
    },
    createdAt: now,
    createdBy: 'system',
  },

  // ============================================
  // GMP VALIDITY
  // ============================================
  {
    ruleId: 'PHARMA_GMP_VALID_AT_MANUFACTURE',
    version: 1,
    category: ProductCategory.PHARMA,
    severity: RuleSeverity.BLOCKER,
    status: RuleStatus.ACTIVE,
    description: 'GMP certificate must be valid at time of manufacture',
    when: {
      'and': [
        { '==': [{ 'var': 'product.category' }, 'PHARMA'] },
        { '!!': { 'var': 'batch.manufacturedAt' } },
        { '!!': { 'var': 'documents.gmpExpiresAt' } },
      ],
    },
    condition: {
      '>': [{ 'var': 'batch.manufacturedAt' }, { 'var': 'documents.gmpExpiresAt' }],
    },
    failure: {
      status: ComplianceStatus.NON_COMPLIANT,
      reasonCode: 'GMP_EXPIRED_AT_MANUFACTURE',
      message: 'GMP certificate was expired at the time of manufacture. This is a critical violation.',
    },
    metadata: {
      jurisdiction: Jurisdiction.US_FEDERAL,
      source: 'FDA 21 CFR Part 211',
      appliesAt: 'BATCH_LEVEL',
    },
    createdAt: now,
    createdBy: 'system',
  },
  {
    ruleId: 'PHARMA_GMP_CURRENTLY_VALID',
    version: 1,
    category: ProductCategory.PHARMA,
    severity: RuleSeverity.BLOCKER,
    status: RuleStatus.ACTIVE,
    description: 'GMP certificate must be currently valid for ongoing distribution',
    when: {
      'and': [
        { '==': [{ 'var': 'product.category' }, 'PHARMA'] },
        { '!!': { 'var': 'documents.gmpExpiresAt' } },
      ],
    },
    condition: {
      '<': [{ 'var': 'documents.gmpExpiresAt' }, { 'var': 'evaluatedAt' }],
    },
    failure: {
      status: ComplianceStatus.EXPIRED,
      reasonCode: 'GMP_CURRENTLY_EXPIRED',
      message: 'GMP certificate is currently expired. Cannot continue distribution.',
    },
    metadata: {
      jurisdiction: Jurisdiction.US_FEDERAL,
      source: 'FDA 21 CFR Part 211',
      appliesAt: 'BATCH_LEVEL',
    },
    createdAt: now,
    createdBy: 'system',
  },

  // ============================================
  // MANUFACTURER CONSISTENCY
  // ============================================
  {
    ruleId: 'PHARMA_MANUFACTURER_MATCH_GMP',
    version: 1,
    category: ProductCategory.PHARMA,
    severity: RuleSeverity.BLOCKER,
    status: RuleStatus.ACTIVE,
    description: 'Manufacturer name must match across product and GMP certificate',
    when: {
      'and': [
        { '==': [{ 'var': 'product.category' }, 'PHARMA'] },
        { '!!': { 'var': 'product.manufacturerName' } },
        { '!!': { 'var': 'documents.gmpManufacturerName' } },
      ],
    },
    condition: {
      '!=': [{ 'var': 'product.manufacturerName' }, { 'var': 'documents.gmpManufacturerName' }],
    },
    failure: {
      status: ComplianceStatus.NON_COMPLIANT,
      reasonCode: 'MANUFACTURER_GMP_MISMATCH',
      message: 'Product manufacturer name does not match GMP certificate manufacturer',
    },
    metadata: {
      jurisdiction: Jurisdiction.US_FEDERAL,
      source: 'FDA 21 CFR Part 211',
      appliesAt: 'BATCH_LEVEL',
    },
    createdAt: now,
    createdBy: 'system',
  },
  {
    ruleId: 'PHARMA_MANUFACTURER_MATCH_COA',
    version: 1,
    category: ProductCategory.PHARMA,
    severity: RuleSeverity.BLOCKER,
    status: RuleStatus.ACTIVE,
    description: 'Manufacturer name must match across product and COA',
    when: {
      'and': [
        { '==': [{ 'var': 'product.category' }, 'PHARMA'] },
        { '!!': { 'var': 'product.manufacturerName' } },
        { '!!': { 'var': 'lab.manufacturerName' } },
      ],
    },
    condition: {
      '!=': [{ 'var': 'product.manufacturerName' }, { 'var': 'lab.manufacturerName' }],
    },
    failure: {
      status: ComplianceStatus.NON_COMPLIANT,
      reasonCode: 'MANUFACTURER_COA_MISMATCH',
      message: 'Product manufacturer name does not match COA manufacturer',
    },
    metadata: {
      jurisdiction: Jurisdiction.US_FEDERAL,
      source: 'FDA 21 CFR Part 211',
      appliesAt: 'BATCH_LEVEL',
    },
    createdAt: now,
    createdBy: 'system',
  },

  // ============================================
  // API POTENCY & PURITY
  // ============================================
  {
    ruleId: 'PHARMA_API_POTENCY_VARIANCE',
    version: 1,
    category: ProductCategory.PHARMA,
    severity: RuleSeverity.BLOCKER,
    status: RuleStatus.ACTIVE,
    description: 'Active Pharmaceutical Ingredient potency must be within ±5% of declared',
    when: {
      'and': [
        { '==': [{ 'var': 'product.category' }, 'PHARMA'] },
        { '!=': [{ 'var': 'lab.apiPotency' }, null] },
        { '!=': [{ 'var': 'product.declaredPotency' }, null] },
      ],
    },
    condition: {
      '>': [
        {
          'abs': {
            '-': [
              { '/': [{ 'var': 'lab.apiPotency' }, { 'var': 'product.declaredPotency' }] },
              1,
            ],
          },
        },
        0.05, // 5% variance - stricter than supplements
      ],
    },
    failure: {
      status: ComplianceStatus.NON_COMPLIANT,
      reasonCode: 'API_POTENCY_VARIANCE_EXCEEDS_LIMIT',
      message: 'API potency differs from declared value by more than ±5%. Pharmaceutical products require tighter tolerances.',
    },
    metadata: {
      jurisdiction: Jurisdiction.US_FEDERAL,
      source: 'FDA 21 CFR Part 211 / USP Standards',
      appliesAt: 'BATCH_LEVEL',
    },
    createdAt: now,
    createdBy: 'system',
  },
  {
    ruleId: 'PHARMA_PURITY_MINIMUM',
    version: 1,
    category: ProductCategory.PHARMA,
    severity: RuleSeverity.BLOCKER,
    status: RuleStatus.ACTIVE,
    description: 'API purity must meet minimum threshold (typically 99%+)',
    when: {
      'and': [
        { '==': [{ 'var': 'product.category' }, 'PHARMA'] },
        { '!=': [{ 'var': 'lab.purityPercent' }, null] },
      ],
    },
    condition: {
      '<': [{ 'var': 'lab.purityPercent' }, 99],
    },
    failure: {
      status: ComplianceStatus.NON_COMPLIANT,
      reasonCode: 'PURITY_BELOW_MINIMUM',
      message: 'API purity is below 99% minimum threshold for pharmaceutical products',
    },
    metadata: {
      jurisdiction: Jurisdiction.US_FEDERAL,
      source: 'USP/NF Monograph Standards',
      appliesAt: 'BATCH_LEVEL',
    },
    createdAt: now,
    createdBy: 'system',
  },

  // ============================================
  // STABILITY DATA
  // ============================================
  {
    ruleId: 'PHARMA_STABILITY_DATA_REQUIRED',
    version: 1,
    category: ProductCategory.PHARMA,
    severity: RuleSeverity.BLOCKER,
    status: RuleStatus.ACTIVE,
    description: 'Stability data must be available to support expiry date',
    when: { '==': [{ 'var': 'product.category' }, 'PHARMA'] },
    condition: { '!': { 'var': 'documents.hasStabilityData' } },
    failure: {
      status: ComplianceStatus.REQUIRES_REVIEW,
      reasonCode: 'MISSING_STABILITY_DATA',
      message: 'Stability study data is required to support product expiration dating',
    },
    metadata: {
      jurisdiction: Jurisdiction.US_FEDERAL,
      source: 'FDA 21 CFR 211.137 / ICH Q1A',
      appliesAt: 'BATCH_LEVEL',
    },
    createdAt: now,
    createdBy: 'system',
  },
  {
    ruleId: 'PHARMA_EXPIRY_SUPPORTED_BY_STABILITY',
    version: 1,
    category: ProductCategory.PHARMA,
    severity: RuleSeverity.BLOCKER,
    status: RuleStatus.ACTIVE,
    description: 'Expiry date must be supported by stability data timeframe',
    when: {
      'and': [
        { '==': [{ 'var': 'product.category' }, 'PHARMA'] },
        { '!!': { 'var': 'documents.stabilityDurationMonths' } },
        { '!!': { 'var': 'batch.shelfLifeMonths' } },
      ],
    },
    condition: {
      '>': [{ 'var': 'batch.shelfLifeMonths' }, { 'var': 'documents.stabilityDurationMonths' }],
    },
    failure: {
      status: ComplianceStatus.NON_COMPLIANT,
      reasonCode: 'EXPIRY_EXCEEDS_STABILITY',
      message: 'Product shelf life exceeds the duration supported by stability studies',
    },
    metadata: {
      jurisdiction: Jurisdiction.US_FEDERAL,
      source: 'FDA 21 CFR 211.137',
      appliesAt: 'BATCH_LEVEL',
    },
    createdAt: now,
    createdBy: 'system',
  },

  // ============================================
  // BATCH MATCHING
  // ============================================
  {
    ruleId: 'PHARMA_COA_BATCH_MATCH',
    version: 1,
    category: ProductCategory.PHARMA,
    severity: RuleSeverity.BLOCKER,
    status: RuleStatus.ACTIVE,
    description: 'Lab report batch ID must match the product batch',
    when: {
      'and': [
        { '==': [{ 'var': 'product.category' }, 'PHARMA'] },
        { '!!': { 'var': 'lab.batchIdOnReport' } },
      ],
    },
    condition: {
      '!=': [{ 'var': 'lab.batchIdOnReport' }, { 'var': 'batch.batchNumber' }],
    },
    failure: {
      status: ComplianceStatus.NON_COMPLIANT,
      reasonCode: 'BATCH_ID_MISMATCH',
      message: 'Lab report batch ID does not match the product batch number',
    },
    metadata: {
      jurisdiction: Jurisdiction.US_FEDERAL,
      source: 'FDA 21 CFR Part 211',
      appliesAt: 'BATCH_LEVEL',
    },
    createdAt: now,
    createdBy: 'system',
  },
  {
    ruleId: 'PHARMA_NDC_BATCH_MATCH',
    version: 1,
    category: ProductCategory.PHARMA,
    severity: RuleSeverity.BLOCKER,
    status: RuleStatus.ACTIVE,
    description: 'NDC on batch must match registered NDC',
    when: {
      'and': [
        { '==': [{ 'var': 'product.category' }, 'PHARMA'] },
        { '!!': { 'var': 'batch.ndcOnLabel' } },
        { '!!': { 'var': 'product.ndcNumber' } },
      ],
    },
    condition: {
      '!=': [{ 'var': 'batch.ndcOnLabel' }, { 'var': 'product.ndcNumber' }],
    },
    failure: {
      status: ComplianceStatus.NON_COMPLIANT,
      reasonCode: 'NDC_MISMATCH',
      message: 'NDC on batch label does not match registered product NDC',
    },
    metadata: {
      jurisdiction: Jurisdiction.US_FEDERAL,
      source: 'FDA NDC Requirements',
      appliesAt: 'BATCH_LEVEL',
    },
    createdAt: now,
    createdBy: 'system',
  },

  // ============================================
  // CONTAMINANTS & IMPURITIES
  // ============================================
  {
    ruleId: 'PHARMA_IMPURITIES_WITHIN_LIMITS',
    version: 1,
    category: ProductCategory.PHARMA,
    severity: RuleSeverity.BLOCKER,
    status: RuleStatus.ACTIVE,
    description: 'Impurities must be within ICH limits',
    when: { '==': [{ 'var': 'product.category' }, 'PHARMA'] },
    condition: { '==': [{ 'var': 'lab.impuritiesExceedLimit' }, true] },
    failure: {
      status: ComplianceStatus.NON_COMPLIANT,
      reasonCode: 'IMPURITIES_EXCEED_LIMIT',
      message: 'Impurity levels exceed ICH limits. Product fails quality specifications.',
    },
    metadata: {
      jurisdiction: Jurisdiction.INTERNATIONAL,
      source: 'ICH Q3A/Q3B - Impurities Guidelines',
      appliesAt: 'BATCH_LEVEL',
    },
    createdAt: now,
    createdBy: 'system',
  },
  {
    ruleId: 'PHARMA_STERILITY_TEST',
    version: 1,
    category: ProductCategory.PHARMA,
    severity: RuleSeverity.BLOCKER,
    status: RuleStatus.ACTIVE,
    description: 'Sterile products must pass sterility testing',
    when: {
      'and': [
        { '==': [{ 'var': 'product.category' }, 'PHARMA'] },
        { '==': [{ 'var': 'product.requiresSterility' }, true] },
      ],
    },
    condition: { '!=': [{ 'var': 'lab.sterilitySterile' }, true] },
    failure: {
      status: ComplianceStatus.NON_COMPLIANT,
      reasonCode: 'STERILITY_TEST_FAILED',
      message: 'Sterile product failed sterility testing. Product cannot be released.',
    },
    metadata: {
      jurisdiction: Jurisdiction.US_FEDERAL,
      source: 'FDA 21 CFR 211 / USP <71>',
      appliesAt: 'BATCH_LEVEL',
    },
    createdAt: now,
    createdBy: 'system',
  },
  {
    ruleId: 'PHARMA_ENDOTOXIN_TEST',
    version: 1,
    category: ProductCategory.PHARMA,
    severity: RuleSeverity.BLOCKER,
    status: RuleStatus.ACTIVE,
    description: 'Injectable products must pass endotoxin testing',
    when: {
      'and': [
        { '==': [{ 'var': 'product.category' }, 'PHARMA'] },
        { '==': [{ 'var': 'product.isInjectable' }, true] },
      ],
    },
    condition: { '!=': [{ 'var': 'lab.endotoxinPass' }, true] },
    failure: {
      status: ComplianceStatus.NON_COMPLIANT,
      reasonCode: 'ENDOTOXIN_TEST_FAILED',
      message: 'Injectable product failed endotoxin testing (LAL test). Product cannot be released.',
    },
    metadata: {
      jurisdiction: Jurisdiction.US_FEDERAL,
      source: 'FDA 21 CFR 211 / USP <85>',
      appliesAt: 'BATCH_LEVEL',
    },
    createdAt: now,
    createdBy: 'system',
  },

  // ============================================
  // DISSOLUTION & CONTENT UNIFORMITY
  // ============================================
  {
    ruleId: 'PHARMA_DISSOLUTION_TEST',
    version: 1,
    category: ProductCategory.PHARMA,
    severity: RuleSeverity.BLOCKER,
    status: RuleStatus.ACTIVE,
    description: 'Oral solid dosage forms must pass dissolution testing',
    when: {
      'and': [
        { '==': [{ 'var': 'product.category' }, 'PHARMA'] },
        { '==': [{ 'var': 'product.isOralSolid' }, true] },
      ],
    },
    condition: { '!=': [{ 'var': 'lab.dissolutionPass' }, true] },
    failure: {
      status: ComplianceStatus.NON_COMPLIANT,
      reasonCode: 'DISSOLUTION_TEST_FAILED',
      message: 'Product failed dissolution testing. Drug release profile does not meet specifications.',
    },
    metadata: {
      jurisdiction: Jurisdiction.US_FEDERAL,
      source: 'FDA 21 CFR 211 / USP <711>',
      appliesAt: 'BATCH_LEVEL',
    },
    createdAt: now,
    createdBy: 'system',
  },
  {
    ruleId: 'PHARMA_CONTENT_UNIFORMITY',
    version: 1,
    category: ProductCategory.PHARMA,
    severity: RuleSeverity.BLOCKER,
    status: RuleStatus.ACTIVE,
    description: 'Dosage units must pass content uniformity testing',
    when: { '==': [{ 'var': 'product.category' }, 'PHARMA'] },
    condition: { '!=': [{ 'var': 'lab.contentUniformityPass' }, true] },
    failure: {
      status: ComplianceStatus.NON_COMPLIANT,
      reasonCode: 'CONTENT_UNIFORMITY_FAILED',
      message: 'Product failed content uniformity testing. Dosage units are not consistent.',
    },
    metadata: {
      jurisdiction: Jurisdiction.US_FEDERAL,
      source: 'FDA 21 CFR 211 / USP <905>',
      appliesAt: 'BATCH_LEVEL',
    },
    createdAt: now,
    createdBy: 'system',
  },

  // ============================================
  // RECALLS & WARNINGS
  // ============================================
  {
    ruleId: 'PHARMA_NOT_RECALLED',
    version: 1,
    category: ProductCategory.PHARMA,
    severity: RuleSeverity.BLOCKER,
    status: RuleStatus.ACTIVE,
    description: 'Batch must not be under active recall',
    when: { '==': [{ 'var': 'product.category' }, 'PHARMA'] },
    condition: { '==': [{ 'var': 'batch.isRecalled' }, true] },
    failure: {
      status: ComplianceStatus.NON_COMPLIANT,
      reasonCode: 'BATCH_RECALLED',
      message: 'This batch is under active recall and cannot be sold',
    },
    metadata: {
      jurisdiction: Jurisdiction.US_FEDERAL,
      source: 'FDA Recall Procedures',
      appliesAt: 'BATCH_LEVEL',
    },
    createdAt: now,
    createdBy: 'system',
  },
];

export default PHARMA_RULES;
