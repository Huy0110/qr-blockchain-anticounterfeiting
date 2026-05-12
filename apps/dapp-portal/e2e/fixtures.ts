import type { Page } from '@playwright/test';

const PHI = '0x' + 'a'.repeat(64);

const sampleProject = {
  projectId: PHI,
  cooperativeName: 'HTX Vân Nội (E2E)',
  vegetableType: 'rau muống',
  cultivationLocation: {
    address: 'Đông Anh',
    province: 'Hà Nội',
    coordinates: { lat: 21.1372, lng: 105.8225 },
  },
  startDate: '2026-01-01T00:00:00.000Z',
  harvestDate: '2026-04-01T00:00:00.000Z',
  cultivationArea: 1500,
  expectedOutput: 800,
  description: 'E2E demo project',
  cultivationActivities: [
    {
      type: 'planting',
      activityDate: '2026-01-15T00:00:00.000Z',
      name: 'Gieo hạt',
      description: 'Lứa đầu',
    },
    {
      type: 'harvesting',
      activityDate: '2026-03-30T00:00:00.000Z',
      name: 'Thu hoạch',
      description: 'Lứa đầu',
    },
  ],
  certifications: [
    {
      name: 'VietGAP',
      issuer: 'Bộ NN&PTNT',
      issueDate: '2025-08-01T00:00:00.000Z',
      expiryDate: '2028-08-01T00:00:00.000Z',
    },
  ],
  imageUrls: [],
  status: 'harvesting',
  ownerProducerId: 'producer-1',
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-04-01T00:00:00.000Z',
};

const projectNoCoords = { ...sampleProject, cultivationLocation: { address: 'X', province: 'Y' } };

/** Intercept hub calls so the dApp tests don't require a live API. */
export async function mockHub(page: Page, opts: { withCoords?: boolean } = {}): Promise<void> {
  const body = opts.withCoords === false ? projectNoCoords : sampleProject;
  await page.route('**/api/v1/scan/public/0x*', async (route) => {
    const url = new URL(route.request().url());
    if (url.pathname.endsWith(PHI)) {
      await route.fulfill({ status: 200, json: body });
    } else {
      await route.fulfill({
        status: 404,
        json: {
          error: { code: 'PROJECT_NOT_FOUND', message: 'not found', requestId: 'test' },
        },
      });
    }
  });
}

export const FIXTURE_PHI = PHI;
