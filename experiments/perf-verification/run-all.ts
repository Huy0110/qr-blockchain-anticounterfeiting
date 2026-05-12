#!/usr/bin/env tsx
/**
 * Convenience: run all four perf-verification sub-experiments in
 * sequence sharing one RUN_ID. The orchestrator (`exp:all`) prefers
 * to invoke them individually so it can fail-fast on each, but
 * `pnpm exp:perf-verification` from the CLI uses this entry.
 */

import { spawn } from 'node:child_process';
import { resolveRunId } from '../lib/run-id.ts';

const SCRIPTS = [
  'run-public.ts',
  'run-private-valid.ts',
  'run-private-invalid.ts',
  'run-private-redeemed.ts',
];

function spawnAndWait(script: string, runId: string, extraArgs: string[]): Promise<number> {
  return new Promise((resolve) => {
    const child = spawn('tsx', [`perf-verification/${script}`, '--run-id', runId, ...extraArgs], {
      stdio: 'inherit',
    });
    child.on('exit', (code) => resolve(code ?? 1));
  });
}

async function main(): Promise<void> {
  const runId = resolveRunId();
  // Forward unknown CLI args (--trials, --network) to children.
  const extra = process.argv.slice(2).filter((a, i, arr) => {
    if (a === '--run-id') return false;
    if (i > 0 && arr[i - 1] === '--run-id') return false;
    return true;
  });
  for (const script of SCRIPTS) {
    const code = await spawnAndWait(script, runId, extra);
    if (code !== 0) {
      // eslint-disable-next-line no-console
      console.error(`${script} exited ${code}`);
      process.exit(code);
    }
  }
}

void main();
