import { describe, it, expect } from 'vitest';
import { sha256 as ethersSha256, randomBytes, toBeHex } from 'ethers';
import {
  hashSid,
  generateSid,
  InvalidByteLengthError,
  InvalidHexError,
  NoCsprngError,
  MIN_SID_BYTES,
  DEFAULT_SID_BYTES,
} from '../src/hashing.js';

/**
 * Cross-check suite. AC-SP-2 says hashSid(sid) must equal the on-chain
 * sha256(sid) precompile output for the same input. The on-chain implementation
 * IS canonical SHA-256 (the EVM precompile at address 0x02 invokes the same
 * algorithm), so cross-checking against ethers.sha256 — which is the
 * battle-tested JS implementation of EVM-compatible SHA-256 — is sufficient
 * to prove the off-chain helper agrees with the on-chain precompile.
 *
 * The contract's own Hashing.t.sol (T-007) proves on-chain bytecode actually
 * calls precompile 0x02. Combined with this test, we have transitive
 * equivalence: hashSid(sid) === ethers.sha256(sid) === sha256_precompile(sid).
 */

describe('hashSid', () => {
  it('returns the canonical SHA-256 of empty input (EC-SP-1)', () => {
    expect(hashSid(new Uint8Array(0))).toBe(
      '0xe3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
    );
    expect(hashSid('0x')).toBe(
      '0xe3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
    );
  });

  it('cross-checks against ethers.sha256 for 100 random sids (AC-SP-2)', () => {
    for (let i = 0; i < 100; i++) {
      const len = MIN_SID_BYTES + (i % 17); // 16..32 bytes
      const bytes = randomBytes(len);
      const ours = hashSid(bytes);
      const reference = ethersSha256(bytes);
      expect(ours).toBe(reference);
    }
  });

  it('produces the same hash for hex-string and byte-array inputs', () => {
    const bytes = randomBytes(32);
    const hexSid = `0x${Buffer.from(bytes).toString('hex')}` as const;
    expect(hashSid(bytes)).toBe(hashSid(hexSid));
  });

  it('throws InvalidHexError for non-hex string (EC-SP-2)', () => {
    expect(() => hashSid('not-hex')).toThrowError(InvalidHexError);
    expect(() => hashSid('0xZZZZ')).toThrowError(InvalidHexError);
    expect(() => hashSid('0xabc')).toThrowError(InvalidHexError); // odd length
  });
});

describe('generateSid', () => {
  it('produces a 32-byte sid by default (AC-SP-3)', () => {
    const sid = generateSid();
    expect(sid).toMatch(/^0x[0-9a-f]{64}$/);
    expect(sid.length).toBe(2 + DEFAULT_SID_BYTES * 2);
  });

  it('respects byteLength', () => {
    const sid = generateSid(24);
    expect(sid).toMatch(/^0x[0-9a-f]{48}$/);
  });

  it('produces non-deterministic output across calls', () => {
    const a = generateSid();
    const b = generateSid();
    expect(a).not.toBe(b);
  });

  it('throws InvalidByteLengthError for byteLength=0 (EC-SP-3)', () => {
    expect(() => generateSid(0)).toThrowError(InvalidByteLengthError);
  });

  it('throws below MIN_SID_BYTES (16)', () => {
    expect(() => generateSid(MIN_SID_BYTES - 1)).toThrowError(InvalidByteLengthError);
  });

  it('throws on non-integer byteLength', () => {
    expect(() => generateSid(15.5)).toThrowError(InvalidByteLengthError);
  });

  it('round-trip: hashSid(generateSid()) is a valid 32-byte hash', () => {
    const sid = generateSid();
    const h = hashSid(sid);
    expect(h).toMatch(/^0x[0-9a-f]{64}$/);
  });

  it('throws NoCsprngError when globalThis.crypto is missing', () => {
    const original = globalThis.crypto;
    try {
      // @ts-expect-error — deliberately removing the API for this test
      delete globalThis.crypto;
      expect(() => generateSid()).toThrowError(NoCsprngError);
      expect(() => generateSid()).toThrowError(/No CSPRNG available/);
    } finally {
      Object.defineProperty(globalThis, 'crypto', {
        value: original,
        configurable: true,
        writable: true,
      });
    }
  });
});

describe('numerical sanity', () => {
  it('hashSid byte length matches toBeHex(_, 32)', () => {
    const bytes = randomBytes(8);
    const h = hashSid(bytes);
    // toBeHex converts to a 32-byte 0x-prefixed hex string.
    expect(h.length).toBe(toBeHex(0, 32).length);
  });
});
