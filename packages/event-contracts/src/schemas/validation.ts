/**
 * Event Validation Utilities
 * Provides type-safe validation for publishing and consuming events
 */
import { z, ZodSchema, ZodError } from 'zod';

/**
 * Result of event validation
 */
export type EventValidationResult<T> = 
  | { success: true; data: T }
  | { success: false; error: EventValidationError };

/**
 * Structured error for failed validation
 */
export interface EventValidationError {
  code: 'EVENT_VALIDATION_ERROR';
  message: string;
  topic?: string;
  details: Array<{
    path: string;
    message: string;
    code: string;
  }>;
}

/**
 * Format Zod error into structured event validation error
 */
export function formatEventError(error: ZodError, topic?: string): EventValidationError {
  return {
    code: 'EVENT_VALIDATION_ERROR',
    message: `Event validation failed${topic ? ` for topic: ${topic}` : ''}`,
    topic,
    details: error.errors.map(e => ({
      path: e.path.join('.'),
      message: e.message,
      code: e.code,
    })),
  };
}

/**
 * Validate event data before publishing
 * Throws on validation failure for fail-fast behavior
 */
export function validateEventForPublish<T extends ZodSchema>(
  schema: T,
  data: unknown,
  topic?: string
): z.infer<T> {
  try {
    return schema.parse(data);
  } catch (error) {
    if (error instanceof ZodError) {
      const validationError = formatEventError(error, topic);
      console.error('[EVENT_PUBLISH_ERROR]', JSON.stringify(validationError));
      throw new Error(`Event validation failed: ${validationError.message}`);
    }
    throw error;
  }
}

/**
 * Safely validate event data when consuming
 * Returns result object for graceful error handling
 */
export function validateEventForConsume<T extends ZodSchema>(
  schema: T,
  data: unknown,
  topic?: string
): EventValidationResult<z.infer<T>> {
  const result = schema.safeParse(data);
  
  if (result.success) {
    return { success: true, data: result.data };
  }
  
  const error = formatEventError(result.error, topic);
  console.warn('[EVENT_CONSUME_VALIDATION_ERROR]', JSON.stringify(error));
  return { success: false, error };
}

/**
 * Create a typed event publisher that validates before sending
 */
export function createTypedPublisher<T extends ZodSchema>(
  schema: T,
  topic: string,
  publishFn: (topic: string, data: z.infer<T>) => Promise<void>
) {
  return async (data: z.infer<T>): Promise<void> => {
    const validated = validateEventForPublish(schema, data, topic);
    await publishFn(topic, validated);
  };
}

/**
 * Create a typed event consumer that validates incoming data
 */
export function createTypedConsumer<T extends ZodSchema>(
  schema: T,
  topic: string,
  handler: (data: z.infer<T>) => Promise<void>,
  onValidationError?: (error: EventValidationError, rawData: unknown) => void
) {
  return async (rawData: unknown): Promise<void> => {
    const result = validateEventForConsume(schema, rawData, topic);
    
    if (result.success) {
      await handler(result.data);
    } else {
      if (onValidationError) {
        onValidationError(result.error, rawData);
      } else {
        // Default: log and skip invalid events
        console.error(`[INVALID_EVENT] Topic: ${topic}`, result.error);
      }
    }
  };
}

/**
 * Add timestamp to event if not present
 */
export function withTimestamp<T extends Record<string, unknown>>(event: T): T & { timestamp: string } {
  return {
    ...event,
    timestamp: event.timestamp || new Date().toISOString(),
  } as T & { timestamp: string };
}

/**
 * Add event ID to event if not present
 */
export function withEventId<T extends Record<string, unknown>>(event: T): T & { eventId: string } {
  return {
    ...event,
    eventId: event.eventId || crypto.randomUUID(),
  } as T & { eventId: string };
}

/**
 * Add standard metadata to an event
 */
export function enrichEvent<T extends Record<string, unknown>>(
  event: T,
  source?: string,
  correlationId?: string
): T & { eventId: string; timestamp: string; source?: string; correlationId?: string } {
  return {
    ...event,
    eventId: (event.eventId as string) || crypto.randomUUID(),
    timestamp: (event.timestamp as string) || new Date().toISOString(),
    source: source || event.source,
    correlationId: correlationId || event.correlationId,
  } as T & { eventId: string; timestamp: string; source?: string; correlationId?: string };
}
