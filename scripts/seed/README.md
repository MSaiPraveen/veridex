# Veridex Seed Scripts

This directory contains deterministic seed scripts for local and demo environments.

## Quick Start

```bash
# From scripts/ directory
npm install
npm run seed
```

## Execution Order

Seeds run in strict order. Do not reorder casually.

| Order | File | Purpose |
|-------|------|---------|
| 1 | `consumers.seed.ts` | Consumer users (non-merchant) |
| 2 | `merchants.seed.ts` | Merchant users + organizations |
| 3 | `products.seed.ts` | Products owned by orgs |
| 4 | `documents.seed.ts` | Lab reports, licenses, insurance |

## Database Ownership

| Database | Service | Collections |
|----------|---------|-------------|
| veridex-auth | auth-service | users, refresh_tokens |
| veridex-user-org | user-org-service | users, organizations, memberships |
| veridex-products | product-service | products |
| veridex-documents | document-service | documents |
| veridex-compliance | compliance-service | compliance_rules, compliance_results |
| veridex-audit | audit-log-service | audit_logs |
| veridex-notifications | notification-service | notifications |

## Environment Setup

Create `scripts/.env` with your database URIs:

```env
MONGO_AUTH_URI=mongodb+srv://...veridex-auth
MONGO_USER_ORG_URI=mongodb+srv://...veridex-user-org
MONGO_PRODUCTS_URI=mongodb+srv://...veridex-products
MONGO_DOCUMENTS_URI=mongodb+srv://...veridex-documents
MONGO_COMPLIANCE_URI=mongodb+srv://...veridex-compliance
MONGO_AUDIT_URI=mongodb+srv://...veridex-audit
MONGO_NOTIFICATIONS_URI=mongodb+srv://...veridex-notifications
```

## Rules

- Seeds must be idempotent (safe to re-run)
- No auto-execution inside seed files
- All execution is orchestrated by `index.ts`
- Seeds connect to DBs explicitly
- Fail fast on any error

## Running Individual Seeds

```bash
npm run seed:consumers
npm run seed:merchants
npm run seed:products
npm run seed:documents
```

## Architecture

```
scripts/
├── seed/
│   ├── index.ts           # Orchestrator (entry point)
│   ├── consumers.seed.ts  # Consumer users
│   ├── merchants.seed.ts  # Merchants + orgs
│   ├── products.seed.ts   # Products
│   └── documents.seed.ts  # Documents (most critical)
│
├── utils/
│   ├── mongo.ts           # Multi-DB connection manager
│   ├── kafka.ts           # Event emission (optional)
│   └── logger.ts          # Structured logging
│
├── config/
│   ├── env.ts             # Environment loader
│   └── connections.ts     # DB ownership map
│
└── package.json
```

Do NOT import service code here. Seeds are isolated.

