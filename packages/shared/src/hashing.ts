import { sha256 } from '@noble/hashes/sha256';
import { bytesToHex, hexToBytes } from '@noble/hashes/utils';
import type { Hash, Sid } from './types.js';

/** Minimum acceptable sid length in bytes. Producer wallets must use a
 *  CSPRNG with at least this many bits of entropy to make collision attacks
 *  infeasible. The contract itself enforces no minimum (sha256 of any byte
 *  string is well-defined), but the hub's input validation does. */
export const MIN_SID_BYTES = 16;
export const DEFAULT_SID_BYTES = 32;

/** Thrown when generateSid is asked for a length below MIN_SID_BYTES. */
export class InvalidByteLengthError extends Error {
  override readonly name = 'InvalidByteLengthError' as const;
  constructor(received: number) {
    super(`generateSid requires byteLength >= ${MIN_SID_BYTES}, received ${received}`);
  }
}

/** Thrown when a 0x-prefixed hex string fails to parse. */
export class InvalidHexError extends Error {
  override readonly name = 'InvalidHexError' as const;
  constructor(received: string) {
    super(`expected 0x-prefixed hex string, received: ${received}`);
  }
}

/** Thrown when generateSid runs in an environment without a Web Crypto API.
 *  Node 19+ and all modern browsers have `globalThis.crypto.getRandomValues`,
 *  so this should only fire on legacy Node (< 19) where the runtime has no
 *  CSPRNG primitive. */
export class NoCsprngError extends Error {
  override readonly name = 'NoCsprngError' as const;
  constructor() {
    super(
      'No CSPRNG available: globalThis.crypto.getRandomValues is missing. ' +
        'This package requires Node >= 19 or a modern browser.',
    );
  }
}

/**
 * SHA-256 hash of sid bytes — must match the on-chain `sha256()` precompile
 * result for the same input. Verified by the cross-check test suite
 * (test/hashing.test.ts) and transitively by the contract-level Hashing.t.sol.
 *
 * Accepts either a Uint8Array or a 0x-prefixed hex string.
 */
export function hashSid(sid: Uint8Array | Sid | string): Hash {
  const bytes = sid instanceof Uint8Array ? sid : sidStringToBytes(sid);
  return `0x${bytesToHex(sha256(bytes))}` as Hash;
}

/**
 * Generate a CSPRNG-backed random sid. Returns a 0x-prefixed hex string of
 * `byteLength` bytes (default 32 = 64 hex chars + 0x prefix).
 *
 * Uses Web Crypto when available (browser, Node 19+), falling back to
 * Node's `crypto.randomFillSync`. Throws InvalidByteLengthError if
 * byteLength < MIN_SID_BYTES.
 */
export function generateSid(byteLength: number = DEFAULT_SID_BYTES): Sid {
  if (!Number.isInteger(byteLength) || byteLength < MIN_SID_BYTES) {
    throw new InvalidByteLengthError(byteLength);
  }
  const buf = new Uint8Array(byteLength);
  // globalThis.crypto is guaranteed in Node 19+ and all modern browsers.
  // The non-null assertion is safe because the runtime check below would
  // throw before this line on hosts that lack it.
  const cryptoApi = globalThis.crypto;
  if (!cryptoApi || typeof cryptoApi.getRandomValues !== 'function') {
    throw new NoCsprngError();
  }
  cryptoApi.getRandomValues(buf);
  return `0x${bytesToHex(buf)}` as Sid;
}

function sidStringToBytes(sid: string): Uint8Array {
  if (typeof sid !== 'string') throw new InvalidHexError(String(sid));
  const trimmed = sid.startsWith('0x') ? sid.slice(2) : sid;
  if (!/^[0-9a-fA-F]*$/.test(trimmed)) throw new InvalidHexError(sid);
  if (trimmed.length % 2 !== 0) throw new InvalidHexError(sid);
  return hexToBytes(trimmed);
}
