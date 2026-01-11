// Veridex Event Contracts
// Shared event schemas for Kafka/message queue communication

export * from './topics';

// Legacy TypeScript interfaces (for backward compatibility)
// These are deprecated - use Zod schemas from './schemas' instead
export type { AuthUserRegisteredEvent as LegacyAuthUserRegisteredEvent } from './auth.events';
export type { AuthUserLoggedInEvent as LegacyAuthUserLoggedInEvent } from './auth.events';
export type { AuthUserLoggedOutEvent as LegacyAuthUserLoggedOutEvent } from './auth.events';
export type { AuthLoginEvent as LegacyAuthLoginEvent } from './auth.events';
export type { ProductCreatedEvent as LegacyProductCreatedEvent } from './product.events';
export type { DocumentProcessedEvent as LegacyDocumentProcessedEvent } from './document.events';
export type { ComplianceResultEvent as LegacyComplianceResultEvent } from './compliance.events';

// Batch events (new)
export * from './batch.events';

// Zod schemas for runtime validation (recommended)
export * from './schemas';
