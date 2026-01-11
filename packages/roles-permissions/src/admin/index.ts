/**
 * Admin RBAC System
 * 
 * This module defines the complete Role-Based Access Control system
 * for the Veridex Admin Platform.
 * 
 * CRITICAL: Admin roles and permissions are COMPLETELY SEPARATE
 * from public user roles. Never mix or share between systems.
 */

export * from './admin-roles';
export * from './admin-permissions';
export * from './admin-role-matrix';
export * from './admin-types';
export * from './admin-guards';
