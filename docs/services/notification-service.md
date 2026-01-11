# 📘 Notification Service — Veridex

**Service Path:** `apps/notification-service`  
**Port:** 3007  
**Database:** `veridex-notifications` (MongoDB Atlas)  
**Interacting Roles:** All (receive), System (send)

---

## 1. Purpose & Scope

### What This Service Exists To Do

The Notification Service manages **all user-facing communications**. It handles:

- Email notifications
- In-app notifications
- User notification preferences
- Template management
- Delivery status tracking

### What It Explicitly Does NOT Do

| Responsibility | Owned By |
|----------------|----------|
| Define notification triggers | Other services emit events |
| User contact info | User-Org Service |
| Push notifications | Not implemented |
| SMS notifications | Not implemented |

---

## 2. Ownership & Data Boundaries

### Data This Service Owns

| Collection | Key Fields | Purpose |
|------------|------------|---------|
| `notifications` | `userId`, `type`, `title`, `message`, `read`, `createdAt` | In-app notifications |
| `preferences` | `userId`, `email`, `inApp`, `categories` | User settings |
| `templates` | `name`, `subject`, `body`, `variables` | Email templates |
| `deliveryLog` | `notificationId`, `channel`, `status`, `sentAt` | Audit trail |

### Notification Types

```typescript
type NotificationType =
  | 'COMPLIANCE_COMPLETED'
  | 'COMPLIANCE_VIOLATION'
  | 'DOCUMENT_EXPIRING'
  | 'DOCUMENT_REJECTED'
  | 'WELCOME'
  | 'PASSWORD_RESET'
  | 'SYSTEM_ALERT';
```

---

## 3. Responsibilities

- ✅ Receive notification events from Kafka
- ✅ Render email templates
- ✅ Send emails via SMTP
- ✅ Create in-app notification records
- ✅ Respect user preferences
- ✅ Track delivery status
- ✅ Provide notification API for frontend

---

## 4. Public API Surface

### User Notification Endpoints

| Method | Path | Description | Auth |
|--------|------|-------------|------|
| GET | `/notifications` | List user's notifications | Yes |
| GET | `/notifications/:id` | Get notification | Yes |
| PATCH | `/notifications/:id/read` | Mark as read | Yes |
| POST | `/notifications/mark-all-read` | Mark all as read | Yes |
| GET | `/notifications/unread-count` | Get unread count | Yes |

### Preference Endpoints

| Method | Path | Description | Auth |
|--------|------|-------------|------|
| GET | `/notifications/preferences` | Get preferences | Yes |
| PUT | `/notifications/preferences` | Update preferences | Yes |

### Admin Endpoints

| Method | Path | Description | Auth |
|--------|------|-------------|------|
| POST | `/admin/notifications/send` | Send to specific users | Admin |
| POST | `/admin/notifications/broadcast` | Send to all users | Admin |
| GET | `/admin/notifications/templates` | List templates | Admin |

---

## 5. Internal Workflow

### Event-Driven Notification Flow

```
1. Event Received: COMPLIANCE_CHECK_COMPLETED
   { productId, status, merchantUserId }
   ↓
2. Determine Recipients:
   - Product owner (merchantUserId)
   - Organization admins (query User-Org Service)
   ↓
3. Check Preferences:
   - GET preferences for each user
   - Filter by notification category
   ↓
4. For Each Recipient:
   ↓
5a. In-App Notification:
    - Create notification record
    - Store in MongoDB
   ↓
5b. Email Notification (if enabled):
    - Load template
    - Render with data
    - Send via SMTP
    - Log delivery status
   ↓
6. Emit NOTIFICATION_SENT event
```

---

## 6. Event & Async Communication

### Events Consumed

| Event | Topic | Action |
|-------|-------|--------|
| `COMPLIANCE_CHECK_COMPLETED` | `compliance.check_completed` | Notify merchant of result |
| `DOCUMENT_REJECTED` | `document.rejected` | Notify of rejection |
| `DOCUMENT_EXPIRING` | `document.expiring` | Warn about expiration |
| `COMPLIANCE_VIOLATION` | `compliance.violation` | Alert on violation |
| `NOTIFICATION_SEND` | `notification.send` | Generic notification trigger |

### Events Emitted

| Event | Topic | Payload |
|-------|-------|---------|
| `NOTIFICATION_SENT` | `notification.sent` | `{ notificationId, userId, channel }` |
| `NOTIFICATION_FAILED` | `notification.failed` | `{ notificationId, error }` |

---

## 7. Dependencies

### Internal

| Service | Purpose | Failure Impact |
|---------|---------|----------------|
| User-Org Service | Get user email | Email fails |
| Kafka | Event consumption | No notifications |

### External

| Dependency | Purpose | Failure Impact |
|------------|---------|----------------|
| SMTP Server | Email delivery | Email fails (in-app works) |
| MongoDB Atlas | Notification storage | Service fails |

---

## 8. Failure Modes

| Failure | Behavior | Recovery |
|---------|----------|----------|
| SMTP down | Email queued for retry | Background retry job |
| User email not found | Skip email, log | In-app still works |
| Kafka down | No new notifications | Consumer reconnects |

---

## 9. Security

- Notifications filtered by userId
- Users can only see their own notifications
- Admin can broadcast but not read others' notifications
- Email templates validated to prevent injection

---

## 10. Known Issues

| Issue | Impact | Priority |
|-------|--------|----------|
| No retry queue | Lost notifications | High |
| No push notifications | Limited mobile UX | Medium |
| No email verification | Spam risk | Medium |

---

## 11. Integration Checklist

- [ ] `MONGO_URI` configured
- [ ] `KAFKA_BROKER` accessible
- [ ] SMTP credentials configured
- [ ] Email templates seeded
- [ ] User-Org Service accessible

---

*Document Version: 1.0*  
*Last Updated: January 2026*
