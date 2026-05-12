import { describe, it, expect } from 'vitest';
import { summarize } from '../lib/stats';

describe('summarize', () => {
  it('returns zeros for an empty sample', () => {
    const s = summarize([]);
    expect(s).toEqual({
      n: 0,
      mean: 0,
      stdDev: 0,
      min: 0,
      max: 0,
      median: 0,
      ci95Low: 0,
      ci95High: 0,
    });
  });

  it('computes mean/stdDev/median for [1,2,3,4,5]', () => {
    const s = summarize([1, 2, 3, 4, 5]);
    expect(s.n).toBe(5);
    expect(s.mean).toBe(3);
    // Sample stdDev with n-1 denominator: sqrt((4+1+0+1+4)/4) = sqrt(2.5)
    expect(s.stdDev).toBeCloseTo(Math.sqrt(2.5), 6);
    expect(s.min).toBe(1);
    expect(s.max).toBe(5);
    expect(s.median).toBe(3);
  });

  it('computes the median for an even-sized sample as the mean of the two middles', () => {
    const s = summarize([1, 2, 3, 4]);
    expect(s.median).toBe(2.5);
  });

  it('produces a 95% CI symmetric around the mean', () => {
    const s = summarize([10, 12, 14, 11, 13]);
    expect(s.ci95Low).toBeLessThan(s.mean);
    expect(s.ci95High).toBeGreaterThan(s.mean);
    expect(s.ci95High - s.mean).toBeCloseTo(s.mean - s.ci95Low, 8);
  });

  it('handles a single-value sample (stdDev=0, CI=mean)', () => {
    const s = summarize([42]);
    expect(s.mean).toBe(42);
    expect(s.stdDev).toBe(0);
    expect(s.ci95Low).toBe(42);
    expect(s.ci95High).toBe(42);
  });
});
