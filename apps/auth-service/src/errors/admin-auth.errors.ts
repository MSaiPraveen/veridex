/**
 * Admin Auth Errors
 * 
 * Custom error types for admin authentication.
 */

export class AdminAuthError extends Error {
  public readonly code: string;
  public readonly statusCode: number;
  
  constructor(code: string, message: string, statusCode: number = 401) {
    super(message);
    this.name = 'AdminAuthError';
    this.code = code;
    this.statusCode = statusCode;
    
    // Set prototype explicitly for instanceof to work
    Object.setPrototypeOf(this, AdminAuthError.prototype);
  }
  
  toJSON() {
    return {
      success: false,
      error: {
        code: this.code,
        message: this.message,
      },
    };
  }
}

// Pre-defined error codes
export const AdminAuthErrorCodes = {
  INVALID_CREDENTIALS: 'INVALID_CREDENTIALS',
  ACCOUNT_LOCKED: 'ACCOUNT_LOCKED',
  ACCOUNT_DEACTIVATED: 'ACCOUNT_DEACTIVATED',
  MFA_REQUIRED: 'MFA_REQUIRED',
  MFA_SETUP_REQUIRED: 'MFA_SETUP_REQUIRED',
  MFA_ALREADY_ENABLED: 'MFA_ALREADY_ENABLED',
  INVALID_MFA_CODE: 'INVALID_MFA_CODE',
  INVALID_MFA_SESSION: 'INVALID_MFA_SESSION',
  MFA_SETUP_NOT_FOUND: 'MFA_SETUP_NOT_FOUND',
  MFA_SETUP_EXPIRED: 'MFA_SETUP_EXPIRED',
  INVALID_TOKEN: 'INVALID_TOKEN',
  INVALID_REFRESH_TOKEN: 'INVALID_REFRESH_TOKEN',
  SESSION_INVALID: 'SESSION_INVALID',
  SESSION_REVOKED: 'SESSION_REVOKED',
  SESSION_TIMEOUT: 'SESSION_TIMEOUT',
  MFA_NOT_VERIFIED: 'MFA_NOT_VERIFIED',
  ADMIN_NOT_FOUND: 'ADMIN_NOT_FOUND',
  ADMIN_NOT_ACTIVE: 'ADMIN_NOT_ACTIVE',
  RATE_LIMITED: 'RATE_LIMITED',
  IP_NOT_ALLOWED: 'IP_NOT_ALLOWED',
  PERMISSION_DENIED: 'PERMISSION_DENIED',
} as const;
