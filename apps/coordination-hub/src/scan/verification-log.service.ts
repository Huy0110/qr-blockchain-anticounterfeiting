import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { createHash } from 'node:crypto';
import {
  VerificationLog,
  VerificationLogDocument,
  VerificationOutcomeStatus,
} from './verification-log.schema';

@Injectable()
export class VerificationLogService {
  constructor(
    @InjectModel(VerificationLog.name)
    private readonly model: Model<VerificationLogDocument>,
  ) {}

  /** Insert one log entry. ipHash is sha256(ip + DAILY_SALT) — opaque + non-reversible. */
  async record(input: {
    phi: string;
    h: string;
    outcome: VerificationOutcomeStatus;
    txHash?: string;
    ipRaw?: string;
    dailySalt: string;
    userAgent?: string;
  }): Promise<void> {
    const ipHash = createHash('sha256')
      .update(`${input.ipRaw ?? ''}:${input.dailySalt}`)
      .digest('hex');
    const userAgentSummary = input.userAgent ? input.userAgent.slice(0, 100) : undefined;
    await this.model.create({
      phi: input.phi,
      h: input.h,
      outcome: input.outcome,
      ...(input.txHash ? { txHash: input.txHash } : {}),
      scannedAt: new Date(),
      ipHash,
      ...(userAgentSummary ? { userAgentSummary } : {}),
    });
  }

  /** Find a previous AUTHENTIC entry for (phi, h) so the ALREADY_VERIFIED
   *  response can include the previous tx hash. */
  async findPreviousAuthentic(phi: string, h: string): Promise<VerificationLogDocument | null> {
    return this.model.findOne({ phi, h, outcome: 'AUTHENTIC' }).sort({ scannedAt: -1 }).exec();
  }

  /**
   * Aggregate verification analytics for one project. Returns:
   *  - totals per outcome
   *  - daily counts (UTC) for the last `days` days
   *  - the most recent `recentLimit` entries
   *
   * Used by the management portal's verification analytics page (T-032).
   */
  async getProjectStats(
    phi: string,
    opts: { days?: number; recentLimit?: number } = {},
  ): Promise<{
    totals: { authentic: number; alreadyVerified: number; counterfeit: number };
    daily: Array<{ date: string; authentic: number; alreadyVerified: number; counterfeit: number }>;
    recent: Array<{
      outcome: VerificationOutcomeStatus;
      txHash?: string;
      scannedAt: Date;
    }>;
  }> {
    const days = opts.days ?? 30;
    const recentLimit = opts.recentLimit ?? 50;
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    const [logs, recent] = await Promise.all([
      this.model
        .find({ phi, scannedAt: { $gte: since } })
        .lean()
        .exec(),
      this.model
        .find({ phi })
        .sort({ scannedAt: -1 })
        .limit(recentLimit)
        .select('outcome txHash scannedAt')
        .lean()
        .exec(),
    ]);

    const totals = { authentic: 0, alreadyVerified: 0, counterfeit: 0 };
    const dayMap = new Map<
      string,
      { authentic: number; alreadyVerified: number; counterfeit: number }
    >();
    for (let i = 0; i < days; i += 1) {
      const d = new Date(Date.now() - i * 24 * 60 * 60 * 1000);
      const key = d.toISOString().slice(0, 10);
      dayMap.set(key, { authentic: 0, alreadyVerified: 0, counterfeit: 0 });
    }

    for (const log of logs) {
      const day = new Date(log.scannedAt).toISOString().slice(0, 10);
      const bucket = dayMap.get(day);
      if (log.outcome === 'AUTHENTIC') {
        totals.authentic += 1;
        if (bucket) bucket.authentic += 1;
      } else if (log.outcome === 'ALREADY_VERIFIED') {
        totals.alreadyVerified += 1;
        if (bucket) bucket.alreadyVerified += 1;
      } else if (log.outcome === 'COUNTERFEIT') {
        totals.counterfeit += 1;
        if (bucket) bucket.counterfeit += 1;
      }
    }

    const daily = Array.from(dayMap.entries())
      .map(([date, v]) => ({ date, ...v }))
      .sort((a, b) => (a.date < b.date ? -1 : 1));

    return {
      totals,
      daily,
      recent: recent.map((r) => ({
        outcome: r.outcome,
        ...(r.txHash ? { txHash: r.txHash } : {}),
        scannedAt: r.scannedAt,
      })),
    };
  }
}
