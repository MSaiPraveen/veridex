/**
 * Batch Compliance Event Producer
 * 
 * Emits batch compliance evaluation events to Kafka
 */

import { Kafka, Producer } from 'kafkajs';
import {
  Topics,
  BatchComplianceEvaluatedEvent,
  BatchComplianceEvaluatedEventSchema,
} from '@veridex/event-contracts';
import { env } from '../config/env';

let producer: Producer | null = null;

/**
 * Get or create the Kafka producer
 */
async function getProducer(): Promise<Producer> {
  if (producer) {
    return producer;
  }

  const kafka = new Kafka({
    clientId: 'compliance-service',
    brokers: env.KAFKA_BROKER.split(','),
  });

  producer = kafka.producer();
  await producer.connect();
  return producer;
}

/**
 * Emit batch compliance evaluated event
 */
export async function emitBatchComplianceEvaluated(
  event: BatchComplianceEvaluatedEvent,
): Promise<void> {
  // Validate event before sending
  const validated = BatchComplianceEvaluatedEventSchema.parse(event);

  const kafkaProducer = await getProducer();

  await kafkaProducer.send({
    topic: Topics.BATCH_COMPLIANCE_EVALUATED,
    messages: [
      {
        key: validated.batchId,
        value: JSON.stringify(validated),
        headers: {
          eventType: Topics.BATCH_COMPLIANCE_EVALUATED,
          timestamp: String(validated.evaluatedAt),
          organizationId: validated.organizationId,
        },
      },
    ],
  });

  console.log(`[BatchComplianceProducer] Emitted compliance evaluated event for batch ${validated.batchId}`);
}

/**
 * Disconnect producer (for graceful shutdown)
 */
export async function disconnectProducer(): Promise<void> {
  if (producer) {
    await producer.disconnect();
    producer = null;
  }
}
