#!/usr/bin/env tsx
/**
 * F6.2d — Private scan for already-redeemed sids. Same paper row 4
 * bucket as invalid scans but exercising the ALREADY_VERIFIED path:
 * the hub finds the prior log entry and short-circuits without
 * submitting a tx.
 *
 * Reads the same VALID_SIDS_PATH and assumes each sid has been
 * redeemed once before this run (the seed script does this).
 */

import { readFileSync } from 'node:fs';
import { runPrivateScanTrials } from './lib-private.ts';
import { resolveRunId, readNumberFlag, readStringFlag } from '../lib/run-id.ts';
import { printPaperHeader } from '../lib/header.ts';

interface Pair {
  projectId: string;
  secretId: string;
}

function loadPairs(): Pair[] {
  const path = process.env.REDEEMED_SIDS_PATH ?? process.env.VALID_SIDS_PATH;
  if (!path) {
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
    if (!projectId || !secretId) throw new Error(`bad sids file line: ${l}`);
    return { projectId, secretId };
  });
}

async function main(): Promise<void> {
  const trials = readNumberFlag('--trials', 30);
  const network = readStringFlag('--network', 'hardhat');
  const runId = resolveRunId();
  printPaperHeader({
    experiment: 'perf-verification.private-redeemed',
    reproduces: 'Paper Table 3 row 4 — already-verified path',
    network,
    trials,
    runId,
  });

  const pairs = loadPairs();
  if (pairs.length < trials) {
    throw new Error(`Need ${trials} pairs, got ${pairs.length}`);
  }

  await runPrivateScanTrials({
    label: 'perf-private-redeemed',
    reproduces: 'Paper Table 3 row 4 (already-verified)',
    trials,
    network,
    runId,
    pair: (i) => pairs[i] as Pair,
    subdir: 'private-redeemed',
  });
}

void main().catch((err) => {
  // eslint-disable-next-line no-console
  console.error(err);
  process.exit(1);
});
