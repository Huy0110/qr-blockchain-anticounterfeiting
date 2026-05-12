import type { CallHandler, ExecutionContext, NestInterceptor } from '@nestjs/common';
import { Injectable } from '@nestjs/common';
import { map, type Observable } from 'rxjs';

/**
 * No-op transform interceptor. Reserved as the canonical seam where future
 * envelope-shaping (e.g., automatic camelCase, snake_case stripping) would
 * land without touching individual controllers.
 *
 * Today it passes the controller return value through unchanged; the error
 * filter handles the {error: {...}} envelope on the failure path.
 */
@Injectable()
export class TransformInterceptor<T> implements NestInterceptor<T, T> {
  intercept(_context: ExecutionContext, next: CallHandler<T>): Observable<T> {
    return next.handle().pipe(map((data) => data));
  }
}
