import { z } from 'zod';

export const LicenseSchema = z.object({
  licenseNumber: z.string(),
  issuedTo: z.string(),
  issuedBy: z.string(),
  validFrom: z.date(),
  validUntil: z.date(),
  type: z.enum(['BUSINESS', 'IMPORT', 'EXPORT', 'MANUFACTURING']),
});

export type License = z.infer<typeof LicenseSchema>;
