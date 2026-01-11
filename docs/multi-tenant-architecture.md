# Veridex Multi-Tenant Architecture

## Overview

This document defines the multi-tenant merchant platform architecture with clear data isolation, controlled visibility, and scalable ownership rules.

---

## Data Models

### 1. Organization

```typescript
interface Organization {
  _id: ObjectId;
  name: string;
  type: 'MERCHANT' | 'VENDOR' | 'DISPENSARY' | 'CULTIVATOR' | 'MANUFACTURER';
  status: 'PENDING' | 'ACTIVE' | 'SUSPENDED' | 'RESTRICTED';
  
  // Contact & Details
  email: string;
  phone?: string;
  website?: string;
  logo?: string;
  description?: string;
  
  // Address
  address?: {
    street: string;
    city: string;
    state: string;
    zipCode: string;
    country: string;
  };
  
  // Licensing
  licenseNumber?: string;
  licenseState?: string;
  licenseExpiresAt?: Date;
  
  // Ownership
  ownerId: ObjectId; // Primary admin user
  
  // Settings
  settings: Record<string, unknown>;
  
  // Verification
  isActive: boolean;
  isVerified: boolean;
  verifiedAt?: Date;
  
  // Timestamps
  createdAt: Date;
  updatedAt: Date;
}
```

### 2. User

```typescript
interface User {
  _id: ObjectId;
  email: string;
  passwordHash: string;
  
  // Profile
  firstName?: string;
  lastName?: string;
  phone?: string;
  avatar?: string;
  
  // Organization Binding (Critical for isolation)
  organizationId?: ObjectId; // Required for MERCHANT role
  role: 'SUPER_ADMIN' | 'ADMIN' | 'MERCHANT' | 'CONSUMER';
  
  // Status
  isActive: boolean;
  emailVerified: boolean;
  
  // Security
  lastLoginAt?: Date;
  failedLoginAttempts: number;
  lockoutUntil?: Date;
  
  // Timestamps
  createdAt: Date;
  updatedAt: Date;
}
```

### 3. Product

```typescript
type ProductScope = 'GLOBAL' | 'ORGANIZATION';

interface Product {
  _id: ObjectId;
  
  // CRITICAL: Scope & Ownership
  scope: ProductScope;
  organizationId?: ObjectId; // Required if scope = 'ORGANIZATION'
  merchantId?: ObjectId;     // User who created it
  
  // Basic Info
  name: string;
  sku: string;
  description?: string;
  category: ProductCategory;
  subcategory?: string;
  brand?: string;
  
  // Cannabis-specific
  thcContent?: number;
  cbdContent?: number;
  strain?: string;
  strainType?: 'INDICA' | 'SATIVA' | 'HYBRID';
  
  // Pricing (org-specific only)
  price?: number;
  costPrice?: number;
  currency: string;
  
  // Inventory (org-specific only)
  quantity?: number;
  unit?: string;
  
  // Compliance (org-specific only)
  complianceStatus: ComplianceStatus;
  lastComplianceCheck?: Date;
  complianceNotes?: string;
  
  // Status
  status: ProductStatus;
  isActive: boolean;
  
  // Media
  images: string[];
  thumbnailUrl?: string;
  
  // Lab Testing
  labTested: boolean;
  labTestUrl?: string;
  
  // Metadata
  tags: string[];
  metadata: Record<string, any>;
  
  // Origin tracking (for imports from global)
  sourceProductId?: ObjectId; // Original global product if imported
  
  // Timestamps
  createdAt: Date;
  updatedAt: Date;
  createdBy?: string;
}
```

### 4. Document

```typescript
interface Document {
  _id: ObjectId;
  
  // CRITICAL: Always organization-scoped
  organizationId: ObjectId; // REQUIRED - no global documents
  ownerId: ObjectId;        // User who uploaded
  
  // Optional product binding
  productId?: ObjectId;
  
  // Document Info
  name: string;
  type: DocumentType;
  description?: string;
  
  // File Info
  filePath: string;
  fileName: string;
  fileSize: number;
  mimeType: string;
  fileHash?: string;
  
  // Extraction
  extractionStatus: ExtractionStatus;
  extractedData?: ExtractedData;
  
  // Status
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'EXPIRED';
  visibility: 'PRIVATE' | 'ORGANIZATION'; // Never PUBLIC
  isActive: boolean;
  
  // Versioning
  version: number;
  parentDocumentId?: ObjectId;
  
  // Expiration
  expiresAt?: Date;
  
  // Audit
  reviewedBy?: ObjectId;
  reviewedAt?: Date;
  reviewNotes?: string;
  
  // Timestamps
  createdAt: Date;
  updatedAt: Date;
}
```

---

## API Contracts

### Product APIs

#### GET /products
Query products with scope filtering.

```typescript
// Query Parameters
interface ProductQuery {
  scope: 'global' | 'organization' | 'all'; // Required
  organizationId?: string; // Auto-injected for merchants
  category?: string;
  status?: string;
  search?: string;
  page?: number;
  limit?: number;
}

// Response
interface ProductListResponse {
  success: boolean;
  data: Product[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}
```

**Rules:**
- `scope=global`: Returns only products where `scope='GLOBAL'`
- `scope=organization`: Returns only products where `scope='ORGANIZATION' AND organizationId=user.orgId`
- `scope=all`: For SUPER_ADMIN only, returns all products
- Merchants: `organizationId` is auto-injected from JWT, cannot be overridden

#### POST /products
Create a new organization product.

```typescript
interface CreateProductRequest {
  name: string;
  sku: string;
  category: ProductCategory;
  // ... other fields
  // scope is always 'ORGANIZATION' for merchants
  // organizationId is auto-injected from JWT
}
```

**Rules:**
- Merchants can only create `scope='ORGANIZATION'` products
- Only SUPER_ADMIN can create `scope='GLOBAL'` products
- `organizationId` is auto-set from authenticated user's JWT

#### POST /products/:id/import
Import a global product as organization-owned.

```typescript
interface ImportProductRequest {
  // Optional overrides
  price?: number;
  quantity?: number;
  sku?: string; // Must be unique within org
}

// Creates a new product with:
// - scope: 'ORGANIZATION'
// - organizationId: from JWT
// - sourceProductId: original global product ID
// - All other fields copied from global product
```

### Document APIs

#### GET /documents
Query documents (always organization-scoped).

```typescript
interface DocumentQuery {
  productId?: string;
  type?: DocumentType;
  status?: string;
  // organizationId is ALWAYS auto-injected for merchants
}
```

**Rules:**
- No global documents exist
- `organizationId` is mandatory and auto-injected from JWT
- SUPER_ADMIN can query with explicit `organizationId` to view any org

#### POST /documents/upload
Upload a document.

```typescript
interface UploadDocumentRequest {
  file: File;
  name: string;
  type: DocumentType;
  productId?: string;
  description?: string;
}

// organizationId is auto-set from JWT
```

---

## RBAC Matrix

| Action | SUPER_ADMIN | ADMIN | MERCHANT | CONSUMER |
|--------|-------------|-------|----------|----------|
| **Products** |
| View global products | ✅ | ✅ | ✅ Read-only | ✅ Read-only |
| Create global products | ✅ | ❌ | ❌ | ❌ |
| View own org products | ✅ All orgs | ✅ | ✅ | ❌ |
| Create org products | ✅ | ✅ | ✅ | ❌ |
| Edit org products | ✅ | ✅ | ✅ Own only | ❌ |
| Delete org products | ✅ | ✅ | ❌ | ❌ |
| Import global to org | ✅ | ✅ | ✅ | ❌ |
| **Documents** |
| View org documents | ✅ All orgs | ✅ | ✅ | ❌ |
| Upload documents | ✅ | ✅ | ✅ | ❌ |
| Delete documents | ✅ | ✅ | ❌ | ❌ |
| **Compliance** |
| View compliance status | ✅ | ✅ | ✅ Own org | ✅ Public only |
| Submit for review | ✅ | ✅ | ✅ | ❌ |
| Approve/Reject | ✅ | ✅ | ❌ | ❌ |
| **Organization** |
| View org details | ✅ All | ✅ | ✅ Own | ❌ |
| Edit org details | ✅ | ✅ | ❌ | ❌ |
| Manage org users | ✅ | ✅ | ❌ | ❌ |

---

## Query Patterns

### Backend Enforcement (Non-Negotiable)

```typescript
// Product Service - GET /products
async function getProducts(query: ProductQuery, userContext: UserContext) {
  const filter: FilterQuery<Product> = {};
  
  // CRITICAL: Enforce scope
  if (query.scope === 'global') {
    filter.scope = 'GLOBAL';
  } else if (query.scope === 'organization') {
    filter.scope = 'ORGANIZATION';
    
    // CRITICAL: Enforce org isolation for non-super-admins
    if (userContext.role !== 'SUPER_ADMIN') {
      if (!userContext.organizationId) {
        throw new ForbiddenError('No organization access');
      }
      filter.organizationId = userContext.organizationId;
    } else if (query.organizationId) {
      filter.organizationId = query.organizationId;
    }
  } else {
    throw new BadRequestError('scope parameter is required');
  }
  
  return ProductModel.find(filter);
}

// Document Service - GET /documents
async function getDocuments(query: DocumentQuery, userContext: UserContext) {
  const filter: FilterQuery<Document> = {};
  
  // CRITICAL: Documents are ALWAYS org-scoped
  if (userContext.role !== 'SUPER_ADMIN') {
    if (!userContext.organizationId) {
      throw new ForbiddenError('No organization access');
    }
    filter.organizationId = userContext.organizationId;
  } else if (query.organizationId) {
    filter.organizationId = query.organizationId;
  } else {
    throw new BadRequestError('organizationId required for document queries');
  }
  
  return DocumentModel.find(filter);
}
```

### MongoDB Index Recommendations

```javascript
// Products
db.products.createIndex({ scope: 1, status: 1 });
db.products.createIndex({ scope: 1, organizationId: 1, status: 1 });
db.products.createIndex({ organizationId: 1, complianceStatus: 1 });

// Documents
db.documents.createIndex({ organizationId: 1, status: 1 });
db.documents.createIndex({ organizationId: 1, productId: 1 });
db.documents.createIndex({ organizationId: 1, type: 1 });
```

---

## Merchant Page UI Flow

### Dashboard (`/merchant`)
- Organization status card (Active/Pending/Restricted)
- Compliance summary widget
- Product counts:
  - Total owned products
  - Pending reviews
  - Compliant / Non-compliant
- Document status overview
- Recent activity feed

### Products Page (`/merchant/products`)
**Tabs:**
1. **My Products** - Products created by current user
2. **Organization Products** - All products owned by the organization
3. **Global Catalog** - Read-only browsable catalog

**Actions per tab:**
- My/Org Products: Edit, Delete, Submit for compliance
- Global Catalog: View details, Import to organization

### Documents Page (`/merchant/documents`)
- Upload document button
- Filter by: Type, Status, Product
- Document list with:
  - Name, Type, Status
  - Associated product (if any)
  - Expiry date
  - Version history
  - Actions: View, Download, Delete

### Compliance Page (`/merchant/compliance`)
- Product compliance status list
- Filter by status (Pending, Compliant, Non-compliant)
- Per-product:
  - Current status
  - Rule violations (if any)
  - Admin feedback
  - Status timeline
  - Re-submission button

### Profile Page (`/merchant/profile`)
- User info section
- Role display
- Organization info
- Activity history
- Access scope preview (what they can see)

---

## Compliance Flow

```
┌──────────────────────────────────────────────────────────────┐
│                    COMPLIANCE FLOW                            │
├──────────────────────────────────────────────────────────────┤
│                                                               │
│  1. Merchant creates product                                  │
│     └─> Status: DRAFT, Compliance: PENDING                    │
│                                                               │
│  2. Merchant uploads required documents                       │
│     └─> Documents linked to product                           │
│                                                               │
│  3. Merchant submits for compliance review                    │
│     └─> Status: ACTIVE, Compliance: UNDER_REVIEW              │
│                                                               │
│  4. Admin reviews product + documents                         │
│     ├─> APPROVED: Compliance: COMPLIANT                       │
│     └─> REJECTED: Compliance: NON_COMPLIANT + feedback        │
│                                                               │
│  5. If rejected:                                              │
│     └─> Merchant fixes issues, re-submits (goto step 3)       │
│                                                               │
│  6. Periodic re-validation                                    │
│     └─> Documents expire → Compliance: PENDING                │
│                                                               │
└──────────────────────────────────────────────────────────────┘
```

---

## Security Invariants

1. **No API returns mixed-organization data** - Every response is scoped
2. **organizationId is server-enforced** - Never trust frontend
3. **Global products are read-only** - Cannot be edited by merchants
4. **Documents never cross organization boundaries**
5. **JWT contains orgId** - Set at login, verified on every request
6. **Scope parameter is mandatory** - No implicit "all" queries

---

## Migration Notes

### Existing Data
1. All existing products without `scope` field → set to `'ORGANIZATION'`
2. Verify all documents have `organizationId`
3. Verify all merchant users have `organizationId`

### Seed Data
Create global products for catalog:
```javascript
db.products.insertMany([
  {
    scope: 'GLOBAL',
    name: 'Standard Cannabis Flower Template',
    category: 'FLOWER',
    // ... template data
    organizationId: null, // Global products have no org
    status: 'ACTIVE',
    complianceStatus: 'COMPLIANT', // Pre-approved
  }
]);
```
