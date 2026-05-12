import type { CallHandler, ExecutionContext, NestInterceptor } from '@nestjs/common';
import { Injectable } from '@nestjs/common';
import type { Observable } from 'rxjs';
import type { Request, Response } from 'express';
import { v7 as uuidv7 } from 'uuid';

/**
 * Ensures every request has an `x-request-id`. Reads from the incoming
 * header if the client supplied one, otherwise mints a new UUIDv7 (time-
 * sortable, ideal for log correlation). The id is also echoed back in the
 * response header so the client can quote it when reporting bugs.
 */
@Injectable()
export class RequestIdInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const http = context.switchToHttp();
    const req = http.getRequest<Request>();
    const res = http.getResponse<Response>();

    const incoming = req.headers['x-request-id'];
    const id = typeof incoming === 'string' && incoming.length > 0 ? incoming : uuidv7();
    req.headers['x-request-id'] = id;
    res.setHeader('x-request-id', id);

    return next.handle();
  }
}
