import { describe, it, expect } from 'vitest';
import { ProjectFormSchema, toCreatePayload } from '@/lib/project-schema';

describe('ProjectFormSchema', () => {
  const baseValues = {
    cooperativeName: 'HTX Vân Nội',
    vegetableType: 'rau muống',
    address: 'Đông Anh',
    province: 'Hà Nội',
    startDate: '2026-01-01',
    harvestDate: '2026-04-01',
    cultivationArea: 1500,
    expectedOutput: 800,
    description: '',
  };

  it('accepts a fully-filled form', () => {
    const result = ProjectFormSchema.safeParse(baseValues);
    expect(result.success).toBe(true);
  });

  it('rejects empty required fields with `required` codes', () => {
    const r = ProjectFormSchema.safeParse({ ...baseValues, cooperativeName: '' });
    expect(r.success).toBe(false);
    if (!r.success) {
      const msg = r.error.issues.find((i) => i.path[0] === 'cooperativeName')?.message;
      expect(msg).toBe('required');
    }
  });

  it('rejects harvestDate before startDate with `harvestAfterStart`', () => {
    const r = ProjectFormSchema.safeParse({
      ...baseValues,
      startDate: '2026-04-01',
      harvestDate: '2026-01-01',
    });
    expect(r.success).toBe(false);
    if (!r.success) {
      const issue = r.error.issues.find((i) => i.path[0] === 'harvestDate');
      expect(issue?.message).toBe('harvestAfterStart');
    }
  });

  it('I-6: accepts zero for cultivationArea + expectedOutput (legacy)', () => {
    const r = ProjectFormSchema.safeParse({
      ...baseValues,
      cultivationArea: 0,
      expectedOutput: 0,
    });
    expect(r.success).toBe(true);
  });

  it('rejects negative cultivationArea', () => {
    const r = ProjectFormSchema.safeParse({ ...baseValues, cultivationArea: -10 });
    expect(r.success).toBe(false);
  });

  it('coerces lat/lng strings to numbers and rejects out-of-range', () => {
    const ok = ProjectFormSchema.safeParse({ ...baseValues, lat: 21.5, lng: 105.5 });
    expect(ok.success).toBe(true);
    if (ok.success) {
      expect(ok.data.lat).toBe(21.5);
      expect(ok.data.lng).toBe(105.5);
    }
    const bad = ProjectFormSchema.safeParse({ ...baseValues, lat: 200 });
    expect(bad.success).toBe(false);
  });

  it('treats empty-string lat/lng as undefined', () => {
    const r = ProjectFormSchema.safeParse({ ...baseValues, lat: '', lng: '' });
    expect(r.success).toBe(true);
    if (r.success) {
      expect(r.data.lat).toBeUndefined();
      expect(r.data.lng).toBeUndefined();
    }
  });
});

describe('toCreatePayload', () => {
  const parsed = ProjectFormSchema.parse({
    cooperativeName: 'HTX X',
    vegetableType: 'rau cải',
    address: 'A',
    province: 'B',
    startDate: '2026-01-01',
    harvestDate: '2026-04-01',
    cultivationArea: 500,
    expectedOutput: 200,
    description: 'd',
    lat: 21,
    lng: 105,
  });

  it('serialises dates to ISO and forwards numeric fields', () => {
    const payload = toCreatePayload(parsed);
    expect(payload.startDate).toBe('2026-01-01T00:00:00.000Z');
    expect(payload.harvestDate).toBe('2026-04-01T00:00:00.000Z');
    expect(payload.cultivationArea).toBe(500);
    expect(payload.expectedOutput).toBe(200);
  });

  it('includes coordinates when both lat and lng are set', () => {
    const payload = toCreatePayload(parsed);
    expect(payload.cultivationLocation.coordinates).toEqual({ lat: 21, lng: 105 });
  });

  it('omits coordinates when lat/lng absent', () => {
    const noCoords = ProjectFormSchema.parse({
      cooperativeName: 'HTX X',
      vegetableType: 'rau cải',
      address: 'A',
      province: 'B',
      startDate: '2026-01-01',
      harvestDate: '2026-04-01',
      cultivationArea: 500,
      expectedOutput: 200,
      description: '',
    });
    const payload = toCreatePayload(noCoords);
    expect(payload.cultivationLocation.coordinates).toBeUndefined();
  });

  it('coerces description default to empty string', () => {
    const payload = toCreatePayload(parsed);
    expect(payload.description).toBe('d');
  });
});
