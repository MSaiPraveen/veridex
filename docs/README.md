# 📚 Veridex Technical Documentation

**Version:** 1.0  
**Last Updated:** January 2026  
**Status:** Production (Partially Stabilized)

---

## Quick Navigation

### Core Services

| Service | Port | Documentation |
|---------|------|---------------|
| Auth Service | 3001 | [auth-service.md](services/auth-service.md) |
| API Gateway | 3002 | [api-gateway.md](services/api-gateway.md) |
| User-Org Service | 3003 | [user-org-service.md](services/user-org-service.md) |
| Product Service | 3004 | [product-service.md](services/product-service.md) |
| Document Service | 3005 | [document-service.md](services/document-service.md) |
| Compliance Service | 3006 | [compliance-service.md](services/compliance-service.md) |
| Notification Service | 3007 | [notification-service.md](services/notification-service.md) |
| Audit Log Service | 3008 | [audit-log-service.md](services/audit-log-service.md) |

### Cross-Cutting Functions

| Function | Documentation |
|----------|---------------|
| Authentication & RBAC | [auth-and-rbac.md](cross-cutting/auth-and-rbac.md) |
| Event Bus & Messaging | [event-bus-messaging.md](cross-cutting/event-bus-messaging.md) |
| Data Ownership Model | [data-ownership-model.md](cross-cutting/data-ownership-model.md) |
| Frontend Architecture | [frontend-architecture.md](cross-cutting/frontend-architecture.md) |
| Compliance Pipeline | [compliance-pipeline.md](cross-cutting/compliance-pipeline.md) |

---

## System Overview

Veridex is a **multi-tenant compliance platform** for regulated industries (cannabis, hemp/CBD, supplements). It enables:

- **Consumers** to verify product compliance
- **Merchants** to manage products and documents
- **Administrators** to govern rules and review submissions

### Technology Stack

| Layer | Technology |
|-------|------------|
| Frontend | Next.js 15, React 19, TypeScript |
| API Gateway | Fastify, Node.js |
| Backend Services | Fastify, Node.js, TypeScript |
| Event Bus | Apache Kafka |
| Database | MongoDB Atlas (per-service) |
| Infrastructure | Docker, Kubernetes |

---

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         FRONTEND PORTALS                                 │
├─────────────────────────┬─────────────────────────┬─────────────────────┤
│   Consumer Portal       │    Merchant Portal       │     Admin Portal    │
│   (Next.js :3000)       │    (Next.js :3000)       │     (Next.js :4000) │
└──────────┬──────────────┴──────────┬───────────────┴──────────┬─────────┘
           └─────────────────────────┴──────────────────────────┘
                                     │
                                     ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                        API GATEWAY (:3002)                               │
│           JWT Verification → RBAC → Header Injection → Routing           │
└───────────────────────────────┬─────────────────────────────────────────┘
                                │
┌───────────────────────────────┼─────────────────────────────────────────┐
│                       BACKEND SERVICES                                   │
├─────────┬─────────┬───────┬───────────┬───────────┬─────────┬──────────┤
│  Auth   │User-Org │Product│ Document  │Compliance │ Notif   │  Audit   │
│  :3001  │ :3003   │ :3004 │  :3005    │   :3006   │  :3007  │  :3008   │
└────┬────┴────┬────┴───┬───┴─────┬─────┴─────┬─────┴────┬────┴─────┬────┘
     │         │        │         │           │          │          │
     └─────────┴────────┴─────────┴───────────┴──────────┴──────────┘
                                 │
            ┌────────────────────┼────────────────────┐
            ▼                    ▼                    ▼
   ┌──────────────┐     ┌──────────────┐     ┌──────────────┐
   │   MongoDB    │     │    Kafka     │     │    Redis     │
   │   (Atlas)    │     │   (Events)   │     │   (Cache)    │
   └──────────────┘     └──────────────┘     └──────────────┘
```

---

## Role Matrix

| Role | Products | Documents | Compliance | Users | Audit |
|------|----------|-----------|------------|-------|-------|
| Consumer | View Public | ❌ | ❌ | ❌ | ❌ |
| Merchant | Own Org | Own Org | View Own | ❌ | ❌ |
| Admin | All | All | Manage | All | All |

---

## Event Flow

```
User Action → Service → Kafka Event → Consumer Services → Side Effects
```

Key event chains:

1. **Registration:** `USER_REGISTERED` → Org created → User linked
2. **Upload:** `DOCUMENT_UPLOADED` → Compliance evaluates → Product updated
3. **Compliance:** `COMPLIANCE_CHECK_COMPLETED` → Notifications sent

---

## Getting Started

### Prerequisites

- Node.js 20+
- Docker Desktop
- MongoDB Atlas account

### Quick Start

```bash
# Start infrastructure
docker-compose up -d

# Run frontend
cd apps/frontend-dashboard
npm run dev

# Access at http://localhost:3000
```

### Test Accounts

| Role | Email | Password |
|------|-------|----------|
| Consumer | `consumer1@example.com` | `Password123!` |
| Merchant | `owner@greenleaflabs.com` | `Password123!` |
| Admin | `admin@veridex.io` | `AdminSecure123!` |

---

## Known Issues Priority

| Priority | Issue | Status |
|----------|-------|--------|
| 🔴 Critical | Product public API missing `_id` | Fixed (needs deploy) |
| 🔴 Critical | Event fire-and-forget loses events | Open |
| 🟠 High | Auth context loss on navigation | Open |
| 🟠 High | Rate limiting disabled | Open |
| 🟡 Medium | No real-time updates | Open |

---

## Documentation Standards

Each service document follows this structure:

1. Purpose & Scope
2. Ownership & Data Boundaries
3. Responsibilities
4. Public API Surface
5. Internal Workflow
6. Event & Async Communication
7. Dependencies
8. Failure Modes & Error Handling
9. Security & RBAC
10. Observability & Auditing
11. Performance Considerations
12. Known Issues & Technical Debt
13. Example Flows
14. Integration Checklist

---

## Contributing

When updating documentation:

1. Keep each document self-contained
2. Update the index when adding new docs
3. Mark assumptions explicitly
4. Include failure modes, not just happy paths

---

*This documentation is engineering-focused. For user guides, see the `/docs/user/` directory (planned).*
