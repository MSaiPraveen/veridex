import { z, ZodError, ZodSchema } from 'zod';
import { FastifyRequest, FastifyReply, FastifyInstance } from 'fastify';
import fp from 'fastify-plugin';

// Standard error response shape
export interface ValidationErrorResponse {
  success: false;
  error: {
    code: 'VALIDATION_ERROR';
    message: string;
    details: Array<{
      path: string;
      message: string;
      code: string;
    }>;
  };
}

/**
 * Format Zod errors into a consistent structure
 */
export function formatZodError(error: ZodError): ValidationErrorResponse {
  return {
    success: false,
    error: {
      code: 'VALIDATION_ERROR',
      message: 'Request validation failed',
      details: error.errors.map((e) => ({
        path: e.path.join('.'),
        message: e.message,
        code: e.code,
      })),
    },
  };
}

/**
 * Validation schema configuration for a route
 */
export interface ValidationSchema {
  body?: ZodSchema;
  params?: ZodSchema;
  query?: ZodSchema;
  headers?: ZodSchema;
}

/**
 * Creates a preValidation hook that validates request parts
 */
export function validateRequest(schema: ValidationSchema) {
  return async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      // Validate body
      if (schema.body) {
        request.body = schema.body.parse(request.body);
      }

      // Validate params
      if (schema.params) {
        request.params = schema.params.parse(request.params);
      }

      // Validate query
      if (schema.query) {
        request.query = schema.query.parse(request.query);
      }

      // Validate headers (typically for auth context)
      if (schema.headers) {
        const headerValidation = schema.headers.safeParse(request.headers);
        if (!headerValidation.success) {
          return reply.status(400).send(formatZodError(headerValidation.error));
        }
      }
    } catch (error) {
      if (error instanceof ZodError) {
        return reply.status(400).send(formatZodError(error));
      }
      throw error;
    }
  };
}

/**
 * Validate and parse data with a schema
 * Returns typed result or throws
 */
export function validate<T extends ZodSchema>(
  schema: T,
  data: unknown
): z.infer<T> {
  return schema.parse(data);
}

/**
 * Safe validation - returns result object instead of throwing
 */
export function safeValidate<T extends ZodSchema>(
  schema: T,
  data: unknown
): { success: true; data: z.infer<T> } | { success: false; error: ValidationErrorResponse } {
  const result = schema.safeParse(data);
  if (result.success) {
    return { success: true, data: result.data };
  }
  return { success: false, error: formatZodError(result.error) };
}

// ================== AUTH CONTEXT VALIDATION ==================

/**
 * Schema for auth context headers from gateway
 */
export const authContextSchema = z.object({
  'x-user-id': z.string().min(1),
  'x-user-role': z.enum(['ADMIN', 'MERCHANT', 'CONSUMER']),
  'x-user-email': z.string().email().optional(),
  'x-organization-id': z.string().optional(),
  'x-request-id': z.string().optional(),
});

export type AuthContext = z.infer<typeof authContextSchema>;

/**
 * Validate auth context from headers
 */
export function validateAuthContext(headers: Record<string, unknown>): AuthContext | null {
  const result = authContextSchema.safeParse(headers);
  return result.success ? result.data : null;
}

// ================== COMMON SCHEMAS ==================

/**
 * Pagination query schema
 */
export const paginationSchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
  sortBy: z.string().optional(),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
});

export type PaginationInput = z.infer<typeof paginationSchema>;

/**
 * MongoDB ObjectId schema
 */
export const objectIdSchema = z.string().regex(
  /^[a-fA-F0-9]{24}$/,
  'Invalid ObjectId format'
);

/**
 * ID param schema
 */
export const idParamSchema = z.object({
  id: objectIdSchema,
});

/**
 * Date range query schema
 */
export const dateRangeSchema = z.object({
  startDate: z.coerce.date().optional(),
  endDate: z.coerce.date().optional(),
}).refine(
  (data) => {
    if (data.startDate && data.endDate) {
      return data.startDate <= data.endDate;
    }
    return true;
  },
  { message: 'Start date must be before end date' }
);

// ================== RESPONSE HELPERS ==================

/**
 * Standard success response
 */
export function successResponse<T>(data: T) {
  return { success: true as const, data };
}

/**
 * Standard paginated response
 */
export function paginatedResponse<T>(
  data: T[],
  total: number,
  page: number,
  limit: number
) {
  return {
    success: true as const,
    data,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
      hasMore: page * limit < total,
    },
  };
}

/**
 * Standard error response
 */
export function errorResponse(code: string, message: string, details?: unknown) {
  const response: { success: false; error: { code: string; message: string; details?: unknown } } = {
    success: false as const,
    error: { code, message },
  };
  if (details !== undefined) {
    response.error.details = details;
  }
  return response;
}

// ================== PLUGIN ==================

/**
 * Fastify plugin to add validation helpers to the instance
 */
async function validationPlugin(app: FastifyInstance) {
  // Add validation helpers to the app
  app.decorate('validate', validate);
  app.decorate('safeValidate', safeValidate);
  app.decorate('validateRequest', validateRequest);

  // Add Zod error handler
  app.setErrorHandler((error, request, reply) => {
    if (error instanceof ZodError) {
      return reply.status(400).send(formatZodError(error));
    }

    // Pass to default handler
    throw error;
  });
}

export default fp(validationPlugin, {
  name: 'validation-plugin',
});

// Also export as named export
export { validationPlugin };

// Type augmentation for Fastify
declare module 'fastify' {
  interface FastifyInstance {
    validate: typeof validate;
    safeValidate: typeof safeValidate;
    validateRequest: typeof validateRequest;
  }
}
