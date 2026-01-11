/**
 * Custom error classes for auth-service
 * These errors are caught by the error handler and returned with proper HTTP status codes
 */

export class AuthError extends Error {
  constructor(
    message: string,
    public statusCode: number = 400,
    public code: string = 'AUTH_ERROR'
  ) {
    super(message);
    this.name = 'AuthError';
  }
}

export class InvalidCredentialsError extends AuthError {
  constructor(message = 'Invalid email or password') {
    super(message, 401, 'INVALID_CREDENTIALS');
    this.name = 'InvalidCredentialsError';
  }
}

export class UserNotFoundError extends AuthError {
  constructor(message = 'User not found') {
    super(message, 404, 'USER_NOT_FOUND');
    this.name = 'UserNotFoundError';
  }
}

export class UserExistsError extends AuthError {
  constructor(message = 'User with this email already exists') {
    super(message, 409, 'USER_EXISTS');
    this.name = 'UserExistsError';
  }
}

export class AccountLockedError extends AuthError {
  constructor(message = 'Account is temporarily locked. Please try again later') {
    super(message, 423, 'ACCOUNT_LOCKED');
    this.name = 'AccountLockedError';
  }
}

export class AccountDisabledError extends AuthError {
  constructor(message = 'Account is disabled. Please contact support') {
    super(message, 403, 'ACCOUNT_DISABLED');
    this.name = 'AccountDisabledError';
  }
}

export class InvalidTokenError extends AuthError {
  constructor(message = 'Invalid or expired token') {
    super(message, 401, 'INVALID_TOKEN');
    this.name = 'InvalidTokenError';
  }
}

export class TokenExpiredError extends AuthError {
  constructor(message = 'Token has expired') {
    super(message, 401, 'TOKEN_EXPIRED');
    this.name = 'TokenExpiredError';
  }
}

export class ValidationError extends AuthError {
  constructor(
    message: string,
    public errors: Record<string, string[]> = {}
  ) {
    super(message, 400, 'VALIDATION_ERROR');
    this.name = 'ValidationError';
  }
}
