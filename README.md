# Veridex

> **Production-Grade Compliance Platform for Regulated Industries**

Veridex is an event-driven microservices platform that enables product compliance verification and trust management for regulated industries (cannabis, hemp/CBD, supplements).

---

## 🔑 Key Features

- **Consumer Portal** — Verify product compliance before purchase
- **Merchant Portal** — Submit products and manage compliance documentation
- **Admin Dashboard** — Govern rules, review submissions, manage users
- **Real-Time Events** — Kafka-powered async communication
- **Full Audit Trail** — Immutable logging for every action

---

## 🏗️ Architecture

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

## 🛠️ Technology Stack

| Layer | Technology |
|-------|------------|
| Frontend | Next.js 15, React 19, TypeScript, Tailwind CSS |
| API Gateway | Fastify, Node.js |
| Backend Services | Fastify, Node.js, TypeScript |
| Event Bus | Apache Kafka |
| Database | MongoDB Atlas (one DB per service) |
| Cache | Redis |
| Infrastructure | Docker, Kubernetes |
| Validation | Zod |

---

## 📂 Repository Structure

```
veridex/
├── apps/                      # Applications
│   ├── api-gateway/           # Central routing and auth
│   ├── auth-service/          # Authentication & tokens
│   ├── user-org-service/      # Users and organizations
│   ├── product-service/       # Product management
│   ├── document-service/      # Document upload and storage
│   ├── compliance-service/    # Compliance rule engine
│   ├── notification-service/  # Alerts and notifications
│   ├── audit-log-service/     # Immutable audit logs
│   ├── frontend-dashboard/    # Consumer/Merchant portal
│   └── admin-portal/          # Admin dashboard
│
├── packages/                  # Shared libraries
│   ├── roles-permissions/     # Role and permission definitions
│   ├── event-contracts/       # Kafka event types
│   ├── api-contracts/         # Request/response DTOs
│   └── shared/                # Common utilities
│
├── scripts/                   # Operations
│   └── seed/                  # Database seeding
│
├── infra/                     # Infrastructure
│   └── kubernetes/            # K8s manifests
│
└── docs/                      # Documentation
    ├── services/              # Per-service docs
    └── cross-cutting/         # Architecture docs
```

---

## 🚀 Quick Start

### Prerequisites

- Node.js 20+
- Docker Desktop
- MongoDB Atlas account

### 1. Clone and Install

```bash
git clone https://github.com/YOUR_USERNAME/veridex.git
cd veridex
npm install
```

### 2. Configure Environment

```bash
# Copy the example environment file
cp .env.example .env

# Edit .env and fill in your values:
# - MongoDB Atlas connection strings
# - JWT secrets (generate with: openssl rand -hex 32)
# - Other configuration
```

**⚠️ IMPORTANT:** Never commit `.env` to version control.

### Windows PowerShell (Recommended)

```powershell
# Start all services
./scripts/start-dev.ps1

# Stop all services
./scripts/stop-dev.ps1
```

### Docker Only

```bash
# Start Kafka, Redis, and all backend services
docker-compose up -d
```

### 4. Start Frontend (Development)

```bash
# In a separate terminal
cd apps/frontend-dashboard
npm run dev
```

### 5. Access the Application

| Portal | URL |
|--------|-----|
| Consumer/Merchant | http://localhost:3000 |
| Admin | http://localhost:4000 |
| API Gateway | http://localhost:3002 |

---

## 🧪 Test Accounts

After running seed scripts, the following test accounts are available:

| Role | Email | Password |
|------|-------|----------|
| Consumer | `consumer1@example.com` | `Password123!` |
| Merchant | `owner@greenleaflabs.com` | `Password123!` |
| Admin | `admin@veridex.io` | `AdminSecure123!` |

> **Note:** These are test accounts for development only. Do not use in production.

---

## 📖 Services

| Service | Port | Purpose |
|---------|------|---------|
| API Gateway | 3002 | Routing, auth verification, rate limiting |
| Auth Service | 3001 | JWT tokens, authentication |
| User-Org Service | 3003 | Users, organizations, memberships |
| Product Service | 3004 | Product CRUD, compliance status |
| Document Service | 3005 | Document upload, storage |
| Compliance Service | 3006 | Rule engine, evaluations |
| Notification Service | 3007 | Email, in-app alerts |
| Audit Log Service | 3008 | Immutable event log |

---

## 📋 Core Workflows

### Product Compliance Flow

```
Merchant Creates Product
        ↓
Merchant Uploads Documents (Lab Reports, Licenses)
        ↓
Document Service → DOCUMENT_UPLOADED event
        ↓
Compliance Service Evaluates Against Rules
        ↓
COMPLIANCE_CHECK_COMPLETED event
        ↓
Product Status Updated (COMPLIANT/NON_COMPLIANT/PENDING)
        ↓
Merchant Notified
```

### Consumer Verification

```
Consumer Browses Products
        ↓
Views Compliance Status & Badges
        ↓
Makes Informed Purchase Decision
```

---

## 📚 Documentation

Comprehensive documentation is available in `/docs`:

### Service Documentation

- [Auth Service](docs/services/auth-service.md)
- [API Gateway](docs/services/api-gateway.md)
- [Product Service](docs/services/product-service.md)
- [Document Service](docs/services/document-service.md)
- [Compliance Service](docs/services/compliance-service.md)
- [Notification Service](docs/services/notification-service.md)
- [Audit Log Service](docs/services/audit-log-service.md)
- [User-Org Service](docs/services/user-org-service.md)

### Cross-Cutting Functions

- [Authentication & RBAC](docs/cross-cutting/auth-and-rbac.md)
- [Event Bus & Messaging](docs/cross-cutting/event-bus-messaging.md)
- [Data Ownership Model](docs/cross-cutting/data-ownership-model.md)
- [Frontend Architecture](docs/cross-cutting/frontend-architecture.md)
- [Compliance Pipeline](docs/cross-cutting/compliance-pipeline.md)

---

## 🔒 Security

- **JWT Authentication** with short-lived access tokens (15m)
- **Refresh Token Rotation** with theft detection
- **Role-Based Access Control** enforced at gateway
- **Tenant Isolation** via organization scoping
- **Audit Logging** for every action

See [Authentication & RBAC](docs/cross-cutting/auth-and-rbac.md) for details.

---

## 🧑‍💻 Development

### Running Individual Services

```bash
# Run specific service
npm run dev:auth      # Auth service
npm run dev:product   # Product service
npm run dev:gateway   # API Gateway
```

### Type Checking

```bash
npm run typecheck
```

### Building for Production

```bash
npm run build
```

---

## 🐳 Docker Deployment

### Local Development

```bash
# Start all services
docker-compose up -d

# View logs
docker-compose logs -f

# Stop all services
docker-compose down
```

### Production (Kubernetes)

```bash
kubectl apply -f infra/kubernetes/config/
kubectl apply -f infra/kubernetes/services/
```

---

## 🎯 Design Principles

1. **Database-per-Service** — Each service owns its data
2. **Event-Driven Architecture** — Loose coupling via Kafka
3. **Rules as Data** — Compliance rules stored, not hardcoded
4. **Full Auditability** — Every action logged immutably
5. **Security First** — RBAC and tenant isolation

---

## 📝 License

MIT

---

*Built as an architecture demonstration of enterprise-grade microservices.*
