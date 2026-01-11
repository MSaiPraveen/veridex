# Core Workflows

This document describes the main system workflows and how services interact.

---

## Product Verification Workflow

The primary workflow of Veridex: getting a product to compliance status.

```
┌──────────────┐     ┌─────────────────┐     ┌──────────────────┐
│   Merchant   │────▶│ Product Service │────▶│  product.created │
└──────────────┘     └─────────────────┘     └────────┬─────────┘
                                                      │
┌──────────────┐     ┌──────────────────┐            │
│   Merchant   │────▶│ Document Service │◀───────────┘
└──────────────┘     └────────┬─────────┘
                              │
                     ┌────────▼──────────┐
                     │ document.processed│
                     └────────┬──────────┘
                              │
                     ┌────────▼──────────┐
                     │Compliance Service │
                     └────────┬──────────┘
                              │
              ┌───────────────┼───────────────┐
              ▼               ▼               ▼
     ┌────────────┐  ┌────────────────┐  ┌────────────┐
     │  Product   │  │  Notification  │  │  Audit Log │
     │  Updated   │  │     Sent       │  │  Recorded  │
     └────────────┘  └────────────────┘  └────────────┘
```

### Step-by-Step

1. **Merchant creates a product**
   - Product Service stores product with `complianceStatus: PENDING`
   - Emits `product.created` event

2. **Merchant uploads documents**
   - Document Service receives files
   - Extracts metadata (validUntil, issuedTo, etc.)
   - Stores extraction status

3. **Document processing completes**
   - Document Service emits `document.processed`
   - Includes extraction results or failure reason

4. **Compliance evaluation triggered**
   - Compliance Service receives event
   - Loads applicable rules
   - Evaluates document data against rules

5. **Compliance result stored**
   - Result: `COMPLIANT` or `NON_COMPLIANT`
   - Violations recorded with rule references

6. **Product status updated**
   - Product Service receives compliance result
   - Updates `complianceStatus`

7. **Merchant notified**
   - Notification Service sends email/alert
   - Includes status and any violations

8. **Audit log recorded**
   - Every step logged immutably
   - Full traceability maintained

---

## Consumer Verification Workflow

Simple read-only flow for end users.

```
┌──────────────┐     ┌─────────────────┐
│   Consumer   │────▶│ Product Service │
└──────────────┘     └────────┬────────┘
                              │
                     ┌────────▼────────┐
                     │ Compliance Data │
                     └─────────────────┘
```

1. Consumer browses products
2. Product Service returns compliance status
3. Consumer views verification badge/details

**Key constraint**: Consumers never trigger state changes.

---

## Rule Change Workflow (Admin)

How compliance rules are updated safely.

```
┌──────────────┐     ┌─────────────────────┐
│    Admin     │────▶│ Compliance Service  │
└──────────────┘     └──────────┬──────────┘
                                │
                     ┌──────────▼──────────┐
                     │  Rule Versioned     │
                     │  (v1 → v2)          │
                     └──────────┬──────────┘
                                │
                     ┌──────────▼──────────┐
                     │  Future Evaluations │
                     │  Use New Rule       │
                     └─────────────────────┘
```

1. Admin creates or updates a compliance rule
2. Rule version is incremented
3. Old evaluations retain their original rule version
4. New evaluations use the updated rule

**Key constraint**: Past compliance results are never retroactively changed.

---

## Authentication Flow

```
┌──────────────┐     ┌─────────────────┐     ┌──────────────┐
│    User      │────▶│   API Gateway   │────▶│ Auth Service │
└──────────────┘     └─────────────────┘     └──────┬───────┘
                                                    │
                     ┌──────────────────────────────┘
                     ▼
            ┌─────────────────┐
            │  JWT Issued     │
            │  (access +      │
            │   refresh)      │
            └─────────────────┘
```

1. User submits credentials
2. Auth Service validates
3. JWT tokens issued (access + refresh)
4. Subsequent requests include JWT
5. API Gateway validates JWT on every request

---

## Event Topics

| Topic | Producer | Consumers |
|-------|----------|-----------|
| `auth.events` | Auth Service | Audit Log |
| `product.events` | Product Service | Compliance, Audit Log |
| `document.events` | Document Service | Compliance, Audit Log |
| `compliance.events` | Compliance Service | Product, Notification, Audit Log |
| `audit.events` | All Services | Audit Log |

---

## Design Guarantees

- **No synchronous cross-service calls** for compliance
- **No shared databases** between services
- **All decisions are auditable** with full context
- **Event-driven** architecture for loose coupling
- **Idempotent** event handlers for reliability
