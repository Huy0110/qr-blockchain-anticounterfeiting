#!/usr/bin/env tsx
/**
 * F6.2a — Public scan latency. Reproduces Paper Table 3 row 2 ("Public
 * scan ~5 s on Amoy"). Hits the hub's `GET /scan/public/:phi` endpoint
 * for a known-public project. Requires HUB_BASE_URL + a seeded phi
 * via SEED_PHI env var (or the default seed phi the hub ships).
 */

import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { runTrials } from '../lib/runner.ts';
import { summarize } from '../lib/stats.ts';
import { writeCsv } from '../lib/csv.ts';
import { writeBoxPlot } from '../lib/plot.ts';
import { resolveRunId, readNumberFlag, readStringFlag } from '../lib/run-id.ts';
import { printPaperHeader } from '../lib/header.ts';

const HUB_BASE = process.env.HUB_BASE_URL ?? 'http://localhost:3000/api/v1';
const SEED_PHI = process.env.SEED_PHI ?? `0x${'a'.repeat(64)}`; // override per the seeded fixture

interface Row {
  trial: number;
  ms: number;
  status: number;
}

async function trial(idx: number): Promise<Row> {
  const t0 = performance.now();
  const res = await fetch(`${HUB_BASE}/scan/public/${SEED_PHI}`, {
    headers: { Accept: 'application/json' },
  });
  await res.json().catch(() => undefined);
  const ms = performance.now() - t0;
  return { trial: idx, ms, status: res.status };
}

async function main(): Promise<void> {
  const trials = readNumberFlag('--trials', 30);
  const network = readStringFlag('--network', 'hardhat');
  const runId = resolveRunId();
  printPaperHeader({
    experiment: 'perf-verification.public',
    reproduces: 'Paper Table 3 row 2 — public scan latency',
    network,
    trials,
    runId,
  });

  const results = await runTrials('perf-public', { n: trials, retries: 1, intervalMs: 100 }, trial);
  const rows = results.map((r) => r.value);
  const sum = summarize(rows.map((r) => r.ms));

  const dir = join(process.cwd(), 'results', runId, 'perf-verification', 'public');
  mkdirSync(dir, { recursive: true });
  writeCsv(join(dir, 'raw.csv'), rows);
  writeFileSync(
    join(dir, 'summary.json'),
    JSON.stringify(
      {
        experiment: 'perf-verification.public',
        reproduces: 'Paper Table 3 row 2',
        runId,
        network,
        trials,
        seedPhi: SEED_PHI,
        summary: sum,
      },
      null,
      2,
    ),
  );
  await writeBoxPlot(join(dir, 'plot.png'), {
    title: `public-scan latency (n=${trials}, ${network})`,
    yLabel: 'ms',
    buckets: [{ label: 'public', values: rows.map((r) => r.ms) }],
  });

  // eslint-disable-next-line no-console
  console.log(`\nDone. mean = ${sum.mean.toFixed(0)} ms, median = ${sum.median.toFixed(0)} ms`);
  // eslint-disable-next-line no-console
  console.log(`Outputs: ${dir}`);
}

void main().catch((err) => {
  // eslint-disable-next-line no-console
  console.error(err);
  process.exit(1);
});
