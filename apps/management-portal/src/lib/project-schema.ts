import { z } from 'zod';

/**
 * Form-side Zod schema for project create/edit. Mirrors the hub's
 * CreateProjectDtoSchema (apps/coordination-hub/src/projects/dto) but
 * accepts ISO-date strings from <input type="date">. Server-side
 * enforcement still happens at the hub — this is for the inline-error
 * UX only.
 */
export const ProjectFormSchema = z
  .object({
    cooperativeName: z.string().min(1, 'required').max(200),
    vegetableType: z.string().min(1, 'required').max(100),
    address: z.string().min(1, 'required').max(200),
    province: z.string().min(1, 'required').max(100),
    lat: z
      .union([z.number(), z.literal('')])
      .optional()
      .transform((v) => (v === '' || v === undefined ? undefined : Number(v)))
      .refine((v) => v === undefined || (v >= -90 && v <= 90), {
        message: 'invalid latitude',
      }),
    lng: z
      .union([z.number(), z.literal('')])
      .optional()
      .transform((v) => (v === '' || v === undefined ? undefined : Number(v)))
      .refine((v) => v === undefined || (v >= -180 && v <= 180), {
        message: 'invalid longitude',
      }),
    startDate: z.string().min(1, 'required'),
    harvestDate: z.string().min(1, 'required'),
    // Allow zero so legacy projects (which may have unset numeric
    // fields stored as 0) can be opened, edited, and saved without
    // forcing the producer to invent a number for an irrelevant field.
    // The hub enforces .positive() at the API boundary on create —
    // any 0 reaches the hub and is rejected with a localised toast.
    cultivationArea: z.coerce.number().nonnegative('positive'),
    expectedOutput: z.coerce.number().nonnegative('positive'),
    description: z.string().max(5000).optional().default(''),
    status: z.enum(['in_progress', 'harvesting', 'finished']).optional(),
  })
  .refine(
    (v) => {
      const s = new Date(v.startDate);
      const h = new Date(v.harvestDate);
      return !isNaN(s.getTime()) && !isNaN(h.getTime()) && h >= s;
    },
    { path: ['harvestDate'], message: 'harvestAfterStart' },
  );

export type ProjectFormValues = z.input<typeof ProjectFormSchema>;
export type ProjectFormParsed = z.output<typeof ProjectFormSchema>;

/** Convert parsed form values into the hub-shaped POST body. */
export function toCreatePayload(parsed: ProjectFormParsed): {
  cooperativeName: string;
  vegetableType: string;
  cultivationLocation: {
    address: string;
    province: string;
    coordinates?: { lat: number; lng: number };
  };
  startDate: string;
  harvestDate: string;
  cultivationArea: number;
  expectedOutput: number;
  description: string;
} {
  const location: {
    address: string;
    province: string;
    coordinates?: { lat: number; lng: number };
  } = { address: parsed.address, province: parsed.province };
  if (parsed.lat !== undefined && parsed.lng !== undefined) {
    location.coordinates = { lat: parsed.lat, lng: parsed.lng };
  }
  return {
    cooperativeName: parsed.cooperativeName,
    vegetableType: parsed.vegetableType,
    cultivationLocation: location,
    startDate: new Date(parsed.startDate).toISOString(),
    harvestDate: new Date(parsed.harvestDate).toISOString(),
    cultivationArea: parsed.cultivationArea,
    expectedOutput: parsed.expectedOutput,
    description: parsed.description ?? '',
  };
}
