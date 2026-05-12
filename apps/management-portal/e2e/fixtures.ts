import type { Page } from '@playwright/test';
import type { ProjectMetadata } from '@qr-bc/shared';

const PHI_A = `0x${'a'.repeat(64)}`;
const PHI_B = `0x${'b'.repeat(64)}`;

export const FIXTURE_PHI_A = PHI_A;
export const FIXTURE_PHI_B = PHI_B;

const sampleProject = (overrides: Partial<ProjectMetadata> = {}): ProjectMetadata => ({
  projectId: PHI_A as `0x${string}`,
  cooperativeName: 'HTX E2E Vân Nội',
  vegetableType: 'rau muống',
  cultivationLocation: {
    address: 'Đông Anh',
    province: 'Hà Nội',
    coordinates: { lat: 21.1372, lng: 105.8225 },
  },
  startDate: new Date('2026-01-01T00:00:00.000Z'),
  harvestDate: new Date('2026-04-01T00:00:00.000Z'),
  cultivationArea: 1500,
  expectedOutput: 800,
  description: 'E2E demo',
  cultivationActivities: [],
  certifications: [],
  imageUrls: [],
  status: 'harvesting',
  ownerProducerId: 'producer-1',
  createdAt: new Date('2026-01-01T00:00:00.000Z'),
  updatedAt: new Date('2026-01-01T00:00:00.000Z'),
  ...overrides,
});

interface ServerState {
  projects: Map<string, ProjectMetadata>;
  authed: boolean;
}

/**
 * Inject mock-hub auth + project endpoints. Mounts a `mockHub` server-state
 * so tests can:
 *   - login as producer-1 (anything works)
 *   - list/create/update/delete /projects
 *   - simulate a 409 on update via opts.conflict
 */
export async function mockHub(
  page: Page,
  opts: { conflict?: boolean; seed?: ProjectMetadata[] } = {},
): Promise<ServerState> {
  const state: ServerState = {
    projects: new Map(),
    authed: false,
  };
  for (const p of opts.seed ?? [sampleProject()]) {
    state.projects.set(p.projectId, p);
  }

  // Auth — accept any credentials, hand back a token bundle.
  await page.route('**/api/v1/auth/login', async (route) => {
    state.authed = true;
    await route.fulfill({
      status: 200,
      json: {
        accessToken: 'e2e-access',
        refreshToken: 'e2e-refresh',
        accessTokenExpiresInSec: 3600,
        producerId: 'producer-1',
        email: 'producer@example.test',
      },
    });
  });
  await page.route('**/api/v1/auth/register', async (route) => {
    state.authed = true;
    await route.fulfill({
      status: 201,
      json: {
        accessToken: 'e2e-access',
        refreshToken: 'e2e-refresh',
        accessTokenExpiresInSec: 3600,
        producerId: 'producer-1',
        email: 'producer@example.test',
      },
    });
  });

  // Sub-resource state — held in closure so the projects route can hit
  // them inline (Playwright route fallback behaviour is version-dependent;
  // a single handler is portable).
  const activities = new Map<string, Array<Record<string, unknown> & { _id: string }>>();
  const certifications = new Map<string, Array<Record<string, unknown> & { _id: string }>>();

  await page.route('**/api/v1/projects**', async (route) => {
    const req = route.request();
    const url = new URL(req.url());

    // ---- Sub-resource routing first ----
    const subMatch = url.pathname.match(
      /\/projects\/(0x[0-9a-fA-F]{64})\/(activities|certifications|images)(?:\/([^/]+))?$/,
    );
    if (subMatch) {
      const projPhi = subMatch[1] ?? '';
      const kind = subMatch[2];
      const subId = subMatch[3];
      if (kind === 'activities') {
        if (req.method() === 'GET' && !subId) {
          await route.fulfill({ status: 200, json: { items: activities.get(projPhi) ?? [] } });
          return;
        }
        if (req.method() === 'POST' && !subId) {
          const body = JSON.parse(req.postData() ?? '{}');
          const created = { ...body, _id: `act-${Date.now()}-${Math.random()}` };
          const arr = activities.get(projPhi) ?? [];
          arr.push(created);
          activities.set(projPhi, arr);
          await route.fulfill({ status: 201, json: created });
          return;
        }
        if (req.method() === 'DELETE' && subId) {
          activities.set(
            projPhi,
            (activities.get(projPhi) ?? []).filter((a) => a._id !== subId),
          );
          await route.fulfill({ status: 204 });
          return;
        }
      } else if (kind === 'certifications') {
        if (req.method() === 'GET' && !subId) {
          await route.fulfill({ status: 200, json: { items: certifications.get(projPhi) ?? [] } });
          return;
        }
        if (req.method() === 'POST' && !subId) {
          const body = JSON.parse(req.postData() ?? '{}');
          const created = { ...body, _id: `cert-${Date.now()}-${Math.random()}` };
          const arr = certifications.get(projPhi) ?? [];
          arr.push(created);
          certifications.set(projPhi, arr);
          await route.fulfill({ status: 201, json: created });
          return;
        }
        if (req.method() === 'DELETE' && subId) {
          certifications.set(
            projPhi,
            (certifications.get(projPhi) ?? []).filter((a) => a._id !== subId),
          );
          await route.fulfill({ status: 204 });
          return;
        }
      } else if (kind === 'images' && req.method() === 'POST') {
        await route.fulfill({
          status: 201,
          json: { items: [{ url: 'ipfs://placeholder/stub' }] },
        });
        return;
      }
      await route.fulfill({ status: 404 });
      return;
    }

    // Cert PDF upload — single-file POST returns one IPFS URL.
    const certUploadMatch = url.pathname.match(/\/projects\/(0x[0-9a-fA-F]{64})\/uploads\/cert$/);
    if (certUploadMatch && req.method() === 'POST') {
      await route.fulfill({
        status: 201,
        json: { url: 'ipfs://placeholder/cert.pdf' },
      });
      return;
    }

    // Verifications stats — owner-scoped analytics.
    const verifMatch = url.pathname.match(/\/projects\/(0x[0-9a-fA-F]{64})\/verifications\/stats$/);
    if (verifMatch) {
      const today = new Date();
      const daily = Array.from({ length: 30 }, (_, i) => {
        const d = new Date(today.getTime() - (29 - i) * 24 * 60 * 60 * 1000);
        return {
          date: d.toISOString().slice(0, 10),
          authentic: i === 29 ? 5 : i === 28 ? 3 : 0,
          alreadyVerified: i === 29 ? 1 : 0,
          counterfeit: i === 29 ? 1 : 0,
        };
      });
      await route.fulfill({
        status: 200,
        json: {
          totals: { authentic: 8, alreadyVerified: 1, counterfeit: 1 },
          daily,
          recent: [
            {
              outcome: 'AUTHENTIC',
              txHash: `0x${'a'.repeat(64)}`,
              scannedAt: new Date().toISOString(),
            },
            {
              outcome: 'COUNTERFEIT',
              scannedAt: new Date(Date.now() - 60_000).toISOString(),
            },
          ],
        },
      });
      return;
    }

    // Batches sub-resource — POST returns a fake ZIP with X-Tx-Hash,
    // GET returns a stub list.
    const batchMatch = url.pathname.match(/\/projects\/(0x[0-9a-fA-F]{64})\/batches$/);
    if (batchMatch) {
      if (req.method() === 'GET') {
        await route.fulfill({
          status: 200,
          json: {
            items: [
              {
                count: 5,
                status: 'confirmed',
                txHash: `0x${'d'.repeat(64)}`,
                createdAt: new Date().toISOString(),
              },
            ],
            note: 'Fake stub for E2E.',
          },
        });
        return;
      }
      if (req.method() === 'POST') {
        // Minimal fake ZIP body — Playwright doesn't validate magic bytes.
        const fakeZip = Buffer.from(
          'PK\x05\x06\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00',
        );
        await route.fulfill({
          status: 200,
          headers: {
            'Content-Type': 'application/zip',
            'Content-Disposition': `attachment; filename="batch.zip"`,
            'X-Tx-Hash': `0x${'a'.repeat(64)}`,
          },
          body: fakeZip,
        });
        return;
      }
    }

    const phiMatch = url.pathname.match(/\/projects\/(0x[0-9a-fA-F]{64})$/);

    if (req.method() === 'GET' && url.pathname.endsWith('/projects')) {
      await route.fulfill({
        status: 200,
        json: { items: Array.from(state.projects.values()), total: state.projects.size },
      });
      return;
    }
    if (req.method() === 'GET' && phiMatch) {
      const proj = state.projects.get(phiMatch[1] ?? '');
      if (!proj) {
        await route.fulfill({ status: 404, json: { error: { code: 'PROJECT_NOT_FOUND' } } });
      } else {
        await route.fulfill({ status: 200, json: proj });
      }
      return;
    }
    if (req.method() === 'POST' && url.pathname.endsWith('/projects')) {
      const body = JSON.parse(req.postData() ?? '{}') as Partial<ProjectMetadata>;
      const phi = `0x${'c'.repeat(64)}` as `0x${string}`;
      const created = sampleProject({
        projectId: phi,
        cooperativeName: body.cooperativeName ?? 'unnamed',
        vegetableType: body.vegetableType ?? 'unknown',
        cultivationLocation: body.cultivationLocation ?? { address: '', province: '' },
        cultivationArea: body.cultivationArea ?? 0,
        expectedOutput: body.expectedOutput ?? 0,
        description: body.description ?? '',
        status: 'in_progress',
        startDate: body.startDate ? new Date(body.startDate) : new Date(),
        harvestDate: body.harvestDate ? new Date(body.harvestDate) : new Date(),
      });
      state.projects.set(phi, created);
      await route.fulfill({ status: 201, json: created });
      return;
    }
    if (req.method() === 'PATCH' && phiMatch) {
      if (opts.conflict) {
        await route.fulfill({ status: 409, json: { error: { code: 'CONFLICT' } } });
        return;
      }
      const proj = state.projects.get(phiMatch[1] ?? '');
      if (!proj) {
        await route.fulfill({ status: 404 });
        return;
      }
      const body = JSON.parse(req.postData() ?? '{}') as Partial<ProjectMetadata>;
      const updated = { ...proj, ...body, updatedAt: new Date() };
      state.projects.set(phiMatch[1] ?? '', updated);
      await route.fulfill({ status: 200, json: updated });
      return;
    }
    if (req.method() === 'DELETE' && phiMatch) {
      state.projects.delete(phiMatch[1] ?? '');
      await route.fulfill({ status: 204 });
      return;
    }
    await route.fulfill({ status: 404 });
  });

  return state;
}

/** Sign-in helper that posts directly to NextAuth's credentials endpoint. */
export async function signInAsProducer(page: Page): Promise<void> {
  await page.goto('/vi/login');
  await page.getByLabel('Email').fill('producer@example.test');
  await page.getByLabel('Mật khẩu').fill('password1');
  await page.getByRole('button', { name: /Đăng nhập/ }).click();
  // Wait until the dashboard route is reached.
  await page.waitForURL(/\/(vi|en)\/dashboard/, { timeout: 10_000 });
}
