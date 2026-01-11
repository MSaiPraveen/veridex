import { z } from 'zod';

export const LabReportSchema = z.object({
  issuedTo: z.string(),
  validUntil: z.date(),
  labName: z.string(),
});

export type LabReport = z.infer<typeof LabReportSchema>;
