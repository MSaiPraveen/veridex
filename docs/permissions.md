# Permissions Model

Permissions define **what actions are allowed** in Veridex.
They are decoupled from roles and enforced centrally.

---

## Permission Categories

### Product Permissions
| Permission | Description |
|------------|-------------|
| VIEW_PRODUCTS | View product listings and details |
| CREATE_PRODUCTS | Create new products |
| UPDATE_PRODUCTS | Modify existing products |
| DELETE_PRODUCTS | Remove products |
| MANAGE_PRODUCTS | Full product administration |

### Document Permissions
| Permission | Description |
|------------|-------------|
| VIEW_DOCUMENTS | View uploaded documents |
| UPLOAD_DOCUMENTS | Upload new documents |
| UPDATE_DOCUMENTS | Modify document metadata |
| DELETE_DOCUMENTS | Remove documents |
| MANAGE_DOCUMENTS | Full document administration |

### Compliance Permissions
| Permission | Description |
|------------|-------------|
| VIEW_COMPLIANCE | View compliance status and results |
| VIEW_RULES | View compliance rules |
| CREATE_RULES | Create new compliance rules |
| UPDATE_RULES | Modify existing rules |
| DELETE_RULES | Remove compliance rules |
| MANAGE_RULES | Full rule administration |

### Audit Permissions
| Permission | Description |
|------------|-------------|
| VIEW_AUDITS | View audit logs |
| MANAGE_AUDITS | Audit administration (read-only, no delete) |

### User & Organization Permissions
| Permission | Description |
|------------|-------------|
| VIEW_USERS | View user profiles |
| MANAGE_USERS | User administration |
| VIEW_ORGANIZATIONS | View organizations |
| MANAGE_ORGANIZATIONS | Organization administration |

### Notification Permissions
| Permission | Description |
|------------|-------------|
| VIEW_NOTIFICATIONS | View notifications |
| MANAGE_NOTIFICATIONS | Notification preferences |

### Admin Permissions
| Permission | Description |
|------------|-------------|
| VIEW_SETTINGS | View system settings |
| MANAGE_SETTINGS | Modify system settings |
| ADMIN_ACCESS | Full administrative access |

---

## Role → Permission Mapping

### CONSUMER
```
VIEW_PRODUCTS
VIEW_COMPLIANCE
VIEW_NOTIFICATIONS
```

### MERCHANT
```
VIEW_PRODUCTS
CREATE_PRODUCTS
UPDATE_PRODUCTS
DELETE_PRODUCTS
VIEW_DOCUMENTS
UPLOAD_DOCUMENTS
UPDATE_DOCUMENTS
DELETE_DOCUMENTS
VIEW_COMPLIANCE
VIEW_ORGANIZATIONS
VIEW_NOTIFICATIONS
MANAGE_NOTIFICATIONS
```

### ADMIN
```
VIEW_PRODUCTS
MANAGE_PRODUCTS
VIEW_DOCUMENTS
MANAGE_DOCUMENTS
VIEW_COMPLIANCE
VIEW_RULES
CREATE_RULES
UPDATE_RULES
DELETE_RULES
MANAGE_RULES
VIEW_AUDITS
VIEW_USERS
MANAGE_USERS
VIEW_ORGANIZATIONS
MANAGE_ORGANIZATIONS
VIEW_NOTIFICATIONS
VIEW_SETTINGS
MANAGE_SETTINGS
ADMIN_ACCESS
```

---

## Enforcement Strategy

1. **API Gateway** validates JWT and extracts role
2. **Role → Permissions** mapping applied
3. **Route guards** check required permissions
4. **Backend services** trust gateway context

```
Request → JWT Validation → Role Extraction → Permission Check → Route Handler
```

### Frontend Behavior
- Permissions used for UI visibility only
- Never trust frontend for enforcement
- Hide unavailable actions, don't just disable

### Backend Behavior
- Always validate at gateway
- Services assume trusted context
- No permission checks in individual services

---

## Permission Design Principles

1. **Least Privilege**: Users get minimum required permissions
2. **Explicit Grant**: No implicit permissions
3. **Audit Trail**: Permission checks are logged
4. **Data-Driven**: Permissions defined in code, not scattered
