# 📘 Product Service — Veridex

**Service Path:** `apps/product-service`  
**Port:** 3004  
**Database:** `veridex-products` (MongoDB Atlas)  
**Interacting Roles:** Consumer (read), Merchant (CRUD), Admin (full)

---

## 1. Purpose & Scope

### What This Service Exists To Do

The Product Service is the **source of truth for product catalog data**. It manages:

- Product creation, update, and deletion
- Product categorization and metadata
- Scope management (GLOBAL vs ORGANIZATION products)
- Compliance status tracking (reflecting Compliance Service decisions)
- Public product catalog for consumer browsing
- Batch tracking for product lots

### What It Explicitly Does NOT Do

| Responsibility | Owned By |
|----------------|----------|
| Document storage | Document Service |
| Compliance rule evaluation | Compliance Service |
| User management | User-Org Service |
| Order/transaction processing | Not implemented |
| Pricing/inventory management | Partially here (metadata only) |

### Why It Exists As A Separate Service

1. **Domain Isolation:** Product catalog is a distinct business domain
2. **Tenant Isolation:** Organization-scoped products require careful filtering
3. **Scalability:** Product queries can be read-heavy; scale independently
4. **Public Access:** Consumer-facing catalog has different access patterns

---

## 2. Ownership & Data Boundaries

### Data This Service Owns

| Collection | Key Fields | Purpose |
|------------|------------|---------|
| `products` | `name`, `sku`, `category`, `description`, `scope`, `organizationId`, `merchantId`, `complianceStatus`, `status`, `price`, `quantity` | Core product catalog |
| `batches` | `batchNumber`, `productId`, `quantity`, `manufacturingDate`, `expirationDate` | Lot tracking (planned) |

### Data It May Read (Read-Only)

- Organization details (via `x-organization-id` header from Gateway)
- User role (via `x-user-role` header)

### Data It Must Never Access

- User credentials or passwords
- Document file contents
- Compliance rules
- Audit logs

### Product Scopes

| Scope | Visibility | Created By |
|-------|------------|------------|
| `GLOBAL` | All users can see | Admin only |
| `ORGANIZATION` | Only org members and admins | Merchant (auto-assigned) |

---

## 3. Responsibilities

- ✅ Create products with organization isolation
- ✅ Enforce tenant isolation on all queries
- ✅ Maintain GLOBAL products visible to all
- ✅ Track compliance status (updated via events)
- ✅ Provide sanitized public catalog
- ✅ Support product import from global catalog (planned)
- ✅ Emit product lifecycle events to Kafka
- ✅ Soft-delete products (set `isActive: false`)

---

## 4. Public API Surface

### Public Endpoints (No Auth Required)

#### GET `/public/products`

**Description:** List all active products for consumer browsing

**Query Parameters:**
```typescript
{
  limit?: number;       // Default 20, max 100
  offset?: number;      // Pagination offset
  category?: string;    // Filter by category
  search?: string;      // Text search
}
```

**Response Schema:**
```typescript
{
  success: true,
  data: [{
    _id: string,
    id: string,          // Alias for _id
    name: string,
    sku: string,
    category: string,
    description: string,
    complianceStatus: string,
    merchantName: string,
    organizationName: string,
    price: number,
    images: string[],
    createdAt: Date,
    updatedAt: Date
    // EXCLUDED: merchantId, organizationId, internalNotes
  }],
  total: number,
  page: number,
  limit: number,
  totalPages: number
}
```

**Sanitization:** Sensitive fields stripped before response.

---

#### GET `/public/products/:id`

**Description:** Get single product for consumer view

**Response:** Same sanitized structure as list

---

### Authenticated Endpoints

#### GET `/products`

**Description:** List products (filtered by user's organization)

**Authorization:** Any authenticated user  
**Behavior:**
- CONSUMER: See all active products
- MERCHANT: See own org's products + global products
- ADMIN: See all products

**Query Parameters:** Same as public, plus `scope`, `status`, `organizationId` (admin only)

---

#### GET `/products/:id`

**Description:** Get full product details

**Authorization:** Owner organization or Admin  
**Response:** Full product object including internal fields

---

#### POST `/products`

**Description:** Create a new product

**Authorization:** MERCHANT or ADMIN

**Request Schema:**
```typescript
{
  name: string;             // Required
  sku?: string;             // Auto-generated if not provided
  category: string;         // Required
  subcategory?: string;
  description?: string;
  price?: number;
  currency?: string;        // Default: USD
  quantity?: number;
  unit?: string;
  brand?: string;
  images?: string[];
  thcContent?: number;      // Cannabis-specific
  cbdContent?: number;
  strainType?: string;
  // Merchant's organizationId auto-injected
}
```

**Side Effects:**
- Product created with `scope: 'ORGANIZATION'`
- `organizationId` set from `x-organization-id` header
- `merchantId` set from `x-user-id` header
- `PRODUCT_CREATED` event emitted

---

#### PUT `/products/:id`

**Description:** Update product

**Authorization:** Owner organization or Admin

**Request:** Partial product object  
**Side Effects:** `PRODUCT_UPDATED` event emitted

---

#### DELETE `/products/:id`

**Description:** Soft-delete product

**Authorization:** Owner organization or Admin  
**Side Effects:**
- `isActive` set to `false`
- `PRODUCT_DELETED` event emitted

---

#### GET `/merchant/products`

**Description:** List current merchant's products only

**Authorization:** MERCHANT  
**Behavior:** Filters by `x-organization-id` header

---

#### GET `/products/global`

**Description:** List global products only

**Authorization:** Any authenticated user  
**Behavior:** Filters by `scope: 'GLOBAL'`

---

## 5. Internal Workflow

### Product Creation Flow

```
1. Request: POST /products
   Headers: x-user-id, x-user-role, x-organization-id
   ↓
2. Validation: productCreateSchema.parse(body)
   - Name required
   - Category required
   - Category must be valid enum
   ↓
3. Authorization Check:
   - Role must be MERCHANT or ADMIN
   - If MERCHANT, organizationId must exist
   ↓
4. Enrichment:
   - scope = 'ORGANIZATION' (unless ADMIN specifies GLOBAL)
   - organizationId = header value
   - merchantId = header value
   - status = 'DRAFT'
   - complianceStatus = 'PENDING'
   - isActive = true
   ↓
5. Persistence: ProductRepo.create(product)
   ↓
6. Event Emission:
   PRODUCT_CREATED → Kafka
   { productId, organizationId, category, merchantId }
   ↓
7. Response: 201 with full product
```

### Public Product Query Flow

```
1. Request: GET /public/products?limit=50
   No auth headers
   ↓
2. Build Query:
   - scope: 'all' (include both GLOBAL and ORGANIZATION)
   - isActive: true
   ↓
3. Execute Query: ProductRepo.findAll(options)
   ↓
4. Sanitize Results:
   - Map each product
   - Include: _id, name, sku, category, compliance, timestamps
   - Exclude: organizationId, merchantId, internalNotes
   ↓
5. Response: 200 with sanitized array
```

### Tenant-Isolated Query Flow

```
1. Request: GET /products
   Headers: x-organization-id: "org123"
   ↓
2. Extract Organization ID from header
   ↓
3. Build Query:
   - Filter: organizationId === "org123" OR scope === 'GLOBAL'
   - isActive: true (unless admin)
   ↓
4. Execute Query: ProductRepo.findAll(options)
   ↓
5. Response: 200 with products
```

---

## 6. Event & Async Communication

### Events Emitted

| Event | Topic | Payload | Consumers |
|-------|-------|---------|-----------|
| `PRODUCT_CREATED` | `product.created` | `{ productId, name, category, organizationId, merchantId }` | Compliance, Audit |
| `PRODUCT_UPDATED` | `product.updated` | `{ productId, changes, updatedBy }` | Audit |
| `PRODUCT_DELETED` | `product.deleted` | `{ productId, deletedBy }` | Audit |
| `PRODUCT_COMPLIANCE_CHANGED` | `product.compliance_changed` | `{ productId, oldStatus, newStatus }` | Notification, Audit |

### Events Consumed

| Event | Topic | Action |
|-------|-------|--------|
| `COMPLIANCE_CHECK_COMPLETED` | `compliance.check_completed` | Update product's `complianceStatus` |
| `DOCUMENT_PROCESSED` | `document.processed` | Trigger compliance re-evaluation |

### Event Flow Example

```
Document Uploaded
       ↓
DOCUMENT_UPLOADED event
       ↓
Compliance Service evaluates
       ↓
COMPLIANCE_CHECK_COMPLETED event
       ↓
Product Service updates complianceStatus
       ↓
PRODUCT_COMPLIANCE_CHANGED event
       ↓
Notification Service alerts merchant
```

---

## 7. Dependencies

### Internal Dependencies

| Service | Purpose | Failure Impact |
|---------|---------|----------------|
| Kafka | Event emission/consumption | Events lost, compliance status stale |
| Compliance Service | Compliance status updates | Status never updates |

### External Dependencies

| Dependency | Purpose | Failure Impact |
|------------|---------|----------------|
| MongoDB Atlas | Product storage | Service fails completely |
| Mongoose | ODM | Service fails |

### Environment Variables

```bash
PORT=3004
MONGO_URI=mongodb+srv://...
KAFKA_BROKER=kafka:9092
```

---

## 8. Failure Modes & Error Handling

### Expected Failures

| Error | HTTP Status | Cause |
|-------|-------------|-------|
| `VALIDATION_ERROR` | 400 | Invalid product data |
| `PRODUCT_NOT_FOUND` | 404 | ID doesn't exist |
| `FORBIDDEN` | 403 | Wrong organization |
| `UNAUTHORIZED` | 401 | Missing auth headers |

### Partial Failures

| Scenario | Behavior | Impact |
|----------|----------|--------|
| Kafka down | Product saved, event lost | Compliance not triggered |
| DB write fails | Error returned, no side effects | Clean failure |

### Data Consistency

- **Strong consistency:** Product CRUD operations
- **Eventual consistency:** Compliance status updates via events

---

## 9. Security & RBAC

### Authorization Matrix

| Action | Consumer | Merchant | Admin |
|--------|----------|----------|-------|
| View public products | ✅ | ✅ | ✅ |
| View own org products | ❌ | ✅ | ✅ |
| View all products | ❌ | ❌ | ✅ |
| Create product | ❌ | ✅ | ✅ |
| Update own product | ❌ | ✅ | ✅ |
| Update any product | ❌ | ❌ | ✅ |
| Delete product | ❌ | ✅ (own) | ✅ |

### Tenant Isolation

```typescript
// In ProductRepo.findAll
if (options.organizationId && role !== 'ADMIN') {
  filter.organizationId = new ObjectId(options.organizationId);
}
```

### Known Security Consideration

**ObjectId vs String:** Some products had `organizationId` stored as string instead of ObjectId, causing filter mismatches. Migration script fixed this.

---

## 10. Observability & Auditing

### Logs

- Request/response logging via Fastify
- Error stack traces in development
- Structured JSON logs in production

### Audit Trail

All product operations captured via:
1. `PRODUCT_*` events → Audit Service
2. `updatedAt` timestamp on every change
3. `updatedBy` field tracking last modifier

### Key Metrics (Planned)

- `product_create_total`
- `product_query_duration_seconds`
- `product_count_by_status`

---

## 11. Performance Considerations

### Hot Paths

| Path | Optimization |
|------|--------------|
| `/public/products` | Compound index on `isActive`, `scope` |
| `/products` by org | Index on `organizationId` |
| `/products/:id` | Index on `_id` (default) |

### Indexes Required

```javascript
db.products.createIndex({ organizationId: 1, isActive: 1 })
db.products.createIndex({ scope: 1, isActive: 1 })
db.products.createIndex({ category: 1 })
db.products.createIndex({ sku: 1 }, { unique: true, sparse: true })
```

### Caching Strategy

- No caching currently
- Potential: Redis cache for public product list (high read volume)

---

## 12. Known Issues & Technical Debt

### Current Issues

| Issue | Impact | Status |
|-------|--------|--------|
| Public endpoint missing `_id` | Frontend navigation broken | **Fixed** |
| Scope filter missing for public | Wrong product count | **Fixed** |
| String vs ObjectId mismatch | Query filters fail | **Fixed via migration** |

### Technical Debt

| Debt | Risk | Priority |
|------|------|----------|
| No pagination cursor | Poor UX for large catalogs | Medium |
| No text search index | Slow search queries | Medium |
| No image upload | Only URLs supported | Low |

---

## 13. Example Flows

### Example 1: Merchant Creates Product

```
1. Merchant submits: { name: "CBD Oil", category: "HEMP_CBD", price: 49.99 }
   Headers: x-user-id: "usr123", x-organization-id: "org456"
   ↓
2. Service validates schema ✓
   ↓
3. Service enriches:
   - scope: "ORGANIZATION"
   - organizationId: "org456"
   - merchantId: "usr123"
   - complianceStatus: "PENDING"
   ↓
4. MongoDB insert
   ↓
5. Emit PRODUCT_CREATED
   ↓
6. Return 201: { _id: "prod789", name: "CBD Oil", ... }
```

### Example 2: Compliance Status Update

```
1. Compliance Service sends COMPLIANCE_CHECK_COMPLETED
   { productId: "prod789", result: "COMPLIANT" }
   ↓
2. Product Service consumer receives event
   ↓
3. ProductRepo.update("prod789", { complianceStatus: "COMPLIANT" })
   ↓
4. Emit PRODUCT_COMPLIANCE_CHANGED
   { productId: "prod789", oldStatus: "PENDING", newStatus: "COMPLIANT" }
   ↓
5. Merchant sees updated status on next query
```

---

## 14. Integration Checklist

### Environment Variables

- [ ] `PORT` - Service port (3004)
- [ ] `MONGO_URI` - MongoDB connection string
- [ ] `KAFKA_BROKER` - Kafka bootstrap server

### Database Setup

- [ ] MongoDB accessible
- [ ] Indexes created (see Performance section)

### Other Services

- [ ] Kafka broker running
- [ ] API Gateway configured to route to this service

### Verification

```bash
# Health check
curl http://localhost:3004/health

# Public products (no auth)
curl http://localhost:3004/public/products

# Create product (auth required)
curl http://localhost:3004/products \
  -H "x-user-id: usr123" \
  -H "x-user-role: MERCHANT" \
  -H "x-organization-id: org456" \
  -H "Content-Type: application/json" \
  -d '{"name":"Test","category":"CBD"}'
```

---

*Document Version: 1.0*  
*Last Updated: January 2026*
