import { Schema, model, Document, Types, FlattenMaps } from 'mongoose';

// Condition types for different rule types
export interface IRuleConditions {
  validUntilRequired?: boolean;
  issuedToRequired?: boolean;
  minExpiryDays?: number;
  requiredFields?: string[];
  forbiddenSubstances?: string[];
  maxContaminantLevels?: Record<string, number>;
  certificationBodyRequired?: boolean;
  labAccreditationRequired?: boolean;
}

// Jurisdiction types for regulatory compliance
export type Jurisdiction = 
  | 'FEDERAL'
  | 'CALIFORNIA'
  | 'COLORADO'
  | 'OREGON'
  | 'WASHINGTON'
  | 'NEVADA'
  | 'NEW_YORK'
  | 'FLORIDA'
  | 'ILLINOIS'
  | 'MICHIGAN'
  | 'MASSACHUSETTS'
  | 'ARIZONA'
  | 'OTHER';

// Base interface without Document methods
export interface IComplianceRuleBase {
  name: string;
  code: string;
  version: number;
  documentType: string;
  description?: string;
  severity: 'CRITICAL' | 'MAJOR' | 'MINOR' | 'INFO';
  category: string;
  jurisdiction?: Jurisdiction;
  jurisdictions?: Jurisdiction[]; // For rules that apply to multiple jurisdictions
  conditions: IRuleConditions;
  errorMessage: string;
  active: boolean;
  effectiveFrom: Date;
  effectiveUntil?: Date;
  organizationId?: Types.ObjectId;
  createdBy?: Types.ObjectId;
  createdAt?: Date;
  updatedAt?: Date;
}

// Full document interface
export interface IComplianceRule extends Document, IComplianceRuleBase {
  _id: Types.ObjectId;
}

// Lean document type for queries with .lean()
export type LeanComplianceRule = FlattenMaps<IComplianceRuleBase> & { _id: Types.ObjectId };

const ComplianceRuleSchema = new Schema<IComplianceRule>(
  {
    name: { type: String, required: true, trim: true },
    code: { type: String, required: true, unique: true, uppercase: true },
    version: { type: Number, required: true, default: 1 },
    documentType: { type: String, required: true, index: true },
    description: { type: String },
    severity: { 
      type: String, 
      enum: ['CRITICAL', 'MAJOR', 'MINOR', 'INFO'],
      required: true,
      default: 'MAJOR'
    },
    category: { type: String, required: true, index: true },
    jurisdiction: { 
      type: String, 
      enum: ['FEDERAL', 'CALIFORNIA', 'COLORADO', 'OREGON', 'WASHINGTON', 'NEVADA', 'NEW_YORK', 'FLORIDA', 'ILLINOIS', 'MICHIGAN', 'MASSACHUSETTS', 'ARIZONA', 'OTHER'],
      index: true,
    },
    jurisdictions: [{
      type: String,
      enum: ['FEDERAL', 'CALIFORNIA', 'COLORADO', 'OREGON', 'WASHINGTON', 'NEVADA', 'NEW_YORK', 'FLORIDA', 'ILLINOIS', 'MICHIGAN', 'MASSACHUSETTS', 'ARIZONA', 'OTHER'],
    }],
    conditions: {
      validUntilRequired: { type: Boolean, default: false },
      issuedToRequired: { type: Boolean, default: false },
      minExpiryDays: { type: Number },
      requiredFields: [{ type: String }],
      forbiddenSubstances: [{ type: String }],
      maxContaminantLevels: { type: Map, of: Number },
      certificationBodyRequired: { type: Boolean, default: false },
      labAccreditationRequired: { type: Boolean, default: false },
    },
    errorMessage: { type: String, required: true },
    active: { type: Boolean, default: true, index: true },
    effectiveFrom: { type: Date, required: true, default: Date.now },
    effectiveUntil: { type: Date },
    organizationId: { type: Schema.Types.ObjectId, ref: 'Organization', index: true },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

ComplianceRuleSchema.index({ name: 1, version: -1 });
ComplianceRuleSchema.index({ code: 1 }, { unique: true });
ComplianceRuleSchema.index({ documentType: 1, active: 1 });
ComplianceRuleSchema.index({ category: 1, severity: 1 });
ComplianceRuleSchema.index({ jurisdiction: 1, active: 1 });
ComplianceRuleSchema.index({ jurisdictions: 1, active: 1 });

export const ComplianceRuleModel = model<IComplianceRule>(
  'ComplianceRule',
  ComplianceRuleSchema
);
