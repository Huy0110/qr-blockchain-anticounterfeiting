/**
 * Trial runner: invoke `fn` N times, collect timings (ms), retry on
 * transient failures up to `retries` times. Each trial gets a fresh
 * trial index so the function can derive deterministic test data.
 */

export interface TrialResult<T> {
  trial: number;
  ms: number;
  value: T;
  attempts: number;
}

export interface RunOptions {
  /** Number of successful trials to collect. */
  n: number;
  /** Per-trial retry budget for transient errors (default: 2). */
  retries?: number;
  /** Sleep between trials, ms (default: 0). */
  intervalMs?: number;
  /** Optional progress callback (called before each trial starts). */
  onProgress?: (trial: number, n: number) => void;
}

export async function runTrials<T>(
  label: string,
  opts: RunOptions,
  fn: (trial: number) => Promise<T>,
): Promise<TrialResult<T>[]> {
  const { n, retries = 2, intervalMs = 0, onProgress } = opts;
  const results: TrialResult<T>[] = [];
  for (let trial = 0; trial < n; trial += 1) {
    onProgress?.(trial, n);
    let lastErr: unknown;
    for (let attempt = 0; attempt <= retries; attempt += 1) {
      const start = performance.now();
      try {
        const value = await fn(trial);
        const ms = performance.now() - start;
        results.push({ trial, ms, value, attempts: attempt + 1 });
        break;
      } catch (err) {
        lastErr = err;
        if (attempt === retries) {
          throw new Error(
            `[${label}] trial ${trial} failed after ${attempt + 1} attempts: ${
              (err as Error)?.message ?? String(err)
            }`,
          );
        }
      }
    }
    if (intervalMs > 0 && trial < n - 1) {
      await sleep(intervalMs);
    }
    void lastErr;
  }
  return results;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
