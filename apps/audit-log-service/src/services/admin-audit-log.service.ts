import { Types } from 'mongoose';
import { AdminAuditLogRepo, AdminAuditQueryOptions, PaginatedAdminAuditLogs, AdminAuditStats } from '../repositories/admin-audit-log.repo';
import { 
  IAdminAuditLogBase, 
  LeanAdminAuditLog, 
  AdminAuditAction, 
  AdminAuditEntityType, 
  AdminAuditSeverity,
  AdminReasonCode,
} from '../domain/admin-audit-log.entity';
import { NotFoundError, ValidationError } from '../errors/service.errors';

export interface RecordAdminAuditInput {
  adminId: string;
  adminEmail: string;
  adminRole: string;
  action: AdminAuditAction;
  entityType: AdminAuditEntityType;
  entityId: string;
  entityName?: string;
  severity?: AdminAuditSeverity;
  reasonCode: AdminReasonCode;
  reasonDetails?: string;
  ipAddress: string;
  userAgent?: string;
  requestId?: string;
  sessionId?: string;
  previousState?: Record<string, unknown>;
  newState?: Record<string, unknown>;
  metadata?: Record<string, unknown>;
  success?: boolean;
  errorCode?: string;
  errorMessage?: string;
  duration?: number;
}

// Map actions to default severity
const ACTION_SEVERITY_MAP: Record<AdminAuditAction, AdminAuditSeverity> = {
  // Auth events
  ADMIN_LOGIN: 'INFO',
  ADMIN_LOGOUT: 'INFO',
  ADMIN_LOGIN_FAILED: 'SECURITY',
  ADMIN_MFA_SETUP: 'INFO',
  ADMIN_MFA_VERIFIED: 'INFO',
  ADMIN_MFA_FAILED: 'SECURITY',
  ADMIN_PASSWORD_RESET: 'WARNING',
  ADMIN_SESSION_EXPIRED: 'INFO',
  // Org management
  ORG_VIEWED: 'INFO',
  ORG_APPROVED: 'WARNING',
  ORG_REJECTED: 'WARNING',
  ORG_SUSPENDED: 'CRITICAL',
  ORG_REACTIVATED: 'WARNING',
  // Doc management
  DOC_VIEWED: 'INFO',
  DOC_APPROVED: 'INFO',
  DOC_REJECTED: 'WARNING',
  DOC_DOWNLOADED: 'INFO',
  // Compliance
  COMPLIANCE_VIEWED: 'INFO',
  COMPLIANCE_APPROVED: 'INFO',
  COMPLIANCE_REJECTED: 'WARNING',
  COMPLIANCE_OVERRIDE: 'CRITICAL',
  COMPLIANCE_ASSIGNED: 'INFO',
  // Product/Batch
  PRODUCT_VIEWED: 'INFO',
  PRODUCT_SUSPENDED: 'CRITICAL',
  PRODUCT_REACTIVATED: 'WARNING',
  BATCH_APPROVED: 'INFO',
  BATCH_QUARANTINED: 'WARNING',
  BATCH_RECALLED: 'CRITICAL',
  // Rules
  RULE_VIEWED: 'INFO',
  RULE_CREATED: 'WARNING',
  RULE_UPDATED: 'WARNING',
  RULE_ACTIVATED: 'WARNING',
  RULE_DEACTIVATED: 'WARNING',
  RULE_TESTED: 'INFO',
  // Admin users
  ADMIN_USER_CREATED: 'CRITICAL',
  ADMIN_USER_UPDATED: 'WARNING',
  ADMIN_USER_DEACTIVATED: 'CRITICAL',
  ADMIN_USER_REACTIVATED: 'WARNING',
  ADMIN_USER_UNLOCKED: 'WARNING',
  ADMIN_USER_MFA_RESET: 'SECURITY',
  ADMIN_ROLE_CHANGED: 'CRITICAL',
  // Settings
  SETTINGS_UPDATED: 'WARNING',
  API_KEY_CREATED: 'CRITICAL',
  API_KEY_REVOKED: 'CRITICAL',
  SYSTEM_CONFIG_CHANGED: 'CRITICAL',
  // Export
  AUDIT_EXPORT: 'WARNING',
  DATA_EXPORT: 'WARNING',
};

// Actions that require security alerts
const SECURITY_ALERT_ACTIONS: AdminAuditAction[] = [
  'ADMIN_LOGIN_FAILED',
  'ADMIN_MFA_FAILED',
  'ADMIN_USER_MFA_RESET',
  'COMPLIANCE_OVERRIDE',
  'ORG_SUSPENDED',
  'PRODUCT_SUSPENDED',
  'BATCH_RECALLED',
  'ADMIN_USER_CREATED',
  'ADMIN_USER_DEACTIVATED',
  'ADMIN_ROLE_CHANGED',
  'API_KEY_CREATED',
  'API_KEY_REVOKED',
  'SYSTEM_CONFIG_CHANGED',
];

export const AdminAuditLogService = {
  /**
   * Record an admin audit log entry
   */
  async record(input: RecordAdminAuditInput): Promise<LeanAdminAuditLog> {
    // Determine severity from action if not provided
    const severity = input.severity || ACTION_SEVERITY_MAP[input.action] || 'INFO';

    const entry: Partial<IAdminAuditLogBase> = {
      adminId: new Types.ObjectId(input.adminId),
      adminEmail: input.adminEmail,
      adminRole: input.adminRole,
      action: input.action,
      entityType: input.entityType,
      entityId: input.entityId,
      entityName: input.entityName,
      severity,
      reasonCode: input.reasonCode,
      reasonDetails: input.reasonDetails,
      ipAddress: input.ipAddress,
      userAgent: input.userAgent,
      requestId: input.requestId,
      sessionId: input.sessionId,
      previousState: input.previousState,
      newState: input.newState,
      metadata: input.metadata || {},
      timestamp: new Date(),
      duration: input.duration,
      success: input.success ?? true,
      errorCode: input.errorCode,
      errorMessage: input.errorMessage,
    };

    const result = await AdminAuditLogRepo.append(entry);

    // Check if this action should trigger a security alert
    if (SECURITY_ALERT_ACTIONS.includes(input.action) || severity === 'SECURITY' || severity === 'CRITICAL') {
      await this.triggerSecurityAlert(result);
    }

    return result.toObject() as LeanAdminAuditLog;
  },

  /**
   * Get audit log by ID
   */
  async getById(id: string): Promise<LeanAdminAuditLog> {
    if (!Types.ObjectId.isValid(id)) {
      throw new ValidationError('Invalid audit log ID format');
    }

    const auditLog = await AdminAuditLogRepo.findById(id);
    if (!auditLog) {
      throw new NotFoundError('AdminAuditLog', id);
    }

    return auditLog;
  },

  /**
   * Find all audit logs with filtering
   */
  async findAll(options: AdminAuditQueryOptions): Promise<PaginatedAdminAuditLogs> {
    return AdminAuditLogRepo.findAll(options);
  },

  /**
   * Get logs for a specific entity
   */
  async getByEntity(entityType: AdminAuditEntityType, entityId: string): Promise<LeanAdminAuditLog[]> {
    return AdminAuditLogRepo.findByEntity(entityType, entityId);
  },

  /**
   * Get logs for a specific admin
   */
  async getByAdmin(adminId: string): Promise<LeanAdminAuditLog[]> {
    return AdminAuditLogRepo.findByAdmin(adminId);
  },

  /**
   * Get entity timeline
   */
  async getEntityTimeline(entityType: AdminAuditEntityType, entityId: string): Promise<LeanAdminAuditLog[]> {
    return AdminAuditLogRepo.getEntityTimeline(entityType, entityId);
  },

  /**
   * Get security alerts
   */
  async getSecurityAlerts(days = 7): Promise<LeanAdminAuditLog[]> {
    const fromDate = new Date();
    fromDate.setDate(fromDate.getDate() - days);
    return AdminAuditLogRepo.getSecurityAlerts(fromDate);
  },

  /**
   * Get failed actions
   */
  async getFailedActions(days = 7): Promise<LeanAdminAuditLog[]> {
    const fromDate = new Date();
    fromDate.setDate(fromDate.getDate() - days);
    return AdminAuditLogRepo.getFailedActions(fromDate);
  },

  /**
   * Get statistics
   */
  async getStats(days = 30): Promise<AdminAuditStats> {
    return AdminAuditLogRepo.getStats(days);
  },

  /**
   * Search logs
   */
  async search(query: string, options: AdminAuditQueryOptions = {}): Promise<PaginatedAdminAuditLogs> {
    return AdminAuditLogRepo.search(query, options);
  },

  /**
   * Trigger security alert for critical actions
   * This would integrate with notification service
   */
  async triggerSecurityAlert(auditLog: LeanAdminAuditLog | { toObject: () => LeanAdminAuditLog }): Promise<void> {
    const log = 'toObject' in auditLog ? auditLog.toObject() as LeanAdminAuditLog : auditLog;
    
    // TODO: Integrate with notification service to:
    // 1. Send email to security team
    // 2. Push to security monitoring dashboard
    // 3. Potentially trigger automated responses
    
    console.log(`[SECURITY ALERT] ${log.action} by ${log.adminEmail} on ${log.entityType}:${log.entityId}`);
  },

  /**
   * Export audit logs (returns data for export, actual file generation handled by caller)
   */
  async exportLogs(options: AdminAuditQueryOptions): Promise<LeanAdminAuditLog[]> {
    // Get all logs matching criteria (with higher limit for export)
    const result = await AdminAuditLogRepo.findAll({
      ...options,
      limit: 10000, // Max export limit
    });
    
    return result.data;
  },
};
