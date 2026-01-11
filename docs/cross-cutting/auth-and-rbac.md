# 📘 Authentication & RBAC Model — Veridex

**Type:** Cross-Cutting Function  
**Scope:** All services, all portals  
**Owner Services:** Auth Service (tokens), API Gateway (enforcement)

---

## 1. Purpose & Scope

### What This System Does

The Authentication & RBAC (Role-Based Access Control) model provides:

- User identity verification via JWT tokens
- Role-based access control across all services
- Organization-scoped data isolation
- Admin privilege escalation

### Components Involved

| Component | Responsibility |
|-----------|----------------|
| Auth Service | Issue and validate tokens |
| API Gateway | Verify tokens, inject context |
| Backend Services | Enforce fine-grained authorization |
| Frontend | Store tokens, attach to requests |

---

## 2. Roles & Permissions

### System Roles

| Role | Description | Population |
|------|-------------|------------|
| `CONSUMER` | End users browsing products | Self-registration |
| `MERCHANT` | Business users managing products | Self-registration |
| `ADMIN` | Platform administrators | Manual creation |

### Role Capabilities

| Capability | Consumer | Merchant | Admin |
|------------|----------|----------|-------|
| View public products | ✅ | ✅ | ✅ |
| View own org products | ❌ | ✅ | ✅ |
| View all products | ❌ | ❌ | ✅ |
| Create products | ❌ | ✅ | ✅ |
| Upload documents | ❌ | ✅ | ✅ |
| Manage org members | ❌ | ✅ (Owner) | ✅ |
| View compliance rules | ❌ | ❌ | ✅ |
| Approve compliance | ❌ | ❌ | ✅ |
| View audit logs | ❌ | ❌ | ✅ |
| Manage users | ❌ | ❌ | ✅ |

---

## 3. Token Architecture

### Token Types

| Token | Type | Lifetime | Storage | Purpose |
|-------|------|----------|---------|---------|
| Access Token | JWT | 15 minutes | Memory/localStorage | API authentication |
| Refresh Token | JWT + DB | 7 days | localStorage + MongoDB | Renew access token |

### Access Token Payload

```typescript
interface JwtPayload {
  sub: string;           // User ID
  email: string;         // User email
  role: Role;            // CONSUMER | MERCHANT | ADMIN
  organizationId?: string;  // For MERCHANT role
  iat: number;           // Issued at (Unix timestamp)
  exp: number;           // Expiration (Unix timestamp)
}
```

### Refresh Token Database Record

```typescript
interface RefreshToken {
  _id: ObjectId;
  token: string;         // JWT string
  userId: ObjectId;
  family: string;        // For rotation tracking
  expiresAt: Date;
  revokedAt?: Date;
  userAgent?: string;
  ipAddress?: string;
}
```

---

## 4. Authentication Flow

### Login Flow

```
┌──────────┐        ┌──────────┐        ┌──────────┐
│ Frontend │        │ Gateway  │        │   Auth   │
└────┬─────┘        └────┬─────┘        └────┬─────┘
     │                   │                    │
     │ POST /auth/login  │                    │
     │ {email, password} │                    │
     │──────────────────▶│                    │
     │                   │                    │
     │                   │   Proxy request    │
     │                   │───────────────────▶│
     │                   │                    │
     │                   │                    │ Validate credentials
     │                   │                    │ Generate tokens
     │                   │                    │
     │                   │  {user, tokens}    │
     │                   │◁───────────────────│
     │                   │                    │
     │ {user, tokens}    │                    │
     │◁──────────────────│                    │
     │                   │                    │
     │ Store tokens      │                    │
     │ localStorage      │                    │
     ▼                   ▼                    ▼
```

### Authenticated Request Flow

```
┌──────────┐        ┌──────────┐        ┌──────────┐
│ Frontend │        │ Gateway  │        │ Service  │
└────┬─────┘        └────┬─────┘        └────┬─────┘
     │                   │                    │
     │ GET /products     │                    │
     │ Authorization:    │                    │
     │ Bearer <token>    │                    │
     │──────────────────▶│                    │
     │                   │                    │
     │                   │ Verify JWT         │
     │                   │ Extract claims     │
     │                   │                    │
     │                   │ Inject headers:    │
     │                   │ x-user-id          │
     │                   │ x-user-role        │
     │                   │ x-organization-id  │
     │                   │                    │
     │                   │ Proxy request      │
     │                   │───────────────────▶│
     │                   │                    │
     │                   │                    │ Use headers for
     │                   │                    │ authorization
     │                   │                    │
     │                   │    Response        │
     │                   │◁───────────────────│
     │    Response       │                    │
     │◁──────────────────│                    │
     ▼                   ▼                    ▼
```

### Token Refresh Flow

```
1. Frontend detects 401 response
   ↓
2. POST /auth/refresh { refreshToken }
   ↓
3. Auth Service validates token:
   - Exists in database
   - Not revoked
   - Not expired
   - Signature valid
   ↓
4. If token already used (replay attack):
   - Revoke entire token family
   - Return 401
   ↓
5. Otherwise:
   - Revoke old token
   - Generate new pair
   - Return new tokens
   ↓
6. Frontend updates stored tokens
```

---

## 5. Authorization Layers

### Layer 1: Gateway (Coarse-Grained)

```typescript
// Admin routes require ADMIN role
app.addHook('onRequest', async (req) => {
  if (req.url.startsWith('/admin')) {
    if (req.user?.role !== 'ADMIN') {
      throw new ForbiddenError();
    }
  }
});
```

### Layer 2: Service Middleware (Fine-Grained)

```typescript
// Shared middleware from @veridex/shared
import { requireAuth, requireRole, requireSameOrg } from '@veridex/shared';

// Require any authenticated user
app.get('/products', { preHandler: [requireAuth()] }, handler);

// Require specific role
app.post('/rules', { preHandler: [requireRole(['ADMIN'])] }, handler);

// Require same organization
app.put('/products/:id', { preHandler: [requireSameOrg(getProductOrg)] }, handler);
```

### Layer 3: Handler Logic (Business Rules)

```typescript
// In handler after middleware
async function updateProduct(req, reply) {
  const product = await ProductRepo.findById(req.params.id);
  
  // Additional checks beyond middleware
  if (req.userContext.role !== 'ADMIN') {
    if (product.organizationId !== req.userContext.organizationId) {
      throw new ForbiddenError();
    }
  }
  
  // Proceed with update
}
```

---

## 6. Context Header Protocol

### Headers Injected by Gateway

| Header | Source | Purpose |
|--------|--------|---------|
| `x-user-id` | JWT `sub` | Identify acting user |
| `x-user-role` | JWT `role` | Role-based checks |
| `x-user-email` | JWT `email` | Logging/notifications |
| `x-organization-id` | JWT `organizationId` | Tenant isolation |
| `x-request-id` | Generated/extracted | Request tracing |

### Service Context Extraction

```typescript
// From @veridex/shared
function getUserContext(req: FastifyRequest): UserContext | undefined {
  const userId = req.headers['x-user-id'] as string;
  const role = req.headers['x-user-role'] as string;
  
  if (!userId || !role) return undefined;
  
  return {
    userId,
    role,
    email: req.headers['x-user-email'] as string,
    organizationId: req.headers['x-organization-id'] as string,
    requestId: req.headers['x-request-id'] as string,
  };
}
```

---

## 7. Common Authorization Patterns

### Pattern: Owner or Admin

```typescript
// User can modify their own resource OR admin can modify anything
if (resource.ownerId !== userContext.userId && userContext.role !== 'ADMIN') {
  throw new ForbiddenError('You do not own this resource');
}
```

### Pattern: Same Organization

```typescript
// User can only access resources in their organization
if (resource.organizationId !== userContext.organizationId && userContext.role !== 'ADMIN') {
  throw new ForbiddenError('Resource belongs to another organization');
}
```

### Pattern: Public Read, Authenticated Write

```typescript
// GET endpoints: no auth required
app.get('/public/products', publicHandler);

// POST/PUT/DELETE: auth required
app.post('/products', { preHandler: [requireAuth()] }, createHandler);
```

---

## 8. Security Considerations

### Token Security

| Concern | Mitigation | Status |
|---------|------------|--------|
| Token theft | Short-lived access tokens (15m) | ✅ |
| Replay attacks | Token family revocation | ✅ |
| CSRF | Token in header, not cookie | ✅ |
| XSS token theft | HttpOnly cookies (not used) | ⚠️ |

### Known Vulnerabilities

| Vulnerability | Risk | Priority |
|---------------|------|----------|
| No token blacklist | 15m window after logout | Medium |
| localStorage XSS | Token theft possible | High |
| Shared JWT secret | Should use asymmetric keys | Medium |

---

## 9. Frontend Token Management

### Token Storage

```typescript
// Current implementation (localStorage)
localStorage.setItem('accessToken', tokens.accessToken);
localStorage.setItem('refreshToken', tokens.refreshToken);

// Attach to requests
const headers = {
  'Authorization': `Bearer ${localStorage.getItem('accessToken')}`
};
```

### Auto-Refresh Logic (Expected)

```typescript
// Interceptor pattern
async function apiCall(url, options) {
  let response = await fetch(url, withAuth(options));
  
  if (response.status === 401) {
    const refreshed = await refreshTokens();
    if (refreshed) {
      response = await fetch(url, withAuth(options));
    } else {
      logout();
    }
  }
  
  return response;
}
```

---

## 10. Failure Modes

### Authentication Failures

| Failure | Response | Frontend Action |
|---------|----------|-----------------|
| No token | 401 | Redirect to login |
| Invalid token | 401 | Clear tokens, redirect |
| Expired access | 401 | Auto-refresh |
| Expired refresh | 401 | Redirect to login |

### Authorization Failures

| Failure | Response | Frontend Action |
|---------|----------|-----------------|
| Wrong role | 403 | Show error message |
| Wrong org | 403 | Show error message |
| Resource not found | 404 | Show not found page |

---

## 11. Admin Privilege Escalation

### How Admins Bypass Checks

All authorization middleware includes admin bypass:

```typescript
// From requireSameOrg
if (context.role === 'ADMIN') {
  req.userContext = context;
  return; // Skip organization check
}
```

### Admin-Only Routes

| Route Pattern | Enforcement |
|---------------|-------------|
| `/admin/*` | Gateway blocks non-admin |
| `/rules/*` | Service blocks non-admin |
| `/audit/*` | Service blocks non-admin |

---

## 12. Integration Guidelines

### For New Services

1. Import shared middleware: `import { requireAuth, requireRole } from '@veridex/shared';`
2. Add preHandler to routes: `{ preHandler: [requireAuth()] }`
3. Access context in handler: `req.userContext`
4. Check organization for tenant isolation

### For New Frontend Features

1. Check user role before rendering: `user.role === 'MERCHANT'`
2. Attach token to all API calls
3. Handle 401 with refresh flow
4. Handle 403 with error message
5. Clear tokens on logout

---

*Document Version: 1.0*  
*Last Updated: January 2026*
