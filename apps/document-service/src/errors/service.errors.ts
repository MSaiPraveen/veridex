/**
 * Custom error classes for document-service
 */

export class ServiceError extends Error {
  public readonly statusCode: number;
  public readonly code: string;

  constructor(message: string, statusCode: number = 500, code: string = 'SERVICE_ERROR') {
    super(message);
    this.name = this.constructor.name;
    this.statusCode = statusCode;
    this.code = code;
    Error.captureStackTrace(this, this.constructor);
  }
}

export class NotFoundError extends ServiceError {
  constructor(message: string = 'Resource not found') {
    super(message, 404, 'NOT_FOUND');
  }
}

export class ConflictError extends ServiceError {
  constructor(message: string = 'Resource already exists') {
    super(message, 409, 'CONFLICT');
  }
}

export class ValidationError extends ServiceError {
  constructor(message: string = 'Validation failed') {
    super(message, 400, 'VALIDATION_ERROR');
  }
}

export class ForbiddenError extends ServiceError {
  constructor(message: string = 'Access forbidden') {
    super(message, 403, 'FORBIDDEN');
  }
}

export class UnauthorizedError extends ServiceError {
  constructor(message: string = 'Authentication required') {
    super(message, 401, 'UNAUTHORIZED');
  }
}

export class FileUploadError extends ServiceError {
  constructor(message: string = 'File upload failed') {
    super(message, 400, 'FILE_UPLOAD_ERROR');
  }
}

export class ExtractionError extends ServiceError {
  constructor(message: string = 'Document extraction failed') {
    super(message, 422, 'EXTRACTION_ERROR');
  }
}
