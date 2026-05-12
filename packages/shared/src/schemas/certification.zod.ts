import { z } from 'zod';

/**
 * Runtime schema for Certification. Mirrors `Certification` in `../types.ts`
 * and the Mongoose certification subdocument in database.md.
 */
export const CertificationSchema = z
  .object({
    name: z.string().min(1).max(120),
    issuer: z.string().min(1).max(200),
    issueDate: z.coerce.date(),
    expiryDate: z.coerce.date().optional(),
    documentUrl: z.string().url().optional(),
  })
  .refine((cert) => !cert.expiryDate || cert.expiryDate >= cert.issueDate, {
    message: 'expiryDate must be on or after issueDate',
    path: ['expiryDate'],
  });

export type CertificationInput = z.input<typeof CertificationSchema>;
export type CertificationParsed = z.output<typeof CertificationSchema>;
