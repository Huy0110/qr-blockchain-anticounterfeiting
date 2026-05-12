import { z } from 'zod';

export const CreateBatchDtoSchema = z.object({
  n: z.coerce.number().int().min(1).max(500),
  dappBaseUrl: z.string().url().optional(),
});
export type CreateBatchDto = z.infer<typeof CreateBatchDtoSchema>;
