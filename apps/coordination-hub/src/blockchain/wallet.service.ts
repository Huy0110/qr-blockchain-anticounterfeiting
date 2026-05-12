import type { OnModuleInit } from '@nestjs/common';
import { Inject, Injectable } from '@nestjs/common';
import { gcm } from '@noble/ciphers/aes';
import type { HDNodeWallet } from 'ethers';
import { Wallet } from 'ethers';
import { ENV_TOKEN } from '../config/config.module';
import type { Env } from '../config/env.schema';

interface EncryptedKey {
  ciphertext: string; // base64
  iv: string; // base64 (12 bytes)
  authTag: string; // base64 (16 bytes)
}

/**
 * WalletService — AES-256-GCM at-rest encryption for producer private keys
 * (NF-S-6 + ADR-004). The KEK is loaded once at startup from the validated
 * env (WALLET_ENCRYPTION_KEK, base64 32 bytes).
 *
 * Key zeroization: callers must use signWithProducer(...) which gets a
 * scoped Wallet, performs the signing, then immediately overwrites the
 * private-key buffer. The Wallet's underlying _signingKey is not
 * directly settable in ethers v6, so we instead drop our reference + force
 * GC-friendly zeroization of the decrypted bytes buffer.
 */
@Injectable()
export class WalletService implements OnModuleInit {
  private kek!: Uint8Array;

  constructor(@Inject(ENV_TOKEN) private readonly env: Env) {}

  onModuleInit(): void {
    if (!this.env.WALLET_ENCRYPTION_KEK) {
      // Acceptable in test mode where some unit tests configure their own
      // KEK via setKekForTesting; throw at first use rather than at boot
      // to keep AppModule boot-safe in test envs.
      this.kek = new Uint8Array(0);
      return;
    }
    this.kek = base64ToBytes(this.env.WALLET_ENCRYPTION_KEK);
    if (this.kek.length !== 32) {
      throw new Error(`WALLET_ENCRYPTION_KEK must decode to 32 bytes, got ${this.kek.length}`);
    }
  }

  /** Test-only KEK override. Throws if called outside test/dev. */
  setKekForTesting(kek: Uint8Array): void {
    if (this.env.NODE_ENV === 'production') {
      throw new Error('setKekForTesting is forbidden in production');
    }
    if (kek.length !== 32) throw new Error('KEK must be 32 bytes');
    this.kek = kek;
  }

  /** Generate a fresh wallet and return the encrypted-key bundle plus the address. */
  generateAndEncrypt(): { walletAddress: string; encrypted: EncryptedKey } {
    this.assertKekReady();
    const wallet = Wallet.createRandom();
    const pkBytes = hexToBytes(wallet.privateKey);
    try {
      const encrypted = this.encryptBytes(pkBytes);
      return { walletAddress: wallet.address, encrypted };
    } finally {
      pkBytes.fill(0);
    }
  }

  /** Encrypt arbitrary bytes (used for batch testing + key rotation). */
  encryptBytes(plaintext: Uint8Array): EncryptedKey {
    this.assertKekReady();
    const iv = randomBytes(12);
    const aead = gcm(this.kek, iv);
    const ciphertextWithTag = aead.encrypt(plaintext);
    // @noble/ciphers gcm appends the 16-byte auth tag to the ciphertext.
    const tagOffset = ciphertextWithTag.length - 16;
    const ciphertext = ciphertextWithTag.subarray(0, tagOffset);
    const authTag = ciphertextWithTag.subarray(tagOffset);
    return {
      ciphertext: bytesToBase64(ciphertext),
      iv: bytesToBase64(iv),
      authTag: bytesToBase64(authTag),
    };
  }

  /** Decrypt and return raw bytes. Caller is responsible for zeroizing. */
  decryptToBytes(enc: EncryptedKey): Uint8Array {
    this.assertKekReady();
    const iv = base64ToBytes(enc.iv);
    const ciphertext = base64ToBytes(enc.ciphertext);
    const authTag = base64ToBytes(enc.authTag);
    const aead = gcm(this.kek, iv);
    const merged = new Uint8Array(ciphertext.length + authTag.length);
    merged.set(ciphertext);
    merged.set(authTag, ciphertext.length);
    return aead.decrypt(merged);
  }

  /**
   * Run `fn` with a freshly decrypted ethers Wallet, then zero the local
   * plaintext buffer + drop our Wallet reference + drop the hex-string
   * intermediate.
   *
   * @custom:residual-risk
   * The `ethers.Wallet` constructor copies the private key into its own
   * `_signingKey` field that we cannot reach. After this method returns:
   *   1. our local `pkBytes` buffer is overwritten with zeros (verified
   *      by wallet.service.spec.ts);
   *   2. our `wallet` reference is dropped, leaving only ethers' own
   *      internal SigningKey reachable via the closure of any `fn`
   *      that retained a Wallet reference;
   *   3. callers MUST NOT escape the Wallet object out of `fn` — the
   *      function-scoped reference becomes unreachable as soon as `fn`
   *      returns, allowing v8 GC to reclaim the SigningKey + its
   *      private key.
   * Until the GC runs, a heap dump WOULD reveal the key. v1 documents
   * this as accepted residual risk in THREAT_MODEL.md (Phase 9). The
   * v2 fix is to switch to a SigningKey + signTransaction direct flow
   * that never instantiates Wallet (deferred — requires reworking
   * EthersContractService).
   */
  async withWallet<T>(enc: EncryptedKey, fn: (wallet: Wallet) => Promise<T>): Promise<T> {
    const pkBytes = this.decryptToBytes(enc);
    let pkHex: string | undefined = bytesToHex(pkBytes);
    let wallet: Wallet | HDNodeWallet | undefined;
    try {
      wallet = new Wallet(pkHex);
      return await fn(wallet);
    } finally {
      // Multi-level zeroization: bytes (we own), hex string (intermediate),
      // and our Wallet reference. ethers' internal SigningKey survives
      // until the GC notices `fn`'s closure has dropped — see JSDoc
      // residual-risk note above.
      pkBytes.fill(0);
      pkHex = undefined;
      wallet = undefined;
    }
  }

  private assertKekReady(): void {
    if (!this.kek || this.kek.length === 0) {
      throw new Error(
        'WalletService KEK is not configured. Set WALLET_ENCRYPTION_KEK in env or call setKekForTesting in tests.',
      );
    }
  }
}

// -- helpers ------------------------------------------------------------------

function randomBytes(n: number): Uint8Array {
  const buf = new Uint8Array(n);
  globalThis.crypto.getRandomValues(buf);
  return buf;
}

function bytesToHex(bytes: Uint8Array): string {
  let out = '0x';
  for (const b of bytes) out += b.toString(16).padStart(2, '0');
  return out;
}

function hexToBytes(hex: string): Uint8Array {
  const trimmed = hex.startsWith('0x') ? hex.slice(2) : hex;
  const bytes = new Uint8Array(trimmed.length / 2);
  for (let i = 0; i < bytes.length; i++) {
    bytes[i] = parseInt(trimmed.slice(i * 2, i * 2 + 2), 16);
  }
  return bytes;
}

function bytesToBase64(bytes: Uint8Array): string {
  return Buffer.from(bytes).toString('base64');
}

function base64ToBytes(b64: string): Uint8Array {
  return new Uint8Array(Buffer.from(b64, 'base64'));
}
