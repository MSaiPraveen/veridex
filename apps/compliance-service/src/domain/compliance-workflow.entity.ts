import { Schema, model, Document, Types, FlattenMaps } from 'mongoose';

/**
 * Compliance Workflow Entity
 * Tracks the complete lifecycle of compliance items through the review process
 */

// Workflow states
export type WorkflowState =
  | 'PENDING'
  | 'AUTO_CHECK'
  | 'AUTO_APPROVED'
  | 'AUTO_FAILED'
  | 'NEEDS_REVIEW'
  | 'IN_REVIEW'
  | 'APPROVED'
  | 'REJECTED'
  | 'OVERRIDE_APPROVED';

// Entity types that can go through compliance workflow
export type WorkflowEntityType = 'DOCUMENT' | 'PRODUCT' | 'BATCH' | 'ORGANIZATION';

// Priority levels
export type WorkflowPriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';

// SLA status
export type SLAStatus = 'ON_TRACK' | 'AT_RISK' | 'BREACHED';

/**
 * Auto-check result from rule engine
 */
export interface IAutoCheckResult {
  passed: boolean;
  score: number;
  evaluatedAt: Date;
  ruleVersion: number;
  ruleResults: Array<{
    ruleId: Types.ObjectId;
    ruleCode: string;
    ruleName: string;
    passed: boolean;
    severity: 'CRITICAL' | 'MAJOR' | 'MINOR' | 'INFO';
    message: string;
    details?: Record<string, unknown>;
  }>;
  failedCritical: number;
  failedMajor: number;
  failedMinor: number;
  summary: string;
}

/**
 * Admin decision record
 */
export interface IAdminDecision {
  adminId: Types.ObjectId;
  adminEmail: string;
  adminRole: string;
  action: 'APPROVE' | 'REJECT' | 'OVERRIDE' | 'REQUEST_INFO' | 'ESCALATE' | 'ASSIGN' | 'UNASSIGN';
  reasonCode: string;
  reasonDetails: string;
  notes?: string;
  conditions?: string[];
  previousState: WorkflowState;
  newState: WorkflowState;
  timestamp: Date;
  ipAddress?: string;
  userAgent?: string;
}

/**
 * State transition record
 */
export interface IStateTransition {
  fromState: WorkflowState;
  toState: WorkflowState;
  event: string;
  triggeredBy: 'SYSTEM' | 'ADMIN';
  triggeredById?: Types.ObjectId;
  timestamp: Date;
  metadata?: Record<string, unknown>;
}

/**
 * Information request
 */
export interface IInfoRequest {
  requestedBy: Types.ObjectId;
  requestedAt: Date;
  requestType: string;
  description: string;
  resolved: boolean;
  resolvedAt?: Date;
  response?: string;
}

/**
 * Base interface for compliance workflow
 */
export interface IComplianceWorkflowBase {
  // Identity
  entityType: WorkflowEntityType;
  entityId: Types.ObjectId;
  entityName: string;
  organizationId: Types.ObjectId;
  complianceResultId?: Types.ObjectId;
  
  // State
  state: WorkflowState;
  previousState?: WorkflowState;
  stateHistory: IStateTransition[];
  
  // Auto-check
  autoCheckResult?: IAutoCheckResult;
  lastAutoCheckAt?: Date;
  autoCheckCount: number;
  
  // Assignment
  assignedTo?: Types.ObjectId;
  assignedAt?: Date;
  assignedBy?: Types.ObjectId;
  
  // Decisions
  decisions: IAdminDecision[];
  finalDecision?: {
    action: 'APPROVED' | 'REJECTED' | 'OVERRIDE_APPROVED';
    reasonCode: string;
    reasonDetails: string;
    decidedBy: Types.ObjectId;
    decidedAt: Date;
  };
  
  // Info requests
  infoRequests: IInfoRequest[];
  pendingInfoRequests: number;
  
  // Priority & SLA
  priority: WorkflowPriority;
  priorityReason?: string;
  dueDate?: Date;
  slaStatus: SLAStatus;
  
  // Timing
  submittedAt: Date;
  startedReviewAt?: Date;
  completedAt?: Date;
  
  // Escalation
  isEscalated: boolean;
  escalatedAt?: Date;
  escalatedBy?: Types.ObjectId;
  escalationReason?: string;
  
  // Lock (for concurrent review prevention)
  lockedBy?: Types.ObjectId;
  lockedAt?: Date;
  lockExpiry?: Date;
  
  // Metadata
  metadata: Record<string, unknown>;
  tags: string[];
  
  // Timestamps
  createdAt?: Date;
  updatedAt?: Date;
}

/**
 * Full document interface
 */
export interface IComplianceWorkflow extends Document, IComplianceWorkflowBase {
  _id: Types.ObjectId;
}

/**
 * Lean document type
 */
export type LeanComplianceWorkflow = FlattenMaps<IComplianceWorkflowBase> & { _id: Types.ObjectId };

// =====================
// Sub-schemas
// =====================

const RuleResultSchema = new Schema(
  {
    ruleId: { type: Schema.Types.ObjectId, ref: 'ComplianceRule', required: true },
    ruleCode: { type: String, required: true },
    ruleName: { type: String, required: true },
    passed: { type: Boolean, required: true },
    severity: {
      type: String,
      enum: ['CRITICAL', 'MAJOR', 'MINOR', 'INFO'],
      required: true,
    },
    message: { type: String, required: true },
    details: { type: Map, of: Schema.Types.Mixed },
  },
  { _id: false }
);

const AutoCheckResultSchema = new Schema<IAutoCheckResult>(
  {
    passed: { type: Boolean, required: true },
    score: { type: Number, required: true, min: 0, max: 100 },
    evaluatedAt: { type: Date, required: true },
    ruleVersion: { type: Number, required: true },
    ruleResults: [RuleResultSchema],
    failedCritical: { type: Number, required: true, default: 0 },
    failedMajor: { type: Number, required: true, default: 0 },
    failedMinor: { type: Number, required: true, default: 0 },
    summary: { type: String, required: true },
  },
  { _id: false }
);

const AdminDecisionSchema = new Schema<IAdminDecision>(
  {
    adminId: { type: Schema.Types.ObjectId, required: true },
    adminEmail: { type: String, required: true },
    adminRole: { type: String, required: true },
    action: {
      type: String,
      enum: ['APPROVE', 'REJECT', 'OVERRIDE', 'REQUEST_INFO', 'ESCALATE', 'ASSIGN', 'UNASSIGN'],
      required: true,
    },
    reasonCode: { type: String, required: true },
    reasonDetails: { type: String, required: true },
    notes: { type: String },
    conditions: [{ type: String }],
    previousState: { type: String, required: true },
    newState: { type: String, required: true },
    timestamp: { type: Date, required: true, default: Date.now },
    ipAddress: { type: String },
    userAgent: { type: String },
  },
  { _id: false }
);

const StateTransitionSchema = new Schema<IStateTransition>(
  {
    fromState: { type: String, required: true },
    toState: { type: String, required: true },
    event: { type: String, required: true },
    triggeredBy: { type: String, enum: ['SYSTEM', 'ADMIN'], required: true },
    triggeredById: { type: Schema.Types.ObjectId },
    timestamp: { type: Date, required: true, default: Date.now },
    metadata: { type: Map, of: Schema.Types.Mixed },
  },
  { _id: false }
);

const InfoRequestSchema = new Schema<IInfoRequest>(
  {
    requestedBy: { type: Schema.Types.ObjectId, required: true },
    requestedAt: { type: Date, required: true, default: Date.now },
    requestType: { type: String, required: true },
    description: { type: String, required: true },
    resolved: { type: Boolean, required: true, default: false },
    resolvedAt: { type: Date },
    response: { type: String },
  },
  { _id: false }
);

// =====================
// Main Schema
// =====================

const ComplianceWorkflowSchema = new Schema<IComplianceWorkflow>(
  {
    // Identity
    entityType: {
      type: String,
      enum: ['DOCUMENT', 'PRODUCT', 'BATCH', 'ORGANIZATION'],
      required: true,
      index: true,
    },
    entityId: { type: Schema.Types.ObjectId, required: true, index: true },
    entityName: { type: String, required: true },
    organizationId: { type: Schema.Types.ObjectId, required: true, index: true },
    complianceResultId: { type: Schema.Types.ObjectId, ref: 'ComplianceResult' },

    // State
    state: {
      type: String,
      enum: [
        'PENDING',
        'AUTO_CHECK',
        'AUTO_APPROVED',
        'AUTO_FAILED',
        'NEEDS_REVIEW',
        'IN_REVIEW',
        'APPROVED',
        'REJECTED',
        'OVERRIDE_APPROVED',
      ],
      required: true,
      default: 'PENDING',
      index: true,
    },
    previousState: { type: String },
    stateHistory: [StateTransitionSchema],

    // Auto-check
    autoCheckResult: AutoCheckResultSchema,
    lastAutoCheckAt: { type: Date },
    autoCheckCount: { type: Number, required: true, default: 0 },

    // Assignment
    assignedTo: { type: Schema.Types.ObjectId, index: true },
    assignedAt: { type: Date },
    assignedBy: { type: Schema.Types.ObjectId },

    // Decisions
    decisions: [AdminDecisionSchema],
    finalDecision: {
      action: { type: String, enum: ['APPROVED', 'REJECTED', 'OVERRIDE_APPROVED'] },
      reasonCode: { type: String },
      reasonDetails: { type: String },
      decidedBy: { type: Schema.Types.ObjectId },
      decidedAt: { type: Date },
    },

    // Info requests
    infoRequests: [InfoRequestSchema],
    pendingInfoRequests: { type: Number, required: true, default: 0 },

    // Priority & SLA
    priority: {
      type: String,
      enum: ['LOW', 'MEDIUM', 'HIGH', 'URGENT'],
      required: true,
      default: 'MEDIUM',
      index: true,
    },
    priorityReason: { type: String },
    dueDate: { type: Date, index: true },
    slaStatus: {
      type: String,
      enum: ['ON_TRACK', 'AT_RISK', 'BREACHED'],
      required: true,
      default: 'ON_TRACK',
      index: true,
    },

    // Timing
    submittedAt: { type: Date, required: true, default: Date.now },
    startedReviewAt: { type: Date },
    completedAt: { type: Date },

    // Escalation
    isEscalated: { type: Boolean, required: true, default: false, index: true },
    escalatedAt: { type: Date },
    escalatedBy: { type: Schema.Types.ObjectId },
    escalationReason: { type: String },

    // Lock
    lockedBy: { type: Schema.Types.ObjectId },
    lockedAt: { type: Date },
    lockExpiry: { type: Date },

    // Metadata
    metadata: { type: Map, of: Schema.Types.Mixed },
    tags: [{ type: String }],
  },
  {
    timestamps: true,
    collection: 'compliance_workflows',
  }
);

// =====================
// Indexes
// =====================

// Compound indexes for common queries
ComplianceWorkflowSchema.index({ state: 1, priority: -1, submittedAt: 1 });
ComplianceWorkflowSchema.index({ organizationId: 1, state: 1 });
ComplianceWorkflowSchema.index({ assignedTo: 1, state: 1 });
ComplianceWorkflowSchema.index({ entityType: 1, entityId: 1 });
ComplianceWorkflowSchema.index({ dueDate: 1, slaStatus: 1 });
ComplianceWorkflowSchema.index({ isEscalated: 1, state: 1 });
ComplianceWorkflowSchema.index({ 'autoCheckResult.failedCritical': -1 });

// Text index for search
ComplianceWorkflowSchema.index({ entityName: 'text', tags: 'text' });

// =====================
// Virtual fields
// =====================

ComplianceWorkflowSchema.virtual('isTerminal').get(function () {
  const terminalStates: WorkflowState[] = ['AUTO_APPROVED', 'APPROVED', 'REJECTED', 'OVERRIDE_APPROVED'];
  return terminalStates.includes(this.state);
});

ComplianceWorkflowSchema.virtual('isLocked').get(function () {
  if (!this.lockedBy || !this.lockExpiry) return false;
  return this.lockExpiry > new Date();
});

ComplianceWorkflowSchema.virtual('timeInCurrentState').get(function () {
  const lastTransition = this.stateHistory[this.stateHistory.length - 1];
  if (!lastTransition) return Date.now() - this.submittedAt.getTime();
  return Date.now() - lastTransition.timestamp.getTime();
});

// =====================
// Export
// =====================

export const ComplianceWorkflowModel = model<IComplianceWorkflow>(
  'ComplianceWorkflow',
  ComplianceWorkflowSchema
);
