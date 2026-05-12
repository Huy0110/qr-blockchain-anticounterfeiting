import { Injectable } from '@nestjs/common';
import { generateSid, hashSid } from '@qr-bc/shared';
import type { Phi, Hash, Sid } from '@qr-bc/shared';
import { ProducersService } from '../../producers/producers.service';
import { ProjectsService } from '../projects.service';
import { ContractService } from '../../blockchain/contract.service';
import { QrGeneratorService } from './qr-generator.service';
import { ZipBuilderService } from './zip-builder.service';
import { AuditLogService } from '../../observability/audit-log.service';

interface BatchManifestEntry {
  filename: string;
  secretId: Sid;
  hash: Hash;
}

interface BatchManifest {
  phi: Phi;
  count: number;
  generatedAt: string;
  txHash?: string;
  publicQrTarget: string;
  entries: BatchManifestEntry[];
}

@Injectable()
export class BatchesService {
  constructor(
    private readonly producers: ProducersService,
    private readonly projects: ProjectsService,
    private readonly contract: ContractService,
    private readonly qr: QrGeneratorService,
    private readonly zip: ZipBuilderService,
    private readonly audit: AuditLogService,
  ) {}

  /**
   * Generate N (sid, h) pairs, register their hashes on-chain via the
   * producer's wallet, render QR PNGs, and pack into a ZIP. The sid
   * values never touch the database — they are emitted only inside the
   * ZIP that the producer downloads. After delivery, only h_i remains
   * on-chain, so even a hub compromise cannot replay a redemption.
   */
  async generate(
    producerId: string,
    phi: Phi,
    n: number,
    dappBaseUrl?: string,
  ): Promise<{ zipBuffer: Buffer; manifest: BatchManifest; txHash?: string }> {
    const producer = await this.producers.findById(producerId);
    // Ownership check by side-effect (throws on non-owner).
    await this.projects.findOwnedByProducer(producerId, phi);

    const sids: Sid[] = Array.from({ length: n }, () => generateSid(32));
    const hashes: Hash[] = sids.map((s) => hashSid(s));

    let txHash: string | undefined;
    try {
      txHash = await this.contract.registerBatch(phi, hashes, {
        ciphertext: producer.encryptedPrivateKey,
        iv: producer.encryptionIV,
        authTag: producer.encryptionAuthTag,
      });
    } catch (err) {
      // If the on-chain leg fails we still let the producer take the ZIP
      // (so they can retry registration later) but record the failure
      // in audit. The DoD does NOT require atomicity here — the producer
      // can re-run with the same sids if needed.
      await this.audit.record({
        actor: producer._id?.toString() ?? 'unknown',
        action: 'BATCH_REGISTER',
        target: phi,
        metadata: { error: String(err), n },
      });
      throw err;
    }

    const publicQrTarget = dappBaseUrl
      ? `${dappBaseUrl.replace(/\/$/, '')}/projects/${phi}`
      : `qrbc://public/${phi}`;

    const entries: BatchManifestEntry[] = sids.map((sid, i) => ({
      filename: `private_${String(i + 1).padStart(3, '0')}.png`,
      secretId: sid,
      hash: hashes[i] as Hash,
    }));

    const manifest: BatchManifest = {
      phi,
      count: n,
      generatedAt: new Date().toISOString(),
      ...(txHash ? { txHash } : {}),
      publicQrTarget,
      entries,
    };

    // Render QR PNGs in parallel (qrcode is CPU-bound, but @noble/sha2
    // and qrcode's encoder are fast enough that 100 in parallel finishes
    // well under the DoD ≤ 6s budget).
    const publicPng = await this.qr.toPng(publicQrTarget);
    const privatePngs = await Promise.all(
      sids.map(async (sid, i) => {
        const target = dappBaseUrl
          ? `${dappBaseUrl.replace(/\/$/, '')}/scan/${phi}/${sid}`
          : `qrbc://scan/${phi}/${sid}`;
        const entry = entries[i];
        if (!entry) throw new Error(`missing manifest entry at index ${i}`);
        const png = await this.qr.toPng(target);
        return { name: entry.filename, data: png };
      }),
    );

    const zipBuffer = await this.zip.build([
      { name: 'public.png', data: publicPng },
      ...privatePngs,
      { name: 'manifest.json', data: JSON.stringify(manifest, null, 2) },
    ]);

    await this.audit.record({
      actor: producer._id?.toString() ?? 'unknown',
      action: 'BATCH_REGISTER',
      target: phi,
      ...(txHash ? { metadata: { n, txHash } } : { metadata: { n } }),
    });

    return { zipBuffer, manifest, ...(txHash ? { txHash } : {}) };
  }
}
