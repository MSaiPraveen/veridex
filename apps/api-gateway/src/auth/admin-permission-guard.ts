/**
 * Admin Permission Middleware
 * 
 * Enforces fine-grained permissions for admin routes.
 * This is the BACKEND ENFORCEMENT layer - the source of truth.
 */

import { FastifyRequest, FastifyReply } from 'fastify';

/**
 * Admin Permission enum
 * Matches the AdminPermission enum from roles-permissions package
 */
export enum AdminPermission {
  // Organization
  ORG_READ = 'org.read',
  ORG_REVIEW = 'org.review',
  ORG_APPROVE = 'org.approve',
  ORG_REJECT = 'org.reject',
  ORG_SUSPEND = 'org.suspend',
  ORG_REACTIVATE = 'org.reactivate',
  
  // Document
  DOC_READ = 'doc.read',
  DOC_REVIEW = 'doc.review',
  DOC_APPROVE = 'doc.approve',
  DOC_REJECT = 'doc.reject',
  DOC_OVERRIDE = 'doc.override',
  DOC_REQUEST_RESUBMIT = 'doc.request_resubmit',
  
  // Compliance
  COMPLIANCE_READ = 'compliance.read',
  COMPLIANCE_REVIEW = 'compliance.review',
  COMPLIANCE_APPROVE = 'compliance.approve',
  COMPLIANCE_REJECT = 'compliance.reject',
  COMPLIANCE_OVERRIDE = 'compliance.override',
  COMPLIANCE_MANAGE = 'compliance.manage',
  
  // Product
  PRODUCT_READ = 'product.read',
  PRODUCT_REVIEW = 'product.review',
  PRODUCT_SUSPEND = 'product.suspend',
  PRODUCT_REACTIVATE = 'product.reactivate',
  
  // Batch
  BATCH_READ = 'batch.read',
  BATCH_REVIEW = 'batch.review',
  BATCH_APPROVE = 'batch.approve',
  BATCH_REJECT = 'batch.reject',
  
  // Rules
  RULES_READ = 'rules.read',
  RULES_CREATE = 'rules.create',
  RULES_UPDATE = 'rules.update',
  RULES_ARCHIVE = 'rules.archive',
  RULES_HISTORY = 'rules.history',
  
  // Audit
  AUDIT_READ = 'audit.read',
  AUDIT_EXPORT = 'audit.export',
  AUDIT_SENSITIVE = 'audit.sensitive',
  
  // Admin User
  ADMIN_USER_READ = 'admin.user.read',
  ADMIN_USER_CREATE = 'admin.user.create',
  ADMIN_USER_UPDATE = 'admin.user.update',
  ADMIN_USER_DEACTIVATE = 'admin.user.deactivate',
  ADMIN_USER_RESET_MFA = 'admin.user.reset_mfa',
  ADMIN_USER_ASSIGN_ROLE = 'admin.user.assign_role',
  
  // Admin alias
  ADMIN_READ = 'admin.user.read',
  ADMIN_MANAGE = 'admin.manage',
  
  // Settings
  SETTINGS_READ = 'settings.read',
  SETTINGS_UPDATE = 'settings.update',
  SETTINGS_SECURITY_READ = 'settings.security.read',
  SETTINGS_SECURITY_UPDATE = 'settings.security.update',
  
  // Notifications
  NOTIFICATIONS_READ = 'notifications.read',
  NOTIFICATIONS_CREATE = 'notifications.create',
  NOTIFICATIONS_MANAGE = 'notifications.manage',
  
  // Reports
  REPORTS_COMPLIANCE = 'reports.compliance',
  REPORTS_ANALYTICS = 'reports.analytics',
  REPORTS_GENERATE = 'reports.generate',
}

/**
 * Create permission guard middleware
 * 
 * @param requiredPermissions - Permissions required (ANY of these)
 * @param requireAll - If true, ALL permissions are required (default: false - ANY)
 */
export function requireAdminPermissions(
  requiredPermissions: AdminPermission[],
  requireAll: boolean = false
) {
  return async (request: FastifyRequest, reply: FastifyReply) => {
    const adminUser = request.adminUser;
    const user = (request as any).user;
    
    if (!adminUser || !user) {
      return reply.status(401).send({
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          message: 'Authentication required',
        },
      });
    }
    
    const userRole = adminUser.role?.toUpperCase();
    
    // ADMIN has all permissions
    if (userRole === 'ADMIN') {
      request.log.info({
        event: 'PERMISSION_CHECK',
        adminId: adminUser.id,
        role: userRole,
        required: requiredPermissions,
        result: 'ALLOWED_ADMIN',
      });
      return;
    }
    
    // Get user permissions from JWT
    const userPermissions: string[] = user.permissions || [];
    
    // Check wildcard permission
    if (userPermissions.includes('*')) {
      return;
    }
    
    // Check required permissions
    let hasPermission: boolean;
    
    if (requireAll) {
      hasPermission = requiredPermissions.every(p => userPermissions.includes(p));
    } else {
      hasPermission = requiredPermissions.some(p => userPermissions.includes(p));
    }
    
    if (!hasPermission) {
      request.log.warn({
        event: 'PERMISSION_DENIED',
        adminId: adminUser.id,
        role: userRole,
        required: requiredPermissions,
        available: userPermissions,
        requireAll,
      });
      
      return reply.status(403).send({
        success: false,
        error: {
          code: 'PERMISSION_DENIED',
          message: 'Insufficient permissions for this action',
          required: requiredPermissions,
        },
      });
    }
    
    request.log.info({
      event: 'PERMISSION_CHECK',
      adminId: adminUser.id,
      role: userRole,
      required: requiredPermissions,
      result: 'ALLOWED',
    });
  };
}

/**
 * Convenience guards for common operations
 */
export const AdminGuards = {
  // Token verification - basic admin auth check
  verifyToken: async (request: FastifyRequest, reply: FastifyReply) => {
    const adminUser = request.adminUser;
    if (!adminUser) {
      return reply.status(401).send({
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          message: 'Admin authentication required',
        },
      });
    }
  },
  
  // Organization
  canReadOrganizations: requireAdminPermissions([AdminPermission.ORG_READ]),
  canReviewOrganizations: requireAdminPermissions([AdminPermission.ORG_REVIEW]),
  canApproveOrganizations: requireAdminPermissions([AdminPermission.ORG_APPROVE]),
  canSuspendOrganizations: requireAdminPermissions([AdminPermission.ORG_SUSPEND]),
  
  // Documents
  canReadDocuments: requireAdminPermissions([AdminPermission.DOC_READ]),
  canReviewDocuments: requireAdminPermissions([AdminPermission.DOC_REVIEW]),
  canApproveDocuments: requireAdminPermissions([AdminPermission.DOC_APPROVE]),
  canOverrideDocuments: requireAdminPermissions([AdminPermission.DOC_OVERRIDE]),
  
  // Compliance
  canReadCompliance: requireAdminPermissions([AdminPermission.COMPLIANCE_READ]),
  canReviewCompliance: requireAdminPermissions([AdminPermission.COMPLIANCE_REVIEW]),
  canApproveCompliance: requireAdminPermissions([AdminPermission.COMPLIANCE_APPROVE]),
  canOverrideCompliance: requireAdminPermissions([AdminPermission.COMPLIANCE_OVERRIDE]),
  canManageCompliance: requireAdminPermissions([AdminPermission.COMPLIANCE_MANAGE]),
  
  // Products
  canReadProducts: requireAdminPermissions([AdminPermission.PRODUCT_READ]),
  canReviewProducts: requireAdminPermissions([AdminPermission.PRODUCT_REVIEW]),
  canSuspendProducts: requireAdminPermissions([AdminPermission.PRODUCT_SUSPEND]),
  
  // Rules
  canReadRules: requireAdminPermissions([AdminPermission.RULES_READ]),
  canCreateRules: requireAdminPermissions([AdminPermission.RULES_CREATE]),
  canUpdateRules: requireAdminPermissions([AdminPermission.RULES_UPDATE]),
  
  // Audit
  canReadAudit: requireAdminPermissions([AdminPermission.AUDIT_READ]),
  canExportAudit: requireAdminPermissions([AdminPermission.AUDIT_EXPORT]),
  
  // Admin Users
  canReadAdminUsers: requireAdminPermissions([AdminPermission.ADMIN_USER_READ]),
  canManageAdminUsers: requireAdminPermissions([
    AdminPermission.ADMIN_USER_CREATE,
    AdminPermission.ADMIN_USER_UPDATE,
  ]),
  
  // Settings
  canReadSettings: requireAdminPermissions([AdminPermission.SETTINGS_READ]),
  canUpdateSettings: requireAdminPermissions([AdminPermission.SETTINGS_UPDATE]),
  canManageSecurity: requireAdminPermissions([AdminPermission.SETTINGS_SECURITY_UPDATE]),
};

/**
 * Inject admin context headers for downstream services
 */
export function injectAdminContext(request: FastifyRequest): Record<string, string> {
  const adminUser = request.adminUser;
  const headers: Record<string, string> = {
    'x-request-id': request.id,
    'x-caller-type': 'ADMIN',
    'x-request-source': 'ADMIN_GATEWAY',
  };
  
  if (adminUser) {
    headers['x-admin-id'] = adminUser.id;
    headers['x-admin-role'] = adminUser.role;
    headers['x-admin-email'] = adminUser.email;
  }
  
  if (request.headers.authorization) {
    headers['Authorization'] = request.headers.authorization;
  }
  
  return headers;
}
