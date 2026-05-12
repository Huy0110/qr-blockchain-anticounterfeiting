import { Inject, Injectable, OnModuleInit } from '@nestjs/common';
import { JsonRpcProvider } from 'ethers';
import { ENV_TOKEN } from '../config/config.module';
import type { Env } from '../config/env.schema';

/**
 * Single ethers Provider for the entire hub. Switches RPC URL by
 * NETWORK env var. Reads RPC_URL directly so docker-compose can override
 * per-network without re-baking the image.
 */
@Injectable()
export class ProviderService implements OnModuleInit {
  private provider!: JsonRpcProvider;

  constructor(@Inject(ENV_TOKEN) private readonly env: Env) {}

  onModuleInit(): void {
    this.provider = new JsonRpcProvider(this.env.RPC_URL, undefined, {
      staticNetwork: true,
      batchMaxCount: 1,
    });
  }

  get(): JsonRpcProvider {
    return this.provider;
  }

  network(): 'hardhat' | 'amoy' | 'mainnet' {
    return this.env.NETWORK;
  }
}
