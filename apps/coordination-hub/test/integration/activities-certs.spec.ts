import { describe, it, beforeAll, afterAll, beforeEach, expect, vi } from 'vitest';
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

const sampleActivity = {
  type: 'planting',
  activityDate: '2026-01-15T00:00:00.000Z',
  name: 'Gieo hạt rau muống',
  description: 'Lứa đầu vụ xuân',
  materials: ['hạt giống VietGAP', 'phân hữu cơ'],
};

const sampleCert = {
  name: 'VietGAP',
  issuer: 'Bộ NN&PTNT',
  issueDate: '2026-01-10T00:00:00.000Z',
  expiryDate: '2028-01-10T00:00:00.000Z',
};

describe('Activities + Certifications nested CRUD (T-017)', () => {
  let app: INestApplication;
  let mongo: MongoMemoryServer;
  let token: string;
  let phi: string;

  beforeAll(async () => {
    ({ app, mongo } = await createTestApp());
    const c = app.get(ContractService) as ContractService;
    c.registerProject = vi.fn(async () => '0x' + 'a'.repeat(64)) as never;
    c.projectExists = vi.fn(async () => false) as never;
  }, 60_000);

  afterAll(async () => {
    await teardownTestApp({ app, mongo });
  });

  beforeEach(async () => {
    const reg = await request(app.getHttpServer())
      .post('/api/v1/auth/register')
      .send({ email: `act-${Date.now()}@htx.test`, password: VALID_PASSWORD })
      .expect(201);
    token = reg.body.accessToken;
    const project = await request(app.getHttpServer())
      .post('/api/v1/projects')
      .set('Authorization', `Bearer ${token}`)
      .send(sampleProject)
      .expect(201);
    phi = project.body.projectId;
  });

  describe('Activities', () => {
    it('POST /projects/:phi/activities adds a subdoc + GET lists it', async () => {
      const created = await request(app.getHttpServer())
        .post(`/api/v1/projects/${phi}/activities`)
        .set('Authorization', `Bearer ${token}`)
        .send(sampleActivity)
        .expect(201);
      expect(created.body.id).toMatch(/^[a-f0-9]{24}$/);

      const listed = await request(app.getHttpServer())
        .get(`/api/v1/projects/${phi}/activities`)
        .set('Authorization', `Bearer ${token}`)
        .expect(200);
      expect(listed.body).toHaveLength(1);
      expect(listed.body[0].name).toBe('Gieo hạt rau muống');
    });

    it('PATCH updates a subdoc and DELETE removes it', async () => {
      const created = await request(app.getHttpServer())
        .post(`/api/v1/projects/${phi}/activities`)
        .set('Authorization', `Bearer ${token}`)
        .send(sampleActivity)
        .expect(201);

      await request(app.getHttpServer())
        .patch(`/api/v1/projects/${phi}/activities/${created.body.id}`)
        .set('Authorization', `Bearer ${token}`)
        .send({ note: 'Lứa thử nghiệm — đo độ ẩm hằng ngày' })
        .expect(204);

      let list = await request(app.getHttpServer())
        .get(`/api/v1/projects/${phi}/activities`)
        .set('Authorization', `Bearer ${token}`)
        .expect(200);
      expect(list.body[0].note).toContain('Lứa thử nghiệm');

      await request(app.getHttpServer())
        .delete(`/api/v1/projects/${phi}/activities/${created.body.id}`)
        .set('Authorization', `Bearer ${token}`)
        .expect(204);

      list = await request(app.getHttpServer())
        .get(`/api/v1/projects/${phi}/activities`)
        .set('Authorization', `Bearer ${token}`)
        .expect(200);
      expect(list.body).toHaveLength(0);
    });

    it('rejects bad activity type with 400 VALIDATION_FAILED', async () => {
      const res = await request(app.getHttpServer())
        .post(`/api/v1/projects/${phi}/activities`)
        .set('Authorization', `Bearer ${token}`)
        .send({ ...sampleActivity, type: 'bogus_type' })
        .expect(400);
      expect(res.body.error.code).toBe('VALIDATION_FAILED');
    });

    it('returns 404 ACTIVITY_NOT_FOUND for unknown id', async () => {
      const res = await request(app.getHttpServer())
        .delete(`/api/v1/projects/${phi}/activities/507f1f77bcf86cd799439011`)
        .set('Authorization', `Bearer ${token}`)
        .expect(404);
      expect(res.body.error.code).toBe('ACTIVITY_NOT_FOUND');
    });

    it('returns 403 PROJECT_ACCESS_FORBIDDEN for non-owner', async () => {
      const intruder = await request(app.getHttpServer())
        .post('/api/v1/auth/register')
        .send({ email: `intruder-${Date.now()}@htx.test`, password: VALID_PASSWORD })
        .expect(201);
      const res = await request(app.getHttpServer())
        .post(`/api/v1/projects/${phi}/activities`)
        .set('Authorization', `Bearer ${intruder.body.accessToken}`)
        .send(sampleActivity)
        .expect(403);
      expect(res.body.error.code).toBe('PROJECT_ACCESS_FORBIDDEN');
    });
  });

  describe('Certifications', () => {
    it('POST /projects/:phi/certifications attaches a cert', async () => {
      const created = await request(app.getHttpServer())
        .post(`/api/v1/projects/${phi}/certifications`)
        .set('Authorization', `Bearer ${token}`)
        .send(sampleCert)
        .expect(201);
      expect(created.body.id).toMatch(/^[a-f0-9]{24}$/);

      const list = await request(app.getHttpServer())
        .get(`/api/v1/projects/${phi}/certifications`)
        .set('Authorization', `Bearer ${token}`)
        .expect(200);
      expect(list.body[0].name).toBe('VietGAP');
    });

    it('rejects expiryDate < issueDate with 400', async () => {
      const res = await request(app.getHttpServer())
        .post(`/api/v1/projects/${phi}/certifications`)
        .set('Authorization', `Bearer ${token}`)
        .send({ ...sampleCert, expiryDate: '2025-01-01T00:00:00.000Z' })
        .expect(400);
      expect(res.body.error.code).toBe('VALIDATION_FAILED');
    });

    it('returns 404 CERTIFICATION_NOT_FOUND for unknown id', async () => {
      const res = await request(app.getHttpServer())
        .delete(`/api/v1/projects/${phi}/certifications/507f1f77bcf86cd799439011`)
        .set('Authorization', `Bearer ${token}`)
        .expect(404);
      expect(res.body.error.code).toBe('CERTIFICATION_NOT_FOUND');
    });
  });
});
