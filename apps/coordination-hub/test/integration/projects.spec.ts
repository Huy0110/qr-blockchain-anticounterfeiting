import { describe, it, beforeAll, afterAll, beforeEach, expect, vi } from 'vitest';
import request from 'supertest';
import type { INestApplication } from '@nestjs/common';
import type { MongoMemoryServer } from 'mongodb-memory-server';
import { createTestApp, teardownTestApp } from '../test-app';
import { ContractService } from '../../src/blockchain/contract.service';

const VALID_PASSWORD = 'Test123!Password';

const sampleProject = {
  cooperativeName: 'HTX Vân Nội',
  vegetableType: 'rau muống',
  cultivationLocation: { address: 'Đông Anh, Hà Nội', province: 'Hà Nội' },
  startDate: '2026-01-01T00:00:00.000Z',
  harvestDate: '2026-04-01T00:00:00.000Z',
  cultivationArea: 1500,
  expectedOutput: 800,
  description: 'rau muống thuỷ canh',
};

async function registerProducer(
  app: INestApplication,
  email: string,
): Promise<{ accessToken: string; producerId: string }> {
  const res = await request(app.getHttpServer())
    .post('/api/v1/auth/register')
    .send({ email, password: VALID_PASSWORD })
    .expect(201);
  return { accessToken: res.body.accessToken, producerId: res.body.producer.id };
}

describe('ProjectsModule (T-016)', () => {
  let app: INestApplication;
  let mongo: MongoMemoryServer;
  let contractMock: {
    registerProject: ReturnType<typeof vi.fn>;
    projectExists: ReturnType<typeof vi.fn>;
  };

  beforeAll(async () => {
    ({ app, mongo } = await createTestApp());
    contractMock = app.get(ContractService) as unknown as typeof contractMock;
  }, 60_000);

  afterAll(async () => {
    await teardownTestApp({ app, mongo });
  });

  beforeEach(() => {
    // Replace stub methods with vi.fn() spies that return success.
    const c = app.get(ContractService) as ContractService;
    contractMock.registerProject = vi.fn(async () => '0x' + 'a'.repeat(64));
    contractMock.projectExists = vi.fn(async () => false);
    c.registerProject = contractMock.registerProject as never;
    c.projectExists = contractMock.projectExists as never;
  });

  it('POST /projects creates a project and calls registerProject on-chain', async () => {
    const { accessToken } = await registerProducer(app, 'create@htx.test');
    const res = await request(app.getHttpServer())
      .post('/api/v1/projects')
      .set('Authorization', `Bearer ${accessToken}`)
      .send(sampleProject)
      .expect(201);

    expect(res.body.projectId).toMatch(/^0x[a-f0-9]{64}$/);
    expect(res.body.cooperativeName).toBe('HTX Vân Nội');
    expect(res.body.txHashRegisterProject).toMatch(/^0x[a-f0-9]{64}$/);
    expect(contractMock.registerProject).toHaveBeenCalledWith(
      res.body.projectId,
      expect.objectContaining({ ciphertext: expect.any(String) }),
    );
  });

  it('phi collision retries up to 3 times', async () => {
    const { accessToken } = await registerProducer(app, 'collision@htx.test');
    let exists = 0;
    contractMock.projectExists = vi.fn(async () => {
      exists++;
      return exists < 2; // first call says exists, second says free
    });
    (app.get(ContractService) as ContractService).projectExists =
      contractMock.projectExists as never;

    await request(app.getHttpServer())
      .post('/api/v1/projects')
      .set('Authorization', `Bearer ${accessToken}`)
      .send(sampleProject)
      .expect(201);
    expect(contractMock.projectExists).toHaveBeenCalledTimes(2);
  });

  it('POST /projects requires JWT', async () => {
    await request(app.getHttpServer()).post('/api/v1/projects').send(sampleProject).expect(401);
  });

  it('POST /projects throws ON_CHAIN_REGISTRATION_FAILED + persists nothing when on-chain leg fails (I-2)', async () => {
    const { accessToken } = await registerProducer(app, 'rpc-fail@htx.test');
    contractMock.registerProject = vi.fn(async () => {
      throw new Error('RPC connection refused');
    });
    (app.get(ContractService) as ContractService).registerProject =
      contractMock.registerProject as never;

    const before = await request(app.getHttpServer())
      .get('/api/v1/projects')
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);
    const beforeCount = before.body.total;

    const res = await request(app.getHttpServer())
      .post('/api/v1/projects')
      .set('Authorization', `Bearer ${accessToken}`)
      .send(sampleProject)
      .expect(502);
    expect(res.body.error.code).toBe('ON_CHAIN_REGISTRATION_FAILED');

    // No off-chain doc should have been persisted.
    const after = await request(app.getHttpServer())
      .get('/api/v1/projects')
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);
    expect(after.body.total).toBe(beforeCount);
  });

  it('POST /projects rejects invalid body (harvestDate < startDate)', async () => {
    const { accessToken } = await registerProducer(app, 'invalid@htx.test');
    const res = await request(app.getHttpServer())
      .post('/api/v1/projects')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ ...sampleProject, harvestDate: '2025-01-01T00:00:00.000Z' })
      .expect(400);
    expect(res.body.error.code).toBe('VALIDATION_FAILED');
  });

  it('GET /projects paginates owner-scoped projects (pageSize cap = 100)', async () => {
    const { accessToken } = await registerProducer(app, 'list@htx.test');
    for (let i = 0; i < 3; i++) {
      await request(app.getHttpServer())
        .post('/api/v1/projects')
        .set('Authorization', `Bearer ${accessToken}`)
        .send(sampleProject)
        .expect(201);
    }
    const list = await request(app.getHttpServer())
      .get('/api/v1/projects?pageSize=2&page=1')
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);
    expect(list.body.items).toHaveLength(2);
    expect(list.body.total).toBe(3);
    expect(list.body.pageSize).toBe(2);

    const overcap = await request(app.getHttpServer())
      .get('/api/v1/projects?pageSize=200')
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(400);
    expect(overcap.body.error.code).toBe('VALIDATION_FAILED');
  });

  it('PATCH /projects/:phi from non-owner returns 403', async () => {
    const ownerToken = (await registerProducer(app, 'owner@htx.test')).accessToken;
    const intruderToken = (await registerProducer(app, 'intruder@htx.test')).accessToken;

    const created = await request(app.getHttpServer())
      .post('/api/v1/projects')
      .set('Authorization', `Bearer ${ownerToken}`)
      .send(sampleProject)
      .expect(201);

    const res = await request(app.getHttpServer())
      .patch(`/api/v1/projects/${created.body.projectId}`)
      .set('Authorization', `Bearer ${intruderToken}`)
      .send({ description: 'I should not be allowed to do this' })
      .expect(403);
    expect(res.body.error.code).toBe('PROJECT_ACCESS_FORBIDDEN');
  });

  it('DELETE /projects/:phi soft-deletes (isDeleted=true)', async () => {
    const { accessToken } = await registerProducer(app, 'delete@htx.test');
    const created = await request(app.getHttpServer())
      .post('/api/v1/projects')
      .set('Authorization', `Bearer ${accessToken}`)
      .send(sampleProject)
      .expect(201);

    await request(app.getHttpServer())
      .delete(`/api/v1/projects/${created.body.projectId}`)
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(204);

    const list = await request(app.getHttpServer())
      .get('/api/v1/projects')
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);
    expect(
      list.body.items.find((p: { projectId: string }) => p.projectId === created.body.projectId),
    ).toBeUndefined();
  });

  it('GET /projects/:phi (anonymous) returns 404 for in_progress projects', async () => {
    const { accessToken } = await registerProducer(app, 'public@htx.test');
    const created = await request(app.getHttpServer())
      .post('/api/v1/projects')
      .set('Authorization', `Bearer ${accessToken}`)
      .send(sampleProject)
      .expect(201);
    // Status defaults to in_progress, so anonymous read should 404.
    await request(app.getHttpServer())
      .get(`/api/v1/projects/${created.body.projectId}`)
      .expect(404);
  });

  it('GET /projects/:phi (anonymous) returns metadata when status=harvesting', async () => {
    const { accessToken } = await registerProducer(app, 'harvest@htx.test');
    const created = await request(app.getHttpServer())
      .post('/api/v1/projects')
      .set('Authorization', `Bearer ${accessToken}`)
      .send(sampleProject)
      .expect(201);
    await request(app.getHttpServer())
      .patch(`/api/v1/projects/${created.body.projectId}`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ status: 'harvesting' })
      .expect(200);
    // Mock projectExists -> true so the public read passes the on-chain check.
    contractMock.projectExists = vi.fn(async () => true);
    (app.get(ContractService) as ContractService).projectExists =
      contractMock.projectExists as never;

    const res = await request(app.getHttpServer())
      .get(`/api/v1/projects/${created.body.projectId}`)
      .expect(200);
    expect(res.body.cooperativeName).toBe('HTX Vân Nội');
  });
});
