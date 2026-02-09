/**
 * Admin RBAC Types & Hooks
 * 
 * Frontend types and utilities for admin RBAC.
 * IMPORTANT: These are for UI display only - backend enforces all permissions.
 */

// Admin Roles - Must match backend roles from auth-service
export enum AdminRole {
  SUPER_ADMIN = 'SUPER_ADMIN',
  ADMIN = 'ADMIN',
  COMPLIANCE_REVIEWER = 'COMPLIANCE_REVIEWER',
  VIEWER = 'VIEWER',
}

// Admin Permissions
export enum AdminPermission {
  // Organization
  ORG_READ = 'org.read',
  ORG_REVIEW = 'org.review',
  ORG_APPROVE = 'org.approve',
  ORG_REJECT = 'org.reject',
  ORG_SUSPEND = 'org.suspend',
  ORG_REACTIVATE = 'org.reactivate',
  
  // Users
  USERS_READ = 'users.read',
  USERS_MANAGE = 'users.manage',
  
  // Document
  DOC_READ = 'doc.read',
  DOC_REVIEW = 'doc.review',
  DOC_APPROVE = 'doc.approve',
  DOC_REJECT = 'doc.reject',
  DOC_OVERRIDE = 'doc.override',
  DOC_REQUEST_RESUBMIT = 'doc.request_resubmit',
  DOC_UPDATE = 'doc.update',
  DOC_LOCK = 'doc.lock',
  
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
  BATCH_QUARANTINE = 'batch.quarantine',
  BATCH_RECALL = 'batch.recall',
  
  // Rules
  RULES_READ = 'rules.read',
  RULES_CREATE = 'rules.create',
  RULES_UPDATE = 'rules.update',
  RULES_ARCHIVE = 'rules.archive',
  RULES_HISTORY = 'rules.history',
  RULES_ROLLBACK = 'rules.rollback',
  
  // Escalations
  ESCALATION_READ = 'escalation.read',
  ESCALATION_ASSIGN = 'escalation.assign',
  ESCALATION_MANAGE = 'escalation.manage',
  
  // Overrides
  OVERRIDE_READ = 'override.read',
  OVERRIDE_CREATE = 'override.create',
  OVERRIDE_APPROVE = 'override.approve',
  
  // Risk
  RISK_READ = 'risk.read',
  RISK_MANAGE = 'risk.manage',
  
  // Regulator
  REGULATOR_READ = 'regulator.read',
  REGULATOR_EXPORT = 'regulator.export',
  
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
  
  // Admin User aliases (for backward compatibility)
  ADMIN_CREATE = 'admin.user.create',
  ADMIN_EDIT = 'admin.user.update',
  ADMIN_READ = 'admin.user.read',
  ADMIN_DEACTIVATE = 'admin.user.deactivate',
  ADMIN_RESET_MFA = 'admin.user.reset_mfa',
  ADMIN_ASSIGN_SUPER = 'admin.user.assign_super',
  
  // Settings
  SETTINGS_READ = 'settings.read',
  SETTINGS_UPDATE = 'settings.update',
  SETTINGS_SECURITY_READ = 'settings.security.read',
  SETTINGS_SECURITY_UPDATE = 'settings.security.update',
  SETTINGS_SECURITY = 'settings.security',
  SETTINGS_API_KEYS = 'settings.api_keys',
  
  // System
  SYSTEM_CONFIG = 'system.config',
  SYSTEM_MANAGE = 'system.manage',
  SYSTEM_ACCESS = 'system.access',
  
  // Notifications
  NOTIFICATIONS_READ = 'notifications.read',
  NOTIFICATIONS_CREATE = 'notifications.create',
  NOTIFICATIONS_MANAGE = 'notifications.manage',
  
  // Reports
  REPORTS_COMPLIANCE = 'reports.compliance',
  REPORTS_ANALYTICS = 'reports.analytics',
  REPORTS_GENERATE = 'reports.generate',
}

// Admin User type
export interface AdminUser {
  id: string;
  email: string;
  firstName?: string;
  lastName?: string;
  name?: string;
  role: AdminRole;
  permissions?: AdminPermission[];
  status?: 'ACTIVE' | 'PENDING_MFA' | 'LOCKED' | 'DEACTIVATED';
  mfaEnabled?: boolean;
  lastLoginAt?: string;
}

// Role display info with Tailwind class names for theming
export const ROLE_DISPLAY_INFO: Record<AdminRole, { label: string; description: string; colorClass: string }> = {
  [AdminRole.SUPER_ADMIN]: {
    label: 'Super Administrator',
    description: 'Full system access with all permissions',
    colorClass: 'text-red-500 dark:text-red-400',
  },
  [AdminRole.ADMIN]: {
    label: 'Administrator',
    description: 'Full platform access - organization, product, and compliance management',
    colorClass: 'text-amber-500 dark:text-amber-400',
  },
  [AdminRole.COMPLIANCE_REVIEWER]: {
    label: 'Compliance Reviewer',
    description: 'Review and approve compliance documents',
    colorClass: 'text-blue-500 dark:text-blue-400',
  },
  [AdminRole.VIEWER]: {
    label: 'Viewer',
    description: 'Read-only access to view data',
    colorClass: 'text-gray-500 dark:text-gray-400',
  },
};

/**
 * Check if user has a specific permission
 * SUPER_ADMIN and ADMIN roles have all permissions
 */
export function hasPermission(
  user: AdminUser | null,
  permission: AdminPermission
): boolean {
  if (!user) return false;
  
  // SUPER_ADMIN and ADMIN have all permissions
  if (user.role === AdminRole.SUPER_ADMIN || user.role === AdminRole.ADMIN) return true;
  
  // Check explicit permissions
  if (user.permissions?.includes(permission)) return true;
  
  // Check wildcard
  if (user.permissions?.includes('*' as AdminPermission)) return true;
  
  return false;
}

/**
 * Check if user has ANY of the specified permissions
 */
export function hasAnyPermission(
  user: AdminUser | null,
  permissions: AdminPermission[]
): boolean {
  return permissions.some(p => hasPermission(user, p));
}

/**
 * Check if user has ALL of the specified permissions
 */
export function hasAllPermissions(
  user: AdminUser | null,
  permissions: AdminPermission[]
): boolean {
  return permissions.every(p => hasPermission(user, p));
}

/**
 * Check if user's role is at least the specified role
 */
export function isRoleAtLeast(
  user: AdminUser | null,
  minimumRole: AdminRole
): boolean {
  if (!user) return false;
  
  const hierarchy: Record<AdminRole, number> = {
    [AdminRole.SUPER_ADMIN]: 4,
    [AdminRole.ADMIN]: 3,
    [AdminRole.COMPLIANCE_REVIEWER]: 2,
    [AdminRole.VIEWER]: 1,
  };
  
  return hierarchy[user.role] >= hierarchy[minimumRole];
}

/**
 * Navigation items with permission requirements
 */
export interface NavItem {
  label: string;
  href: string;
  icon: string;
  permissions?: AdminPermission[];
  roles?: AdminRole[];
  badge?: string;
  children?: NavItem[];
}

export const ADMIN_NAVIGATION: NavItem[] = [
  // Overview
  {
    label: 'Dashboard',
    href: '/dashboard',
    icon: 'LayoutDashboard',
  },
  
  // Operations - Review & Escalations
  {
    label: 'Review Queue',
    href: '/review-queue',
    icon: 'ClipboardCheck',
    permissions: [AdminPermission.DOC_REVIEW],
    badge: 'priority',
  },
  {
    label: 'Escalations',
    href: '/escalations',
    icon: 'AlertOctagon',
    permissions: [AdminPermission.ESCALATION_READ],
    badge: 'count',
  },
  {
    label: 'Alerts',
    href: '/alerts',
    icon: 'AlertTriangle',
    permissions: [AdminPermission.COMPLIANCE_READ],
    badge: 'count',
  },
  
  // Primary Entities
  {
    label: 'Merchants',
    href: '/merchants',
    icon: 'Store',
    permissions: [AdminPermission.ORG_READ],
  },
  {
    label: 'Consumers',
    href: '/consumers',
    icon: 'Users',
    permissions: [AdminPermission.USERS_READ],
  },
  {
    label: 'Organizations',
    href: '/organizations',
    icon: 'Building2',
    permissions: [AdminPermission.ORG_READ],
  },
  {
    label: 'Documents',
    href: '/documents',
    icon: 'FileText',
    permissions: [AdminPermission.DOC_READ],
  },
  {
    label: 'Products',
    href: '/products',
    icon: 'Package',
    permissions: [AdminPermission.PRODUCT_READ],
  },
  {
    label: 'Batches',
    href: '/batches',
    icon: 'Boxes',
    permissions: [AdminPermission.BATCH_READ],
  },
  
  // Risk & Compliance Intelligence
  {
    label: 'Risk Intelligence',
    href: '/risk-intelligence',
    icon: 'TrendingUp',
    permissions: [AdminPermission.RISK_READ],
  },
  {
    label: 'Compliance Queue',
    href: '/compliance-queue',
    icon: 'ShieldCheck',
    permissions: [AdminPermission.COMPLIANCE_READ],
  },
  {
    label: 'Rule Governance',
    href: '/rule-governance',
    icon: 'Scale',
    permissions: [AdminPermission.RULES_READ],
  },
  {
    label: 'Overrides',
    href: '/overrides',
    icon: 'ShieldAlert',
    permissions: [AdminPermission.OVERRIDE_READ],
  },
  
  // Audit & Accountability
  {
    label: 'Audit Logs',
    href: '/audit-logs',
    icon: 'History',
    permissions: [AdminPermission.AUDIT_READ],
  },
  {
    label: 'Regulator Export',
    href: '/regulator-export',
    icon: 'FileOutput',
    permissions: [AdminPermission.REGULATOR_READ],
  },
  
  // System
  {
    label: 'System Operations',
    href: '/system-operations',
    icon: 'Server',
    roles: [AdminRole.ADMIN],
  },
  {
    label: 'System Health',
    href: '/system-health',
    icon: 'Activity',
    roles: [AdminRole.ADMIN],
  },
  {
    label: 'Admin Users',
    href: '/admin-users',
    icon: 'UserCog',
    permissions: [AdminPermission.ADMIN_USER_READ],
  },
  {
    label: 'Settings',
    href: '/settings',
    icon: 'Settings',
    children: [
      {
        label: 'General',
        href: '/settings/general',
        icon: 'Settings',
        permissions: [AdminPermission.SETTINGS_READ],
      },
      {
        label: 'Security',
        href: '/settings/security',
        icon: 'Shield',
        permissions: [AdminPermission.SETTINGS_SECURITY_READ],
      },
    ],
  },
];

/**
 * Get navigation items visible to user
 */
export function getVisibleNavigation(user: AdminUser | null): NavItem[] {
  if (!user) return [];
  
  return ADMIN_NAVIGATION.filter(item => {
    // No permission requirement = visible to all
    if (!item.permissions && !item.roles) return true;
    
    // Check role requirement
    if (item.roles && !item.roles.includes(user.role)) return false;
    
    // Check permission requirement
    if (item.permissions && !hasAnyPermission(user, item.permissions)) return false;
    
    return true;
  }).map(item => ({
    ...item,
    children: item.children?.filter(child => {
      if (!child.permissions && !child.roles) return true;
      if (child.roles && !child.roles.includes(user.role)) return false;
      if (child.permissions && !hasAnyPermission(user, child.permissions)) return false;
      return true;
    }),
  }));
}
