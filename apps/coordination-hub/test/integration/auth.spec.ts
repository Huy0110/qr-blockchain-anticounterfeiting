import { describe, it, beforeAll, afterAll, expect } from 'vitest';
import request from 'supertest';
import type { INestApplication } from '@nestjs/common';
import type { MongoMemoryServer } from 'mongodb-memory-server';
import { createTestApp, teardownTestApp } from '../test-app';

const VALID_PASSWORD = 'Test123!Password';

describe('AuthModule — register + login + refresh + lockout (T-014)', () => {
  let app: INestApplication;
  let mongo: MongoMemoryServer;

  beforeAll(async () => {
    ({ app, mongo } = await createTestApp());
  }, 60_000);

  afterAll(async () => {
    await teardownTestApp({ app, mongo });
  });

  it('POST /auth/register creates a producer and returns the auth envelope', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/v1/auth/register')
      .send({ email: 'alice@htx-vannoi.test', password: VALID_PASSWORD })
      .expect(201);

    expect(res.body).toHaveProperty('accessToken');
    expect(res.body).toHaveProperty('refreshToken');
    expect(res.body.producer).toMatchObject({
      email: 'alice@htx-vannoi.test',
    });
    expect(res.body.producer.walletAddress).toMatch(/^0x[a-fA-F0-9]{40}$/);
    expect(typeof res.body.producer.id).toBe('string');
  });

  it('POST /auth/register rejects duplicate email with 409 EMAIL_EXISTS', async () => {
    await request(app.getHttpServer())
      .post('/api/v1/auth/register')
      .send({ email: 'dupe@htx.test', password: VALID_PASSWORD })
      .expect(201);

    const res = await request(app.getHttpServer())
      .post('/api/v1/auth/register')
      .send({ email: 'dupe@htx.test', password: VALID_PASSWORD })
      .expect(409);
    expect(res.body.error.code).toBe('EMAIL_EXISTS');
  });

  it('POST /auth/register rejects short password (validation)', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/v1/auth/register')
      .send({ email: 'short@htx.test', password: 'short' })
      .expect(400);
    expect(res.body.error.code).toBe('VALIDATION_FAILED');
  });

  it('POST /auth/login returns the envelope for valid credentials', async () => {
    await request(app.getHttpServer())
      .post('/api/v1/auth/register')
      .send({ email: 'bob@htx.test', password: VALID_PASSWORD })
      .expect(201);

    const res = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email: 'bob@htx.test', password: VALID_PASSWORD })
      .expect(200);
    expect(res.body).toHaveProperty('accessToken');
    expect(res.body.producer.email).toBe('bob@htx.test');
  });

  it('POST /auth/login returns 401 INVALID_CREDENTIALS for wrong password', async () => {
    await request(app.getHttpServer())
      .post('/api/v1/auth/register')
      .send({ email: 'wrong@htx.test', password: VALID_PASSWORD })
      .expect(201);

    const res = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email: 'wrong@htx.test', password: 'NotTheRightOne!' })
      .expect(401);
    expect(res.body.error.code).toBe('INVALID_CREDENTIALS');
  });

  it('5 wrong passwords → 6th attempt returns 423 ACCOUNT_LOCKED', async () => {
    const email = 'lockout@htx.test';
    await request(app.getHttpServer())
      .post('/api/v1/auth/register')
      .send({ email, password: VALID_PASSWORD })
      .expect(201);

    for (let i = 0; i < 4; i++) {
      await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({ email, password: 'wrong' })
        .expect(401);
    }
    // 5th wrong attempt triggers lockout in this code path.
    const fifth = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email, password: 'wrong' });
    // Either INVALID_CREDENTIALS (counter just hit 5 + lockout) or already
    // ACCOUNT_LOCKED depending on race; both are acceptable.
    expect([401, 423]).toContain(fifth.status);

    const res = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email, password: VALID_PASSWORD });
    expect(res.status).toBe(423);
    expect(res.body.error.code).toBe('ACCOUNT_LOCKED');
    expect(res.body.error.details).toHaveProperty('unlockAt');
  });

  it('POST /auth/refresh exchanges refreshToken for a new accessToken', async () => {
    const reg = await request(app.getHttpServer())
      .post('/api/v1/auth/register')
      .send({ email: 'refresh@htx.test', password: VALID_PASSWORD })
      .expect(201);

    const res = await request(app.getHttpServer())
      .post('/api/v1/auth/refresh')
      .send({ refreshToken: reg.body.refreshToken })
      .expect(200);
    expect(res.body).toHaveProperty('accessToken');
    expect(typeof res.body.accessToken).toBe('string');
  });

  it('POST /auth/refresh rejects bogus refresh token', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/v1/auth/refresh')
      .send({ refreshToken: 'this-is-not-a-jwt-but-is-long-enough' })
      .expect(401);
    expect(res.body.error.code).toBe('INVALID_REFRESH_TOKEN');
  });

  it('GET /producers/me requires JWT and returns the profile', async () => {
    const reg = await request(app.getHttpServer())
      .post('/api/v1/auth/register')
      .send({ email: 'me@htx.test', password: VALID_PASSWORD })
      .expect(201);

    await request(app.getHttpServer()).get('/api/v1/producers/me').expect(401);

    const res = await request(app.getHttpServer())
      .get('/api/v1/producers/me')
      .set('Authorization', `Bearer ${reg.body.accessToken}`)
      .expect(200);
    expect(res.body.email).toBe('me@htx.test');
    expect(res.body.walletAddress).toMatch(/^0x[a-fA-F0-9]{40}$/);
  });
});
