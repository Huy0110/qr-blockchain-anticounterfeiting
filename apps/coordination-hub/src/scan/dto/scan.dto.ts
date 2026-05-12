import { z } from 'zod';

export const ScanPrivateDtoSchema = z.object({
  projectId: z
    .string()
    .regex(/^0x[0-9a-fA-F]{64}$/, 'phi must be a 0x-prefixed 32-byte hex string'),
  secretId: z
    .string()
    .regex(/^0x[0-9a-fA-F]+$/, 'sid must be 0x-prefixed hex')
    .refine((s) => s.length >= 4 && s.length % 2 === 0, 'sid must be even-length hex >= 1 byte'),
});
export type ScanPrivateDto = z.infer<typeof ScanPrivateDtoSchema>;
