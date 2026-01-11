/**
 * Hemp/CBD Compliance Rules
 * 
 * Required Documents:
 * - Lab Report (COA)
 * - Certificate of Origin
 * 
 * Hard Rules:
 * - THC <= 0.3% (federal legal limit for hemp)
 * - CBD content within ±10% of declared
 * - Lab report issued within last 6 months
 * - Must include pesticide panel
 * - Must include heavy metal panel
 */

import { ComplianceRule } from '../types/rule-schema';
import { ProductCategory, ComplianceStatus, RuleSeverity, RuleStatus, Jurisdiction } from '../types/categories';

const now = new Date().toISOString();

export const HEMP_CBD_RULES: ComplianceRule[] = [
  // ============================================
  // DOCUMENT REQUIREMENTS
  // ============================================
  {
    ruleId: 'HEMP_COA_REQUIRED',
    version: 1,
    category: ProductCategory.HEMP_CBD,
    severity: RuleSeverity.BLOCKER,
    status: RuleStatus.ACTIVE,
    description: 'Hemp/CBD products require a Certificate of Analysis (COA)',
    when: { '==': [{ 'var': 'product.category' }, 'HEMP_CBD'] },
    condition: { '!': { 'var': 'documents.hasCOA' } },
    failure: {
      status: ComplianceStatus.REQUIRES_REVIEW,
      reasonCode: 'MISSING_COA',
      message: 'Certificate of Analysis (COA) is required for Hemp/CBD products',
    },
    metadata: {
      jurisdiction: Jurisdiction.US_FEDERAL,
      source: '2018 Farm Bill',
      appliesAt: 'BATCH_LEVEL',
    },
    createdAt: now,
    createdBy: 'system',
  },
  {
    ruleId: 'HEMP_ORIGIN_CERTIFICATE_REQUIRED',
    version: 1,
    category: ProductCategory.HEMP_CBD,
    severity: RuleSeverity.BLOCKER,
    status: RuleStatus.ACTIVE,
    description: 'Hemp/CBD products require a Certificate of Origin',
    when: { '==': [{ 'var': 'product.category' }, 'HEMP_CBD'] },
    condition: { '!': { 'var': 'documents.hasCertificateOfOrigin' } },
    failure: {
      status: ComplianceStatus.REQUIRES_REVIEW,
      reasonCode: 'MISSING_CERTIFICATE_OF_ORIGIN',
      message: 'Certificate of Origin is required to verify hemp source',
    },
    metadata: {
      jurisdiction: Jurisdiction.US_FEDERAL,
      source: '2018 Farm Bill',
      appliesAt: 'BATCH_LEVEL',
    },
    createdAt: now,
    createdBy: 'system',
  },

  // ============================================
  // THC CONTENT RULES (CRITICAL)
  // ============================================
  {
    ruleId: 'HEMP_THC_MAXIMUM',
    version: 1,
    category: ProductCategory.HEMP_CBD,
    severity: RuleSeverity.BLOCKER,
    status: RuleStatus.ACTIVE,
    description: 'Hemp products must have THC <= 0.3% (federal limit)',
    when: { '==': [{ 'var': 'product.category' }, 'HEMP_CBD'] },
    condition: {
      '>': [{ 'var': 'lab.thcPercent' }, 0.3],
    },
    failure: {
      status: ComplianceStatus.NON_COMPLIANT,
      reasonCode: 'THC_EXCEEDS_HEMP_LIMIT',
      message: 'THC content exceeds 0.3% legal limit for hemp. This product is legally cannabis and requires state cannabis license.',
    },
    metadata: {
      jurisdiction: Jurisdiction.US_FEDERAL,
      source: '2018 Farm Bill - Hemp Definition',
      appliesAt: 'BATCH_LEVEL',
      notes: 'Products with THC > 0.3% are legally cannabis, not hemp',
    },
    createdAt: now,
    createdBy: 'system',
  },
  {
    ruleId: 'HEMP_THC_MISSING',
    version: 1,
    category: ProductCategory.HEMP_CBD,
    severity: RuleSeverity.BLOCKER,
    status: RuleStatus.ACTIVE,
    description: 'THC percentage must be present on lab report',
    when: { '==': [{ 'var': 'product.category' }, 'HEMP_CBD'] },
    condition: { '==': [{ 'var': 'lab.thcPercent' }, null] },
    failure: {
      status: ComplianceStatus.REQUIRES_REVIEW,
      reasonCode: 'THC_PERCENTAGE_MISSING',
      message: 'THC percentage is missing from lab report. Cannot verify federal hemp compliance.',
    },
    metadata: {
      jurisdiction: Jurisdiction.US_FEDERAL,
      source: '2018 Farm Bill',
      appliesAt: 'BATCH_LEVEL',
    },
    createdAt: now,
    createdBy: 'system',
  },

  // ============================================
  // CBD CONTENT RULES
  // ============================================
  {
    ruleId: 'HEMP_CBD_CONTENT_MISSING',
    version: 1,
    category: ProductCategory.HEMP_CBD,
    severity: RuleSeverity.BLOCKER,
    status: RuleStatus.ACTIVE,
    description: 'CBD percentage must be present on lab report',
    when: { '==': [{ 'var': 'product.category' }, 'HEMP_CBD'] },
    condition: { '==': [{ 'var': 'lab.cbdPercent' }, null] },
    failure: {
      status: ComplianceStatus.REQUIRES_REVIEW,
      reasonCode: 'CBD_PERCENTAGE_MISSING',
      message: 'CBD percentage is missing from lab report',
    },
    metadata: {
      jurisdiction: Jurisdiction.US_FEDERAL,
      source: 'FDA CBD Labeling Guidelines',
      appliesAt: 'BATCH_LEVEL',
    },
    createdAt: now,
    createdBy: 'system',
  },
  {
    ruleId: 'HEMP_CBD_DECLARED_MISSING',
    version: 1,
    category: ProductCategory.HEMP_CBD,
    severity: RuleSeverity.BLOCKER,
    status: RuleStatus.ACTIVE,
    description: 'Declared CBD percentage must be specified on product',
    when: { '==': [{ 'var': 'product.category' }, 'HEMP_CBD'] },
    condition: { '==': [{ 'var': 'product.declaredCbdPercent' }, null] },
    failure: {
      status: ComplianceStatus.REQUIRES_REVIEW,
      reasonCode: 'DECLARED_CBD_MISSING',
      message: 'Product must declare its CBD content for verification',
    },
    metadata: {
      jurisdiction: Jurisdiction.US_FEDERAL,
      source: 'FDA CBD Labeling Guidelines',
      appliesAt: 'BATCH_LEVEL',
    },
    createdAt: now,
    createdBy: 'system',
  },
  {
    ruleId: 'HEMP_CBD_VARIANCE_TOO_HIGH',
    version: 1,
    category: ProductCategory.HEMP_CBD,
    severity: RuleSeverity.BLOCKER,
    status: RuleStatus.ACTIVE,
    description: 'Lab CBD must be within ±10% of declared CBD content',
    when: {
      'and': [
        { '==': [{ 'var': 'product.category' }, 'HEMP_CBD'] },
        { '!=': [{ 'var': 'lab.cbdPercent' }, null] },
        { '!=': [{ 'var': 'product.declaredCbdPercent' }, null] },
      ],
    },
    condition: {
      '>': [
        {
          'abs': {
            '-': [
              { '/': [{ 'var': 'lab.cbdPercent' }, { 'var': 'product.declaredCbdPercent' }] },
              1,
            ],
          },
        },
        0.1, // 10% variance
      ],
    },
    failure: {
      status: ComplianceStatus.NON_COMPLIANT,
      reasonCode: 'CBD_VARIANCE_EXCEEDS_LIMIT',
      message: 'Lab CBD content differs from declared CBD by more than ±10%',
    },
    metadata: {
      jurisdiction: Jurisdiction.US_FEDERAL,
      source: 'FDA CBD Labeling Accuracy Requirements',
      appliesAt: 'BATCH_LEVEL',
    },
    createdAt: now,
    createdBy: 'system',
  },

  // ============================================
  // LAB REPORT VALIDITY
  // ============================================
  {
    ruleId: 'HEMP_COA_AGE_6_MONTHS',
    version: 1,
    category: ProductCategory.HEMP_CBD,
    severity: RuleSeverity.BLOCKER,
    status: RuleStatus.ACTIVE,
    description: 'Lab report must be issued within the last 6 months',
    when: {
      'and': [
        { '==': [{ 'var': 'product.category' }, 'HEMP_CBD'] },
        { '!!': { 'var': 'documents.coaIssuedAt' } },
      ],
    },
    condition: {
      '>': [
        { '-': [{ 'var': 'evaluatedAt' }, { 'var': 'documents.coaIssuedAt' }] },
        15778800000, // 6 months in milliseconds (182.5 days)
      ],
    },
    failure: {
      status: ComplianceStatus.EXPIRED,
      reasonCode: 'COA_EXPIRED',
      message: 'Lab report (COA) is older than 6 months and must be renewed',
    },
    metadata: {
      jurisdiction: Jurisdiction.US_FEDERAL,
      source: 'Hemp Testing Requirements',
      appliesAt: 'BATCH_LEVEL',
    },
    createdAt: now,
    createdBy: 'system',
  },
  {
    ruleId: 'HEMP_COA_BATCH_MATCH',
    version: 1,
    category: ProductCategory.HEMP_CBD,
    severity: RuleSeverity.BLOCKER,
    status: RuleStatus.ACTIVE,
    description: 'Lab report batch ID must match the product batch',
    when: {
      'and': [
        { '==': [{ 'var': 'product.category' }, 'HEMP_CBD'] },
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
      source: 'Hemp Traceability Requirements',
      appliesAt: 'BATCH_LEVEL',
    },
    createdAt: now,
    createdBy: 'system',
  },

  // ============================================
  // REQUIRED TESTING PANELS
  // ============================================
  {
    ruleId: 'HEMP_PESTICIDE_PANEL_REQUIRED',
    version: 1,
    category: ProductCategory.HEMP_CBD,
    severity: RuleSeverity.BLOCKER,
    status: RuleStatus.ACTIVE,
    description: 'Lab report must include pesticide testing panel',
    when: { '==': [{ 'var': 'product.category' }, 'HEMP_CBD'] },
    condition: { '!=': [{ 'var': 'lab.hasPesticidePanel' }, true] },
    failure: {
      status: ComplianceStatus.REQUIRES_REVIEW,
      reasonCode: 'MISSING_PESTICIDE_PANEL',
      message: 'Lab report must include pesticide testing for hemp products',
    },
    metadata: {
      jurisdiction: Jurisdiction.US_FEDERAL,
      source: '2018 Farm Bill Testing Requirements',
      appliesAt: 'BATCH_LEVEL',
    },
    createdAt: now,
    createdBy: 'system',
  },
  {
    ruleId: 'HEMP_HEAVY_METAL_PANEL_REQUIRED',
    version: 1,
    category: ProductCategory.HEMP_CBD,
    severity: RuleSeverity.BLOCKER,
    status: RuleStatus.ACTIVE,
    description: 'Lab report must include heavy metal testing panel',
    when: { '==': [{ 'var': 'product.category' }, 'HEMP_CBD'] },
    condition: { '!=': [{ 'var': 'lab.hasHeavyMetalPanel' }, true] },
    failure: {
      status: ComplianceStatus.REQUIRES_REVIEW,
      reasonCode: 'MISSING_HEAVY_METAL_PANEL',
      message: 'Lab report must include heavy metal testing for hemp products',
    },
    metadata: {
      jurisdiction: Jurisdiction.US_FEDERAL,
      source: '2018 Farm Bill Testing Requirements',
      appliesAt: 'BATCH_LEVEL',
      notes: 'Hemp bioaccumulates heavy metals, testing is critical',
    },
    createdAt: now,
    createdBy: 'system',
  },
  {
    ruleId: 'HEMP_MICROBIAL_PANEL_RECOMMENDED',
    version: 1,
    category: ProductCategory.HEMP_CBD,
    severity: RuleSeverity.WARNING,
    status: RuleStatus.ACTIVE,
    description: 'Lab report should include microbial testing panel',
    when: { '==': [{ 'var': 'product.category' }, 'HEMP_CBD'] },
    condition: { '!=': [{ 'var': 'lab.hasMicrobialPanel' }, true] },
    failure: {
      status: ComplianceStatus.REQUIRES_REVIEW,
      reasonCode: 'MISSING_MICROBIAL_PANEL',
      message: 'Lab report should include microbial testing for consumer safety',
    },
    metadata: {
      jurisdiction: Jurisdiction.US_FEDERAL,
      source: 'FDA Safety Guidelines',
      appliesAt: 'BATCH_LEVEL',
    },
    createdAt: now,
    createdBy: 'system',
  },

  // ============================================
  // CONTAMINANTS & SAFETY
  // ============================================
  {
    ruleId: 'HEMP_CONTAMINANTS_DETECTED',
    version: 1,
    category: ProductCategory.HEMP_CBD,
    severity: RuleSeverity.BLOCKER,
    status: RuleStatus.ACTIVE,
    description: 'No contaminants should be detected in lab report',
    when: {
      'and': [
        { '==': [{ 'var': 'product.category' }, 'HEMP_CBD'] },
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
    ruleId: 'HEMP_HEAVY_METALS_DETECTED',
    version: 1,
    category: ProductCategory.HEMP_CBD,
    severity: RuleSeverity.BLOCKER,
    status: RuleStatus.ACTIVE,
    description: 'Heavy metals must not exceed safe limits',
    when: { '==': [{ 'var': 'product.category' }, 'HEMP_CBD'] },
    condition: { '==': [{ 'var': 'lab.heavyMetalsExceedLimit' }, true] },
    failure: {
      status: ComplianceStatus.NON_COMPLIANT,
      reasonCode: 'HEAVY_METALS_DETECTED',
      message: 'Heavy metals detected above safe limits. Product fails safety requirements.',
    },
    metadata: {
      jurisdiction: Jurisdiction.US_FEDERAL,
      source: 'FDA Safety Requirements',
      appliesAt: 'BATCH_LEVEL',
      notes: 'Hemp bioaccumulates heavy metals from soil',
    },
    createdAt: now,
    createdBy: 'system',
  },

  // ============================================
  // LABELING REQUIREMENTS
  // ============================================
  {
    ruleId: 'HEMP_NO_MEDICAL_CLAIMS',
    version: 1,
    category: ProductCategory.HEMP_CBD,
    severity: RuleSeverity.BLOCKER,
    status: RuleStatus.ACTIVE,
    description: 'Hemp/CBD products cannot make medical claims',
    when: { '==': [{ 'var': 'product.category' }, 'HEMP_CBD'] },
    condition: { '==': [{ 'var': 'product.hasMedicalClaims' }, true] },
    failure: {
      status: ComplianceStatus.NON_COMPLIANT,
      reasonCode: 'ILLEGAL_MEDICAL_CLAIMS',
      message: 'Product makes medical claims which are not allowed for hemp/CBD products',
    },
    metadata: {
      jurisdiction: Jurisdiction.US_FEDERAL,
      source: 'FDA CBD Regulations',
      appliesAt: 'BATCH_LEVEL',
      notes: 'CBD products cannot claim to treat, cure, or prevent any disease',
    },
    createdAt: now,
    createdBy: 'system',
  },
  {
    ruleId: 'HEMP_FDA_DISCLAIMER_REQUIRED',
    version: 1,
    category: ProductCategory.HEMP_CBD,
    severity: RuleSeverity.WARNING,
    status: RuleStatus.ACTIVE,
    description: 'Hemp/CBD products should include FDA disclaimer',
    when: { '==': [{ 'var': 'product.category' }, 'HEMP_CBD'] },
    condition: { '!=': [{ 'var': 'product.hasFdaDisclaimer' }, true] },
    failure: {
      status: ComplianceStatus.REQUIRES_REVIEW,
      reasonCode: 'MISSING_FDA_DISCLAIMER',
      message: 'Product should include FDA disclaimer stating these statements have not been evaluated by the FDA',
    },
    metadata: {
      jurisdiction: Jurisdiction.US_FEDERAL,
      source: 'FDA Labeling Guidelines',
      appliesAt: 'BATCH_LEVEL',
    },
    createdAt: now,
    createdBy: 'system',
  },
];

export default HEMP_CBD_RULES;
