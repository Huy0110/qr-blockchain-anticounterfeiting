#!/usr/bin/env tsx
/**
 * F6.2b — Private scan latency for valid-but-unredeemed sids.
 * Reproduces Paper Table 3 row 3 ("Private valid ~30 s on Amoy"). Each
 * trial submits a fresh, pre-registered sid so the hub goes through
 * Algorithm 3 phases 1-3 (lookup → submit → confirm).
 *
 * Inputs (env): HUB_BASE_URL, VALID_SIDS_PATH (newline-separated list of
 * `<projectId>:<secretId>` pairs ≥ trials in count). For Hardhat smoke
 * runs, the seed script writes 100 fresh pairs to results/<RUN_ID>/seed.txt.
 */

import { readFileSync } from 'node:fs';
import { runPrivateScanTrials } from './lib-private.ts';
import { resolveRunId, readNumberFlag, readStringFlag } from '../lib/run-id.ts';
import { printPaperHeader } from '../lib/header.ts';

interface Pair {
  projectId: string;
  secretId: string;
}

function loadValidPairs(): Pair[] {
  const path = process.env.VALID_SIDS_PATH;
  if (!path) {
    // Fallback to a deterministic stub so dev-mode smoke can still run.
    // The hub will return COUNTERFEIT for these — useful for shape
    // verification but not real timing.
    return Array.from({ length: 100 }, (_, i) => ({
      projectId: `0x${'a'.repeat(64)}`,
      secretId: `0x${i.toString(16).padStart(64, '0')}`,
    }));
  }
  const lines = readFileSync(path, 'utf8')
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean);
  return lines.map((l) => {
    const [projectId, secretId] = l.split(':');
    if (!projectId || !secretId) throw new Error(`bad VALID_SIDS_PATH line: ${l}`);
    return { projectId, secretId };
  });
}

async function main(): Promise<void> {
  const trials = readNumberFlag('--trials', 30);
  const network = readStringFlag('--network', 'hardhat');
  const runId = resolveRunId();
  printPaperHeader({
    experiment: 'perf-verification.private-valid',
    reproduces: 'Paper Table 3 row 3 — private valid scan latency',
    network,
    trials,
    runId,
  });

  const pairs = loadValidPairs();
  if (pairs.length < trials) {
    throw new Error(`Need ${trials} valid sid pairs, got ${pairs.length}`);
  }

  await runPrivateScanTrials({
    label: 'perf-private-valid',
    reproduces: 'Paper Table 3 row 3',
    trials,
    network,
    runId,
    pair: (i) => pairs[i] as Pair,
    subdir: 'private-valid',
  });
}

void main().catch((err) => {
  // eslint-disable-next-line no-console
  console.error(err);
  process.exit(1);
});
