import type { Phi } from '@qr-bc/shared';
import { hubFetch } from './api-client';

export interface VerificationStats {
  totals: { authentic: number; alreadyVerified: number; counterfeit: number };
  daily: Array<{
    date: string;
    authentic: number;
    alreadyVerified: number;
    counterfeit: number;
  }>;
  recent: Array<{
    outcome: 'AUTHENTIC' | 'ALREADY_VERIFIED' | 'COUNTERFEIT';
    txHash?: string;
    scannedAt: string;
  }>;
}

export async function getVerificationStats(
  accessToken: string,
  phi: Phi,
): Promise<VerificationStats> {
  return hubFetch(`/projects/${phi}/verifications/stats`, {}, accessToken);
}
