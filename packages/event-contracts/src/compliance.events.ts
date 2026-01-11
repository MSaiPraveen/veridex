export interface ComplianceResultEvent {
  productId: string;
  status: 'COMPLIANT' | 'NON_COMPLIANT';
}
