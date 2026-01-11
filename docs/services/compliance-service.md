# 📘 Compliance Service — Veridex

**Service Path:** `apps/compliance-service`  
**Port:** 3006  
**Database:** `veridex-compliance` (MongoDB Atlas)  
**Interacting Roles:** Admin (rules), Merchant (results), System (evaluation)

---

## 1. Purpose & Scope

### What This Service Exists To Do

The Compliance Service is the **rule engine** for product compliance evaluation. It handles:

- Compliance rule definition and management
- Rule evaluation against products/documents
- Compliance result storage
- Batch compliance processing
- Admin review workflows

### What It Explicitly Does NOT Do

| Responsibility | Owned By |
|----------------|----------|
| Document storage | Document Service |
| Product data | Product Service |
| Notification delivery | Notification Service |
| Audit logging | Audit Service |

### Why It Exists As A Separate Service

1. **Complex Logic:** Rule evaluation is CPU-intensive
2. **Independent Scaling:** Batch processing needs scale-out
3. **Rule Versioning:** Rules need independent lifecycle
4. **Separation of Concerns:** Keep evaluation logic isolated

---

## 2. Ownership & Data Boundaries

### Data This Service Owns

| Collection | Key Fields | Purpose |
|------------|------------|---------|
| `rules` | `name`, `category`, `jurisdiction`, `conditions`, `severity`, `status` | Rule definitions |
| `results` | `productId`, `ruleId`, `status`, `evaluatedAt`, `details` | Evaluation outcomes |
| `workflows` | `documentId`, `productId`, `status`, `assignedTo`, `resolution` | Admin review queue |

### Rule Structure

```typescript
interface ComplianceRule {
  _id: ObjectId;
  name: string;
  description: string;
  category: 'CANNABIS' | 'HEMP_CBD' | 'PHARMACEUTICAL' | 'SUPPLEMENT';
  jurisdiction: 'FEDERAL' | 'STATE' | 'LOCAL';
  type: 'DOCUMENT_REQUIRED' | 'THRESHOLD' | 'EXPIRATION' | 'CUSTOM';
  conditions: {
    documentType?: string;
    minValue?: number;
    maxValue?: number;
    field?: string;
  };
  severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
  status: 'ACTIVE' | 'INACTIVE';
  effectiveDate?: Date;
  expirationDate?: Date;
}
```

---

## 3. Responsibilities

- ✅ Define and store compliance rules
- ✅ Evaluate products against applicable rules
- ✅ Store evaluation results
- ✅ Trigger re-evaluation on document changes
- ✅ Manage admin review workflows
- ✅ Emit compliance events
- ✅ Support batch evaluation

---

## 4. Public API Surface

### Rule Management (Admin Only)

| Method | Path | Description |
|--------|------|-------------|
| GET | `/rules` | List all rules |
| POST | `/rules` | Create rule |
| GET | `/rules/:id` | Get rule details |
| PUT | `/rules/:id` | Update rule |
| DELETE | `/rules/:id` | Deactivate rule |

### Result Queries

| Method | Path | Description | Auth |
|--------|------|-------------|------|
| GET | `/results/:productId` | Get compliance results | Owner/Admin |
| GET | `/results` | List all results | Admin |

### Batch Processing

| Method | Path | Description |
|--------|------|-------------|
| POST | `/batch/evaluate` | Evaluate multiple products |
| GET | `/batch/:id/status` | Check batch status |

### Admin Workflows

| Method | Path | Description |
|--------|------|-------------|
| GET | `/admin/workflows/queue` | Get review queue |
| GET | `/admin/workflows/:id` | Get workflow details |
| POST | `/admin/workflows/:id/approve` | Approve compliance |
| POST | `/admin/workflows/:id/reject` | Reject compliance |
| POST | `/admin/workflows/:id/assign` | Assign to admin |

---

## 5. Internal Workflow

### Evaluation Flow

```
1. Event Received: DOCUMENT_UPLOADED
   { documentId, productId, type }
   ↓
2. Fetch Product Data:
   GET product-service/products/:productId
   ↓
3. Fetch Documents:
   GET document-service/documents/product/:productId
   ↓
4. Identify Applicable Rules:
   - Match product category
   - Match jurisdiction
   - Filter by status: ACTIVE
   ↓
5. Evaluate Each Rule:
   For each rule:
     - Check conditions against product/documents
     - Generate pass/fail result
     - Store result
   ↓
6. Aggregate Status:
   - Any CRITICAL fail → NON_COMPLIANT
   - All pass → COMPLIANT
   - Missing docs → PENDING
   ↓
7. Emit Event:
   COMPLIANCE_CHECK_COMPLETED
   { productId, status, results }
   ↓
8. Update Product Status (via event)
```

### Admin Review Flow

```
1. Document flagged for review
   (low confidence extraction OR policy violation)
   ↓
2. Create Workflow:
   {
     documentId,
     productId,
     status: 'PENDING_REVIEW',
     priority: determined by severity
   }
   ↓
3. Admin views queue, claims item
   ↓
4. Admin reviews document and product
   ↓
5. Admin approves or rejects
   ↓
6. Emit COMPLIANCE_CHECK_COMPLETED with admin decision
   ↓
7. Close workflow
```

---

## 6. Event & Async Communication

### Events Consumed

| Event | Topic | Action |
|-------|-------|--------|
| `DOCUMENT_UPLOADED` | `document.uploaded` | Queue evaluation |
| `DOCUMENT_PROCESSED` | `document.processed` | Trigger evaluation |
| `PRODUCT_CREATED` | `product.created` | Initial evaluation |

### Events Emitted

| Event | Topic | Payload | Consumers |
|-------|-------|---------|-----------|
| `COMPLIANCE_CHECK_COMPLETED` | `compliance.check_completed` | `{ productId, status, results }` | Product Service, Notification |
| `COMPLIANCE_VIOLATION` | `compliance.violation` | `{ productId, rule, severity }` | Notification, Audit |
| `COMPLIANCE_AUTO_REJECTED` | `compliance.auto.rejected` | `{ productId, reason }` | Audit |

---

## 7. Dependencies

### Internal

| Service | Purpose | Failure Impact |
|---------|---------|----------------|
| Product Service | Get product data | Cannot evaluate |
| Document Service | Get document data | Cannot evaluate |
| Kafka | Events | Evaluations not triggered |

### External

| Dependency | Purpose |
|------------|---------|
| MongoDB Atlas | Store rules, results, workflows |

---

## 8. Failure Modes

| Failure | Behavior | Recovery |
|---------|----------|----------|
| Product Service down | Evaluation queued | Retry via Kafka |
| Document Service down | Evaluation fails | Retry via Kafka |
| Rule evaluation error | Log error, continue | Manual investigation |
| DB failure | Complete failure | Service restart |

---

## 9. Security & RBAC

| Action | Consumer | Merchant | Admin |
|--------|----------|----------|-------|
| View own results | ❌ | ✅ | ✅ |
| View all results | ❌ | ❌ | ✅ |
| Manage rules | ❌ | ❌ | ✅ |
| Approve/reject | ❌ | ❌ | ✅ |

---

## 10. Performance Considerations

### Scaling

- **Batch Processing:** Can process 100s of products in parallel
- **Rule Caching:** Active rules cached in memory
- **Async Evaluation:** Don't block document upload

### Bottlenecks

| Bottleneck | Mitigation |
|------------|------------|
| External service calls | Parallel fetching |
| Complex rule logic | Pre-compile conditions |
| Large batch jobs | Queue with workers |

---

## 11. Known Issues

| Issue | Impact | Priority |
|-------|--------|----------|
| No rule versioning | Historical results orphaned | Medium |
| Sync service calls | Evaluation latency | Medium |
| No retry queue | Lost evaluations | High |

---

## 12. Integration Checklist

- [ ] Product Service accessible
- [ ] Document Service accessible
- [ ] Kafka consumer running
- [ ] Rules seeded in database
- [ ] Workflow queue initialized

---

*Document Version: 1.0*  
*Last Updated: January 2026*
