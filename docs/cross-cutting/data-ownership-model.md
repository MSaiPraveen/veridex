# 📘 Data Ownership Model — Veridex

**Type:** Cross-Cutting Function  
**Pattern:** Database-per-Service, Event Sourcing

---

## 1. Purpose & Scope

### What This Document Covers

The Data Ownership Model defines:

- Which service owns which data
- How data is shared between services
- Tenant isolation patterns
- Data consistency guarantees

### Core Principle

> **Each service owns its database. No service directly accesses another service's database.**

---

## 2. Service → Database Mapping

| Service | Database | Collections |
|---------|----------|-------------|
| Auth Service | `veridex-auth` | `users`, `refreshTokens` |
| User-Org Service | `veridex-users` | `userProfiles`, `organizations`, `memberships` |
| Product Service | `veridex-products` | `products`, `batches` |
| Document Service | `veridex-documents` | `documents` |
| Compliance Service | `veridex-compliance` | `rules`, `results`, `workflows` |
| Notification Service | `veridex-notifications` | `notifications`, `preferences`, `templates` |
| Audit Log Service | `veridex-audit` | `auditEvents` |

---

## 3. Data Ownership Matrix

### User Identity Data

| Data | Owner | Readers | Access Pattern |
|------|-------|---------|----------------|
| Email, password hash | Auth Service | None | Auth only |
| Refresh tokens | Auth Service | None | Auth only |
| firstName, lastName, phone | User-Org Service | All (via API) | Profile API |
| organizationId (on user) | Auth Service | All (via JWT) | In token |

### Organization Data

| Data | Owner | Readers | Access Pattern |
|------|-------|---------|----------------|
| Organization details | User-Org Service | All | Organization API |
| Membership records | User-Org Service | Products, Documents | Headers |
| Org settings | User-Org Service | None | Org API only |

### Product Data

| Data | Owner | Readers | Access Pattern |
|------|-------|---------|----------------|
| Product catalog | Product Service | All | Product API |
| Compliance status | Product Service | All | Product API |
| Product documents | Document Service | Product (refs only) | Document API |

### Compliance Data

| Data | Owner | Readers | Access Pattern |
|------|-------|---------|----------------|
| Rules | Compliance Service | Admin only | Rules API |
| Evaluation results | Compliance Service | Products, Merchants | Results API |
| Review workflows | Compliance Service | Admin only | Workflow API |

---

## 4. Multi-Tenancy Model

### Tenant Identifier

```typescript
// Organization ID is the tenant identifier
interface TenantContext {
  organizationId: string;  // From JWT via gateway
}
```

### Tenant Isolation Strategy

| Layer | Mechanism |
|-------|-----------|
| Gateway | Extract organizationId from JWT, inject header |
| Service | Filter all queries by organizationId |
| Database | No database-level isolation (single DB) |

### Query Filtering Pattern

```typescript
// In every repository method
async findAll(options: QueryOptions): Promise<Product[]> {
  const filter: FilterQuery<Product> = { isActive: true };
  
  // CRITICAL: Always filter by organization
  if (options.organizationId) {
    filter.organizationId = new ObjectId(options.organizationId);
  }
  
  // Exception: Admin can see all
  if (options.role === 'ADMIN' && options.includeAll) {
    delete filter.organizationId;
  }
  
  return this.model.find(filter);
}
```

### Global vs Organization Data

| Scope | Visibility | Example |
|-------|------------|---------|
| `GLOBAL` | All users | Platform-defined products |
| `ORGANIZATION` | Org members + Admin | Merchant's products |

---

## 5. Cross-Service Data Access

### Pattern: API Calls (Sync)

```typescript
// Compliance Service needs product data
const product = await fetch(`${PRODUCT_SERVICE_URL}/products/${productId}`, {
  headers: {
    'x-internal-key': INTERNAL_SERVICE_KEY,
  }
}).then(r => r.json());
```

### Pattern: Event Payload (Async)

```typescript
// Instead of fetching, include data in event
emit('document.uploaded', {
  documentId: doc._id,
  productId: doc.productId,
  type: doc.type,
  organizationId: doc.organizationId, // Include for context
});
```

### Anti-Pattern: Direct Database Access ❌

```typescript
// NEVER DO THIS
import { ProductModel } from 'product-service/models';
const products = await ProductModel.find({ category: 'CBD' });
```

---

## 6. Data Duplication Strategy

### Allowed Duplication

| Data | Original Owner | Duplicated In | Reason |
|------|----------------|---------------|--------|
| organizationId | User-Org | Products, Documents | Query filtering |
| userId | Auth | Documents, Products | Ownership tracking |
| productId | Products | Documents, Compliance | Foreign key |

### Synchronization

- Duplicated IDs are **immutable references** (never updated)
- If original is deleted, references become orphans (acceptable)
- No cascade deletes across services

---

## 7. Consistency Model

### Strong Consistency

Within single service: All operations are atomic.

### Eventual Consistency

Across services: Events propagate asynchronously.

| Scenario | Consistency |
|----------|-------------|
| Create product → Query product | Strong (same service) |
| Upload document → Compliance status | Eventual (via Kafka) |
| Register user → Organization exists | Eventual (< 1 second typical) |

### Handling Eventual Consistency

```typescript
// Frontend: Poll or show loading state
const { data, isLoading } = useProduct(id, { 
  refetchInterval: 5000 // Poll every 5s
});

if (data?.complianceStatus === 'PENDING') {
  return <Skeleton />; // Still processing
}
```

---

## 8. Data Lifecycle

### Creation Flow

```
User Action → Gateway → Service → Database → Kafka Event
                                       ↓
                             Other Services Update
```

### Update Flow

```
User Action → Gateway → Service → Database → Kafka Event
                                       ↓
                             Audit Service Records
```

### Deletion Flow

```
User Action → Gateway → Service → Soft Delete → Kafka Event
                                       ↓
                             No cascade (orphan refs OK)
```

### Soft Delete Pattern

```typescript
// Never hard delete
product.isActive = false;
product.deletedAt = new Date();
product.deletedBy = userId;
await product.save();
```

---

## 9. Known Issues

| Issue | Impact | Priority |
|-------|--------|----------|
| No cascade deletes | Orphan references | Low |
| String vs ObjectId | Query mismatches | **Fixed** |
| Missing organization check | Data leak | **Fixed** |
| No data validation across services | Inconsistent refs | Medium |

---

## 10. Integration Guidelines

### For New Collections

1. Add to owner service's database only
2. Include `organizationId` if tenant-specific
3. Add `ownerId` for user-specific records
4. Add `isActive` for soft delete support
5. Add `createdAt`, `updatedAt` timestamps

### For Cross-Service Needs

1. Prefer events over API calls
2. Include necessary context in event payload
3. Accept eventual consistency
4. Document which events carry which data

---

*Document Version: 1.0*  
*Last Updated: January 2026*
