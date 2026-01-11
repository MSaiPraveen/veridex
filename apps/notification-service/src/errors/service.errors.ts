export class AppError extends Error {
  constructor(
    public readonly statusCode: number,
    message: string,
    public readonly code?: string
  ) {
    super(message);
    this.name = 'AppError';
  }
}

export class NotFoundError extends AppError {
  constructor(resource: string, identifier?: string) {
    const message = identifier
      ? `${resource} with identifier '${identifier}' not found`
      : `${resource} not found`;
    super(404, message, 'NOT_FOUND');
    this.name = 'NotFoundError';
  }
}

export class ValidationError extends AppError {
  constructor(message: string) {
    super(400, message, 'VALIDATION_ERROR');
    this.name = 'ValidationError';
  }
}

export class ConflictError extends AppError {
  constructor(message: string) {
    super(409, message, 'CONFLICT');
    this.name = 'ConflictError';
  }
}

export class UnauthorizedError extends AppError {
  constructor(message = 'Unauthorized') {
    super(401, message, 'UNAUTHORIZED');
    this.name = 'UnauthorizedError';
  }
}

export class ForbiddenError extends AppError {
  constructor(message = 'Forbidden') {
    super(403, message, 'FORBIDDEN');
    this.name = 'ForbiddenError';
  }
}

export class NotificationDeliveryError extends AppError {
  constructor(channel: string, message: string) {
    super(500, `Failed to deliver notification via ${channel}: ${message}`, 'DELIVERY_ERROR');
    this.name = 'NotificationDeliveryError';
  }
}

export class TemplateNotFoundError extends AppError {
  constructor(templateId: string) {
    super(404, `Template '${templateId}' not found`, 'TEMPLATE_NOT_FOUND');
    this.name = 'TemplateNotFoundError';
  }
}

export class RateLimitExceededError extends AppError {
  constructor(userId: string) {
    super(429, `Rate limit exceeded for user '${userId}'`, 'RATE_LIMIT_EXCEEDED');
    this.name = 'RateLimitExceededError';
  }
}
