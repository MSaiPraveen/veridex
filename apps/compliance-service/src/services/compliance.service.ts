import { RuleRepo, RuleQueryOptions, PaginatedRules } from '../repositories/rule.repo';
import { ResultRepo, ResultQueryOptions, PaginatedResults, ComplianceStats } from '../repositories/result.repo';
import { evaluateRules, ExtractedData, EvaluationResult } from '../engine/rule-engine';
import { emitComplianceResult } from '../events/compliance.producer';
import { IComplianceRule, LeanComplianceRule, IComplianceRuleBase } from '../domain/compliance-rule.entity';
import { IComplianceResult, LeanComplianceResult, IComplianceResultBase } from '../domain/compliance-result.entity';
import { NotFoundError, ValidationError, ConflictError, ComplianceEvaluationError } from '../errors/service.errors';
import { Types } from 'mongoose';

type RuleResult = IComplianceRule | LeanComplianceRule;
type ResultResult = IComplianceResult | LeanComplianceResult;

// =====================
// Rule Management
// =====================

export async function createRule(data: Partial<IComplianceRuleBase>): Promise<RuleResult> {
  // Check for duplicate code
  const existing = await RuleRepo.findByCode(data.code as string);
  if (existing) {
    throw new ConflictError(`Rule with code '${data.code}' already exists`);
  }

  return RuleRepo.create({
    ...data,
    effectiveFrom: data.effectiveFrom || new Date(),
  } as unknown as Partial<IComplianceRuleBase>);
}

export async function getRuleById(id: string): Promise<RuleResult> {
  const rule = await RuleRepo.findById(id);
  if (!rule) {
    throw new NotFoundError('Compliance rule', id);
  }
  return rule;
}

export async function getRuleByCode(code: string): Promise<RuleResult> {
  const rule = await RuleRepo.findByCode(code);
  if (!rule) {
    throw new NotFoundError('Compliance rule', code);
  }
  return rule;
}

export async function listRules(options: RuleQueryOptions): Promise<PaginatedRules> {
  return RuleRepo.findAll(options);
}

export async function updateRule(id: string, data: Partial<IComplianceRuleBase>): Promise<RuleResult> {
  const existing = await RuleRepo.findById(id);
  if (!existing) {
    throw new NotFoundError('Compliance rule', id);
  }

  const updated = await RuleRepo.update(id, data);
  if (!updated) {
    throw new NotFoundError('Compliance rule', id);
  }
  return updated;
}

export async function deleteRule(id: string): Promise<void> {
  const deleted = await RuleRepo.delete(id);
  if (!deleted) {
    throw new NotFoundError('Compliance rule', id);
  }
}

export async function activateRule(id: string): Promise<RuleResult> {
  const rule = await RuleRepo.activate(id);
  if (!rule) {
    throw new NotFoundError('Compliance rule', id);
  }
  return rule;
}

export async function deactivateRule(id: string): Promise<RuleResult> {
  const rule = await RuleRepo.deactivate(id);
  if (!rule) {
    throw new NotFoundError('Compliance rule', id);
  }
  return rule;
}

export async function createRuleVersion(id: string): Promise<RuleResult> {
  const rule = await RuleRepo.createNewVersion(id);
  if (!rule) {
    throw new NotFoundError('Compliance rule', id);
  }
  return rule;
}

// =====================
// Compliance Evaluation
// =====================

export interface ComplianceCheckInput {
  productId: string;
  documentId?: string;
  documentType: string;
  extracted: ExtractedData;
  organizationId?: string;
}

export async function evaluateCompliance(input: ComplianceCheckInput): Promise<ResultResult> {
  const { productId, documentId, documentType, extracted, organizationId } = input;

  try {
    // Get active rules for the document type
    const rules = await RuleRepo.findActiveRules(documentType, organizationId);

    if (rules.length === 0) {
      // No rules defined - consider compliant by default
      const result = await ResultRepo.append({
        productId: new Types.ObjectId(productId) as unknown as Types.ObjectId,
        documentId: documentId ? new Types.ObjectId(documentId) as unknown as Types.ObjectId : undefined,
        organizationId: organizationId ? new Types.ObjectId(organizationId) as unknown as Types.ObjectId : undefined,
        status: 'COMPLIANT',
        overallScore: 100,
        ruleVersion: 0,
        evaluations: [],
        reasons: [],
        summary: 'No compliance rules defined for this document type.',
      } as unknown as Partial<IComplianceResultBase>);

      await emitComplianceResult({
        productId,
        documentId,
        status: 'COMPLIANT',
        score: 100,
      });

      return result;
    }

    // Evaluate all rules
    const evaluation = evaluateRules(rules, extracted);

    // Store the result
    const result = await ResultRepo.append({
      productId: new Types.ObjectId(productId) as unknown as Types.ObjectId,
      documentId: documentId ? new Types.ObjectId(documentId) as unknown as Types.ObjectId : undefined,
      organizationId: organizationId ? new Types.ObjectId(organizationId) as unknown as Types.ObjectId : undefined,
      status: evaluation.status,
      overallScore: evaluation.overallScore,
      ruleVersion: rules[0]?.version ?? 1,
      evaluations: evaluation.evaluations,
      reasons: evaluation.reasons,
      summary: evaluation.summary,
    } as unknown as Partial<IComplianceResultBase>);

    // Emit event
    await emitComplianceResult({
      productId,
      documentId,
      status: evaluation.status,
      score: evaluation.overallScore,
      failedRules: evaluation.evaluations
        .filter((e) => !e.passed)
        .map((e) => e.ruleCode),
    });

    return result;
  } catch (error) {
    // Log error and create error result
    console.error('Compliance evaluation failed:', error);

    const errorResult = await ResultRepo.append({
      productId: new Types.ObjectId(productId) as unknown as Types.ObjectId,
      documentId: documentId ? new Types.ObjectId(documentId) as unknown as Types.ObjectId : undefined,
      organizationId: organizationId ? new Types.ObjectId(organizationId) as unknown as Types.ObjectId : undefined,
      status: 'ERROR',
      overallScore: 0,
      ruleVersion: 0,
      evaluations: [],
      reasons: [`Evaluation failed: ${(error as Error).message}`],
      summary: 'Compliance evaluation encountered an error.',
    } as unknown as Partial<IComplianceResultBase>);

    await emitComplianceResult({
      productId,
      documentId,
      status: 'ERROR',
      score: 0,
      error: (error as Error).message,
    });

    return errorResult;
  }
}

export async function batchEvaluateCompliance(
  checks: ComplianceCheckInput[]
): Promise<ResultResult[]> {
  const results: ResultResult[] = [];
  
  for (const check of checks) {
    const result = await evaluateCompliance(check);
    results.push(result);
  }
  
  return results;
}

// =====================
// Result Management
// =====================

export async function getResultById(id: string): Promise<ResultResult> {
  const result = await ResultRepo.findById(id);
  if (!result) {
    throw new NotFoundError('Compliance result', id);
  }
  return result;
}

export async function getResultsByProductId(productId: string): Promise<LeanComplianceResult[]> {
  return ResultRepo.findByProductId(productId);
}

export async function getLatestResultByProductId(productId: string): Promise<ResultResult> {
  const result = await ResultRepo.findLatestByProductId(productId);
  if (!result) {
    throw new NotFoundError('Compliance result for product', productId);
  }
  return result;
}

export async function listResults(options: ResultQueryOptions): Promise<PaginatedResults> {
  return ResultRepo.findAll(options);
}

export async function deleteResult(id: string): Promise<void> {
  const deleted = await ResultRepo.delete(id);
  if (!deleted) {
    throw new NotFoundError('Compliance result', id);
  }
}

export async function deleteResultsByProductId(productId: string): Promise<number> {
  return ResultRepo.deleteByProductId(productId);
}

// =====================
// Statistics & Analytics
// =====================

export async function getComplianceStats(organizationId?: string): Promise<ComplianceStats> {
  return ResultRepo.getStats(organizationId);
}

export async function getProductComplianceStats(productId: string): Promise<{
  total: number;
  latest: LeanComplianceResult | null;
  history: { date: Date; status: string }[];
}> {
  return ResultRepo.getStatsByProduct(productId);
}

export async function getComplianceTrend(
  organizationId?: string,
  days = 30
): Promise<{ date: string; compliant: number; nonCompliant: number }[]> {
  return ResultRepo.getTrendData(organizationId, days);
}

export async function getRuleStats(): Promise<{
  byCategory: { _id: string; count: number }[];
  bySeverity: { _id: string; count: number }[];
}> {
  const [byCategory, bySeverity] = await Promise.all([
    RuleRepo.countByCategory(),
    RuleRepo.countBySeverity(),
  ]);
  return { byCategory, bySeverity };
}
