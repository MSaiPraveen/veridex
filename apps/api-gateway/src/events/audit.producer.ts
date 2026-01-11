import { Kafka } from 'kafkajs';
import { env } from '../config/env';

const kafka = new Kafka({
  brokers: env.KAFKA_BROKERS,
});

const producer = kafka.producer();

export async function emitAuditEvent(event: Record<string, unknown>) {
  await producer.connect();

  await producer.send({
    topic: 'audit.events',
    messages: [
      {
        value: JSON.stringify({
          ...event,
          timestamp: new Date().toISOString(),
        }),
      },
    ],
  });
}
