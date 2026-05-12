import { z } from 'zod';

export const CreateCertificationDtoSchema = z
  .object({
    name: z.string().min(1).max(100),
    issuer: z.string().min(1).max(200),
    issueDate: z.coerce.date(),
    expiryDate: z.coerce.date().optional(),
    documentUrl: z.string().url().max(500).optional(),
  })
  .refine((c) => !c.expiryDate || c.expiryDate >= c.issueDate, {
    message: 'expiryDate must be on or after issueDate',
    path: ['expiryDate'],
  });
export type CreateCertificationDto = z.infer<typeof CreateCertificationDtoSchema>;

export const UpdateCertificationDtoSchema = z
  .object({
    name: z.string().min(1).max(100).optional(),
    issuer: z.string().min(1).max(200).optional(),
    issueDate: z.coerce.date().optional(),
    expiryDate: z.coerce.date().optional(),
    documentUrl: z.string().url().max(500).optional(),
  })
  .refine((c) => !(c.issueDate && c.expiryDate) || c.expiryDate >= c.issueDate, {
    message: 'expiryDate must be on or after issueDate',
    path: ['expiryDate'],
  });
export type UpdateCertificationDto = z.infer<typeof UpdateCertificationDtoSchema>;
