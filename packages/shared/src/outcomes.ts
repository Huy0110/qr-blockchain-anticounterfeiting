import type { VerificationOutcome } from './types.js';

/** True iff the redemption succeeded on this scan. */
export function isAuthentic(
  outcome: VerificationOutcome,
): outcome is Extract<VerificationOutcome, { status: 'AUTHENTIC' }> {
  return outcome.status === 'AUTHENTIC';
}

/** True iff the product was already redeemed by a previous scan. */
export function isAlreadyVerified(
  outcome: VerificationOutcome,
): outcome is Extract<VerificationOutcome, { status: 'ALREADY_VERIFIED' }> {
  return outcome.status === 'ALREADY_VERIFIED';
}

/** True iff the (phi, sid) pair is not in the registry — possible counterfeit. */
export function isCounterfeit(
  outcome: VerificationOutcome,
): outcome is Extract<VerificationOutcome, { status: 'COUNTERFEIT' }> {
  return outcome.status === 'COUNTERFEIT';
}
