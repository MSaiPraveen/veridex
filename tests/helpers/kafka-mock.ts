/**
 * Kafka Mock Helper
 * Mocks Kafka producer/consumer for unit tests
 */

import { vi } from 'vitest';

export interface MockMessage {
  topic: string;
  messages: Array<{
    key?: string;
    value: string;
    headers?: Record<string, string>;
  }>;
}

const sentMessages: MockMessage[] = [];

/**
 * Create a mock Kafka producer
 */
export function createMockProducer() {
  return {
    connect: vi.fn().mockResolvedValue(undefined),
    disconnect: vi.fn().mockResolvedValue(undefined),
    send: vi.fn().mockImplementation(async (record: MockMessage) => {
      sentMessages.push(record);
      return { topicPartitions: [] };
    }),
  };
}

/**
 * Create a mock Kafka consumer
 */
export function createMockConsumer() {
  return {
    connect: vi.fn().mockResolvedValue(undefined),
    disconnect: vi.fn().mockResolvedValue(undefined),
    subscribe: vi.fn().mockResolvedValue(undefined),
    run: vi.fn().mockResolvedValue(undefined),
  };
}

/**
 * Create a mock Kafka instance
 */
export function createMockKafka() {
  return {
    producer: vi.fn(() => createMockProducer()),
    consumer: vi.fn(() => createMockConsumer()),
  };
}

/**
 * Get all messages sent by mock producer
 */
export function getSentMessages(): MockMessage[] {
  return [...sentMessages];
}

/**
 * Clear all sent messages (for test isolation)
 */
export function clearSentMessages(): void {
  sentMessages.length = 0;
}

/**
 * Mock the kafkajs module
 */
export function mockKafkaModule() {
  vi.mock('kafkajs', () => ({
    Kafka: vi.fn(() => createMockKafka()),
  }));
}
