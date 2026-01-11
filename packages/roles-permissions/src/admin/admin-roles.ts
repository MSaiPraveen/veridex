/**
 * Admin Roles
 * 
 * These roles are ONLY for admin users.
 * They are completely separate from public user roles (CONSUMER, MERCHANT).
 * 
 * Admin roles follow a strict hierarchy:
 * SUPER_ADMIN > ADMIN > COMPLIANCE_REVIEWER > VIEWER
 */

export enum AdminRole {
  /**
   * SUPER_ADMIN
   * - Platform owner with full system access
   * - Can manage other admin users
   * - Can modify compliance rules
   * - Can access all settings
   * - Should be very limited (1-3 users max)
   */
  SUPER_ADMIN = 'SUPER_ADMIN',

  /**
   * ADMIN
   * - Operations team member
   * - Can approve/reject organizations
   * - Can override compliance decisions
   * - Can suspend products
   * - Cannot manage other admins
   * - Cannot modify rules
   */
  ADMIN = 'ADMIN',

  /**
   * COMPLIANCE_REVIEWER
   * - Document review specialist
   * - Can review and approve/reject documents
   * - Can review compliance queue
   * - Cannot override automated decisions
   * - Cannot modify rules
   * - Read-only access to organizations
   */
  COMPLIANCE_REVIEWER = 'COMPLIANCE_REVIEWER',

  /**
   * VIEWER
   * - Read-only access
   * - Can view audit logs
   * - Can view compliance status
   * - Cannot perform any actions
   * - Used for executives, auditors
   */
  VIEWER = 'VIEWER',
}

/**
 * Admin role hierarchy (higher index = more permissions)
 */
export const ADMIN_ROLE_HIERARCHY: Record<AdminRole, number> = {
  [AdminRole.VIEWER]: 0,
  [AdminRole.COMPLIANCE_REVIEWER]: 1,
  [AdminRole.ADMIN]: 2,
  [AdminRole.SUPER_ADMIN]: 3,
};

/**
 * Check if one role has higher or equal privilege than another
 */
export function isRoleAtLeast(userRole: AdminRole, requiredRole: AdminRole): boolean {
  return ADMIN_ROLE_HIERARCHY[userRole] >= ADMIN_ROLE_HIERARCHY[requiredRole];
}

/**
 * Get all roles that have at least the specified privilege level
 */
export function getRolesAtLeast(minimumRole: AdminRole): AdminRole[] {
  const minimumLevel = ADMIN_ROLE_HIERARCHY[minimumRole];
  return Object.entries(ADMIN_ROLE_HIERARCHY)
    .filter(([, level]) => level >= minimumLevel)
    .map(([role]) => role as AdminRole);
}

/**
 * Role display names for UI
 */
export const ADMIN_ROLE_DISPLAY_NAMES: Record<AdminRole, string> = {
  [AdminRole.SUPER_ADMIN]: 'Super Administrator',
  [AdminRole.ADMIN]: 'Administrator',
  [AdminRole.COMPLIANCE_REVIEWER]: 'Compliance Reviewer',
  [AdminRole.VIEWER]: 'Viewer',
};

/**
 * Role descriptions for UI tooltips
 */
export const ADMIN_ROLE_DESCRIPTIONS: Record<AdminRole, string> = {
  [AdminRole.SUPER_ADMIN]: 'Full platform access including admin user management and rule configuration',
  [AdminRole.ADMIN]: 'Operations access including organization and product management',
  [AdminRole.COMPLIANCE_REVIEWER]: 'Document review and compliance queue management',
  [AdminRole.VIEWER]: 'Read-only access to platform data and audit logs',
};
