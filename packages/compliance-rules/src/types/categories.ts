/**
 * Product Categories for Veridex Compliance Platform
 * These are the regulated product categories supported by the system.
 * 
 * Phase 5 covers: CANNABIS, HEMP_CBD, SUPPLEMENT, PHARMA, PEPTIDE
 * Future extensions: ALCOHOL, TOBACCO
 */

export enum ProductCategory {
  /** Cannabis products with THC > 0.3% - heavily regulated */
  CANNABIS = 'CANNABIS',
  
  /** Hemp/CBD products with THC <= 0.3% - Farm Bill compliant */
  HEMP_CBD = 'HEMP_CBD',
  
  /** Supplements & Nutraceuticals - FDA regulated */
  SUPPLEMENT = 'SUPPLEMENT',
  
  /** Non-controlled Pharmaceuticals - requires GMP */
  PHARMA = 'PHARMA',
  
  /** Peptides & Research Chemicals - research use only */
  PEPTIDE = 'PEPTIDE',
  
  /** Alcohol (future extension) */
  // ALCOHOL = 'ALCOHOL',
  
  /** Tobacco/Nicotine (future extension) */
  // TOBACCO = 'TOBACCO',
}

/**
 * Compliance decision states
 * Every batch MUST resolve to exactly one of these.
 * No soft states. No ambiguity.
 */
export enum ComplianceStatus {
  /** All rules passed - batch is compliant */
  COMPLIANT = 'COMPLIANT',
  
  /** One or more BLOCKER rules failed */
  NON_COMPLIANT = 'NON_COMPLIANT',
  
  /** Awaiting required documents or evaluation */
  PENDING = 'PENDING',
  
  /** Required document(s) have expired */
  EXPIRED = 'EXPIRED',
  
  /** Missing critical data - needs human review */
  REQUIRES_REVIEW = 'REQUIRES_REVIEW',
}

/**
 * Rule severity levels
 */
export enum RuleSeverity {
  /** Failure = Non-compliant. Stops evaluation. */
  BLOCKER = 'BLOCKER',
  
  /** Informational warning. Does not affect compliance. */
  WARNING = 'WARNING',
}

/**
 * Rule status
 */
export enum RuleStatus {
  /** Rule is evaluated */
  ACTIVE = 'ACTIVE',
  
  /** Rule exists but is not evaluated */
  INACTIVE = 'INACTIVE',
  
  /** Rule is being tested */
  DRAFT = 'DRAFT',
}

/**
 * Batch status
 */
export enum BatchStatus {
  /** Initial state - documents being collected */
  DRAFT = 'DRAFT',
  
  /** All required documents attached - ready for evaluation */
  READY_FOR_EVALUATION = 'READY_FOR_EVALUATION',
  
  /** Currently being evaluated */
  EVALUATING = 'EVALUATING',
  
  /** Evaluation complete */
  EVALUATED = 'EVALUATED',
  
  /** Batch recalled - overrides all compliance */
  RECALLED = 'RECALLED',
  
  /** Batch expired */
  EXPIRED = 'EXPIRED',
}

/**
 * Document types required for compliance
 */
export enum DocumentType {
  // Lab Reports
  COA = 'COA',                           // Certificate of Analysis
  LAB_REPORT = 'LAB_REPORT',
  
  // Licenses
  STATE_LICENSE = 'STATE_LICENSE',
  BUSINESS_LICENSE = 'BUSINESS_LICENSE',
  MANUFACTURER_LICENSE = 'MANUFACTURER_LICENSE',
  
  // Certificates
  GMP_CERTIFICATE = 'GMP_CERTIFICATE',
  FDA_REGISTRATION = 'FDA_REGISTRATION',
  LAB_ACCREDITATION = 'LAB_ACCREDITATION',
  
  // Insurance
  INSURANCE = 'INSURANCE',
  
  // Declarations
  NOT_FOR_HUMAN_CONSUMPTION = 'NOT_FOR_HUMAN_CONSUMPTION',
  RESEARCH_DISCLAIMER = 'RESEARCH_DISCLAIMER',
  
  // Other
  MANIFEST = 'MANIFEST',
  INVOICE = 'INVOICE',
  OTHER = 'OTHER',
}

/**
 * Required documents by product category
 */
export const REQUIRED_DOCUMENTS: Record<ProductCategory, DocumentType[]> = {
  [ProductCategory.CANNABIS]: [
    DocumentType.COA,
    DocumentType.STATE_LICENSE,
    DocumentType.INSURANCE,
  ],
  [ProductCategory.HEMP_CBD]: [
    DocumentType.LAB_REPORT,
    DocumentType.BUSINESS_LICENSE,
    DocumentType.INSURANCE,
  ],
  [ProductCategory.SUPPLEMENT]: [
    DocumentType.COA,
    DocumentType.FDA_REGISTRATION,
    DocumentType.INSURANCE,
  ],
  [ProductCategory.PHARMA]: [
    DocumentType.GMP_CERTIFICATE,
    DocumentType.COA,
    DocumentType.MANUFACTURER_LICENSE,
    DocumentType.INSURANCE,
  ],
  [ProductCategory.PEPTIDE]: [
    DocumentType.COA,
    DocumentType.NOT_FOR_HUMAN_CONSUMPTION,
    DocumentType.LAB_ACCREDITATION,
  ],
};

/**
 * Jurisdiction types
 */
export enum Jurisdiction {
  US_FEDERAL = 'US_FEDERAL',
  US_STATE = 'US_STATE',
  US_LOCAL = 'US_LOCAL',
  EU = 'EU',
  UK = 'UK',
  CANADA = 'CANADA',
  INTERNATIONAL = 'INTERNATIONAL',
}

/**
 * Category-specific attributes
 */
export interface CannabisAttributes {
  thcPercent: number;
  cbdPercent?: number;
  strainType: 'INDICA' | 'SATIVA' | 'HYBRID';
  cultivationType: 'INDOOR' | 'OUTDOOR' | 'GREENHOUSE';
  harvestDate?: string;
  licenseNumber: string;
  licenseState: string;
}

export interface HempCbdAttributes {
  thcPercent: number;
  cbdPercent: number;
  cbdMgPerServing?: number;
  servingsPerContainer?: number;
  fullSpectrum: boolean;
  hasPesticidePanel: boolean;
  hasHeavyMetalPanel: boolean;
}

export interface SupplementAttributes {
  ingredients: string[];
  servingSize: string;
  servingsPerContainer: number;
  fdaFacilityNumber?: string;
  expirationDate: string;
  containsAllergens?: string[];
}

export interface PharmaAttributes {
  activeIngredient: string;
  dosage: string;
  dosageUnit: string;
  manufacturerName: string;
  manufacturerLicense: string;
  gmpCertificateNumber: string;
  batchTraceabilityId: string;
  recallStatus: boolean;
}

export interface PeptideAttributes {
  purityPercent: number;
  declaredPurityPercent: number;
  molecularWeight?: number;
  sequence?: string;
  hasResearchDisclaimer: boolean;
  hasMedicalClaims: boolean;
}

export type CategoryAttributes = 
  | CannabisAttributes 
  | HempCbdAttributes 
  | SupplementAttributes 
  | PharmaAttributes 
  | PeptideAttributes;
