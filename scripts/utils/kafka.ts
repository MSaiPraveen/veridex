/**
 * Kafka utility for scripts (placeholder).
 * 
 * Used when seeds need to emit events for downstream services.
 * Currently a stub - implement when Kafka is configured.
 */

export interface KafkaConfig {
  brokers: string[];
  clientId: string;
}

/**
 * Placeholder Kafka producer.
 * Will be implemented when event emission is needed during seeding.
 */
export class ScriptKafkaProducer {
  private connected = false;

  constructor(private config: KafkaConfig) {}

  async connect(): Promise<void> {
    console.log('[kafka] Producer connect (stub)');
    this.connected = true;
  }

  async disconnect(): Promise<void> {
    console.log('[kafka] Producer disconnect (stub)');
    this.connected = false;
  }

  async emit(topic: string, payload: unknown): Promise<void> {
    if (!this.connected) {
      throw new Error('Kafka producer not connected');
    }
    console.log(`[kafka] Emit to ${topic}:`, JSON.stringify(payload).slice(0, 100));
  }
}

/**
 * Create a Kafka producer instance.
 * Returns null if Kafka is not configured.
 */
export function createProducer(): ScriptKafkaProducer | null {
  const brokers = process.env.KAFKA_BROKERS?.split(',');
  
  if (!brokers || brokers.length === 0) {
    console.log('[kafka] No brokers configured, skipping Kafka');
    return null;
  }

  return new ScriptKafkaProducer({
    brokers,
    clientId: 'veridex-scripts',
  });
}
