'use client';

import { ReactNode } from 'react';
import { useAdminAuth, AdminUser } from '@/lib/admin-auth-context';
import { AdminPermission, AdminRole, AdminUser as RBACAdminUser } from '@/lib/admin-rbac';

// Type guard to ensure user matches RBAC expectations
function toRBACUser(user: AdminUser | null): RBACAdminUser | null {
  if (!user) return null;
  return user as unknown as RBACAdminUser;
}

// Permission check functions that work with our user type
function checkPermission(user: AdminUser | null, permission: AdminPermission): boolean {
  if (!user) return false;
  // Any admin user has all permissions (simplified single-admin model)
  if (user.role) return true;
  if (user.permissions?.includes(permission as unknown as string)) return true;
  if (user.permissions?.includes('*')) return true;
  return false;
}

function checkAnyPermission(user: AdminUser | null, permissions: AdminPermission[]): boolean {
  return permissions.some(p => checkPermission(user, p));
}

function checkAllPermissions(user: AdminUser | null, permissions: AdminPermission[]): boolean {
  return permissions.every(p => checkPermission(user, p));
}

function checkRoleAtLeast(user: AdminUser | null, minimumRole: AdminRole): boolean {
  if (!user) return false;
  const hierarchy: Record<string, number> = {
    [AdminRole.ADMIN]: 1,
  };
  return (hierarchy[user.role] ?? -1) >= (hierarchy[minimumRole] ?? 999);
}

interface PermissionGateProps {
  children: ReactNode;
  /** Permission(s) required - if array, ANY permission grants access */
  permission?: AdminPermission | AdminPermission[];
  /** Alias for permission (plural form) */
  permissions?: AdminPermission[];
  /** If true, ALL permissions in array are required */
  requireAll?: boolean;
  /** Minimum role required */
  role?: AdminRole;
  /** Fallback to render if permission denied */
  fallback?: ReactNode;
  /** If true, renders nothing on denied (default: true) */
  hideOnDenied?: boolean;
}

/**
 * PermissionGate Component
 * 
 * Conditionally renders children based on admin permissions.
 * IMPORTANT: This is for UX only - backend always enforces permissions.
 * 
 * @example
 * // Single permission
 * <PermissionGate permission={AdminPermission.ORG_APPROVE}>
 *   <ApproveButton />
 * </PermissionGate>
 * 
 * @example
 * // Any of multiple permissions
 * <PermissionGate permission={[AdminPermission.ORG_APPROVE, AdminPermission.ORG_REJECT]}>
 *   <ReviewActions />
 * </PermissionGate>
 * 
 * @example
 * // All permissions required
 * <PermissionGate permission={[AdminPermission.DOC_READ, AdminPermission.DOC_OVERRIDE]} requireAll>
 *   <OverrideButton />
 * </PermissionGate>
 * 
 * @example
 * // Role-based
 * <PermissionGate role={AdminRole.ADMIN}>
 *   <AdminSettings />
 * </PermissionGate>
 */
export function PermissionGate({
  children,
  permission,
  permissions,
  requireAll = false,
  role,
  fallback = null,
  hideOnDenied = true,
}: PermissionGateProps) {
  const { user } = useAdminAuth();
  
  // Merge permission and permissions props
  const effectivePermission = permission || permissions;
  
  // Check role requirement
  if (role && !checkRoleAtLeast(user, role)) {
    return hideOnDenied ? null : <>{fallback}</>;
  }
  
  // Check permission requirement
  if (effectivePermission) {
    const permissionList = Array.isArray(effectivePermission) ? effectivePermission : [effectivePermission];
    
    const hasAccess = requireAll
      ? checkAllPermissions(user, permissionList)
      : checkAnyPermission(user, permissionList);
    
    if (!hasAccess) {
      return hideOnDenied ? null : <>{fallback}</>;
    }
  }
  
  return <>{children}</>;
}

/**
 * Hook to check permissions in components
 */
export function usePermission(permission: AdminPermission): boolean {
  const { user } = useAdminAuth();
  return checkPermission(user, permission);
}

/**
 * Hook to check multiple permissions
 */
export function usePermissions(permissions: AdminPermission[], requireAll = false): boolean {
  const { user } = useAdminAuth();
  return requireAll
    ? checkAllPermissions(user, permissions)
    : checkAnyPermission(user, permissions);
}

/**
 * Hook to check role
 */
export function useRole(minimumRole: AdminRole): boolean {
  const { user } = useAdminAuth();
  return checkRoleAtLeast(user, minimumRole);
}

/**
 * Hook to get all permission checks at once
 */
export function useAdminPermissions() {
  const { user } = useAdminAuth();
  
  // Helper functions bound to current user
  const hasPermission = (permission: AdminPermission) => checkPermission(user, permission);
  const hasAnyPermission = (permissions: AdminPermission[]) => checkAnyPermission(user, permissions);
  const hasAllPermissions = (permissions: AdminPermission[]) => checkAllPermissions(user, permissions);
  const isRoleAtLeast = (minimumRole: AdminRole) => checkRoleAtLeast(user, minimumRole);
  
  return {
    // User and role
    user,
    role: user?.role || null,
    
    // Permission checking functions
    hasPermission,
    hasAnyPermission,
    hasAllPermissions,
    isRoleAtLeast,
    
    // Organization
    canViewOrganizations: checkPermission(user, AdminPermission.ORG_READ),
    canReviewOrganizations: checkPermission(user, AdminPermission.ORG_REVIEW),
    canApproveOrganizations: checkPermission(user, AdminPermission.ORG_APPROVE),
    canSuspendOrganizations: checkPermission(user, AdminPermission.ORG_SUSPEND),
    
    // Documents
    canViewDocuments: checkPermission(user, AdminPermission.DOC_READ),
    canReviewDocuments: checkPermission(user, AdminPermission.DOC_REVIEW),
    canApproveDocuments: checkPermission(user, AdminPermission.DOC_APPROVE),
    canOverrideDocuments: checkPermission(user, AdminPermission.DOC_OVERRIDE),
    
    // Compliance
    canViewCompliance: checkPermission(user, AdminPermission.COMPLIANCE_READ),
    canReviewCompliance: checkPermission(user, AdminPermission.COMPLIANCE_REVIEW),
    canApproveCompliance: checkPermission(user, AdminPermission.COMPLIANCE_APPROVE),
    canOverrideCompliance: checkPermission(user, AdminPermission.COMPLIANCE_OVERRIDE),
    
    // Products
    canViewProducts: checkPermission(user, AdminPermission.PRODUCT_READ),
    canReviewProducts: checkPermission(user, AdminPermission.PRODUCT_REVIEW),
    canSuspendProducts: checkPermission(user, AdminPermission.PRODUCT_SUSPEND),
    
    // Batches
    canViewBatches: checkPermission(user, AdminPermission.BATCH_READ),
    canReviewBatches: checkPermission(user, AdminPermission.BATCH_REVIEW),
    canApproveBatches: checkPermission(user, AdminPermission.BATCH_APPROVE),
    
    // Rules
    canViewRules: checkPermission(user, AdminPermission.RULES_READ),
    canCreateRules: checkPermission(user, AdminPermission.RULES_CREATE),
    canUpdateRules: checkPermission(user, AdminPermission.RULES_UPDATE),
    
    // Audit
    canViewAudit: checkPermission(user, AdminPermission.AUDIT_READ),
    canExportAudit: checkPermission(user, AdminPermission.AUDIT_EXPORT),
    canViewSensitiveAudit: checkPermission(user, AdminPermission.AUDIT_SENSITIVE),
    
    // Admin Users
    canViewAdminUsers: checkPermission(user, AdminPermission.ADMIN_USER_READ),
    canManageAdminUsers: checkPermission(user, AdminPermission.ADMIN_USER_CREATE),
    
    // Settings
    canViewSettings: checkPermission(user, AdminPermission.SETTINGS_READ),
    canUpdateSettings: checkPermission(user, AdminPermission.SETTINGS_UPDATE),
    canManageSecurity: checkPermission(user, AdminPermission.SETTINGS_SECURITY_UPDATE),
    
    // Role checks
    isAdmin: checkRoleAtLeast(user, AdminRole.ADMIN),
  };
}
