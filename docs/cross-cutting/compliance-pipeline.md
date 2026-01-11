# 📘 Compliance Evaluation Pipeline — Veridex

**Type:** Cross-Cutting Function  
**Primary Service:** Compliance Service  
**Supporting Services:** Product, Document, Notification

---

## 1. Purpose & Scope

### What This Pipeline Does

The Compliance Evaluation Pipeline is the **core business workflow** that:

- Evaluates products against regulatory rules
- Determines compliance status
- Triggers admin review when needed
- Notifies merchants of results

### Pipeline Triggers

| Trigger | Source | Action |
|---------|--------|--------|
| Product created | Product Service | Initial evaluation |
| Document uploaded | Document Service | Re-evaluation |
| Document processed | Document Service | Full evaluation |
| Manual request | Admin | Force re-evaluation |
| Batch job | Scheduler | Bulk re-evaluation |

---

## 2. Pipeline Stages

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   Trigger   │────▶│   Collect   │────▶│  Evaluate   │
│   Event     │     │   Data      │     │   Rules     │
└─────────────┘     └─────────────┘     └─────────────┘
                                              │
                    ┌─────────────────────────┤
                    ▼                         ▼
             ┌─────────────┐          ┌─────────────┐
             │   Update    │          │   Notify    │
             │   Product   │          │   Parties   │
             └─────────────┘          └─────────────┘
```

---

## 3. Stage 1: Trigger Event

### Event Types

```typescript
// Product created - initial check
{
  type: 'product.created',
  payload: { productId, organizationId, category }
}

// Document uploaded - re-check
{
  type: 'document.uploaded',
  payload: { documentId, productId, type }
}

// Document processed - data available
{
  type: 'document.processed',
  payload: { documentId, extractedData }
}
```

### Consumer Handling

```typescript
// Compliance Service consumer
async function handleEvent(topic, event) {
  switch (topic) {
    case Topics.PRODUCT_CREATED:
      await queueEvaluation(event.payload.productId, 'initial');
      break;
    case Topics.DOCUMENT_UPLOADED:
      await queueEvaluation(event.payload.productId, 're-evaluation');
      break;
    case Topics.DOCUMENT_PROCESSED:
      await queueEvaluation(event.payload.productId, 'full');
      break;
  }
}
```

---

## 4. Stage 2: Collect Data

### Data Requirements

| Data | Source | Fetch Method |
|------|--------|--------------|
| Product details | Product Service | `GET /products/:id` |
| Product documents | Document Service | `GET /documents/product/:productId` |
| Applicable rules | Local DB | Query by category/jurisdiction |

### Collection Logic

```typescript
async function collectData(productId: string) {
  const [product, documents, rules] = await Promise.all([
    productService.getProduct(productId),
    documentService.getProductDocuments(productId),
    ruleRepo.findApplicableRules({
      category: product.category,
      jurisdiction: product.jurisdiction || 'FEDERAL',
      status: 'ACTIVE',
    }),
  ]);
  
  return { product, documents, rules };
}
```

---

## 5. Stage 3: Evaluate Rules

### Rule Types

| Type | Description | Example |
|------|-------------|---------|
| `DOCUMENT_REQUIRED` | Must have specific doc | COA required |
| `THRESHOLD` | Value must be in range | THC < 0.3% |
| `EXPIRATION` | Doc must not be expired | License valid |
| `CUSTOM` | Scripted evaluation | Complex logic |

### Evaluation Engine

```typescript
async function evaluateRules(context: EvaluationContext) {
  const results: RuleResult[] = [];
  
  for (const rule of context.rules) {
    const result = await evaluateRule(rule, context);
    results.push({
      ruleId: rule._id,
      ruleName: rule.name,
      passed: result.passed,
      severity: rule.severity,
      message: result.message,
      evaluatedAt: new Date(),
    });
  }
  
  return results;
}

function evaluateRule(rule: Rule, context: EvaluationContext): RuleResult {
  switch (rule.type) {
    case 'DOCUMENT_REQUIRED':
      return checkDocumentExists(rule.conditions.documentType, context.documents);
      
    case 'THRESHOLD':
      return checkThreshold(rule.conditions, context.product);
      
    case 'EXPIRATION':
      return checkExpiration(rule.conditions.documentType, context.documents);
      
    case 'CUSTOM':
      return runCustomEvaluator(rule.conditions.script, context);
  }
}
```

### Aggregating Results

```typescript
function aggregateStatus(results: RuleResult[]): ComplianceStatus {
  // Any CRITICAL failure = NON_COMPLIANT
  if (results.some(r => !r.passed && r.severity === 'CRITICAL')) {
    return 'NON_COMPLIANT';
  }
  
  // Missing required documents = PENDING
  if (results.some(r => !r.passed && r.severity === 'HIGH')) {
    return 'PENDING';
  }
  
  // All passed = COMPLIANT
  if (results.every(r => r.passed)) {
    return 'COMPLIANT';
  }
  
  // Some warnings but passable
  return 'REQUIRES_REVIEW';
}
```

---

## 6. Stage 4: Store Results

### Result Schema

```typescript
interface ComplianceResult {
  _id: ObjectId;
  productId: ObjectId;
  status: ComplianceStatus;
  results: RuleResult[];
  evaluatedAt: Date;
  evaluatedBy: 'SYSTEM' | 'ADMIN';
  version: number;  // Increments on re-evaluation
}
```

### Persistence

```typescript
async function storeResults(productId: string, status: string, results: RuleResult[]) {
  // Create new result record
  const result = await ComplianceResultRepo.create({
    productId,
    status,
    results,
    evaluatedAt: new Date(),
    evaluatedBy: 'SYSTEM',
    version: await getNextVersion(productId),
  });
  
  // Emit event for downstream updates
  await emit(Topics.COMPLIANCE_CHECK_COMPLETED, {
    productId,
    status,
    results: results.map(r => ({ ruleId: r.ruleId, passed: r.passed })),
    evaluatedAt: result.evaluatedAt,
  });
  
  return result;
}
```

---

## 7. Stage 5: Update Product

### Event-Driven Update

```typescript
// Product Service consumer
async function handleComplianceCompleted(event) {
  const { productId, status } = event.payload;
  
  await ProductRepo.update(productId, {
    complianceStatus: status,
    lastComplianceCheck: event.payload.evaluatedAt,
  });
  
  // Emit status change if different
  await emit(Topics.PRODUCT_COMPLIANCE_CHANGED, {
    productId,
    newStatus: status,
  });
}
```

---

## 8. Stage 6: Notify Parties

### Notification Triggers

| Status | Notification |
|--------|--------------|
| COMPLIANT | "Your product passed compliance" |
| NON_COMPLIANT | "Action required: Compliance issues" |
| REQUIRES_REVIEW | "Admin reviewing your submission" |

### Notification Event

```typescript
// Notification Service consumer
async function handleComplianceChanged(event) {
  const { productId, newStatus } = event.payload;
  
  // Get product and owner info
  const product = await productService.getProduct(productId);
  
  // Create in-app notification
  await NotificationRepo.create({
    userId: product.merchantId,
    type: 'COMPLIANCE_STATUS_CHANGED',
    title: getTitle(newStatus),
    message: getMessage(newStatus, product),
    data: { productId, status: newStatus },
  });
  
  // Send email if preference allows
  if (await shouldSendEmail(product.merchantId, 'compliance')) {
    await sendComplianceEmail(product.merchantId, product, newStatus);
  }
}
```

---

## 9. Admin Review Queue

### When Admin Review Triggered

| Condition | Trigger |
|-----------|---------|
| Status = REQUIRES_REVIEW | Auto-queued |
| Document flagged | Manual queue |
| Violation severity = CRITICAL | Admin alert |

### Workflow States

```
PENDING_REVIEW → IN_REVIEW → APPROVED/REJECTED
```

### Admin Actions

```typescript
// Approve
async function approveCompliance(workflowId, adminId) {
  const workflow = await WorkflowRepo.update(workflowId, {
    status: 'APPROVED',
    resolvedBy: adminId,
    resolvedAt: new Date(),
  });
  
  // Update product status
  await emit(Topics.COMPLIANCE_CHECK_COMPLETED, {
    productId: workflow.productId,
    status: 'COMPLIANT',
    evaluatedBy: 'ADMIN',
  });
}

// Reject
async function rejectCompliance(workflowId, adminId, reason) {
  const workflow = await WorkflowRepo.update(workflowId, {
    status: 'REJECTED',
    rejectionReason: reason,
    resolvedBy: adminId,
    resolvedAt: new Date(),
  });
  
  await emit(Topics.COMPLIANCE_CHECK_COMPLETED, {
    productId: workflow.productId,
    status: 'NON_COMPLIANT',
    evaluatedBy: 'ADMIN',
  });
}
```

---

## 10. Known Issues

| Issue | Impact | Priority |
|-------|--------|----------|
| No retry on service failure | Stuck evaluations | High |
| Sync service calls | Latency | Medium |
| No batch priority queue | Large jobs slow | Medium |
| No rule versioning | Historical mismatch | Low |

---

## 11. Observability

### Key Metrics

- `compliance_evaluation_duration_seconds`
- `compliance_evaluation_total{status}`
- `compliance_queue_depth`
- `compliance_rule_failure_total{rule_id}`

### Logs

```
[COMPLIANCE] Starting evaluation for product={productId}
[COMPLIANCE] Collected {n} documents, {m} rules
[COMPLIANCE] Rule {ruleId} passed={true/false}
[COMPLIANCE] Final status={status}
```

---

*Document Version: 1.0*  
*Last Updated: January 2026*
