# 📘 API Gateway — Veridex

**Service Path:** `apps/api-gateway`  
**Port:** 3002  
**Database:** None (stateless)  
**Cache:** Redis  
**Interacting Roles:** All (Consumer, Merchant, Admin)

---

## 1. Purpose & Scope

### What This Service Exists To Do

The API Gateway is the **single entry point for all client requests**. Every API call from any frontend portal passes through this gateway. It handles:

- Request routing to backend services
- JWT token extraction and verification
- User context injection (headers for downstream services)
- CORS handling for multiple frontend origins
- Rate limiting (currently disabled)
- Admin route protection
- Centralized error handling

### What It Explicitly Does NOT Do

| Responsibility | Owned By |
|----------------|----------|
| Token issuance | Auth Service |
| Business logic | Individual backend services |
| Data persistence | Individual backend services |
| User authentication | Auth Service |
| Authorization enforcement | Downstream services verify context headers |

### Why It Exists As A Separate Service

1. **Single Entry Point:** Simplifies client configuration and monitoring
2. **Cross-Cutting Concerns:** Centralizes auth, CORS, logging, rate limiting
3. **Security Boundary:** External traffic enters only through gateway
4. **Service Discovery:** Clients don't need to know internal service URLs

---

## 2. Ownership & Data Boundaries

### Data This Service Owns

| Data | Storage | Purpose |
|------|---------|---------|
| Rate limit counters | Redis | Throttle abusive clients |
| Request logs | Stdout (pino) | Observability |

### Data It May Read (Read-Only)

- JWT payload (decoded from `Authorization` header)
- Request metadata (headers, IP, user agent)

### Data It Must Never Access

- User passwords or credentials
- Database records directly
- File storage
- Kafka topics (only downstream services consume)

---

## 3. Responsibilities

- ✅ Accept all external API requests
- ✅ Validate and decode JWT tokens
- ✅ Inject user context headers for downstream services
- ✅ Route requests to appropriate backend services
- ✅ Handle CORS for all frontend origins
- ✅ Enforce admin route restrictions
- ✅ Apply rate limiting (when enabled)
- ✅ Centralize error responses
- ✅ Generate and propagate request IDs

---

## 4. Public API Surface

The Gateway proxies requests. It does not define business APIs. Key routing patterns:

### Authentication Routes → Auth Service (:3001)

| Method | Path | Target |
|--------|------|--------|
| POST | `/auth/register` | `http://auth-service:3001/auth/register` |
| POST | `/auth/login` | `http://auth-service:3001/auth/login` |
| POST | `/auth/refresh` | `http://auth-service:3001/auth/refresh` |
| POST | `/auth/logout` | `http://auth-service:3001/auth/logout` |
| GET | `/auth/me` | `http://auth-service:3001/auth/me` |

### User & Organization Routes → User-Org Service (:3003)

| Method | Path | Target |
|--------|------|--------|
| GET | `/users/profile` | User-Org Service |
| PUT | `/users/profile` | User-Org Service |
| POST | `/organizations` | User-Org Service |
| GET | `/organizations/:id` | User-Org Service |
| GET | `/organizations/:id/members` | User-Org Service |

### Product Routes → Product Service (:3004)

| Method | Path | Auth | Target |
|--------|------|------|--------|
| GET | `/public/products` | No | Product Service |
| GET | `/public/products/:id` | No | Product Service |
| GET | `/products` | Yes | Product Service |
| GET | `/merchant/products` | Merchant | Product Service |
| POST | `/products` | Merchant+ | Product Service |
| PUT | `/products/:id` | Owner/Admin | Product Service |
| DELETE | `/products/:id` | Owner/Admin | Product Service |

### Document Routes → Document Service (:3005)

| Method | Path | Auth | Target |
|--------|------|------|--------|
| POST | `/documents` | Yes | Document Service (multipart) |
| GET | `/documents` | Yes | Document Service |
| GET | `/documents/:id` | Yes | Document Service |
| GET | `/documents/:id/download` | Yes | Document Service |

### Compliance Routes → Compliance Service (:3006)

| Method | Path | Auth | Target |
|--------|------|------|--------|
| GET | `/compliance/rules` | Admin | Compliance Service |
| POST | `/compliance/rules` | Admin | Compliance Service |
| GET | `/compliance/results/:productId` | Yes | Compliance Service |

### Notification Routes → Notification Service (:3007)

| Method | Path | Auth | Target |
|--------|------|------|--------|
| GET | `/notifications` | Yes | Notification Service |
| PATCH | `/notifications/:id/read` | Yes | Notification Service |

### Admin Routes → Various Services

| Method | Path Pattern | Access | Target |
|--------|--------------|--------|--------|
| GET | `/admin/users` | Admin only | User-Org Service |
| GET | `/admin/organizations` | Admin only | User-Org Service |
| GET | `/admin/products` | Admin only | Product Service |
| GET | `/admin/documents` | Admin only | Document Service |
| GET | `/admin/audit/events` | Admin only | Audit Service |
| GET | `/admin/workflows/*` | Admin only | Compliance Service |

---

## 5. Internal Workflow

### Request Processing Pipeline

```
1. Request arrives at Gateway port 3002
   ↓
2. CORS Plugin: Check origin against allowed list
   - Allowed: localhost:3000, localhost:4000, production domains
   - Rejected: 403 Forbidden
   ↓
3. Request ID Plugin: Generate/extract x-request-id
   ↓
4. Pre-Handler Hook: JWT Extraction
   - Extract Authorization header
   - If Bearer token exists: verify with JWT_SECRET
   - Populate req.user with decoded payload
   - If verification fails: req.user remains undefined
   ↓
5. IP Whitelist Plugin: Check admin routes
   - For /admin/* routes: verify IP or skip in development
   ↓
6. Admin Security Plugin: Verify admin role
   - For /admin/* routes: require req.user.role === 'ADMIN'
   - Fail: 403 Forbidden
   ↓
7. User Context Plugin: Inject headers
   - x-user-id: from JWT
   - x-user-role: from JWT
   - x-user-email: from JWT
   - x-organization-id: from JWT
   - x-request-id: from step 3
   ↓
8. Route Handler: Proxy to backend service
   - Build target URL based on route configuration
   - Forward request with injected headers
   - Stream response back to client
   ↓
9. Error Handler: Catch and format errors
   - ZodError → 400 validation error
   - 401/403 → authentication/authorization error
   - 5xx → internal server error
```

### Header Injection Detail

```typescript
// Headers injected for ALL proxied requests
{
  'x-user-id': jwt.sub,              // User's database ID
  'x-user-role': jwt.role,           // CONSUMER | MERCHANT | ADMIN
  'x-user-email': jwt.email,         // User's email
  'x-organization-id': jwt.organizationId,  // May be undefined for consumers
  'x-request-id': generatedOrExtracted
}
```

---

## 6. Event & Async Communication

### Events Emitted

None. Gateway is synchronous only.

### Events Consumed

None. Gateway does not subscribe to Kafka.

### Async Behavior

- Redis operations for rate limiting (when enabled)
- All other operations are synchronous request/response

---

## 7. Dependencies

### Internal Dependencies

| Service | Purpose | Failure Impact |
|---------|---------|----------------|
| Auth Service | Token-related endpoints | Auth routes fail |
| User-Org Service | User/org endpoints | Profile routes fail |
| Product Service | Product endpoints | Product routes fail |
| Document Service | Document endpoints | Upload/download fails |
| Compliance Service | Compliance endpoints | Rules/results fail |
| Notification Service | Notification endpoints | Notifications fail |
| Audit Service | Admin audit endpoints | Audit logs unavailable |

### External Dependencies

| Dependency | Purpose | Failure Impact |
|------------|---------|----------------|
| Redis | Rate limiting, session cache | Rate limiting disabled |
| jsonwebtoken | JWT verification | Cannot validate tokens |

### Environment Variables

```bash
PORT=3002
NODE_ENV=development|production
JWT_SECRET=<same as AUTH_SERVICE access secret>
REDIS_URL=redis://redis:6379
KAFKA_BROKERS=kafka:9092  # Not currently used

# Service URLs
AUTH_SERVICE_URL=http://auth-service:3001
USER_SERVICE_URL=http://user-org-service:3003
PRODUCT_SERVICE_URL=http://product-service:3004
DOCUMENT_SERVICE_URL=http://document-service:3005
COMPLIANCE_SERVICE_URL=http://compliance-service:3006
NOTIFICATION_SERVICE_URL=http://notification-service:3007
AUDIT_SERVICE_URL=http://audit-log-service:3008
```

---

## 8. Failure Modes & Error Handling

### Expected Failures

| Error | HTTP Status | Cause | User Message |
|-------|-------------|-------|--------------|
| CORS blocked | 403 | Origin not in allowed list | Browser blocks request |
| Unauthorized | 401 | Missing/invalid/expired token | "Authentication required" |
| Forbidden | 403 | Insufficient role | "Insufficient permissions" |
| Validation Error | 400 | Zod schema failure | Field-specific errors |
| Service Unavailable | 502/504 | Backend service down | "Service temporarily unavailable" |

### Partial Failures

| Scenario | Behavior |
|----------|----------|
| Redis down | Rate limiting bypassed, requests proceed |
| One backend down | Only routes to that service fail |
| JWT_SECRET mismatch | All authenticated requests fail 401 |

### Error Response Format

```json
{
  "error": "Error Type",
  "message": "Human-readable message",
  "details": { /* optional field-specific errors */ }
}
```

### Gateway-Level vs Service-Level Errors

| Error Source | Characterized By |
|--------------|------------------|
| Gateway | CORS, auth, rate limit, routing |
| Backend Service | Business logic, data validation |

---

## 9. Security & RBAC

### Authentication Model

Gateway performs **authentication verification**, not issuance:

1. Extract `Authorization: Bearer <token>` header
2. Verify signature with `JWT_SECRET`
3. Decode payload to get user claims
4. If valid: populate `req.user`
5. If invalid: `req.user` remains undefined

### Authorization Model

Gateway handles **coarse-grained authorization**:

| Route Pattern | Enforcement |
|---------------|-------------|
| `/public/*` | No auth required |
| `/auth/*` | No auth required (Auth Service handles) |
| `/admin/*` | Must have `role: 'ADMIN'` |
| All other | Auth recommended, service decides |

**Fine-grained authorization** (ownership checks) happens in downstream services using the injected `x-organization-id` header.

### CORS Configuration

```typescript
origin: [
  'http://localhost:3000',    // Frontend dashboard
  'http://localhost:3008',    // Alternate dev port
  'http://localhost:4000',    // Admin portal
  process.env.FRONTEND_URL,   // Production frontend
  process.env.ADMIN_FRONTEND_URL, // Production admin
]
```

### Known Security Considerations

| Consideration | Status |
|---------------|--------|
| Token replay | ⚠️ No blacklist; tokens valid until expiry |
| Admin IP restriction | ⚠️ Plugin exists but bypassed in development |
| Rate limiting | ❌ Disabled in code |
| Request body size | ⚠️ Default fastify limits (~1MB) |

---

## 10. Observability & Auditing

### Logs

- **Format:** JSON (pino logger)
- **Request logging:** All requests with timing
- **Error logging:** Full stack traces

### Key Log Fields

```json
{
  "reqId": "abc123",
  "method": "GET",
  "url": "/products",
  "statusCode": 200,
  "responseTime": 45.2,
  "userId": "user_id_from_jwt",
  "userRole": "MERCHANT"
}
```

### Metrics (Planned)

- `gateway_request_total{method, path, status}`
- `gateway_request_duration_seconds`
- `gateway_auth_failures_total`

### Traceability

Request ID propagation:
1. Client sends `X-Request-ID` OR gateway generates one
2. Header propagated to all downstream services
3. All logs include `reqId` field

---

## 11. Performance Considerations

### Hot Paths

| Path | Frequency | Optimization |
|------|-----------|--------------|
| JWT verification | Every authenticated request | In-memory, no DB |
| Route matching | Every request | Fastify radix tree |
| Proxying | Every request | Stream-based, low memory |

### Bottlenecks

| Bottleneck | Impact | Mitigation |
|------------|--------|------------|
| Backend service latency | Blocks client response | Timeout configuration |
| Redis connection | Rate limiting slowdown | Connection pooling |
| Large request bodies | Memory pressure | Body size limits |

### Scaling Strategy

- **Horizontal:** Fully stateless, scale to N instances behind load balancer
- **Connection Pooling:** Keep-alive to backend services
- **Timeout:** 30-second default for proxied requests

---

## 12. Known Issues & Technical Debt

### Current Shortcomings

| Issue | Impact | Priority |
|-------|--------|----------|
| Rate limiting disabled | DoS vulnerability | High |
| Admin IP whitelist bypassed in dev | Security gap | Medium |
| No circuit breaker | Cascading failures possible | Medium |
| Hardcoded service URLs | Not service-mesh ready | Low |

### Architectural Compromises

- **JWT_SECRET shared with Auth Service:** Should use public/private key pair
- **No request validation:** Gateway trusts client input for proxying
- **Sync-only:** No async operations, could use worker threads

### Risks If Unresolved

- Production without rate limiting allows DoS attacks
- No circuit breaker means one failing service degrades all routes
- Token theft without blacklist means 15-minute window of abuse

---

## 13. Example Flows

### Example 1: Authenticated Product List Request

```
1. Merchant frontend calls GET /products
   Authorization: Bearer eyJhbGc...
   ↓
2. Gateway receives request
   ↓
3. CORS check: Origin http://localhost:3000 ✓
   ↓
4. JWT verification: Token valid, expires in 10 min ✓
   req.user = { sub: "user123", role: "MERCHANT", organizationId: "org456" }
   ↓
5. User context injection:
   x-user-id: user123
   x-user-role: MERCHANT
   x-organization-id: org456
   x-request-id: req789
   ↓
6. Route to Product Service:
   GET http://product-service:3004/products
   (with injected headers)
   ↓
7. Product Service uses x-organization-id to filter products
   Returns only org456's products
   ↓
8. Gateway streams response back to client
```

### Example 2: Public Product Access (Unauthenticated)

```
1. Consumer (not logged in) calls GET /public/products
   No Authorization header
   ↓
2. Gateway receives request
   ↓
3. CORS check: Origin http://localhost:3000 ✓
   ↓
4. JWT extraction: No token, skip
   req.user = undefined
   ↓
5. Route match: /public/* → no auth required
   ↓
6. User context injection: Headers empty/undefined
   ↓
7. Route to Product Service:
   GET http://product-service:3004/public/products
   ↓
8. Product Service returns sanitized public catalog
   ↓
9. Gateway streams response to client
```

### Example 3: Admin Route Protection

```
1. Merchant tries GET /admin/users
   Authorization: Bearer <merchant_token>
   ↓
2. JWT verification: Valid token
   req.user = { role: "MERCHANT" }
   ↓
3. Admin Security Plugin:
   Path starts with /admin
   Check: req.user.role === 'ADMIN' → FALSE
   ↓
4. Return 403 Forbidden
   { "error": "Forbidden", "message": "Insufficient permissions" }
```

---

## 14. Integration Checklist

### Environment Variables Required

- [ ] `PORT` - Gateway port (default 3002)
- [ ] `JWT_SECRET` - Must match Auth Service's ACCESS secret
- [ ] `REDIS_URL` - Redis connection string
- [ ] `AUTH_SERVICE_URL` - Full URL to Auth Service
- [ ] `USER_SERVICE_URL` - Full URL to User-Org Service
- [ ] `PRODUCT_SERVICE_URL` - Full URL to Product Service
- [ ] `DOCUMENT_SERVICE_URL` - Full URL to Document Service
- [ ] `COMPLIANCE_SERVICE_URL` - Full URL to Compliance Service
- [ ] `NOTIFICATION_SERVICE_URL` - Full URL to Notification Service
- [ ] `AUDIT_SERVICE_URL` - Full URL to Audit Service

### Other Services Required

- [ ] At least Auth Service running for /auth routes
- [ ] Redis running if rate limiting enabled
- [ ] Other services as needed for specific routes

### Verification Steps

```bash
# Health check
curl http://localhost:3002/health
# Expected: { "status": "ok", "service": "api-gateway" }

# Auth passthrough
curl http://localhost:3002/auth/login -X POST \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"test"}'
# Should proxy to auth service

# Protected route without token
curl http://localhost:3002/products
# Expected: 401 Unauthorized

# Admin route as non-admin
curl http://localhost:3002/admin/users \
  -H "Authorization: Bearer <merchant_token>"
# Expected: 403 Forbidden
```

---

*Document Version: 1.0*  
*Last Updated: January 2026*
