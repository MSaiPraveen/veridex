# 📘 Auth Service — Veridex

**Service Path:** `apps/auth-service`  
**Port:** 3001  
**Database:** `veridex-auth` (MongoDB Atlas)  
**Interacting Roles:** Consumer, Merchant, Admin, API Gateway (internal)

---

## 1. Purpose & Scope

### What This Service Exists To Do

The Auth Service is the **single source of truth for user identity and authentication credentials**. It handles:

- User registration (creating credential records)
- User authentication (validating credentials, issuing tokens)
- Token lifecycle management (access tokens, refresh tokens, revocation)
- Password security (hashing, comparison)

### What It Explicitly Does NOT Do

| Responsibility | Owned By |
|----------------|----------|
| User profile data (name, phone, avatar) | User-Org Service |
| Organization management | User-Org Service |
| Authorization decisions (RBAC) | API Gateway |
| Session management for frontend | Frontend (localStorage) |
| Password reset emails | Notification Service |

### Why It Exists As A Separate Service

1. **Security Isolation**: Credential data is highly sensitive; isolating it reduces attack surface
2. **Audit Compliance**: Authentication events must be tracked separately for SOC2/compliance
3. **Scalability**: Auth operations can spike independently (login storms after announcements)
4. **Single Responsibility**: One service owns the "who are you?" question

---

## 2. Ownership & Data Boundaries

### Data This Service Owns

| Collection | Fields | Purpose |
|------------|--------|---------|
| `users` | `email`, `passwordHash`, `role`, `organizationId`, `isActive`, `emailVerified`, `failedLoginAttempts`, `lockoutUntil`, `lastLoginAt` | Core identity |
| `refreshTokens` | `token`, `userId`, `expiresAt`, `family`, `userAgent`, `ipAddress`, `revokedAt` | Token lifecycle |

### Data It May Read (Read-Only)

- None. Auth Service does not read from other services.

### Data It Must Never Access

- User profiles (firstName, lastName, phone)
- Organization details
- Products, documents, compliance data
- Audit logs

---

## 3. Responsibilities

- ✅ Hash passwords using bcrypt (12 rounds)
- ✅ Create user records with email/password
- ✅ Validate credentials on login
- ✅ Generate JWT access tokens (15-minute TTL)
- ✅ Generate and store refresh tokens (7-day TTL)
- ✅ Rotate refresh tokens on use (token family tracking)
- ✅ Revoke individual or all refresh tokens
- ✅ Track failed login attempts
- ✅ Implement account lockout after failed attempts
- ✅ Emit authentication events to Kafka
- ✅ Provide internal API for User-Org Service to update `organizationId`

---

## 4. Public API Surface

### POST `/auth/register`

**Description:** Create a new user account

**Request Schema:**
```typescript
{
  email: string;          // Required, valid email format
  password: string;       // Required, min 8 chars, complexity rules
  role: 'CONSUMER' | 'MERCHANT';  // Required
  firstName?: string;     // Optional
  lastName?: string;      // Optional
  companyName?: string;   // Required for MERCHANT
  industry?: string;      // Optional for MERCHANT
}
```

**Response Schema:**
```typescript
{
  success: true,
  message: "User registered successfully",
  data: {
    user: { id, email, role, firstName, lastName, organizationId? },
    tokens: { accessToken, refreshToken, expiresIn }
  }
}
```

**Authentication:** None required  
**Authorized Roles:** Anyone (unauthenticated)  
**Side Effects:** 
- User record created
- `USER_REGISTERED` event emitted to Kafka

---

### POST `/auth/login`

**Description:** Authenticate user and issue tokens

**Request Schema:**
```typescript
{
  email: string;     // Required
  password: string;  // Required
}
```

**Response Schema:**
```typescript
{
  success: true,
  message: "Login successful",
  data: {
    user: { id, email, role, firstName, lastName, organizationId? },
    tokens: { accessToken, refreshToken, expiresIn }
  }
}
```

**Authentication:** None required  
**Authorized Roles:** Anyone  
**Side Effects:**
- `lastLoginAt` updated
- `failedLoginAttempts` reset on success
- `USER_LOGGED_IN` event emitted
- Refresh token stored in database

**Idempotency:** Not idempotent (new tokens each call)

---

### POST `/auth/refresh`

**Description:** Exchange refresh token for new token pair

**Request Schema:**
```typescript
{
  refreshToken: string;  // Required
}
```

**Response Schema:**
```typescript
{
  success: true,
  message: "Tokens refreshed successfully",
  data: {
    tokens: { accessToken, refreshToken, expiresIn }
  }
}
```

**Authentication:** Refresh token in body  
**Authorized Roles:** Anyone with valid refresh token  
**Side Effects:**
- Old refresh token revoked
- New refresh token created (same family)
- If token already used: entire family revoked (theft detection)

---

### POST `/auth/logout`

**Description:** Revoke refresh token(s)

**Request Schema:**
```typescript
{
  refreshToken: string;   // Required
  allDevices?: boolean;   // Optional, revoke all user's tokens
}
```

**Response Schema:**
```typescript
{
  success: true,
  message: "Logged out successfully",
  data: { revokedCount: number }
}
```

**Authentication:** Optional (access token improves UX)  
**Authorized Roles:** Anyone  
**Side Effects:**
- Refresh token(s) marked as revoked
- `USER_LOGGED_OUT` event emitted

---

### GET `/auth/me`

**Description:** Get current authenticated user

**Request:** None (token in header)

**Response Schema:**
```typescript
{
  success: true,
  data: {
    user: { id, email, role, firstName, lastName, organizationId, emailVerified, createdAt }
  }
}
```

**Authentication:** Access token required (Bearer)  
**Authorized Roles:** Any authenticated user

---

### PATCH `/auth/internal/users/:userId/organization`

**Description:** Internal endpoint for User-Org Service to link user to organization

**Request Schema:**
```typescript
{
  organizationId: string;  // Required
}
```

**Authentication:** Internal service key (`x-internal-key` header)  
**Authorized Roles:** User-Org Service only  
**Side Effects:** User's `organizationId` field updated

---

### GET `/health`

**Description:** Health check endpoint  
**Authentication:** None

---

## 5. Internal Workflow

### Registration Flow

```
1. Request arrives: POST /auth/register
   ↓
2. Zod validation: registerSchema.safeParse(body)
   - Fails → 400 ValidationError with field details
   ↓
3. Check email uniqueness: UserRepo.existsByEmail(email)
   - Exists → 409 UserExistsError
   ↓
4. Hash password: bcrypt.hash(password, 12)
   ↓
5. Create user record: UserRepo.create({...})
   - role: from input
   - isActive: true
   - emailVerified: false
   ↓
6. Generate tokens: generateTokens(user, context)
   - Access token: JWT signed with ACCESS_SECRET
   - Refresh token: stored in refreshTokens collection
   ↓
7. Emit event: USER_REGISTERED → Kafka
   - Payload: userId, email, role, companyName, industry
   - Fire-and-forget (doesn't block response)
   ↓
8. Return: 201 with user + tokens
```

### Login Flow

```
1. Request arrives: POST /auth/login
   ↓
2. Zod validation: loginSchema.safeParse(body)
   ↓
3. Find user: UserRepo.findByEmail(email)
   - Not found → 401 InvalidCredentialsError
   ↓
4. Check account status:
   - isActive === false → 403 AccountDisabledError
   - lockoutUntil > now → 403 AccountLockedError
   ↓
5. Verify password: bcrypt.compare(password, passwordHash)
   - Invalid → increment failedLoginAttempts
           → if attempts >= 5, set lockoutUntil = now + 15min
           → 401 InvalidCredentialsError
   ↓
6. Update success: UserRepo.updateLoginSuccess(userId)
   - Reset failedLoginAttempts to 0
   - Set lastLoginAt to now
   ↓
7. Generate tokens: generateTokens(user, context)
   ↓
8. Emit event: USER_LOGGED_IN → Kafka
   ↓
9. Return: 200 with user + tokens
```

### Token Refresh Flow

```
1. Request arrives: POST /auth/refresh
   ↓
2. Find refresh token: RefreshTokenRepo.findByToken(token)
   - Not found → 401 InvalidTokenError
   - Expired → 401 TokenExpiredError
   - Already revoked → revoke entire family, 401 InvalidTokenError (theft detected)
   ↓
3. Verify token signature: jwt.verify(token, REFRESH_SECRET)
   ↓
4. Find user: UserRepo.findById(payload.sub)
   - Not found → 401 InvalidTokenError
   ↓
5. Revoke old token: RefreshTokenRepo.revoke(tokenId)
   ↓
6. Generate new token pair (same family)
   ↓
7. Return: 200 with new tokens
```

---

## 6. Event & Async Communication

### Events Emitted

| Event | Topic | Payload | Downstream Consumers |
|-------|-------|---------|----------------------|
| `USER_REGISTERED` | `auth.user.registered` | `{ userId, email, role, firstName, lastName, companyName, industry }` | User-Org Service (creates org), Audit Service |
| `USER_LOGGED_IN` | `auth.user.logged_in` | `{ userId, email, ipAddress, userAgent, timestamp }` | Audit Service |
| `USER_LOGGED_OUT` | `auth.user.logged_out` | `{ userId, allDevices, timestamp }` | Audit Service |

### Events Consumed

None. Auth Service is a producer-only service.

### Event Failure Behavior

Events are emitted **fire-and-forget** with `.catch(console.error)`. If Kafka is down:
- User registration/login still succeeds
- Event is lost (no retry queue)
- **Risk:** Merchant may not get organization created

---

## 7. Dependencies

### Internal Dependencies

| Service | Dependency Type | Purpose |
|---------|-----------------|---------|
| Kafka | Producer | Emit auth events |
| User-Org Service | Indirect (via events) | Org creation triggered by USER_REGISTERED |

### External Dependencies

| Dependency | Purpose | Failure Impact |
|------------|---------|----------------|
| MongoDB Atlas | User and token storage | Total service failure |
| bcrypt | Password hashing | Cannot register/login |
| jsonwebtoken | Token signing/verification | Cannot issue/validate tokens |

### Environment Variables

```bash
PORT=3001
MONGO_URI=mongodb+srv://...
JWT_ACCESS_SECRET=<32+ char secret>
JWT_REFRESH_SECRET=<32+ char secret>
ACCESS_TOKEN_TTL=15m
REFRESH_TOKEN_TTL=7d
KAFKA_BROKER=kafka:9092
INTERNAL_SERVICE_KEY=veridex-internal
```

---

## 8. Failure Modes & Error Handling

### Expected Failures

| Error | HTTP Status | Code | User-Facing Message |
|-------|-------------|------|---------------------|
| Invalid email/password format | 400 | `VALIDATION_ERROR` | Field-specific errors |
| Email already exists | 409 | `USER_EXISTS` | "A user with this email already exists" |
| Wrong password | 401 | `INVALID_CREDENTIALS` | "Invalid email or password" |
| Account disabled | 403 | `ACCOUNT_DISABLED` | "Your account has been disabled" |
| Account locked | 403 | `ACCOUNT_LOCKED` | "Too many failed attempts. Try again in 15 minutes" |
| Invalid/expired token | 401 | `INVALID_TOKEN` | "Session expired. Please log in again" |

### Partial Failures

| Scenario | Behavior | Recovery |
|----------|----------|----------|
| MongoDB write succeeds, Kafka fails | User created, event lost | Manual org creation needed |
| Token generation fails after user created | User exists without tokens | User can try logging in |

### Error Surfacing

| Role | How Errors Surface |
|------|-------------------|
| Consumer/Merchant | Toast notification in frontend |
| Admin | Same toast + access to audit logs |
| Ops/DevOps | Fastify logs + Kafka dead letter (planned) |

---

## 9. Security & RBAC

### Authentication Model

- **Access Token:** JWT, 15-minute TTL, signed with `JWT_ACCESS_SECRET`
- **Refresh Token:** JWT + database record, 7-day TTL, signed with `JWT_REFRESH_SECRET`
- **Token Location:** `Authorization: Bearer <accessToken>` header

### JWT Payload (Access Token)

```typescript
{
  sub: string;           // User ID
  email: string;
  role: 'CONSUMER' | 'MERCHANT' | 'ADMIN';
  organizationId?: string;
  iat: number;           // Issued at
  exp: number;           // Expiration
}
```

### Authorization Rules

Auth Service does NOT enforce authorization. It only:
1. Validates credentials
2. Issues tokens containing role claims
3. API Gateway enforces RBAC based on these claims

### Security Pitfalls

| Pitfall | Current Status | Risk Level |
|---------|----------------|------------|
| Refresh token theft detection | ✅ Implemented (family revocation) | Low |
| Brute force protection | ✅ Lockout after 5 attempts | Low |
| Password complexity | ⚠️ Basic (8 chars min) | Medium |
| Token in URL params | ❌ Not used | Low |
| Internal API key hardcoded | ⚠️ `veridex-internal` default | High in production |

---

## 10. Observability & Auditing

### Logs

- Fastify pino logger (JSON format)
- All requests logged with request ID
- Errors logged with stack traces

### Metrics (Planned)

- `auth_login_total` (success/failure)
- `auth_register_total`
- `auth_token_refresh_total`
- `auth_lockout_total`

### Audit Events

All auth actions emit Kafka events captured by Audit Service:
- User registration
- Login success/failure
- Token refresh
- Logout

### Traceability

- `x-request-id` header propagated from Gateway
- User ID included in all events
- IP address and user agent captured for login events

---

## 11. Performance Considerations

### Hot Paths

| Operation | Frequency | Optimization |
|-----------|-----------|--------------|
| `/auth/login` | High | Index on `email` field |
| `/auth/refresh` | High | Index on refresh token |
| `/auth/me` | Very High | JWT verification only (no DB hit) |

### Bottlenecks

| Bottleneck | Impact | Mitigation |
|------------|--------|------------|
| bcrypt hashing | 200-500ms per hash | Acceptable for security |
| MongoDB connection | Startup latency | Connection pooling |

### Scaling Strategy

- **Horizontal:** Stateless, can scale to N instances
- **Connection Pooling:** Mongoose handles MongoDB connections
- **No Session State:** All state in JWT or database

### Caching

- No caching currently
- Potential: Redis for token blacklist (immediate revocation)

---

## 12. Known Issues & Technical Debt

### Current Shortcomings

| Issue | Impact | Priority |
|-------|--------|----------|
| Events fire-and-forget | Lost events if Kafka down | High |
| No password reset flow | Users stuck if forgotten | Medium |
| No email verification | Fake emails possible | Medium |
| Internal API key hardcoded | Security in production | High |
| No rate limiting | DoS vulnerability | Medium |

### Architectural Compromises

- **organizationId in Auth:** Ideally owned by User-Org Service, but needed in JWT
- **Sync user creation:** Should be eventual consistency with saga pattern

### Risks If Unresolved

- Orphaned merchants (no organization) if Kafka fails during registration
- Production secrets exposed if default internal key used

---

## 13. Example Flows

### Example 1: Merchant Registration

```
1. Merchant submits: { email: "owner@company.com", password: "...", role: "MERCHANT", companyName: "Acme Inc" }
   ↓
2. Auth Service validates, hashes password, creates user
   ↓
3. Auth Service emits USER_REGISTERED:
   { userId: "abc123", email: "owner@company.com", role: "MERCHANT", companyName: "Acme Inc" }
   ↓
4. Auth Service returns tokens to frontend
   ↓
5. [Async] User-Org Service receives event, creates organization, calls internal API
   ↓
6. User now has organizationId populated for future requests
```

### Example 2: Token Refresh After Expiry

```
1. Frontend access token expires (15 min)
   ↓
2. API call returns 401
   ↓
3. Frontend calls POST /auth/refresh with stored refresh token
   ↓
4. Auth Service validates refresh token in database
   ↓
5. Old token revoked, new pair issued
   ↓
6. Frontend updates stored tokens
   ↓
7. Original request retried with new access token
```

---

## 14. Integration Checklist

### Environment Variables Required

- [ ] `MONGO_URI` - MongoDB connection string
- [ ] `JWT_ACCESS_SECRET` - Minimum 32 characters
- [ ] `JWT_REFRESH_SECRET` - Different from access secret
- [ ] `KAFKA_BROKER` - Kafka bootstrap server
- [ ] `INTERNAL_SERVICE_KEY` - Change from default in production

### Other Services Required

- [ ] MongoDB Atlas accessible
- [ ] Kafka broker running and accessible
- [ ] (Indirect) User-Org Service consuming `auth.user.registered` topic

### Database Indexes

```javascript
// users collection
db.users.createIndex({ email: 1 }, { unique: true })

// refreshTokens collection
db.refreshTokens.createIndex({ token: 1 }, { unique: true })
db.refreshTokens.createIndex({ userId: 1 })
db.refreshTokens.createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 })
```

### Health Check

```bash
curl http://localhost:3001/health
# Expected: { "status": "ok", "service": "auth-service" }
```

---

*Document Version: 1.0*  
*Last Updated: January 2026*
