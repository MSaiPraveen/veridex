import { Kafka, Producer } from 'kafkajs';
import { env } from '../config/env';

const kafka = new Kafka({
  clientId: 'compliance-service',
  brokers: [env.KAFKA_BROKER],
});

let producer: Producer | null = null;

async function getProducer(): Promise<Producer> {
  if (!producer) {
    producer = kafka.producer();
    await producer.connect();
  }
  return producer;
}

export interface ComplianceResultEvent {
  productId: string;
  documentId?: string;
  status: string;
  score?: number;
  failedRules?: string[];
  error?: string;
}

export async function emitComplianceResult(event: ComplianceResultEvent): Promise<void> {
  const prod = await getProducer();
  await prod.send({
    topic: 'compliance.result',
    messages: [
      {
        key: event.productId,
        value: JSON.stringify({
          ...event,
          timestamp: new Date().toISOString(),
          source: 'compliance-service',
        }),
      },
    ],
  });
}

export interface ComplianceAlertEvent {
  productId: string;
  organizationId?: string;
  severity: 'CRITICAL' | 'MAJOR' | 'MINOR' | 'INFO';
  ruleCode: string;
  ruleName: string;
  message: string;
}

export async function emitComplianceAlert(event: ComplianceAlertEvent): Promise<void> {
  const prod = await getProducer();
  await prod.send({
    topic: 'compliance.alert',
    messages: [
      {
        key: event.productId,
        value: JSON.stringify({
          ...event,
          timestamp: new Date().toISOString(),
          source: 'compliance-service',
        }),
      },
    ],
  });
}

export interface RuleUpdatedEvent {
  ruleId: string;
  ruleCode: string;
  action: 'created' | 'updated' | 'deleted' | 'activated' | 'deactivated';
}

export async function emitRuleUpdated(event: RuleUpdatedEvent): Promise<void> {
  const prod = await getProducer();
  await prod.send({
    topic: 'compliance.rule.updated',
    messages: [
      {
        key: event.ruleId,
        value: JSON.stringify({
          ...event,
          timestamp: new Date().toISOString(),
          source: 'compliance-service',
        }),
      },
    ],
  });
}

export async function disconnectProducer(): Promise<void> {
  if (producer) {
    await producer.disconnect();
    producer = null;
  }
}

// ================== AUTO-REJECTION EVENT ==================

export interface ComplianceAutoRejectedEvent {
  documentId: string;
  productId: string;
  ownerId: string;
  organizationId: string;
  documentType: string;
  reasons: string[];
  score: number;
}

/**
 * Emit event when a document is auto-rejected due to compliance failure
 * This triggers merchant notification and audit logging
 */
export async function emitComplianceAutoRejected(event: ComplianceAutoRejectedEvent): Promise<void> {
  const prod = await getProducer();
  await prod.send({
    topic: 'compliance.auto.rejected',
    messages: [
      {
        key: event.documentId,
        value: JSON.stringify({
          eventType: 'COMPLIANCE_AUTO_REJECTED',
          timestamp: new Date().toISOString(),
          source: 'compliance-service',
          data: event,
        }),
      },
    ],
  });
  console.log(`[Compliance Producer] Emitted COMPLIANCE_AUTO_REJECTED for document ${event.documentId}`);
}

// ================== READY FOR REVIEW EVENT ==================

export interface ComplianceReadyForReviewEvent {
  documentId: string;
  productId: string;
  ownerId: string;
  organizationId: string;
  documentType: string;
  complianceScore: number;
  complianceSummary: string;
}

/**
 * Emit event when a document passes compliance and is ready for admin review
 */
export async function emitComplianceReadyForReview(event: ComplianceReadyForReviewEvent): Promise<void> {
  const prod = await getProducer();
  await prod.send({
    topic: 'document.admin.review.required',
    messages: [
      {
        key: event.documentId,
        value: JSON.stringify({
          eventType: 'ADMIN_REVIEW_REQUIRED',
          timestamp: new Date().toISOString(),
          source: 'compliance-service',
          data: event,
        }),
      },
    ],
  });
  console.log(`[Compliance Producer] Emitted ADMIN_REVIEW_REQUIRED for document ${event.documentId}`);
}

// ================== COMPLIANCE VIOLATION EVENT ==================

export interface ComplianceViolationEvent {
  documentId: string;
  productId: string;
  organizationId: string;
  violationType: string;
  ruleCode: string;
  ruleName: string;
  severity: 'CRITICAL' | 'MAJOR' | 'MINOR';
  details: string;
}

/**
 * Emit event when a specific compliance violation is detected
 */
export async function emitComplianceViolation(event: ComplianceViolationEvent): Promise<void> {
  const prod = await getProducer();
  await prod.send({
    topic: 'compliance.violation',
    messages: [
      {
        key: event.documentId,
        value: JSON.stringify({
          eventType: 'COMPLIANCE_VIOLATION',
          timestamp: new Date().toISOString(),
          source: 'compliance-service',
          data: event,
        }),
      },
    ],
  });
  console.log(`[Compliance Producer] Emitted COMPLIANCE_VIOLATION: ${event.ruleCode} for document ${event.documentId}`);
}
