/**
 * Cannabis (THC) Compliance Rules
 * 
 * Required Documents:
 * - Lab Report (COA)
 * - State License
 * - Insurance
 * 
 * Hard Rules:
 * - THC > 0.3% → must be Cannabis, not Hemp
 * - Lab report issued within last 12 months
 * - Lab report matches batch ID
 * - Lab report matches product SKU
 * - State license matches sale state
 * - State license not expired
 * - Insurance coverage active
 * - Insurance covers cannabis explicitly
 */

import { ComplianceRule } from '../types/rule-schema';
import { ProductCategory, ComplianceStatus, RuleSeverity, RuleStatus, Jurisdiction } from '../types/categories';

const now = new Date().toISOString();

export const CANNABIS_RULES: ComplianceRule[] = [
  // ============================================
  // DOCUMENT REQUIREMENTS
  // ============================================
  {
    ruleId: 'CANNABIS_COA_REQUIRED',
    version: 1,
    category: ProductCategory.CANNABIS,
    severity: RuleSeverity.BLOCKER,
    status: RuleStatus.ACTIVE,
    description: 'Cannabis products require a Certificate of Analysis (COA)',
    when: { '==': [{ 'var': 'product.category' }, 'CANNABIS'] },
    condition: { '!': { 'var': 'documents.hasCOA' } },
    failure: {
      status: ComplianceStatus.REQUIRES_REVIEW,
      reasonCode: 'MISSING_COA',
      message: 'Certificate of Analysis (COA) is required for cannabis products',
    },
    metadata: {
      jurisdiction: Jurisdiction.US_STATE,
      source: 'State Cannabis Regulations',
      appliesAt: 'BATCH_LEVEL',
    },
    createdAt: now,
    createdBy: 'system',
  },
  {
    ruleId: 'CANNABIS_STATE_LICENSE_REQUIRED',
    version: 1,
    category: ProductCategory.CANNABIS,
    severity: RuleSeverity.BLOCKER,
    status: RuleStatus.ACTIVE,
    description: 'Cannabis products require a valid state license',
    when: { '==': [{ 'var': 'product.category' }, 'CANNABIS'] },
    condition: { '!': { 'var': 'documents.hasStateLicense' } },
    failure: {
      status: ComplianceStatus.REQUIRES_REVIEW,
      reasonCode: 'MISSING_STATE_LICENSE',
      message: 'Valid state cannabis license is required',
    },
    metadata: {
      jurisdiction: Jurisdiction.US_STATE,
      source: 'State Cannabis Regulations',
      appliesAt: 'BATCH_LEVEL',
    },
    createdAt: now,
    createdBy: 'system',
  },
  {
    ruleId: 'CANNABIS_INSURANCE_REQUIRED',
    version: 1,
    category: ProductCategory.CANNABIS,
    severity: RuleSeverity.BLOCKER,
    status: RuleStatus.ACTIVE,
    description: 'Cannabis products require valid insurance coverage',
    when: { '==': [{ 'var': 'product.category' }, 'CANNABIS'] },
    condition: { '!': { 'var': 'documents.hasInsurance' } },
    failure: {
      status: ComplianceStatus.REQUIRES_REVIEW,
      reasonCode: 'MISSING_INSURANCE',
      message: 'Valid insurance coverage is required for cannabis products',
    },
    metadata: {
      jurisdiction: Jurisdiction.US_STATE,
      source: 'State Cannabis Regulations',
      appliesAt: 'BATCH_LEVEL',
    },
    createdAt: now,
    createdBy: 'system',
  },

  // ============================================
  // THC CONTENT RULES
  // ============================================
  {
    ruleId: 'CANNABIS_THC_MINIMUM',
    version: 1,
    category: ProductCategory.CANNABIS,
    severity: RuleSeverity.BLOCKER,
    status: RuleStatus.ACTIVE,
    description: 'Cannabis products must have THC > 0.3% (otherwise classify as Hemp)',
    when: { '==': [{ 'var': 'product.category' }, 'CANNABIS'] },
    condition: {
      'or': [
        { '==': [{ 'var': 'lab.thcPercent' }, null] },
        { '<=': [{ 'var': 'lab.thcPercent' }, 0.3] },
      ],
    },
    failure: {
      status: ComplianceStatus.NON_COMPLIANT,
      reasonCode: 'THC_BELOW_CANNABIS_THRESHOLD',
      message: 'THC content is 0.3% or below. This product should be classified as Hemp, not Cannabis.',
    },
    metadata: {
      jurisdiction: Jurisdiction.US_FEDERAL,
      source: '2018 Farm Bill - Cannabis/Hemp distinction',
      appliesAt: 'BATCH_LEVEL',
      notes: 'Products with THC <= 0.3% are legally hemp, not cannabis',
    },
    createdAt: now,
    createdBy: 'system',
  },
  {
    ruleId: 'CANNABIS_THC_MISSING',
    version: 1,
    category: ProductCategory.CANNABIS,
    severity: RuleSeverity.BLOCKER,
    status: RuleStatus.ACTIVE,
    description: 'THC percentage must be present on lab report',
    when: { '==': [{ 'var': 'product.category' }, 'CANNABIS'] },
    condition: { '==': [{ 'var': 'lab.thcPercent' }, null] },
    failure: {
      status: ComplianceStatus.REQUIRES_REVIEW,
      reasonCode: 'THC_PERCENTAGE_MISSING',
      message: 'THC percentage is missing from lab report. Cannot evaluate compliance.',
    },
    metadata: {
      jurisdiction: Jurisdiction.US_STATE,
      source: 'State Cannabis Testing Requirements',
      appliesAt: 'BATCH_LEVEL',
    },
    createdAt: now,
    createdBy: 'system',
  },

  // ============================================
  // LAB REPORT VALIDITY
  // ============================================
  {
    ruleId: 'CANNABIS_COA_AGE_12_MONTHS',
    version: 1,
    category: ProductCategory.CANNABIS,
    severity: RuleSeverity.BLOCKER,
    status: RuleStatus.ACTIVE,
    description: 'Lab report must be issued within the last 12 months',
    when: {
      'and': [
        { '==': [{ 'var': 'product.category' }, 'CANNABIS'] },
        { '!!': { 'var': 'documents.coaIssuedAt' } },
      ],
    },
    condition: {
      '>': [
        { '-': [{ 'var': 'evaluatedAt' }, { 'var': 'documents.coaIssuedAt' }] },
        31536000000, // 365 days in milliseconds
      ],
    },
    failure: {
      status: ComplianceStatus.EXPIRED,
      reasonCode: 'COA_EXPIRED',
      message: 'Lab report (COA) is older than 12 months and must be renewed',
    },
    metadata: {
      jurisdiction: Jurisdiction.US_STATE,
      source: 'State Cannabis Testing Requirements',
      appliesAt: 'BATCH_LEVEL',
    },
    createdAt: now,
    createdBy: 'system',
  },
  {
    ruleId: 'CANNABIS_COA_BATCH_MATCH',
    version: 1,
    category: ProductCategory.CANNABIS,
    severity: RuleSeverity.BLOCKER,
    status: RuleStatus.ACTIVE,
    description: 'Lab report batch ID must match the product batch',
    when: {
      'and': [
        { '==': [{ 'var': 'product.category' }, 'CANNABIS'] },
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
      jurisdiction: Jurisdiction.US_STATE,
      source: 'State Cannabis Traceability Requirements',
      appliesAt: 'BATCH_LEVEL',
    },
    createdAt: now,
    createdBy: 'system',
  },
  {
    ruleId: 'CANNABIS_COA_SKU_MATCH',
    version: 1,
    category: ProductCategory.CANNABIS,
    severity: RuleSeverity.BLOCKER,
    status: RuleStatus.ACTIVE,
    description: 'Lab report product SKU must match',
    when: {
      'and': [
        { '==': [{ 'var': 'product.category' }, 'CANNABIS'] },
        { '!!': { 'var': 'lab.skuOnReport' } },
        { '!!': { 'var': 'product.sku' } },
      ],
    },
    condition: {
      '!=': [{ 'var': 'lab.skuOnReport' }, { 'var': 'product.sku' }],
    },
    failure: {
      status: ComplianceStatus.NON_COMPLIANT,
      reasonCode: 'SKU_MISMATCH',
      message: 'Lab report product SKU does not match the product',
    },
    metadata: {
      jurisdiction: Jurisdiction.US_STATE,
      source: 'State Cannabis Traceability Requirements',
      appliesAt: 'BATCH_LEVEL',
    },
    createdAt: now,
    createdBy: 'system',
  },

  // ============================================
  // LICENSE VALIDITY
  // ============================================
  {
    ruleId: 'CANNABIS_LICENSE_STATE_MATCH',
    version: 1,
    category: ProductCategory.CANNABIS,
    severity: RuleSeverity.BLOCKER,
    status: RuleStatus.ACTIVE,
    description: 'State license must match the sale state',
    when: {
      'and': [
        { '==': [{ 'var': 'product.category' }, 'CANNABIS'] },
        { '!!': { 'var': 'documents.licenseState' } },
        { '!!': { 'var': 'saleState' } },
      ],
    },
    condition: {
      '!=': [{ 'var': 'documents.licenseState' }, { 'var': 'saleState' }],
    },
    failure: {
      status: ComplianceStatus.NON_COMPLIANT,
      reasonCode: 'LICENSE_STATE_MISMATCH',
      message: 'Cannabis license state does not match the sale state. Interstate cannabis sales are prohibited.',
    },
    metadata: {
      jurisdiction: Jurisdiction.US_FEDERAL,
      source: 'Controlled Substances Act / State Cannabis Laws',
      appliesAt: 'BATCH_LEVEL',
      notes: 'Cannabis cannot be sold across state lines',
    },
    createdAt: now,
    createdBy: 'system',
  },
  {
    ruleId: 'CANNABIS_LICENSE_EXPIRED',
    version: 1,
    category: ProductCategory.CANNABIS,
    severity: RuleSeverity.BLOCKER,
    status: RuleStatus.ACTIVE,
    description: 'State license must not be expired',
    when: { '==': [{ 'var': 'product.category' }, 'CANNABIS'] },
    condition: { '==': [{ 'var': 'license.isExpired' }, true] },
    failure: {
      status: ComplianceStatus.EXPIRED,
      reasonCode: 'LICENSE_EXPIRED',
      message: 'State cannabis license has expired. License renewal required.',
    },
    metadata: {
      jurisdiction: Jurisdiction.US_STATE,
      source: 'State Cannabis Regulations',
      appliesAt: 'BATCH_LEVEL',
    },
    createdAt: now,
    createdBy: 'system',
  },

  // ============================================
  // INSURANCE VALIDITY
  // ============================================
  {
    ruleId: 'CANNABIS_INSURANCE_ACTIVE',
    version: 1,
    category: ProductCategory.CANNABIS,
    severity: RuleSeverity.BLOCKER,
    status: RuleStatus.ACTIVE,
    description: 'Insurance coverage must be active',
    when: { '==': [{ 'var': 'product.category' }, 'CANNABIS'] },
    condition: { '!=': [{ 'var': 'insurance.isActive' }, true] },
    failure: {
      status: ComplianceStatus.NON_COMPLIANT,
      reasonCode: 'INSURANCE_INACTIVE',
      message: 'Insurance coverage is not active',
    },
    metadata: {
      jurisdiction: Jurisdiction.US_STATE,
      source: 'State Cannabis Regulations',
      appliesAt: 'BATCH_LEVEL',
    },
    createdAt: now,
    createdBy: 'system',
  },
  {
    ruleId: 'CANNABIS_INSURANCE_COVERS_CANNABIS',
    version: 1,
    category: ProductCategory.CANNABIS,
    severity: RuleSeverity.BLOCKER,
    status: RuleStatus.ACTIVE,
    description: 'Insurance must explicitly cover cannabis operations',
    when: {
      'and': [
        { '==': [{ 'var': 'product.category' }, 'CANNABIS'] },
        { '==': [{ 'var': 'insurance.isActive' }, true] },
      ],
    },
    condition: { '!=': [{ 'var': 'insurance.coversCannabis' }, true] },
    failure: {
      status: ComplianceStatus.NON_COMPLIANT,
      reasonCode: 'INSURANCE_NO_CANNABIS_COVERAGE',
      message: 'Insurance policy does not explicitly cover cannabis operations',
    },
    metadata: {
      jurisdiction: Jurisdiction.US_STATE,
      source: 'State Cannabis Regulations',
      appliesAt: 'BATCH_LEVEL',
    },
    createdAt: now,
    createdBy: 'system',
  },

  // ============================================
  // TESTING REQUIREMENTS (WARNINGS)
  // ============================================
  {
    ruleId: 'CANNABIS_PESTICIDE_PANEL',
    version: 1,
    category: ProductCategory.CANNABIS,
    severity: RuleSeverity.WARNING,
    status: RuleStatus.ACTIVE,
    description: 'Lab report should include pesticide testing panel',
    when: { '==': [{ 'var': 'product.category' }, 'CANNABIS'] },
    condition: { '!=': [{ 'var': 'lab.hasPesticidePanel' }, true] },
    failure: {
      status: ComplianceStatus.REQUIRES_REVIEW,
      reasonCode: 'MISSING_PESTICIDE_PANEL',
      message: 'Lab report does not include pesticide testing. Some jurisdictions require this.',
    },
    metadata: {
      jurisdiction: Jurisdiction.US_STATE,
      source: 'State Cannabis Testing Requirements (varies by state)',
      appliesAt: 'BATCH_LEVEL',
    },
    createdAt: now,
    createdBy: 'system',
  },
  {
    ruleId: 'CANNABIS_MICROBIAL_PANEL',
    version: 1,
    category: ProductCategory.CANNABIS,
    severity: RuleSeverity.WARNING,
    status: RuleStatus.ACTIVE,
    description: 'Lab report should include microbial testing panel',
    when: { '==': [{ 'var': 'product.category' }, 'CANNABIS'] },
    condition: { '!=': [{ 'var': 'lab.hasMicrobialPanel' }, true] },
    failure: {
      status: ComplianceStatus.REQUIRES_REVIEW,
      reasonCode: 'MISSING_MICROBIAL_PANEL',
      message: 'Lab report does not include microbial testing. Some jurisdictions require this.',
    },
    metadata: {
      jurisdiction: Jurisdiction.US_STATE,
      source: 'State Cannabis Testing Requirements (varies by state)',
      appliesAt: 'BATCH_LEVEL',
    },
    createdAt: now,
    createdBy: 'system',
  },

  // ============================================
  // CONTAMINANTS
  // ============================================
  {
    ruleId: 'CANNABIS_CONTAMINANTS_DETECTED',
    version: 1,
    category: ProductCategory.CANNABIS,
    severity: RuleSeverity.BLOCKER,
    status: RuleStatus.ACTIVE,
    description: 'No contaminants should be detected in lab report',
    when: {
      'and': [
        { '==': [{ 'var': 'product.category' }, 'CANNABIS'] },
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
      jurisdiction: Jurisdiction.US_STATE,
      source: 'State Cannabis Safety Regulations',
      appliesAt: 'BATCH_LEVEL',
    },
    createdAt: now,
    createdBy: 'system',
  },
  {
    ruleId: 'CANNABIS_RESIDUAL_SOLVENTS',
    version: 1,
    category: ProductCategory.CANNABIS,
    severity: RuleSeverity.BLOCKER,
    status: RuleStatus.ACTIVE,
    description: 'No residual solvents above safe limits',
    when: { '==': [{ 'var': 'product.category' }, 'CANNABIS'] },
    condition: { '==': [{ 'var': 'lab.residualSolvents' }, true] },
    failure: {
      status: ComplianceStatus.NON_COMPLIANT,
      reasonCode: 'RESIDUAL_SOLVENTS_DETECTED',
      message: 'Residual solvents detected above safe limits. Product fails safety requirements.',
    },
    metadata: {
      jurisdiction: Jurisdiction.US_STATE,
      source: 'State Cannabis Safety Regulations',
      appliesAt: 'BATCH_LEVEL',
    },
    createdAt: now,
    createdBy: 'system',
  },
];

export default CANNABIS_RULES;
