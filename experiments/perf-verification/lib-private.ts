/**
 * Shared helper for the three private-scan sub-experiments. They share
 * the same wire shape (POST /scan/private with {projectId, secretId})
 * and only differ in the sid generation strategy.
 */

import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { runTrials } from '../lib/runner.ts';
import { summarize } from '../lib/stats.ts';
import { writeCsv } from '../lib/csv.ts';
import { writeBoxPlot } from '../lib/plot.ts';

export interface PrivateRow {
  trial: number;
  ms: number;
  outcome: string;
  status: number;
}

const HUB_BASE = process.env.HUB_BASE_URL ?? 'http://localhost:3000/api/v1';

export async function runPrivateScanTrials(args: {
  label: string;
  reproduces: string;
  trials: number;
  network: string;
  runId: string;
  /** Returns (projectId, secretId) for the trial-th call. */
  pair: (trial: number) => { projectId: string; secretId: string };
  /** Result subdirectory under results/<runId>/perf-verification/. */
  subdir: 'private-valid' | 'private-invalid' | 'private-redeemed';
}): Promise<void> {
  const { label, trials, network, runId, pair, subdir, reproduces } = args;

  const results = await runTrials(label, { n: trials, retries: 1, intervalMs: 200 }, async (i) => {
    const { projectId, secretId } = pair(i);
    const t0 = performance.now();
    const res = await fetch(`${HUB_BASE}/scan/private`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({ projectId, secretId }),
    });
    const json = (await res.json().catch(() => ({}))) as { status?: string };
    return {
      trial: i,
      ms: performance.now() - t0,
      outcome: json.status ?? 'UNKNOWN',
      status: res.status,
    } satisfies PrivateRow;
  });
  const rows = results.map((r) => r.value);
  const sum = summarize(rows.map((r) => r.ms));

  const dir = join(process.cwd(), 'results', runId, 'perf-verification', subdir);
  mkdirSync(dir, { recursive: true });
  writeCsv(join(dir, 'raw.csv'), rows);
  writeFileSync(
    join(dir, 'summary.json'),
    JSON.stringify(
      { experiment: label, reproduces, runId, network, trials, summary: sum },
      null,
      2,
    ),
  );
  await writeBoxPlot(join(dir, 'plot.png'), {
    title: `${label} (n=${trials}, ${network})`,
    yLabel: 'ms',
    buckets: [{ label: subdir, values: rows.map((r) => r.ms) }],
  });

  // eslint-disable-next-line no-console
  console.log(`\nDone. mean = ${sum.mean.toFixed(0)} ms, median = ${sum.median.toFixed(0)} ms`);
  // eslint-disable-next-line no-console
  console.log(`Outputs: ${dir}`);
}
