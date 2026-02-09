import { Kafka } from 'kafkajs';
import { RetryConsumer, InMemoryIdempotencyStore } from '@veridex/shared';
import { env } from '../config/env';
import { notifyUser, SendNotificationInput } from '../services/notification.service';

const kafka = new Kafka({
  clientId: 'notification-service',
  brokers: [env.KAFKA_BROKER],
});

let retryConsumer: RetryConsumer | null = null;

/**
 * Notification Consumer
 * 
 * Uses RetryConsumer for:
 * - Automatic retries with exponential backoff
 * - Dead-letter queue for failed notifications
 * - Idempotency to prevent duplicate notifications
 */
export async function startNotificationConsumer(): Promise<void> {
  // Topics to subscribe to
  const topics = [
    'compliance.result',
    'compliance.alert',
    'compliance.auto.rejected',
    'document.processed',
    'document.rejected',
    'document.admin.review.required',
    'product.created',
    'product.updated',
    'user.created',
    'user.updated',
    'auth.password-reset',
  ];

  retryConsumer = new RetryConsumer({
    kafka,
    groupId: 'notification-service',
    topics,
    
    // Retry configuration - be generous for notification delivery
    retryConfig: {
      maxRetries: 5,
      initialDelayMs: 2000,
      maxDelayMs: 120000,
      backoffMultiplier: 2,
    },
    
    // Dead-letter queue topic
    dlqTopic: 'notifications.dlq',
    
    // Idempotency store
    idempotencyStore: new InMemoryIdempotencyStore(),
    
    // Message handler - receives EachMessagePayload from kafkajs
    handler: async ({ topic, partition, message }) => {
      if (!message.value) return;

      const rawData = JSON.parse(message.value.toString());
      // Handle both wrapped and unwrapped event formats
      const data = rawData.data || rawData;
      
      // Use topic from the payload
      const messageTopic = topic;

      switch (messageTopic) {
        case 'compliance.result':
          await handleComplianceResult(data);
          break;
        case 'compliance.alert':
          await handleComplianceAlert(data);
          break;
        case 'compliance.auto.rejected':
          await handleComplianceAutoRejected(data);
          break;
        case 'document.processed':
          await handleDocumentProcessed(data);
          break;
        case 'document.rejected':
          await handleDocumentRejected(data);
          break;
        case 'document.admin.review.required':
          await handleAdminReviewRequired(data);
          break;
        case 'product.created':
          await handleProductCreated(data);
          break;
        case 'product.updated':
          await handleProductUpdated(data);
          break;
        case 'user.created':
          await handleUserCreated(data);
          break;
        case 'auth.password-reset':
          await handlePasswordReset(data);
          break;
        default:
          console.log(`Unhandled topic: ${messageTopic}`);
      }
    },
  });

  await retryConsumer.start();
  console.log('Notification consumer started with retry support');
}

// =====================
// Event Handlers
// =====================

// ================== DOCUMENT REJECTION HANDLERS ==================

interface DocumentRejectedEvent {
  documentId?: string;
  ownerId: string;
  organizationId: string;
  productId?: string;
  fileName: string;
  reason: string;
  details: string;
}

/**
 * Handle document rejection events - notify merchant of upload failure
 */
async function handleDocumentRejected(event: DocumentRejectedEvent): Promise<void> {
  console.log('[Notification] Handling document rejected:', event.fileName);
  
  const reasonMessages: Record<string, string> = {
    'UNSUPPORTED_FILE_TYPE': 'The file type is not supported. Please upload PDF, JPG, PNG, or TIFF files.',
    'FILE_TOO_LARGE': 'The file exceeds the maximum size limit.',
    'FILE_TOO_SMALL': 'The file is too small and may be empty or corrupt.',
    'CORRUPT_FILE': 'The file appears to be corrupt and could not be processed.',
    'EMPTY_FILE': 'The file is empty. Please upload a valid document.',
    'MIME_TYPE_MISMATCH': 'The file content does not match its extension. Please verify the file.',
    'MISSING_PRODUCT_ID': 'A product must be specified for this document type.',
    'MISSING_ORGANIZATION_ID': 'Organization information is required.',
    'EXTRACTION_FAILED': 'We could not extract data from your document. Please ensure it is legible.',
    'INVALID_DOCUMENT_CONTENT': 'The document content could not be validated.',
    'EXPIRED_DOCUMENT': 'This document appears to be expired.',
    'COMPLIANCE_VIOLATION': 'The document does not meet compliance requirements.',
    'VALIDATION_ERROR': 'The document failed validation checks.',
  };

  const friendlyMessage = reasonMessages[event.reason] || event.details;

  await notifyUser({
    userId: event.ownerId,
    title: 'Document Upload Failed',
    message: `Your document "${event.fileName}" could not be processed. ${friendlyMessage}`,
    category: 'DOCUMENT',
    priority: 'HIGH',
    channels: ['IN_APP', 'EMAIL'],
    data: {
      documentId: event.documentId,
      fileName: event.fileName,
      reason: event.reason,
      productId: event.productId,
    },
    actionUrl: '/dashboard/documents',
    actionLabel: 'Upload New Document',
    organizationId: event.organizationId,
    sourceService: 'document-service',
  });
}

interface ComplianceAutoRejectedEvent {
  documentId: string;
  productId: string;
  ownerId: string;
  organizationId: string;
  documentType: string;
  reasons: string[];
  score: number;
}

/**
 * Handle compliance auto-rejection - notify merchant their document failed compliance
 */
async function handleComplianceAutoRejected(event: ComplianceAutoRejectedEvent): Promise<void> {
  console.log('[Notification] Handling compliance auto-rejection:', event.documentId);
  
  const reasonList = event.reasons.length > 0 
    ? event.reasons.slice(0, 3).join('; ')
    : 'Document did not meet compliance requirements';

  await notifyUser({
    userId: event.ownerId,
    title: 'Document Did Not Pass Compliance',
    message: `Your ${event.documentType} document was automatically rejected. Reasons: ${reasonList}. Compliance score: ${event.score}%`,
    category: 'COMPLIANCE',
    priority: 'HIGH',
    channels: ['IN_APP', 'EMAIL'],
    data: {
      documentId: event.documentId,
      productId: event.productId,
      documentType: event.documentType,
      complianceScore: event.score,
      reasons: event.reasons,
    },
    actionUrl: `/dashboard/products/${event.productId}/documents`,
    actionLabel: 'View Requirements',
    organizationId: event.organizationId,
    sourceService: 'compliance-service',
  });
}

interface AdminReviewRequiredEvent {
  documentId: string;
  productId: string;
  ownerId: string;
  organizationId: string;
  documentType: string;
  complianceScore: number;
  complianceSummary: string;
}

/**
 * Handle admin review required - notify admins of pending review
 */
async function handleAdminReviewRequired(event: AdminReviewRequiredEvent): Promise<void> {
  console.log('[Notification] Handling admin review required:', event.documentId);
  
  // In production, you'd look up admin users for this organization
  // For now, we'll skip admin notification and just log
  console.log(`[Notification] Admin review needed for document ${event.documentId} - ${event.documentType}`);
  
  // Optionally notify the merchant that their document is under review
  await notifyUser({
    userId: event.ownerId,
    title: 'Document Under Review',
    message: `Your ${event.documentType} document has passed automated checks and is now under admin review. Compliance score: ${event.complianceScore}%`,
    category: 'DOCUMENT',
    priority: 'NORMAL',
    channels: ['IN_APP'],
    data: {
      documentId: event.documentId,
      productId: event.productId,
      documentType: event.documentType,
      complianceScore: event.complianceScore,
      status: 'PENDING_REVIEW',
    },
    organizationId: event.organizationId,
    sourceService: 'compliance-service',
  });
}

// ================== EXISTING HANDLERS ==================

interface ComplianceResultEvent {
  productId: string;
  documentId?: string;
  status: string;
  score?: number;
  failedRules?: string[];
  organizationId?: string;
  userId?: string;
}

async function handleComplianceResult(event: ComplianceResultEvent): Promise<void> {
  // In a real app, you'd look up the product owner's user ID
  const userId = event.userId || event.productId;

  const notification: SendNotificationInput = {
    userId,
    title: 'Compliance Status Updated',
    message: `Product compliance status: ${event.status}${event.score ? ` (Score: ${event.score}%)` : ''}`,
    category: 'COMPLIANCE',
    priority: event.status === 'NON_COMPLIANT' ? 'HIGH' : 'NORMAL',
    channels: ['IN_APP', 'EMAIL'],
    data: {
      productId: event.productId,
      documentId: event.documentId,
      status: event.status,
      score: event.score,
      failedRules: event.failedRules,
    },
    actionUrl: `/products/${event.productId}/compliance`,
    actionLabel: 'View Details',
    organizationId: event.organizationId,
    sourceService: 'compliance-service',
  };

  await notifyUser(notification);
}

interface ComplianceAlertEvent {
  productId: string;
  organizationId?: string;
  severity: 'CRITICAL' | 'MAJOR' | 'MINOR' | 'INFO';
  ruleCode: string;
  ruleName: string;
  message: string;
  userId?: string;
}

async function handleComplianceAlert(event: ComplianceAlertEvent): Promise<void> {
  const userId = event.userId || event.productId;

  const priorityMap: Record<string, 'LOW' | 'NORMAL' | 'HIGH' | 'URGENT'> = {
    'CRITICAL': 'URGENT',
    'MAJOR': 'HIGH',
    'MINOR': 'NORMAL',
    'INFO': 'LOW',
  };

  const notification: SendNotificationInput = {
    userId,
    title: `Compliance Alert: ${event.ruleName}`,
    message: event.message,
    category: 'ALERT',
    priority: priorityMap[event.severity] || 'NORMAL',
    channels: event.severity === 'CRITICAL' ? ['IN_APP', 'EMAIL', 'PUSH'] : ['IN_APP'],
    data: {
      productId: event.productId,
      severity: event.severity,
      ruleCode: event.ruleCode,
    },
    actionUrl: `/products/${event.productId}/compliance`,
    actionLabel: 'View Alert',
    organizationId: event.organizationId,
    sourceService: 'compliance-service',
  };

  await notifyUser(notification);
}

interface DocumentProcessedEvent {
  documentId: string;
  productId: string;
  name: string;
  status: string;
  failureReason?: string;
  userId?: string;
  organizationId?: string;
}

async function handleDocumentProcessed(event: DocumentProcessedEvent): Promise<void> {
  const userId = event.userId || event.productId;
  const success = !event.failureReason;

  const notification: SendNotificationInput = {
    userId,
    title: success ? 'Document Processing Complete' : 'Document Processing Failed',
    message: success
      ? `Your document "${event.name}" has been processed successfully.`
      : `Failed to process document "${event.name}": ${event.failureReason}`,
    category: 'DOCUMENT',
    priority: success ? 'NORMAL' : 'HIGH',
    channels: ['IN_APP'],
    data: {
      documentId: event.documentId,
      productId: event.productId,
      status: event.status,
    },
    actionUrl: `/documents/${event.documentId}`,
    actionLabel: 'View Document',
    organizationId: event.organizationId,
    sourceService: 'document-service',
  };

  await notifyUser(notification);
}

interface ProductEvent {
  productId: string;
  name: string;
  action: 'created' | 'updated';
  userId?: string;
  organizationId?: string;
}

async function handleProductCreated(event: ProductEvent): Promise<void> {
  if (!event.userId) return;

  const notification: SendNotificationInput = {
    userId: event.userId,
    title: 'Product Created',
    message: `Product "${event.name}" has been created successfully.`,
    category: 'PRODUCT',
    priority: 'LOW',
    channels: ['IN_APP'],
    data: { productId: event.productId, name: event.name },
    actionUrl: `/products/${event.productId}`,
    actionLabel: 'View Product',
    organizationId: event.organizationId,
    sourceService: 'product-service',
  };

  await notifyUser(notification);
}

async function handleProductUpdated(event: ProductEvent): Promise<void> {
  if (!event.userId) return;

  const notification: SendNotificationInput = {
    userId: event.userId,
    title: 'Product Updated',
    message: `Product "${event.name}" has been updated.`,
    category: 'PRODUCT',
    priority: 'LOW',
    channels: ['IN_APP'],
    data: { productId: event.productId, name: event.name },
    actionUrl: `/products/${event.productId}`,
    actionLabel: 'View Product',
    organizationId: event.organizationId,
    sourceService: 'product-service',
  };

  await notifyUser(notification);
}

interface UserCreatedEvent {
  userId: string;
  email: string;
  name: string;
  organizationId?: string;
}

async function handleUserCreated(event: UserCreatedEvent): Promise<void> {
  const notification: SendNotificationInput = {
    userId: event.userId,
    email: event.email,
    title: 'Welcome to Veridex',
    message: `Welcome ${event.name}! Your account has been created successfully.`,
    category: 'USER',
    priority: 'NORMAL',
    channels: ['IN_APP', 'EMAIL'],
    templateId: 'welcome',
    templateData: { userName: event.name },
    organizationId: event.organizationId,
    sourceService: 'auth-service',
  };

  await notifyUser(notification);
}

interface PasswordResetEvent {
  userId: string;
  email: string;
  resetToken: string;
  expiresAt: string;
}

async function handlePasswordReset(event: PasswordResetEvent): Promise<void> {
  const resetLink = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/reset-password?token=${event.resetToken}`;

  const notification: SendNotificationInput = {
    userId: event.userId,
    email: event.email,
    title: 'Password Reset Request',
    message: `A password reset was requested for your account. Click the link to reset your password.`,
    category: 'USER',
    priority: 'HIGH',
    channels: ['EMAIL'],
    templateId: 'password-reset',
    templateData: { resetLink },
    sourceService: 'auth-service',
  };

  await notifyUser(notification);
}

export async function stopNotificationConsumer(): Promise<void> {
  if (retryConsumer) {
    await retryConsumer.stop();
    retryConsumer = null;
  }
}
