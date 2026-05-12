import { z } from 'zod';

/**
 * Runtime schema for CultivationActivity. Mirrors the `CultivationActivity`
 * TypeScript interface in `../types.ts` and the Mongoose schema in
 * docs/architecture/database.md.
 *
 * Note: Phase 2 ticket card includes Zod schemas in this package even though
 * features/shared-package.md §Non-goals says runtime validation should live
 * in the hub. We keep the schemas here so hub + dApp + management portal
 * share a single source of truth, avoiding silent drift; consumers that
 * don't want zod can import from the type-only entry point.
 */
export const CultivationActivityTypeSchema = z.enum([
  'land_preparation',
  'planting',
  'fertilizing',
  'pest_control',
  'harvesting',
  'other',
]);

export const CultivationActivitySchema = z.object({
  type: CultivationActivityTypeSchema,
  activityDate: z.coerce.date(),
  name: z.string().min(1).max(120),
  description: z.string().max(2000),
  materials: z.array(z.string().min(1).max(120)).optional(),
  note: z.string().max(500).optional(),
});

export type CultivationActivityInput = z.input<typeof CultivationActivitySchema>;
export type CultivationActivityParsed = z.output<typeof CultivationActivitySchema>;
