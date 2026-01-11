# 📘 Document Service — Veridex

**Service Path:** `apps/document-service`  
**Port:** 3005  
**Database:** `veridex-documents` (MongoDB Atlas)  
**File Storage:** `/app/uploads` (Docker volume)  
**Interacting Roles:** Merchant (upload), Admin (review), Consumer (limited view)

---

## 1. Purpose & Scope

### What This Service Exists To Do

The Document Service manages **file uploads, storage, and metadata** for compliance documents. It handles:

- Multipart file upload and storage
- Document metadata management
- File type validation
- Document status lifecycle
- Expiration tracking
- Admin review flagging

### What It Explicitly Does NOT Do

| Responsibility | Owned By |
|----------------|----------|
| Document compliance evaluation | Compliance Service |
| Product management | Product Service |
| OCR/text extraction | Planned (not implemented) |
| Cloud storage (S3) | Local storage only currently |

### Why It Exists As A Separate Service

1. **File Storage:** Different scaling requirements than database services
2. **Security:** File handling requires isolation
3. **Processing:** Future OCR/extraction needs compute resources
4. **Compliance:** Document audit trail must be separate

---

## 2. Ownership & Data Boundaries

### Data This Service Owns

| Collection | Key Fields | Purpose |
|------------|------------|---------|
| `documents` | `filename`, `originalName`, `mimeType`, `size`, `path`, `type`, `status`, `ownerId`, `organizationId`, `productId` | Metadata |
| File System | Binary files at `/app/uploads` | Actual file storage |

### Document Types

```typescript
type DocumentType = 
  | 'LAB_REPORT'      // Lab test results
  | 'LICENSE'         // Business license
  | 'CERTIFICATE'     // Certifications
  | 'COA'             // Certificate of Analysis
  | 'INSURANCE'       // Insurance documents
  | 'OTHER';          // Miscellaneous
```

### Document Statuses

```typescript
type DocumentStatus =
  | 'PENDING'         // Just uploaded
  | 'PROCESSING'      // Being extracted/validated
  | 'SUCCESS'         // Verified
  | 'FAILED'          // Processing failed
  | 'EXPIRED'         // Past expiration date
  | 'REJECTED';       // Admin rejected
```

---

## 3. Responsibilities

- ✅ Accept multipart file uploads
- ✅ Validate file types and sizes
- ✅ Store files securely on disk
- ✅ Create metadata records
- ✅ Link documents to products
- ✅ Enforce organization isolation
- ✅ Emit upload events for compliance processing
- ✅ Track document expiration
- ✅ Flag documents for admin review

---

## 4. Public API Surface

### POST `/documents`

**Description:** Upload a new document

**Content-Type:** `multipart/form-data`

**Request Fields:**
```typescript
{
  file: File;              // Required, the actual file
  type: DocumentType;      // Required
  productId?: string;      // Required for LAB_REPORT, COA, CERTIFICATE
  expirationDate?: Date;   // Optional
  notes?: string;          // Optional
}
```

**Response Schema:**
```typescript
{
  success: true,
  data: {
    _id: string,
    filename: string,
    originalName: string,
    mimeType: string,
    size: number,
    type: DocumentType,
    status: 'PENDING',
    productId?: string,
    uploadedAt: Date
  }
}
```

**Authorization:** MERCHANT or ADMIN  
**Side Effects:**
- File written to disk
- Metadata saved to MongoDB
- `DOCUMENT_UPLOADED` event emitted

---

### GET `/documents`

**Description:** List documents for current organization

**Query Parameters:**
```typescript
{
  limit?: number;        // Default 20
  offset?: number;
  type?: DocumentType;   // Filter by type
  status?: string;       // Filter by status
  productId?: string;    // Filter by product
}
```

**Authorization:** Any authenticated user (filtered by org)

---

### GET `/documents/:id`

**Description:** Get document metadata

**Authorization:** Owner organization or Admin

---

### GET `/documents/:id/download`

**Description:** Download actual file

**Response:** Binary file stream with appropriate Content-Type

**Authorization:** Owner organization or Admin

---

### DELETE `/documents/:id`

**Description:** Delete document and file

**Authorization:** Owner or Admin  
**Side Effects:**
- File deleted from disk
- Metadata marked deleted
- `DOCUMENT_DELETED` event emitted

---

### GET `/documents/product/:productId`

**Description:** Get all documents for a product

**Authorization:** Product owner or Admin

---

### GET `/documents/owner/:ownerId`

**Description:** Get all documents uploaded by a user

**Authorization:** Admin only

---

## 5. Internal Workflow

### Upload Flow

```
1. Request: POST /documents (multipart)
   Headers: x-user-id, x-organization-id
   Body: file + metadata
   ↓
2. Parse Multipart:
   - Extract file stream
   - Extract form fields
   ↓
3. Validate File:
   - Check mime type against allowed list
   - Check size against limit (10MB default)
   - Reject if invalid
   ↓
4. Validate Metadata:
   - Check type is valid enum
   - If product-required type (COA, LAB_REPORT): verify productId
   - Verify product belongs to user's org
   ↓
5. Store File:
   - Generate unique filename (UUID + original extension)
   - Write to /app/uploads/<filename>
   ↓
6. Create Metadata Record:
   {
     filename,
     originalName,
     mimeType,
     size,
     path: '/app/uploads/<filename>',
     type,
     status: 'PENDING',
     ownerId: x-user-id,
     organizationId: x-organization-id,
     productId,
     uploadedAt: now()
   }
   ↓
7. Emit Event:
   DOCUMENT_UPLOADED → Kafka
   { documentId, type, productId, organizationId }
   ↓
8. Response: 201 with metadata
```

### Download Flow

```
1. Request: GET /documents/:id/download
   ↓
2. Find Document: DocumentRepo.findById(id)
   ↓
3. Authorization:
   - Check organizationId matches header OR role is ADMIN
   - Reject if unauthorized
   ↓
4. Read File: fs.createReadStream(document.path)
   ↓
5. Response: Stream file with headers
   Content-Type: document.mimeType
   Content-Disposition: attachment; filename="originalName"
```

---

## 6. Event & Async Communication

### Events Emitted

| Event | Topic | Payload | Consumers |
|-------|-------|---------|-----------|
| `DOCUMENT_UPLOADED` | `document.uploaded` | `{ documentId, type, productId, organizationId }` | Compliance, Audit |
| `DOCUMENT_PROCESSED` | `document.processed` | `{ documentId, extractedData }` | Compliance |
| `DOCUMENT_REJECTED` | `document.rejected` | `{ documentId, reason, details }` | Notification, Audit |
| `DOCUMENT_EXPIRING` | `document.expiring` | `{ documentId, expirationDate }` | Notification |
| `DOCUMENT_ADMIN_REVIEW_REQUIRED` | `document.admin.review.required` | `{ documentId, flagReason }` | Admin Dashboard |

### Events Consumed

None currently. Document Service is producer-only.

---

## 7. Dependencies

### Internal Dependencies

| Service | Purpose | Failure Impact |
|---------|---------|----------------|
| Kafka | Event emission | Compliance not triggered |
| Product Service | Verify product ownership | Cannot validate productId |

### External Dependencies

| Dependency | Purpose | Failure Impact |
|------------|---------|----------------|
| MongoDB Atlas | Metadata storage | Service fails |
| File System | File storage | Uploads fail |
| @fastify/multipart | File parsing | Uploads fail |

### Environment Variables

```bash
PORT=3005
MONGO_URI=mongodb+srv://...
KAFKA_BROKER=kafka:9092
UPLOAD_DIR=/app/uploads
MAX_FILE_SIZE=10485760  # 10MB
```

---

## 8. Failure Modes & Error Handling

### Upload Validation Failures

| Error | Status | Cause |
|-------|--------|-------|
| `INVALID_FILE_TYPE` | 400 | Unsupported mime type |
| `FILE_TOO_LARGE` | 413 | Exceeds size limit |
| `MISSING_PRODUCT_ID` | 400 | COA/LAB_REPORT without product |
| `PRODUCT_NOT_FOUND` | 404 | Invalid productId |
| `FORBIDDEN` | 403 | Product belongs to different org |

### Partial Failures

| Scenario | Behavior | Recovery |
|----------|----------|----------|
| File saved, DB fails | Orphan file on disk | Cleanup job needed |
| DB saved, event fails | Document exists, compliance not triggered | Manual re-trigger |

### File Cleanup

- Temp files cleaned on error
- No automatic cleanup of orphan files (debt)

---

## 9. Security & RBAC

### Authorization Matrix

| Action | Consumer | Merchant | Admin |
|--------|----------|----------|-------|
| Upload document | ❌ | ✅ | ✅ |
| View own org docs | ❌ | ✅ | ✅ |
| View any docs | ❌ | ❌ | ✅ |
| Download own org | ❌ | ✅ | ✅ |
| Download any | ❌ | ❌ | ✅ |
| Delete own | ❌ | ✅ | ✅ |

### File Security

- Files stored outside web root
- No direct URL access to files
- All downloads through API with auth check
- Unique filenames prevent enumeration

---

## 10. Observability & Auditing

### Logs

- Upload events with file details
- Download events with user context
- Rejection events with reasons

### Audit Events

All document operations emitted to Kafka → Audit Service

### Metrics (Planned)

- `document_upload_total{type, status}`
- `document_size_bytes`
- `document_download_total`

---

## 11. Performance Considerations

### Hot Paths

| Path | Optimization |
|------|--------------|
| Upload | Stream to disk (low memory) |
| Download | Stream from disk |
| List by org | Index on organizationId |

### Storage Scaling

- Current: Local disk volume
- Future: Object storage (S3, GCS)
- Concern: Disk space monitoring needed

---

## 12. Known Issues & Technical Debt

| Issue | Impact | Priority |
|-------|--------|----------|
| No cloud storage | Not production-ready | High |
| No OCR extraction | Features missing | Medium |
| No virus scanning | Security gap | High |
| No orphan cleanup | Disk waste | Low |
| No thumbnail generation | UX limitation | Low |

---

## 13. Example Flows

### Example: Merchant Uploads Lab Report

```
1. Merchant selects PDF file in frontend
   ↓
2. Frontend POST /documents
   Content-Type: multipart/form-data
   - file: lab_report.pdf
   - type: LAB_REPORT
   - productId: prod123
   ↓
3. Service validates:
   - PDF is allowed ✓
   - LAB_REPORT requires productId ✓
   - Product org matches user org ✓
   ↓
4. File saved: /app/uploads/abc123.pdf
   ↓
5. Metadata saved to MongoDB
   ↓
6. DOCUMENT_UPLOADED event emitted
   ↓
7. Response: 201 with document metadata
   ↓
8. Compliance Service receives event, queues evaluation
```

---

## 14. Integration Checklist

- [ ] `MONGO_URI` configured
- [ ] `KAFKA_BROKER` accessible
- [ ] `UPLOAD_DIR` exists and writable
- [ ] Volume mounted in Docker
- [ ] File size limits configured
- [ ] Product Service accessible for validation

---

*Document Version: 1.0*  
*Last Updated: January 2026*
