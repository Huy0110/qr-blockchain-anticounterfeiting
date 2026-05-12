#!/usr/bin/env tsx
/**
 * SR2 — once a sid is redeemed, replaying it returns ALREADY_VERIFIED
 * (never AUTHENTIC again). We pick a sid the hub has just redeemed,
 * submit it again, assert the outcome.
 */

import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { resolveRunId, readStringFlag } from '../lib/run-id.ts';
import { printPaperHeader } from '../lib/header.ts';

const HUB_BASE = process.env.HUB_BASE_URL ?? 'http://localhost:3000/api/v1';
const SEED_PHI = process.env.SEED_PHI ?? `0x${'a'.repeat(64)}`;
const REDEEMED_SID = process.env.REDEEMED_SID ?? `0x${'b'.repeat(40)}`;

async function scan(): Promise<{ status?: string }> {
  const res = await fetch(`${HUB_BASE}/scan/private`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify({ projectId: SEED_PHI, secretId: REDEEMED_SID }),
  });
  return (await res.json().catch(() => ({}))) as { status?: string };
}

async function main(): Promise<void> {
  const network = readStringFlag('--network', 'hardhat');
  const runId = resolveRunId();
  printPaperHeader({
    experiment: 'adversarial.replay-redeemed',
    reproduces: 'Paper §3.2 SR2 — replay → ALREADY_VERIFIED',
    network,
    trials: 1,
    runId,
  });

  // First scan: redeem (or recognize as already redeemed).
  const first = await scan();
  // Second scan: must be ALREADY_VERIFIED.
  const second = await scan();
  const ok = second.status === 'ALREADY_VERIFIED';

  const dir = join(process.cwd(), 'results', runId, 'adversarial', 'replay-redeemed');
  mkdirSync(dir, { recursive: true });
  writeFileSync(
    join(dir, 'summary.json'),
    JSON.stringify(
      {
        experiment: 'adversarial.replay-redeemed',
        reproduces: 'Paper §3.2 SR2',
        runId,
        network,
        first: first.status,
        second: second.status,
        pass: ok,
      },
      null,
      2,
    ),
  );

  if (!ok) {
    // eslint-disable-next-line no-console
    console.error(`FAIL: replay returned ${second.status}, expected ALREADY_VERIFIED.`);
    process.exit(1);
  }
  // eslint-disable-next-line no-console
  console.log(`PASS: replay returned ALREADY_VERIFIED.`);
}

void main().catch((err) => {
  // eslint-disable-next-line no-console
  console.error(err);
  process.exit(1);
});
