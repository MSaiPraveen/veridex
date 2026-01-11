/**
 * Auth Event Schemas - Runtime validation with Zod
 * Use these schemas to validate events before publishing and after consuming
 */
import { z } from 'zod';

// ================== BASE EVENT SCHEMA ==================

/**
 * Base schema for all events - includes common metadata
 */
export const baseEventSchema = z.object({
  eventId: z.string().uuid().optional(),
  timestamp: z.string().datetime(),
  correlationId: z.string().optional(),
  source: z.string().optional(),
});

// ================== AUTH EVENTS ==================

/**
 * Schema for user registration event
 */
export const authUserRegisteredEventSchema = baseEventSchema.extend({
  userId: z.string().min(1),
  email: z.string().email(),
  role: z.enum(['ADMIN', 'MERCHANT', 'CONSUMER']),
  firstName: z.string().optional(),
  lastName: z.string().optional(),
  organizationId: z.string().optional(),
  companyName: z.string().optional(),
  industry: z.string().optional(),
});

export type AuthUserRegisteredEvent = z.infer<typeof authUserRegisteredEventSchema>;

/**
 * Schema for user login event
 */
export const authUserLoggedInEventSchema = baseEventSchema.extend({
  userId: z.string().min(1),
  email: z.string().email().optional(),
  ipAddress: z.string().ip().optional(),
  userAgent: z.string().max(500).optional(),
  sessionId: z.string().optional(),
});

export type AuthUserLoggedInEvent = z.infer<typeof authUserLoggedInEventSchema>;

/**
 * Schema for user logout event
 */
export const authUserLoggedOutEventSchema = baseEventSchema.extend({
  userId: z.string().min(1),
  sessionId: z.string().optional(),
  allDevices: z.boolean().default(false),
  reason: z.enum(['user_initiated', 'session_expired', 'forced', 'password_changed']).optional(),
});

export type AuthUserLoggedOutEvent = z.infer<typeof authUserLoggedOutEventSchema>;

/**
 * Schema for password changed event
 */
export const authPasswordChangedEventSchema = baseEventSchema.extend({
  userId: z.string().min(1),
  changedBy: z.enum(['user', 'admin', 'reset']),
});

export type AuthPasswordChangedEvent = z.infer<typeof authPasswordChangedEventSchema>;

/**
 * Schema for email verified event
 */
export const authEmailVerifiedEventSchema = baseEventSchema.extend({
  userId: z.string().min(1),
  email: z.string().email(),
});

export type AuthEmailVerifiedEvent = z.infer<typeof authEmailVerifiedEventSchema>;

/**
 * Schema for failed login attempt event (security monitoring)
 */
export const authLoginFailedEventSchema = baseEventSchema.extend({
  email: z.string().email(),
  ipAddress: z.string().ip().optional(),
  userAgent: z.string().max(500).optional(),
  reason: z.enum(['invalid_credentials', 'account_locked', 'account_disabled', 'email_not_verified']),
  attemptCount: z.number().int().positive().optional(),
});

export type AuthLoginFailedEvent = z.infer<typeof authLoginFailedEventSchema>;

// ================== DEPRECATED - BACKWARD COMPATIBILITY ==================

/**
 * @deprecated Use authUserLoggedInEventSchema instead
 */
export const authLoginEventSchema = z.object({
  userId: z.string().min(1),
  email: z.string().email(),
  timestamp: z.string(),
});

export type AuthLoginEvent = z.infer<typeof authLoginEventSchema>;
