import { Kafka } from 'kafkajs';
import { TOPICS } from '@veridex/event-contracts';
import { RetryConsumer, InMemoryIdempotencyStore } from '@veridex/shared';
import { env } from '../config/env';
import { ProductRepo } from '../repositories/product.repo';
import { ComplianceStatus } from '../domain/product.entity';

const kafka = new Kafka({
  clientId: 'product-service',
  brokers: [env.KAFKA_BROKER],
});

let retryConsumer: RetryConsumer | null = null;

/**
 * Compliance Result Consumer
 * 
 * Uses RetryConsumer for:
 * - Automatic retries with exponential backoff
 * - Dead-letter queue for failed messages
 * - Idempotency to prevent duplicate processing
 */
export async function startComplianceConsumer(): Promise<void> {
  retryConsumer = new RetryConsumer({
    kafka,
    groupId: env.KAFKA_GROUP_ID,
    topics: [TOPICS.COMPLIANCE_RESULT],
    
    // Retry configuration
    retryConfig: {
      maxRetries: 5,
      initialDelayMs: 1000,
      maxDelayMs: 60000,
      backoffMultiplier: 2,
    },
    
    // Dead-letter queue topic
    dlqTopic: 'compliance.results.dlq',
    
    // Idempotency store
    idempotencyStore: new InMemoryIdempotencyStore(),
    
    // Message handler - receives EachMessagePayload from kafkajs
    handler: async ({ topic, partition, message }) => {
      if (!message.value) return;
      
      const payload = JSON.parse(message.value.toString());
      const { data } = payload;
      
      console.log(`[Compliance Consumer] Received compliance result for product ${data.productId} from ${topic}:${partition}`);

      const status = data.status as ComplianceStatus;
      const notes = data.notes || data.reason;

      await ProductRepo.updateComplianceStatus(
        data.productId,
        status,
        notes
      );

      console.log(`[Compliance Consumer] Updated product ${data.productId} to ${status}`);
    },
  });

  await retryConsumer.start();
  console.log('[Compliance Consumer] Started with retry support');
}

export async function stopComplianceConsumer(): Promise<void> {
  if (retryConsumer) {
    await retryConsumer.stop();
    retryConsumer = null;
    console.log('[Compliance Consumer] Stopped');
  }
}
