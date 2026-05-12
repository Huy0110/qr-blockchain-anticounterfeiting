import type { ArgumentsHost, ExceptionFilter } from '@nestjs/common';
import { Catch, HttpException, HttpStatus, Logger } from '@nestjs/common';
import type { Request, Response } from 'express';
import { DomainException } from '../exceptions/domain.exception';

/**
 * Canonical error envelope per docs/architecture/api-design.md §4:
 *
 *   {
 *     error: {
 *       code: 'SCREAMING_SNAKE',
 *       message: 'human-readable',
 *       details?: {...},
 *       requestId: 'uuid'
 *     }
 *   }
 *
 * Maps:
 *   - DomainException     -> uses subclass code + status + details
 *   - HttpException       -> uses NestJS status, code = HTTP_<status>
 *   - everything else     -> 500 INTERNAL_ERROR (with stack only in dev logs)
 */
@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();
    const requestId = (request.headers['x-request-id'] as string | undefined) ?? 'unknown';

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let code = 'INTERNAL_ERROR';
    let message = 'Internal server error';
    let details: Record<string, unknown> | undefined;

    if (exception instanceof DomainException) {
      status = exception.getStatus();
      code = exception.code;
      message = exception.message;
      details = exception.details;
    } else if (exception instanceof HttpException) {
      status = exception.getStatus();
      const resp = exception.getResponse();
      if (typeof resp === 'string') {
        message = resp;
      } else if (typeof resp === 'object' && resp !== null) {
        const r = resp as { message?: unknown; error?: string };
        message =
          (Array.isArray(r.message) ? r.message.join('; ') : (r.message as string)) ?? message;
        if (r.error) code = String(r.error).toUpperCase().replace(/\s+/g, '_');
      }
      code = code === 'INTERNAL_ERROR' ? `HTTP_${status}` : code;
    } else if (exception instanceof Error) {
      this.logger.error(
        { err: exception, requestId, stack: exception.stack },
        `Unhandled exception: ${exception.message}`,
      );
      message = 'Internal server error';
    }

    response.status(status).json({
      error: { code, message, ...(details ? { details } : {}), requestId },
    });
  }
}
