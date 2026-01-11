# Audit Model

Auditability is a core requirement of Veridex.
In regulated industries, if it isn't auditable, it isn't compliant.

---

## What Is Audited

### User Actions
- Login attempts (success and failure)
- Document uploads
- Product creation/modification
- Organization changes

### System Decisions
- Compliance evaluations
- Rule applications
- Automated status changes

### Administrative Actions
- Rule creation/modification
- User management
- Manual reviews

---

## Audit Log Characteristics

| Property | Description |
|----------|-------------|
| **Append-only** | Records can only be added, never modified |
| **Immutable** | Once written, cannot be changed or deleted |
| **Time-ordered** | Chronological sequence preserved |
| **System-generated** | Timestamps from trusted source |
| **Contextual** | Full context captured at time of event |

---

## Audit Record Structure

```typescript
interface AuditLog {
  // Identification
  id: string;
  timestamp: Date;
  
  // Actor
  actorType: 'USER' | 'SYSTEM' | 'SERVICE';
  actorId: string;
  actorRole?: string;
  
  // Action
  eventType: string;
  action: string;
  
  // Target
  entityType: 'PRODUCT' | 'DOCUMENT' | 'USER' | 'ORGANIZATION' | 'RULE' | 'COMPLIANCE';
  entityId: string;
  
  // Context
  metadata: Record<string, unknown>;
  previousState?: Record<string, unknown>;
  newState?: Record<string, unknown>;
  
  // Source
  sourceService: string;
  correlationId: string;
  ipAddress?: string;
}
```

---

## Event Types

### Authentication Events
| Event | Description |
|-------|-------------|
| `AUTH_LOGIN_SUCCESS` | Successful login |
| `AUTH_LOGIN_FAILURE` | Failed login attempt |
| `AUTH_LOGOUT` | User logout |
| `AUTH_TOKEN_REFRESH` | Token refreshed |

### Product Events
| Event | Description |
|-------|-------------|
| `PRODUCT_CREATED` | New product created |
| `PRODUCT_UPDATED` | Product modified |
| `PRODUCT_DELETED` | Product removed |
| `PRODUCT_COMPLIANCE_CHANGED` | Status updated |

### Document Events
| Event | Description |
|-------|-------------|
| `DOCUMENT_UPLOADED` | New document uploaded |
| `DOCUMENT_PROCESSED` | Extraction completed |
| `DOCUMENT_FAILED` | Processing failed |
| `DOCUMENT_DELETED` | Document removed |

### Compliance Events
| Event | Description |
|-------|-------------|
| `COMPLIANCE_EVALUATED` | Rule evaluation completed |
| `COMPLIANCE_PASSED` | Product passed compliance |
| `COMPLIANCE_FAILED` | Product failed compliance |
| `RULE_CREATED` | New rule added |
| `RULE_UPDATED` | Rule modified |

### Administrative Events
| Event | Description |
|-------|-------------|
| `USER_CREATED` | New user registered |
| `USER_UPDATED` | User profile modified |
| `USER_DEACTIVATED` | User disabled |
| `MANUAL_REVIEW` | Admin manual review |

---

## Retention Policy

| Data Type | Retention |
|-----------|-----------|
| Security events | 7 years |
| Compliance decisions | 7 years |
| User actions | 3 years |
| System events | 1 year |

Retention periods based on regulatory requirements.

---

## Access Control

| Role | Access |
|------|--------|
| CONSUMER | None |
| MERCHANT | Own organization events only |
| ADMIN | All events (read-only) |

**Critical**: No role can delete or modify audit logs.

---

## Implementation Details

### Storage
- MongoDB with immutable collection
- Write-once pattern enforced
- Indexes on timestamp, actorId, entityId

### Ingestion
- Kafka consumer for event processing
- Async write to ensure no blocking
- Retry with dead-letter queue

### Querying
- Time-range queries
- Actor-based filtering
- Entity-based filtering
- Full-text search on metadata

---

## Why This Matters

1. **Regulatory Compliance**: Required for regulated industries
2. **Legal Defensibility**: Evidence in disputes
3. **Incident Investigation**: Trace what happened
4. **Trustworthiness**: Prove system integrity
5. **Deterrence**: Actions have consequences

> If it isn't auditable, it isn't compliant.
