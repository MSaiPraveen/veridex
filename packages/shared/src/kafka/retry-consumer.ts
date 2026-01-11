/**
 * Kafka Retry Consumer with Dead Letter Queue (DLQ) Support
 * 
 * Features:
 * - Exponential backoff retry with configurable attempts
 * - Dead Letter Queue for failed messages
 * - Idempotency key tracking to prevent duplicate processing
 * - Message ordering preservation within partitions
 */

import { Kafka, Consumer, Producer, EachMessagePayload, KafkaMessage } from 'kafkajs';

export interface RetryConfig {
  /** Maximum number of retry attempts before sending to DLQ */
  maxRetries: number;
  /** Initial delay in milliseconds */
  initialDelayMs: number;
  /** Maximum delay in milliseconds */
  maxDelayMs: number;
  /** Multiplier for exponential backoff */
  backoffMultiplier: number;
}

export interface DLQMessage {
  originalTopic: string;
  originalPartition: number;
  originalOffset: string;
  originalKey: string | null;
  originalValue: string;
  originalHeaders: Record<string, string>;
  error: string;
  errorStack?: string;
  retryCount: number;
  failedAt: string;
  consumerGroup: string;
}

export interface IdempotencyStore {
  /** Check if a message has already been processed */
  hasProcessed(key: string): Promise<boolean>;
  /** Mark a message as processed */
  markProcessed(key: string, ttlMs?: number): Promise<void>;
}

export interface RetryConsumerOptions {
  kafka: Kafka;
  groupId: string;
  topics: string[];
  dlqTopic: string;
  retryConfig?: Partial<RetryConfig>;
  idempotencyStore?: IdempotencyStore;
  /** Handler function for processing messages */
  handler: (payload: EachMessagePayload) => Promise<void>;
  /** Optional: custom idempotency key extractor */
  getIdempotencyKey?: (message: KafkaMessage, topic: string) => string;
}

const DEFAULT_RETRY_CONFIG: RetryConfig = {
  maxRetries: 3,
  initialDelayMs: 1000,
  maxDelayMs: 30000,
  backoffMultiplier: 2,
};

// In-memory idempotency store (use Redis in production)
export class InMemoryIdempotencyStore implements IdempotencyStore {
  private processed = new Map<string, number>();
  private readonly defaultTtlMs = 24 * 60 * 60 * 1000; // 24 hours

  async hasProcessed(key: string): Promise<boolean> {
    const expiry = this.processed.get(key);
    if (!expiry) return false;
    
    if (Date.now() > expiry) {
      this.processed.delete(key);
      return false;
    }
    return true;
  }

  async markProcessed(key: string, ttlMs?: number): Promise<void> {
    const expiry = Date.now() + (ttlMs || this.defaultTtlMs);
    this.processed.set(key, expiry);
  }

  // Cleanup expired entries periodically
  cleanup(): void {
    const now = Date.now();
    for (const [key, expiry] of this.processed.entries()) {
      if (now > expiry) {
        this.processed.delete(key);
      }
    }
  }
}

export class RetryConsumer {
  private consumer: Consumer | null = null;
  private producer: Producer | null = null;
  private readonly kafka: Kafka;
  private readonly groupId: string;
  private readonly topics: string[];
  private readonly dlqTopic: string;
  private readonly retryConfig: RetryConfig;
  private readonly idempotencyStore: IdempotencyStore;
  private readonly handler: (payload: EachMessagePayload) => Promise<void>;
  private readonly getIdempotencyKey: (message: KafkaMessage, topic: string) => string;
  private isRunning = false;

  constructor(options: RetryConsumerOptions) {
    this.kafka = options.kafka;
    this.groupId = options.groupId;
    this.topics = options.topics;
    this.dlqTopic = options.dlqTopic;
    this.retryConfig = { ...DEFAULT_RETRY_CONFIG, ...options.retryConfig };
    this.idempotencyStore = options.idempotencyStore || new InMemoryIdempotencyStore();
    this.handler = options.handler;
    this.getIdempotencyKey = options.getIdempotencyKey || this.defaultIdempotencyKey;
  }

  private defaultIdempotencyKey(message: KafkaMessage, topic: string): string {
    // Use message key + offset + topic as idempotency key
    const key = message.key?.toString() || '';
    const offset = message.offset;
    return `${topic}:${key}:${offset}`;
  }

  async start(): Promise<void> {
    if (this.isRunning) {
      console.warn('[RetryConsumer] Already running');
      return;
    }

    this.consumer = this.kafka.consumer({ groupId: this.groupId });
    this.producer = this.kafka.producer();

    await this.consumer.connect();
    await this.producer.connect();

    for (const topic of this.topics) {
      await this.consumer.subscribe({ topic, fromBeginning: false });
    }

    await this.consumer.run({
      eachMessage: async (payload) => {
        await this.processWithRetry(payload);
      },
    });

    this.isRunning = true;
    console.log(`[RetryConsumer] Started for topics: ${this.topics.join(', ')}`);
  }

  private async processWithRetry(payload: EachMessagePayload): Promise<void> {
    const { topic, partition, message } = payload;
    const idempotencyKey = this.getIdempotencyKey(message, topic);

    // Check idempotency - skip if already processed
    if (await this.idempotencyStore.hasProcessed(idempotencyKey)) {
      console.log(`[RetryConsumer] Skipping duplicate message: ${idempotencyKey}`);
      return;
    }

    let lastError: Error | null = null;
    let retryCount = 0;

    // Get retry count from headers if this is a retried message
    const retryHeader = message.headers?.['x-retry-count'];
    if (retryHeader) {
      retryCount = parseInt(retryHeader.toString(), 10) || 0;
    }

    while (retryCount <= this.retryConfig.maxRetries) {
      try {
        await this.handler(payload);
        
        // Mark as processed after successful handling
        await this.idempotencyStore.markProcessed(idempotencyKey);
        
        if (retryCount > 0) {
          console.log(`[RetryConsumer] Message processed successfully after ${retryCount} retries`);
        }
        return;
      } catch (error) {
        lastError = error as Error;
        retryCount++;

        if (retryCount > this.retryConfig.maxRetries) {
          break;
        }

        // Calculate delay with exponential backoff
        const delay = Math.min(
          this.retryConfig.initialDelayMs * Math.pow(this.retryConfig.backoffMultiplier, retryCount - 1),
          this.retryConfig.maxDelayMs
        );

        console.warn(
          `[RetryConsumer] Processing failed, retry ${retryCount}/${this.retryConfig.maxRetries} in ${delay}ms:`,
          error
        );

        await this.sleep(delay);
      }
    }

    // All retries exhausted - send to DLQ
    await this.sendToDLQ(payload, lastError!, retryCount);
  }

  private async sendToDLQ(
    payload: EachMessagePayload,
    error: Error,
    retryCount: number
  ): Promise<void> {
    const { topic, partition, message } = payload;

    const dlqMessage: DLQMessage = {
      originalTopic: topic,
      originalPartition: partition,
      originalOffset: message.offset,
      originalKey: message.key?.toString() || null,
      originalValue: message.value?.toString() || '',
      originalHeaders: this.headersToRecord(message.headers),
      error: error.message,
      errorStack: error.stack,
      retryCount,
      failedAt: new Date().toISOString(),
      consumerGroup: this.groupId,
    };

    try {
      await this.producer!.send({
        topic: this.dlqTopic,
        messages: [
          {
            key: message.key,
            value: JSON.stringify(dlqMessage),
            headers: {
              'x-original-topic': topic,
              'x-error': error.message,
              'x-retry-count': retryCount.toString(),
              'x-failed-at': new Date().toISOString(),
            },
          },
        ],
      });

      console.error(
        `[RetryConsumer] Message sent to DLQ after ${retryCount} retries:`,
        { topic, partition, offset: message.offset, error: error.message }
      );
    } catch (dlqError) {
      console.error('[RetryConsumer] Failed to send message to DLQ:', dlqError);
      // In production, you might want to persist this to a local file or database
      throw dlqError;
    }
  }

  private headersToRecord(headers?: KafkaMessage['headers']): Record<string, string> {
    if (!headers) return {};
    
    const result: Record<string, string> = {};
    for (const [key, value] of Object.entries(headers)) {
      if (value) {
        result[key] = Buffer.isBuffer(value) ? value.toString() : String(value);
      }
    }
    return result;
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  async stop(): Promise<void> {
    if (!this.isRunning) return;

    if (this.consumer) {
      await this.consumer.disconnect();
      this.consumer = null;
    }

    if (this.producer) {
      await this.producer.disconnect();
      this.producer = null;
    }

    this.isRunning = false;
    console.log('[RetryConsumer] Stopped');
  }

  /**
   * Process a message from the DLQ (for manual retry)
   */
  async reprocessDLQMessage(dlqMessage: DLQMessage): Promise<boolean> {
    try {
      const mockPayload: EachMessagePayload = {
        topic: dlqMessage.originalTopic,
        partition: dlqMessage.originalPartition,
        message: {
          key: dlqMessage.originalKey ? Buffer.from(dlqMessage.originalKey) : null,
          value: Buffer.from(dlqMessage.originalValue),
          timestamp: Date.now().toString(),
          attributes: 0,
          offset: dlqMessage.originalOffset,
          headers: {},
        },
        heartbeat: async () => {},
        pause: () => () => {},
      };

      await this.handler(mockPayload);
      return true;
    } catch (error) {
      console.error('[RetryConsumer] DLQ reprocess failed:', error);
      return false;
    }
  }
}

/**
 * Redis-based idempotency store for production use
 * Uncomment and configure with your Redis client
 */
/*
export class RedisIdempotencyStore implements IdempotencyStore {
  private redis: Redis;
  private readonly prefix = 'idempotency:';
  private readonly defaultTtlSeconds = 86400; // 24 hours

  constructor(redisClient: Redis) {
    this.redis = redisClient;
  }

  async hasProcessed(key: string): Promise<boolean> {
    const result = await this.redis.exists(this.prefix + key);
    return result === 1;
  }

  async markProcessed(key: string, ttlMs?: number): Promise<void> {
    const ttlSeconds = ttlMs ? Math.ceil(ttlMs / 1000) : this.defaultTtlSeconds;
    await this.redis.setex(this.prefix + key, ttlSeconds, '1');
  }
}
*/

export default RetryConsumer;
