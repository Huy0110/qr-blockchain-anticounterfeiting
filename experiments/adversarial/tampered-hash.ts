#!/usr/bin/env tsx
/**
 * SR4 — the hub cannot fabricate AUTHENTIC outcomes that aren't backed
 * by an on-chain ProductRedeemed event. This script verifies the
 * non-repudiation guarantee in two passes:
 *
 *  1. Truthful path: submit a fresh sid against the real hub, expect
 *     COUNTERFEIT (or AUTHENTIC if the seed has redeemed it before).
 *     If AUTHENTIC, the receipt's ProductRedeemed event must match
 *     `(phi, hashSid(sid))`. Mismatch ⇒ FAIL.
 *
 *  2. Tamper simulation: spin up a stub HTTP server that returns a
 *     fabricated AUTHENTIC + a random-looking txHash. Re-run the
 *     same cross-check against the stub. The cross-check MUST detect
 *     the tamper (the receipt either doesn't exist on-chain or the
 *     event args don't match) — otherwise the audit guarantee is
 *     broken and we fail.
 *
 * Self-contained — no manual hub patching required.
 */

import { mkdirSync, writeFileSync } from 'node:fs';
import { createServer, type Server } from 'node:http';
import { join } from 'node:path';
import { randomBytes } from 'node:crypto';
import { Contract, type InterfaceAbi } from 'ethers';
import { hashSid } from '@qr-bc/shared';
import productRegistryAbiJson from '../../packages/shared/src/abi/ProductRegistry.json' with { type: 'json' };
import { resolveNetwork, buildContext, type NetworkContext } from '../lib/network.ts';
import { resolveRunId, readStringFlag } from '../lib/run-id.ts';
import { printPaperHeader } from '../lib/header.ts';

const DEFAULT_HUB_BASE = process.env.HUB_BASE_URL ?? 'http://localhost:3000/api/v1';
const SEED_PHI = process.env.SEED_PHI ?? `0x${'a'.repeat(64)}`;
const ABI = (productRegistryAbiJson as { abi: InterfaceAbi }).abi;

interface CrosscheckResult {
  pass: boolean;
  notes: string;
  hubResponse: { status?: string; txHash?: string };
}

async function crosscheck(
  hubBase: string,
  ctx: NetworkContext,
  sid: string,
  expectedH: string,
): Promise<CrosscheckResult> {
  const res = await fetch(`${hubBase}/scan/private`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify({ projectId: SEED_PHI, secretId: sid }),
  });
  const body = (await res.json().catch(() => ({}))) as { status?: string; txHash?: string };

  if (body.status !== 'AUTHENTIC' || !body.txHash) {
    return {
      pass: true,
      notes: `non-AUTHENTIC outcome (${body.status ?? 'no status'}); nothing to verify.`,
      hubResponse: body,
    };
  }

  const receipt = await ctx.provider.getTransactionReceipt(body.txHash);
  if (!receipt) {
    return {
      pass: false,
      notes: `tampered: tx ${body.txHash} not found on-chain.`,
      hubResponse: body,
    };
  }
  const contract = new Contract(ctx.contractAddress, ABI, ctx.provider);
  const iface = contract.interface;
  const redeemed = receipt.logs
    .map((l) => {
      try {
        return iface.parseLog({ topics: [...l.topics], data: l.data });
      } catch {
        return null;
      }
    })
    .find((p) => p?.name === 'ProductRedeemed');
  if (!redeemed) {
    return {
      pass: false,
      notes: `tampered: receipt has no ProductRedeemed event.`,
      hubResponse: body,
    };
  }
  const onChainH = redeemed.args.h as string;
  const onChainPhi = redeemed.args.phi as string;
  if (onChainH !== expectedH || onChainPhi !== SEED_PHI) {
    return {
      pass: false,
      notes: `tampered: event (phi=${onChainPhi}, h=${onChainH}) does not match (${SEED_PHI}, ${expectedH}).`,
      hubResponse: body,
    };
  }
  return {
    pass: true,
    notes: 'AUTHENTIC + on-chain event verified end-to-end.',
    hubResponse: body,
  };
}

/** Spin up a tiny HTTP stub that pretends to be the hub. Always returns
 * a fabricated AUTHENTIC with a random tx hash that doesn't exist on-chain. */
function startTamperStub(): Promise<{ url: string; close: () => Promise<void>; server: Server }> {
  return new Promise((resolve) => {
    const server = createServer((req, res) => {
      if (req.url?.endsWith('/scan/private')) {
        let body = '';
        req.on('data', (chunk: Buffer) => {
          body += chunk.toString();
        });
        req.on('end', () => {
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(
            JSON.stringify({
              status: 'AUTHENTIC',
              txHash: `0x${Buffer.from(randomBytes(32)).toString('hex')}`,
              eventArgs: {
                phi: SEED_PHI,
                h: `0x${Buffer.from(randomBytes(32)).toString('hex')}`,
                producer: `0x${'1'.repeat(40)}`,
                timestamp: 0,
              },
              verifiedAt: new Date().toISOString(),
            }),
          );
          void body;
        });
      } else {
        res.writeHead(404);
        res.end();
      }
    });
    server.listen(0, '127.0.0.1', () => {
      const addr = server.address();
      const port = typeof addr === 'object' && addr ? addr.port : 0;
      resolve({
        url: `http://127.0.0.1:${port}`,
        close: () => new Promise((r) => server.close(() => r())),
        server,
      });
    });
  });
}

async function main(): Promise<void> {
  const network = resolveNetwork(readStringFlag('--network', 'hardhat'));
  const runId = resolveRunId();
  printPaperHeader({
    experiment: 'adversarial.tampered-hash',
    reproduces: 'Paper §3.2 SR4 — independent on-chain cross-check',
    network,
    trials: 2,
    runId,
  });

  const ctx = await buildContext(network);
  const sid = `0x${Buffer.from(randomBytes(16)).toString('hex')}`;
  const expectedH = hashSid(sid);

  // Pass 1: real hub. Either COUNTERFEIT (no verify needed) or AUTHENTIC
  // with a verifiable receipt.
  const truthful = await crosscheck(DEFAULT_HUB_BASE, ctx, sid, expectedH);

  // Pass 2: tamper stub. Cross-check MUST report fail (tamper detected).
  const stub = await startTamperStub();
  let tamperDetected: CrosscheckResult;
  try {
    tamperDetected = await crosscheck(stub.url, ctx, sid, expectedH);
  } finally {
    await stub.close();
  }

  // The audit guarantee holds iff truthful.pass AND tamperDetected.pass===false.
  // (truthful.pass true means: no spurious AUTHENTIC reached us. tamperDetected.pass false means: when fed a fake AUTHENTIC, we caught it.)
  const auditGuaranteeHolds = truthful.pass && !tamperDetected.pass;

  const dir = join(process.cwd(), 'results', runId, 'adversarial', 'tampered-hash');
  mkdirSync(dir, { recursive: true });
  writeFileSync(
    join(dir, 'summary.json'),
    JSON.stringify(
      {
        experiment: 'adversarial.tampered-hash',
        reproduces: 'Paper §3.2 SR4',
        runId,
        network,
        truthful,
        tamperSimulation: {
          stubReturnedAuthentic: tamperDetected.hubResponse.status === 'AUTHENTIC',
          crosscheckDetectedTamper: !tamperDetected.pass,
          notes: tamperDetected.notes,
        },
        pass: auditGuaranteeHolds,
      },
      null,
      2,
    ),
  );

  if (!auditGuaranteeHolds) {
    // eslint-disable-next-line no-console
    console.error(
      `FAIL: audit guarantee broken. truthful=${truthful.pass} (${truthful.notes}); tamper-detected=${!tamperDetected.pass} (${tamperDetected.notes})`,
    );
    process.exit(1);
  }
  // eslint-disable-next-line no-console
  console.log(`PASS: truthful path verified; tamper simulation correctly detected.`);
}

void main().catch((err) => {
  // eslint-disable-next-line no-console
  console.error(err);
  process.exit(1);
});
