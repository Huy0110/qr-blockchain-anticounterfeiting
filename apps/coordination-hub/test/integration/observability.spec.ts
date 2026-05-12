import { describe, it, beforeAll, afterAll, expect } from 'vitest';
import request from 'supertest';
import type { INestApplication } from '@nestjs/common';
import type { MongoMemoryServer } from 'mongodb-memory-server';
import { createTestApp, teardownTestApp } from '../test-app';
import { AuditLogService } from '../../src/observability/audit-log.service';

describe('ObservabilityModule (T-021)', () => {
  let app: INestApplication;
  let mongo: MongoMemoryServer;

  beforeAll(async () => {
    ({ app, mongo } = await createTestApp());
  }, 60_000);

  afterAll(async () => {
    await teardownTestApp({ app, mongo });
  });

  it('GET /api/v1/health returns full check shape with status field', async () => {
    const res = await request(app.getHttpServer()).get('/api/v1/health').expect(200);
    expect(['ok', 'degraded']).toContain(res.body.status);
    expect(res.body.checks).toBeDefined();
    expect(res.body.checks.mongo).toHaveProperty('status');
    expect(res.body.checks.rpc).toHaveProperty('status');
    expect(res.body.checks.ipfs).toHaveProperty('provider');
    expect(res.body.checks.systemWallet).toHaveProperty('status');
  });

  it('GET /api/v1/metrics returns Prometheus exposition with our counters', async () => {
    // Hit a route first so http_requests_total has at least one sample.
    await request(app.getHttpServer()).get('/api/v1/health');

    const res = await request(app.getHttpServer()).get('/api/v1/metrics').expect(200);
    expect(res.headers['content-type']).toMatch(/text\/plain/);
    expect(res.text).toContain('http_requests_total');
    expect(res.text).toContain('http_request_duration_seconds');
    expect(res.text).toContain('blockchain_rpc_errors_total');
    expect(res.text).toContain('tx_confirmation_seconds');
  });

  it('AuditLogService persists records and lists by actor', async () => {
    const audit = app.get(AuditLogService);
    await audit.record({
      actor: 'producer-test-1',
      action: 'PROJECT_CREATE',
      target: '0x' + '5'.repeat(64),
      metadata: { source: 'spec' },
    });
    await audit.record({
      actor: 'producer-test-1',
      action: 'BATCH_REGISTER',
      target: '0x' + '5'.repeat(64),
    });
    const records = await audit.listByActor('producer-test-1');
    expect(records.length).toBe(2);
    expect(records.map((r) => r.action)).toEqual(['BATCH_REGISTER', 'PROJECT_CREATE']);
  });
});
