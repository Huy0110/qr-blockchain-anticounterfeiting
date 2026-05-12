#!/usr/bin/env tsx
/**
 * F6 umbrella — runs every experiment in sequence under one RUN_ID
 * and emits results/<RUN_ID>/SUMMARY.md comparing paper claims with
 * measured values (AC-EX-9).
 */

import { spawn } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { resolveRunId, readStringFlag } from '../lib/run-id.ts';

const PIPELINE: Array<{ name: string; script: string; required: boolean }> = [
  { name: 'perf-registration', script: 'perf-registration/run.ts', required: true },
  { name: 'perf-verification.public', script: 'perf-verification/run-public.ts', required: false },
  {
    name: 'perf-verification.private-valid',
    script: 'perf-verification/run-private-valid.ts',
    required: false,
  },
  {
    name: 'perf-verification.private-invalid',
    script: 'perf-verification/run-private-invalid.ts',
    required: false,
  },
  {
    name: 'perf-verification.private-redeemed',
    script: 'perf-verification/run-private-redeemed.ts',
    required: false,
  },
  { name: 'cost-analysis', script: 'cost-analysis/run.ts', required: true },
  { name: 'adversarial', script: 'adversarial/run-all.ts', required: true },
];

interface SubResult {
  name: string;
  ok: boolean;
  exitCode: number;
}

function runSpawn(script: string, runId: string, extra: string[]): Promise<number> {
  return new Promise((resolve) => {
    const child = spawn('tsx', [script, '--run-id', runId, ...extra], { stdio: 'inherit' });
    child.on('exit', (code) => resolve(code ?? 1));
  });
}

async function main(): Promise<void> {
  const runId = resolveRunId();
  const network = readStringFlag('--network', 'hardhat');
  const extra = process.argv.slice(2).filter((a, i, arr) => {
    if (a === '--run-id') return false;
    if (i > 0 && arr[i - 1] === '--run-id') return false;
    return true;
  });

  // eslint-disable-next-line no-console
  console.log(`==========================================================`);
  // eslint-disable-next-line no-console
  console.log(`exp:all umbrella  ·  RUN_ID=${runId}  ·  network=${network}`);
  // eslint-disable-next-line no-console
  console.log(`==========================================================`);

  const results: SubResult[] = [];
  for (const step of PIPELINE) {
    // eslint-disable-next-line no-console
    console.log(`\n=== ${step.name} ===`);
    const code = await runSpawn(step.script, runId, extra);
    results.push({ name: step.name, ok: code === 0, exitCode: code });
    if (code !== 0 && step.required) {
      // eslint-disable-next-line no-console
      console.error(`Required step ${step.name} failed; aborting.`);
      writeSummary(runId, network, results);
      process.exit(1);
    }
  }
  writeSummary(runId, network, results);
  // eslint-disable-next-line no-console
  console.log(`\nDone. SUMMARY.md written to results/${runId}/SUMMARY.md`);
}

function writeSummary(runId: string, network: string, results: SubResult[]): void {
  const dir = join(process.cwd(), 'results', runId);
  mkdirSync(dir, { recursive: true });

  // Paper claims (Tables 3 + 4 distilled — see docs/requirements/features/experiments.md).
  const claims = [
    {
      table: 'Table 3 row 1',
      claim: 'Batch generation 100 IDs ~5 s',
      summary: 'perf-registration/summary.json',
      key: 'summary.mean',
    },
    {
      table: 'Table 3 row 2',
      claim: 'Public scan ~5 s',
      summary: 'perf-verification/public/summary.json',
      key: 'summary.mean',
    },
    {
      table: 'Table 3 row 3',
      claim: 'Private valid ~30 s',
      summary: 'perf-verification/private-valid/summary.json',
      key: 'summary.mean',
    },
    {
      table: 'Table 3 row 4',
      claim: 'Private invalid ~4 s',
      summary: 'perf-verification/private-invalid/summary.json',
      key: 'summary.mean',
    },
    {
      table: 'Table 4',
      claim: 'redeemProduct ~$0.001',
      summary: 'cost-analysis/summary.json',
      key: 'operations[2].usdCost',
    },
  ];

  let md = `# Experiments SUMMARY — ${runId}\n\n`;
  md += `Network: \`${network}\`  ·  Generated: ${new Date().toISOString()}\n\n`;
  md += `## Sub-test status\n\n| Step | Status |\n| --- | --- |\n`;
  for (const r of results) {
    md += `| ${r.name} | ${r.ok ? '✓ pass' : `✗ fail (exit ${r.exitCode})`} |\n`;
  }
  md += `\n## Paper claim vs measured\n\n| Table | Claim | Measured |\n| --- | --- | --- |\n`;
  for (const c of claims) {
    const path = join(dir, c.summary);
    let measured = '—';
    if (existsSync(path)) {
      try {
        const json = JSON.parse(readFileSync(path, 'utf8')) as Record<string, unknown>;
        measured = lookupPath(json, c.key);
      } catch {
        measured = 'parse error';
      }
    }
    md += `| ${c.table} | ${c.claim} | ${measured} |\n`;
  }
  md += `\n## Files\n\n- See \`results/${runId}/<experiment>/{raw.csv, summary.json, plot.png}\` for per-experiment details.\n`;
  writeFileSync(join(dir, 'SUMMARY.md'), md);
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function lookupPath(obj: any, path: string): string {
  const parts = path.split(/\.|\[|\]/).filter(Boolean);
  let cur = obj;
  for (const p of parts) {
    if (cur == null) return '—';
    cur = cur[p as keyof typeof cur];
  }
  if (cur === undefined || cur === null) return '—';
  if (typeof cur === 'number') return cur.toFixed(2);
  return String(cur);
}

void main().catch((err) => {
  // eslint-disable-next-line no-console
  console.error(err);
  process.exit(1);
});
