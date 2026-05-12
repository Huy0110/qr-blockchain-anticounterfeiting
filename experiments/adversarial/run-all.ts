#!/usr/bin/env tsx
/**
 * Run all 5 adversarial scripts in sequence under one RUN_ID. Exits
 * 0 only if every sub-test passes (AC-EX-8).
 */

import { spawn } from 'node:child_process';
import { resolveRunId } from '../lib/run-id.ts';

const SCRIPTS = [
  'forge-unknown-sid.ts',
  'replay-redeemed.ts',
  'unauthorized-batch.ts',
  'tampered-hash.ts',
  'race-redeems.ts',
];

function runSpawn(script: string, runId: string, extra: string[]): Promise<number> {
  return new Promise((resolve) => {
    const child = spawn('tsx', [`adversarial/${script}`, '--run-id', runId, ...extra], {
      stdio: 'inherit',
    });
    child.on('exit', (code) => resolve(code ?? 1));
  });
}

async function main(): Promise<void> {
  const runId = resolveRunId();
  const extra = process.argv.slice(2).filter((a, i, arr) => {
    if (a === '--run-id') return false;
    if (i > 0 && arr[i - 1] === '--run-id') return false;
    return true;
  });
  let anyFailed = false;
  for (const s of SCRIPTS) {
    // eslint-disable-next-line no-console
    console.log(`\n=== ${s} ===`);
    const code = await runSpawn(s, runId, extra);
    if (code !== 0) {
      anyFailed = true;
      // eslint-disable-next-line no-console
      console.error(`${s} exited ${code}`);
    }
  }
  if (anyFailed) {
    process.exit(1);
  }
  // eslint-disable-next-line no-console
  console.log(`\nAll 5 adversarial sub-tests passed.`);
}

void main();
