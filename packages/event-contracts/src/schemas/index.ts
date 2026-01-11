/**
 * Event Schemas Index
 * Re-exports all event schemas and validation utilities
 */

// Base schema and validation utilities
export { baseEventSchema } from './auth.event.schemas';
export * from './validation';

// Auth events
export {
  authUserRegisteredEventSchema,
  authUserLoggedInEventSchema,
  authUserLoggedOutEventSchema,
  authPasswordChangedEventSchema,
  authEmailVerifiedEventSchema,
  authLoginFailedEventSchema,
  authLoginEventSchema,
  type AuthUserRegisteredEvent,
  type AuthUserLoggedInEvent,
  type AuthUserLoggedOutEvent,
  type AuthPasswordChangedEvent,
  type AuthEmailVerifiedEvent,
  type AuthLoginFailedEvent,
  type AuthLoginEvent,
} from './auth.event.schemas';

// Product events
export {
  productCreatedEventSchema,
  productUpdatedEventSchema,
  productDeletedEventSchema,
  productStatusChangedEventSchema,
  productComplianceChangedEventSchema,
  productInventoryChangedEventSchema,
  type ProductCreatedEvent,
  type ProductUpdatedEvent,
  type ProductDeletedEvent,
  type ProductStatusChangedEvent,
  type ProductComplianceChangedEvent,
  type ProductInventoryChangedEvent,
} from './product.event.schemas';

// Document events
export {
  documentUploadedEventSchema,
  documentUpdatedEventSchema,
  documentDeletedEventSchema,
  documentProcessedEventSchema,
  documentExtractionCompletedEventSchema,
  documentExtractionFailedEventSchema,
  documentExpiringEventSchema,
  type DocumentUploadedEvent,
  type DocumentUpdatedEvent,
  type DocumentDeletedEvent,
  type DocumentProcessedEvent,
  type DocumentExtractionCompletedEvent,
  type DocumentExtractionFailedEvent,
  type DocumentExpiringEvent,
} from './document.event.schemas';

// Compliance events
export {
  complianceCheckRequestedEventSchema,
  complianceCheckCompletedEventSchema,
  complianceResultEventSchema,
  complianceViolationEventSchema,
  type ComplianceCheckRequestedEvent,
  type ComplianceCheckCompletedEvent,
  type ComplianceResultEvent,
  type ComplianceViolationEvent,
} from './compliance.event.schemas';

// Audit events
export {
  auditEventSchema,
  simpleAuditEventSchema,
  type AuditEvent,
  type SimpleAuditEvent,
} from './audit.event.schemas';

// User/Organization events
export {
  userCreatedEventSchema,
  userUpdatedEventSchema,
  userProfileCreatedEventSchema,
  userProfileUpdatedEventSchema,
  organizationCreatedEventSchema,
  organizationUpdatedEventSchema,
  organizationStatusChangedEventSchema,
  organizationMemberAddedEventSchema,
  organizationMemberRemovedEventSchema,
  type UserCreatedEvent,
  type UserUpdatedEvent,
  type UserProfileCreatedEvent,
  type UserProfileUpdatedEvent,
  type OrganizationCreatedEvent,
  type OrganizationUpdatedEvent,
  type OrganizationStatusChangedEvent,
  type OrganizationMemberAddedEvent,
  type OrganizationMemberRemovedEvent,
} from './user-org.event.schemas';

// Notification events
export {
  notificationSendRequestedEventSchema,
  notificationSentEventSchema,
  notificationReadEventSchema,
  notificationActionTakenEventSchema,
  type NotificationSendRequestedEvent,
  type NotificationSentEvent,
  type NotificationReadEvent,
  type NotificationActionTakenEvent,
} from './notification.event.schemas';
