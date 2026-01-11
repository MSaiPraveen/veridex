import { z } from 'zod';

export const InsuranceSchema = z.object({
  policyNumber: z.string(),
  provider: z.string(),
  insuredEntity: z.string(),
  coverageAmount: z.number(),
  validFrom: z.date(),
  validUntil: z.date(),
  type: z.enum(['LIABILITY', 'PRODUCT', 'CARGO', 'GENERAL']),
});

export type Insurance = z.infer<typeof InsuranceSchema>;
