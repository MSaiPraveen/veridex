# Security Model

Veridex is designed with security as a first-class concern.
This document outlines the security architecture and practices.

---

## Authentication

### JWT-Based Authentication

```
┌──────────┐     ┌─────────────┐     ┌──────────────┐
│  Client  │────▶│ API Gateway │────▶│ Auth Service │
└──────────┘     └──────┬──────┘     └──────────────┘
                        │
                        ▼
               ┌────────────────┐
               │  JWT Tokens    │
               │  ├─ Access     │
               │  └─ Refresh    │
               └────────────────┘
```

### Token Characteristics

| Token | Lifetime | Storage | Purpose |
|-------|----------|---------|---------|
| Access Token | 15 minutes | Memory | API authorization |
| Refresh Token | 7 days | Secure cookie / DB | Token renewal |

### Token Contents

```typescript
interface JWTPayload {
  sub: string;        // User ID
  email: string;
  role: 'CONSUMER' | 'MERCHANT' | 'ADMIN';
  iat: number;        // Issued at
  exp: number;        // Expiration
}
```

### Security Measures

- Tokens signed with RS256 or HS256
- Short-lived access tokens
- Refresh tokens stored securely
- Token revocation on logout
- Rate limiting on auth endpoints

---

## Authorization

### Role-Based Access Control (RBAC)

```
Request → JWT Extraction → Role Lookup → Permission Check → Allow/Deny
```

### Enforcement Layers

| Layer | Responsibility |
|-------|----------------|
| API Gateway | JWT validation, role extraction, permission enforcement |
| Backend Services | Trust gateway context, no re-validation |
| Frontend | UI visibility only, never enforcement |

### Permission Checks

```typescript
// Gateway middleware
function requirePermission(permission: Permission) {
  return (req, res, next) => {
    const userPermissions = RolePermissions[req.user.role];
    if (!userPermissions.includes(permission)) {
      return res.status(403).json({ error: 'Forbidden' });
    }
    next();
  };
}
```

---

## Data Isolation

### Database Separation

Each service owns its database. No exceptions.

| Service | Database |
|---------|----------|
| Auth Service | veridex-auth |
| User-Org Service | veridex-user-org |
| Product Service | veridex-products |
| Document Service | veridex-documents |
| Compliance Service | veridex-compliance |
| Notification Service | veridex-notifications |
| Audit Log Service | veridex-audit |

### Access Rules

- Services only access their own database
- No direct database-to-database queries
- Cross-service data via events or API calls

---

## Secrets Management

### Principles

1. **No secrets in source code** - Ever
2. **No secrets in logs** - Mask sensitive data
3. **Environment variables** - Runtime injection
4. **Rotation ready** - Secrets can be rotated

### Secret Types

| Secret | Storage |
|--------|---------|
| JWT signing key | Environment variable |
| Database credentials | Environment / Secret manager |
| API keys | Environment / Secret manager |
| SMTP credentials | Environment / Secret manager |

### Production Recommendations

- Use HashiCorp Vault, AWS Secrets Manager, or similar
- Kubernetes Secrets with encryption at rest
- Regular secret rotation
- Audit secret access

---

## Network Security

### MongoDB Atlas

- IP allowlist configured
- TLS encryption in transit
- Network peering for production

### Kafka

- Internal cluster communication only
- Not exposed to public internet
- TLS for inter-broker communication

### Service Communication

```
┌────────────────────────────────────────────────────┐
│                   VPC / Cluster                     │
│                                                     │
│  ┌─────────┐   ┌─────────┐   ┌─────────┐          │
│  │ Service │◀─▶│ Service │◀─▶│ Service │          │
│  └─────────┘   └─────────┘   └─────────┘          │
│       │             │             │                │
│       └─────────────┴─────────────┘                │
│                     │                              │
│              ┌──────▼──────┐                       │
│              │   Kafka     │                       │
│              └─────────────┘                       │
│                                                    │
└───────────────────────┬────────────────────────────┘
                        │
                  ┌─────▼─────┐
                  │  Ingress  │
                  └───────────┘
                        │
                   Public Internet
```

### Ingress Security

- TLS termination at ingress
- Rate limiting at gateway
- CORS configured properly
- Security headers enforced

---

## Input Validation

### Strategy

1. **Validate at boundary** - API Gateway and service endpoints
2. **Zod schemas** - Runtime type validation
3. **Sanitize output** - Prevent injection

### Example

```typescript
import { z } from 'zod';

const CreateProductSchema = z.object({
  name: z.string().min(1).max(200),
  category: z.string(),
  merchantId: z.string().uuid(),
});

// In route handler
const validated = CreateProductSchema.parse(req.body);
```

---

## Audit as Security

Audit logs serve multiple security functions:

1. **Detection** - Identify suspicious activity
2. **Deterrence** - Users know actions are logged
3. **Investigation** - Trace incidents
4. **Compliance** - Regulatory requirement

### What's Logged

- All authentication events
- All authorization failures
- All data modifications
- All administrative actions

---

## Security Checklist

### Authentication
- [ ] JWT tokens with short expiry
- [ ] Secure refresh token storage
- [ ] Password hashing with bcrypt
- [ ] Rate limiting on login

### Authorization
- [ ] RBAC enforced at gateway
- [ ] Least privilege principle
- [ ] No frontend-only security

### Data
- [ ] Database per service
- [ ] TLS in transit
- [ ] Encryption at rest
- [ ] Input validation

### Secrets
- [ ] No hardcoded secrets
- [ ] Environment injection
- [ ] Secret rotation plan
- [ ] Access auditing

### Network
- [ ] IP allowlisting
- [ ] Internal-only services
- [ ] TLS everywhere
- [ ] Security headers

### Monitoring
- [ ] Audit logging
- [ ] Failed auth alerts
- [ ] Rate limit monitoring
- [ ] Error tracking
