import {
  ComplianceWorkflowModel,
  IComplianceWorkflow,
  LeanComplianceWorkflow,
  IComplianceWorkflowBase,
  WorkflowState,
  WorkflowEntityType,
  WorkflowPriority,
  SLAStatus,
  IAutoCheckResult,
  IAdminDecision,
  IStateTransition,
} from '../domain/compliance-workflow.entity';
import mongoose, { Types, SortOrder } from 'mongoose';

// Use Record for query type to allow MongoDB operators
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type FilterQuery<T> = Record<string, any>;

/**
 * Query options for listing workflows
 */
export interface WorkflowQueryOptions {
  // Filtering
  state?: WorkflowState | WorkflowState[];
  entityType?: WorkflowEntityType;
  entityId?: string;
  organizationId?: string;
  assignedTo?: string;
  priority?: WorkflowPriority | WorkflowPriority[];
  slaStatus?: SLAStatus | SLAStatus[];
  isEscalated?: boolean;
  
  // Date ranges
  submittedAfter?: Date;
  submittedBefore?: Date;
  dueBefore?: Date;
  
  // Flags
  unassignedOnly?: boolean;
  needsReviewOnly?: boolean;
  hasCriticalFailures?: boolean;
  
  // Pagination
  page?: number;
  limit?: number;
  
  // Sorting
  sortBy?: 'submittedAt' | 'priority' | 'dueDate' | 'state' | 'updatedAt';
  sortOrder?: 'asc' | 'desc';
}

/**
 * Paginated response
 */
export interface PaginatedWorkflows {
  items: LeanComplianceWorkflow[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  hasMore: boolean;
}

/**
 * Queue statistics
 */
export interface QueueStats {
  totalPending: number;
  needsReview: number;
  inReview: number;
  autoApproved: number;
  manuallyApproved: number;
  rejected: number;
  overrideApproved: number;
  byPriority: Record<WorkflowPriority, number>;
  bySLAStatus: Record<SLAStatus, number>;
  avgResolutionTime: number; // in milliseconds
  escalated: number;
}

/**
 * Reviewer workload
 */
export interface ReviewerWorkload {
  adminId: string;
  assigned: number;
  completed24h: number;
  avgDecisionTime: number;
}

/**
 * Compliance Workflow Repository
 */
export const ComplianceWorkflowRepo = {
  /**
   * Create a new workflow
   */
  async create(data: Partial<IComplianceWorkflowBase>): Promise<LeanComplianceWorkflow> {
    const workflow = new ComplianceWorkflowModel({
      ...data,
      stateHistory: [
        {
          fromState: 'PENDING',
          toState: data.state || 'PENDING',
          event: 'CREATE',
          triggeredBy: 'SYSTEM',
          timestamp: new Date(),
        },
      ],
    });
    const saved = await workflow.save();
    return saved.toObject() as LeanComplianceWorkflow;
  },

  /**
   * Find by ID
   */
  async findById(id: string): Promise<LeanComplianceWorkflow | null> {
    return ComplianceWorkflowModel.findById(id).lean() as unknown as Promise<LeanComplianceWorkflow | null>;
  },

  /**
   * Find by entity
   */
  async findByEntity(
    entityType: WorkflowEntityType,
    entityId: string
  ): Promise<LeanComplianceWorkflow | null> {
    return ComplianceWorkflowModel.findOne({
      entityType,
      entityId: new Types.ObjectId(entityId),
    })
      .sort({ createdAt: -1 })
      .lean() as unknown as Promise<LeanComplianceWorkflow | null>;
  },

  /**
   * Find active workflow for entity
   */
  async findActiveByEntity(
    entityType: WorkflowEntityType,
    entityId: string
  ): Promise<LeanComplianceWorkflow | null> {
    const nonTerminalStates: WorkflowState[] = [
      'PENDING',
      'AUTO_CHECK',
      'AUTO_FAILED',
      'NEEDS_REVIEW',
      'IN_REVIEW',
    ];
    return ComplianceWorkflowModel.findOne({
      entityType,
      entityId: new Types.ObjectId(entityId),
      state: { $in: nonTerminalStates },
    })
      .sort({ createdAt: -1 })
      .lean() as unknown as Promise<LeanComplianceWorkflow | null>;
  },

  /**
   * List workflows with filtering and pagination
   */
  async findAll(options: WorkflowQueryOptions): Promise<PaginatedWorkflows> {
    const {
      page = 1,
      limit = 20,
      sortBy = 'submittedAt',
      sortOrder = 'desc',
      ...filters
    } = options;

    const query: FilterQuery<IComplianceWorkflow> = {};

    // Apply filters
    if (filters.state) {
      query.state = Array.isArray(filters.state) ? { $in: filters.state } : filters.state;
    }
    if (filters.entityType) {
      query.entityType = filters.entityType;
    }
    if (filters.entityId) {
      query.entityId = new Types.ObjectId(filters.entityId);
    }
    if (filters.organizationId) {
      query.organizationId = new Types.ObjectId(filters.organizationId);
    }
    if (filters.assignedTo) {
      query.assignedTo = new Types.ObjectId(filters.assignedTo);
    }
    if (filters.priority) {
      query.priority = Array.isArray(filters.priority) ? { $in: filters.priority } : filters.priority;
    }
    if (filters.slaStatus) {
      query.slaStatus = Array.isArray(filters.slaStatus) ? { $in: filters.slaStatus } : filters.slaStatus;
    }
    if (filters.isEscalated !== undefined) {
      query.isEscalated = filters.isEscalated;
    }
    if (filters.submittedAfter || filters.submittedBefore) {
      query.submittedAt = {};
      if (filters.submittedAfter) {
        query.submittedAt.$gte = filters.submittedAfter;
      }
      if (filters.submittedBefore) {
        query.submittedAt.$lte = filters.submittedBefore;
      }
    }
    if (filters.dueBefore) {
      query.dueDate = { $lte: filters.dueBefore };
    }
    if (filters.unassignedOnly) {
      query.assignedTo = { $exists: false };
    }
    if (filters.needsReviewOnly) {
      query.state = { $in: ['AUTO_FAILED', 'NEEDS_REVIEW'] };
    }
    if (filters.hasCriticalFailures) {
      query['autoCheckResult.failedCritical'] = { $gt: 0 };
    }

    const skip = (page - 1) * limit;
    const sort: Record<string, SortOrder> = { [sortBy]: sortOrder === 'asc' ? 1 : -1 };

    // Add secondary sort for consistency
    if (sortBy !== 'submittedAt') {
      sort.submittedAt = -1;
    }

    const [items, total] = await Promise.all([
      ComplianceWorkflowModel.find(query).sort(sort).skip(skip).limit(limit).lean(),
      ComplianceWorkflowModel.countDocuments(query),
    ]);

    return {
      items: items as LeanComplianceWorkflow[],
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
      hasMore: page * limit < total,
    };
  },

  /**
   * Get review queue (items needing admin attention)
   */
  async getReviewQueue(
    options: {
      assignedTo?: string;
      priority?: WorkflowPriority[];
      limit?: number;
    } = {}
  ): Promise<LeanComplianceWorkflow[]> {
    const { assignedTo, priority, limit = 50 } = options;

    const query: FilterQuery<IComplianceWorkflow> = {
      state: { $in: ['AUTO_FAILED', 'NEEDS_REVIEW', 'IN_REVIEW'] },
    };

    if (assignedTo) {
      query.assignedTo = new Types.ObjectId(assignedTo);
    }
    if (priority && priority.length > 0) {
      query.priority = { $in: priority };
    }

    return ComplianceWorkflowModel.find(query)
      .sort({ priority: -1, submittedAt: 1 })
      .limit(limit)
      .lean() as Promise<LeanComplianceWorkflow[]>;
  },

  /**
   * Update workflow state
   */
  async updateState(
    id: string,
    newState: WorkflowState,
    transition: IStateTransition
  ): Promise<LeanComplianceWorkflow | null> {
    return ComplianceWorkflowModel.findByIdAndUpdate(
      id,
      {
        $set: {
          state: newState,
          previousState: transition.fromState,
          updatedAt: new Date(),
          ...(newState === 'IN_REVIEW' && { startedReviewAt: new Date() }),
          ...(
            ['APPROVED', 'REJECTED', 'OVERRIDE_APPROVED', 'AUTO_APPROVED'].includes(newState) && {
              completedAt: new Date(),
            }
          ),
        },
        $push: { stateHistory: transition },
      },
      { new: true }
    ).lean() as unknown as Promise<LeanComplianceWorkflow | null>;
  },

  /**
   * Record admin decision
   */
  async recordDecision(
    id: string,
    decision: IAdminDecision,
    newState: WorkflowState
  ): Promise<LeanComplianceWorkflow | null> {
    const update: Record<string, unknown> = {
      $set: {
        state: newState,
        previousState: decision.previousState,
        updatedAt: new Date(),
      },
      $push: {
        decisions: decision,
        stateHistory: {
          fromState: decision.previousState,
          toState: newState,
          event: decision.action,
          triggeredBy: 'ADMIN',
          triggeredById: decision.adminId,
          timestamp: decision.timestamp,
        },
      },
    };

    // Set final decision for terminal states
    if (['APPROVED', 'REJECTED', 'OVERRIDE_APPROVED'].includes(newState)) {
      (update.$set as Record<string, unknown>).finalDecision = {
        action: newState,
        reasonCode: decision.reasonCode,
        reasonDetails: decision.reasonDetails,
        decidedBy: decision.adminId,
        decidedAt: decision.timestamp,
      };
      (update.$set as Record<string, unknown>).completedAt = decision.timestamp;
    }

    return ComplianceWorkflowModel.findByIdAndUpdate(id, update, { new: true }).lean() as unknown as Promise<LeanComplianceWorkflow | null>;
  },

  /**
   * Assign to reviewer
   */
  async assign(
    id: string,
    assignedTo: string,
    assignedBy: string
  ): Promise<LeanComplianceWorkflow | null> {
    return ComplianceWorkflowModel.findByIdAndUpdate(
      id,
      {
        $set: {
          assignedTo: new Types.ObjectId(assignedTo),
          assignedAt: new Date(),
          assignedBy: new Types.ObjectId(assignedBy),
          updatedAt: new Date(),
        },
      },
      { new: true }
    ).lean() as unknown as Promise<LeanComplianceWorkflow | null>;
  },

  /**
   * Unassign from reviewer
   */
  async unassign(id: string): Promise<LeanComplianceWorkflow | null> {
    return ComplianceWorkflowModel.findByIdAndUpdate(
      id,
      {
        $unset: { assignedTo: 1, assignedAt: 1, assignedBy: 1 },
        $set: { updatedAt: new Date() },
      },
      { new: true }
    ).lean() as unknown as Promise<LeanComplianceWorkflow | null>;
  },

  /**
   * Lock workflow for exclusive review
   */
  async lock(
    id: string,
    lockedBy: string,
    lockDurationMinutes: number = 30
  ): Promise<LeanComplianceWorkflow | null> {
    const lockExpiry = new Date(Date.now() + lockDurationMinutes * 60 * 1000);

    // Only lock if not already locked or lock expired
    return ComplianceWorkflowModel.findOneAndUpdate(
      {
        _id: new Types.ObjectId(id),
        $or: [
          { lockedBy: { $exists: false } },
          { lockExpiry: { $lt: new Date() } },
        ],
      },
      {
        $set: {
          lockedBy: new Types.ObjectId(lockedBy),
          lockedAt: new Date(),
          lockExpiry,
          updatedAt: new Date(),
        },
      },
      { new: true }
    ).lean() as unknown as Promise<LeanComplianceWorkflow | null>;
  },

  /**
   * Unlock workflow
   */
  async unlock(id: string): Promise<LeanComplianceWorkflow | null> {
    return ComplianceWorkflowModel.findByIdAndUpdate(
      id,
      {
        $unset: { lockedBy: 1, lockedAt: 1, lockExpiry: 1 },
        $set: { updatedAt: new Date() },
      },
      { new: true }
    ).lean() as unknown as Promise<LeanComplianceWorkflow | null>;
  },

  /**
   * Update auto-check result
   */
  async updateAutoCheckResult(
    id: string,
    result: IAutoCheckResult,
    newState: WorkflowState
  ): Promise<LeanComplianceWorkflow | null> {
    return ComplianceWorkflowModel.findByIdAndUpdate(
      id,
      {
        $set: {
          autoCheckResult: result,
          lastAutoCheckAt: new Date(),
          state: newState,
          priority: this.calculatePriority(result),
          updatedAt: new Date(),
        },
        $inc: { autoCheckCount: 1 },
        $push: {
          stateHistory: {
            fromState: 'PENDING',
            toState: newState,
            event: result.passed ? 'AUTO_PASS' : 'AUTO_FAIL',
            triggeredBy: 'SYSTEM',
            timestamp: new Date(),
          },
        },
      },
      { new: true }
    ).lean() as unknown as Promise<LeanComplianceWorkflow | null>;
  },

  /**
   * Calculate priority based on auto-check results
   */
  calculatePriority(result: IAutoCheckResult): WorkflowPriority {
    if (result.failedCritical > 0) return 'URGENT';
    if (result.failedMajor >= 2) return 'HIGH';
    if (result.failedMajor > 0) return 'MEDIUM';
    return 'LOW';
  },

  /**
   * Escalate workflow
   */
  async escalate(
    id: string,
    escalatedBy: string,
    reason: string
  ): Promise<LeanComplianceWorkflow | null> {
    return ComplianceWorkflowModel.findByIdAndUpdate(
      id,
      {
        $set: {
          isEscalated: true,
          escalatedAt: new Date(),
          escalatedBy: new Types.ObjectId(escalatedBy),
          escalationReason: reason,
          priority: 'URGENT',
          state: 'NEEDS_REVIEW',
          updatedAt: new Date(),
        },
        $push: {
          stateHistory: {
            fromState: 'AUTO_FAILED',
            toState: 'NEEDS_REVIEW',
            event: 'ESCALATE',
            triggeredBy: 'ADMIN',
            triggeredById: new Types.ObjectId(escalatedBy),
            timestamp: new Date(),
            metadata: { reason },
          },
        },
      },
      { new: true }
    ).lean() as unknown as Promise<LeanComplianceWorkflow | null>;
  },

  /**
   * Update SLA status for all active workflows
   */
  async updateSLAStatuses(): Promise<number> {
    const now = new Date();
    const atRiskThreshold = new Date(now.getTime() + 24 * 60 * 60 * 1000); // 24 hours

    // Mark as breached
    const breachedResult = await ComplianceWorkflowModel.updateMany(
      {
        state: { $nin: ['AUTO_APPROVED', 'APPROVED', 'REJECTED', 'OVERRIDE_APPROVED'] },
        dueDate: { $lt: now },
        slaStatus: { $ne: 'BREACHED' },
      },
      { $set: { slaStatus: 'BREACHED' } }
    );

    // Mark as at risk
    const atRiskResult = await ComplianceWorkflowModel.updateMany(
      {
        state: { $nin: ['AUTO_APPROVED', 'APPROVED', 'REJECTED', 'OVERRIDE_APPROVED'] },
        dueDate: { $gte: now, $lt: atRiskThreshold },
        slaStatus: 'ON_TRACK',
      },
      { $set: { slaStatus: 'AT_RISK' } }
    );

    return breachedResult.modifiedCount + atRiskResult.modifiedCount;
  },

  /**
   * Get queue statistics
   */
  async getQueueStats(organizationId?: string): Promise<QueueStats> {
    const matchStage: Record<string, unknown> = {};
    if (organizationId) {
      matchStage.organizationId = new Types.ObjectId(organizationId);
    }

    const [stateStats, priorityStats, slaStats, escalatedCount, resolutionTimes] = await Promise.all([
      // Count by state
      ComplianceWorkflowModel.aggregate([
        { $match: matchStage },
        { $group: { _id: '$state', count: { $sum: 1 } } },
      ]),
      // Count by priority (non-terminal only)
      ComplianceWorkflowModel.aggregate([
        {
          $match: {
            ...matchStage,
            state: { $nin: ['AUTO_APPROVED', 'APPROVED', 'REJECTED', 'OVERRIDE_APPROVED'] },
          },
        },
        { $group: { _id: '$priority', count: { $sum: 1 } } },
      ]),
      // Count by SLA status
      ComplianceWorkflowModel.aggregate([
        {
          $match: {
            ...matchStage,
            state: { $nin: ['AUTO_APPROVED', 'APPROVED', 'REJECTED', 'OVERRIDE_APPROVED'] },
          },
        },
        { $group: { _id: '$slaStatus', count: { $sum: 1 } } },
      ]),
      // Escalated count
      ComplianceWorkflowModel.countDocuments({
        ...matchStage,
        isEscalated: true,
        state: { $nin: ['APPROVED', 'REJECTED', 'OVERRIDE_APPROVED'] },
      }),
      // Average resolution time
      ComplianceWorkflowModel.aggregate([
        {
          $match: {
            ...matchStage,
            completedAt: { $exists: true },
          },
        },
        {
          $project: {
            resolutionTime: { $subtract: ['$completedAt', '$submittedAt'] },
          },
        },
        {
          $group: { _id: null, avgTime: { $avg: '$resolutionTime' } },
        },
      ]),
    ]);

    // Build stats object
    const stateMap: Record<string, number> = {};
    for (const s of stateStats) {
      stateMap[s._id] = s.count;
    }

    const priorityMap: Record<WorkflowPriority, number> = { LOW: 0, MEDIUM: 0, HIGH: 0, URGENT: 0 };
    for (const p of priorityStats) {
      priorityMap[p._id as WorkflowPriority] = p.count;
    }

    const slaMap: Record<SLAStatus, number> = { ON_TRACK: 0, AT_RISK: 0, BREACHED: 0 };
    for (const s of slaStats) {
      slaMap[s._id as SLAStatus] = s.count;
    }

    return {
      totalPending:
        (stateMap['PENDING'] || 0) +
        (stateMap['AUTO_CHECK'] || 0) +
        (stateMap['AUTO_FAILED'] || 0) +
        (stateMap['NEEDS_REVIEW'] || 0) +
        (stateMap['IN_REVIEW'] || 0),
      needsReview: (stateMap['AUTO_FAILED'] || 0) + (stateMap['NEEDS_REVIEW'] || 0),
      inReview: stateMap['IN_REVIEW'] || 0,
      autoApproved: stateMap['AUTO_APPROVED'] || 0,
      manuallyApproved: stateMap['APPROVED'] || 0,
      rejected: stateMap['REJECTED'] || 0,
      overrideApproved: stateMap['OVERRIDE_APPROVED'] || 0,
      byPriority: priorityMap,
      bySLAStatus: slaMap,
      avgResolutionTime: resolutionTimes[0]?.avgTime || 0,
      escalated: escalatedCount,
    };
  },

  /**
   * Get reviewer workload
   */
  async getReviewerWorkload(adminIds: string[]): Promise<ReviewerWorkload[]> {
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

    const [assignedCounts, completedCounts] = await Promise.all([
      // Count currently assigned
      ComplianceWorkflowModel.aggregate([
        {
          $match: {
            assignedTo: { $in: adminIds.map(id => new Types.ObjectId(id)) },
            state: { $nin: ['APPROVED', 'REJECTED', 'OVERRIDE_APPROVED', 'AUTO_APPROVED'] },
          },
        },
        { $group: { _id: '$assignedTo', count: { $sum: 1 } } },
      ]),
      // Count completed in last 24h with avg decision time
      ComplianceWorkflowModel.aggregate([
        {
          $match: {
            completedAt: { $gte: oneDayAgo },
            'finalDecision.decidedBy': { $in: adminIds.map(id => new Types.ObjectId(id)) },
          },
        },
        {
          $project: {
            decidedBy: '$finalDecision.decidedBy',
            decisionTime: { $subtract: ['$completedAt', '$startedReviewAt'] },
          },
        },
        {
          $group: {
            _id: '$decidedBy',
            count: { $sum: 1 },
            avgTime: { $avg: '$decisionTime' },
          },
        },
      ]),
    ]);

    const assignedMap = new Map(assignedCounts.map(a => [a._id.toString(), a.count]));
    const completedMap = new Map(
      completedCounts.map(c => [c._id.toString(), { count: c.count, avgTime: c.avgTime }])
    );

    return adminIds.map(id => ({
      adminId: id,
      assigned: assignedMap.get(id) || 0,
      completed24h: completedMap.get(id)?.count || 0,
      avgDecisionTime: completedMap.get(id)?.avgTime || 0,
    }));
  },
};
