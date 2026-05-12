#!/usr/bin/env tsx
/**
 * Redeems each (projectId, secretId) pair from VALID_SIDS_PATH so
 * the perf-verification.private-redeemed experiment can hit the
 * ALREADY_VERIFIED path. Writes the same pair list to a sibling
 * `redeemed-sids.txt` for explicit downstream input.
 */

import { copyFileSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { Contract, type InterfaceAbi } from 'ethers';
import productRegistryAbiJson from '../../packages/shared/src/abi/ProductRegistry.json' with { type: 'json' };
import { resolveNetwork, buildContext } from '../lib/network.ts';
import { resolveRunId, readStringFlag } from '../lib/run-id.ts';
import { printPaperHeader } from '../lib/header.ts';

const ABI = (productRegistryAbiJson as { abi: InterfaceAbi }).abi;

async function main(): Promise<void> {
  const network = resolveNetwork(readStringFlag('--network', 'hardhat'));
  const runId = resolveRunId();
  const inPath =
    readStringFlag('--in', '') ||
    process.env.VALID_SIDS_PATH ||
    join(process.cwd(), 'results', runId, 'seed', 'valid-sids.txt');
  const outPath = join(dirname(inPath), 'redeemed-sids.txt');

  printPaperHeader({
    experiment: 'seed.redeem',
    reproduces: 'Setup helper — redeem each pair on-chain',
    network,
    trials: 0, // unknown until file is read
    runId,
  });

  const ctx = await buildContext(network);
  const contract = new Contract(ctx.contractAddress, ABI, ctx.signer);

  const lines = readFileSync(inPath, 'utf8')
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean);

  let i = 0;
  for (const line of lines) {
    const [phi, sid] = line.split(':');
    if (!phi || !sid) continue;
    // eslint-disable-next-line no-console
    console.log(`redeem ${i + 1}/${lines.length}…`);
    await (
      contract.redeemProduct as (
        p: `0x${string}`,
        s: `0x${string}`,
      ) => Promise<{ wait: () => Promise<unknown> }>
    )(phi as `0x${string}`, sid as `0x${string}`).then((tx) => tx.wait());
    i += 1;
  }

  copyFileSync(inPath, outPath);

  // eslint-disable-next-line no-console
  console.log(`Redeemed ${i} pairs. Copy at ${outPath}.`);
  // eslint-disable-next-line no-console
  console.log(`Set REDEEMED_SIDS_PATH=${outPath} for perf-verification.`);
}

void main().catch((err) => {
  // eslint-disable-next-line no-console
  console.error(err);
  process.exit(1);
});
