import { FastifyRequest } from 'fastify';
import { getClientIp } from '../plugins/ip-whitelist';

/**
 * Admin Action Audit Logger
 * 
 * Enhanced audit logging specifically for admin actions.
 * Captures detailed context for security and compliance.
 */

// Audit log service URL
const AUDIT_SERVICE_URL = process.env.AUDIT_SERVICE_URL || 'http://localhost:3007';

/**
 * Admin action categories for audit classification
 */
export enum AdminActionCategory {
  AUTH = 'AUTH',                 // Login, logout, MFA
  USER_MANAGEMENT = 'USER_MGMT', // Create, update, delete users
  ORG_MANAGEMENT = 'ORG_MGMT',   // Organization management
  COMPLIANCE = 'COMPLIANCE',     // Compliance rule changes
  SYSTEM = 'SYSTEM',             // System configuration
  DATA_ACCESS = 'DATA_ACCESS',   // Sensitive data access
  SECURITY = 'SECURITY',         // Security events
}

/**
 * Severity levels for admin actions
 */
export enum AuditSeverity {
  INFO = 'INFO',         // Normal operations
  NOTICE = 'NOTICE',     // Notable actions
  WARNING = 'WARNING',   // Potential concerns
  CRITICAL = 'CRITICAL', // High-risk actions
}

/**
 * Admin audit log entry
 */
export interface AdminAuditEntry {
  // Actor information
  actorId: string;
  actorEmail: string;
  actorRole: string;
  
  // Action details
  action: string;
  category: AdminActionCategory;
  severity: AuditSeverity;
  
  // Resource affected
  resourceType?: string;
  resourceId?: string;
  
  // Changes made
  changes?: {
    before?: Record<string, unknown>;
    after?: Record<string, unknown>;
  };
  
  // Context
  ipAddress: string;
  userAgent?: string;
  requestId: string;
  sessionId?: string;
  
  // Additional metadata
  metadata?: Record<string, unknown>;
  
  // Timing
  timestamp: Date;
  duration?: number;
  
  // Immutability
  hash?: string;
}

/**
 * Create SHA-256 hash of audit entry for tamper detection
 */
async function createAuditHash(entry: Omit<AdminAuditEntry, 'hash'>): Promise<string> {
  const crypto = await import('crypto');
  const data = JSON.stringify({
    actorId: entry.actorId,
    action: entry.action,
    resourceType: entry.resourceType,
    resourceId: entry.resourceId,
    timestamp: entry.timestamp.toISOString(),
    ipAddress: entry.ipAddress,
  });
  return crypto.createHash('sha256').update(data).digest('hex');
}

/**
 * Log an admin action to the audit service
 */
export async function logAdminAction(
  request: FastifyRequest,
  action: string,
  options: {
    category?: AdminActionCategory;
    severity?: AuditSeverity;
    resourceType?: string;
    resourceId?: string;
    changes?: { before?: Record<string, unknown>; after?: Record<string, unknown> };
    metadata?: Record<string, unknown>;
    duration?: number;
  } = {}
): Promise<void> {
  const user = (request as any).user || (request as any).adminUser;
  
  if (!user) {
    request.log.warn({ action }, 'Admin action logged without user context');
    return;
  }

  const entry: Omit<AdminAuditEntry, 'hash'> = {
    actorId: user.id,
    actorEmail: user.email,
    actorRole: user.role,
    action,
    category: options.category || AdminActionCategory.SYSTEM,
    severity: options.severity || AuditSeverity.INFO,
    resourceType: options.resourceType,
    resourceId: options.resourceId,
    changes: options.changes,
    ipAddress: getClientIp(request),
    userAgent: request.headers['user-agent'],
    requestId: request.id,
    sessionId: user.adminSessionId,
    metadata: {
      ...options.metadata,
      endpoint: request.url,
      method: request.method,
    },
    timestamp: new Date(),
    duration: options.duration,
  };

  // Create hash for tamper detection
  const hash = await createAuditHash(entry);
  const fullEntry: AdminAuditEntry = { ...entry, hash };

  // Log locally for immediate visibility
  request.log.info({
    event: 'ADMIN_ACTION',
    ...fullEntry,
  }, `Admin action: ${action}`);

  // Send to audit service asynchronously
  try {
    await fetch(`${AUDIT_SERVICE_URL}/audit`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Request-ID': request.id,
      },
      body: JSON.stringify({
        action,
        actorId: fullEntry.actorId,
        actorType: 'ADMIN',
        resourceType: fullEntry.resourceType || 'system',
        resourceId: fullEntry.resourceId || 'n/a',
        organizationId: user.organizationId,
        changes: fullEntry.changes,
        ipAddress: fullEntry.ipAddress,
        userAgent: fullEntry.userAgent,
        requestId: fullEntry.requestId,
        metadata: {
          ...fullEntry.metadata,
          category: fullEntry.category,
          severity: fullEntry.severity,
          hash: fullEntry.hash,
          adminSession: fullEntry.sessionId,
        },
      }),
    });
  } catch (error) {
    // Don't fail the request if audit logging fails, but log the error
    request.log.error({ error, entry }, 'Failed to send admin audit log');
  }
}

/**
 * Pre-built admin action loggers for common operations
 */
export const adminAuditActions = {
  // Authentication
  adminLogin: (request: FastifyRequest, success: boolean, reason?: string) =>
    logAdminAction(request, success ? 'ADMIN_LOGIN_SUCCESS' : 'ADMIN_LOGIN_FAILED', {
      category: AdminActionCategory.AUTH,
      severity: success ? AuditSeverity.INFO : AuditSeverity.WARNING,
      metadata: { success, reason },
    }),

  adminLogout: (request: FastifyRequest) =>
    logAdminAction(request, 'ADMIN_LOGOUT', {
      category: AdminActionCategory.AUTH,
      severity: AuditSeverity.INFO,
    }),

  mfaSetup: (request: FastifyRequest) =>
    logAdminAction(request, 'MFA_SETUP', {
      category: AdminActionCategory.SECURITY,
      severity: AuditSeverity.NOTICE,
    }),

  mfaVerified: (request: FastifyRequest) =>
    logAdminAction(request, 'MFA_VERIFIED', {
      category: AdminActionCategory.AUTH,
      severity: AuditSeverity.INFO,
    }),

  // User Management
  userCreated: (request: FastifyRequest, userId: string, userData: Record<string, unknown>) =>
    logAdminAction(request, 'USER_CREATED', {
      category: AdminActionCategory.USER_MANAGEMENT,
      severity: AuditSeverity.NOTICE,
      resourceType: 'user',
      resourceId: userId,
      changes: { after: userData },
    }),

  userUpdated: (request: FastifyRequest, userId: string, before: Record<string, unknown>, after: Record<string, unknown>) =>
    logAdminAction(request, 'USER_UPDATED', {
      category: AdminActionCategory.USER_MANAGEMENT,
      severity: AuditSeverity.NOTICE,
      resourceType: 'user',
      resourceId: userId,
      changes: { before, after },
    }),

  userDeleted: (request: FastifyRequest, userId: string, userData: Record<string, unknown>) =>
    logAdminAction(request, 'USER_DELETED', {
      category: AdminActionCategory.USER_MANAGEMENT,
      severity: AuditSeverity.WARNING,
      resourceType: 'user',
      resourceId: userId,
      changes: { before: userData },
    }),

  userRoleChanged: (request: FastifyRequest, userId: string, oldRole: string, newRole: string) =>
    logAdminAction(request, 'USER_ROLE_CHANGED', {
      category: AdminActionCategory.USER_MANAGEMENT,
      severity: AuditSeverity.CRITICAL,
      resourceType: 'user',
      resourceId: userId,
      changes: { before: { role: oldRole }, after: { role: newRole } },
    }),

  // Compliance
  complianceRuleCreated: (request: FastifyRequest, ruleId: string, ruleData: Record<string, unknown>) =>
    logAdminAction(request, 'COMPLIANCE_RULE_CREATED', {
      category: AdminActionCategory.COMPLIANCE,
      severity: AuditSeverity.NOTICE,
      resourceType: 'compliance_rule',
      resourceId: ruleId,
      changes: { after: ruleData },
    }),

  complianceRuleUpdated: (request: FastifyRequest, ruleId: string, before: Record<string, unknown>, after: Record<string, unknown>) =>
    logAdminAction(request, 'COMPLIANCE_RULE_UPDATED', {
      category: AdminActionCategory.COMPLIANCE,
      severity: AuditSeverity.CRITICAL,
      resourceType: 'compliance_rule',
      resourceId: ruleId,
      changes: { before, after },
    }),

  // Data Access
  sensitiveDataAccessed: (request: FastifyRequest, resourceType: string, resourceId: string) =>
    logAdminAction(request, 'SENSITIVE_DATA_ACCESSED', {
      category: AdminActionCategory.DATA_ACCESS,
      severity: AuditSeverity.NOTICE,
      resourceType,
      resourceId,
    }),

  bulkDataExport: (request: FastifyRequest, resourceType: string, recordCount: number) =>
    logAdminAction(request, 'BULK_DATA_EXPORT', {
      category: AdminActionCategory.DATA_ACCESS,
      severity: AuditSeverity.WARNING,
      resourceType,
      metadata: { recordCount },
    }),

  // Security Events
  suspiciousActivity: (request: FastifyRequest, reason: string, metadata?: Record<string, unknown>) =>
    logAdminAction(request, 'SUSPICIOUS_ACTIVITY_DETECTED', {
      category: AdminActionCategory.SECURITY,
      severity: AuditSeverity.CRITICAL,
      metadata: { reason, ...metadata },
    }),

  ipBlocked: (request: FastifyRequest, blockedIp: string, reason: string) =>
    logAdminAction(request, 'IP_BLOCKED', {
      category: AdminActionCategory.SECURITY,
      severity: AuditSeverity.WARNING,
      metadata: { blockedIp, reason },
    }),
};
