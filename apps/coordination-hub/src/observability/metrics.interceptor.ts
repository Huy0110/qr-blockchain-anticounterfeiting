import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
import { Observable, tap } from 'rxjs';
import type { Request, Response } from 'express';
import { MetricsService } from './metrics.service';

/**
 * Wires every HTTP request into the http_requests_total +
 * http_request_duration_seconds metrics. Route is the path template
 * (e.g. /projects/:phi) so cardinality stays bounded.
 */
@Injectable()
export class MetricsInterceptor implements NestInterceptor {
  constructor(private readonly metrics: MetricsService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const http = context.switchToHttp();
    const req = http.getRequest<Request & { route?: { path?: string } }>();
    const res = http.getResponse<Response>();
    const start = process.hrtime.bigint();
    const labels = (status: number): { method: string; route: string; status: string } => ({
      method: req.method,
      route: req.route?.path ?? req.path ?? 'unknown',
      status: String(status),
    });
    return next.handle().pipe(
      tap({
        next: () => {
          const seconds = Number(process.hrtime.bigint() - start) / 1e9;
          this.metrics.httpRequestsTotal.inc(labels(res.statusCode));
          this.metrics.httpRequestDuration.observe(labels(res.statusCode), seconds);
        },
        error: () => {
          const seconds = Number(process.hrtime.bigint() - start) / 1e9;
          this.metrics.httpRequestsTotal.inc(labels(500));
          this.metrics.httpRequestDuration.observe(labels(500), seconds);
        },
      }),
    );
  }
}
