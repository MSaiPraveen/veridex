# Veridex Document Verification & Compliance Flow

## Architecture Overview

This document describes the production-grade document upload and compliance verification system for Veridex.

---

## 1️⃣ DOCUMENT UPLOAD FLOW

### End-to-End Flow

```
Merchant → Frontend → API Gateway → Document Service → Kafka → Compliance Service → Notification Service
                                              ↓
                                     File Storage (uploads/)
```

### Step-by-Step Process

1. **Merchant initiates upload** via Frontend
2. **API Gateway** (`POST /documents/upload`)
   - Verifies JWT token
   - Extracts user context (userId, organizationId, role)
   - Forwards multipart/form-data to Document Service
3. **Document Service** (`POST /documents`)
   - Validates MIME type against whitelist
   - Validates required metadata (productId for LAB_REPORT, COA)
   - Saves file to temp location
   - Verifies file content (magic bytes)
   - Checks file size limits
   - Creates document record
   - Starts async extraction

### Supported File Types

| MIME Type | Extensions | Category |
|-----------|------------|----------|
| application/pdf | .pdf | PDF |
| image/jpeg | .jpg, .jpeg | Image |
| image/png | .png | Image |
| image/tiff | .tiff, .tif | Image |
| image/bmp | .bmp | Image |
| image/webp | .webp | Image |

### File Size Limits

- **Minimum**: 1KB (reject empty/corrupt files)
- **Maximum PDF**: 50MB
- **Maximum Image**: 25MB

### Required Metadata by Document Type

| Document Type | Required Fields |
|---------------|-----------------|
| LAB_REPORT | productId, organizationId |
| COA | productId, organizationId |
| PRODUCT_PHOTO | productId, organizationId |
| BUSINESS_LICENSE | organizationId |
| INSURANCE | organizationId |
| Other types | organizationId |

---

## 2️⃣ DOCUMENT SCANNING & EXTRACTION

### Extraction Process

```
Document Created → Extraction Started → PDF/Image Analysis → Field Extraction → Compliance Ready
```

### Supported Extraction

| Document Type | Extracted Fields |
|---------------|------------------|
| BUSINESS_LICENSE | licenseNumber, issuedTo, issuedBy, validUntil |
| LAB_REPORT | thcContent, cbdContent, batchNumber, testResults |
| COA | thcContent, cbdContent, batchNumber, validUntil |
| INSURANCE | policyNumber, issuedTo, issuedBy, validUntil |

### Extraction Failure Handling

When extraction fails:
1. Document status set to `FAILED`
2. `failureReason` stored in document record
3. `DOCUMENT_EXTRACTION_FAILED` event emitted
4. Document **NOT** forwarded to compliance engine
5. Merchant notified of failure

---

## 3️⃣ AUTOMATED COMPLIANCE VERIFICATION

### Compliance Flow

```
DOCUMENT_COMPLIANCE_READY → Compliance Service → Rule Evaluation → Decision
                                                        ↓
                                    COMPLIANT → Admin Review Queue
                                    NON_COMPLIANT → Auto-Reject + Notify
```

### Compliance Outcomes

| Status | Action | Notification |
|--------|--------|--------------|
| COMPLIANT | Forward to Admin review | "Document Under Review" |
| NON_COMPLIANT | Auto-reject immediately | "Document Did Not Pass Compliance" |

### Rule Evaluation

Rules are evaluated based on:
- `validUntilRequired` - Document must have expiration date
- `minExpiryDays` - Minimum days until expiration
- `issuedToRequired` - Must have issuer information
- `requiredFields` - Specific fields must be present
- `forbiddenSubstances` - Certain substances not allowed
- `maxContaminantLevels` - Contaminant thresholds

---

## 4️⃣ ADMIN REVIEW ROLE

### Admin Capabilities

| Action | Description |
|--------|-------------|
| View review queue | List documents pending review |
| View document summary | See extracted fields (NOT raw file) |
| View compliance result | See automated evaluation |
| APPROVE | Approve document, update product compliance |
| REJECT | Reject with reason, notify merchant |
| FLAG | Flag for further investigation |

### Admin Restrictions

❌ Cannot modify extracted content
❌ Cannot override compliance without justification
❌ Cannot upload documents (merchant-only action)
❌ Cannot see raw file content directly

### When Admin Review is Required

- Document is COMPLIANT after automated check
- Extracted data needs verification
- Edge cases flagged by compliance rules

### When Admin Review is Skipped

- Document is NON_COMPLIANT (auto-rejected)
- Extraction failed (returned to merchant)
- Document has no productId (not in compliance flow)

---

## 5️⃣ REJECTION & ERROR HANDLING

### Rejection Reasons

| Code | Description | HTTP Status |
|------|-------------|-------------|
| UNSUPPORTED_FILE_TYPE | File type not in whitelist | 400 |
| FILE_TOO_LARGE | Exceeds size limit | 413 |
| FILE_TOO_SMALL | Likely empty/corrupt | 400 |
| CORRUPT_FILE | File integrity check failed | 400 |
| EMPTY_FILE | Zero-byte file | 400 |
| MIME_TYPE_MISMATCH | Content doesn't match extension | 400 |
| MISSING_PRODUCT_ID | Required for document type | 400 |
| MISSING_ORGANIZATION_ID | Always required | 400 |
| EXTRACTION_FAILED | Could not extract data | 422 |
| INVALID_DOCUMENT_CONTENT | Content validation failed | 422 |
| EXPIRED_DOCUMENT | Document is expired | 422 |
| COMPLIANCE_VIOLATION | Failed compliance rules | 422 |

### Error Handling Requirements

For EVERY rejection:
1. ✅ Clear error message returned to client
2. ✅ Audit entry logged
3. ✅ Failure event emitted (DOCUMENT_REJECTED)
4. ✅ Merchant notified via notification service

### No Silent Failures

- All errors return structured JSON responses
- All errors include error code and message
- No generic 500 errors for known failure modes
- All failures trigger notifications

---

## 6️⃣ API GATEWAY ROUTE VALIDATION

### Document Routes (Merchant)

| Method | Gateway Route | Service Route | Role | Validation |
|--------|---------------|---------------|------|------------|
| POST | /documents/upload | POST /documents | Merchant | JWT, multipart, MIME whitelist |
| GET | /documents | GET /documents | Merchant | JWT, query params |
| GET | /documents/:id | GET /documents/:id | Merchant | JWT, ObjectId |
| PUT | /documents/:id | PUT /documents/:id | Merchant | JWT, ObjectId, body schema |
| DELETE | /documents/:id | DELETE /documents/:id | Merchant | JWT, ObjectId |
| GET | /documents/:id/download | GET /documents/:id/download | Merchant | JWT, ObjectId |

### Admin Review Routes (Admin Only)

| Method | Gateway Route | Service Route | Role | Validation |
|--------|---------------|---------------|------|------------|
| GET | /admin/documents/review | GET /admin/review | Admin | JWT, role check |
| GET | /admin/documents/review/:id | GET /admin/review/:id | Admin | JWT, role check, ObjectId |
| POST | /admin/documents/review/:id/decision | POST /admin/review/:id/decision | Admin | JWT, role check, decision schema |
| POST | /admin/documents/:id/compliance-override | POST /admin/override/:id | Admin | JWT, role check, justification required |
| GET | /admin/documents/stats | GET /admin/stats | Admin | JWT, role check |
| GET | /admin/documents/rejected | GET /admin/rejected | Admin | JWT, role check |
| GET | /admin/documents/extraction-failures | GET /documents/extraction/failed | Admin | JWT, role check |
| POST | /admin/documents/:id/retry-extraction | POST /documents/:id/retry-extraction | Admin | JWT, role check, ObjectId |

### Compliance Routes

| Method | Gateway Route | Service Route | Role | Validation |
|--------|---------------|---------------|------|------------|
| GET | /compliance/rules | GET /rules | Admin | JWT, role check |
| POST | /compliance/rules | POST /rules | Admin | JWT, role check, schema |
| GET | /compliance/results | GET /results | Merchant/Admin | JWT |
| POST | /compliance/check | POST /check | Internal | JWT |

### Security Guarantees

✅ No direct service access (all through gateway)
✅ No route bypasses validation
✅ No admin routes exposed to merchants
✅ All routes require authentication
✅ Role-based access control enforced

---

## 7️⃣ EVENT-DRIVEN INTERACTIONS

### Document Events

| Event | Topic | Producer | Consumers | Payload |
|-------|-------|----------|-----------|---------|
| Document Uploaded | document.uploaded | Document Service | Audit | documentId, ownerId, type, fileName |
| Document Processed | document.processed | Document Service | Compliance | documentId, productId, extracted |
| Document Rejected | document.rejected | Document Service | Notification, Audit | documentId, ownerId, reason, details |
| Extraction Completed | document.extraction_completed | Document Service | - | documentId, extracted |
| Extraction Failed | document.extraction_failed | Document Service | Notification | documentId, reason |
| Compliance Ready | document.compliance.ready | Document Service | Compliance | documentId, productId, extracted |
| Admin Review Required | document.admin.review.required | Compliance Service | Notification | documentId, complianceScore |

### Compliance Events

| Event | Topic | Producer | Consumers | Payload |
|-------|-------|----------|-----------|---------|
| Compliance Result | compliance.result | Compliance Service | Notification, Product | productId, status, score |
| Auto Rejected | compliance.auto.rejected | Compliance Service | Notification, Audit | documentId, reasons, score |
| Violation | compliance.violation | Compliance Service | Notification, Audit | documentId, ruleCode, severity |

### Failure Handling

- All event consumers have error handling
- Failed messages logged with context
- No cross-service database access
- Events include all necessary data

---

## 8️⃣ SYSTEM WEAKNESSES FIXED

### Previous Issues

| Issue | Root Cause | Fix Applied |
|-------|------------|-------------|
| Accepts all file types | No MIME whitelist | Added `ALLOWED_MIME_TYPES` constant + validation |
| Intermittent upload failures | No file integrity checks | Added magic byte verification |
| Inconsistent content validation | Extension-only checks | Verify MIME type matches file content |
| Broken compliance flow | Missing productId | Enforce productId for compliance document types |
| No merchant notifications | Missing rejection events | Added `DOCUMENT_REJECTED` event + notification handlers |
| Missing admin review | No review routes | Added admin review routes + decision workflow |

### Validation Layers Added

1. **Gateway Level**: JWT verification, rate limiting, role checks
2. **Multipart Level**: File size limits, single file enforcement
3. **MIME Level**: Whitelist validation before processing
4. **Content Level**: Magic byte verification
5. **Metadata Level**: Required field validation
6. **Extraction Level**: Confidence score validation
7. **Compliance Level**: Rule-based evaluation

### Retry Strategies

- **Extraction Retry**: Admin can trigger retry for failed extractions
- **Event Retry**: Kafka consumer handles retries automatically
- **Notification Retry**: NotificationService has retry count per notification

---

## 9️⃣ FILES MODIFIED/CREATED

### New Files

1. `apps/document-service/src/validators/file.validator.ts` - File type validation
2. `apps/document-service/src/validators/upload.validator.ts` - Upload metadata validation
3. `apps/document-service/src/routes/admin-review.routes.ts` - Admin review routes
4. `apps/api-gateway/src/routes/admin-document-review.routes.ts` - Gateway admin routes
5. `docs/document-compliance-flow.md` - This documentation

### Modified Files

1. `apps/document-service/src/routes/document.routes.ts` - Added validation flow
2. `apps/document-service/src/services/document.service.ts` - Enhanced extraction flow
3. `apps/document-service/src/events/document.producer.ts` - Added rejection/compliance events
4. `apps/document-service/src/repositories/document.repo.ts` - Added stats methods
5. `apps/document-service/src/app.ts` - Registered admin routes
6. `apps/compliance-service/src/events/document.consumer.ts` - Enhanced event handling
7. `apps/compliance-service/src/events/compliance.producer.ts` - Added auto-reject events
8. `apps/notification-service/src/events/notification.consumer.ts` - Added rejection handlers
9. `apps/api-gateway/src/app.ts` - Registered admin review routes
10. `packages/event-contracts/src/topics.ts` - Added new event topics

---

## 10️⃣ TESTING CHECKLIST

### Upload Validation Tests

- [ ] Reject .exe file (unsupported type)
- [ ] Reject .pdf file with .jpg extension (MIME mismatch)
- [ ] Reject empty file (file too small)
- [ ] Reject file > 50MB (file too large)
- [ ] Reject LAB_REPORT without productId
- [ ] Accept valid PDF with correct metadata

### Extraction Tests

- [ ] PDF extraction produces expected fields
- [ ] Image extraction triggers OCR flow
- [ ] Failed extraction marks document correctly
- [ ] Retry extraction works for failed documents

### Compliance Tests

- [ ] Compliant document goes to admin queue
- [ ] Non-compliant document auto-rejected
- [ ] Merchant receives rejection notification
- [ ] Admin review decision updates status

### Admin Review Tests

- [ ] Only admins can access review routes
- [ ] Approve decision updates product compliance
- [ ] Reject decision notifies merchant
- [ ] Override requires justification
