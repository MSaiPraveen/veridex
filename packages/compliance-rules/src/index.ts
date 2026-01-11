/**
 * @veridex/compliance-rules
 * 
 * Domain-driven compliance rule engine for product verification.
 * 
 * This package contains:
 * - Product category definitions (Cannabis, Hemp/CBD, Supplements, Pharma, Peptides)
 * - Compliance rule definitions (JSON Logic based)
 * - Rule evaluation engine
 * - Batch entity and compliance tracking
 * 
 * Key principles:
 * - Rules are DATA, not code
 * - Deterministic: Same inputs = Same result
 * - Explainable: Every decision traces to a rule
 * - Auditable: Full decision trail for every evaluation
 * 
 * @example
 * ```typescript
 * import {
 *   RuleRegistry,
 *   evaluateBatchCompliance,
 *   createEvaluationContext,
 *   ProductCategory,
 * } from '@veridex/compliance-rules';
 * 
 * // Get rules for a category
 * const rules = RuleRegistry.getRulesByCategory(ProductCategory.CANNABIS);
 * 
 * // Create evaluation context
 * const context = createEvaluationContext({
 *   product: { productId: '123', category: ProductCategory.CANNABIS },
 *   batch: { batchId: 'B001', batchNumber: 'BATCH-2024-001' },
 *   lab: { thcPercent: 15.5 },
 *   documents: { hasCOA: true, coaIssuedAt: Date.now() },
 * });
 * 
 * // Evaluate compliance
 * const result = evaluateBatchCompliance(rules, context);
 * console.log(result.overallStatus); // COMPLIANT, NON_COMPLIANT, etc.
 * ```
 */

// Types
export * from './types';

// Rules
export * from './rules';

// Engine
export * from './engine';
