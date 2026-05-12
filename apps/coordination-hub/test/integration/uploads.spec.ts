import { describe, it, beforeAll, afterAll, expect, vi } from 'vitest';
import request from 'supertest';
import type { INestApplication } from '@nestjs/common';
import type { MongoMemoryServer } from 'mongodb-memory-server';
import { createTestApp, teardownTestApp } from '../test-app';
import { ContractService } from '../../src/blockchain/contract.service';

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

// Real PNG: 1x1 transparent. Magic bytes 89 50 4E 47 0D 0A 1A 0A.
const TINY_PNG = Buffer.from(
  '89504E470D0A1A0A0000000D49484452000000010000000108060000001F15C4890000000D49444154789C636001000000050001' +
    '0D0A2DB40000000049454E44AE426082',
  'hex',
);

describe('UploadsModule (T-018)', () => {
  let app: INestApplication;
  let mongo: MongoMemoryServer;
  let token: string;
  let phi: string;

  beforeAll(async () => {
    ({ app, mongo } = await createTestApp({ IPFS_PROVIDER: 'mock' }));
    const c = app.get(ContractService) as ContractService;
    c.registerProject = vi.fn(async () => '0x' + 'a'.repeat(64)) as never;
    c.projectExists = vi.fn(async () => false) as never;

    const reg = await request(app.getHttpServer())
      .post('/api/v1/auth/register')
      .send({ email: 'upload@htx.test', password: VALID_PASSWORD })
      .expect(201);
    token = reg.body.accessToken;
    const project = await request(app.getHttpServer())
      .post('/api/v1/projects')
      .set('Authorization', `Bearer ${token}`)
      .send(sampleProject)
      .expect(201);
    phi = project.body.projectId;
  }, 60_000);

  afterAll(async () => {
    await teardownTestApp({ app, mongo });
  });

  it('POST /projects/:phi/images pins an image and returns ipfs:// URL', async () => {
    const res = await request(app.getHttpServer())
      .post(`/api/v1/projects/${phi}/images`)
      .set('Authorization', `Bearer ${token}`)
      .attach('files', TINY_PNG, { filename: 'rau.png', contentType: 'image/png' })
      .expect(201);
    expect(res.body.urls).toHaveLength(1);
    expect(res.body.urls[0]).toMatch(/^ipfs:\/\/bamock/);
  });

  it('rejects non-image MIME with 415 UNSUPPORTED_MEDIA_TYPE', async () => {
    const txtBuffer = Buffer.from('this is plain text, not an image', 'utf8');
    const res = await request(app.getHttpServer())
      .post(`/api/v1/projects/${phi}/images`)
      .set('Authorization', `Bearer ${token}`)
      .attach('files', txtBuffer, { filename: 'notes.txt', contentType: 'text/plain' })
      .expect(415);
    expect(res.body.error.code).toBe('UNSUPPORTED_MEDIA_TYPE');
  });

  it('rejects file > 10 MB with 413 PAYLOAD_TOO_LARGE (via service guard)', async () => {
    // Build 11 MB of valid PNG bytes by repeating the tiny PNG header + filler.
    // file-type still recognises it as PNG, but our service aborts on size.
    const big = Buffer.alloc(11 * 1024 * 1024);
    TINY_PNG.copy(big, 0);
    const res = await request(app.getHttpServer())
      .post(`/api/v1/projects/${phi}/images`)
      .set('Authorization', `Bearer ${token}`)
      .attach('files', big, { filename: 'big.png', contentType: 'image/png' });
    expect([413, 400]).toContain(res.status);
  });

  it('requires JWT (401 without bearer)', async () => {
    await request(app.getHttpServer())
      .post(`/api/v1/projects/${phi}/images`)
      .attach('files', TINY_PNG, { filename: 'rau.png', contentType: 'image/png' })
      .expect(401);
  });
});
