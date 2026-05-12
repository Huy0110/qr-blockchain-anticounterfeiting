#!/usr/bin/env tsx
/**
 * F6.1 — Performance: batch private ID generation + on-chain registration.
 * Reproduces Paper Table 3 row 1 ("Batch private ID generation (100 IDs)
 * — ~5 s on Amoy"). Three timing splits captured per trial:
 *   - genHashMs: client-side sid + sha256(sid) for N pairs
 *   - submitMs:  send tx (registerProject + registerBatch)
 *   - confirmMs: wait for first confirmation
 *   - totalMs:   sum
 *
 * Default --trials=30 against --network=amoy reproduces the paper. CI uses
 * --trials=3 --network=hardhat to keep the smoke run under 60 s.
 */

import { mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { Contract, type InterfaceAbi, randomBytes } from 'ethers';
import { hashSid } from '@qr-bc/shared';
import productRegistryAbiJson from '../../packages/shared/src/abi/ProductRegistry.json' with { type: 'json' };
import { resolveNetwork, buildContext } from '../lib/network.ts';
import { runTrials } from '../lib/runner.ts';
import { summarize } from '../lib/stats.ts';
import { writeCsv } from '../lib/csv.ts';
import { writeBoxPlot } from '../lib/plot.ts';
import { resolveRunId, readNumberFlag, readStringFlag } from '../lib/run-id.ts';
import { printPaperHeader } from '../lib/header.ts';

interface TrialRow {
  trial: number;
  genHashMs: number;
  submitMs: number;
  confirmMs: number;
  totalMs: number;
  txHash: string;
}

const ABI = (productRegistryAbiJson as { abi: InterfaceAbi }).abi;

async function trial(
  idx: number,
  ctx: Awaited<ReturnType<typeof buildContext>>,
): Promise<TrialRow> {
  // Each trial uses a fresh phi; default batch size is 100 to mirror
  // the paper. Reviewers can shrink via --batch <N>.
  const batchN = readNumberFlag('--batch', 100);
  const phi = `0x${Buffer.from(randomBytes(32)).toString('hex')}` as `0x${string}`;
  const contract = new Contract(ctx.contractAddress, ABI, ctx.signer);

  const t0 = performance.now();
  const sids: Array<`0x${string}`> = [];
  const hashes: Array<`0x${string}`> = [];
  for (let i = 0; i < batchN; i += 1) {
    // 16-byte sid (matches the dApp's QR payload size budget). Pass
    // the hex string directly to hashSid — it parses 0x-prefixed hex
    // back to raw bytes, which is what the contract's `sha256(sid)`
    // computes over on redeem. Wrapping in toUtf8Bytes hashed the
    // literal character codes and produced ProductDoesNotExist on
    // redeemProduct.
    const sid = `0x${Buffer.from(randomBytes(16)).toString('hex')}` as `0x${string}`;
    sids.push(sid);
    hashes.push(hashSid(sid));
  }
  const tGenHash = performance.now();

  const tSubmitStart = performance.now();
  // registerProject must succeed because phi is freshly random — any
  // ProjectAlreadyExists revert here is a bug. (Earlier we silently
  // swallowed errors here; that masked real failures and is gone.)
  const txProj = await (
    contract.registerProject as (p: `0x${string}`) => Promise<{ wait: () => Promise<unknown> }>
  )(phi);
  await txProj.wait();
  const txBatch = await (
    contract.registerBatch as (
      p: `0x${string}`,
      hh: ReadonlyArray<`0x${string}`>,
    ) => Promise<{
      wait: () => Promise<{ hash?: string; transactionHash?: string }>;
      hash: string;
    }>
  )(phi, hashes);
  const tAfterSubmit = performance.now();
  await txBatch.wait();
  const tConfirm = performance.now();

  void idx;
  return {
    trial: idx,
    genHashMs: tGenHash - t0,
    submitMs: tAfterSubmit - tSubmitStart,
    confirmMs: tConfirm - tAfterSubmit,
    totalMs: tConfirm - t0,
    txHash: txBatch.hash,
  };
}

async function main(): Promise<void> {
  const trials = readNumberFlag('--trials', 30);
  const network = resolveNetwork(readStringFlag('--network', 'hardhat'));
  const runId = resolveRunId();
  printPaperHeader({
    experiment: 'perf-registration',
    reproduces: 'Paper Table 3 row 1 — batch generation + on-chain registration',
    network,
    trials,
    runId,
  });

  const ctx = await buildContext(network);
  // retries=0: nonce-aware retries are tricky (a half-completed retry
  // can leave the signer's nonce out of sync with the chain). Failures
  // surface to the operator instead of being papered over.
  const results = await runTrials('perf-registration', { n: trials, retries: 0 }, (i) =>
    trial(i, ctx),
  );
  const rows: TrialRow[] = results.map((r) => r.value);
  const totals = rows.map((r) => r.totalMs);
  const sum = summarize(totals);

  const dir = join(process.cwd(), 'results', runId, 'perf-registration');
  mkdirSync(dir, { recursive: true });
  writeCsv(join(dir, 'raw.csv'), rows);
  const summaryJson = {
    experiment: 'perf-registration',
    reproduces: 'Paper Table 3 row 1',
    network,
    trials,
    runId,
    summary: sum,
    splits: {
      genHashMs: summarize(rows.map((r) => r.genHashMs)),
      submitMs: summarize(rows.map((r) => r.submitMs)),
      confirmMs: summarize(rows.map((r) => r.confirmMs)),
    },
  };
  const fs = await import('node:fs');
  fs.writeFileSync(join(dir, 'summary.json'), JSON.stringify(summaryJson, null, 2));
  await writeBoxPlot(join(dir, 'plot.png'), {
    title: `perf-registration (n=${trials}, ${network})`,
    yLabel: 'ms',
    buckets: [
      { label: 'gen+hash', values: rows.map((r) => r.genHashMs) },
      { label: 'submit', values: rows.map((r) => r.submitMs) },
      { label: 'confirm', values: rows.map((r) => r.confirmMs) },
      { label: 'total', values: totals },
    ],
  });

  // eslint-disable-next-line no-console
  console.log(
    `\nDone. mean total = ${sum.mean.toFixed(0)} ms, ci95 [${sum.ci95Low.toFixed(0)}, ${sum.ci95High.toFixed(0)}]`,
  );
  // eslint-disable-next-line no-console
  console.log(`Outputs: ${dir}`);
}

void main().catch((err) => {
  // eslint-disable-next-line no-console
  console.error(err);
  process.exit(1);
});
