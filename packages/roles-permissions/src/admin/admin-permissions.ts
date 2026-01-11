/**
 * Admin Permissions
 * 
 * Fine-grained permissions for the admin platform.
 * Permissions follow the pattern: resource.action
 * 
 * CRITICAL: These are ONLY for admin portal.
 * Backend MUST enforce these - frontend checks are for UX only.
 */

export enum AdminPermission {
  // ============================================
  // ORGANIZATION MANAGEMENT
  // ============================================
  
  /** View organization list and details */
  ORG_READ = 'org.read',
  
  /** Review pending organization applications */
  ORG_REVIEW = 'org.review',
  
  /** Approve organization applications */
  ORG_APPROVE = 'org.approve',
  
  /** Reject organization applications */
  ORG_REJECT = 'org.reject',
  
  /** Suspend active organizations */
  ORG_SUSPEND = 'org.suspend',
  
  /** Reactivate suspended organizations */
  ORG_REACTIVATE = 'org.reactivate',

  // ============================================
  // DOCUMENT MANAGEMENT
  // ============================================
  
  /** View document list and details */
  DOC_READ = 'doc.read',
  
  /** Review documents in queue */
  DOC_REVIEW = 'doc.review',
  
  /** Approve documents */
  DOC_APPROVE = 'doc.approve',
  
  /** Reject documents */
  DOC_REJECT = 'doc.reject',
  
  /** Override automated document decisions */
  DOC_OVERRIDE = 'doc.override',
  
  /** Request document resubmission */
  DOC_REQUEST_RESUBMIT = 'doc.request_resubmit',

  // ============================================
  // COMPLIANCE MANAGEMENT
  // ============================================
  
  /** View compliance status and history */
  COMPLIANCE_READ = 'compliance.read',
  
  /** Review items in compliance queue */
  COMPLIANCE_REVIEW = 'compliance.review',
  
  /** Approve compliance checks */
  COMPLIANCE_APPROVE = 'compliance.approve',
  
  /** Reject compliance checks */
  COMPLIANCE_REJECT = 'compliance.reject',
  
  /** Override automated compliance decisions */
  COMPLIANCE_OVERRIDE = 'compliance.override',

  // ============================================
  // PRODUCT MANAGEMENT
  // ============================================
  
  /** View product list and details */
  PRODUCT_READ = 'product.read',
  
  /** Review product submissions */
  PRODUCT_REVIEW = 'product.review',
  
  /** Suspend products from marketplace */
  PRODUCT_SUSPEND = 'product.suspend',
  
  /** Reactivate suspended products */
  PRODUCT_REACTIVATE = 'product.reactivate',

  // ============================================
  // BATCH MANAGEMENT
  // ============================================
  
  /** View batch list and details */
  BATCH_READ = 'batch.read',
  
  /** Review batch submissions */
  BATCH_REVIEW = 'batch.review',
  
  /** Approve batch compliance */
  BATCH_APPROVE = 'batch.approve',
  
  /** Reject batch compliance */
  BATCH_REJECT = 'batch.reject',

  // ============================================
  // RULES ENGINE
  // ============================================
  
  /** View compliance rules */
  RULES_READ = 'rules.read',
  
  /** Create new compliance rules */
  RULES_CREATE = 'rules.create',
  
  /** Update existing rules */
  RULES_UPDATE = 'rules.update',
  
  /** Archive (soft-delete) rules */
  RULES_ARCHIVE = 'rules.archive',
  
  /** View rule change history */
  RULES_HISTORY = 'rules.history',

  // ============================================
  // AUDIT LOGS
  // ============================================
  
  /** View audit logs */
  AUDIT_READ = 'audit.read',
  
  /** Export audit logs */
  AUDIT_EXPORT = 'audit.export',
  
  /** View sensitive audit details */
  AUDIT_SENSITIVE = 'audit.sensitive',

  // ============================================
  // ADMIN USER MANAGEMENT
  // ============================================
  
  /** View admin user list */
  ADMIN_USER_READ = 'admin.user.read',
  
  /** Create new admin users */
  ADMIN_USER_CREATE = 'admin.user.create',
  
  /** Update admin user details */
  ADMIN_USER_UPDATE = 'admin.user.update',
  
  /** Deactivate admin users */
  ADMIN_USER_DEACTIVATE = 'admin.user.deactivate',
  
  /** Reset admin user MFA */
  ADMIN_USER_RESET_MFA = 'admin.user.reset_mfa',
  
  /** Assign roles to admin users */
  ADMIN_USER_ASSIGN_ROLE = 'admin.user.assign_role',

  // ============================================
  // SETTINGS
  // ============================================
  
  /** View system settings */
  SETTINGS_READ = 'settings.read',
  
  /** Update system settings */
  SETTINGS_UPDATE = 'settings.update',
  
  /** View security settings */
  SETTINGS_SECURITY_READ = 'settings.security.read',
  
  /** Update security settings */
  SETTINGS_SECURITY_UPDATE = 'settings.security.update',

  // ============================================
  // NOTIFICATIONS
  // ============================================
  
  /** View system notifications */
  NOTIFICATIONS_READ = 'notifications.read',
  
  /** Create system announcements */
  NOTIFICATIONS_CREATE = 'notifications.create',
  
  /** Manage notification templates */
  NOTIFICATIONS_MANAGE = 'notifications.manage',

  // ============================================
  // REPORTS
  // ============================================
  
  /** View compliance reports */
  REPORTS_COMPLIANCE = 'reports.compliance',
  
  /** View analytics reports */
  REPORTS_ANALYTICS = 'reports.analytics',
  
  /** Generate custom reports */
  REPORTS_GENERATE = 'reports.generate',
}

/**
 * Permission categories for UI grouping
 */
export const ADMIN_PERMISSION_CATEGORIES = {
  organization: [
    AdminPermission.ORG_READ,
    AdminPermission.ORG_REVIEW,
    AdminPermission.ORG_APPROVE,
    AdminPermission.ORG_REJECT,
    AdminPermission.ORG_SUSPEND,
    AdminPermission.ORG_REACTIVATE,
  ],
  document: [
    AdminPermission.DOC_READ,
    AdminPermission.DOC_REVIEW,
    AdminPermission.DOC_APPROVE,
    AdminPermission.DOC_REJECT,
    AdminPermission.DOC_OVERRIDE,
    AdminPermission.DOC_REQUEST_RESUBMIT,
  ],
  compliance: [
    AdminPermission.COMPLIANCE_READ,
    AdminPermission.COMPLIANCE_REVIEW,
    AdminPermission.COMPLIANCE_APPROVE,
    AdminPermission.COMPLIANCE_REJECT,
    AdminPermission.COMPLIANCE_OVERRIDE,
  ],
  product: [
    AdminPermission.PRODUCT_READ,
    AdminPermission.PRODUCT_REVIEW,
    AdminPermission.PRODUCT_SUSPEND,
    AdminPermission.PRODUCT_REACTIVATE,
  ],
  batch: [
    AdminPermission.BATCH_READ,
    AdminPermission.BATCH_REVIEW,
    AdminPermission.BATCH_APPROVE,
    AdminPermission.BATCH_REJECT,
  ],
  rules: [
    AdminPermission.RULES_READ,
    AdminPermission.RULES_CREATE,
    AdminPermission.RULES_UPDATE,
    AdminPermission.RULES_ARCHIVE,
    AdminPermission.RULES_HISTORY,
  ],
  audit: [
    AdminPermission.AUDIT_READ,
    AdminPermission.AUDIT_EXPORT,
    AdminPermission.AUDIT_SENSITIVE,
  ],
  adminUsers: [
    AdminPermission.ADMIN_USER_READ,
    AdminPermission.ADMIN_USER_CREATE,
    AdminPermission.ADMIN_USER_UPDATE,
    AdminPermission.ADMIN_USER_DEACTIVATE,
    AdminPermission.ADMIN_USER_RESET_MFA,
    AdminPermission.ADMIN_USER_ASSIGN_ROLE,
  ],
  settings: [
    AdminPermission.SETTINGS_READ,
    AdminPermission.SETTINGS_UPDATE,
    AdminPermission.SETTINGS_SECURITY_READ,
    AdminPermission.SETTINGS_SECURITY_UPDATE,
  ],
  notifications: [
    AdminPermission.NOTIFICATIONS_READ,
    AdminPermission.NOTIFICATIONS_CREATE,
    AdminPermission.NOTIFICATIONS_MANAGE,
  ],
  reports: [
    AdminPermission.REPORTS_COMPLIANCE,
    AdminPermission.REPORTS_ANALYTICS,
    AdminPermission.REPORTS_GENERATE,
  ],
} as const;

/**
 * Permission display names
 */
export const ADMIN_PERMISSION_DISPLAY_NAMES: Record<AdminPermission, string> = {
  [AdminPermission.ORG_READ]: 'View Organizations',
  [AdminPermission.ORG_REVIEW]: 'Review Organizations',
  [AdminPermission.ORG_APPROVE]: 'Approve Organizations',
  [AdminPermission.ORG_REJECT]: 'Reject Organizations',
  [AdminPermission.ORG_SUSPEND]: 'Suspend Organizations',
  [AdminPermission.ORG_REACTIVATE]: 'Reactivate Organizations',
  
  [AdminPermission.DOC_READ]: 'View Documents',
  [AdminPermission.DOC_REVIEW]: 'Review Documents',
  [AdminPermission.DOC_APPROVE]: 'Approve Documents',
  [AdminPermission.DOC_REJECT]: 'Reject Documents',
  [AdminPermission.DOC_OVERRIDE]: 'Override Document Decisions',
  [AdminPermission.DOC_REQUEST_RESUBMIT]: 'Request Document Resubmission',
  
  [AdminPermission.COMPLIANCE_READ]: 'View Compliance',
  [AdminPermission.COMPLIANCE_REVIEW]: 'Review Compliance',
  [AdminPermission.COMPLIANCE_APPROVE]: 'Approve Compliance',
  [AdminPermission.COMPLIANCE_REJECT]: 'Reject Compliance',
  [AdminPermission.COMPLIANCE_OVERRIDE]: 'Override Compliance Decisions',
  
  [AdminPermission.PRODUCT_READ]: 'View Products',
  [AdminPermission.PRODUCT_REVIEW]: 'Review Products',
  [AdminPermission.PRODUCT_SUSPEND]: 'Suspend Products',
  [AdminPermission.PRODUCT_REACTIVATE]: 'Reactivate Products',
  
  [AdminPermission.BATCH_READ]: 'View Batches',
  [AdminPermission.BATCH_REVIEW]: 'Review Batches',
  [AdminPermission.BATCH_APPROVE]: 'Approve Batches',
  [AdminPermission.BATCH_REJECT]: 'Reject Batches',
  
  [AdminPermission.RULES_READ]: 'View Rules',
  [AdminPermission.RULES_CREATE]: 'Create Rules',
  [AdminPermission.RULES_UPDATE]: 'Update Rules',
  [AdminPermission.RULES_ARCHIVE]: 'Archive Rules',
  [AdminPermission.RULES_HISTORY]: 'View Rule History',
  
  [AdminPermission.AUDIT_READ]: 'View Audit Logs',
  [AdminPermission.AUDIT_EXPORT]: 'Export Audit Logs',
  [AdminPermission.AUDIT_SENSITIVE]: 'View Sensitive Audit Data',
  
  [AdminPermission.ADMIN_USER_READ]: 'View Admin Users',
  [AdminPermission.ADMIN_USER_CREATE]: 'Create Admin Users',
  [AdminPermission.ADMIN_USER_UPDATE]: 'Update Admin Users',
  [AdminPermission.ADMIN_USER_DEACTIVATE]: 'Deactivate Admin Users',
  [AdminPermission.ADMIN_USER_RESET_MFA]: 'Reset Admin MFA',
  [AdminPermission.ADMIN_USER_ASSIGN_ROLE]: 'Assign Admin Roles',
  
  [AdminPermission.SETTINGS_READ]: 'View Settings',
  [AdminPermission.SETTINGS_UPDATE]: 'Update Settings',
  [AdminPermission.SETTINGS_SECURITY_READ]: 'View Security Settings',
  [AdminPermission.SETTINGS_SECURITY_UPDATE]: 'Update Security Settings',
  
  [AdminPermission.NOTIFICATIONS_READ]: 'View Notifications',
  [AdminPermission.NOTIFICATIONS_CREATE]: 'Create Notifications',
  [AdminPermission.NOTIFICATIONS_MANAGE]: 'Manage Notifications',
  
  [AdminPermission.REPORTS_COMPLIANCE]: 'View Compliance Reports',
  [AdminPermission.REPORTS_ANALYTICS]: 'View Analytics Reports',
  [AdminPermission.REPORTS_GENERATE]: 'Generate Reports',
};
