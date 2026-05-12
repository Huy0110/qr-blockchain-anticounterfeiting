import { Inject, Injectable, OnModuleInit, Logger } from '@nestjs/common';
import { Wallet, NonceManager, type Signer } from 'ethers';
import { ENV_TOKEN } from '../config/config.module';
import type { Env } from '../config/env.schema';
import { ProviderService } from './provider.service';

/**
 * The hub's hot wallet. Pays gas for consumer-initiated redeemProduct
 * calls (per ADR-014: any address can redeem; system wallet covers gas
 * so consumers don't need MATIC).
 *
 * Wrapped in ethers.NonceManager so concurrent submits don't collide on
 * the same nonce — critical for the 10-parallel-redeem load test.
 */
@Injectable()
export class SystemWalletService implements OnModuleInit {
  private readonly logger = new Logger(SystemWalletService.name);
  private signer: Signer | undefined;

  constructor(
    @Inject(ENV_TOKEN) private readonly env: Env,
    private readonly providerService: ProviderService,
  ) {}

  onModuleInit(): void {
    if (!this.env.SYSTEM_WALLET_PRIVATE_KEY) {
      this.logger.warn(
        'SYSTEM_WALLET_PRIVATE_KEY not set; redeemProduct will throw at first call.',
      );
      return;
    }
    const provider = this.providerService.get();
    const pk = this.env.SYSTEM_WALLET_PRIVATE_KEY.startsWith('0x')
      ? this.env.SYSTEM_WALLET_PRIVATE_KEY
      : `0x${this.env.SYSTEM_WALLET_PRIVATE_KEY}`;
    const baseWallet = new Wallet(pk, provider);
    this.signer = new NonceManager(baseWallet);
  }

  get(): Signer {
    if (!this.signer) {
      throw new Error('System wallet not initialised — set SYSTEM_WALLET_PRIVATE_KEY');
    }
    return this.signer;
  }

  async balanceWei(): Promise<bigint> {
    const provider = this.providerService.get();
    const addr = await this.get().getAddress();
    return provider.getBalance(addr);
  }
}
