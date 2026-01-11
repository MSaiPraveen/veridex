import { LabReportSchema } from '../documents/lab-report.schema';
import { LicenseSchema } from '../documents/license.schema';
import { InsuranceSchema } from '../documents/insurance.schema';

export function generateValidLabReport() {
  return LabReportSchema.parse({
    issuedTo: 'Sample Merchant LLC',
    validUntil: new Date(Date.now() + 86400000),
    labName: 'Acme Labs',
  });
}

export function generateValidLicense() {
  return LicenseSchema.parse({
    licenseNumber: 'LIC-' + Math.random().toString(36).substring(2, 10).toUpperCase(),
    issuedTo: 'Sample Merchant LLC',
    issuedBy: 'State Regulatory Authority',
    validFrom: new Date(),
    validUntil: new Date(Date.now() + 365 * 86400000),
    type: 'BUSINESS',
  });
}

export function generateValidInsurance() {
  return InsuranceSchema.parse({
    policyNumber: 'POL-' + Math.random().toString(36).substring(2, 10).toUpperCase(),
    provider: 'Acme Insurance Co.',
    insuredEntity: 'Sample Merchant LLC',
    coverageAmount: 1000000,
    validFrom: new Date(),
    validUntil: new Date(Date.now() + 365 * 86400000),
    type: 'LIABILITY',
  });
}
