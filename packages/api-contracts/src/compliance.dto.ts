export interface ComplianceCheckResponse {
  productId: string;
  status: 'COMPLIANT' | 'NON_COMPLIANT' | 'PENDING';
  score: number;
  violations: ComplianceViolation[];
}

export interface ComplianceViolation {
  ruleId: string;
  ruleName: string;
  severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
  description: string;
}

export interface ComplianceRuleResponse {
  id: string;
  name: string;
  category: string;
  severity: string;
  isActive: boolean;
}
