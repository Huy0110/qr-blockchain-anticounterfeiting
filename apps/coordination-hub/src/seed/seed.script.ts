/**
 * Demo seed for the 3 HTX rau projects per gathered-requirements §3.4.
 * Run: pnpm --filter @qr-bc/coordination-hub seed
 *
 * Idempotent: re-running skips producers + projects that already exist.
 * Uses the running hub's REST API (so it exercises the full validation
 * layer) — much simpler than poking Mongo directly. Requires:
 *   - hub running locally on PORT (default 3000)
 *   - MongoDB reachable per MONGO_URI
 *   - CONTRACT_ADDRESS unset in test mode (so registerProject is a no-op)
 *     OR a deployed contract + producer wallet with gas if you want the
 *     on-chain leg to actually fire.
 */
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

interface FixtureFile {
  producerEmail: string;
  project: {
    cooperativeName: string;
    vegetableType: string;
    cultivationLocation: unknown;
    startDate: string;
    harvestDate: string;
    cultivationArea: number;
    expectedOutput: number;
    description: string;
  };
  activities: Array<Record<string, unknown>>;
  certifications: Array<Record<string, unknown>>;
  imageUrls: string[];
}

const SEED_PASSWORD = process.env.SEED_PASSWORD ?? 'DemoSeed!Password123';
const HUB_BASE_URL =
  process.env.SEED_HUB_BASE_URL ?? `http://localhost:${process.env.PORT ?? '3000'}/api/v1`;

async function jsonRequest(
  path: string,
  init: RequestInit & { token?: string } = {},
): Promise<{ status: number; body: unknown }> {
  const headers = new Headers(init.headers ?? {});
  headers.set('Content-Type', 'application/json');
  if (init.token) headers.set('Authorization', `Bearer ${init.token}`);
  const res = await fetch(`${HUB_BASE_URL}${path}`, { ...init, headers });
  const text = await res.text();
  let body: unknown = text;
  try {
    body = JSON.parse(text);
  } catch {
    /* keep as string */
  }
  return { status: res.status, body };
}

interface AuthBody {
  accessToken: string;
  producer: { id: string; email: string; walletAddress: string };
}

async function ensureProducer(email: string): Promise<string> {
  const reg = await jsonRequest('/auth/register', {
    method: 'POST',
    body: JSON.stringify({ email, password: SEED_PASSWORD }),
  });
  if (reg.status === 201) return (reg.body as AuthBody).accessToken;
  if (reg.status === 409) {
    const login = await jsonRequest('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password: SEED_PASSWORD }),
    });
    if (login.status !== 200) {
      throw new Error(
        `Could not login existing seed producer ${email}: ${JSON.stringify(login.body)}`,
      );
    }
    return (login.body as AuthBody).accessToken;
  }
  throw new Error(
    `Register failed for ${email}: status=${reg.status} body=${JSON.stringify(reg.body)}`,
  );
}

async function ensureProject(
  token: string,
  fixture: FixtureFile,
): Promise<{ phi: string; created: boolean }> {
  const list = await jsonRequest('/projects?pageSize=100', { token });
  const existing = (
    list.body as { items: Array<{ projectId: string; cooperativeName: string }> }
  ).items?.find((p) => p.cooperativeName === fixture.project.cooperativeName);
  if (existing) {
    console.log(
      `  ↻ project '${fixture.project.cooperativeName}' already seeded as ${existing.projectId}`,
    );
    return { phi: existing.projectId, created: false };
  }
  const created = await jsonRequest('/projects', {
    method: 'POST',
    token,
    body: JSON.stringify(fixture.project),
  });
  if (created.status !== 201) {
    throw new Error(`Project create failed: ${JSON.stringify(created.body)}`);
  }
  const phi = (created.body as { projectId: string }).projectId;
  console.log(`  + project '${fixture.project.cooperativeName}' -> ${phi}`);
  return { phi, created: true };
}

async function attachActivities(
  token: string,
  phi: string,
  activities: FixtureFile['activities'],
): Promise<void> {
  for (const a of activities) {
    const res = await jsonRequest(`/projects/${phi}/activities`, {
      method: 'POST',
      token,
      body: JSON.stringify(a),
    });
    if (res.status !== 201) {
      console.warn(`    ! activity skipped: ${JSON.stringify(res.body)}`);
    }
  }
}

async function attachCertifications(
  token: string,
  phi: string,
  certs: FixtureFile['certifications'],
): Promise<void> {
  for (const c of certs) {
    const res = await jsonRequest(`/projects/${phi}/certifications`, {
      method: 'POST',
      token,
      body: JSON.stringify(c),
    });
    if (res.status !== 201) {
      console.warn(`    ! certification skipped: ${JSON.stringify(res.body)}`);
    }
  }
}

async function generateSampleBatch(token: string, phi: string): Promise<void> {
  // POST /projects/:phi/batches returns the ZIP as
  // application/zip. We download it just to confirm the registration
  // worked (so the project has 5 redeemable sids on-chain); the actual
  // sids are private and stay in the ZIP. Reviewers who need a sid for
  // E2E scanning should use the management portal's batch wizard.
  const url = `${HUB_BASE_URL}/projects/${phi}/batches`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({ n: 5 }),
  });
  if (res.status !== 200) {
    console.warn(`    ! sample batch skipped (status=${res.status})`);
    return;
  }
  const len = res.headers.get('content-length') ?? '?';
  console.log(`    + sample batch of 5 QR (ZIP ${len} bytes) registered on-chain`);
}

async function main(): Promise<void> {
  // tsconfig is CommonJS so __dirname is built-in. Avoids import.meta which
  // ESM-only Node would expose; tsx handles both but tsc --noEmit would
  // reject import.meta under module=CommonJS.
  const fixturesDir = join(__dirname, 'fixtures');
  const fixtureFiles = readdirSync(fixturesDir).filter((f) => f.endsWith('.json'));

  console.log(`Seeding ${fixtureFiles.length} HTX project(s) into ${HUB_BASE_URL}...\n`);
  for (const file of fixtureFiles) {
    const fixture = JSON.parse(readFileSync(join(fixturesDir, file), 'utf8')) as FixtureFile;
    console.log(`> ${file}`);
    const token = await ensureProducer(fixture.producerEmail);
    const { phi, created } = await ensureProject(token, fixture);
    await attachActivities(token, phi, fixture.activities);
    await attachCertifications(token, phi, fixture.certifications);
    // Idempotency: only mint a sample batch on first creation. Re-runs
    // skip so we don't accumulate hundreds of batches against a
    // long-lived demo hub.
    if (created) await generateSampleBatch(token, phi);
    console.log(
      `  ✓ ${fixture.activities.length} activities + ${fixture.certifications.length} cert(s) attached\n`,
    );
  }
  console.log('Seed complete.');
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
