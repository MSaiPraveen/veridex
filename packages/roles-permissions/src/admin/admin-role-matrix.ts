/**
 * Admin Role-Permission Matrix
 * 
 * Defines which permissions are assigned to each admin role.
 * This is the SINGLE SOURCE OF TRUTH for admin authorization.
 * 
 * CRITICAL: This matrix is enforced at the API gateway level.
 * Frontend uses it only for UX (hiding/showing buttons).
 */

import { AdminRole } from './admin-roles';
import { AdminPermission } from './admin-permissions';

/**
 * Complete role-permission matrix
 */
export const ADMIN_ROLE_PERMISSIONS: Record<AdminRole, AdminPermission[]> = {
  // ============================================
  // SUPER_ADMIN - Full Access
  // ============================================
  [AdminRole.SUPER_ADMIN]: [
    // Organization - Full
    AdminPermission.ORG_READ,
    AdminPermission.ORG_REVIEW,
    AdminPermission.ORG_APPROVE,
    AdminPermission.ORG_REJECT,
    AdminPermission.ORG_SUSPEND,
    AdminPermission.ORG_REACTIVATE,
    
    // Documents - Full
    AdminPermission.DOC_READ,
    AdminPermission.DOC_REVIEW,
    AdminPermission.DOC_APPROVE,
    AdminPermission.DOC_REJECT,
    AdminPermission.DOC_OVERRIDE,
    AdminPermission.DOC_REQUEST_RESUBMIT,
    
    // Compliance - Full
    AdminPermission.COMPLIANCE_READ,
    AdminPermission.COMPLIANCE_REVIEW,
    AdminPermission.COMPLIANCE_APPROVE,
    AdminPermission.COMPLIANCE_REJECT,
    AdminPermission.COMPLIANCE_OVERRIDE,
    
    // Products - Full
    AdminPermission.PRODUCT_READ,
    AdminPermission.PRODUCT_REVIEW,
    AdminPermission.PRODUCT_SUSPEND,
    AdminPermission.PRODUCT_REACTIVATE,
    
    // Batches - Full
    AdminPermission.BATCH_READ,
    AdminPermission.BATCH_REVIEW,
    AdminPermission.BATCH_APPROVE,
    AdminPermission.BATCH_REJECT,
    
    // Rules - Full (SUPER_ADMIN only for write)
    AdminPermission.RULES_READ,
    AdminPermission.RULES_CREATE,
    AdminPermission.RULES_UPDATE,
    AdminPermission.RULES_ARCHIVE,
    AdminPermission.RULES_HISTORY,
    
    // Audit - Full
    AdminPermission.AUDIT_READ,
    AdminPermission.AUDIT_EXPORT,
    AdminPermission.AUDIT_SENSITIVE,
    
    // Admin Users - Full (SUPER_ADMIN only)
    AdminPermission.ADMIN_USER_READ,
    AdminPermission.ADMIN_USER_CREATE,
    AdminPermission.ADMIN_USER_UPDATE,
    AdminPermission.ADMIN_USER_DEACTIVATE,
    AdminPermission.ADMIN_USER_RESET_MFA,
    AdminPermission.ADMIN_USER_ASSIGN_ROLE,
    
    // Settings - Full (SUPER_ADMIN only for security)
    AdminPermission.SETTINGS_READ,
    AdminPermission.SETTINGS_UPDATE,
    AdminPermission.SETTINGS_SECURITY_READ,
    AdminPermission.SETTINGS_SECURITY_UPDATE,
    
    // Notifications - Full
    AdminPermission.NOTIFICATIONS_READ,
    AdminPermission.NOTIFICATIONS_CREATE,
    AdminPermission.NOTIFICATIONS_MANAGE,
    
    // Reports - Full
    AdminPermission.REPORTS_COMPLIANCE,
    AdminPermission.REPORTS_ANALYTICS,
    AdminPermission.REPORTS_GENERATE,
  ],

  // ============================================
  // ADMIN - Operations Access
  // ============================================
  [AdminRole.ADMIN]: [
    // Organization - Full except suspend
    AdminPermission.ORG_READ,
    AdminPermission.ORG_REVIEW,
    AdminPermission.ORG_APPROVE,
    AdminPermission.ORG_REJECT,
    // NO: ORG_SUSPEND (requires SUPER_ADMIN)
    // NO: ORG_REACTIVATE (requires SUPER_ADMIN)
    
    // Documents - Full including override
    AdminPermission.DOC_READ,
    AdminPermission.DOC_REVIEW,
    AdminPermission.DOC_APPROVE,
    AdminPermission.DOC_REJECT,
    AdminPermission.DOC_OVERRIDE,
    AdminPermission.DOC_REQUEST_RESUBMIT,
    
    // Compliance - No override
    AdminPermission.COMPLIANCE_READ,
    AdminPermission.COMPLIANCE_REVIEW,
    AdminPermission.COMPLIANCE_APPROVE,
    AdminPermission.COMPLIANCE_REJECT,
    // NO: COMPLIANCE_OVERRIDE (requires SUPER_ADMIN)
    
    // Products - Full
    AdminPermission.PRODUCT_READ,
    AdminPermission.PRODUCT_REVIEW,
    AdminPermission.PRODUCT_SUSPEND,
    AdminPermission.PRODUCT_REACTIVATE,
    
    // Batches - Full
    AdminPermission.BATCH_READ,
    AdminPermission.BATCH_REVIEW,
    AdminPermission.BATCH_APPROVE,
    AdminPermission.BATCH_REJECT,
    
    // Rules - Read only
    AdminPermission.RULES_READ,
    AdminPermission.RULES_HISTORY,
    // NO: RULES_CREATE, RULES_UPDATE, RULES_ARCHIVE (requires SUPER_ADMIN)
    
    // Audit - Read and export
    AdminPermission.AUDIT_READ,
    AdminPermission.AUDIT_EXPORT,
    // NO: AUDIT_SENSITIVE (requires SUPER_ADMIN)
    
    // Admin Users - Read only
    AdminPermission.ADMIN_USER_READ,
    // NO: Create, update, deactivate (requires SUPER_ADMIN)
    
    // Settings - Read only
    AdminPermission.SETTINGS_READ,
    // NO: SETTINGS_UPDATE, SETTINGS_SECURITY_* (requires SUPER_ADMIN)
    
    // Notifications - Read and create
    AdminPermission.NOTIFICATIONS_READ,
    AdminPermission.NOTIFICATIONS_CREATE,
    // NO: NOTIFICATIONS_MANAGE (requires SUPER_ADMIN)
    
    // Reports - Read only
    AdminPermission.REPORTS_COMPLIANCE,
    AdminPermission.REPORTS_ANALYTICS,
    // NO: REPORTS_GENERATE (requires SUPER_ADMIN)
  ],

  // ============================================
  // COMPLIANCE_REVIEWER - Review Access
  // ============================================
  [AdminRole.COMPLIANCE_REVIEWER]: [
    // Organization - Read only
    AdminPermission.ORG_READ,
    // NO: Review, approve, reject (requires ADMIN)
    
    // Documents - Review and decide (no override)
    AdminPermission.DOC_READ,
    AdminPermission.DOC_REVIEW,
    AdminPermission.DOC_APPROVE,
    AdminPermission.DOC_REJECT,
    AdminPermission.DOC_REQUEST_RESUBMIT,
    // NO: DOC_OVERRIDE (requires ADMIN)
    
    // Compliance - Review and decide (no override)
    AdminPermission.COMPLIANCE_READ,
    AdminPermission.COMPLIANCE_REVIEW,
    AdminPermission.COMPLIANCE_APPROVE,
    AdminPermission.COMPLIANCE_REJECT,
    // NO: COMPLIANCE_OVERRIDE (requires SUPER_ADMIN)
    
    // Products - Read only
    AdminPermission.PRODUCT_READ,
    // NO: Review, suspend, reactivate (requires ADMIN)
    
    // Batches - Review and decide
    AdminPermission.BATCH_READ,
    AdminPermission.BATCH_REVIEW,
    AdminPermission.BATCH_APPROVE,
    AdminPermission.BATCH_REJECT,
    
    // Rules - Read only
    AdminPermission.RULES_READ,
    // NO: Create, update, archive, history (requires ADMIN+)
    
    // Audit - Read only
    AdminPermission.AUDIT_READ,
    // NO: Export, sensitive (requires ADMIN+)
    
    // Admin Users - No access
    // NO: Any admin user permissions
    
    // Settings - No access
    // NO: Any settings permissions
    
    // Notifications - Read only
    AdminPermission.NOTIFICATIONS_READ,
    // NO: Create, manage (requires ADMIN+)
    
    // Reports - Compliance only
    AdminPermission.REPORTS_COMPLIANCE,
    // NO: Analytics, generate (requires ADMIN+)
  ],

  // ============================================
  // VIEWER - Read-Only Access
  // ============================================
  [AdminRole.VIEWER]: [
    // Organization - Read only
    AdminPermission.ORG_READ,
    
    // Documents - Read only
    AdminPermission.DOC_READ,
    
    // Compliance - Read only
    AdminPermission.COMPLIANCE_READ,
    
    // Products - Read only
    AdminPermission.PRODUCT_READ,
    
    // Batches - Read only
    AdminPermission.BATCH_READ,
    
    // Rules - Read only
    AdminPermission.RULES_READ,
    
    // Audit - Read only
    AdminPermission.AUDIT_READ,
    
    // Admin Users - No access
    
    // Settings - No access
    
    // Notifications - Read only
    AdminPermission.NOTIFICATIONS_READ,
    
    // Reports - Read only
    AdminPermission.REPORTS_COMPLIANCE,
    AdminPermission.REPORTS_ANALYTICS,
  ],
};

/**
 * Check if a role has a specific permission
 */
export function roleHasPermission(role: AdminRole, permission: AdminPermission): boolean {
  const permissions = ADMIN_ROLE_PERMISSIONS[role];
  return permissions?.includes(permission) ?? false;
}

/**
 * Get all permissions for a role
 */
export function getPermissionsForRole(role: AdminRole): AdminPermission[] {
  return ADMIN_ROLE_PERMISSIONS[role] ?? [];
}

/**
 * Check if a user has any of the specified permissions
 */
export function hasAnyPermission(role: AdminRole, requiredPermissions: AdminPermission[]): boolean {
  const userPermissions = ADMIN_ROLE_PERMISSIONS[role];
  return requiredPermissions.some(p => userPermissions.includes(p));
}

/**
 * Check if a user has all of the specified permissions
 */
export function hasAllPermissions(role: AdminRole, requiredPermissions: AdminPermission[]): boolean {
  const userPermissions = ADMIN_ROLE_PERMISSIONS[role];
  return requiredPermissions.every(p => userPermissions.includes(p));
}

/**
 * Get roles that have a specific permission
 */
export function getRolesWithPermission(permission: AdminPermission): AdminRole[] {
  return Object.entries(ADMIN_ROLE_PERMISSIONS)
    .filter(([, permissions]) => permissions.includes(permission))
    .map(([role]) => role as AdminRole);
}
