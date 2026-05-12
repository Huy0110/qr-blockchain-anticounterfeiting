#!/usr/bin/env tsx
/**
 * F6.3 — Cost analysis. Reproduces Paper Table 4 by recording
 * `gasUsed` from each lifecycle operation (registerProject,
 * registerBatch, redeemProduct), repeated `--trials` times so the
 * fluctuating per-block gas + price gets averaged out (Polygon Amoy
 * varies materially between blocks).
 *
 * Per-trial USD = gasUsed × (GAS_PRICE_GWEI × 1e9) / 1e18 × MATIC_USD.
 * Summary reports mean / median / 95 % CI per op.
 */

import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { Contract, type ContractTransactionReceipt, type InterfaceAbi, randomBytes } from 'ethers';
import { hashSid } from '@qr-bc/shared';
import productRegistryAbiJson from '../../packages/shared/src/abi/ProductRegistry.json' with { type: 'json' };
import { resolveNetwork, buildContext } from '../lib/network.ts';
import { writeCsv } from '../lib/csv.ts';
import { writeBarPlot } from '../lib/plot.ts';
import { resolveRunId, readNumberFlag, readStringFlag } from '../lib/run-id.ts';
import { printPaperHeader } from '../lib/header.ts';
import { summarize, type Summary } from '../lib/stats.ts';

const ABI = (productRegistryAbiJson as { abi: InterfaceAbi }).abi;

type Op = 'registerProject' | 'registerBatch' | 'redeemProduct';

interface Row {
  trial: number;
  op: Op;
  gasUsed: number;
  weiCost: string;
  maticCost: number;
  usdCost: number;
  txHash: string;
}

async function runOneLifecycle(
  trialIdx: number,
  ctx: Awaited<ReturnType<typeof buildContext>>,
  gasPriceGwei: number,
  maticUsd: number,
): Promise<Row[]> {
  const contract = new Contract(ctx.contractAddress, ABI, ctx.signer);
  const phi = `0x${Buffer.from(randomBytes(32)).toString('hex')}` as `0x${string}`;
  const sid = `0x${Buffer.from(randomBytes(16)).toString('hex')}` as `0x${string}`;
  const h = hashSid(sid);

  const opsToRun: Array<{ op: Op; call: () => Promise<ContractTransactionReceipt | null> }> = [
    {
      op: 'registerProject',
      call: async () => {
        const tx = await (
          contract.registerProject as (p: `0x${string}`) => Promise<{
            wait: () => Promise<ContractTransactionReceipt | null>;
          }>
        )(phi);
        return tx.wait();
      },
    },
    {
      op: 'registerBatch',
      call: async () => {
        const tx = await (
          contract.registerBatch as (
            p: `0x${string}`,
            hh: ReadonlyArray<`0x${string}`>,
          ) => Promise<{ wait: () => Promise<ContractTransactionReceipt | null> }>
        )(phi, [h]);
        return tx.wait();
      },
    },
    {
      op: 'redeemProduct',
      call: async () => {
        const tx = await (
          contract.redeemProduct as (
            p: `0x${string}`,
            s: `0x${string}`,
          ) => Promise<{ wait: () => Promise<ContractTransactionReceipt | null> }>
        )(phi, sid);
        return tx.wait();
      },
    },
  ];

  const rows: Row[] = [];
  for (const { op, call } of opsToRun) {
    const receipt = await call();
    if (!receipt) {
      throw new Error(`No receipt for ${op} (trial ${trialIdx})`);
    }
    const gasUsed = Number(receipt.gasUsed);
    const weiCost = BigInt(gasUsed) * BigInt(Math.round(gasPriceGwei * 1e9));
    const maticCost = Number(weiCost) / 1e18;
    const usdCost = maticCost * maticUsd;
    rows.push({
      trial: trialIdx,
      op,
      gasUsed,
      weiCost: weiCost.toString(),
      maticCost: Number(maticCost.toFixed(9)),
      usdCost: Number(usdCost.toFixed(9)),
      txHash: receipt.hash,
    });
  }
  return rows;
}

async function main(): Promise<void> {
  const trials = readNumberFlag('--trials', 5);
  const network = resolveNetwork(readStringFlag('--network', 'hardhat'));
  const runId = resolveRunId();
  const gasPriceGwei = Number(process.env.GAS_PRICE_GWEI ?? '30');
  const maticUsd = Number(process.env.MATIC_USD ?? '0.55');
  const gasPriceTimestamp = process.env.GAS_PRICE_TIMESTAMP ?? new Date().toISOString();

  printPaperHeader({
    experiment: 'cost-analysis',
    reproduces: 'Paper Table 4 — gas + USD cost per operation',
    network,
    trials,
    runId,
  });

  const ctx = await buildContext(network);

  const allRows: Row[] = [];
  for (let i = 0; i < trials; i += 1) {
    const trialRows = await runOneLifecycle(i, ctx, gasPriceGwei, maticUsd);
    allRows.push(...trialRows);
  }

  // Per-op stats across the trials.
  const perOp: Record<Op, { gasUsed: Summary; usdCost: Summary }> = {
    registerProject: { gasUsed: summarize([]), usdCost: summarize([]) },
    registerBatch: { gasUsed: summarize([]), usdCost: summarize([]) },
    redeemProduct: { gasUsed: summarize([]), usdCost: summarize([]) },
  };
  for (const op of ['registerProject', 'registerBatch', 'redeemProduct'] as const) {
    const ops = allRows.filter((r) => r.op === op);
    perOp[op] = {
      gasUsed: summarize(ops.map((r) => r.gasUsed)),
      usdCost: summarize(ops.map((r) => r.usdCost)),
    };
  }

  const dir = join(process.cwd(), 'results', runId, 'cost-analysis');
  mkdirSync(dir, { recursive: true });
  writeCsv(join(dir, 'raw.csv'), allRows);
  writeFileSync(
    join(dir, 'summary.json'),
    JSON.stringify(
      {
        experiment: 'cost-analysis',
        reproduces: 'Paper Table 4',
        runId,
        network,
        trials,
        gasPriceGwei,
        maticUsd,
        gasPriceTimestamp,
        perOp,
        rawRowCount: allRows.length,
      },
      null,
      2,
    ),
  );
  await writeBarPlot(join(dir, 'plot.png'), {
    title: `mean cost per op (USD, ${network}, n=${trials})`,
    yLabel: 'USD',
    labels: ['registerProject', 'registerBatch', 'redeemProduct'],
    values: [
      perOp.registerProject.usdCost.mean,
      perOp.registerBatch.usdCost.mean,
      perOp.redeemProduct.usdCost.mean,
    ],
  });

  // eslint-disable-next-line no-console
  console.log(
    `\nMean USD per op (n=${trials}):\n` +
      `  registerProject: $${perOp.registerProject.usdCost.mean.toFixed(6)} (${perOp.registerProject.gasUsed.mean.toFixed(0)} gas)\n` +
      `  registerBatch:   $${perOp.registerBatch.usdCost.mean.toFixed(6)} (${perOp.registerBatch.gasUsed.mean.toFixed(0)} gas)\n` +
      `  redeemProduct:   $${perOp.redeemProduct.usdCost.mean.toFixed(6)} (${perOp.redeemProduct.gasUsed.mean.toFixed(0)} gas)`,
  );
  // eslint-disable-next-line no-console
  console.log(`Outputs: ${dir}`);
}

void main().catch((err) => {
  // eslint-disable-next-line no-console
  console.error(err);
  process.exit(1);
});
