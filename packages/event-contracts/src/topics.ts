export const Topics = {
  // Auth events
  AUTH_USER_REGISTERED: 'auth.user.registered',
  AUTH_USER_LOGGED_IN: 'auth.user.logged_in',
  AUTH_USER_LOGGED_OUT: 'auth.user.logged_out',
  AUTH_LOGIN: 'auth.user.logged_in', // deprecated alias
  
  // Product events
  PRODUCT_CREATED: 'product.created',
  PRODUCT_UPDATED: 'product.updated',
  PRODUCT_DELETED: 'product.deleted',
  PRODUCT_STATUS_CHANGED: 'product.status_changed',
  PRODUCT_COMPLIANCE_CHANGED: 'product.compliance_changed',
  PRODUCT_INVENTORY_CHANGED: 'product.inventory_changed',
  
  // Document events
  DOCUMENT_UPLOADED: 'document.uploaded',
  DOCUMENT_UPDATED: 'document.updated',
  DOCUMENT_DELETED: 'document.deleted',
  DOCUMENT_PROCESSED: 'document.processed',
  DOCUMENT_EXTRACTION_COMPLETED: 'document.extraction_completed',
  DOCUMENT_EXTRACTION_FAILED: 'document.extraction_failed',
  DOCUMENT_EXPIRING: 'document.expiring',
  DOCUMENT_REJECTED: 'document.rejected',
  DOCUMENT_COMPLIANCE_READY: 'document.compliance.ready',
  DOCUMENT_ADMIN_REVIEW_REQUIRED: 'document.admin.review.required',
  
  // Batch events
  BATCH_CREATED: 'batch.created',
  BATCH_UPDATED: 'batch.updated',
  BATCH_DOCUMENT_ATTACHED: 'batch.document.attached',
  BATCH_COMPLIANCE_REQUESTED: 'batch.compliance.requested',
  BATCH_COMPLIANCE_EVALUATED: 'batch.compliance.evaluated',
  BATCH_RECALLED: 'batch.recalled',
  BATCH_EXPIRED: 'batch.expired',
  BATCH_EXPIRING_SOON: 'batch.expiring_soon',
  
  // Compliance events
  COMPLIANCE_RESULT: 'compliance.result',
  COMPLIANCE_CHECK_REQUESTED: 'compliance.check_requested',
  COMPLIANCE_CHECK_COMPLETED: 'compliance.check_completed',
  COMPLIANCE_VIOLATION: 'compliance.violation',
  COMPLIANCE_AUTO_REJECTED: 'compliance.auto.rejected',
  
  // Audit events
  AUDIT_EVENT: 'audit.events',
  
  // User/Org events
  USER_CREATED: 'user.created',
  USER_UPDATED: 'user.updated',
  USER_PROFILE_CREATED: 'user.profile.created',
  USER_PROFILE_UPDATED: 'user.profile.updated',
  ORG_CREATED: 'organization.created',
  ORG_UPDATED: 'organization.updated',
  ORG_MEMBER_ADDED: 'organization.member.added',
  ORG_MEMBER_REMOVED: 'organization.member.removed',
  
  // Notification events
  NOTIFICATION_SEND: 'notification.send',
  NOTIFICATION_SENT: 'notification.sent',
  NOTIFICATION_FAILED: 'notification.failed',
} as const;

// Export as TOPICS as well for consistency
export const TOPICS = Topics;

export type TopicName = typeof Topics[keyof typeof Topics];
