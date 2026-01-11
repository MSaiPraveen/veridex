import { Kafka, Consumer } from 'kafkajs';
import { env } from '../config/env';
import { AuditLogService } from '../services/audit-log.service';

const kafka = new Kafka({
  brokers: [env.KAFKA_BROKER],
  clientId: 'audit-log-service',
});

let consumer: Consumer | null = null;

export async function startAuditConsumer(): Promise<void> {
  consumer = kafka.consumer({ groupId: env.KAFKA_GROUP_ID });
  
  await consumer.connect();
  await consumer.subscribe({ topic: 'audit.events', fromBeginning: false });

  await consumer.run({
    eachMessage: async ({ message, partition, topic }) => {
      if (!message.value) return;

      try {
        const payload = JSON.parse(message.value.toString());
        await AuditLogService.createFromEvent(payload);
        console.log(`[Audit Consumer] Processed message from ${topic}:${partition}`);
      } catch (error) {
        console.error('[Audit Consumer] Error processing message:', error);
        // In production, you might want to send to a dead-letter queue
      }
    },
  });

  console.log('📨 Audit event consumer started');
}

export async function stopAuditConsumer(): Promise<void> {
  if (consumer) {
    await consumer.disconnect();
    consumer = null;
    console.log('📨 Audit event consumer stopped');
  }
}
