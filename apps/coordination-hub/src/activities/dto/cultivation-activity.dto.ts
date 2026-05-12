import { z } from 'zod';

export const CultivationActivityTypeSchema = z.enum([
  'land_preparation',
  'planting',
  'fertilizing',
  'pest_control',
  'harvesting',
  'other',
]);

export const CreateActivityDtoSchema = z.object({
  type: CultivationActivityTypeSchema,
  activityDate: z.coerce.date(),
  name: z.string().min(1).max(100),
  description: z.string().max(2000).optional().default(''),
  materials: z.array(z.string().min(1).max(100)).optional(),
  note: z.string().max(500).optional(),
});
export type CreateActivityDto = z.infer<typeof CreateActivityDtoSchema>;

export const UpdateActivityDtoSchema = z.object({
  type: CultivationActivityTypeSchema.optional(),
  activityDate: z.coerce.date().optional(),
  name: z.string().min(1).max(100).optional(),
  description: z.string().max(2000).optional(),
  materials: z.array(z.string().min(1).max(100)).optional(),
  note: z.string().max(500).optional(),
});
export type UpdateActivityDto = z.infer<typeof UpdateActivityDtoSchema>;
