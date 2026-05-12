import { z } from 'zod';

const PhiSchema = z
  .string()
  .regex(/^0x[0-9a-fA-F]{64}$/, 'phi must be a 0x-prefixed 32-byte hex string');

export const ProjectStatusSchema = z.enum(['in_progress', 'harvesting', 'finished']);

const CultivationLocationSchema = z.object({
  address: z.string().min(1).max(200),
  province: z.string().min(1).max(100),
  coordinates: z
    .object({
      lat: z.number().min(-90).max(90),
      lng: z.number().min(-180).max(180),
    })
    .optional(),
});

/** POST /projects — phi is generated server-side, NOT accepted from client. */
export const CreateProjectDtoSchema = z
  .object({
    cooperativeName: z.string().min(1).max(200),
    vegetableType: z.string().min(1).max(100),
    cultivationLocation: CultivationLocationSchema,
    startDate: z.coerce.date(),
    harvestDate: z.coerce.date(),
    cultivationArea: z.number().positive(),
    expectedOutput: z.number().positive(),
    description: z.string().max(5000).optional().default(''),
  })
  .refine((p) => p.harvestDate >= p.startDate, {
    message: 'harvestDate must be on or after startDate',
    path: ['harvestDate'],
  });
export type CreateProjectDto = z.infer<typeof CreateProjectDtoSchema>;

/** PATCH /projects/:phi — all fields optional; phi unchangeable. */
export const UpdateProjectDtoSchema = z
  .object({
    cooperativeName: z.string().min(1).max(200).optional(),
    vegetableType: z.string().min(1).max(100).optional(),
    cultivationLocation: CultivationLocationSchema.optional(),
    startDate: z.coerce.date().optional(),
    harvestDate: z.coerce.date().optional(),
    cultivationArea: z.number().positive().optional(),
    expectedOutput: z.number().positive().optional(),
    description: z.string().max(5000).optional(),
    status: ProjectStatusSchema.optional(),
  })
  .refine((p) => !(p.startDate && p.harvestDate) || p.harvestDate >= p.startDate, {
    message: 'harvestDate must be on or after startDate',
    path: ['harvestDate'],
  });
export type UpdateProjectDto = z.infer<typeof UpdateProjectDtoSchema>;

export const ListProjectsQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().positive().max(100).default(20),
  status: ProjectStatusSchema.optional(),
});
export type ListProjectsQuery = z.infer<typeof ListProjectsQuerySchema>;

export const PhiParamSchema = z.object({ phi: PhiSchema });
export type PhiParam = z.infer<typeof PhiParamSchema>;
