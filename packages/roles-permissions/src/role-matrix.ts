import { Role } from './roles';
import { Permission } from './permissions';

export const RolePermissions: Record<Role, Permission[]> = {
  [Role.CONSUMER]: [
    Permission.VIEW_PRODUCTS,
    Permission.VIEW_DOCUMENTS,
    Permission.VIEW_COMPLIANCE,
    Permission.VIEW_NOTIFICATIONS,
  ],

  [Role.MERCHANT]: [
    // Products
    Permission.VIEW_PRODUCTS,
    Permission.CREATE_PRODUCTS,
    Permission.UPDATE_PRODUCTS,
    Permission.MANAGE_PRODUCTS,
    // Documents
    Permission.VIEW_DOCUMENTS,
    Permission.UPLOAD_DOCUMENTS,
    Permission.UPDATE_DOCUMENTS,
    Permission.DELETE_DOCUMENTS,
    // Compliance
    Permission.VIEW_COMPLIANCE,
    Permission.CREATE_COMPLIANCE,
    Permission.UPDATE_COMPLIANCE,
    // Notifications
    Permission.VIEW_NOTIFICATIONS,
    // Settings
    Permission.VIEW_SETTINGS,
    Permission.UPDATE_SETTINGS,
  ],

  [Role.ADMIN]: [
    // Products
    Permission.VIEW_PRODUCTS,
    Permission.CREATE_PRODUCTS,
    Permission.UPDATE_PRODUCTS,
    Permission.DELETE_PRODUCTS,
    Permission.MANAGE_PRODUCTS,
    Permission.VERIFY_PRODUCTS,
    // Documents
    Permission.VIEW_DOCUMENTS,
    Permission.UPLOAD_DOCUMENTS,
    Permission.UPDATE_DOCUMENTS,
    Permission.DELETE_DOCUMENTS,
    Permission.VERIFY_DOCUMENTS,
    // Compliance
    Permission.VIEW_COMPLIANCE,
    Permission.CREATE_COMPLIANCE,
    Permission.UPDATE_COMPLIANCE,
    Permission.REVIEW_COMPLIANCE,
    // Rules
    Permission.VIEW_RULES,
    Permission.CREATE_RULES,
    Permission.UPDATE_RULES,
    Permission.DELETE_RULES,
    Permission.MANAGE_RULES,
    // Audits
    Permission.VIEW_AUDITS,
    Permission.CREATE_AUDITS,
    Permission.EXPORT_AUDITS,
    // Users
    Permission.VIEW_USERS,
    Permission.CREATE_USERS,
    Permission.UPDATE_USERS,
    Permission.DELETE_USERS,
    Permission.MANAGE_USERS,
    // Organizations
    Permission.VIEW_ORGANIZATIONS,
    Permission.CREATE_ORGANIZATIONS,
    Permission.UPDATE_ORGANIZATIONS,
    Permission.DELETE_ORGANIZATIONS,
    Permission.MANAGE_ORGANIZATIONS,
    // Notifications
    Permission.VIEW_NOTIFICATIONS,
    Permission.CREATE_NOTIFICATIONS,
    Permission.UPDATE_NOTIFICATIONS,
    // Settings
    Permission.VIEW_SETTINGS,
    Permission.UPDATE_SETTINGS,
    // Admin
    Permission.ADMIN_ACCESS,
  ],
};
