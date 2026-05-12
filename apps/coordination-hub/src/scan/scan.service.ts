import { Inject, Injectable, Logger } from '@nestjs/common';
import { createHash, randomBytes } from 'node:crypto';
import { hashSid } from '@qr-bc/shared';
import type { Hash, Phi, VerificationOutcome } from '@qr-bc/shared';
import { ProjectsService } from '../projects/projects.service';
import { ProjectNotFoundException } from '../projects/exceptions';
import { ContractService } from '../blockchain/contract.service';
import {
  OnChainProductAlreadyRedeemedException,
  OnChainProductDoesNotExistException,
  OnChainProjectDoesNotExistException,
} from '../blockchain/exceptions';
import { ENV_TOKEN } from '../config/config.module';
import type { Env } from '../config/env.schema';
import { VerificationLogService } from './verification-log.service';
import type { ScanPrivateDto } from './dto/scan.dto';
import { toProjectMetadata } from '../projects/project.schema';

interface ScanContext {
  ip?: string;
  userAgent?: string;
}

@Injectable()
export class ScanService {
  private readonly logger = new Logger(ScanService.name);
  /** Process-startup random secret used as a fallback when
   *  DAILY_SALT_SECRET isn't set. Re-rolls per process restart so a
   *  rebooted hub becomes a fresh anonymity-set boundary. */
  private readonly fallbackSecret = randomBytes(32).toString('base64');

  constructor(
    private readonly projects: ProjectsService,
    private readonly contract: ContractService,
    private readonly logs: VerificationLogService,
    @Inject(ENV_TOKEN) private readonly env: Env,
  ) {}

  /** GET /scan/public/:phi — Algorithm 2. Cheap on-chain projectExists +
   *  DB lookup; returns project metadata if both checks pass. */
  async publicScan(phi: Phi, ctx: ScanContext) {
    const onChain = await this.contract.projectExists(phi).catch(() => false);
    if (!onChain) throw new ProjectNotFoundException(phi);
    const doc = await this.projects.findPublic(phi).catch((err) => {
      if (err instanceof ProjectNotFoundException) throw err;
      throw err;
    });
    if (this.env.LOG_PUBLIC_SCANS) {
      // Public scan logs use h=phi as a synthetic placeholder (no sid involved).
      await this.logs.record({
        phi,
        h: phi,
        outcome: 'AUTHENTIC',
        ipRaw: ctx.ip,
        dailySalt: this.dailySalt(),
        userAgent: ctx.userAgent,
      });
    }
    return toProjectMetadata(doc);
  }

  /** POST /scan/private — Algorithm 3. Three phases:
   *  1) pre-check: verifyProduct off-chain → COUNTERFEIT or ALREADY_VERIFIED short-circuit
   *  2) redeem: redeemProduct on-chain
   *  3) evidence: return tx hash + event payload + verifiedAt
   */
  async privateScan(input: ScanPrivateDto, ctx: ScanContext): Promise<VerificationOutcome> {
    const phi = input.projectId as Phi;
    const sidBytes = hexToBytes(input.secretId);
    const h = hashSid(sidBytes) as Hash;

    // Phase 1 — pre-check. Avoids submitting a tx for clearly invalid scans.
    let preCheck: { exists: boolean; redeemed: boolean };
    try {
      const r = await this.contract.verifyProduct(phi, h);
      preCheck = { exists: r.exists, redeemed: r.redeemed };
    } catch (err) {
      this.logger.warn({ err, phi, h }, 'verifyProduct failed; treating as not present');
      preCheck = { exists: false, redeemed: false };
    }

    if (!preCheck.exists) {
      const outcome: VerificationOutcome = {
        status: 'COUNTERFEIT',
        message: 'No on-chain record matches this scan.',
      };
      await this.recordOutcome(phi, h, 'COUNTERFEIT', undefined, ctx);
      return outcome;
    }

    if (preCheck.redeemed) {
      const previous = await this.logs.findPreviousAuthentic(phi, h);
      const outcome: VerificationOutcome = {
        status: 'ALREADY_VERIFIED',
        ...(previous?.txHash ? { previousTxHash: previous.txHash } : {}),
        ...(previous?.scannedAt ? { previousVerifiedAt: previous.scannedAt } : {}),
      };
      await this.recordOutcome(phi, h, 'ALREADY_VERIFIED', previous?.txHash, ctx);
      return outcome;
    }

    // Phase 2 — redeem. Race-condition-safe: if a parallel scan already
    // redeemed, the contract reverts with ProductAlreadyRedeemed and we
    // gracefully recover via the catch.
    try {
      const result = await this.contract.redeemProduct(phi, sidBytes);
      const project = await this.contract.verifyProduct(phi, h).catch(() => ({
        exists: true,
        redeemed: true,
        producer: '0x0000000000000000000000000000000000000000' as `0x${string}`,
      }));
      const outcome: VerificationOutcome = {
        status: 'AUTHENTIC',
        txHash: result.txHash,
        eventArgs: {
          phi,
          h,
          producer: project.producer,
          timestamp: result.timestamp,
        },
        verifiedAt: new Date(result.timestamp * 1000),
      };
      await this.recordOutcome(phi, h, 'AUTHENTIC', result.txHash, ctx);
      return outcome;
    } catch (err) {
      if (err instanceof OnChainProductAlreadyRedeemedException) {
        const previous = await this.logs.findPreviousAuthentic(phi, h);
        const outcome: VerificationOutcome = {
          status: 'ALREADY_VERIFIED',
          ...(previous?.txHash ? { previousTxHash: previous.txHash } : {}),
          ...(previous?.scannedAt ? { previousVerifiedAt: previous.scannedAt } : {}),
        };
        await this.recordOutcome(phi, h, 'ALREADY_VERIFIED', previous?.txHash, ctx);
        return outcome;
      }
      if (
        err instanceof OnChainProductDoesNotExistException ||
        err instanceof OnChainProjectDoesNotExistException
      ) {
        const outcome: VerificationOutcome = {
          status: 'COUNTERFEIT',
          message: 'On-chain record does not match this scan.',
        };
        await this.recordOutcome(phi, h, 'COUNTERFEIT', undefined, ctx);
        return outcome;
      }
      throw err;
    }
  }

  private async recordOutcome(
    phi: Phi,
    h: Hash,
    outcome: 'AUTHENTIC' | 'ALREADY_VERIFIED' | 'COUNTERFEIT',
    txHash: string | undefined,
    ctx: ScanContext,
  ): Promise<void> {
    await this.logs.record({
      phi,
      h,
      outcome,
      ...(txHash ? { txHash } : {}),
      ipRaw: ctx.ip,
      dailySalt: this.dailySalt(),
      userAgent: ctx.userAgent,
    });
  }

  /**
   * Per-day salt for IP hashing. Rotates at DAILY_SALT_ROTATE_HOUR_UTC
   * (so a configured rotate-hour of 3 UTC means the "day" boundary is
   * 03:00 UTC instead of midnight).
   *
   * Final salt = sha256(dayBucket || ":" || secret) where:
   *   - dayBucket is YYYY-MM-DD shifted by env.DAILY_SALT_ROTATE_HOUR_UTC
   *   - secret is env.DAILY_SALT_SECRET in prod, fallbackSecret otherwise
   *
   * The hash is non-reversible to anyone who lacks the secret, so even
   * with full DB access an attacker can't enumerate IP -> ipHash. The
   * fallback secret is process-scoped so a hub restart starts a fresh
   * anonymity bucket.
   */
  private dailySalt(): string {
    const now = new Date();
    const rotated = new Date(now.getTime() - this.env.DAILY_SALT_ROTATE_HOUR_UTC * 60 * 60 * 1000);
    const day = `${rotated.getUTCFullYear()}-${rotated.getUTCMonth() + 1}-${rotated.getUTCDate()}`;
    const secret = this.env.DAILY_SALT_SECRET ?? this.fallbackSecret;
    return createHash('sha256').update(`${day}:${secret}`).digest('hex');
  }
}

function hexToBytes(hex: string): Uint8Array {
  const trimmed = hex.startsWith('0x') ? hex.slice(2) : hex;
  const bytes = new Uint8Array(trimmed.length / 2);
  for (let i = 0; i < bytes.length; i++) {
    bytes[i] = parseInt(trimmed.slice(i * 2, i * 2 + 2), 16);
  }
  return bytes;
}
