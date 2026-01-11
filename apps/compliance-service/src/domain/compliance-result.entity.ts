import { Schema, model, Document, Types, FlattenMaps } from 'mongoose';
import * as crypto from 'crypto';

// Individual rule evaluation result
export interface IRuleEvaluation {
  ruleId: Types.ObjectId;
  ruleCode: string;
  ruleName: string;
  passed: boolean;
  severity: 'CRITICAL' | 'MAJOR' | 'MINOR' | 'INFO';
  message?: string;
  details?: Record<string, unknown>;
}

// Base interface without Document methods
export interface IComplianceResultBase {
  productId: Types.ObjectId;
  documentId?: Types.ObjectId;
  organizationId?: Types.ObjectId;
  status: 'COMPLIANT' | 'NON_COMPLIANT' | 'PENDING' | 'ERROR';
  overallScore?: number;
  ruleVersion: number;
  evaluations: IRuleEvaluation[];
  reasons: string[];
  summary?: string;
  evaluatedAt: Date;
  expiresAt?: Date;
  metadata?: Record<string, unknown>;
  // Immutability tracking
  immutable: boolean;
  immutableAt?: Date;
  // Hash for integrity verification
  resultHash?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

// Full document interface
export interface IComplianceResult extends Document, IComplianceResultBase {
  _id: Types.ObjectId;
}

// Lean document type for queries with .lean()
export type LeanComplianceResult = FlattenMaps<IComplianceResultBase> & { _id: Types.ObjectId };

const RuleEvaluationSchema = new Schema<IRuleEvaluation>(
  {
    ruleId: { type: Schema.Types.ObjectId, ref: 'ComplianceRule', required: true },
    ruleCode: { type: String, required: true },
    ruleName: { type: String, required: true },
    passed: { type: Boolean, required: true },
    severity: { 
      type: String, 
      enum: ['CRITICAL', 'MAJOR', 'MINOR', 'INFO'],
      required: true 
    },
    message: { type: String },
    details: { type: Map, of: Schema.Types.Mixed },
  },
  { _id: false }
);

const ComplianceResultSchema = new Schema<IComplianceResult>(
  {
    productId: { type: Schema.Types.ObjectId, ref: 'Product', required: true, index: true },
    documentId: { type: Schema.Types.ObjectId, ref: 'Document', index: true },
    organizationId: { type: Schema.Types.ObjectId, ref: 'Organization', index: true },
    status: {
      type: String,
      enum: ['COMPLIANT', 'NON_COMPLIANT', 'PENDING', 'ERROR'],
      required: true,
      index: true,
    },
    overallScore: { type: Number, min: 0, max: 100 },
    ruleVersion: { type: Number, required: true },
    evaluations: [RuleEvaluationSchema],
    reasons: [{ type: String }],
    summary: { type: String },
    evaluatedAt: { type: Date, required: true, default: Date.now },
    expiresAt: { type: Date, index: true },
    metadata: { type: Map, of: Schema.Types.Mixed },
    // Immutability fields
    immutable: { type: Boolean, default: true, index: true },
    immutableAt: { type: Date, default: Date.now },
    resultHash: { type: String, index: true },
  },
  { timestamps: true }
);

/**
 * Generate integrity hash for a compliance result
 * Used to verify the result hasn't been tampered with
 */
export function generateResultHash(result: Partial<IComplianceResultBase>): string {
  const dataToHash = JSON.stringify({
    productId: result.productId?.toString(),
    documentId: result.documentId?.toString(),
    status: result.status,
    overallScore: result.overallScore,
    ruleVersion: result.ruleVersion,
    evaluations: result.evaluations,
    evaluatedAt: result.evaluatedAt instanceof Date ? result.evaluatedAt.toISOString() : result.evaluatedAt,
  });
  return crypto.createHash('sha256').update(dataToHash).digest('hex');
}

/**
 * Verify the integrity of a compliance result
 */
export function verifyResultIntegrity(result: LeanComplianceResult): boolean {
  const computedHash = generateResultHash(result);
  return computedHash === result.resultHash;
}

ComplianceResultSchema.index({ productId: 1, createdAt: -1 });
ComplianceResultSchema.index({ status: 1, createdAt: -1 });
ComplianceResultSchema.index({ organizationId: 1, status: 1 });
ComplianceResultSchema.index({ evaluatedAt: -1 });

export const ComplianceResultModel = model<IComplianceResult>(
  'ComplianceResult',
  ComplianceResultSchema
);
