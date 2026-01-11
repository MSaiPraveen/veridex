# 📘 Event Bus & Messaging — Veridex

**Type:** Cross-Cutting Function  
**Technology:** Apache Kafka  
**Package:** `@veridex/event-contracts`

---

## 1. Purpose & Scope

### What This System Does

The Event Bus provides **asynchronous communication** between services. It enables:

- Loose coupling between services
- Event-driven workflows
- Reliable event delivery
- Audit trail capture

### Why Event-Driven Architecture

| Benefit | Example |
|---------|---------|
| Loose Coupling | Document Service doesn't call Compliance Service directly |
| Reliability | Kafka persists events if consumer is down |
| Scalability | Consumers scale independently |
| Auditability | All events captured by Audit Service |

---

## 2. Infrastructure

### Kafka Configuration

```yaml
# From docker-compose.yml
kafka:
  image: confluentinc/cp-kafka:7.5.0
  ports:
    - "9092:9092"
  environment:
    KAFKA_AUTO_CREATE_TOPICS_ENABLE: "true"
    KAFKA_OFFSETS_TOPIC_REPLICATION_FACTOR: 1
```

### Connection Details

| Service | Connection String |
|---------|-------------------|
| Kafka Broker | `kafka:9092` (Docker) |
| Zookeeper | `zookeeper:2181` |

---

## 3. Topic Registry

### All Topics (from `@veridex/event-contracts`)

```typescript
export const Topics = {
  // Auth Events
  AUTH_USER_REGISTERED: 'auth.user.registered',
  AUTH_USER_LOGGED_IN: 'auth.user.logged_in',
  AUTH_USER_LOGGED_OUT: 'auth.user.logged_out',
  
  // Product Events
  PRODUCT_CREATED: 'product.created',
  PRODUCT_UPDATED: 'product.updated',
  PRODUCT_DELETED: 'product.deleted',
  PRODUCT_STATUS_CHANGED: 'product.status_changed',
  PRODUCT_COMPLIANCE_CHANGED: 'product.compliance_changed',
  
  // Document Events
  DOCUMENT_UPLOADED: 'document.uploaded',
  DOCUMENT_UPDATED: 'document.updated',
  DOCUMENT_DELETED: 'document.deleted',
  DOCUMENT_PROCESSED: 'document.processed',
  DOCUMENT_REJECTED: 'document.rejected',
  DOCUMENT_EXPIRING: 'document.expiring',
  DOCUMENT_ADMIN_REVIEW_REQUIRED: 'document.admin.review.required',
  
  // Batch Events
  BATCH_CREATED: 'batch.created',
  BATCH_COMPLIANCE_REQUESTED: 'batch.compliance.requested',
  BATCH_COMPLIANCE_EVALUATED: 'batch.compliance.evaluated',
  
  // Compliance Events
  COMPLIANCE_CHECK_REQUESTED: 'compliance.check_requested',
  COMPLIANCE_CHECK_COMPLETED: 'compliance.check_completed',
  COMPLIANCE_VIOLATION: 'compliance.violation',
  
  // Organization Events
  ORG_CREATED: 'organization.created',
  ORG_MEMBER_ADDED: 'organization.member.added',
  
  // Notification Events
  NOTIFICATION_SEND: 'notification.send',
  NOTIFICATION_SENT: 'notification.sent',
  
  // Audit
  AUDIT_EVENT: 'audit.events',
};
```

---

## 4. Event Flow Matrix

### Producer → Consumer Mapping

| Event | Producer | Consumers |
|-------|----------|-----------|
| `auth.user.registered` | Auth Service | User-Org, Audit |
| `auth.user.logged_in` | Auth Service | Audit |
| `product.created` | Product Service | Compliance, Audit |
| `product.compliance_changed` | Compliance Service | Product, Notification, Audit |
| `document.uploaded` | Document Service | Compliance, Audit |
| `document.processed` | Document Service | Compliance |
| `compliance.check_completed` | Compliance Service | Product, Notification, Audit |
| `organization.created` | User-Org Service | Audit |
| `notification.send` | Any Service | Notification Service |

---

## 5. Event Schema Standards

### Base Event Structure

```typescript
interface BaseEvent {
  id: string;           // UUID for deduplication
  type: string;         // Event type from Topics
  timestamp: Date;      // When event occurred
  source: string;       // Service name
  correlationId?: string;  // Request ID for tracing
  userId?: string;      // Acting user
  organizationId?: string; // Tenant context
}
```

### Example: DOCUMENT_UPLOADED

```typescript
interface DocumentUploadedEvent extends BaseEvent {
  type: 'document.uploaded';
  payload: {
    documentId: string;
    type: DocumentType;
    productId?: string;
    fileName: string;
    mimeType: string;
    size: number;
  };
}
```

### Example: COMPLIANCE_CHECK_COMPLETED

```typescript
interface ComplianceCompletedEvent extends BaseEvent {
  type: 'compliance.check_completed';
  payload: {
    productId: string;
    status: 'COMPLIANT' | 'NON_COMPLIANT' | 'PENDING';
    results: {
      ruleId: string;
      passed: boolean;
      message?: string;
    }[];
    evaluatedAt: Date;
  };
}
```

---

## 6. Producer Pattern

### Shared Kafka Producer

```typescript
// packages/shared/src/kafka/producer.ts
import { Kafka, Producer } from 'kafkajs';

let producer: Producer;

export async function getProducer(): Promise<Producer> {
  if (!producer) {
    const kafka = new Kafka({
      brokers: [process.env.KAFKA_BROKER || 'localhost:9092'],
    });
    producer = kafka.producer();
    await producer.connect();
  }
  return producer;
}

export async function emit(topic: string, event: object): Promise<void> {
  const producer = await getProducer();
  await producer.send({
    topic,
    messages: [{ value: JSON.stringify(event) }],
  });
}
```

### Service Usage

```typescript
// In document.service.ts
import { Topics } from '@veridex/event-contracts';
import { emit } from '@veridex/shared/kafka';

export async function uploadDocument(data: CreateDocumentInput) {
  const document = await DocumentRepo.create(data);
  
  // Fire and forget (current pattern)
  emit(Topics.DOCUMENT_UPLOADED, {
    type: Topics.DOCUMENT_UPLOADED,
    timestamp: new Date(),
    payload: {
      documentId: document._id,
      type: document.type,
      productId: document.productId,
    },
  }).catch(console.error);
  
  return document;
}
```

---

## 7. Consumer Pattern

### Service Consumer Setup

```typescript
// In compliance-service/src/events/consumer.ts
import { Kafka } from 'kafkajs';
import { Topics } from '@veridex/event-contracts';

export async function startConsumer() {
  const kafka = new Kafka({
    brokers: [process.env.KAFKA_BROKER || 'localhost:9092'],
  });
  
  const consumer = kafka.consumer({ 
    groupId: 'compliance-service' 
  });
  
  await consumer.connect();
  await consumer.subscribe({ 
    topics: [
      Topics.DOCUMENT_UPLOADED,
      Topics.PRODUCT_CREATED,
    ],
  });
  
  await consumer.run({
    eachMessage: async ({ topic, message }) => {
      const event = JSON.parse(message.value.toString());
      await handleEvent(topic, event);
    },
  });
}

async function handleEvent(topic: string, event: any) {
  switch (topic) {
    case Topics.DOCUMENT_UPLOADED:
      await queueComplianceEvaluation(event.payload.productId);
      break;
    case Topics.PRODUCT_CREATED:
      await runInitialEvaluation(event.payload.productId);
      break;
  }
}
```

---

## 8. Message Delivery Guarantees

### Current Implementation

| Guarantee | Status |
|-----------|--------|
| At-most-once delivery | ✅ (fire and forget) |
| At-least-once delivery | ❌ (no retry) |
| Exactly-once delivery | ❌ |
| Message ordering | ✅ (per partition) |

### Failure Behavior

| Scenario | Behavior | Impact |
|----------|----------|--------|
| Kafka down at emit | Error logged, event lost | Downstream not triggered |
| Kafka down at consume | Consumer reconnects | Events processed after recovery |
| Consumer crashes | Another instance takes over | Possible duplicate processing |

---

## 9. Audit Service Special Case

### Universal Consumer

Audit Service subscribes to ALL topics:

```typescript
await consumer.subscribe({ 
  topics: Object.values(Topics),
});
```

### Immutable Storage

Every event is stored as-is:

```typescript
await AuditEventRepo.create({
  topic: message.topic,
  eventType: event.type,
  payload: event,
  timestamp: event.timestamp,
  userId: event.userId,
  organizationId: event.organizationId,
  ingested_at: new Date(),
});
```

---

## 10. Monitoring & Observability

### Key Metrics

| Metric | Description |
|--------|-------------|
| `kafka_producer_send_total` | Events sent per topic |
| `kafka_consumer_lag` | Events not yet processed |
| `kafka_consumer_errors_total` | Processing failures |

### Logging

```typescript
// Producer logging
console.log(`[KAFKA] Emitting ${topic}`, { eventId: event.id });

// Consumer logging
console.log(`[KAFKA] Received ${topic}`, { eventId: event.id });
console.log(`[KAFKA] Processed ${topic}`, { eventId: event.id, duration: ms });
```

---

## 11. Known Issues & Technical Debt

| Issue | Impact | Priority |
|-------|--------|----------|
| Fire-and-forget emission | Lost events | High |
| No dead letter queue | Failed events lost | High |
| No retry mechanism | Manual intervention | High |
| No schema validation | Bad events crash consumers | Medium |
| Hardcoded broker URL | Environment inflexibility | Low |

### Recommended Improvements

1. Add outbox pattern for reliable emission
2. Implement dead letter queue
3. Add event schema validation
4. Add consumer health checks
5. Add idempotency keys

---

## 12. Integration Guidelines

### Adding a New Event

1. Add topic to `@veridex/event-contracts/topics.ts`
2. Define payload interface in contracts package
3. Add producer code in originating service
4. Add consumer code in listening services
5. Update Audit Service if needed

### Adding a New Consumer

1. Create consumer file in service's `events/` directory
2. Subscribe to relevant topics
3. Implement handler for each event type
4. Register consumer in service startup
5. Add consumer group ID unique to service

---

*Document Version: 1.0*  
*Last Updated: January 2026*
