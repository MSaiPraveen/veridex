import { Types } from 'mongoose';
import {
  ComplianceWorkflowRepo,
  WorkflowQueryOptions,
  PaginatedWorkflows,
  QueueStats,
  ReviewerWorkload,
} from '../repositories/workflow.repo';
import {
  IComplianceWorkflowBase,
  LeanComplianceWorkflow,
  WorkflowState,
  WorkflowEntityType,
  IAutoCheckResult,
  IAdminDecision,
} from '../domain/compliance-workflow.entity';
import {
  ComplianceWorkflowMachine,
  ComplianceEvent,
  DECISION_REASON_CODES,
} from '../engine/workflow-state-machine';
import { NotFoundError, ValidationError, ConflictError, ForbiddenError } from '../errors/service.errors';
import { evaluateRules, ExtractedData } from '../engine/rule-engine';
import { RuleRepo } from '../repositories/rule.repo';

// ===================
// Types
// ===================

export interface CreateWorkflowInput {
  entityType: WorkflowEntityType;
  entityId: string;
  entityName: string;
  organizationId: string;
  documentType?: string;
  extractedData?: ExtractedData;
  dueDate?: Date;
  metadata?: Record<string, unknown>;
  tags?: string[];
}

export interface AdminDecisionInput {
  adminId: string;
  adminEmail: string;
  adminRole: string;
  action: 'APPROVE' | 'REJECT' | 'OVERRIDE' | 'REQUEST_INFO' | 'ESCALATE';
  reasonCode: string;
  reasonDetails: string;
  notes?: string;
  conditions?: string[];
  ipAddress?: string;
  userAgent?: string;
}

export interface AssignmentInput {
  workflowId: string;
  assignedTo: string;
  assignedBy: string;
}

// ===================
// Service Functions
// ===================

/**
 * Create a new compliance workflow
 */
export async function createWorkflow(input: CreateWorkflowInput): Promise<LeanComplianceWorkflow> {
  // Check for existing active workflow
  const existing = await ComplianceWorkflowRepo.findActiveByEntity(input.entityType, input.entityId);
  if (existing) {
    throw new ConflictError(`Active workflow already exists for ${input.entityType} ${input.entityId}`);
  }

  const workflow = await ComplianceWorkflowRepo.create({
    entityType: input.entityType,
    entityId: new Types.ObjectId(input.entityId) as unknown as Types.ObjectId,
    entityName: input.entityName,
    organizationId: new Types.ObjectId(input.organizationId) as unknown as Types.ObjectId,
    state: 'PENDING',
    submittedAt: new Date(),
    dueDate: input.dueDate || getDefaultDueDate(),
    slaStatus: 'ON_TRACK',
    autoCheckCount: 0,
    pendingInfoRequests: 0,
    isEscalated: false,
    decisions: [],
    stateHistory: [],
    infoRequests: [],
    metadata: input.metadata || {},
    tags: input.tags || [],
  });

  // If extracted data provided, run auto-check immediately
  if (input.extractedData && input.documentType) {
    return runAutoCheck(workflow._id.toString(), input.documentType, input.extractedData);
  }

  return workflow;
}

/**
 * Get workflow by ID
 */
export async function getWorkflowById(id: string): Promise<LeanComplianceWorkflow> {
  const workflow = await ComplianceWorkflowRepo.findById(id);
  if (!workflow) {
    throw new NotFoundError('ComplianceWorkflow', id);
  }
  return workflow;
}

/**
 * Get workflow for entity
 */
export async function getWorkflowByEntity(
  entityType: WorkflowEntityType,
  entityId: string
): Promise<LeanComplianceWorkflow | null> {
  return ComplianceWorkflowRepo.findByEntity(entityType, entityId);
}

/**
 * List workflows with filters
 */
export async function listWorkflows(options: WorkflowQueryOptions): Promise<PaginatedWorkflows> {
  return ComplianceWorkflowRepo.findAll(options);
}

/**
 * Get review queue
 */
export async function getReviewQueue(options: {
  assignedTo?: string;
  priority?: ('LOW' | 'MEDIUM' | 'HIGH' | 'URGENT')[];
  limit?: number;
}): Promise<LeanComplianceWorkflow[]> {
  return ComplianceWorkflowRepo.getReviewQueue(options);
}

/**
 * Run automated compliance check
 */
export async function runAutoCheck(
  workflowId: string,
  documentType: string,
  extractedData: ExtractedData
): Promise<LeanComplianceWorkflow> {
  const workflow = await getWorkflowById(workflowId);

  // Can only run auto-check on pending workflows
  if (!['PENDING', 'AUTO_CHECK'].includes(workflow.state)) {
    throw new ValidationError(`Cannot run auto-check on workflow in state: ${workflow.state}`);
  }

  // Get active rules
  const rules = await RuleRepo.findActiveRules(documentType, workflow.organizationId?.toString());

  if (rules.length === 0) {
    // No rules - auto approve
    const result: IAutoCheckResult = {
      passed: true,
      score: 100,
      evaluatedAt: new Date(),
      ruleVersion: 0,
      ruleResults: [],
      failedCritical: 0,
      failedMajor: 0,
      failedMinor: 0,
      summary: 'No compliance rules defined for this document type.',
    };

    return ComplianceWorkflowRepo.updateAutoCheckResult(workflowId, result, 'AUTO_APPROVED') as Promise<LeanComplianceWorkflow>;
  }

  // Evaluate rules
  const evaluation = evaluateRules(rules, extractedData);

  // Build auto-check result
  const result: IAutoCheckResult = {
    passed: evaluation.status === 'COMPLIANT',
    score: evaluation.overallScore,
    evaluatedAt: new Date(),
    ruleVersion: rules[0]?.version ?? 1,
    ruleResults: evaluation.evaluations.map((e) => ({
      ruleId: e.ruleId,
      ruleCode: e.ruleCode,
      ruleName: e.ruleName,
      passed: e.passed,
      severity: e.severity,
      message: e.message || '',
      details: e.details,
    })),
    failedCritical: evaluation.evaluations.filter((e) => !e.passed && e.severity === 'CRITICAL').length,
    failedMajor: evaluation.evaluations.filter((e) => !e.passed && e.severity === 'MAJOR').length,
    failedMinor: evaluation.evaluations.filter((e) => !e.passed && e.severity === 'MINOR').length,
    summary: evaluation.summary,
  };

  // Determine new state
  const newState: WorkflowState = result.passed ? 'AUTO_APPROVED' : 'AUTO_FAILED';

  const updated = await ComplianceWorkflowRepo.updateAutoCheckResult(workflowId, result, newState);
  if (!updated) {
    throw new NotFoundError('ComplianceWorkflow', workflowId);
  }

  return updated;
}

/**
 * Submit admin decision
 */
export async function submitDecision(
  workflowId: string,
  input: AdminDecisionInput
): Promise<LeanComplianceWorkflow> {
  const workflow = await getWorkflowById(workflowId);

  // Validate current state allows this action
  const event = mapActionToEvent(input.action);
  if (!ComplianceWorkflowMachine.isValidTransition(workflow.state, event)) {
    throw new ValidationError(`Cannot ${input.action} workflow in state: ${workflow.state}`);
  }

  // Validate reason code
  const validCodes = DECISION_REASON_CODES[input.action];
  if (!validCodes.some((c) => c.code === input.reasonCode)) {
    throw new ValidationError(`Invalid reason code: ${input.reasonCode} for action: ${input.action}`);
  }

  // Check justification for override/reject
  if (ComplianceWorkflowMachine.requiresJustification(event) && !input.reasonDetails) {
    throw new ValidationError(`${input.action} requires detailed justification`);
  }

  // Check workflow is assigned to this admin (unless SUPER_ADMIN)
  if (
    workflow.assignedTo &&
    workflow.assignedTo.toString() !== input.adminId &&
    input.adminRole !== 'SUPER_ADMIN'
  ) {
    throw new ForbiddenError('Workflow is assigned to another reviewer');
  }

  // Check lock
  if (workflow.lockedBy && workflow.lockedBy.toString() !== input.adminId) {
    const lockExpiry = workflow.lockExpiry ? new Date(workflow.lockExpiry) : null;
    if (lockExpiry && lockExpiry > new Date()) {
      throw new ConflictError('Workflow is locked by another reviewer');
    }
  }

  // Get target state
  const newState = ComplianceWorkflowMachine.getTargetState(workflow.state, event)!;

  // Build decision record
  const decision: IAdminDecision = {
    adminId: new Types.ObjectId(input.adminId) as unknown as Types.ObjectId,
    adminEmail: input.adminEmail,
    adminRole: input.adminRole,
    action: input.action,
    reasonCode: input.reasonCode,
    reasonDetails: input.reasonDetails,
    notes: input.notes,
    conditions: input.conditions,
    previousState: workflow.state,
    newState,
    timestamp: new Date(),
    ipAddress: input.ipAddress,
    userAgent: input.userAgent,
  };

  const updated = await ComplianceWorkflowRepo.recordDecision(workflowId, decision, newState);
  if (!updated) {
    throw new NotFoundError('ComplianceWorkflow', workflowId);
  }

  return updated;
}

/**
 * Assign workflow to reviewer
 */
export async function assignWorkflow(input: AssignmentInput): Promise<LeanComplianceWorkflow> {
  const workflow = await getWorkflowById(input.workflowId);

  // Can only assign non-terminal workflows
  if (ComplianceWorkflowMachine.isTerminalState(workflow.state)) {
    throw new ValidationError('Cannot assign a completed workflow');
  }

  const updated = await ComplianceWorkflowRepo.assign(
    input.workflowId,
    input.assignedTo,
    input.assignedBy
  );
  if (!updated) {
    throw new NotFoundError('ComplianceWorkflow', input.workflowId);
  }

  return updated;
}

/**
 * Unassign workflow from reviewer
 */
export async function unassignWorkflow(workflowId: string): Promise<LeanComplianceWorkflow> {
  const updated = await ComplianceWorkflowRepo.unassign(workflowId);
  if (!updated) {
    throw new NotFoundError('ComplianceWorkflow', workflowId);
  }
  return updated;
}

/**
 * Lock workflow for exclusive review
 */
export async function lockWorkflow(
  workflowId: string,
  adminId: string
): Promise<LeanComplianceWorkflow> {
  const workflow = await getWorkflowById(workflowId);

  // Can only lock non-terminal workflows
  if (ComplianceWorkflowMachine.isTerminalState(workflow.state)) {
    throw new ValidationError('Cannot lock a completed workflow');
  }

  const updated = await ComplianceWorkflowRepo.lock(workflowId, adminId);
  if (!updated) {
    throw new ConflictError('Workflow is already locked by another reviewer');
  }

  return updated;
}

/**
 * Unlock workflow
 */
export async function unlockWorkflow(
  workflowId: string,
  adminId: string
): Promise<LeanComplianceWorkflow> {
  const workflow = await getWorkflowById(workflowId);

  // Only the locker or SUPER_ADMIN can unlock
  if (workflow.lockedBy && workflow.lockedBy.toString() !== adminId) {
    throw new ForbiddenError('Only the reviewer who locked can unlock');
  }

  const updated = await ComplianceWorkflowRepo.unlock(workflowId);
  if (!updated) {
    throw new NotFoundError('ComplianceWorkflow', workflowId);
  }

  return updated;
}

/**
 * Escalate workflow for senior review
 */
export async function escalateWorkflow(
  workflowId: string,
  escalatedBy: string,
  reason: string
): Promise<LeanComplianceWorkflow> {
  const workflow = await getWorkflowById(workflowId);

  if (!['AUTO_FAILED', 'NEEDS_REVIEW', 'IN_REVIEW'].includes(workflow.state)) {
    throw new ValidationError(`Cannot escalate workflow in state: ${workflow.state}`);
  }

  const updated = await ComplianceWorkflowRepo.escalate(workflowId, escalatedBy, reason);
  if (!updated) {
    throw new NotFoundError('ComplianceWorkflow', workflowId);
  }

  return updated;
}

/**
 * Start reviewing a workflow (transitions to IN_REVIEW)
 */
export async function startReview(
  workflowId: string,
  adminId: string
): Promise<LeanComplianceWorkflow> {
  const workflow = await getWorkflowById(workflowId);

  if (!['AUTO_FAILED', 'NEEDS_REVIEW'].includes(workflow.state)) {
    throw new ValidationError(`Cannot start review on workflow in state: ${workflow.state}`);
  }

  // Lock the workflow
  const locked = await ComplianceWorkflowRepo.lock(workflowId, adminId);
  if (!locked) {
    throw new ConflictError('Workflow is already being reviewed');
  }

  // Transition to IN_REVIEW
  const updated = await ComplianceWorkflowRepo.updateState(workflowId, 'IN_REVIEW', {
    fromState: workflow.state,
    toState: 'IN_REVIEW',
    event: 'START_REVIEW',
    triggeredBy: 'ADMIN',
    triggeredById: new Types.ObjectId(adminId) as unknown as Types.ObjectId,
    timestamp: new Date(),
  });

  if (!updated) {
    throw new NotFoundError('ComplianceWorkflow', workflowId);
  }

  return updated;
}

/**
 * Get queue statistics
 */
export async function getQueueStats(organizationId?: string): Promise<QueueStats> {
  return ComplianceWorkflowRepo.getQueueStats(organizationId);
}

/**
 * Get reviewer workload
 */
export async function getReviewerWorkload(adminIds: string[]): Promise<ReviewerWorkload[]> {
  return ComplianceWorkflowRepo.getReviewerWorkload(adminIds);
}

/**
 * Update SLA statuses (run periodically)
 */
export async function updateSLAStatuses(): Promise<number> {
  return ComplianceWorkflowRepo.updateSLAStatuses();
}

/**
 * Get workflow history
 */
export async function getWorkflowHistory(workflowId: string): Promise<{
  stateHistory: unknown[];
  decisions: unknown[];
}> {
  const workflow = await getWorkflowById(workflowId);
  return {
    stateHistory: workflow.stateHistory,
    decisions: workflow.decisions,
  };
}

// ===================
// Helper Functions
// ===================

function mapActionToEvent(action: AdminDecisionInput['action']): ComplianceEvent {
  const map: Record<AdminDecisionInput['action'], ComplianceEvent> = {
    APPROVE: 'APPROVE',
    REJECT: 'REJECT',
    OVERRIDE: 'OVERRIDE',
    REQUEST_INFO: 'REQUEST_INFO',
    ESCALATE: 'ESCALATE',
  };
  return map[action];
}

function getDefaultDueDate(): Date {
  // Default SLA: 72 hours
  return new Date(Date.now() + 72 * 60 * 60 * 1000);
}
