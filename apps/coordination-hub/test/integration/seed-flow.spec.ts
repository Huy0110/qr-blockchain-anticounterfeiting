import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, it, beforeAll, afterAll, beforeEach, expect, vi } from 'vitest';
import request from 'supertest';
import type { INestApplication } from '@nestjs/common';
import type { MongoMemoryServer } from 'mongodb-memory-server';
import { createTestApp, teardownTestApp } from '../test-app';
import { ContractService } from '../../src/blockchain/contract.service';
import { BatchesService } from '../../src/projects/batches/batches.service';

interface SeedFixture {
  producerEmail: string;
  project: {
    cooperativeName: string;
    vegetableType: string;
    cultivationLocation: { address: string; province: string };
    startDate: string;
    harvestDate: string;
    cultivationArea: number;
    expectedOutput: number;
    description?: string;
  };
  activities: Array<Record<string, unknown>>;
  certifications: Array<Record<string, unknown>>;
  imageUrls: string[];
}

const SEED_PASSWORD = 'DemoSeed!Password123';
const FIXTURES_DIR = join(__dirname, '..', '..', 'src', 'seed', 'fixtures');

function loadFixtures(): SeedFixture[] {
  return readdirSync(FIXTURES_DIR)
    .filter((f) => f.endsWith('.json'))
    .sort()
    .map((f) => JSON.parse(readFileSync(join(FIXTURES_DIR, f), 'utf8')) as SeedFixture);
}

describe('Seed flow (T-044): 3 HTX fixtures end-to-end', () => {
  let app: INestApplication;
  let mongo: MongoMemoryServer;
  const fixtures = loadFixtures();

  beforeAll(async () => {
    ({ app, mongo } = await createTestApp());
  }, 60_000);

  afterAll(async () => {
    await teardownTestApp({ app, mongo });
  });

  beforeEach(() => {
    // Stub the on-chain layer. Each verifyProduct call returns
    // exists=true + redeemed flipping after the first redeem. The
    // hub's scan endpoint reads verifyProduct → redeemProduct (which
    // we stub as a no-op tx) → verifyProduct again to confirm the
    // redemption. We track redemption state per-hash in a Map.
    const redeemed = new Map<string, boolean>();
    const c = app.get(ContractService) as ContractService;
    c.registerProject = vi.fn(async () => '0x' + 'a'.repeat(64)) as never;
    c.registerBatch = vi.fn(async () => '0x' + 'b'.repeat(64)) as never;
    c.projectExists = vi.fn(async () => false) as never;
    c.verifyProduct = vi.fn(async (_phi, h: string) => ({
      exists: true,
      redeemed: redeemed.get(h) ?? false,
      producer: '0x' + 'a'.repeat(40),
    })) as never;
    c.redeemProduct = vi.fn(async (phi: string, sid: string) => {
      const { hashSid } = await import('@qr-bc/shared');
      redeemed.set(hashSid(sid as never), true);
      return {
        txHash: '0x' + 'd'.repeat(64),
        blockNumber: 1234,
        timestamp: 1_700_000_000,
      };
    }) as never;
  });

  it('has exactly 3 HTX fixtures, matching the phase-10 spec', () => {
    expect(fixtures).toHaveLength(3);
    const names = fixtures.map((f) => f.project.cooperativeName).sort();
    expect(names).toEqual(['HTX Củ Chi', 'HTX Tân Đức', 'HTX Vân Nội']);
  });

  it('each fixture has 5 activities + 1 cert + 3 images (DoD totals: 15 + 3 + 9)', () => {
    let activities = 0;
    let certs = 0;
    let images = 0;
    for (const f of fixtures) {
      expect(f.activities).toHaveLength(5);
      expect(f.certifications).toHaveLength(1);
      expect(f.imageUrls.length).toBeGreaterThanOrEqual(3);
      activities += f.activities.length;
      certs += f.certifications.length;
      images += f.imageUrls.length;
    }
    expect(activities).toBe(15);
    expect(certs).toBe(3);
    expect(images).toBeGreaterThanOrEqual(9);
  });

  it('seeds all 3 producers + projects + activities + certs + batches end-to-end', async () => {
    const phisByName = new Map<string, string>();
    const batchService = app.get(BatchesService) as BatchesService;

    for (const fixture of fixtures) {
      // Producer: register; expect 201.
      const reg = await request(app.getHttpServer())
        .post('/api/v1/auth/register')
        .send({ email: fixture.producerEmail, password: SEED_PASSWORD })
        .expect(201);
      const token: string = reg.body.accessToken;
      const producerId: string = reg.body.producer.id;
      expect(typeof token).toBe('string');

      // Project: POST /projects.
      const projectRes = await request(app.getHttpServer())
        .post('/api/v1/projects')
        .set('Authorization', `Bearer ${token}`)
        .send(fixture.project)
        .expect(201);
      const phi = projectRes.body.projectId as string;
      phisByName.set(fixture.project.cooperativeName, phi);

      // Activities.
      for (const a of fixture.activities) {
        await request(app.getHttpServer())
          .post(`/api/v1/projects/${phi}/activities`)
          .set('Authorization', `Bearer ${token}`)
          .send(a)
          .expect(201);
      }

      // Certifications.
      for (const c of fixture.certifications) {
        await request(app.getHttpServer())
          .post(`/api/v1/projects/${phi}/certifications`)
          .set('Authorization', `Bearer ${token}`)
          .send(c)
          .expect(201);
      }

      // Sample batch of 5 — done via the service so we get the
      // manifest with sids (the controller returns ZIP-only).
      const { manifest } = await batchService.generate(producerId, phi as never, 5);
      expect(manifest.entries).toHaveLength(5);

      // E2E: a seeded private sid scans as AUTHENTIC.
      const sample = manifest.entries[0];
      if (!sample) throw new Error('no sample entry in seeded batch');
      const scan = await request(app.getHttpServer())
        .post('/api/v1/scan/private')
        .send({ projectId: phi, secretId: sample.secretId })
        .expect(200);
      expect(scan.body.status).toBe('AUTHENTIC');
      expect(scan.body.txHash).toMatch(/^0x[a-f0-9]{64}$/);
    }

    expect(phisByName.size).toBe(3);
  }, 60_000);

  it('re-seeding is idempotent: second register returns 409, login succeeds', async () => {
    // Use a synthetic email so the test is independent of the
    // previous-test order. The seed script's ensureProducer() handles
    // the same flow: try register, on 409 fall back to login.
    const email = `idempotency-${Date.now()}@demo.qrbc.local`;
    await request(app.getHttpServer())
      .post('/api/v1/auth/register')
      .send({ email, password: SEED_PASSWORD })
      .expect(201);
    await request(app.getHttpServer())
      .post('/api/v1/auth/register')
      .send({ email, password: SEED_PASSWORD })
      .expect(409);
    await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email, password: SEED_PASSWORD })
      .expect(200);
  });
});
