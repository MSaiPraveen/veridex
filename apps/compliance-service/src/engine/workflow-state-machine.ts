// Compliance Workflow State Machine
// Handles the complete lifecycle of compliance items through the review process

import { Types } from 'mongoose';

/**
 * Compliance workflow states
 * 
 * State transitions:
 * 
 * PENDING ─────────────────┐
 *    │                     │
 *    ▼                     │
 * AUTO_CHECK ──────────────┼──→ AUTO_APPROVED (terminal)
 *    │                     │
 *    ├──→ AUTO_FAILED ─────┘
 *    │        │
 *    │        ▼
 *    └──→ NEEDS_REVIEW ←──────── (escalation)
 *              │
 *              ├──→ APPROVED (terminal)
 *              │
 *              ├──→ REJECTED (terminal)
 *              │
 *              └──→ OVERRIDE_APPROVED (terminal, requires justification)
 */
export type ComplianceState =
  | 'PENDING'          // Initial state, awaiting processing
  | 'AUTO_CHECK'       // Being evaluated by rule engine
  | 'AUTO_APPROVED'    // Passed all automated checks
  | 'AUTO_FAILED'      // Failed automated checks, needs review
  | 'NEEDS_REVIEW'     // Escalated to admin review queue
  | 'IN_REVIEW'        // Currently being reviewed by admin
  | 'APPROVED'         // Manually approved by admin
  | 'REJECTED'         // Manually rejected by admin
  | 'OVERRIDE_APPROVED'; // Approved despite failures (with justification)

/**
 * Events that trigger state transitions
 */
export type ComplianceEvent =
  | 'SUBMIT'           // Item submitted for compliance check
  | 'START_AUTO_CHECK' // Begin automated evaluation
  | 'AUTO_PASS'        // Passed all automated rules
  | 'AUTO_FAIL'        // Failed one or more automated rules
  | 'ESCALATE'         // Escalate to manual review
  | 'ASSIGN'           // Assign to a reviewer
  | 'START_REVIEW'     // Admin begins reviewing
  | 'APPROVE'          // Admin approves
  | 'REJECT'           // Admin rejects
  | 'OVERRIDE'         // Admin overrides failure with justification
  | 'REQUEST_INFO'     // Admin requests more information
  | 'EXPIRE';          // Item expired without action

/**
 * Decision data for admin actions
 */
export interface AdminDecision {
  adminId: string;
  adminEmail: string;
  adminRole: string;
  action: 'APPROVE' | 'REJECT' | 'OVERRIDE' | 'REQUEST_INFO' | 'ESCALATE';
  reasonCode: string;
  reasonDetails: string;
  notes?: string;
  conditions?: string[];
  timestamp: Date;
}

/**
 * Compliance workflow item
 */
export interface ComplianceWorkflowItem {
  id: string;
  entityType: 'DOCUMENT' | 'PRODUCT' | 'BATCH' | 'ORGANIZATION';
  entityId: string;
  entityName: string;
  organizationId: string;
  state: ComplianceState;
  previousState?: ComplianceState;
  
  // Auto-check results
  autoCheckResults?: {
    passed: boolean;
    score: number;
    ruleResults: Array<{
      ruleId: string;
      ruleName: string;
      passed: boolean;
      severity: 'CRITICAL' | 'MAJOR' | 'MINOR' | 'INFO';
      message: string;
      details?: Record<string, unknown>;
    }>;
    failedCritical: number;
    failedMajor: number;
    failedMinor: number;
  };
  
  // Assignment
  assignedTo?: string;
  assignedAt?: Date;
  assignedBy?: string;
  
  // Decision history
  decisions: AdminDecision[];
  
  // Timing
  createdAt: Date;
  updatedAt: Date;
  dueDate?: Date;
  completedAt?: Date;
  
  // Priority
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
  
  // Metadata
  metadata: Record<string, unknown>;
}

/**
 * State transition result
 */
export interface TransitionResult {
  success: boolean;
  newState: ComplianceState;
  previousState: ComplianceState;
  event: ComplianceEvent;
  error?: string;
  timestamp: Date;
}

/**
 * Valid state transitions map
 */
const VALID_TRANSITIONS: Record<ComplianceState, Partial<Record<ComplianceEvent, ComplianceState>>> = {
  PENDING: {
    SUBMIT: 'AUTO_CHECK',
    START_AUTO_CHECK: 'AUTO_CHECK',
  },
  AUTO_CHECK: {
    AUTO_PASS: 'AUTO_APPROVED',
    AUTO_FAIL: 'AUTO_FAILED',
    ESCALATE: 'NEEDS_REVIEW',
  },
  AUTO_APPROVED: {
    // Terminal state - no valid transitions
  },
  AUTO_FAILED: {
    ESCALATE: 'NEEDS_REVIEW',
    APPROVE: 'APPROVED', // Admin can directly approve
    REJECT: 'REJECTED',
    OVERRIDE: 'OVERRIDE_APPROVED',
  },
  NEEDS_REVIEW: {
    ASSIGN: 'NEEDS_REVIEW', // Stays in same state but assigned
    START_REVIEW: 'IN_REVIEW',
    APPROVE: 'APPROVED',
    REJECT: 'REJECTED',
    OVERRIDE: 'OVERRIDE_APPROVED',
  },
  IN_REVIEW: {
    APPROVE: 'APPROVED',
    REJECT: 'REJECTED',
    OVERRIDE: 'OVERRIDE_APPROVED',
    REQUEST_INFO: 'NEEDS_REVIEW', // Back to queue
  },
  APPROVED: {
    // Terminal state
  },
  REJECTED: {
    // Terminal state (can be resubmitted as new item)
  },
  OVERRIDE_APPROVED: {
    // Terminal state
  },
};

/**
 * States that require admin decision with mandatory justification
 */
const REQUIRES_JUSTIFICATION: ComplianceEvent[] = [
  'OVERRIDE',
  'REJECT',
];

/**
 * States that are terminal (no further transitions)
 */
const TERMINAL_STATES: ComplianceState[] = [
  'AUTO_APPROVED',
  'APPROVED',
  'REJECTED',
  'OVERRIDE_APPROVED',
];

/**
 * Compliance Workflow State Machine
 */
export class ComplianceWorkflowMachine {
  /**
   * Check if a transition is valid
   */
  static isValidTransition(currentState: ComplianceState, event: ComplianceEvent): boolean {
    const transitions = VALID_TRANSITIONS[currentState];
    return transitions && event in transitions;
  }

  /**
   * Get the target state for a transition
   */
  static getTargetState(currentState: ComplianceState, event: ComplianceEvent): ComplianceState | null {
    const transitions = VALID_TRANSITIONS[currentState];
    if (!transitions || !(event in transitions)) {
      return null;
    }
    return transitions[event] || null;
  }

  /**
   * Check if current state is terminal
   */
  static isTerminalState(state: ComplianceState): boolean {
    return TERMINAL_STATES.includes(state);
  }

  /**
   * Check if event requires justification
   */
  static requiresJustification(event: ComplianceEvent): boolean {
    return REQUIRES_JUSTIFICATION.includes(event);
  }

  /**
   * Transition to a new state
   */
  static transition(
    item: ComplianceWorkflowItem,
    event: ComplianceEvent,
    decision?: AdminDecision
  ): TransitionResult {
    const currentState = item.state;
    
    // Check if already terminal
    if (this.isTerminalState(currentState)) {
      return {
        success: false,
        newState: currentState,
        previousState: currentState,
        event,
        error: `Cannot transition from terminal state: ${currentState}`,
        timestamp: new Date(),
      };
    }

    // Validate transition
    if (!this.isValidTransition(currentState, event)) {
      return {
        success: false,
        newState: currentState,
        previousState: currentState,
        event,
        error: `Invalid transition: ${currentState} -> ${event}`,
        timestamp: new Date(),
      };
    }

    // Check justification requirement
    if (this.requiresJustification(event) && (!decision || !decision.reasonDetails)) {
      return {
        success: false,
        newState: currentState,
        previousState: currentState,
        event,
        error: `Event ${event} requires justification`,
        timestamp: new Date(),
      };
    }

    const newState = this.getTargetState(currentState, event)!;
    
    return {
      success: true,
      newState,
      previousState: currentState,
      event,
      timestamp: new Date(),
    };
  }

  /**
   * Get available events for current state
   */
  static getAvailableEvents(state: ComplianceState): ComplianceEvent[] {
    const transitions = VALID_TRANSITIONS[state];
    return transitions ? (Object.keys(transitions) as ComplianceEvent[]) : [];
  }

  /**
   * Calculate priority based on auto-check results and timing
   */
  static calculatePriority(item: ComplianceWorkflowItem): 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT' {
    // Critical failures = URGENT
    if (item.autoCheckResults?.failedCritical && item.autoCheckResults.failedCritical > 0) {
      return 'URGENT';
    }
    
    // Multiple major failures = HIGH
    if (item.autoCheckResults?.failedMajor && item.autoCheckResults.failedMajor >= 2) {
      return 'HIGH';
    }
    
    // Any major failure = MEDIUM
    if (item.autoCheckResults?.failedMajor && item.autoCheckResults.failedMajor > 0) {
      return 'MEDIUM';
    }
    
    // Due date approaching = escalate priority
    if (item.dueDate) {
      const hoursUntilDue = (item.dueDate.getTime() - Date.now()) / (1000 * 60 * 60);
      if (hoursUntilDue < 24) return 'URGENT';
      if (hoursUntilDue < 72) return 'HIGH';
    }
    
    return 'LOW';
  }

  /**
   * Check if item is overdue
   */
  static isOverdue(item: ComplianceWorkflowItem): boolean {
    if (!item.dueDate) return false;
    return item.dueDate.getTime() < Date.now();
  }

  /**
   * Calculate SLA status
   */
  static getSLAStatus(item: ComplianceWorkflowItem): 'ON_TRACK' | 'AT_RISK' | 'BREACHED' {
    if (!item.dueDate) return 'ON_TRACK';
    
    const hoursRemaining = (item.dueDate.getTime() - Date.now()) / (1000 * 60 * 60);
    
    if (hoursRemaining < 0) return 'BREACHED';
    if (hoursRemaining < 24) return 'AT_RISK';
    return 'ON_TRACK';
  }
}

/**
 * Reason codes for admin decisions
 */
export const DECISION_REASON_CODES = {
  APPROVE: [
    { code: 'MEETS_ALL_REQUIREMENTS', label: 'Meets all requirements' },
    { code: 'MANUAL_VERIFICATION_PASSED', label: 'Manual verification passed' },
    { code: 'DOCUMENTS_VERIFIED', label: 'Supporting documents verified' },
    { code: 'EXCEPTION_GRANTED', label: 'Exception granted' },
  ],
  REJECT: [
    { code: 'MISSING_DOCUMENTATION', label: 'Missing required documentation' },
    { code: 'INVALID_DOCUMENTATION', label: 'Invalid or expired documentation' },
    { code: 'FAILED_REQUIREMENTS', label: 'Failed compliance requirements' },
    { code: 'FRAUDULENT_SUBMISSION', label: 'Fraudulent or misleading submission' },
    { code: 'REGULATORY_VIOLATION', label: 'Regulatory violation detected' },
  ],
  OVERRIDE: [
    { code: 'MANUAL_VERIFICATION', label: 'Manual verification confirms compliance' },
    { code: 'HISTORICAL_COMPLIANCE', label: 'Strong historical compliance record' },
    { code: 'PENDING_RENEWAL', label: 'Document renewal in progress' },
    { code: 'REGULATORY_EXCEPTION', label: 'Regulatory exception applies' },
    { code: 'LOW_RISK_DEVIATION', label: 'Low risk deviation from standards' },
  ],
  REQUEST_INFO: [
    { code: 'NEED_ADDITIONAL_DOCS', label: 'Need additional documents' },
    { code: 'CLARIFICATION_REQUIRED', label: 'Clarification required' },
    { code: 'PENDING_THIRD_PARTY', label: 'Pending third-party verification' },
  ],
  ESCALATE: [
    { code: 'REQUIRES_SENIOR_REVIEW', label: 'Requires senior review' },
    { code: 'POLICY_INTERPRETATION', label: 'Policy interpretation needed' },
    { code: 'COMPLEX_CASE', label: 'Complex case requiring expertise' },
  ],
} as const;

export type ReasonCode = 
  | (typeof DECISION_REASON_CODES.APPROVE)[number]['code']
  | (typeof DECISION_REASON_CODES.REJECT)[number]['code']
  | (typeof DECISION_REASON_CODES.OVERRIDE)[number]['code']
  | (typeof DECISION_REASON_CODES.REQUEST_INFO)[number]['code']
  | (typeof DECISION_REASON_CODES.ESCALATE)[number]['code'];
