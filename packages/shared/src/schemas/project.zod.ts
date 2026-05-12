import { z } from 'zod';
import { CultivationActivitySchema } from './activity.zod.js';
import { CertificationSchema } from './certification.zod.js';

/**
 * Runtime schema for ProjectMetadata. Mirrors `ProjectMetadata` in
 * `../types.ts` and the Mongoose Project schema in database.md.
 *
 * `projectId` is a 32-byte hex string with 0x prefix — the on-chain phi.
 * We validate the shape (66 chars, 0x-prefixed, hex) here so hub doesn't
 * have to repeat the check.
 */
const PhiSchema = z
  .string()
  .regex(/^0x[0-9a-fA-F]{64}$/, 'phi must be a 0x-prefixed 32-byte hex string');

export const ProjectStatusSchema = z.enum(['in_progress', 'harvesting', 'finished']);

export const GeoCoordinatesSchema = z.object({
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
});

export const CultivationLocationSchema = z.object({
  address: z.string().min(1).max(500),
  province: z.string().min(1).max(120),
  coordinates: GeoCoordinatesSchema.optional(),
});

export const ProjectMetadataSchema = z
  .object({
    projectId: PhiSchema,
    cooperativeName: z.string().min(1).max(200),
    vegetableType: z.string().min(1).max(120),
    cultivationLocation: CultivationLocationSchema,
    startDate: z.coerce.date(),
    harvestDate: z.coerce.date(),
    cultivationArea: z.number().positive(),
    expectedOutput: z.number().positive(),
    description: z.string().max(5000),
    cultivationActivities: z.array(CultivationActivitySchema),
    certifications: z.array(CertificationSchema),
    imageUrls: z.array(z.string().url()),
    status: ProjectStatusSchema,
    ownerProducerId: z.string().min(1),
    createdAt: z.coerce.date(),
    updatedAt: z.coerce.date(),
  })
  .refine((proj) => proj.harvestDate >= proj.startDate, {
    message: 'harvestDate must be on or after startDate',
    path: ['harvestDate'],
  });

export type ProjectMetadataInput = z.input<typeof ProjectMetadataSchema>;
export type ProjectMetadataParsed = z.output<typeof ProjectMetadataSchema>;
