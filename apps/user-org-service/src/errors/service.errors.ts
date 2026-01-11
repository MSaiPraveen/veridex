/**
 * Custom error classes for user-org-service
 */

export class ServiceError extends Error {
  constructor(
    message: string,
    public statusCode: number = 400,
    public code: string = 'SERVICE_ERROR'
  ) {
    super(message);
    this.name = 'ServiceError';
  }
}

export class NotFoundError extends ServiceError {
  constructor(resource: string, id?: string) {
    super(
      id ? `${resource} with ID ${id} not found` : `${resource} not found`,
      404,
      'NOT_FOUND'
    );
    this.name = 'NotFoundError';
  }
}

export class ConflictError extends ServiceError {
  constructor(message: string) {
    super(message, 409, 'CONFLICT');
    this.name = 'ConflictError';
  }
}

export class ValidationError extends ServiceError {
  constructor(
    message: string,
    public errors: Record<string, string[]> = {}
  ) {
    super(message, 400, 'VALIDATION_ERROR');
    this.name = 'ValidationError';
  }
}

export class ForbiddenError extends ServiceError {
  constructor(message = 'You do not have permission to perform this action') {
    super(message, 403, 'FORBIDDEN');
    this.name = 'ForbiddenError';
  }
}

export class UnauthorizedError extends ServiceError {
  constructor(message = 'Authentication required') {
    super(message, 401, 'UNAUTHORIZED');
    this.name = 'UnauthorizedError';
  }
}
