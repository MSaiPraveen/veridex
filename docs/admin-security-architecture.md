# Veridex Enterprise Admin Architecture

## 🏗️ Architecture Overview

This document outlines the enterprise-grade security architecture for separating Admin access from the public-facing Veridex application.

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                           INTERNET / CDN LAYER                                   │
│                    (Cloudflare / AWS CloudFront / Akamai)                       │
└───────────────────────────────┬─────────────────────────────────────────────────┘
                                │
        ┌───────────────────────┼───────────────────────┐
        │                       │                       │
        ▼                       ▼                       ▼
┌───────────────────┐  ┌───────────────────┐  ┌───────────────────┐
│   veridex.com     │  │   veridex.com     │  │ admin.veridex.io  │
│   (Landing/Home)  │  │   (App Portal)    │  │ (Admin Portal)    │
│                   │  │                   │  │                   │
│  • Public pages   │  │  • Merchant UI    │  │  • Hidden URL     │
│  • Login forms    │  │  • Consumer UI    │  │  • IP restricted  │
│  • Marketing      │  │  • Auth required  │  │  • MFA enforced   │
│                   │  │                   │  │  • VPN only       │
│  Port: 443        │  │  Port: 443        │  │  Port: 443        │
└───────────────────┘  └───────────────────┘  └───────────────────┘
        │                       │                       │
        └───────────────────────┼───────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────────────────────┐
│                           API GATEWAY (Fastify)                                  │
│                          localhost:3002 / api.veridex.com                       │
│                                                                                  │
│  ┌─────────────────┐ ┌─────────────────┐ ┌─────────────────────────────────────┐│
│  │  Rate Limiting  │ │  JWT Validation │ │  Admin Security Layer              ││
│  │                 │ │                 │ │  • X-Admin-Portal header check     ││
│  │  • Per IP       │ │  • Token decode │ │  • IP whitelist verification       ││
│  │  • Per user     │ │  • Role extract │ │  • Admin role enforcement          ││
│  │  • Per endpoint │ │  • Expiry check │ │  • Request origin validation       ││
│  └─────────────────┘ └─────────────────┘ └─────────────────────────────────────┘│
└─────────────────────────────────────────────────────────────────────────────────┘
                                │
        ┌───────────────────────┼───────────────────────┐
        │                       │                       │
        ▼                       ▼                       ▼
┌───────────────┐      ┌───────────────┐      ┌───────────────┐
│  Auth Service │      │  User/Org     │      │  Audit Log    │
│               │      │  Service      │      │  Service      │
│  • Login      │      │               │      │               │
│  • MFA verify │      │  • RBAC       │      │  • All admin  │
│  • Sessions   │      │  • Permissions│      │    actions    │
│  • Tokens     │      │  • Org mgmt   │      │  • Immutable  │
└───────────────┘      └───────────────┘      └───────────────┘
        │                       │                       │
        ▼                       ▼                       ▼
┌─────────────────────────────────────────────────────────────────────────────────┐
│                            MongoDB Atlas (Encrypted)                             │
│  ┌──────────────┐ ┌──────────────┐ ┌──────────────┐ ┌──────────────────────────┐│
│  │    users     │ │admin_sessions│ │  audit_logs  │ │    mfa_credentials       ││
│  │              │ │              │ │              │ │                          ││
│  │ role: enum   │ │ ipAddress    │ │ userId       │ │  userId                  ││
│  │ mfaEnabled   │ │ userAgent    │ │ action       │ │  secret (encrypted)      ││
│  │ mfaSecret    │ │ createdAt    │ │ resource     │ │  backupCodes             ││
│  │ ipWhitelist  │ │ expiresAt    │ │ ipAddress    │ │  lastUsed                ││
│  └──────────────┘ └──────────────┘ └──────────────┘ └──────────────────────────┘│
└─────────────────────────────────────────────────────────────────────────────────┘
```

## 🔐 Security Layers

### Layer 1: Network Separation
- Admin portal on **completely different subdomain**: `admin.veridex.io`
- Main app on `veridex.com` - NO admin routes exist
- Different DNS records, can use different infrastructure

### Layer 2: URL Obscurity (Defense in Depth)
- Admin URL is **never linked** from public pages
- No `<a href>` to admin anywhere in main app
- Consider random subdomain: `secure-mgmt-7x9k.veridex.io`
- Bookmarked by admins, not discoverable

### Layer 3: IP Restriction
```typescript
// Only allow admin access from whitelisted IPs
const ADMIN_IP_WHITELIST = [
  '10.0.0.0/8',      // Internal VPN
  '192.168.1.0/24',  // Office network
  // Add specific admin IPs
];
```

### Layer 4: MFA Enforcement
- Admin users **MUST** have MFA enabled
- TOTP (Google Authenticator) or Hardware keys (YubiKey)
- Cannot disable MFA for admin accounts

### Layer 5: Role-Based Access Control (RBAC)
```typescript
enum Role {
  CONSUMER = 'CONSUMER',       // Public users
  MERCHANT = 'MERCHANT',       // Business users
  ADMIN = 'ADMIN',             // Platform administrators
  SUPER_ADMIN = 'SUPER_ADMIN', // System owners (very limited)
}
```

### Layer 6: Audit Logging
- Every admin action is logged
- Logs are immutable (append-only)
- Include: userId, action, resource, ipAddress, timestamp
- Retained for compliance (7+ years)

## 📁 URL Structure

### ❌ WRONG (Exposed Admin)
```
veridex.com/                    → Home with all login options
veridex.com/login               → Shows Admin/Merchant/Consumer
veridex.com/admin               → Admin dashboard (VULNERABLE!)
veridex.com/admin/login         → Admin login (discoverable!)
```

### ✅ CORRECT (Hidden Admin)
```
veridex.com/                    → Home (Merchant + Consumer only)
veridex.com/auth/merchant/login → Merchant login
veridex.com/auth/consumer/login → Consumer login
veridex.com/merchant/*          → Merchant dashboard
veridex.com/consumer/*          → Consumer dashboard

admin.veridex.io/               → Admin portal (SEPARATE APP)
admin.veridex.io/login          → Admin login (IP restricted)
admin.veridex.io/dashboard      → Admin dashboard (MFA required)
```

## 🔑 Authentication Flow

### Merchant/Consumer Flow (Standard)
```
1. User visits veridex.com/auth/merchant/login
2. Enters email + password
3. Backend validates credentials
4. JWT issued with role: 'MERCHANT'
5. Redirect to /merchant/dashboard
```

### Admin Flow (Enhanced Security)
```
1. Admin navigates to admin.veridex.io (bookmarked, not linked)
2. IP check at edge/middleware level
3. If IP not whitelisted → 404 Not Found (not 403!)
4. Admin enters email + password
5. Backend validates credentials + checks role = ADMIN
6. If not admin → "Invalid credentials" (don't reveal admin exists)
7. MFA challenge presented (TOTP code required)
8. Admin enters 6-digit code
9. Backend validates MFA
10. Admin JWT issued with:
    - role: 'ADMIN'
    - mfaVerified: true
    - adminSessionId: uuid
11. Session logged to audit_logs
12. Redirect to /dashboard
```

## 💾 Database Schema

### Users Collection
```typescript
interface User {
  _id: ObjectId;
  email: string;
  passwordHash: string;
  role: 'CONSUMER' | 'MERCHANT' | 'ADMIN' | 'SUPER_ADMIN';
  
  // MFA (required for ADMIN)
  mfaEnabled: boolean;
  mfaSecret?: string;          // Encrypted TOTP secret
  mfaBackupCodes?: string[];   // Encrypted backup codes
  
  // Admin-specific security
  ipWhitelist?: string[];      // Per-user IP restrictions
  lastLogin?: Date;
  failedLoginAttempts: number;
  lockedUntil?: Date;
  
  // Audit
  createdAt: Date;
  createdBy?: ObjectId;        // Which admin created this user
  updatedAt: Date;
}
```

### Admin Sessions Collection
```typescript
interface AdminSession {
  _id: ObjectId;
  userId: ObjectId;
  sessionToken: string;        // Unique session identifier
  
  // Security context
  ipAddress: string;
  userAgent: string;
  geoLocation?: {
    country: string;
    city: string;
  };
  
  // MFA
  mfaVerified: boolean;
  mfaVerifiedAt?: Date;
  
  // Lifecycle
  createdAt: Date;
  expiresAt: Date;
  lastActivityAt: Date;
  revokedAt?: Date;
  revokedReason?: string;
}
```

### Audit Logs Collection
```typescript
interface AuditLog {
  _id: ObjectId;
  
  // Who
  userId: ObjectId;
  userEmail: string;
  userRole: string;
  
  // What
  action: string;              // 'USER_CREATE', 'PRODUCT_DELETE', etc.
  resource: string;            // 'user', 'product', 'organization'
  resourceId?: ObjectId;
  
  // Details
  changes?: {
    before: Record<string, unknown>;
    after: Record<string, unknown>;
  };
  
  // Where
  ipAddress: string;
  userAgent: string;
  requestId: string;
  
  // When
  timestamp: Date;
  
  // Immutability
  hash: string;                // SHA-256 of log entry (tamper detection)
}
```

## 🛡️ Security Hardening Checklist

### ✅ Must Have
- [ ] Admin on separate subdomain/port
- [ ] IP restriction for admin portal
- [ ] MFA enforced for all admin accounts
- [ ] All admin actions logged to audit trail
- [ ] Rate limiting on admin login (5 attempts, then lockout)
- [ ] HTTPS only (HSTS enabled)
- [ ] Secure cookies (HttpOnly, SameSite=Strict, Secure)
- [ ] JWT with short expiry (15 min) + refresh tokens
- [ ] No admin links in public UI
- [ ] 404 response for unauthorized admin access (not 403)

### 🔒 Should Have
- [ ] VPN-only access for admin portal in production
- [ ] Hardware key support (WebAuthn/FIDO2)
- [ ] Session invalidation on IP change
- [ ] Admin user creation requires SUPER_ADMIN
- [ ] Periodic password rotation for admin accounts
- [ ] Anomaly detection (unusual login times/locations)

### 🎯 Nice to Have
- [ ] Real-time alerting for admin actions
- [ ] Admin access requires manager approval
- [ ] Time-limited admin sessions (max 4 hours)
- [ ] Privileged Access Management (PAM) integration
- [ ] Separate database for admin operations

## ⚠️ What NOT To Do

### 🚫 Common Mistakes

1. **Exposing /admin route on main domain**
   ```
   ❌ veridex.com/admin/login
   ✅ admin.veridex.io/login (separate app)
   ```

2. **Showing "Admin Login" on public pages**
   ```
   ❌ Homepage with "Consumer | Merchant | Admin" buttons
   ✅ Homepage with "Consumer | Merchant" only
   ```

3. **Using same authentication for all roles**
   ```
   ❌ Single login page handling all roles
   ✅ Role-specific login flows with different security
   ```

4. **Returning 403 for admin routes**
   ```
   ❌ Response: 403 Forbidden (reveals admin exists)
   ✅ Response: 404 Not Found (admin doesn't exist)
   ```

5. **Storing MFA secrets in plain text**
   ```
   ❌ mfaSecret: 'JBSWY3DPEHPK3PXP'
   ✅ mfaSecret: encrypted('JBSWY3DPEHPK3PXP', masterKey)
   ```

6. **Admin sharing JWT structure with public users**
   ```
   ❌ Same JWT claims for all roles
   ✅ Admin JWT includes: mfaVerified, adminSessionId, ipHash
   ```

7. **Allowing admin account creation via API**
   ```
   ❌ POST /api/users { role: 'ADMIN' }
   ✅ Admin creation only via CLI or SUPER_ADMIN in separate portal
   ```

8. **No audit trail for admin actions**
   ```
   ❌ Admin modifies data with no record
   ✅ Every admin action logged with before/after state
   ```

## 🖥️ Implementation Files

### Frontend Apps
```
apps/
├── frontend-dashboard/        # Consumer + Merchant portal
│   ├── src/
│   │   ├── app/
│   │   │   ├── auth/merchant/  # Merchant auth
│   │   │   ├── auth/consumer/  # Consumer auth
│   │   │   ├── merchant/       # Merchant dashboard
│   │   │   └── consumer/       # Consumer dashboard
│   │   │   └── (NO /admin!)    # Admin routes DON'T EXIST here
│   │   └── middleware.ts       # Blocks /admin with 404
│   └── package.json            # Port 3000
│
└── admin-portal/              # SEPARATE Admin app
    ├── src/
    │   ├── app/
    │   │   ├── login/          # Admin login with MFA
    │   │   └── dashboard/      # Admin dashboard
    │   ├── lib/
    │   │   ├── admin-api.ts    # Admin-specific API client
    │   │   └── admin-auth-context.tsx
    │   └── middleware.ts       # IP restriction + admin token check
    └── package.json            # Port 4000
```

### Backend Security
```
apps/api-gateway/
├── src/
│   ├── plugins/
│   │   ├── admin-security.ts   # NEW: Admin request validation
│   │   ├── ip-whitelist.ts     # NEW: IP restriction
│   │   └── rate-limit.ts       # Enhanced for admin
│   ├── routes/
│   │   └── admin.routes.ts     # Protected with requireAdminRole
│   └── auth/
│       ├── jwt.ts
│       ├── role-guard.ts
│       └── mfa.ts              # NEW: MFA verification
```

## 📝 Configuration

### Environment Variables
```bash
# Main Frontend (.env)
NEXT_PUBLIC_API_URL=http://localhost:3002/api
# NO admin URLs!

# Admin Portal (.env)
NEXT_PUBLIC_ADMIN_API_URL=http://localhost:3002/api
NEXT_PUBLIC_ADMIN_HOST=admin.veridex.io
ADMIN_IP_WHITELIST=10.0.0.0/8,192.168.1.0/24

# API Gateway (.env)
ADMIN_ALLOWED_ORIGINS=http://localhost:4000,https://admin.veridex.io
ADMIN_IP_WHITELIST=10.0.0.0/8,192.168.1.0/24
MFA_ISSUER=Veridex Admin
```

## 🚀 Development vs Production

| Aspect | Development | Production |
|--------|-------------|------------|
| Admin URL | localhost:4000 | admin.veridex.io |
| IP Restriction | Disabled | Enabled (VPN/Office IPs) |
| MFA | Optional | Mandatory |
| HTTPS | Optional | Required |
| Audit Logging | Console | Database + SIEM |
| Rate Limiting | Relaxed | Strict |

## 📋 Summary

1. **Admin portal is a separate Next.js app** on different subdomain/port
2. **No admin routes exist** in the main frontend
3. **IP whitelist** at both middleware and API gateway level
4. **MFA is mandatory** for all admin accounts
5. **Every admin action is logged** with full context
6. **Return 404 (not 403)** for unauthorized admin access
7. **Admin accounts can only be created** by SUPER_ADMIN
8. **Separate auth flows** with enhanced security for admin
