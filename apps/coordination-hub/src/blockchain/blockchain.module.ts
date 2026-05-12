import { Inject, Module } from '@nestjs/common';
import { ENV_TOKEN } from '../config/config.module';
import type { Env } from '../config/env.schema';
import { ContractService, StubContractService } from './contract.service';
import { WalletService } from './wallet.service';
import { ProviderService } from './provider.service';
import { SystemWalletService } from './system-wallet.service';
import { EthersContractService } from './ethers-contract.service';

/**
 * Blockchain module. ContractService binding is selected at runtime:
 * - if env.CONTRACT_ADDRESS is set, use the real ethers-backed impl
 *   (EthersContractService);
 * - otherwise (typical for unit/integration tests without a deployed
 *   contract), bind StubContractService so DI succeeds and tests can
 *   override individual methods with vi.fn() spies.
 */
const contractServiceProvider = {
  provide: ContractService,
  inject: [ENV_TOKEN, ProviderService, SystemWalletService, WalletService, StubContractService],
  useFactory: (
    env: Env,
    provider: ProviderService,
    systemWallet: SystemWalletService,
    wallet: WalletService,
    stub: StubContractService,
  ): ContractService => {
    if (env.CONTRACT_ADDRESS) {
      const real = new EthersContractService(env, provider, systemWallet, wallet);
      real.onModuleInit();
      return real;
    }
    return stub;
  },
};

@Module({
  providers: [
    WalletService,
    ProviderService,
    SystemWalletService,
    StubContractService,
    contractServiceProvider,
  ],
  exports: [WalletService, ContractService, ProviderService, SystemWalletService],
})
export class BlockchainModule {
  // eslint-disable-next-line @typescript-eslint/no-empty-function
  constructor(@Inject(ENV_TOKEN) _env: Env) {}
}
