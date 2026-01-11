# 📘 Audit Log Service — Veridex

**Service Path:** `apps/audit-log-service`  
**Port:** 3008  
**Database:** `veridex-audit` (MongoDB Atlas)  
**Interacting Roles:** Admin (query), System (write)

---

## 1. Purpose & Scope

### What This Service Exists To Do

The Audit Log Service is the **immutable record keeper** for all system events. It handles:

- Event ingestion from all services
- Immutable storage of audit records
- Query interface for compliance auditors
- Admin dashboard data

### What It Explicitly Does NOT Do

| Responsibility | Owned By |
|----------------|----------|
| Event emission | Individual services |
| Real-time notifications | Notification Service |
| Business logic | Other services |
| Data modification | NEVER modifies existing records |

### Why Immutability Matters

- **Regulatory Compliance:** SOC2, HIPAA require tamper-proof logs
- **Forensics:** Investigate incidents without doubt
- **Legal:** Evidence in disputes

---

## 2. Ownership & Data Boundaries

### Data This Service Owns

| Collection | Key Fields | Purpose |
|------------|------------|---------|
| `auditEvents` | `topic`, `eventType`, `payload`, `timestamp`, `userId`, `organizationId`, `requestId` | Immutable event log |

### Event Structure

```typescript
interface AuditEvent {
  _id: ObjectId;
  topic: string;           // Kafka topic
  eventType: string;       // Event name
  payload: object;         // Full event data
  timestamp: Date;         // When event occurred
  userId?: string;         // Who triggered
  organizationId?: string; // Tenant context
  requestId?: string;      // Correlation ID
  ingested_at: Date;       // When stored
}
```

---

## 3. Responsibilities

- ✅ Subscribe to ALL Kafka topics
- ✅ Store every event immutably
- ✅ Provide query APIs for admins
- ✅ Support filtering by user, org, time
- ✅ Generate audit reports
- ✅ NEVER delete or update records

---

## 4. Public API Surface

### Admin Query Endpoints (Admin Only)

| Method | Path | Description |
|--------|------|-------------|
| GET | `/audit/events` | Query events with filters |
| GET | `/audit/events/:id` | Get single event |
| GET | `/audit/user/:userId` | Events by user |
| GET | `/audit/organization/:orgId` | Events by org |
| GET | `/audit/resource/:type/:id` | Events by resource |
| GET | `/audit/report` | Generate compliance report |

### Query Parameters

```typescript
{
  startDate?: Date;
  endDate?: Date;
  eventType?: string;
  userId?: string;
  organizationId?: string;
  limit?: number;        // Max 1000
  offset?: number;
}
```

---

## 5. Internal Workflow

### Event Ingestion Flow

```
1. Kafka Consumer receives event from ANY topic
   ↓
2. Parse event payload
   ↓
3. Extract metadata:
   - userId from payload
   - organizationId from payload
   - requestId from payload
   ↓
4. Create audit record:
   {
     topic: event.topic,
     eventType: event.type,
     payload: event (full),
     timestamp: event.timestamp || now(),
     userId,
     organizationId,
     requestId,
     ingested_at: now()
   }
   ↓
5. Insert into MongoDB
   - WriteAcknowledged: majority
   ↓
6. No response (Kafka consumer pattern)
```

---

## 6. Event & Async Communication

### Events Consumed

**ALL TOPICS** — This service subscribes to every event:

| Topic Pattern | Purpose |
|---------------|---------|
| `auth.*` | User authentication events |
| `product.*` | Product lifecycle |
| `document.*` | Document operations |
| `compliance.*` | Compliance evaluations |
| `organization.*` | Org changes |
| `notification.*` | Notification delivery |

### Events Emitted

**NONE** — Audit Service does not emit events (prevents infinite loops).

---

## 7. Dependencies

### Internal

| Service | Purpose |
|---------|---------|
| Kafka | All event topics |

### External

| Dependency | Purpose | Notes |
|------------|---------|-------|
| MongoDB Atlas | Audit storage | **INSERT-ONLY permissions** |

---

## 8. Failure Modes

| Failure | Impact | Mitigation |
|---------|--------|------------|
| Kafka down | No new events captured | Kafka retention allows replay |
| MongoDB down | Events buffered in memory | Risk of loss if prolonged |
| Consumer crash | Events queued in Kafka | Consumer group failover |

### Data Integrity

- **No updates:** Collection has no update permissions
- **No deletes:** Collection has no delete permissions
- **TTL optional:** Events can be archived after N years

---

## 9. Security & RBAC

| Action | Consumer | Merchant | Admin |
|--------|----------|----------|-------|
| View own events | ❌ | ❌ | ❌ |
| View org events | ❌ | ❌ | ✅ |
| View all events | ❌ | ❌ | ✅ |
| Query by user | ❌ | ❌ | ✅ |
| Generate reports | ❌ | ❌ | ✅ |

### Why No Merchant Access

Audit logs contain cross-tenant information. Even filtered queries risk side-channel leaks. Only admins who can see all data anyway have access.

---

## 10. Observability

### Metrics

- `audit_events_ingested_total` by topic
- `audit_events_query_duration_seconds`
- `audit_consumer_lag`

### Self-Auditing

The Audit Service logs its own operations to stdout (not back to Kafka to avoid loops).

---

## 11. Performance Considerations

### Indexes

```javascript
db.auditEvents.createIndex({ timestamp: -1 })
db.auditEvents.createIndex({ userId: 1, timestamp: -1 })
db.auditEvents.createIndex({ organizationId: 1, timestamp: -1 })
db.auditEvents.createIndex({ eventType: 1, timestamp: -1 })
db.auditEvents.createIndex({ requestId: 1 })
```

### Storage Growth

- ~1KB per event average
- Retention policy needed for long-term
- Consider archiving to cold storage

---

## 12. Known Issues

| Issue | Impact | Priority |
|-------|--------|----------|
| No archiving | Unbounded growth | Medium |
| No export API | Manual compliance reports | Medium |
| No hash chain | No cryptographic tamper detection | Low |

---

## 13. Integration Checklist

- [ ] Kafka consumer group configured
- [ ] All topics subscribed
- [ ] MongoDB user has INSERT-only permissions
- [ ] Indexes created
- [ ] Storage monitoring in place

---

*Document Version: 1.0*  
*Last Updated: January 2026*
