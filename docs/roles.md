# Roles in Veridex

Veridex is a role-based compliance platform with three primary roles.
Roles define **who the user is**, not what they can do. Capabilities are handled via permissions.

---

## CONSUMER

### Purpose
End users who want to verify product compliance before purchase.

### Capabilities
- Browse products
- View compliance status
- View verified document summaries (read-only)

### Restrictions
- Cannot upload documents
- Cannot create products
- Cannot manage organizations

Consumers never own data. They only consume trust signals.

---

## MERCHANT

### Purpose
Organizations that submit products for compliance verification.

### Capabilities
- Register organizations
- Create and manage products
- Upload lab reports, licenses, insurance
- View compliance results
- Fix failures and resubmit documents

### Restrictions
- Cannot modify compliance rules
- Cannot delete audit records

Merchants own products and documents, but **do not own compliance outcomes**.

---

## ADMIN (Veridex)

### Purpose
Platform governance and trust enforcement.

### Capabilities
- Manage compliance rules
- Review audits and edge cases
- Perform manual reviews when automation fails

### Restrictions
- Cannot delete or alter audit logs
- Cannot bypass compliance engine

Admins oversee the system but are **not allowed to rewrite history**.

---

## Role Design Principles

- Roles are **coarse-grained**
- Permissions handle fine-grained access
- Roles are immutable at runtime
- One user may have different roles across organizations in the future

This separation keeps the system auditable and secure.
