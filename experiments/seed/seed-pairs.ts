#!/usr/bin/env tsx
/**
 * Seed helper for the perf-verification experiments. Registers a
 * fresh project + N (sid, h) pairs on-chain and writes one
 * `<projectId>:<secretId>` line per pair to OUT_PATH (default
 * `./results/<RUN_ID>/seed/valid-sids.txt`).
 *
 * The hub picks up the on-chain hashes via its existing event
 * listener (no separate hub-side seed needed once the project is
 * registered there too — see notes below).
 *
 * Notes:
 * - This produces the input for `pnpm exp:perf-verification --private-valid`.
 * - For the redeemed flow, `seed-redeem.ts` consumes the same file
 *   and redeems each sid before the experiment runs.
 * - Phi is derived from a deterministic prefix + a random suffix so
 *   reviewers re-running the seed produce a fresh project per RUN_ID.
 */

import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { Contract, type InterfaceAbi, randomBytes } from 'ethers';
import { hashSid } from '@qr-bc/shared';
import productRegistryAbiJson from '../../packages/shared/src/abi/ProductRegistry.json' with { type: 'json' };
import { resolveNetwork, buildContext } from '../lib/network.ts';
import { resolveRunId, readNumberFlag, readStringFlag } from '../lib/run-id.ts';
import { printPaperHeader } from '../lib/header.ts';

const ABI = (productRegistryAbiJson as { abi: InterfaceAbi }).abi;

async function main(): Promise<void> {
  const count = readNumberFlag('--count', 100);
  const network = resolveNetwork(readStringFlag('--network', 'hardhat'));
  const runId = resolveRunId();
  const outPath =
    readStringFlag('--out', '') || join(process.cwd(), 'results', runId, 'seed', 'valid-sids.txt');

  printPaperHeader({
    experiment: 'seed.pairs',
    reproduces: 'Setup helper — N (sid, hash) pairs registered on-chain',
    network,
    trials: count,
    runId,
  });

  const ctx = await buildContext(network);
  const contract = new Contract(ctx.contractAddress, ABI, ctx.signer);

  const phi = `0x${Buffer.from(randomBytes(32)).toString('hex')}` as `0x${string}`;
  const sids: string[] = [];
  const hashes: Array<`0x${string}`> = [];
  for (let i = 0; i < count; i += 1) {
    const sid = `0x${Buffer.from(randomBytes(16)).toString('hex')}`;
    sids.push(sid);
    hashes.push(hashSid(sid));
  }

  // eslint-disable-next-line no-console
  console.log(`registerProject(${phi})…`);
  await (
    contract.registerProject as (p: `0x${string}`) => Promise<{ wait: () => Promise<unknown> }>
  )(phi).then((tx) => tx.wait());

  // eslint-disable-next-line no-console
  console.log(`registerBatch(${phi}, ${count} hashes)…`);
  await (
    contract.registerBatch as (
      p: `0x${string}`,
      hh: ReadonlyArray<`0x${string}`>,
    ) => Promise<{ wait: () => Promise<unknown> }>
  )(phi, hashes).then((tx) => tx.wait());

  mkdirSync(dirname(outPath), { recursive: true });
  writeFileSync(outPath, sids.map((s) => `${phi}:${s}`).join('\n') + '\n', 'utf8');

  // eslint-disable-next-line no-console
  console.log(`Wrote ${count} pairs to ${outPath}`);
  // eslint-disable-next-line no-console
  console.log(`Set VALID_SIDS_PATH=${outPath} for perf-verification.`);
}

void main().catch((err) => {
  // eslint-disable-next-line no-console
  console.error(err);
  process.exit(1);
});
