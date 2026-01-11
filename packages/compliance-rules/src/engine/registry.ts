/**
 * Rule Registry
 * 
 * Manages loading, caching, and retrieval of compliance rules.
 * Rules are loaded by category and can be filtered by jurisdiction.
 * 
 * This is the single source of truth for all compliance rules.
 * All rule retrieval should go through this registry.
 */

import { ComplianceRule } from '../types/rule-schema';
import { ProductCategory, RuleStatus, Jurisdiction } from '../types/categories';
import { CANNABIS_RULES } from '../rules/cannabis.rules';
import { HEMP_CBD_RULES } from '../rules/hemp-cbd.rules';
import { SUPPLEMENT_RULES } from '../rules/supplement.rules';
import { PHARMA_RULES } from '../rules/pharma.rules';
import { PEPTIDE_RULES } from '../rules/peptide.rules';

/**
 * All rules indexed by category
 */
const RULES_BY_CATEGORY: Record<ProductCategory, ComplianceRule[]> = {
  [ProductCategory.CANNABIS]: CANNABIS_RULES,
  [ProductCategory.HEMP_CBD]: HEMP_CBD_RULES,
  [ProductCategory.SUPPLEMENT]: SUPPLEMENT_RULES,
  [ProductCategory.PHARMA]: PHARMA_RULES,
  [ProductCategory.PEPTIDE]: PEPTIDE_RULES,
};

/**
 * All rules flattened into a single array
 */
const ALL_RULES: ComplianceRule[] = [
  ...CANNABIS_RULES,
  ...HEMP_CBD_RULES,
  ...SUPPLEMENT_RULES,
  ...PHARMA_RULES,
  ...PEPTIDE_RULES,
];

/**
 * Rules indexed by ruleId for fast lookup
 */
const RULES_BY_ID: Map<string, ComplianceRule> = new Map(
  ALL_RULES.map((rule) => [rule.ruleId, rule]),
);

/**
 * Get all rules for a specific product category
 * Optionally filter by status (default: ACTIVE only)
 */
export function getRulesByCategory(
  category: ProductCategory,
  options: {
    status?: RuleStatus[];
    jurisdiction?: Jurisdiction;
  } = {},
): ComplianceRule[] {
  const { status = [RuleStatus.ACTIVE], jurisdiction } = options;

  let rules = RULES_BY_CATEGORY[category] || [];

  // Filter by status
  if (status.length > 0) {
    rules = rules.filter((rule) => status.includes(rule.status));
  }

  // Filter by jurisdiction
  if (jurisdiction) {
    rules = rules.filter(
      (rule) =>
        !rule.metadata.jurisdiction || rule.metadata.jurisdiction === jurisdiction,
    );
  }

  return rules;
}

/**
 * Get a specific rule by ID
 */
export function getRuleById(ruleId: string): ComplianceRule | undefined {
  return RULES_BY_ID.get(ruleId);
}

/**
 * Get all rules (across all categories)
 * Optionally filter by status
 */
export function getAllRules(options: { status?: RuleStatus[] } = {}): ComplianceRule[] {
  const { status = [RuleStatus.ACTIVE] } = options;

  if (status.length === 0) {
    return ALL_RULES;
  }

  return ALL_RULES.filter((rule) => status.includes(rule.status));
}

/**
 * Get rule statistics
 */
export function getRuleStatistics(): {
  totalRules: number;
  byCategory: Record<ProductCategory, number>;
  byStatus: Record<RuleStatus, number>;
  bySeverity: { blocker: number; warning: number };
  byJurisdiction: Record<string, number>;
} {
  const byCategory: Record<ProductCategory, number> = {
    [ProductCategory.CANNABIS]: 0,
    [ProductCategory.HEMP_CBD]: 0,
    [ProductCategory.SUPPLEMENT]: 0,
    [ProductCategory.PHARMA]: 0,
    [ProductCategory.PEPTIDE]: 0,
  };

  const byStatus: Record<RuleStatus, number> = {
    [RuleStatus.ACTIVE]: 0,
    [RuleStatus.INACTIVE]: 0,
    [RuleStatus.DRAFT]: 0,
  };

  const bySeverity = { blocker: 0, warning: 0 };
  const byJurisdiction: Record<string, number> = {};

  for (const rule of ALL_RULES) {
    const ruleCategory = rule.category as ProductCategory;
    const ruleStatus = rule.status as RuleStatus;
    byCategory[ruleCategory]++;
    byStatus[ruleStatus]++;

    if (rule.severity === 'BLOCKER') {
      bySeverity.blocker++;
    } else {
      bySeverity.warning++;
    }

    const jurisdiction = rule.metadata.jurisdiction || 'UNSPECIFIED';
    byJurisdiction[jurisdiction] = (byJurisdiction[jurisdiction] || 0) + 1;
  }

  return {
    totalRules: ALL_RULES.length,
    byCategory,
    byStatus,
    bySeverity,
    byJurisdiction,
  };
}

/**
 * Search rules by keyword (searches description and message)
 */
export function searchRules(keyword: string): ComplianceRule[] {
  const lowerKeyword = keyword.toLowerCase();

  return ALL_RULES.filter(
    (rule) =>
      rule.description.toLowerCase().includes(lowerKeyword) ||
      rule.failure.message.toLowerCase().includes(lowerKeyword) ||
      rule.ruleId.toLowerCase().includes(lowerKeyword),
  );
}

/**
 * Get rules that match a specific reason code
 */
export function getRulesByReasonCode(reasonCode: string): ComplianceRule[] {
  return ALL_RULES.filter((rule) => rule.failure.reasonCode === reasonCode);
}

/**
 * Validate that all rules have unique IDs
 * This is a sanity check for development
 */
export function validateRuleUniqueness(): {
  valid: boolean;
  duplicates: string[];
} {
  const seenIds = new Set<string>();
  const duplicates: string[] = [];

  for (const rule of ALL_RULES) {
    if (seenIds.has(rule.ruleId)) {
      duplicates.push(rule.ruleId);
    } else {
      seenIds.add(rule.ruleId);
    }
  }

  return {
    valid: duplicates.length === 0,
    duplicates,
  };
}

/**
 * Get a summary of required documents by category
 */
export function getRequiredDocuments(category: ProductCategory): string[] {
  const rules = getRulesByCategory(category);
  const documentRules = rules.filter(
    (rule) =>
      rule.failure.reasonCode.startsWith('MISSING_') &&
      rule.severity === 'BLOCKER',
  );

  // Extract document types from reason codes
  return documentRules.map((rule) =>
    rule.failure.reasonCode.replace('MISSING_', '').replace(/_/g, ' '),
  );
}

/**
 * Export the registry
 */
export const RuleRegistry = {
  getRulesByCategory,
  getRuleById,
  getAllRules,
  getRuleStatistics,
  searchRules,
  getRulesByReasonCode,
  validateRuleUniqueness,
  getRequiredDocuments,
};

export default RuleRegistry;
