import { Kafka, Consumer } from 'kafkajs';
import { TOPICS } from '@veridex/event-contracts';
import { env } from '../config/env';
import { ProductRepo } from '../repositories/product.repo';
import { ComplianceStatus } from '../domain/product.entity';

const kafka = new Kafka({
  clientId: 'product-service',
  brokers: [env.KAFKA_BROKER],
});

let consumer: Consumer | null = null;

export async function startComplianceConsumer(): Promise<void> {
  consumer = kafka.consumer({
    groupId: env.KAFKA_GROUP_ID,
  });

  await consumer.connect();
  console.log('[Compliance Consumer] Connected to Kafka');

  await consumer.subscribe({
    topic: TOPICS.COMPLIANCE_RESULT,
    fromBeginning: false,
  });

  await consumer.run({
    eachMessage: async ({ topic, partition, message }) => {
      if (!message.value) return;

      try {
        const payload = JSON.parse(message.value.toString());
        const { data } = payload;
        
        console.log(`[Compliance Consumer] Received compliance result for product ${data.productId}`);

        const status = data.status as ComplianceStatus;
        const notes = data.notes || data.reason;

        await ProductRepo.updateComplianceStatus(
          data.productId,
          status,
          notes
        );

        console.log(`[Compliance Consumer] Updated product ${data.productId} to ${status}`);
      } catch (error) {
        console.error('[Compliance Consumer] Error processing message:', error);
      }
    },
  });

  console.log('[Compliance Consumer] Started listening for compliance results');
}

export async function stopComplianceConsumer(): Promise<void> {
  if (consumer) {
    await consumer.disconnect();
    consumer = null;
    console.log('[Compliance Consumer] Disconnected from Kafka');
  }
}
