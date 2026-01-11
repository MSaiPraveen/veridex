# Veridex Sample Users & Test Accounts

This document contains all sample user credentials and details for testing the Veridex platform.

> ⚠️ **WARNING**: These are test credentials for development/staging environments only. Never use these in production.

---

## 📋 Table of Contents

1. [Admin Account](#admin-account)
2. [Merchant Accounts](#merchant-accounts)
3. [Consumer Accounts](#consumer-accounts)
4. [Organizations](#organizations)
5. [Products](#products)
6. [Quick Reference](#quick-reference)

---

## 🔐 Admin Account

The system administrator account with full platform access.

| Field | Value |
|-------|-------|
| **Email** | `admin@veridex.io` |
| **Password** | `AdminSecure123!` |
| **First Name** | System |
| **Last Name** | Admin |
| **Role** | `ADMIN` |
| **Portal URL** | `/admin` (Admin Portal) |

### Admin Capabilities
- View and manage all users (merchants & consumers)
- Review and update compliance status
- Manage organizations
- Access audit logs
- System configuration
- Generate compliance reports

---

## 🏪 Merchant Accounts

Merchants are business users who manage products and compliance documentation.

### Organization: GreenLeaf Labs

| Role | Email | Password | Name |
|------|-------|----------|------|
| **OWNER** | `owner@greenleaflabs.com` | `Password123!` | Michael Green |
| **STAFF** | `staff@greenleaflabs.com` | `Password123!` | Sarah Leaf |

**Products**: 6 products (CBD Oil 500mg, CBD Oil 1000mg, Hemp Gummies 25mg, CBD Topical Cream, Full Spectrum Tincture, Sleep Aid Capsules)

---

### Organization: Pure Wellness Co

| Role | Email | Password | Name |
|------|-------|----------|------|
| **OWNER** | `owner@purewellness.co` | `Password123!` | Jennifer Pure |
| **ADMIN** | `admin@purewellness.co` | `Password123!` | Robert Wellness |

**Products**: 7 products (Organic Hemp Extract, Relaxation Drops, Pain Relief Balm, Daily Wellness Caps, Pet CBD Oil, Recovery Cream, Focus Gummies)

---

### Organization: Herbal Remedies Inc

| Role | Email | Password | Name |
|------|-------|----------|------|
| **OWNER** | `owner@herbalremedies.inc` | `Password123!` | Patricia Herbal |

**Products**: 7 products (Traditional Hemp Oil, Herbal Sleep Aid, Muscle Relief Gel, Calm Drops, Energy Boost Gummies, Immunity Capsules, Skin Repair Lotion)

---

## 👤 Consumer Accounts

Consumers are end-users who can view product compliance information.

| # | Email | Password | Name |
|---|-------|----------|------|
| 1 | `consumer1@example.com` | `Password123!` | Alice Johnson |
| 2 | `consumer2@example.com` | `Password123!` | Bob Smith |
| 3 | `consumer3@example.com` | `Password123!` | Carol Williams |
| 4 | `consumer4@example.com` | `Password123!` | David Brown |
| 5 | `consumer5@example.com` | `Password123!` | Emma Davis |
| 6 | `consumer6@example.com` | `Password123!` | Frank Miller |
| 7 | `consumer7@example.com` | `Password123!` | Grace Wilson |
| 8 | `consumer8@example.com` | `Password123!` | Henry Moore |
| 9 | `consumer9@example.com` | `Password123!` | Ivy Taylor |
| 10 | `consumer10@example.com` | `Password123!` | Jack Anderson |

---

## 🏢 Organizations

| Organization Name | Owner Email | Member Count | Product Count |
|------------------|-------------|--------------|---------------|
| GreenLeaf Labs | owner@greenleaflabs.com | 2 | 6 |
| Pure Wellness Co | owner@purewellness.co | 2 | 7 |
| Herbal Remedies Inc | owner@herbalremedies.inc | 1 | 7 |

---

## 📦 Products

### Product Categories
- **CBD** - CBD oils and extracts
- **EDIBLES** - Gummies and edible products
- **TOPICALS** - Creams, balms, and lotions
- **TINCTURES** - Drops and tinctures
- **CAPSULES** - Pills and capsules
- **PET** - Pet-specific products

### Products by Compliance Status

#### ✅ Compliant Products
| Product | Category | Organization |
|---------|----------|--------------|
| CBD Oil 1000mg | CBD | GreenLeaf Labs |
| Hemp Gummies 25mg | EDIBLES | GreenLeaf Labs |
| Organic Hemp Extract | CBD | Pure Wellness Co |
| Pain Relief Balm | TOPICALS | Pure Wellness Co |
| Focus Gummies | EDIBLES | Pure Wellness Co |
| Muscle Relief Gel | TOPICALS | Herbal Remedies Inc |

#### ⏳ Pending Products
| Product | Category | Organization |
|---------|----------|--------------|
| CBD Oil 500mg | CBD | GreenLeaf Labs |
| CBD Topical Cream | TOPICALS | GreenLeaf Labs |
| Sleep Aid Capsules | CAPSULES | GreenLeaf Labs |
| Relaxation Drops | TINCTURES | Pure Wellness Co |
| Pet CBD Oil | PET | Pure Wellness Co |
| Recovery Cream | TOPICALS | Pure Wellness Co |
| Traditional Hemp Oil | CBD | Herbal Remedies Inc |
| Herbal Sleep Aid | CAPSULES | Herbal Remedies Inc |
| Energy Boost Gummies | EDIBLES | Herbal Remedies Inc |
| Immunity Capsules | CAPSULES | Herbal Remedies Inc |
| Skin Repair Lotion | TOPICALS | Herbal Remedies Inc |

#### ❌ Non-Compliant Products
| Product | Category | Organization | Reason |
|---------|----------|--------------|--------|
| Full Spectrum Tincture | TINCTURES | GreenLeaf Labs | Invalid lab report |
| Daily Wellness Caps | CAPSULES | Pure Wellness Co | Failed document extraction |
| Calm Drops | TINCTURES | Herbal Remedies Inc | Expired lab report & insufficient insurance |

---

## 📄 Document Types

| Type | Description |
|------|-------------|
| `LAB_REPORT` | Third-party lab test results |
| `BUSINESS_LICENSE` | Business operating license |
| `INSURANCE` | Liability insurance certificate |

---

## ⚡ Quick Reference

### Login URLs
| Portal | URL | Users |
|--------|-----|-------|
| Admin Portal | `http://localhost:3001/admin` | System Admin |
| Merchant Dashboard | `http://localhost:3000` | Merchants |
| Consumer App | `http://localhost:3000` | Consumers |

### Default Test Credentials

**Admin Login:**
```
Email: admin@veridex.io
Password: AdminSecure123!
```

**Merchant Login (GreenLeaf Labs Owner):**
```
Email: owner@greenleaflabs.com
Password: Password123!
```

**Consumer Login:**
```
Email: consumer1@example.com
Password: Password123!
```

---

## 🔄 Seeding the Database

To populate the database with these sample users, run:

```bash
cd scripts
npm run seed
```

Or from the root directory:

```bash
npm run seed -w scripts
```

---

## 📊 Summary Statistics

| Entity | Count |
|--------|-------|
| Admin Users | 1 |
| Merchant Users | 5 |
| Consumer Users | 10 |
| Organizations | 3 |
| Products | 20 |
| Documents | ~24 |

---

*Last updated: January 2, 2026*
