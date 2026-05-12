import { Controller, Get, HttpCode, HttpStatus, Inject, Logger } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Connection } from 'mongoose';
import { InjectConnection } from '@nestjs/mongoose';
import { ProviderService } from '../blockchain/provider.service';
import { SystemWalletService } from '../blockchain/system-wallet.service';
import { ENV_TOKEN } from '../config/config.module';
import type { Env } from '../config/env.schema';

interface HealthStatus {
  status: 'ok' | 'degraded';
  timestamp: string;
  checks: {
    mongo: { status: 'ok' | 'down'; latencyMs?: number };
    rpc: { status: 'ok' | 'down'; chainId?: number; latencyMs?: number };
    ipfs: { status: 'ok' | 'skipped'; provider: string };
    systemWallet: { status: 'ok' | 'unset'; balanceMatic?: string };
  };
}

@ApiTags('observability')
@Controller({ path: 'health', version: '1' })
export class HealthController {
  private readonly logger = new Logger(HealthController.name);

  constructor(
    @InjectConnection() private readonly mongo: Connection,
    private readonly providerService: ProviderService,
    private readonly systemWallet: SystemWalletService,
    @Inject(ENV_TOKEN) private readonly env: Env,
  ) {}

  @Get()
  @ApiOperation({ summary: 'Full readiness check (mongo, rpc, ipfs, system wallet)' })
  @HttpCode(HttpStatus.OK)
  async check(): Promise<HealthStatus> {
    const [mongoCheck, rpcCheck, walletCheck] = await Promise.all([
      this.checkMongo(),
      this.checkRpc(),
      this.checkSystemWallet(),
    ]);
    const status: HealthStatus = {
      status: 'ok',
      timestamp: new Date().toISOString(),
      checks: {
        mongo: mongoCheck,
        rpc: rpcCheck,
        ipfs: { status: 'skipped', provider: this.env.IPFS_PROVIDER },
        systemWallet: walletCheck,
      },
    };
    if (mongoCheck.status !== 'ok' || rpcCheck.status !== 'ok') {
      status.status = 'degraded';
    }
    return status;
  }

  private async checkMongo(): Promise<{ status: 'ok' | 'down'; latencyMs?: number }> {
    const t0 = Date.now();
    try {
      await this.mongo.db?.admin().ping();
      return { status: 'ok', latencyMs: Date.now() - t0 };
    } catch (err) {
      this.logger.warn({ err }, 'Mongo health check failed');
      return { status: 'down' };
    }
  }

  private async checkRpc(): Promise<{
    status: 'ok' | 'down';
    chainId?: number;
    latencyMs?: number;
  }> {
    const t0 = Date.now();
    try {
      const provider = this.providerService.get();
      const network = await provider.getNetwork();
      return { status: 'ok', chainId: Number(network.chainId), latencyMs: Date.now() - t0 };
    } catch (err) {
      this.logger.warn({ err }, 'RPC health check failed');
      return { status: 'down' };
    }
  }

  private async checkSystemWallet(): Promise<{ status: 'ok' | 'unset'; balanceMatic?: string }> {
    if (!this.env.SYSTEM_WALLET_PRIVATE_KEY) return { status: 'unset' };
    try {
      const balance = await this.systemWallet.balanceWei();
      const matic = (Number(balance) / 1e18).toFixed(4);
      return { status: 'ok', balanceMatic: matic };
    } catch {
      return { status: 'unset' };
    }
  }
}
