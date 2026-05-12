import { Inject, Injectable, Logger, OnModuleInit } from '@nestjs/common';
import {
  Contract,
  ZeroAddress,
  type ContractRunner,
  type Log,
  type TransactionReceipt,
} from 'ethers';
import { ProductRegistryABI } from '@qr-bc/shared';
import type { Phi, Hash, Address } from '@qr-bc/shared';
import { ENV_TOKEN } from '../config/config.module';
import type { Env } from '../config/env.schema';
import {
  ContractService,
  type EncryptedKeyBundle,
  type RedeemResult,
  type VerifyProductResult,
} from './contract.service';
import { ProviderService } from './provider.service';
import { SystemWalletService } from './system-wallet.service';
import { WalletService } from './wallet.service';
import { tryMapRevertToDomainError } from './exceptions';

interface CacheEntry<T> {
  value: T;
  expiresAt: number;
}

const VIEW_CACHE_TTL_MS = 5_000;

/**
 * Real ContractService implementation. Replaces StubContractService at
 * BlockchainModule binding time when this class is wired in.
 *
 * View calls (verifyProduct, projectExists, totalRedeemed) go through a
 * tiny per-key LRU cache with a 5-second TTL — the workload is read-heavy
 * (every public scan hits projectExists) and stale 5-second data is
 * acceptable for the dApp's purposes.
 */
@Injectable()
export class EthersContractService extends ContractService implements OnModuleInit {
  private readonly logger = new Logger(EthersContractService.name);
  private contract!: Contract;
  private readonly viewCache = new Map<string, CacheEntry<unknown>>();
  private cacheHits = 0;
  private cacheMisses = 0;
  /** Counter for cache stats + reinit observability. Incremented every
   *  time the contract instance is rebuilt (initial onModuleInit + every
   *  RPC-error recovery). Surfaced via cacheStats for the load-test gate. */
  private contractGeneration = 0;

  constructor(
    @Inject(ENV_TOKEN) private readonly env: Env,
    private readonly providerService: ProviderService,
    private readonly systemWallet: SystemWalletService,
    private readonly wallet: WalletService,
  ) {
    super();
  }

  onModuleInit(): void {
    if (!this.env.CONTRACT_ADDRESS) {
      this.logger.warn('CONTRACT_ADDRESS not set; on-chain calls will throw at first use.');
      return;
    }
    this.reinitContract();
  }

  /**
   * Build a fresh Contract instance against the current provider. Called on
   * onModuleInit and every time withRetryOnRpcError detects an RPC-level
   * failure (per Phase 3 review I-3).
   */
  reinitContract(): void {
    if (!this.env.CONTRACT_ADDRESS) return;
    this.contract = new Contract(
      this.env.CONTRACT_ADDRESS,
      ProductRegistryABI as never,
      this.providerService.get(),
    );
    this.contractGeneration++;
    this.invalidateCache();
  }

  /** True if `err` looks like an RPC-layer failure rather than an
   *  EVM-level revert. Used to decide whether to retry-after-reinit. */
  private isRpcError(err: unknown): boolean {
    if (!err || typeof err !== 'object') return false;
    const e = err as { code?: string; shortMessage?: string; message?: string };
    if (
      e.code === 'NETWORK_ERROR' ||
      e.code === 'ECONNREFUSED' ||
      e.code === 'TIMEOUT' ||
      e.code === 'SERVER_ERROR' ||
      e.code === 'BAD_DATA'
    ) {
      return true;
    }
    const msg = (e.shortMessage ?? e.message ?? '').toLowerCase();
    return /could not detect network|connection refused|fetch failed|socket hang up|network/.test(
      msg,
    );
  }

  /** Run `fn`; on RPC-level failure, reinit the contract once and retry. */
  private async withRetryOnRpcError<T>(fn: () => Promise<T>): Promise<T> {
    try {
      return await fn();
    } catch (err) {
      if (!this.isRpcError(err)) throw err;
      this.logger.warn(
        { err, generation: this.contractGeneration },
        'RPC error detected; reinitialising contract and retrying once',
      );
      this.reinitContract();
      return fn();
    }
  }

  /** Snapshot of how many times the Contract has been (re)built. Useful
   *  for tests that want to assert reinit happened. */
  contractGenerationCount(): number {
    return this.contractGeneration;
  }

  cacheStats(): { hits: number; misses: number; size: number; hitRate: number } {
    const total = this.cacheHits + this.cacheMisses;
    return {
      hits: this.cacheHits,
      misses: this.cacheMisses,
      size: this.viewCache.size,
      hitRate: total === 0 ? 0 : this.cacheHits / total,
    };
  }

  async registerProject(phi: Phi, ownerKey: EncryptedKeyBundle): Promise<string> {
    return this.signAndSend(ownerKey, 'registerProject', [phi]);
  }

  async registerBatch(phi: Phi, hashes: Hash[], ownerKey: EncryptedKeyBundle): Promise<string> {
    return this.signAndSend(ownerKey, 'registerBatch', [phi, hashes]);
  }

  async redeemProduct(phi: Phi, sid: Uint8Array): Promise<RedeemResult> {
    return this.withRetryOnRpcError(async () => {
      this.requireContract();
      const signer = this.systemWallet.get();
      const c = this.contract.connect(signer) as Contract;
      try {
        const tx = await c.getFunction('redeemProduct').send(phi, sid);
        const receipt = (await tx.wait(this.env.TX_CONFIRMATIONS)) as TransactionReceipt | null;
        if (!receipt) throw new Error('transaction receipt missing');
        const block = await this.providerService.get().getBlock(receipt.blockNumber);
        this.invalidateCache(phi);
        return {
          txHash: receipt.hash,
          blockNumber: receipt.blockNumber,
          timestamp: block?.timestamp ?? Math.floor(Date.now() / 1000),
        };
      } catch (err) {
        throw tryMapRevertToDomainError(err) ?? err;
      }
    });
  }

  async verifyProduct(phi: Phi, h: Hash): Promise<VerifyProductResult> {
    return this.cachedView(`verify:${phi}:${h}`, () =>
      this.withRetryOnRpcError(async () => {
        this.requireContract();
        try {
          const result = (await this.contract.getFunction('verifyProduct')(phi, h)) as [
            boolean,
            boolean,
            string,
          ];
          return {
            exists: Boolean(result[0]),
            redeemed: Boolean(result[1]),
            producer: (result[2] as Address) ?? (ZeroAddress as Address),
          };
        } catch (err) {
          throw tryMapRevertToDomainError(err) ?? err;
        }
      }),
    );
  }

  async projectExists(phi: Phi): Promise<boolean> {
    return this.cachedView(`projectExists:${phi}`, () =>
      this.withRetryOnRpcError(async () => {
        this.requireContract();
        try {
          return Boolean(await this.contract.getFunction('projectExists')(phi));
        } catch (err) {
          throw tryMapRevertToDomainError(err) ?? err;
        }
      }),
    );
  }

  async totalRedeemed(): Promise<bigint> {
    return this.cachedView('totalRedeemed', () =>
      this.withRetryOnRpcError(async () => {
        this.requireContract();
        try {
          return (await this.contract.getFunction('totalRedeemed')()) as bigint;
        } catch (err) {
          throw tryMapRevertToDomainError(err) ?? err;
        }
      }),
    );
  }

  private async signAndSend(
    ownerKey: EncryptedKeyBundle,
    method: string,
    args: unknown[],
  ): Promise<string> {
    return this.withRetryOnRpcError(() =>
      this.wallet.withWallet(ownerKey, async (signerWallet) => {
        this.requireContract();
        const provider = this.providerService.get();
        const signer = signerWallet.connect(provider);
        const c = this.contract.connect(signer as ContractRunner) as Contract;
        try {
          const tx = await c.getFunction(method).send(...args);
          const receipt = (await tx.wait(this.env.TX_CONFIRMATIONS)) as TransactionReceipt | null;
          if (!receipt) throw new Error('transaction receipt missing');
          const phi = (args[0] as string | undefined) ?? '';
          if (phi) this.invalidateCache(phi);
          return receipt.hash;
        } catch (err) {
          throw tryMapRevertToDomainError(err) ?? err;
        }
      }),
    );
  }

  private async cachedView<T>(key: string, fn: () => Promise<T>): Promise<T> {
    const cached = this.viewCache.get(key);
    const now = Date.now();
    if (cached && cached.expiresAt > now) {
      this.cacheHits++;
      return cached.value as T;
    }
    this.cacheMisses++;
    const value = await fn();
    this.viewCache.set(key, { value, expiresAt: now + VIEW_CACHE_TTL_MS });
    return value;
  }

  private invalidateCache(phi?: string): void {
    if (!phi) {
      this.viewCache.clear();
      return;
    }
    for (const key of this.viewCache.keys()) {
      if (key.includes(phi)) this.viewCache.delete(key);
    }
  }

  private requireContract(): void {
    if (!this.contract) {
      throw new Error('Contract not initialised — set CONTRACT_ADDRESS in env');
    }
  }

  /** Decode a TransactionReceipt log into the ProductRedeemed event args. */
  decodeProductRedeemed(log: Log):
    | {
        phi: string;
        h: string;
        producer: string;
        timestamp: number;
      }
    | undefined {
    try {
      const parsed = this.contract.interface.parseLog({
        topics: Array.from(log.topics),
        data: log.data,
      });
      if (!parsed || parsed.name !== 'ProductRedeemed') return undefined;
      return {
        phi: String(parsed.args[0]),
        h: String(parsed.args[1]),
        producer: String(parsed.args[2]),
        timestamp: Number(parsed.args[3]),
      };
    } catch {
      return undefined;
    }
  }
}
