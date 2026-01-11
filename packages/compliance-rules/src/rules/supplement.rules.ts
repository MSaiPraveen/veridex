/**
 * Supplement Compliance Rules
 * 
 * Required Documents:
 * - Lab Report (COA)
 * - GMP Certificate (Good Manufacturing Practice)
 * 
 * Hard Rules:
 * - Ingredients must match label (allergens)
 * - No banned substances (WADA, FDA banned list)
 * - Serving size must match label
 * - GMP certificate valid at time of manufacture
 * - NSF or USP certification recommended
 */

import { ComplianceRule } from '../types/rule-schema';
import { ProductCategory, ComplianceStatus, RuleSeverity, RuleStatus, Jurisdiction } from '../types/categories';

const now = new Date().toISOString();

export const SUPPLEMENT_RULES: ComplianceRule[] = [
  // ============================================
  // DOCUMENT REQUIREMENTS
  // ============================================
  {
    ruleId: 'SUPPLEMENT_COA_REQUIRED',
    version: 1,
    category: ProductCategory.SUPPLEMENT,
    severity: RuleSeverity.BLOCKER,
    status: RuleStatus.ACTIVE,
    description: 'Supplements require a Certificate of Analysis (COA)',
    when: { '==': [{ 'var': 'product.category' }, 'SUPPLEMENT'] },
    condition: { '!': { 'var': 'documents.hasCOA' } },
    failure: {
      status: ComplianceStatus.REQUIRES_REVIEW,
      reasonCode: 'MISSING_COA',
      message: 'Certificate of Analysis (COA) is required for dietary supplements',
    },
    metadata: {
      jurisdiction: Jurisdiction.US_FEDERAL,
      source: 'FDA DSHEA Regulations',
      appliesAt: 'BATCH_LEVEL',
    },
    createdAt: now,
    createdBy: 'system',
  },
  {
    ruleId: 'SUPPLEMENT_GMP_CERTIFICATE_REQUIRED',
    version: 1,
    category: ProductCategory.SUPPLEMENT,
    severity: RuleSeverity.BLOCKER,
    status: RuleStatus.ACTIVE,
    description: 'Supplements require a valid GMP certificate',
    when: { '==': [{ 'var': 'product.category' }, 'SUPPLEMENT'] },
    condition: { '!': { 'var': 'documents.hasGmpCertificate' } },
    failure: {
      status: ComplianceStatus.REQUIRES_REVIEW,
      reasonCode: 'MISSING_GMP_CERTIFICATE',
      message: 'GMP (Good Manufacturing Practice) certificate is required for dietary supplements',
    },
    metadata: {
      jurisdiction: Jurisdiction.US_FEDERAL,
      source: 'FDA 21 CFR Part 111',
      appliesAt: 'BATCH_LEVEL',
    },
    createdAt: now,
    createdBy: 'system',
  },

  // ============================================
  // GMP VALIDITY
  // ============================================
  {
    ruleId: 'SUPPLEMENT_GMP_VALID_AT_MANUFACTURE',
    version: 1,
    category: ProductCategory.SUPPLEMENT,
    severity: RuleSeverity.BLOCKER,
    status: RuleStatus.ACTIVE,
    description: 'GMP certificate must be valid at time of manufacture',
    when: {
      'and': [
        { '==': [{ 'var': 'product.category' }, 'SUPPLEMENT'] },
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
      message: 'GMP certificate was expired at the time of manufacture',
    },
    metadata: {
      jurisdiction: Jurisdiction.US_FEDERAL,
      source: 'FDA 21 CFR Part 111',
      appliesAt: 'BATCH_LEVEL',
    },
    createdAt: now,
    createdBy: 'system',
  },
  {
    ruleId: 'SUPPLEMENT_GMP_EXPIRED',
    version: 1,
    category: ProductCategory.SUPPLEMENT,
    severity: RuleSeverity.WARNING,
    status: RuleStatus.ACTIVE,
    description: 'GMP certificate should be currently valid',
    when: {
      'and': [
        { '==': [{ 'var': 'product.category' }, 'SUPPLEMENT'] },
        { '!!': { 'var': 'documents.gmpExpiresAt' } },
      ],
    },
    condition: {
      '<': [{ 'var': 'documents.gmpExpiresAt' }, { 'var': 'evaluatedAt' }],
    },
    failure: {
      status: ComplianceStatus.REQUIRES_REVIEW,
      reasonCode: 'GMP_CURRENTLY_EXPIRED',
      message: 'GMP certificate is currently expired. Renew GMP certification.',
    },
    metadata: {
      jurisdiction: Jurisdiction.US_FEDERAL,
      source: 'FDA 21 CFR Part 111',
      appliesAt: 'BATCH_LEVEL',
    },
    createdAt: now,
    createdBy: 'system',
  },

  // ============================================
  // INGREDIENT MATCHING
  // ============================================
  {
    ruleId: 'SUPPLEMENT_INGREDIENTS_MATCH_LABEL',
    version: 1,
    category: ProductCategory.SUPPLEMENT,
    severity: RuleSeverity.BLOCKER,
    status: RuleStatus.ACTIVE,
    description: 'Lab-detected ingredients must match product label',
    when: { '==': [{ 'var': 'product.category' }, 'SUPPLEMENT'] },
    condition: { '!=': [{ 'var': 'lab.ingredientsMatchLabel' }, true] },
    failure: {
      status: ComplianceStatus.NON_COMPLIANT,
      reasonCode: 'INGREDIENTS_MISMATCH',
      message: 'Lab-detected ingredients do not match product label. Possible adulteration or mislabeling.',
    },
    metadata: {
      jurisdiction: Jurisdiction.US_FEDERAL,
      source: 'FDA DSHEA Labeling Requirements',
      appliesAt: 'BATCH_LEVEL',
    },
    createdAt: now,
    createdBy: 'system',
  },
  {
    ruleId: 'SUPPLEMENT_UNDECLARED_ALLERGENS',
    version: 1,
    category: ProductCategory.SUPPLEMENT,
    severity: RuleSeverity.BLOCKER,
    status: RuleStatus.ACTIVE,
    description: 'No undeclared allergens should be present',
    when: {
      'and': [
        { '==': [{ 'var': 'product.category' }, 'SUPPLEMENT'] },
        { '!!': { 'var': 'lab.undeclaredAllergens' } },
      ],
    },
    condition: {
      '>': [{ 'var': 'lab.undeclaredAllergens.length' }, 0],
    },
    failure: {
      status: ComplianceStatus.NON_COMPLIANT,
      reasonCode: 'UNDECLARED_ALLERGENS',
      message: 'Undeclared allergens detected. This is a serious labeling violation and safety concern.',
    },
    metadata: {
      jurisdiction: Jurisdiction.US_FEDERAL,
      source: 'FDA Food Allergen Labeling (FALCPA)',
      appliesAt: 'BATCH_LEVEL',
      notes: 'Major allergens: milk, eggs, fish, shellfish, tree nuts, peanuts, wheat, soy',
    },
    createdAt: now,
    createdBy: 'system',
  },

  // ============================================
  // BANNED SUBSTANCES
  // ============================================
  {
    ruleId: 'SUPPLEMENT_NO_BANNED_SUBSTANCES',
    version: 1,
    category: ProductCategory.SUPPLEMENT,
    severity: RuleSeverity.BLOCKER,
    status: RuleStatus.ACTIVE,
    description: 'No banned substances should be detected',
    when: { '==': [{ 'var': 'product.category' }, 'SUPPLEMENT'] },
    condition: { '==': [{ 'var': 'lab.hasBannedSubstances' }, true] },
    failure: {
      status: ComplianceStatus.NON_COMPLIANT,
      reasonCode: 'BANNED_SUBSTANCES_DETECTED',
      message: 'Banned substances detected in product. Product is not legal for sale.',
    },
    metadata: {
      jurisdiction: Jurisdiction.US_FEDERAL,
      source: 'FDA Banned Substances List',
      appliesAt: 'BATCH_LEVEL',
    },
    createdAt: now,
    createdBy: 'system',
  },
  {
    ruleId: 'SUPPLEMENT_NO_WADA_SUBSTANCES',
    version: 1,
    category: ProductCategory.SUPPLEMENT,
    severity: RuleSeverity.WARNING,
    status: RuleStatus.ACTIVE,
    description: 'WADA-prohibited substances should be flagged for athlete safety',
    when: { '==': [{ 'var': 'product.category' }, 'SUPPLEMENT'] },
    condition: { '==': [{ 'var': 'lab.hasWadaProhibitedSubstances' }, true] },
    failure: {
      status: ComplianceStatus.REQUIRES_REVIEW,
      reasonCode: 'WADA_SUBSTANCES_DETECTED',
      message: 'Product contains WADA-prohibited substances. Not suitable for competitive athletes.',
    },
    metadata: {
      jurisdiction: Jurisdiction.INTERNATIONAL,
      source: 'WADA Prohibited List',
      appliesAt: 'BATCH_LEVEL',
    },
    createdAt: now,
    createdBy: 'system',
  },
  {
    ruleId: 'SUPPLEMENT_NO_SYNTHETIC_STIMULANTS',
    version: 1,
    category: ProductCategory.SUPPLEMENT,
    severity: RuleSeverity.BLOCKER,
    status: RuleStatus.ACTIVE,
    description: 'No synthetic stimulants should be present',
    when: { '==': [{ 'var': 'product.category' }, 'SUPPLEMENT'] },
    condition: { '==': [{ 'var': 'lab.hasSyntheticStimulants' }, true] },
    failure: {
      status: ComplianceStatus.NON_COMPLIANT,
      reasonCode: 'SYNTHETIC_STIMULANTS_DETECTED',
      message: 'Synthetic stimulants detected. These are not permitted in dietary supplements.',
    },
    metadata: {
      jurisdiction: Jurisdiction.US_FEDERAL,
      source: 'FDA DSHEA - New Dietary Ingredient rules',
      appliesAt: 'BATCH_LEVEL',
    },
    createdAt: now,
    createdBy: 'system',
  },

  // ============================================
  // SERVING SIZE & POTENCY
  // ============================================
  {
    ruleId: 'SUPPLEMENT_SERVING_SIZE_MATCH',
    version: 1,
    category: ProductCategory.SUPPLEMENT,
    severity: RuleSeverity.BLOCKER,
    status: RuleStatus.ACTIVE,
    description: 'Actual serving size must match labeled serving size',
    when: {
      'and': [
        { '==': [{ 'var': 'product.category' }, 'SUPPLEMENT'] },
        { '!=': [{ 'var': 'lab.actualServingSize' }, null] },
        { '!=': [{ 'var': 'product.declaredServingSize' }, null] },
      ],
    },
    condition: {
      '>': [
        {
          'abs': {
            '-': [
              { '/': [{ 'var': 'lab.actualServingSize' }, { 'var': 'product.declaredServingSize' }] },
              1,
            ],
          },
        },
        0.2, // 20% variance allowed
      ],
    },
    failure: {
      status: ComplianceStatus.NON_COMPLIANT,
      reasonCode: 'SERVING_SIZE_MISMATCH',
      message: 'Actual serving size differs from declared serving size by more than 20%',
    },
    metadata: {
      jurisdiction: Jurisdiction.US_FEDERAL,
      source: 'FDA Supplement Labeling Requirements',
      appliesAt: 'BATCH_LEVEL',
    },
    createdAt: now,
    createdBy: 'system',
  },
  {
    ruleId: 'SUPPLEMENT_ACTIVE_INGREDIENT_POTENCY',
    version: 1,
    category: ProductCategory.SUPPLEMENT,
    severity: RuleSeverity.BLOCKER,
    status: RuleStatus.ACTIVE,
    description: 'Active ingredient potency must be within ±20% of declared',
    when: {
      'and': [
        { '==': [{ 'var': 'product.category' }, 'SUPPLEMENT'] },
        { '!=': [{ 'var': 'lab.activeIngredientPotency' }, null] },
        { '!=': [{ 'var': 'product.declaredPotency' }, null] },
      ],
    },
    condition: {
      '>': [
        {
          'abs': {
            '-': [
              { '/': [{ 'var': 'lab.activeIngredientPotency' }, { 'var': 'product.declaredPotency' }] },
              1,
            ],
          },
        },
        0.2, // 20% variance
      ],
    },
    failure: {
      status: ComplianceStatus.NON_COMPLIANT,
      reasonCode: 'POTENCY_VARIANCE_EXCEEDS_LIMIT',
      message: 'Active ingredient potency differs from declared value by more than ±20%',
    },
    metadata: {
      jurisdiction: Jurisdiction.US_FEDERAL,
      source: 'FDA Supplement Potency Requirements',
      appliesAt: 'BATCH_LEVEL',
    },
    createdAt: now,
    createdBy: 'system',
  },

  // ============================================
  // CONTAMINANTS & SAFETY
  // ============================================
  {
    ruleId: 'SUPPLEMENT_CONTAMINANTS_DETECTED',
    version: 1,
    category: ProductCategory.SUPPLEMENT,
    severity: RuleSeverity.BLOCKER,
    status: RuleStatus.ACTIVE,
    description: 'No contaminants should be detected in lab report',
    when: {
      'and': [
        { '==': [{ 'var': 'product.category' }, 'SUPPLEMENT'] },
        { '!!': { 'var': 'lab.contaminantsDetected' } },
      ],
    },
    condition: {
      '>': [{ 'var': 'lab.contaminantsDetected.length' }, 0],
    },
    failure: {
      status: ComplianceStatus.NON_COMPLIANT,
      reasonCode: 'CONTAMINANTS_DETECTED',
      message: 'Contaminants were detected in lab testing. Product fails safety requirements.',
    },
    metadata: {
      jurisdiction: Jurisdiction.US_FEDERAL,
      source: 'FDA Safety Requirements',
      appliesAt: 'BATCH_LEVEL',
    },
    createdAt: now,
    createdBy: 'system',
  },
  {
    ruleId: 'SUPPLEMENT_HEAVY_METALS',
    version: 1,
    category: ProductCategory.SUPPLEMENT,
    severity: RuleSeverity.BLOCKER,
    status: RuleStatus.ACTIVE,
    description: 'Heavy metals must not exceed safe limits',
    when: { '==': [{ 'var': 'product.category' }, 'SUPPLEMENT'] },
    condition: { '==': [{ 'var': 'lab.heavyMetalsExceedLimit' }, true] },
    failure: {
      status: ComplianceStatus.NON_COMPLIANT,
      reasonCode: 'HEAVY_METALS_DETECTED',
      message: 'Heavy metals detected above safe limits (lead, mercury, arsenic, cadmium)',
    },
    metadata: {
      jurisdiction: Jurisdiction.US_FEDERAL,
      source: 'FDA Heavy Metal Limits / California Prop 65',
      appliesAt: 'BATCH_LEVEL',
    },
    createdAt: now,
    createdBy: 'system',
  },

  // ============================================
  // LABELING REQUIREMENTS
  // ============================================
  {
    ruleId: 'SUPPLEMENT_FDA_DISCLAIMER_REQUIRED',
    version: 1,
    category: ProductCategory.SUPPLEMENT,
    severity: RuleSeverity.BLOCKER,
    status: RuleStatus.ACTIVE,
    description: 'Supplements must include FDA disclaimer',
    when: { '==': [{ 'var': 'product.category' }, 'SUPPLEMENT'] },
    condition: { '!=': [{ 'var': 'product.hasFdaDisclaimer' }, true] },
    failure: {
      status: ComplianceStatus.NON_COMPLIANT,
      reasonCode: 'MISSING_FDA_DISCLAIMER',
      message: 'Product must include the FDA disclaimer: "These statements have not been evaluated by the FDA"',
    },
    metadata: {
      jurisdiction: Jurisdiction.US_FEDERAL,
      source: 'FDA DSHEA Labeling Requirements',
      appliesAt: 'BATCH_LEVEL',
    },
    createdAt: now,
    createdBy: 'system',
  },
  {
    ruleId: 'SUPPLEMENT_NO_MEDICAL_CLAIMS',
    version: 1,
    category: ProductCategory.SUPPLEMENT,
    severity: RuleSeverity.BLOCKER,
    status: RuleStatus.ACTIVE,
    description: 'Supplements cannot make drug claims (treat, cure, prevent disease)',
    when: { '==': [{ 'var': 'product.category' }, 'SUPPLEMENT'] },
    condition: { '==': [{ 'var': 'product.hasMedicalClaims' }, true] },
    failure: {
      status: ComplianceStatus.NON_COMPLIANT,
      reasonCode: 'ILLEGAL_MEDICAL_CLAIMS',
      message: 'Product makes illegal drug claims. Supplements cannot claim to treat, cure, or prevent any disease.',
    },
    metadata: {
      jurisdiction: Jurisdiction.US_FEDERAL,
      source: 'FDA DSHEA / FD&C Act',
      appliesAt: 'BATCH_LEVEL',
    },
    createdAt: now,
    createdBy: 'system',
  },

  // ============================================
  // CERTIFICATIONS (WARNINGS/RECOMMENDATIONS)
  // ============================================
  {
    ruleId: 'SUPPLEMENT_THIRD_PARTY_CERTIFIED',
    version: 1,
    category: ProductCategory.SUPPLEMENT,
    severity: RuleSeverity.WARNING,
    status: RuleStatus.ACTIVE,
    description: 'Third-party certification (NSF, USP) is recommended',
    when: { '==': [{ 'var': 'product.category' }, 'SUPPLEMENT'] },
    condition: { '!=': [{ 'var': 'product.hasThirdPartyCertification' }, true] },
    failure: {
      status: ComplianceStatus.REQUIRES_REVIEW,
      reasonCode: 'NO_THIRD_PARTY_CERTIFICATION',
      message: 'Product does not have third-party certification (NSF, USP, Informed Sport). Consider obtaining certification for consumer trust.',
    },
    metadata: {
      jurisdiction: Jurisdiction.US_FEDERAL,
      source: 'Industry Best Practices',
      appliesAt: 'BATCH_LEVEL',
    },
    createdAt: now,
    createdBy: 'system',
  },

  // ============================================
  // BATCH & EXPIRY
  // ============================================
  {
    ruleId: 'SUPPLEMENT_COA_BATCH_MATCH',
    version: 1,
    category: ProductCategory.SUPPLEMENT,
    severity: RuleSeverity.BLOCKER,
    status: RuleStatus.ACTIVE,
    description: 'Lab report batch ID must match the product batch',
    when: {
      'and': [
        { '==': [{ 'var': 'product.category' }, 'SUPPLEMENT'] },
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
      source: 'FDA Traceability Requirements',
      appliesAt: 'BATCH_LEVEL',
    },
    createdAt: now,
    createdBy: 'system',
  },
  {
    ruleId: 'SUPPLEMENT_EXPIRY_DATE_REQUIRED',
    version: 1,
    category: ProductCategory.SUPPLEMENT,
    severity: RuleSeverity.BLOCKER,
    status: RuleStatus.ACTIVE,
    description: 'Supplements must have an expiration date',
    when: { '==': [{ 'var': 'product.category' }, 'SUPPLEMENT'] },
    condition: { '!': { 'var': 'batch.expiresAt' } },
    failure: {
      status: ComplianceStatus.REQUIRES_REVIEW,
      reasonCode: 'MISSING_EXPIRY_DATE',
      message: 'Batch expiration date is required for dietary supplements',
    },
    metadata: {
      jurisdiction: Jurisdiction.US_FEDERAL,
      source: 'FDA Supplement Labeling Requirements',
      appliesAt: 'BATCH_LEVEL',
    },
    createdAt: now,
    createdBy: 'system',
  },
];

export default SUPPLEMENT_RULES;
