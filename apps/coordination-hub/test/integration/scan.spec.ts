import { describe, it, beforeAll, afterAll, beforeEach, expect, vi } from 'vitest';
import request from 'supertest';
import type { INestApplication } from '@nestjs/common';
import type { MongoMemoryServer } from 'mongodb-memory-server';
import { hashSid } from '@qr-bc/shared';
import { createTestApp, teardownTestApp } from '../test-app';
import { ContractService } from '../../src/blockchain/contract.service';
import { OnChainProductAlreadyRedeemedException } from '../../src/blockchain/exceptions';

const VALID_PASSWORD = 'Test123!Password';
const sampleProject = {
  cooperativeName: 'HTX Test',
  vegetableType: 'rau muống',
  cultivationLocation: { address: 'Test', province: 'Hà Nội' },
  startDate: '2026-01-01T00:00:00.000Z',
  harvestDate: '2026-04-01T00:00:00.000Z',
  cultivationArea: 1500,
  expectedOutput: 800,
};

interface ContractMock {
  registerProject: ReturnType<typeof vi.fn>;
  projectExists: ReturnType<typeof vi.fn>;
  verifyProduct: ReturnType<typeof vi.fn>;
  redeemProduct: ReturnType<typeof vi.fn>;
}

describe('ScanModule (T-020)', () => {
  let app: INestApplication;
  let mongo: MongoMemoryServer;
  let token: string;
  let phi: string;
  let mock: ContractMock;

  beforeAll(async () => {
    ({ app, mongo } = await createTestApp());
  }, 60_000);

  afterAll(async () => {
    await teardownTestApp({ app, mongo });
  });

  beforeEach(async () => {
    const c = app.get(ContractService) as unknown as ContractMock & ContractService;
    mock = {
      registerProject: vi.fn(async () => '0x' + 'a'.repeat(64)),
      // Initially false so the projects.service collision-retry settles on
      // the first attempt during project creation. Each test mutates this
      // afterwards to whatever scan scenario it needs.
      projectExists: vi.fn(async () => false),
      verifyProduct: vi.fn(),
      redeemProduct: vi.fn(),
    };
    c.registerProject = mock.registerProject as never;
    c.projectExists = mock.projectExists as never;
    c.verifyProduct = mock.verifyProduct as never;
    c.redeemProduct = mock.redeemProduct as never;

    const reg = await request(app.getHttpServer())
      .post('/api/v1/auth/register')
      .send({ email: `scan-${Date.now()}@htx.test`, password: VALID_PASSWORD })
      .expect(201);
    token = reg.body.accessToken;
    const project = await request(app.getHttpServer())
      .post('/api/v1/projects')
      .set('Authorization', `Bearer ${token}`)
      .send(sampleProject)
      .expect(201);
    phi = project.body.projectId;
    // Bring it to harvesting status so the public scan can succeed.
    await request(app.getHttpServer())
      .patch(`/api/v1/projects/${phi}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ status: 'harvesting' })
      .expect(200);
  });

  it('GET /scan/public/:phi returns metadata for a registered, harvesting project', async () => {
    mock.projectExists = vi.fn(async () => true);
    (app.get(ContractService) as ContractService).projectExists = mock.projectExists as never;

    const res = await request(app.getHttpServer()).get(`/api/v1/scan/public/${phi}`).expect(200);
    expect(res.body.projectId).toBe(phi);
    expect(res.body.cooperativeName).toBe('HTX Test');
  });

  it('GET /scan/public/:phi returns 404 if project not on-chain', async () => {
    mock.projectExists = vi.fn(async () => false);
    (app.get(ContractService) as ContractService).projectExists = mock.projectExists as never;

    await request(app.getHttpServer()).get(`/api/v1/scan/public/${phi}`).expect(404);
  });

  it('POST /scan/private with unknown sid returns COUNTERFEIT (no tx submitted)', async () => {
    mock.verifyProduct = vi.fn(async () => ({
      exists: false,
      redeemed: false,
      producer: '0x' + '0'.repeat(40),
    }));
    (app.get(ContractService) as ContractService).verifyProduct = mock.verifyProduct as never;

    const res = await request(app.getHttpServer())
      .post('/api/v1/scan/private')
      .send({ projectId: phi, secretId: '0x' + 'cd'.repeat(16) })
      .expect(200);
    expect(res.body.status).toBe('COUNTERFEIT');
    expect(mock.redeemProduct).not.toHaveBeenCalled();
  });

  it('POST /scan/private with redeemed sid returns ALREADY_VERIFIED', async () => {
    mock.verifyProduct = vi.fn(async () => ({
      exists: true,
      redeemed: true,
      producer: '0x' + 'a'.repeat(40),
    }));
    (app.get(ContractService) as ContractService).verifyProduct = mock.verifyProduct as never;

    const res = await request(app.getHttpServer())
      .post('/api/v1/scan/private')
      .send({ projectId: phi, secretId: '0x' + 'ab'.repeat(16) })
      .expect(200);
    expect(res.body.status).toBe('ALREADY_VERIFIED');
    expect(mock.redeemProduct).not.toHaveBeenCalled();
  });

  it('POST /scan/private with valid sid returns AUTHENTIC + tx envelope', async () => {
    let firstCall = true;
    mock.verifyProduct = vi.fn(async () => {
      const r = firstCall
        ? { exists: true, redeemed: false, producer: '0x' + 'a'.repeat(40) }
        : { exists: true, redeemed: true, producer: '0x' + 'a'.repeat(40) };
      firstCall = false;
      return r;
    });
    mock.redeemProduct = vi.fn(async () => ({
      txHash: '0x' + 'd'.repeat(64),
      blockNumber: 1234,
      timestamp: 1_700_000_000,
    }));
    const c = app.get(ContractService) as ContractService;
    c.verifyProduct = mock.verifyProduct as never;
    c.redeemProduct = mock.redeemProduct as never;

    const res = await request(app.getHttpServer())
      .post('/api/v1/scan/private')
      .send({ projectId: phi, secretId: '0x' + 'ef'.repeat(16) })
      .expect(200);
    expect(res.body.status).toBe('AUTHENTIC');
    expect(res.body.txHash).toMatch(/^0xd{64}$/);
    expect(res.body.eventArgs.phi).toBe(phi);
    expect(res.body.eventArgs.timestamp).toBe(1_700_000_000);
    expect(res.body.verifiedAt).toBeDefined();
  });

  it('POST /scan/private handles redeem race (pre-check OK, contract reverts AlreadyRedeemed)', async () => {
    mock.verifyProduct = vi.fn(async () => ({
      exists: true,
      redeemed: false,
      producer: '0x' + 'a'.repeat(40),
    }));
    mock.redeemProduct = vi.fn(async () => {
      throw new OnChainProductAlreadyRedeemedException(phi, hashSid(new Uint8Array([0xab])));
    });
    const c = app.get(ContractService) as ContractService;
    c.verifyProduct = mock.verifyProduct as never;
    c.redeemProduct = mock.redeemProduct as never;

    const res = await request(app.getHttpServer())
      .post('/api/v1/scan/private')
      .send({ projectId: phi, secretId: '0xab' })
      .expect(200);
    expect(res.body.status).toBe('ALREADY_VERIFIED');
  });

  it('rejects invalid scan body (bad phi format)', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/v1/scan/private')
      .send({ projectId: 'not-hex', secretId: '0xab' })
      .expect(400);
    expect(res.body.error.code).toBe('VALIDATION_FAILED');
  });
});
