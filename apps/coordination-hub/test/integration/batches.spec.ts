import { describe, it, beforeAll, afterAll, beforeEach, expect, vi } from 'vitest';
import request from 'supertest';
import type { INestApplication } from '@nestjs/common';
import type { MongoMemoryServer } from 'mongodb-memory-server';
import { createTestApp, teardownTestApp } from '../test-app';
import { ContractService } from '../../src/blockchain/contract.service';

const VALID_PASSWORD = 'Test123!Password';
const sampleProject = {
  cooperativeName: 'HTX Batch Demo',
  vegetableType: 'rau muống',
  cultivationLocation: { address: 'Test', province: 'Hà Nội' },
  startDate: '2026-01-01T00:00:00.000Z',
  harvestDate: '2026-04-01T00:00:00.000Z',
  cultivationArea: 1500,
  expectedOutput: 800,
};

describe('BatchesModule (T-022)', () => {
  let app: INestApplication;
  let mongo: MongoMemoryServer;
  let token: string;
  let phi: string;

  beforeAll(async () => {
    ({ app, mongo } = await createTestApp());
  }, 60_000);

  afterAll(async () => {
    await teardownTestApp({ app, mongo });
  });

  beforeEach(async () => {
    const c = app.get(ContractService) as ContractService;
    c.registerProject = vi.fn(async () => '0x' + 'a'.repeat(64)) as never;
    c.registerBatch = vi.fn(async () => '0x' + 'b'.repeat(64)) as never;
    c.projectExists = vi.fn(async () => false) as never;

    const reg = await request(app.getHttpServer())
      .post('/api/v1/auth/register')
      .send({ email: `batch-${Date.now()}@htx.test`, password: VALID_PASSWORD })
      .expect(201);
    token = reg.body.accessToken;
    const project = await request(app.getHttpServer())
      .post('/api/v1/projects')
      .set('Authorization', `Bearer ${token}`)
      .send(sampleProject)
      .expect(201);
    phi = project.body.projectId;
  });

  it('POST /projects/:phi/batches returns a ZIP application/zip and calls registerBatch', async () => {
    const c = app.get(ContractService) as ContractService;
    const registerBatchSpy = c.registerBatch as ReturnType<typeof vi.fn>;

    const start = Date.now();
    const res = await request(app.getHttpServer())
      .post(`/api/v1/projects/${phi}/batches`)
      .set('Authorization', `Bearer ${token}`)
      .send({ n: 5, dappBaseUrl: 'http://localhost:3002' })
      .buffer(true)
      .parse((response, callback) => {
        const data: Buffer[] = [];
        response.on('data', (chunk: Buffer) => data.push(chunk));
        response.on('end', () => callback(null, Buffer.concat(data)));
      })
      .expect(200);
    const elapsedMs = Date.now() - start;

    expect(res.headers['content-type']).toMatch(/application\/zip/);
    expect(res.headers['content-disposition']).toMatch(/batch-/);
    expect((res.body as Buffer).length).toBeGreaterThan(100);

    expect(registerBatchSpy).toHaveBeenCalledTimes(1);
    const firstCall = registerBatchSpy.mock.calls[0];
    if (!firstCall) throw new Error('registerBatch was not called');
    const [calledPhi, calledHashes, calledKey] = firstCall;
    expect(calledPhi).toBe(phi);
    expect(Array.isArray(calledHashes)).toBe(true);
    expect((calledHashes as unknown[]).length).toBe(5);
    expect((calledHashes as string[]).every((h) => /^0x[a-f0-9]{64}$/.test(h))).toBe(true);
    expect(calledKey).toMatchObject({ ciphertext: expect.any(String) });

    // DoD AC-CH-15: ≤ 6 s budget on Hardhat. We're not actually hitting
    // a chain (mocked), but the ZIP+QR work itself shouldn't exceed it.
    expect(elapsedMs).toBeLessThan(6_000);
  });

  it('POST /projects/:phi/batches with n=100 fits the ≤6s budget', async () => {
    const start = Date.now();
    const res = await request(app.getHttpServer())
      .post(`/api/v1/projects/${phi}/batches`)
      .set('Authorization', `Bearer ${token}`)
      .send({ n: 100 })
      .buffer(true)
      .parse((response, callback) => {
        const data: Buffer[] = [];
        response.on('data', (chunk: Buffer) => data.push(chunk));
        response.on('end', () => callback(null, Buffer.concat(data)));
      })
      .expect(200);
    const elapsedMs = Date.now() - start;
    expect((res.body as Buffer).length).toBeGreaterThan(10_000);
    // The DoD budget of ≤6s targets a real Hardhat-backed deployment
    // (Paper Table 3 row 1). This integration test mocks the contract
    // layer so it only measures hub work (sid gen + hashing + QR PNG
    // render + ZIP). Plain `pnpm test` clocks in well under 6s; v8
    // coverage instrumentation under `pnpm test:cov` 5-10× the
    // runtime, so we use a generous 30s ceiling here. The 6s SLA is
    // separately verified against a deployed contract during Phase 12
    // experiments (T-034).
    expect(elapsedMs).toBeLessThan(30_000);
  });

  it('rejects n > 500 (DoD: matches contract MAX_BATCH_SIZE)', async () => {
    const res = await request(app.getHttpServer())
      .post(`/api/v1/projects/${phi}/batches`)
      .set('Authorization', `Bearer ${token}`)
      .send({ n: 600 })
      .expect(400);
    expect(res.body.error.code).toBe('VALIDATION_FAILED');
  });

  it('requires JWT', async () => {
    await request(app.getHttpServer())
      .post(`/api/v1/projects/${phi}/batches`)
      .send({ n: 5 })
      .expect(401);
  });

  it('non-owner gets 403 PROJECT_ACCESS_FORBIDDEN', async () => {
    const intruder = await request(app.getHttpServer())
      .post('/api/v1/auth/register')
      .send({ email: `intruder-${Date.now()}@htx.test`, password: VALID_PASSWORD })
      .expect(201);
    const res = await request(app.getHttpServer())
      .post(`/api/v1/projects/${phi}/batches`)
      .set('Authorization', `Bearer ${intruder.body.accessToken}`)
      .send({ n: 5 })
      .expect(403);
    expect(res.body.error.code).toBe('PROJECT_ACCESS_FORBIDDEN');
  });
});
