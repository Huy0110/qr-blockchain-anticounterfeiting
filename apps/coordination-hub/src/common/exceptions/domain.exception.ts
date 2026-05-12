import type { HttpStatus } from '@nestjs/common';
import { HttpException } from '@nestjs/common';

/**
 * Base class for domain-specific exceptions raised by hub services.
 *
 * The HTTP exception filter unpacks `code` + `details` into the canonical
 * error envelope (api-design.md §4). Subclasses set:
 *   - `code`: SCREAMING_SNAKE_CASE machine identifier (stable across refactors)
 *   - `status`: HTTP status code
 *   - `details`: optional structured context for debugging (PII-free)
 */
export abstract class DomainException extends HttpException {
  abstract readonly code: string;

  constructor(
    message: string,
    status: HttpStatus | number,
    public readonly details?: Record<string, unknown>,
  ) {
    super(message, status);
  }
}
