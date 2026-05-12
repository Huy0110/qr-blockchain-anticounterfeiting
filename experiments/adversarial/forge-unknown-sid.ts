#!/usr/bin/env tsx
/**
 * SR2 — forging a fake sid is computationally infeasible. We submit a
 * uniformly-random 128-bit sid the hub has never seen and assert that
 * the response is COUNTERFEIT. With a 100-trial sample this directly
 * reproduces the paper's "0/100 forgery success" claim (Paper §3.2).
 */

import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { randomBytes } from 'node:crypto';
import { resolveRunId, readNumberFlag, readStringFlag } from '../lib/run-id.ts';
import { printPaperHeader } from '../lib/header.ts';

const HUB_BASE = process.env.HUB_BASE_URL ?? 'http://localhost:3000/api/v1';
const SEED_PHI = process.env.SEED_PHI ?? `0x${'a'.repeat(64)}`;

interface AttackResult {
  trial: number;
  outcome: string;
  ok: boolean;
}

async function main(): Promise<void> {
  const trials = readNumberFlag('--trials', 100);
  const network = readStringFlag('--network', 'hardhat');
  const runId = resolveRunId();
  printPaperHeader({
    experiment: 'adversarial.forge-unknown-sid',
    reproduces: 'Paper §3.2 SR2 — forge attempts → COUNTERFEIT',
    network,
    trials,
    runId,
  });

  const results: AttackResult[] = [];
  for (let i = 0; i < trials; i += 1) {
    const sid = `0x${Buffer.from(randomBytes(16)).toString('hex')}`;
    const res = await fetch(`${HUB_BASE}/scan/private`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({ projectId: SEED_PHI, secretId: sid }),
    });
    const j = (await res.json().catch(() => ({}))) as { status?: string };
    const outcome = j.status ?? 'UNKNOWN';
    results.push({ trial: i, outcome, ok: outcome === 'COUNTERFEIT' });
  }

  const successes = results.filter((r) => !r.ok).length;
  const dir = join(process.cwd(), 'results', runId, 'adversarial', 'forge-unknown-sid');
  mkdirSync(dir, { recursive: true });
  writeFileSync(
    join(dir, 'summary.json'),
    JSON.stringify(
      {
        experiment: 'adversarial.forge-unknown-sid',
        reproduces: 'Paper §3.2 SR2',
        runId,
        network,
        trials,
        forgerySuccesses: successes,
        pass: successes === 0,
      },
      null,
      2,
    ),
  );

  if (successes !== 0) {
    // eslint-disable-next-line no-console
    console.error(`FAIL: ${successes}/${trials} random sids returned non-COUNTERFEIT.`);
    process.exit(1);
  }
  // eslint-disable-next-line no-console
  console.log(`PASS: 0/${trials} forgeries succeeded.`);
}

void main().catch((err) => {
  // eslint-disable-next-line no-console
  console.error(err);
  process.exit(1);
});
