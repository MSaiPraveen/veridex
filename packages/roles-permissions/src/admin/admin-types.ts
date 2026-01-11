/**
 * Admin Type Definitions
 * 
 * TypeScript types for the admin authentication and authorization system.
 */

import { AdminRole } from './admin-roles';
import { AdminPermission } from './admin-permissions';

/**
 * Admin JWT Token Payload
 * 
 * CRITICAL: These claims are verified at the Admin API Gateway.
 * - iss MUST be 'ADMIN_AUTH'
 * - aud MUST be 'ADMIN_API'
 * - mfaVerified MUST be true
 */
export interface AdminJWTPayload {
  /** Subject - Admin user ID */
  sub: string;
  
  /** Explicit admin ID (same as sub, for clarity) */
  adminId: string;
  
  /** Admin email */
  email: string;
  
  /** Admin display name */
  name?: string;
  
  /** Admin role */
  role: AdminRole;
  
  /** Array of permissions (derived from role) */
  permissions: AdminPermission[];
  
  /** Token issuer - MUST be 'ADMIN_AUTH' */
  iss: 'ADMIN_AUTH';
  
  /** Token audience - MUST be 'ADMIN_API' */
  aud: 'ADMIN_API';
  
  /** Issued at timestamp */
  iat: number;
  
  /** Expiration timestamp */
  exp: number;
  
  /** Session ID for revocation */
  sessionId: string;
  
  /** MFA verification status - MUST be true */
  mfaVerified: boolean;
  
  /** IP address at authentication */
  ipAddress?: string;
  
  /** Device fingerprint */
  deviceId?: string;
}

/**
 * Admin user record in database
 */
export interface AdminUser {
  /** MongoDB ObjectId as string */
  id: string;
  
  /** Admin email (unique) */
  email: string;
  
  /** First name */
  firstName: string;
  
  /** Last name */
  lastName: string;
  
  /** Admin role */
  role: AdminRole;
  
  /** Account status */
  status: AdminUserStatus;
  
  /** MFA enabled flag */
  mfaEnabled: boolean;
  
  /** MFA secret (encrypted, for TOTP) */
  mfaSecret?: string;
  
  /** MFA backup codes (encrypted) */
  mfaBackupCodes?: string[];
  
  /** IP whitelist (optional) */
  allowedIPs?: string[];
  
  /** Last login timestamp */
  lastLoginAt?: Date;
  
  /** Last login IP */
  lastLoginIP?: string;
  
  /** Failed login attempts (for lockout) */
  failedLoginAttempts: number;
  
  /** Lockout expiry time */
  lockedUntil?: Date;
  
  /** Created by admin ID */
  createdBy: string;
  
  /** Created at timestamp */
  createdAt: Date;
  
  /** Updated at timestamp */
  updatedAt: Date;
  
  /** Deactivated at timestamp (soft delete) */
  deactivatedAt?: Date;
  
  /** Deactivated by admin ID */
  deactivatedBy?: string;
}

/**
 * Admin user account status
 */
export enum AdminUserStatus {
  /** Active and can log in */
  ACTIVE = 'ACTIVE',
  
  /** MFA setup required */
  PENDING_MFA = 'PENDING_MFA',
  
  /** Temporarily locked due to failed attempts */
  LOCKED = 'LOCKED',
  
  /** Deactivated by super admin */
  DEACTIVATED = 'DEACTIVATED',
}

/**
 * Admin session record
 */
export interface AdminSession {
  /** Session ID */
  id: string;
  
  /** Admin user ID */
  adminId: string;
  
  /** Session token hash */
  tokenHash: string;
  
  /** IP address */
  ipAddress: string;
  
  /** User agent string */
  userAgent: string;
  
  /** Device fingerprint */
  deviceId?: string;
  
  /** MFA verified at timestamp */
  mfaVerifiedAt?: Date;
  
  /** Created at timestamp */
  createdAt: Date;
  
  /** Last activity timestamp */
  lastActivityAt: Date;
  
  /** Expires at timestamp */
  expiresAt: Date;
  
  /** Revoked flag */
  revoked: boolean;
  
  /** Revoked at timestamp */
  revokedAt?: Date;
  
  /** Revoked reason */
  revokedReason?: string;
}

/**
 * Admin authentication request
 */
export interface AdminLoginRequest {
  /** Email address */
  email: string;
  
  /** Password */
  password: string;
  
  /** MFA code (optional for step 1) */
  mfaCode?: string;
  
  /** Device fingerprint */
  deviceId?: string;
}

/**
 * Admin authentication response
 */
export interface AdminLoginResponse {
  /** Success flag */
  success: boolean;
  
  /** Requires MFA flag */
  requiresMfa?: boolean;
  
  /** MFA session token (for step 2) */
  mfaSessionToken?: string;
  
  /** Access token (after MFA) */
  accessToken?: string;
  
  /** Refresh token (after MFA) */
  refreshToken?: string;
  
  /** Admin user (after MFA) */
  admin?: Omit<AdminUser, 'mfaSecret' | 'mfaBackupCodes'>;
  
  /** Error message */
  error?: string;
}

/**
 * Admin action context for audit logging
 */
export interface AdminActionContext {
  /** Admin user ID */
  adminId: string;
  
  /** Admin role */
  role: AdminRole;
  
  /** Session ID */
  sessionId: string;
  
  /** IP address */
  ipAddress: string;
  
  /** User agent */
  userAgent: string;
  
  /** Request ID (for correlation) */
  requestId: string;
}

/**
 * Permission check result
 */
export interface PermissionCheckResult {
  /** Allowed flag */
  allowed: boolean;
  
  /** Required permission */
  requiredPermission: AdminPermission;
  
  /** User's permissions */
  userPermissions: AdminPermission[];
  
  /** Reason (if denied) */
  reason?: string;
}

/**
 * Route permission requirement
 */
export interface RoutePermission {
  /** Route path pattern */
  path: string;
  
  /** HTTP method */
  method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  
  /** Required permissions (any of) */
  anyOf?: AdminPermission[];
  
  /** Required permissions (all of) */
  allOf?: AdminPermission[];
  
  /** Description for audit */
  description: string;
}
