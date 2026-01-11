import { LeanComplianceRule, IRuleConditions } from '../domain/compliance-rule.entity';
import { IRuleEvaluation } from '../domain/compliance-result.entity';
import { Types } from 'mongoose';

export interface ExtractedData {
  validUntil?: string | Date;
  issuedTo?: string;
  issuedBy?: string;
  certificationBody?: string;
  labAccreditation?: string;
  substances?: Record<string, number>;
  contaminants?: Record<string, number>;
  fields?: Record<string, unknown>;
  [key: string]: unknown;
}

export interface EvaluationResult {
  status: 'COMPLIANT' | 'NON_COMPLIANT';
  overallScore: number;
  evaluations: IRuleEvaluation[];
  reasons: string[];
  summary: string;
}

function evaluateConditions(
  conditions: IRuleConditions,
  extracted: ExtractedData,
  rule: LeanComplianceRule
): { passed: boolean; message?: string; details?: Record<string, unknown> } {
  // Check validUntilRequired
  if (conditions.validUntilRequired) {
    if (!extracted.validUntil) {
      return {
        passed: false,
        message: 'Missing required validity date',
        details: { field: 'validUntil' },
      };
    }
    const validUntilDate = new Date(extracted.validUntil);
    if (validUntilDate < new Date()) {
      return {
        passed: false,
        message: 'Document has expired',
        details: { validUntil: extracted.validUntil },
      };
    }
  }

  // Check minExpiryDays
  if (conditions.minExpiryDays && extracted.validUntil) {
    const validUntilDate = new Date(extracted.validUntil);
    const daysUntilExpiry = Math.ceil(
      (validUntilDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24)
    );
    if (daysUntilExpiry < conditions.minExpiryDays) {
      return {
        passed: false,
        message: `Document expires in ${daysUntilExpiry} days (minimum required: ${conditions.minExpiryDays})`,
        details: { daysUntilExpiry, minRequired: conditions.minExpiryDays },
      };
    }
  }

  // Check issuedToRequired
  if (conditions.issuedToRequired && !extracted.issuedTo) {
    return {
      passed: false,
      message: 'Missing required issued to field',
      details: { field: 'issuedTo' },
    };
  }

  // Check certificationBodyRequired
  if (conditions.certificationBodyRequired && !extracted.certificationBody) {
    return {
      passed: false,
      message: 'Missing required certification body',
      details: { field: 'certificationBody' },
    };
  }

  // Check labAccreditationRequired
  if (conditions.labAccreditationRequired && !extracted.labAccreditation) {
    return {
      passed: false,
      message: 'Missing required lab accreditation',
      details: { field: 'labAccreditation' },
    };
  }

  // Check requiredFields
  if (conditions.requiredFields && conditions.requiredFields.length > 0) {
    const fields = extracted.fields || extracted;
    for (const field of conditions.requiredFields) {
      if (fields[field] === undefined || fields[field] === null || fields[field] === '') {
        return {
          passed: false,
          message: `Missing required field: ${field}`,
          details: { field, requiredFields: conditions.requiredFields },
        };
      }
    }
  }

  // Check forbiddenSubstances
  if (conditions.forbiddenSubstances && conditions.forbiddenSubstances.length > 0) {
    const substances = extracted.substances || {};
    for (const substance of conditions.forbiddenSubstances) {
      if (substances[substance] !== undefined && substances[substance] > 0) {
        return {
          passed: false,
          message: `Forbidden substance detected: ${substance}`,
          details: { substance, level: substances[substance] },
        };
      }
    }
  }

  // Check maxContaminantLevels
  if (conditions.maxContaminantLevels) {
    const contaminants = extracted.contaminants || {};
    for (const [contaminant, maxLevel] of Object.entries(conditions.maxContaminantLevels)) {
      const actualLevel = contaminants[contaminant];
      if (actualLevel !== undefined && actualLevel > maxLevel) {
        return {
          passed: false,
          message: `Contaminant level exceeded for ${contaminant}: ${actualLevel} > ${maxLevel}`,
          details: { contaminant, actualLevel, maxLevel },
        };
      }
    }
  }

  return { passed: true };
}

export function evaluateRules(
  rules: LeanComplianceRule[],
  extracted: ExtractedData
): EvaluationResult {
  const evaluations: IRuleEvaluation[] = [];
  const reasons: string[] = [];
  let criticalFail = false;
  let majorFail = false;

  for (const rule of rules) {
    const result = evaluateConditions(rule.conditions, extracted, rule);

    const evaluation: IRuleEvaluation = {
      ruleId: rule._id as Types.ObjectId,
      ruleCode: rule.code,
      ruleName: rule.name,
      passed: result.passed,
      severity: rule.severity,
      message: result.passed ? undefined : (result.message || rule.errorMessage),
      details: result.details,
    };

    evaluations.push(evaluation);

    if (!result.passed) {
      reasons.push(`[${rule.severity}] ${rule.code}: ${result.message || rule.errorMessage}`);
      
      if (rule.severity === 'CRITICAL') criticalFail = true;
      if (rule.severity === 'MAJOR') majorFail = true;
    }
  }

  // Calculate overall score
  const totalRules = rules.length;
  const passedRules = evaluations.filter((e) => e.passed).length;
  const overallScore = totalRules > 0 ? Math.round((passedRules / totalRules) * 100) : 100;

  // Determine status
  const status: 'COMPLIANT' | 'NON_COMPLIANT' = 
    criticalFail || majorFail ? 'NON_COMPLIANT' : 'COMPLIANT';

  // Generate summary
  let summary: string;
  if (status === 'COMPLIANT') {
    summary = `All ${totalRules} compliance rules passed successfully.`;
  } else {
    const failedCount = evaluations.filter((e) => !e.passed).length;
    summary = `${failedCount} of ${totalRules} rules failed. ${criticalFail ? 'Critical issues found.' : majorFail ? 'Major issues found.' : ''}`;
  }

  return {
    status,
    overallScore,
    evaluations,
    reasons,
    summary,
  };
}

export function evaluateRulesLegacy(
  rules: LeanComplianceRule[],
  extracted: ExtractedData
): { status: 'COMPLIANT' | 'NON_COMPLIANT'; reasons: string[] } {
  const result = evaluateRules(rules, extracted);
  return {
    status: result.status,
    reasons: result.reasons,
  };
}
