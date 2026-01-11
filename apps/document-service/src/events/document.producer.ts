import { Kafka, Producer } from 'kafkajs';
import { TOPICS } from '@veridex/event-contracts';
import { env } from '../config/env';
import { IDocument, IExtractedData } from '../domain/document.entity';

// ================== REJECTION REASON TYPES ==================

export type RejectionReason = 
  | 'UNSUPPORTED_FILE_TYPE'
  | 'FILE_TOO_LARGE'
  | 'FILE_TOO_SMALL'
  | 'CORRUPT_FILE'
  | 'EMPTY_FILE'
  | 'MIME_TYPE_MISMATCH'
  | 'MISSING_PRODUCT_ID'
  | 'MISSING_ORGANIZATION_ID'
  | 'EXTRACTION_FAILED'
  | 'INVALID_DOCUMENT_CONTENT'
  | 'EXPIRED_DOCUMENT'
  | 'COMPLIANCE_VIOLATION'
  | 'VALIDATION_ERROR';

export interface DocumentRejectedEvent {
  documentId?: string;
  ownerId: string;
  organizationId: string;
  productId?: string;
  fileName: string;
  reason: RejectionReason;
  details: string;
  timestamp: string;
}

const kafka = new Kafka({
  clientId: 'document-service',
  brokers: [env.KAFKA_BROKER],
});

// Singleton producer pattern
let producer: Producer | null = null;
let isConnected = false;

async function getProducer(): Promise<Producer> {
  if (!producer) {
    producer = kafka.producer();
  }
  
  if (!isConnected) {
    await producer.connect();
    isConnected = true;
    console.log('[Document Producer] Connected to Kafka');
  }
  
  return producer;
}

export async function disconnectProducer(): Promise<void> {
  if (producer && isConnected) {
    await producer.disconnect();
    isConnected = false;
    console.log('[Document Producer] Disconnected from Kafka');
  }
}

// ================== DOCUMENT EVENTS ==================

export async function emitDocumentCreated(doc: IDocument): Promise<void> {
  try {
    const prod = await getProducer();
    await prod.send({
      topic: TOPICS.DOCUMENT_UPLOADED,
      messages: [{
        key: doc._id?.toString(),
        value: JSON.stringify({
          eventType: 'DOCUMENT_UPLOADED',
          timestamp: new Date().toISOString(),
          data: {
            documentId: doc._id,
            ownerId: doc.ownerId,
            organizationId: doc.organizationId,
            productId: doc.productId,
            name: doc.name,
            type: doc.type,
            fileName: doc.fileName,
            mimeType: doc.mimeType,
          },
        }),
      }],
    });
    console.log(`[Document Producer] Emitted DOCUMENT_UPLOADED for ${doc.name}`);
  } catch (error) {
    console.error('[Document Producer] Failed to emit DOCUMENT_UPLOADED:', error);
  }
}

export async function emitDocumentUpdated(doc: IDocument): Promise<void> {
  try {
    const prod = await getProducer();
    await prod.send({
      topic: TOPICS.DOCUMENT_UPDATED,
      messages: [{
        key: doc._id?.toString(),
        value: JSON.stringify({
          eventType: 'DOCUMENT_UPDATED',
          timestamp: new Date().toISOString(),
          data: {
            documentId: doc._id,
            name: doc.name,
            status: doc.status,
            extractionStatus: doc.extractionStatus,
          },
        }),
      }],
    });
    console.log(`[Document Producer] Emitted DOCUMENT_UPDATED for ${doc.name}`);
  } catch (error) {
    console.error('[Document Producer] Failed to emit DOCUMENT_UPDATED:', error);
  }
}

export async function emitDocumentDeleted(doc: IDocument): Promise<void> {
  try {
    const prod = await getProducer();
    await prod.send({
      topic: TOPICS.DOCUMENT_DELETED,
      messages: [{
        key: doc._id?.toString(),
        value: JSON.stringify({
          eventType: 'DOCUMENT_DELETED',
          timestamp: new Date().toISOString(),
          data: {
            documentId: doc._id,
            ownerId: doc.ownerId,
            organizationId: doc.organizationId,
            name: doc.name,
          },
        }),
      }],
    });
    console.log(`[Document Producer] Emitted DOCUMENT_DELETED for ${doc.name}`);
  } catch (error) {
    console.error('[Document Producer] Failed to emit DOCUMENT_DELETED:', error);
  }
}

export async function emitDocumentProcessed(event: {
  documentId: string;
  ownerId: string;
  productId?: string;
  organizationId: string;
  extracted?: IExtractedData;
  failureReason?: string;
}): Promise<void> {
  try {
    const prod = await getProducer();
    await prod.send({
      topic: TOPICS.DOCUMENT_PROCESSED,
      messages: [{
        key: event.documentId,
        value: JSON.stringify({
          eventType: 'DOCUMENT_PROCESSED',
          timestamp: new Date().toISOString(),
          data: event,
        }),
      }],
    });
    console.log(`[Document Producer] Emitted DOCUMENT_PROCESSED for ${event.documentId}`);
  } catch (error) {
    console.error('[Document Producer] Failed to emit DOCUMENT_PROCESSED:', error);
  }
}

export async function emitExtractionCompleted(doc: IDocument, extracted: IExtractedData): Promise<void> {
  try {
    const prod = await getProducer();
    await prod.send({
      topic: TOPICS.DOCUMENT_EXTRACTION_COMPLETED,
      messages: [{
        key: doc._id?.toString(),
        value: JSON.stringify({
          eventType: 'DOCUMENT_EXTRACTION_COMPLETED',
          timestamp: new Date().toISOString(),
          data: {
            documentId: doc._id,
            ownerId: doc.ownerId,
            organizationId: doc.organizationId,
            productId: doc.productId,
            type: doc.type,
            extracted,
          },
        }),
      }],
    });
    console.log(`[Document Producer] Emitted DOCUMENT_EXTRACTION_COMPLETED for ${doc.name}`);
  } catch (error) {
    console.error('[Document Producer] Failed to emit DOCUMENT_EXTRACTION_COMPLETED:', error);
  }
}

export async function emitExtractionFailed(doc: IDocument, reason: string): Promise<void> {
  try {
    const prod = await getProducer();
    await prod.send({
      topic: TOPICS.DOCUMENT_EXTRACTION_FAILED,
      messages: [{
        key: doc._id?.toString(),
        value: JSON.stringify({
          eventType: 'DOCUMENT_EXTRACTION_FAILED',
          timestamp: new Date().toISOString(),
          data: {
            documentId: doc._id,
            ownerId: doc.ownerId,
            organizationId: doc.organizationId,
            type: doc.type,
            reason,
          },
        }),
      }],
    });
    console.log(`[Document Producer] Emitted DOCUMENT_EXTRACTION_FAILED for ${doc.name}`);
  } catch (error) {
    console.error('[Document Producer] Failed to emit DOCUMENT_EXTRACTION_FAILED:', error);
  }
}

// ================== DOCUMENT REJECTION EVENT ==================

/**
 * Emit a document rejection event for failed uploads or validation failures
 * This triggers merchant notifications and audit logging
 */
export async function emitDocumentRejected(event: {
  documentId?: string;
  ownerId: string;
  organizationId: string;
  productId?: string;
  fileName: string;
  reason: RejectionReason;
  details: string;
}): Promise<void> {
  try {
    const prod = await getProducer();
    await prod.send({
      topic: 'document.rejected',
      messages: [{
        key: event.documentId || event.fileName,
        value: JSON.stringify({
          eventType: 'DOCUMENT_REJECTED',
          timestamp: new Date().toISOString(),
          data: {
            ...event,
            timestamp: new Date().toISOString(),
          },
        }),
      }],
    });
    console.log(`[Document Producer] Emitted DOCUMENT_REJECTED: ${event.reason} - ${event.fileName}`);
  } catch (error) {
    console.error('[Document Producer] Failed to emit DOCUMENT_REJECTED:', error);
  }
}

// ================== COMPLIANCE READY EVENT ==================

/**
 * Emit event when document is ready for compliance evaluation
 * This is sent after successful extraction
 */
export async function emitDocumentReadyForCompliance(doc: IDocument, extracted: IExtractedData): Promise<void> {
  try {
    const prod = await getProducer();
    await prod.send({
      topic: 'document.compliance.ready',
      messages: [{
        key: doc._id?.toString(),
        value: JSON.stringify({
          eventType: 'DOCUMENT_COMPLIANCE_READY',
          timestamp: new Date().toISOString(),
          data: {
            documentId: doc._id,
            ownerId: doc.ownerId,
            organizationId: doc.organizationId,
            productId: doc.productId,
            documentType: doc.type,
            fileName: doc.fileName,
            extracted,
            extractedAt: new Date().toISOString(),
          },
        }),
      }],
    });
    console.log(`[Document Producer] Emitted DOCUMENT_COMPLIANCE_READY for ${doc.name}`);
  } catch (error) {
    console.error('[Document Producer] Failed to emit DOCUMENT_COMPLIANCE_READY:', error);
  }
}

// ================== ADMIN REVIEW REQUIRED EVENT ==================

/**
 * Emit event when document requires admin review
 * Sent after compliance evaluation marks document as COMPLIANT
 */
export async function emitAdminReviewRequired(doc: IDocument, complianceResult: {
  status: string;
  score: number;
  summary: string;
}): Promise<void> {
  try {
    const prod = await getProducer();
    await prod.send({
      topic: 'document.admin.review.required',
      messages: [{
        key: doc._id?.toString(),
        value: JSON.stringify({
          eventType: 'ADMIN_REVIEW_REQUIRED',
          timestamp: new Date().toISOString(),
          data: {
            documentId: doc._id,
            ownerId: doc.ownerId,
            organizationId: doc.organizationId,
            productId: doc.productId,
            documentType: doc.type,
            fileName: doc.fileName,
            complianceStatus: complianceResult.status,
            complianceScore: complianceResult.score,
            complianceSummary: complianceResult.summary,
          },
        }),
      }],
    });
    console.log(`[Document Producer] Emitted ADMIN_REVIEW_REQUIRED for ${doc.name}`);
  } catch (error) {
    console.error('[Document Producer] Failed to emit ADMIN_REVIEW_REQUIRED:', error);
  }
}

