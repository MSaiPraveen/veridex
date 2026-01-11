/**
 * Admin Authorization Guards
 * 
 * Helper functions for checking permissions.
 * These are used by both frontend (UX) and backend (enforcement).
 * 
 * CRITICAL: Backend MUST always verify independently.
 * Frontend checks are for UX only and can be bypassed.
 */

import { AdminRole, isRoleAtLeast } from './admin-roles';
import { AdminPermission } from './admin-permissions';
import { 
  ADMIN_ROLE_PERMISSIONS, 
  roleHasPermission, 
  hasAnyPermission, 
  hasAllPermissions 
} from './admin-role-matrix';
import type { AdminJWTPayload, PermissionCheckResult } from './admin-types';

/**
 * Check if admin can perform an action
 */
export function canPerform(
  admin: { role: AdminRole; permissions?: AdminPermission[] },
  requiredPermission: AdminPermission
): boolean {
  // If permissions are provided (from JWT), check directly
  if (admin.permissions && admin.permissions.length > 0) {
    return admin.permissions.includes(requiredPermission);
  }
  
  // Otherwise derive from role
  return roleHasPermission(admin.role, requiredPermission);
}

/**
 * Check if admin can perform any of multiple actions
 */
export function canPerformAny(
  admin: { role: AdminRole; permissions?: AdminPermission[] },
  requiredPermissions: AdminPermission[]
): boolean {
  if (admin.permissions && admin.permissions.length > 0) {
    return requiredPermissions.some(p => admin.permissions!.includes(p));
  }
  
  return hasAnyPermission(admin.role, requiredPermissions);
}

/**
 * Check if admin can perform all of multiple actions
 */
export function canPerformAll(
  admin: { role: AdminRole; permissions?: AdminPermission[] },
  requiredPermissions: AdminPermission[]
): boolean {
  if (admin.permissions && admin.permissions.length > 0) {
    return requiredPermissions.every(p => admin.permissions!.includes(p));
  }
  
  return hasAllPermissions(admin.role, requiredPermissions);
}

/**
 * Create a permission guard for a specific permission
 */
export function createPermissionGuard(requiredPermission: AdminPermission) {
  return (admin: { role: AdminRole; permissions?: AdminPermission[] }): boolean => {
    return canPerform(admin, requiredPermission);
  };
}

/**
 * Create a role guard for a minimum role level
 */
export function createRoleGuard(minimumRole: AdminRole) {
  return (admin: { role: AdminRole }): boolean => {
    return isRoleAtLeast(admin.role, minimumRole);
  };
}

/**
 * Verify an admin JWT payload
 * 
 * CRITICAL: This validates the structure, not the signature.
 * Signature must be verified separately using the admin JWT secret.
 */
export function verifyAdminPayload(payload: unknown): payload is AdminJWTPayload {
  if (!payload || typeof payload !== 'object') {
    return false;
  }
  
  const p = payload as Record<string, unknown>;
  
  // Required claims
  if (typeof p.sub !== 'string' || !p.sub) return false;
  if (typeof p.adminId !== 'string' || !p.adminId) return false;
  if (typeof p.email !== 'string' || !p.email) return false;
  if (!Object.values(AdminRole).includes(p.role as AdminRole)) return false;
  
  // CRITICAL: Issuer and audience must match exactly
  if (p.iss !== 'ADMIN_AUTH') return false;
  if (p.aud !== 'ADMIN_API') return false;
  
  // CRITICAL: MFA must be verified
  if (p.mfaVerified !== true) return false;
  
  // Session ID required
  if (typeof p.sessionId !== 'string' || !p.sessionId) return false;
  
  // Timestamps
  if (typeof p.iat !== 'number') return false;
  if (typeof p.exp !== 'number') return false;
  
  // Check expiration
  const now = Math.floor(Date.now() / 1000);
  if (p.exp <= now) return false;
  
  return true;
}

/**
 * Check permission with detailed result
 */
export function checkPermissionDetailed(
  admin: { role: AdminRole; permissions?: AdminPermission[] },
  requiredPermission: AdminPermission
): PermissionCheckResult {
  const userPermissions = admin.permissions || ADMIN_ROLE_PERMISSIONS[admin.role] || [];
  const allowed = userPermissions.includes(requiredPermission);
  
  return {
    allowed,
    requiredPermission,
    userPermissions,
    reason: allowed ? undefined : `Permission '${requiredPermission}' not granted to role '${admin.role}'`,
  };
}

/**
 * Pre-defined permission guards for common operations
 */
export const AdminGuards = {
  // Organization guards
  canViewOrganizations: createPermissionGuard(AdminPermission.ORG_READ),
  canReviewOrganizations: createPermissionGuard(AdminPermission.ORG_REVIEW),
  canApproveOrganizations: createPermissionGuard(AdminPermission.ORG_APPROVE),
  canSuspendOrganizations: createPermissionGuard(AdminPermission.ORG_SUSPEND),
  
  // Document guards
  canViewDocuments: createPermissionGuard(AdminPermission.DOC_READ),
  canReviewDocuments: createPermissionGuard(AdminPermission.DOC_REVIEW),
  canApproveDocuments: createPermissionGuard(AdminPermission.DOC_APPROVE),
  canOverrideDocuments: createPermissionGuard(AdminPermission.DOC_OVERRIDE),
  
  // Compliance guards
  canViewCompliance: createPermissionGuard(AdminPermission.COMPLIANCE_READ),
  canReviewCompliance: createPermissionGuard(AdminPermission.COMPLIANCE_REVIEW),
  canApproveCompliance: createPermissionGuard(AdminPermission.COMPLIANCE_APPROVE),
  canOverrideCompliance: createPermissionGuard(AdminPermission.COMPLIANCE_OVERRIDE),
  
  // Product guards
  canViewProducts: createPermissionGuard(AdminPermission.PRODUCT_READ),
  canReviewProducts: createPermissionGuard(AdminPermission.PRODUCT_REVIEW),
  canSuspendProducts: createPermissionGuard(AdminPermission.PRODUCT_SUSPEND),
  
  // Rules guards
  canViewRules: createPermissionGuard(AdminPermission.RULES_READ),
  canCreateRules: createPermissionGuard(AdminPermission.RULES_CREATE),
  canUpdateRules: createPermissionGuard(AdminPermission.RULES_UPDATE),
  
  // Audit guards
  canViewAuditLogs: createPermissionGuard(AdminPermission.AUDIT_READ),
  canExportAuditLogs: createPermissionGuard(AdminPermission.AUDIT_EXPORT),
  
  // Admin user guards
  canViewAdminUsers: createPermissionGuard(AdminPermission.ADMIN_USER_READ),
  canManageAdminUsers: createPermissionGuard(AdminPermission.ADMIN_USER_CREATE),
  
  // Settings guards
  canViewSettings: createPermissionGuard(AdminPermission.SETTINGS_READ),
  canUpdateSettings: createPermissionGuard(AdminPermission.SETTINGS_UPDATE),
  canManageSecuritySettings: createPermissionGuard(AdminPermission.SETTINGS_SECURITY_UPDATE),
  
  // Role-based guards
  isSuperAdmin: createRoleGuard(AdminRole.SUPER_ADMIN),
  isAdmin: createRoleGuard(AdminRole.ADMIN),
  isComplianceReviewer: createRoleGuard(AdminRole.COMPLIANCE_REVIEWER),
};

/**
 * Get all available actions for an admin
 */
export function getAvailableActions(admin: { role: AdminRole; permissions?: AdminPermission[] }): {
  organizations: AdminPermission[];
  documents: AdminPermission[];
  compliance: AdminPermission[];
  products: AdminPermission[];
  batches: AdminPermission[];
  rules: AdminPermission[];
  audit: AdminPermission[];
  adminUsers: AdminPermission[];
  settings: AdminPermission[];
} {
  const perms = admin.permissions || ADMIN_ROLE_PERMISSIONS[admin.role] || [];
  
  return {
    organizations: perms.filter(p => p.startsWith('org.')),
    documents: perms.filter(p => p.startsWith('doc.')),
    compliance: perms.filter(p => p.startsWith('compliance.')),
    products: perms.filter(p => p.startsWith('product.')),
    batches: perms.filter(p => p.startsWith('batch.')),
    rules: perms.filter(p => p.startsWith('rules.')),
    audit: perms.filter(p => p.startsWith('audit.')),
    adminUsers: perms.filter(p => p.startsWith('admin.user.')),
    settings: perms.filter(p => p.startsWith('settings.')),
  };
}
