import { Kafka, EachMessagePayload } from 'kafkajs';
import { env } from '../config/env';
import { evaluateCompliance, ComplianceCheckInput } from '../services/compliance.service';
import { emitComplianceAutoRejected, emitComplianceReadyForReview } from './compliance.producer';
import { RetryConsumer, InMemoryIdempotencyStore } from '@veridex/shared';

const kafka = new Kafka({
  clientId: 'compliance-service',
  brokers: [env.KAFKA_BROKER],
});

// Topics to subscribe to
const TOPICS = [
  'document.processed',
  'document.compliance.ready',
  'product.created',
  'document.review.decision',
];

// Dead Letter Queue topic for failed messages
const DLQ_TOPIC = 'compliance.dlq';

// Idempotency store - use Redis in production
const idempotencyStore = new InMemoryIdempotencyStore();

let retryConsumer: RetryConsumer | null = null;

export async function startDocumentConsumer(): Promise<void> {
  retryConsumer = new RetryConsumer({
    kafka,
    groupId: env.KAFKA_GROUP_ID,
    topics: TOPICS,
    dlqTopic: DLQ_TOPIC,
    retryConfig: {
      maxRetries: 3,
      initialDelayMs: 1000,
      maxDelayMs: 30000,
      backoffMultiplier: 2,
    },
    idempotencyStore,
    handler: handleMessage,
    // Custom idempotency key using documentId/productId when available
    getIdempotencyKey: (message, topic) => {
      try {
        const data = JSON.parse(message.value?.toString() || '{}');
        const payload = data.data || data;
        const entityId = payload.documentId || payload.productId || message.offset;
        return `${topic}:${entityId}:${message.offset}`;
      } catch {
        return `${topic}:${message.offset}`;
      }
    },
  });

  await retryConsumer.start();
  console.log('📨 Document consumer started with retry + DLQ support');
}

/**
 * Main message handler - routes to appropriate handler based on topic
 */
async function handleMessage(payload: EachMessagePayload): Promise<void> {
  const { topic, message } = payload;

  if (!message.value) {
    throw new Error('Empty message value');
  }

  const rawData = JSON.parse(message.value.toString());
  // Handle both wrapped and unwrapped event formats
  const data = rawData.data || rawData;

  switch (topic) {
    case 'document.compliance.ready':
      await handleDocumentComplianceReady(data);
      break;
    case 'document.processed':
      await handleDocumentProcessed(data);
      break;
    case 'product.created':
      await handleProductCreated(data);
      break;
    case 'document.review.decision':
      await handleDocumentReviewDecision(data);
      break;
    default:
      console.log(`[Compliance Consumer] Unknown topic: ${topic}`);
  }
}

interface DocumentProcessedEvent {
  documentId: string;
  productId: string;
  ownerId: string;
  organizationId?: string;
  type?: string;
  documentType?: string;
  extracted?: Record<string, unknown>;
  failureReason?: string;
}

interface DocumentComplianceReadyEvent {
  documentId: string;
  productId: string;
  ownerId: string;
  organizationId: string;
  documentType: string;
  fileName: string;
  extracted: Record<string, unknown>;
  extractedAt: string;
}

/**
 * Handle document compliance ready event
 * This is the preferred event for triggering compliance evaluation
 */
async function handleDocumentComplianceReady(event: DocumentComplianceReadyEvent): Promise<void> {
  console.log('[Compliance Consumer] Processing compliance ready event:', event.documentId);

  // Validate required fields
  if (!event.productId) {
    console.error('[Compliance Consumer] Missing productId in compliance ready event:', event.documentId);
    return;
  }

  const input: ComplianceCheckInput = {
    productId: event.productId,
    documentId: event.documentId,
    documentType: event.documentType,
    extracted: event.extracted ?? {},
    organizationId: event.organizationId,
  };

  try {
    const result = await evaluateCompliance(input);
    
    // Handle compliance result
    if (result.status === 'NON_COMPLIANT') {
      // Auto-reject non-compliant documents
      await emitComplianceAutoRejected({
        documentId: event.documentId,
        productId: event.productId,
        ownerId: event.ownerId,
        organizationId: event.organizationId,
        documentType: event.documentType,
        reasons: result.reasons || [],
        score: result.overallScore ?? 0,
      });
      console.log('[Compliance Consumer] Document auto-rejected:', event.documentId);
    } else {
      // Forward compliant documents for admin review
      await emitComplianceReadyForReview({
        documentId: event.documentId,
        productId: event.productId,
        ownerId: event.ownerId,
        organizationId: event.organizationId,
        documentType: event.documentType,
        complianceScore: result.overallScore ?? 100,
        complianceSummary: result.summary || 'Document passed compliance checks',
      });
      console.log('[Compliance Consumer] Document ready for admin review:', event.documentId);
    }
  } catch (error) {
    console.error('[Compliance Consumer] Compliance evaluation failed:', error);
  }
}

async function handleDocumentProcessed(event: DocumentProcessedEvent): Promise<void> {
  console.log('[Compliance Consumer] Processing document event:', event.documentId);

  // Skip if productId is missing - can't evaluate compliance without it
  if (!event.productId) {
    console.warn('[Compliance Consumer] Skipping document without productId:', event.documentId);
    return;
  }

  const input: ComplianceCheckInput = {
    productId: event.productId,
    documentId: event.documentId,
    documentType: event.type || event.documentType || 'UNKNOWN',
    extracted: event.extracted ?? {},
    organizationId: event.organizationId,
  };

  // If document processing failed, mark as non-compliant
  if (event.failureReason) {
    input.extracted = {
      processingFailed: true,
      failureReason: event.failureReason,
    };
  }

  try {
    const result = await evaluateCompliance(input);
    
    // Emit appropriate events based on result
    if (result.status === 'NON_COMPLIANT') {
      await emitComplianceAutoRejected({
        documentId: event.documentId,
        productId: event.productId,
        ownerId: event.ownerId,
        organizationId: event.organizationId || '',
        documentType: input.documentType,
        reasons: result.reasons || [],
        score: result.overallScore ?? 0,
      });
    } else if (event.ownerId) {
      await emitComplianceReadyForReview({
        documentId: event.documentId,
        productId: event.productId,
        ownerId: event.ownerId,
        organizationId: event.organizationId || '',
        documentType: input.documentType,
        complianceScore: result.overallScore ?? 100,
        complianceSummary: result.summary || '',
      });
    }
  } catch (error) {
    console.error('[Compliance Consumer] Compliance evaluation failed:', error);
  }
}

interface ProductCreatedEvent {
  productId: string;
  organizationId?: string;
  category?: string;
}

async function handleProductCreated(event: ProductCreatedEvent): Promise<void> {
  console.log('Processing product created event:', event.productId);

  // Create initial pending compliance status for new products
  const input: ComplianceCheckInput = {
    productId: event.productId,
    documentType: 'INITIAL_CHECK',
    extracted: {
      isNewProduct: true,
      category: event.category,
    },
    organizationId: event.organizationId,
  };

  await evaluateCompliance(input);
}

export async function stopDocumentConsumer(): Promise<void> {
  if (retryConsumer) {
    await retryConsumer.stop();
    retryConsumer = null;
  }
}

// ================== NEW: Document Review Decision Handler ==================

interface DocumentReviewDecisionEvent {
  documentId: string;
  productId?: string;
  organizationId: string;
  documentType: string;
  decision: 'APPROVED' | 'REJECTED' | 'FLAGGED';
  reviewedBy: string;
  reviewNote?: string;
}

/**
 * Handle document review decision event
 * Recalculates product compliance status based on all associated documents
 */
async function handleDocumentReviewDecision(event: DocumentReviewDecisionEvent): Promise<void> {
  console.log('[Compliance Consumer] Processing review decision:', event.documentId, event.decision);

  if (!event.productId) {
    console.log('[Compliance Consumer] No productId, skipping compliance recalculation');
    return;
  }

  try {
    // Recalculate product compliance based on the decision
    await recalculateProductCompliance(event.productId, event.organizationId);
  } catch (error) {
    console.error('[Compliance Consumer] Failed to recalculate product compliance:', error);
  }
}

/**
 * Recalculate product compliance status based on all associated documents
 * Uses HTTP call to product service since we need to update product status
 */
async function recalculateProductCompliance(productId: string, organizationId: string): Promise<void> {
  const DOCUMENT_SERVICE_URL = process.env.DOCUMENT_SERVICE_URL || 'http://document-service:3005';
  const PRODUCT_SERVICE_URL = process.env.PRODUCT_SERVICE_URL || 'http://product-service:3004';

  try {
    // Fetch all documents for this product
    const docsResponse = await fetch(
      `${DOCUMENT_SERVICE_URL}/documents?productId=${productId}&status=ACTIVE`,
      { headers: { 'x-user-role': 'ADMIN' } }
    );
    
    if (!docsResponse.ok) {
      console.error('[Compliance Consumer] Failed to fetch product documents');
      return;
    }
    
    const docsData = await docsResponse.json();
    const documents = docsData.data || [];
    
    // Determine compliance status based on document review statuses
    let complianceStatus: 'PENDING' | 'COMPLIANT' | 'NON_COMPLIANT' | 'UNDER_REVIEW' = 'PENDING';
    
    if (documents.length === 0) {
      complianceStatus = 'PENDING';
    } else {
      const hasRejected = documents.some((d: any) => d.reviewStatus === 'REJECTED');
      const hasFlagged = documents.some((d: any) => d.reviewStatus === 'FLAGGED');
      const hasPending = documents.some((d: any) => 
        !d.reviewStatus || d.reviewStatus === 'PENDING_REVIEW'
      );
      const allApproved = documents.every((d: any) => d.reviewStatus === 'APPROVED');
      
      if (hasRejected) {
        complianceStatus = 'NON_COMPLIANT';
      } else if (hasFlagged) {
        complianceStatus = 'UNDER_REVIEW';
      } else if (hasPending) {
        complianceStatus = 'PENDING';
      } else if (allApproved) {
        complianceStatus = 'COMPLIANT';
      }
    }
    
    // Update product compliance status
    const updateResponse = await fetch(
      `${PRODUCT_SERVICE_URL}/products/${productId}/compliance`,
      {
        method: 'PATCH',
        headers: { 
          'Content-Type': 'application/json',
          'x-user-role': 'ADMIN',
        },
        body: JSON.stringify({
          complianceStatus,
          lastComplianceCheck: new Date().toISOString(),
          complianceNotes: `Auto-calculated based on ${documents.length} document(s)`,
        }),
      }
    );
    
    if (updateResponse.ok) {
      console.log(`[Compliance Consumer] Updated product ${productId} compliance to ${complianceStatus}`);
    } else {
      console.error('[Compliance Consumer] Failed to update product compliance status');
    }
  } catch (error) {
    console.error('[Compliance Consumer] Error recalculating product compliance:', error);
  }
}
