import type { PipeTransform } from '@nestjs/common';
import { BadRequestException } from '@nestjs/common';
import type { ZodSchema } from 'zod';

/**
 * NestJS pipe that validates DTO input via a Zod schema (defense-in-depth
 * tier 1 per database.md §9). Any failure surfaces as a 400 with the
 * canonical error envelope; the message embeds the Zod issue list so
 * frontend can map to per-field errors.
 *
 * Use as: @Body(new ZodValidationPipe(MySchema)) body: MyType
 * or as a class-level decorator.
 */
export class ZodValidationPipe<T> implements PipeTransform<unknown, T> {
  constructor(private readonly schema: ZodSchema<T>) {}

  transform(value: unknown): T {
    const result = this.schema.safeParse(value);
    if (!result.success) {
      throw new BadRequestException({
        error: 'VALIDATION_FAILED',
        message: 'Request body failed validation',
        details: {
          issues: result.error.issues.map((i) => ({
            path: i.path.join('.'),
            message: i.message,
            code: i.code,
          })),
        },
      });
    }
    return result.data;
  }
}
