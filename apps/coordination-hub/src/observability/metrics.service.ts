import { Injectable, OnModuleInit } from '@nestjs/common';
import { Counter, Histogram, Registry, collectDefaultMetrics } from 'prom-client';

@Injectable()
export class MetricsService implements OnModuleInit {
  readonly registry = new Registry();

  readonly httpRequestsTotal = new Counter({
    name: 'http_requests_total',
    help: 'Total number of HTTP requests',
    labelNames: ['method', 'route', 'status'],
    registers: [this.registry],
  });

  readonly httpRequestDuration = new Histogram({
    name: 'http_request_duration_seconds',
    help: 'HTTP request latency in seconds',
    labelNames: ['method', 'route', 'status'],
    buckets: [0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10],
    registers: [this.registry],
  });

  readonly blockchainRpcErrorsTotal = new Counter({
    name: 'blockchain_rpc_errors_total',
    help: 'Cumulative count of RPC errors raised by ContractService',
    labelNames: ['method'],
    registers: [this.registry],
  });

  readonly txConfirmationSeconds = new Histogram({
    name: 'tx_confirmation_seconds',
    help: 'Time from broadcast to receipt for on-chain transactions',
    labelNames: ['method'],
    buckets: [0.5, 1, 2, 5, 10, 20, 35, 60, 120],
    registers: [this.registry],
  });

  onModuleInit(): void {
    collectDefaultMetrics({ register: this.registry });
  }

  scrape(): Promise<string> {
    return this.registry.metrics();
  }
}
