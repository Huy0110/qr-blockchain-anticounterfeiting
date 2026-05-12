import { describe, it, expect } from 'vitest';
import { estimateCost } from '@/lib/batch-api';

describe('estimateCost', () => {
  it('grows linearly with N', () => {
    const c10 = estimateCost(10);
    const c100 = estimateCost(100);
    expect(c100.gasGwei).toBeCloseTo(c10.gasGwei * 10, 5);
    expect(c100.matic).toBeCloseTo(c10.matic * 10, 4);
  });

  it('rounds matic to 4 decimal places', () => {
    const c = estimateCost(13);
    // 13 * 50_000 * 30 / 1e18 * 1e9 = 0.0195 in our heuristic
    expect(c.matic).toBeCloseTo(0.0195, 4);
    // No more than 4 decimals.
    const decimals = (c.matic.toString().split('.')[1] ?? '').length;
    expect(decimals).toBeLessThanOrEqual(4);
  });

  it('returns finite positive values for N=1 and N=500', () => {
    for (const n of [1, 500]) {
      const c = estimateCost(n);
      expect(c.gasGwei).toBeGreaterThan(0);
      expect(c.matic).toBeGreaterThan(0);
      expect(Number.isFinite(c.gasGwei)).toBe(true);
      expect(Number.isFinite(c.matic)).toBe(true);
    }
  });
});
