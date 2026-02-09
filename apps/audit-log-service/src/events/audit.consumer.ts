import { Kafka } from 'kafkajs';
import { RetryConsumer, InMemoryIdempotencyStore } from '@veridex/shared';
import { env } from '../config/env';
import { AuditLogService } from '../services/audit-log.service';

const kafka = new Kafka({
  brokers: [env.KAFKA_BROKER],
  clientId: 'audit-log-service',
});

let retryConsumer: RetryConsumer | null = null;

/**
 * Audit Event Consumer
 * 
 * Uses RetryConsumer for:
 * - Automatic retries with exponential backoff
 * - Dead-letter queue for failed messages
 * - Idempotency to prevent duplicate processing
 */
export async function startAuditConsumer(): Promise<void> {
  retryConsumer = new RetryConsumer({
    kafka,
    groupId: env.KAFKA_GROUP_ID,
    topics: ['audit.events'],
    
    // Retry configuration
    retryConfig: {
      maxRetries: 3,
      initialDelayMs: 1000,
      maxDelayMs: 30000,
      backoffMultiplier: 2,
    },
    
    // Dead-letter queue topic
    dlqTopic: 'audit.events.dlq',
    
    // In-memory idempotency store (use Redis in production for distributed)
    idempotencyStore: new InMemoryIdempotencyStore(),
    
    // Message handler - receives EachMessagePayload from kafkajs
    handler: async ({ topic, partition, message }) => {
      if (!message.value) return;
      
      const payload = JSON.parse(message.value.toString());
      await AuditLogService.createFromEvent(payload);
      console.log(`[Audit Consumer] Processed audit event: ${payload.eventType || 'unknown'} from ${topic}:${partition}`);
    },
  });

  await retryConsumer.start();
  console.log('📨 Audit event consumer started with retry support');
}

export async function stopAuditConsumer(): Promise<void> {
  if (retryConsumer) {
    await retryConsumer.stop();
    retryConsumer = null;
    console.log('📨 Audit event consumer stopped');
  }
}
