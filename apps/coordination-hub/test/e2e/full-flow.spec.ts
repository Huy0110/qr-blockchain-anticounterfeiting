import { describe, it, beforeAll, afterAll, expect, vi } from 'vitest';
import request from 'supertest';
import type { INestApplication } from '@nestjs/common';
import type { MongoMemoryServer } from 'mongodb-memory-server';
import { hashSid } from '@qr-bc/shared';
import { createTestApp, teardownTestApp } from '../test-app';
import { ContractService } from '../../src/blockchain/contract.service';
import { OnChainProductAlreadyRedeemedException } from '../../src/blockchain/exceptions';

const VALID_PASSWORD = 'Test123!Password';

const sampleProject = {
  cooperativeName: 'HTX E2E Demo',
  vegetableType: 'rau muống',
  cultivationLocation: { address: 'Đông Anh, Hà Nội', province: 'Hà Nội' },
  startDate: '2026-01-01T00:00:00.000Z',
  harvestDate: '2026-04-01T00:00:00.000Z',
  cultivationArea: 1500,
  expectedOutput: 800,
};

/**
 * E2E full flow per T-022 DoD: register producer → create project → batch
 * 5 sids → public scan → private AUTHENTIC → private ALREADY_VERIFIED →
 * invalid sid COUNTERFEIT.
 *
 * Drives the contract surface via vi.fn() spies on ContractService — a
 * real anvil-backed E2E lives in contracts/test/hardhat/ and is exercised
 * separately. The hub-level E2E here proves all six modules
 * (auth, producers, projects, blockchain stub wiring, scan, batches)
 * cooperate end-to-end.
 */
describe('Phase 3 E2E — register → project → batch → scan flows (T-022)', () => {
  let app: INestApplication;
  let mongo: MongoMemoryServer;

  // Mock store — keyed by phi → set of registered hashes; redeemed flips
  // a parallel map. Lets verifyProduct / redeemProduct behave like a
  // tiny in-memory ProductRegistry.
  const storedHashes = new Map<string, Set<string>>();
  const redeemedHashes = new Map<string, Set<string>>();

  beforeAll(async () => {
    ({ app, mongo } = await createTestApp());
    const c = app.get(ContractService) as ContractService;
    c.registerProject = vi.fn(async (phi: string) => {
      storedHashes.set(phi, new Set());
      redeemedHashes.set(phi, new Set());
      return '0x' + 'a'.repeat(64);
    }) as never;
    c.registerBatch = vi.fn(async (phi: string, hashes: readonly string[]) => {
      const set = storedHashes.get(phi) ?? new Set();
      for (const h of hashes) set.add(h);
      storedHashes.set(phi, set);
      return '0x' + 'b'.repeat(64);
    }) as never;
    c.projectExists = vi.fn(async (phi: string) => storedHashes.has(phi)) as never;
    c.verifyProduct = vi.fn(async (phi: string, h: string) => ({
      exists: storedHashes.get(phi)?.has(h) ?? false,
      redeemed: redeemedHashes.get(phi)?.has(h) ?? false,
      producer: ('0x' + 'a'.repeat(40)) as `0x${string}`,
    })) as never;
    c.redeemProduct = vi.fn(async (phi: string, sid: Uint8Array) => {
      const h = hashSid(sid);
      const stored = storedHashes.get(phi);
      const redeemed = redeemedHashes.get(phi);
      if (!stored?.has(h)) throw new Error('ProductDoesNotExist');
      if (redeemed?.has(h)) {
        throw new OnChainProductAlreadyRedeemedException(phi, h);
      }
      redeemed?.add(h);
      return {
        txHash: '0x' + 'c'.repeat(64),
        blockNumber: 1234,
        timestamp: Math.floor(Date.now() / 1000),
      };
    }) as never;
  }, 60_000);

  afterAll(async () => {
    await teardownTestApp({ app, mongo });
  });

  it('runs the full register → batch → scan happy path + 2 negatives', async () => {
    // 1. Register a producer.
    const reg = await request(app.getHttpServer())
      .post('/api/v1/auth/register')
      .send({ email: 'e2e-htx@demo.test', password: VALID_PASSWORD })
      .expect(201);
    const token = reg.body.accessToken as string;

    // 2. Create a project (also calls registerProject on-chain mock).
    const project = await request(app.getHttpServer())
      .post('/api/v1/projects')
      .set('Authorization', `Bearer ${token}`)
      .send(sampleProject)
      .expect(201);
    const phi = project.body.projectId as string;
    expect(phi).toMatch(/^0x[a-f0-9]{64}$/);
    expect(storedHashes.has(phi)).toBe(true);

    // 3. Bring it to harvesting + batch 5 sids.
    await request(app.getHttpServer())
      .patch(`/api/v1/projects/${phi}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ status: 'harvesting' })
      .expect(200);

    const batchRes = await request(app.getHttpServer())
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
    expect(batchRes.headers['content-type']).toMatch(/application\/zip/);
    const zip = batchRes.body as Buffer;
    expect(zip.length).toBeGreaterThan(0);

    // The mock recorded 5 hashes for this phi.
    expect(storedHashes.get(phi)?.size).toBe(5);
    const hashes = Array.from(storedHashes.get(phi) ?? []);

    // 4. Public scan returns project metadata.
    const publicScan = await request(app.getHttpServer())
      .get(`/api/v1/scan/public/${phi}`)
      .expect(200);
    expect(publicScan.body.projectId).toBe(phi);
    expect(publicScan.body.cooperativeName).toBe('HTX E2E Demo');

    // 5. Reconstruct one of the 5 valid sids to scan privately.
    //    The hub doesn't persist sids (DoD), so a real producer scans the
    //    QR PNG. For this test we pick a sid we know is valid by walking
    //    the in-memory store: pre-image isn't recoverable, so we instead
    //    register a fresh known sid + push its hash into the mock store.
    const knownSid = '0x' + 'ab'.repeat(16);
    const knownHash = hashSid(new Uint8Array(Buffer.from(knownSid.slice(2), 'hex')));
    storedHashes.get(phi)?.add(knownHash);

    const authentic = await request(app.getHttpServer())
      .post('/api/v1/scan/private')
      .send({ projectId: phi, secretId: knownSid })
      .expect(200);
    expect(authentic.body.status).toBe('AUTHENTIC');
    expect(authentic.body.txHash).toMatch(/^0x[a-f0-9]{64}$/);
    expect(authentic.body.eventArgs.phi).toBe(phi);
    expect(authentic.body.eventArgs.h).toBe(knownHash);

    // 6. Second scan with the same sid → ALREADY_VERIFIED.
    const replay = await request(app.getHttpServer())
      .post('/api/v1/scan/private')
      .send({ projectId: phi, secretId: knownSid })
      .expect(200);
    expect(replay.body.status).toBe('ALREADY_VERIFIED');

    // 7. Scan with an unregistered sid → COUNTERFEIT.
    const counterfeit = await request(app.getHttpServer())
      .post('/api/v1/scan/private')
      .send({ projectId: phi, secretId: '0x' + 'ff'.repeat(20) })
      .expect(200);
    expect(counterfeit.body.status).toBe('COUNTERFEIT');

    // Audit + observability sanity: hashes still on-chain stub state.
    expect(hashes.length).toBe(5);
  });
});
