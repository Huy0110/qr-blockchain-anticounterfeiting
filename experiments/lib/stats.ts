/**
 * Descriptive statistics for trial samples. Confidence intervals use
 * the normal-approximation formula (sample size ≥ ~20 is fine for our
 * 30-trial defaults). For smaller samples a t-distribution would be
 * more conservative; we accept the small skew in exchange for zero
 * external dependencies.
 */

export interface Summary {
  n: number;
  mean: number;
  stdDev: number;
  min: number;
  max: number;
  median: number;
  /** 95% confidence interval — `mean ± 1.96 * stdDev/sqrt(n)`. */
  ci95Low: number;
  ci95High: number;
}

export function summarize(values: readonly number[]): Summary {
  if (values.length === 0) {
    return { n: 0, mean: 0, stdDev: 0, min: 0, max: 0, median: 0, ci95Low: 0, ci95High: 0 };
  }
  const n = values.length;
  const sorted = [...values].sort((a, b) => a - b);
  const mean = values.reduce((s, v) => s + v, 0) / n;
  // Sample variance (Bessel's correction) so n-1 in the denominator.
  const variance = n > 1 ? values.reduce((s, v) => s + (v - mean) ** 2, 0) / (n - 1) : 0;
  const stdDev = Math.sqrt(variance);
  const minV = sorted[0] ?? 0;
  const maxV = sorted[n - 1] ?? 0;
  const median =
    n % 2 === 1
      ? (sorted[(n - 1) / 2] ?? 0)
      : ((sorted[n / 2 - 1] ?? 0) + (sorted[n / 2] ?? 0)) / 2;
  const stdErr = stdDev / Math.sqrt(n);
  const ci95Low = mean - 1.96 * stdErr;
  const ci95High = mean + 1.96 * stdErr;
  return { n, mean, stdDev, min: minV, max: maxV, median, ci95Low, ci95High };
}
