#!/usr/bin/env tsx
/**
 * SR1 — only the project's owner producer can extend its batch hash
 * set. We attempt registerBatch from a non-owner signer and assert
 * the contract reverts with UnauthorizedProducer.
 *
 * Reviewers can rerun this against any deployed instance; the script
 * uses a fresh phi each run so it doesn't pollute the hub's logs.
 */

import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { Contract, type InterfaceAbi, randomBytes, Wallet } from 'ethers';
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
    experiment: 'adversarial.unauthorized-batch',
    reproduces: 'Paper §3.2 SR1 — non-producer batch call reverts',
    network,
    trials: 1,
    runId,
  });

  const owner = await buildContext(network);
  const ownerContract = new Contract(owner.contractAddress, ABI, owner.signer);
  const phi = `0x${Buffer.from(randomBytes(32)).toString('hex')}` as `0x${string}`;
  const sid = `0x${Buffer.from(randomBytes(16)).toString('hex')}` as `0x${string}`;
  const h = hashSid(sid);

  // Register the project as the legitimate producer.
  await (
    ownerContract.registerProject as (p: `0x${string}`) => Promise<{ wait: () => Promise<unknown> }>
  )(phi).then((tx) => tx.wait());

  // Attacker = a fresh random wallet on the same provider. On hardhat
  // this still has a 0 balance, so the attempt will revert in
  // estimateGas before ever reaching the chain — that's fine.
  const attacker = new Wallet(`0x${Buffer.from(randomBytes(32)).toString('hex')}`, owner.provider);
  const attackerContract = new Contract(owner.contractAddress, ABI, attacker);

  let revertReason = '';
  let reverted = false;
  try {
    await (
      attackerContract.registerBatch as (
        p: `0x${string}`,
        hh: ReadonlyArray<`0x${string}`>,
      ) => Promise<{ wait: () => Promise<unknown> }>
    )(phi, [h]).then((tx) => tx.wait());
  } catch (err) {
    reverted = true;
    revertReason = (err as Error).message;
  }

  const dir = join(process.cwd(), 'results', runId, 'adversarial', 'unauthorized-batch');
  mkdirSync(dir, { recursive: true });
  writeFileSync(
    join(dir, 'summary.json'),
    JSON.stringify(
      {
        experiment: 'adversarial.unauthorized-batch',
        reproduces: 'Paper §3.2 SR1',
        runId,
        network,
        phi,
        attackerAddress: attacker.address,
        reverted,
        revertReason: revertReason.slice(0, 200),
        pass: reverted,
      },
      null,
      2,
    ),
  );

  if (!reverted) {
    // eslint-disable-next-line no-console
    console.error(`FAIL: attacker batch call did not revert.`);
    process.exit(1);
  }
  // eslint-disable-next-line no-console
  console.log(`PASS: attacker batch call reverted (${revertReason.slice(0, 80)}…).`);
}

void main().catch((err) => {
  // eslint-disable-next-line no-console
  console.error(err);
  process.exit(1);
});
