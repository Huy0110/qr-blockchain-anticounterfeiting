#!/usr/bin/env tsx
/**
 * SR3 — race two parallel redeems of the same sid; assert exactly one
 * succeeds (the loser sees ALREADY_VERIFIED). The contract enforces
 * single-redeem at the EVM level (`redeemProduct` reverts on the second
 * call), so the race is decided by tx ordering in the next block.
 */

import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { Contract, type InterfaceAbi, randomBytes } from 'ethers';
import { hashSid } from '@qr-bc/shared';
import productRegistryAbiJson from '../../packages/shared/src/abi/ProductRegistry.json' with { type: 'json' };
import { resolveNetwork, buildContext } from '../lib/network.ts';
import { resolveRunId, readStringFlag } from '../lib/run-id.ts';
import { printPaperHeader } from '../lib/header.ts';

const ABI = (productRegistryAbiJson as { abi: InterfaceAbi }).abi;

async function main(): Promise<void> {
  const network = resolveNetwork(readStringFlag('--network', 'hardhat'));
  const runId = resolveRunId();
  printPaperHeader({
    experiment: 'adversarial.race-redeems',
    reproduces: 'Paper §3.2 SR3 — parallel redeems, exactly one wins',
    network,
    trials: 1,
    runId,
  });

  const ctx = await buildContext(network);
  const contract = new Contract(ctx.contractAddress, ABI, ctx.signer);
  const phi = `0x${Buffer.from(randomBytes(32)).toString('hex')}` as `0x${string}`;
  const sid = `0x${Buffer.from(randomBytes(16)).toString('hex')}` as `0x${string}`;
  const h = hashSid(sid);

  await (
    contract.registerProject as (p: `0x${string}`) => Promise<{ wait: () => Promise<unknown> }>
  )(phi).then((tx) => tx.wait());
  await (
    contract.registerBatch as (
      p: `0x${string}`,
      hh: ReadonlyArray<`0x${string}`>,
    ) => Promise<{ wait: () => Promise<unknown> }>
  )(phi, [h]).then((tx) => tx.wait());

  const redeem = (): Promise<{ ok: boolean; err?: string }> =>
    (
      contract.redeemProduct as (
        p: `0x${string}`,
        s: `0x${string}`,
      ) => Promise<{ wait: () => Promise<unknown> }>
    )(phi, sid)
      .then((tx) => tx.wait())
      .then(() => ({ ok: true }))
      .catch((err: Error) => ({ ok: false, err: err.message.slice(0, 200) }));

  const [a, b] = await Promise.allSettled([redeem(), redeem()]);
  const a_ = a.status === 'fulfilled' ? a.value : { ok: false, err: 'rejected' };
  const b_ = b.status === 'fulfilled' ? b.value : { ok: false, err: 'rejected' };
  const successes = [a_, b_].filter((r) => r.ok).length;
  const ok = successes === 1;

  const dir = join(process.cwd(), 'results', runId, 'adversarial', 'race-redeems');
  mkdirSync(dir, { recursive: true });
  writeFileSync(
    join(dir, 'summary.json'),
    JSON.stringify(
      {
        experiment: 'adversarial.race-redeems',
        reproduces: 'Paper §3.2 SR3',
        runId,
        network,
        a: a_,
        b: b_,
        successes,
        pass: ok,
      },
      null,
      2,
    ),
  );

  if (!ok) {
    // eslint-disable-next-line no-console
    console.error(`FAIL: ${successes}/2 redeems succeeded (expected 1).`);
    process.exit(1);
  }
  // eslint-disable-next-line no-console
  console.log(`PASS: exactly 1/2 redeems succeeded.`);
}

void main().catch((err) => {
  // eslint-disable-next-line no-console
  console.error(err);
  process.exit(1);
});
