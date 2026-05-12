import { describe, it, beforeAll, afterAll, expect } from 'vitest';
import type { INestApplication } from '@nestjs/common';
import type { MongoMemoryServer } from 'mongodb-memory-server';
import request from 'supertest';
import { createTestApp, teardownTestApp } from '../test-app';
import { loadEnv, EnvValidationError } from '../../src/config/env.schema';

/**
 * T-013 skeleton smoke tests. Boots the full hub via createTestApp (which
 * spins an in-memory MongoDB) and asserts the cross-cutting concerns work
 * end-to-end:
 *   - health endpoint returns ok
 *   - 404 on unknown route uses the error envelope
 *   - helmet adds CSP-style headers
 *   - request id is echoed back
 */
describe('coordination-hub skeleton (T-013)', () => {
  let app: INestApplication;
  let mongo: MongoMemoryServer;

  beforeAll(async () => {
    ({ app, mongo } = await createTestApp());
  }, 60_000);

  afterAll(async () => {
    await teardownTestApp({ app, mongo });
  });

  it('GET /api/v1/health returns a status object (ok or degraded)', async () => {
    const res = await request(app.getHttpServer()).get('/api/v1/health').expect(200);
    expect(['ok', 'degraded']).toContain(res.body.status);
    expect(typeof res.body.timestamp).toBe('string');
  });

  it('echoes x-request-id (or mints one) in the response', async () => {
    const res = await request(app.getHttpServer()).get('/api/v1/health');
    expect(res.headers['x-request-id']).toBeDefined();
    expect(res.headers['x-request-id']).toMatch(/^[0-9a-f-]{36}$/);
  });

  it('preserves a client-supplied x-request-id', async () => {
    const supplied = '01900000-0000-7000-8000-000000000abc';
    const res = await request(app.getHttpServer())
      .get('/api/v1/health')
      .set('x-request-id', supplied);
    expect(res.headers['x-request-id']).toBe(supplied);
  });

  it('emits the canonical error envelope on 404', async () => {
    const res = await request(app.getHttpServer()).get('/api/v1/does-not-exist').expect(404);
    expect(res.body).toHaveProperty('error');
    expect(res.body.error).toHaveProperty('code');
    expect(res.body.error).toHaveProperty('message');
    expect(res.body.error).toHaveProperty('requestId');
  });

  it('sets helmet security headers', async () => {
    const res = await request(app.getHttpServer()).get('/api/v1/health');
    expect(res.headers['x-content-type-options']).toBe('nosniff');
    expect(res.headers['x-dns-prefetch-control']).toBe('off');
  });
});

describe('env schema validation', () => {
  it('rejects WALLET_ENCRYPTION_KEK that is not base64', () => {
    expect(() => loadEnv({ ...process.env, WALLET_ENCRYPTION_KEK: '@@not-base64@@' })).toThrow(
      EnvValidationError,
    );
  });

  it('rejects out-of-range PORT', () => {
    expect(() => loadEnv({ ...process.env, PORT: '0' })).toThrow(EnvValidationError);
  });

  it('parses CORS_ORIGINS as a comma-separated list', () => {
    const env = loadEnv({ CORS_ORIGINS: 'https://a.test, https://b.test , ,https://c.test' });
    expect(env.CORS_ORIGINS).toEqual(['https://a.test', 'https://b.test', 'https://c.test']);
  });
});
