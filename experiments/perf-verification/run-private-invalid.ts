#!/usr/bin/env tsx
/**
 * F6.2c — Private scan for unknown sids. Reproduces Paper Table 3
 * row 4 ("Private invalid ~4 s on Amoy"). Each trial submits a random
 * sid the hub has never seen → COUNTERFEIT outcome on the fast path
 * (no on-chain submit needed once the lookup misses).
 */

import { randomBytes } from 'node:crypto';
import { runPrivateScanTrials } from './lib-private.ts';
import { resolveRunId, readNumberFlag, readStringFlag } from '../lib/run-id.ts';
import { printPaperHeader } from '../lib/header.ts';

async function main(): Promise<void> {
  const trials = readNumberFlag('--trials', 30);
  const network = readStringFlag('--network', 'hardhat');
  const runId = resolveRunId();
  printPaperHeader({
    experiment: 'perf-verification.private-invalid',
    reproduces: 'Paper Table 3 row 4 — private invalid scan latency',
    network,
    trials,
    runId,
  });

  await runPrivateScanTrials({
    label: 'perf-private-invalid',
    reproduces: 'Paper Table 3 row 4',
    trials,
    network,
    runId,
    pair: () => ({
      projectId: `0x${'a'.repeat(64)}`,
      secretId: `0x${Buffer.from(randomBytes(16)).toString('hex')}`,
    }),
    subdir: 'private-invalid',
  });
}

void main().catch((err) => {
  // eslint-disable-next-line no-console
  console.error(err);
  process.exit(1);
});
