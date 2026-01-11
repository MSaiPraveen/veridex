# 📘 User-Org Service — Veridex

**Service Path:** `apps/user-org-service`  
**Port:** 3003  
**Database:** `veridex-users` (MongoDB Atlas)  
**Interacting Roles:** All (profile), Merchant (org management), Admin (all)

---

## 1. Purpose & Scope

### What This Service Exists To Do

The User-Org Service manages **user profiles and organizational hierarchy**. It handles:

- User profile management (non-credential data)
- Organization creation and management
- Organization membership and roles
- Auto-creation of organizations for merchants

### What It Explicitly Does NOT Do

| Responsibility | Owned By |
|----------------|----------|
| User credentials | Auth Service |
| Authentication tokens | Auth Service |
| Product/document ownership | Product/Document Services |
| Authorization enforcement | API Gateway |

### Why It Exists As A Separate Service

1. **Separation from Auth:** Profile data has different access patterns than credentials
2. **Organization Domain:** Complex membership/role logic isolated
3. **Multi-tenancy Core:** Central place for tenant hierarchy

---

## 2. Ownership & Data Boundaries

### Data This Service Owns

| Collection | Key Fields | Purpose |
|------------|------------|---------|
| `userProfiles` | `userId`, `firstName`, `lastName`, `phone`, `avatar` | Extended profile |
| `organizations` | `name`, `industry`, `status`, `settings` | Company data |
| `memberships` | `userId`, `organizationId`, `role`, `joinedAt` | Org membership |

### Organization Roles

```typescript
type OrgRole = 
  | 'OWNER'     // Full org control
  | 'MANAGER'   // Manage members
  | 'MEMBER';   // Basic access
```

---

## 3. Responsibilities

- ✅ Store and update user profiles
- ✅ Create organizations on merchant registration
- ✅ Manage organization membership
- ✅ Link users to organizations
- ✅ Provide organization data for other services
- ✅ Consume USER_REGISTERED events

---

## 4. Public API Surface

### User Profile Endpoints

| Method | Path | Description | Auth |
|--------|------|-------------|------|
| GET | `/users/profile` | Get current user's profile | Yes |
| PUT | `/users/profile` | Update current user's profile | Yes |
| GET | `/users/:id` | Get user by ID | Admin |

### Organization Endpoints

| Method | Path | Description | Auth |
|--------|------|-------------|------|
| POST | `/organizations` | Create organization | Merchant |
| GET | `/organizations/:id` | Get organization | Member/Admin |
| PUT | `/organizations/:id` | Update organization | Owner/Admin |
| GET | `/organizations` | List all organizations | Admin |

### Membership Endpoints

| Method | Path | Description | Auth |
|--------|------|-------------|------|
| GET | `/organizations/:id/members` | List members | Member/Admin |
| POST | `/organizations/:id/members` | Add member | Owner/Admin |
| DELETE | `/organizations/:id/members/:userId` | Remove member | Owner/Admin |
| PATCH | `/organizations/:id/members/:userId` | Update role | Owner/Admin |

---

## 5. Internal Workflow

### Auto Organization Creation (Event-Driven)

```
1. Auth Service emits USER_REGISTERED
   { userId, email, role: 'MERCHANT', companyName, industry }
   ↓
2. Kafka Consumer receives event
   ↓
3. Create Organization:
   {
     name: companyName,
     industry,
     status: 'ACTIVE',
     createdBy: userId
   }
   ↓
4. Create Membership:
   {
     userId,
     organizationId: newOrgId,
     role: 'OWNER'
   }
   ↓
5. Call Auth Service Internal API:
   PATCH /auth/internal/users/:userId/organization
   { organizationId: newOrgId }
   ↓
6. Emit ORG_CREATED event
```

---

## 6. Event & Async Communication

### Events Consumed

| Event | Topic | Action |
|-------|-------|--------|
| `USER_REGISTERED` | `auth.user.registered` | Create org for merchants |

### Events Emitted

| Event | Topic | Payload |
|-------|-------|---------|
| `ORG_CREATED` | `organization.created` | `{ orgId, name, ownerId }` |
| `ORG_MEMBER_ADDED` | `organization.member.added` | `{ orgId, userId, role }` |
| `USER_PROFILE_CREATED` | `user.profile.created` | `{ userId, profileId }` |

---

## 7. Dependencies

### Internal

| Service | Purpose |
|---------|---------|
| Auth Service | Update user's organizationId |
| Kafka | Event consumption/production |

### External

| Dependency | Purpose |
|------------|---------|
| MongoDB Atlas | Data storage |

---

## 8. Failure Modes

| Failure | Impact | Status |
|---------|--------|--------|
| Auth internal API fails | User not linked to org | **Critical bug** |
| Kafka consumer crashes | No org created for merchant | **Critical bug** |
| MongoDB down | All operations fail | Service failure |

---

## 9. Security & RBAC

### Authorization

| Action | Consumer | Merchant | Admin |
|--------|----------|----------|-------|
| View own profile | ✅ | ✅ | ✅ |
| Update own profile | ✅ | ✅ | ✅ |
| Create organization | ❌ | ✅ | ✅ |
| Manage own org | ❌ | ✅ | ✅ |
| View all orgs | ❌ | ❌ | ✅ |

---

## 10. Known Issues

| Issue | Impact | Priority |
|-------|--------|----------|
| Auth API hardcoded URL | Environment coupling | Medium |
| No retry on auth API failure | Orphaned users | High |
| No profile validation | Invalid data possible | Low |

---

## 11. Integration Checklist

- [ ] `MONGO_URI` configured
- [ ] `KAFKA_BROKER` accessible
- [ ] Auth Service reachable for internal API
- [ ] `INTERNAL_SERVICE_KEY` matches Auth Service

---

*Document Version: 1.0*  
*Last Updated: January 2026*
