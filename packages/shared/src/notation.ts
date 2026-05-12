/**
 * Paper-notation aliases. These let test code read like the paper:
 *
 *   const h_i = hashSid(sid_i);
 *   const addr_P: addr_P = await wallet.getAddress();
 *
 * Aliases collapse to the canonical TypeScript types defined in `./types`,
 * so they don't introduce a new branch of the type tree.
 *
 * Naming follows the paper Notation table (lines 1346–1409). We also export
 * an ASCII alias for `phi` since the Greek letter is awkward to type.
 */
import type { Phi, Sid, Hash, Address } from './types.js';

/** Paper symbol φ (project identifier). */
export type phi = Phi;

/** Paper symbol sid (secret identifier the consumer scans). */
export type sid = Sid;

/** Paper symbol h (= sha256(sid)). */
export type h = Hash;

/** Paper symbol addr_P (producer wallet address). */
export type addr_P = Address;
