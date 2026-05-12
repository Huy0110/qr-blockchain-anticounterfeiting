import { Inject, Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ENV_TOKEN } from '../config/config.module';
import type { Env } from '../config/env.schema';
import { IpfsAdapter, type PinResult } from './ipfs-adapter.interface';

interface KuboClient {
  add(input: Uint8Array | Buffer): Promise<{ cid: { toString(): string } }>;
}

/**
 * IPFS adapter for a local Kubo node (per-instance docker-compose service).
 * Lazy-loads ipfs-http-client at first use so the package isn't required
 * when IPFS_PROVIDER=mock or =pinata.
 */
@Injectable()
export class KuboIpfsAdapter extends IpfsAdapter implements OnModuleInit {
  private readonly logger = new Logger(KuboIpfsAdapter.name);
  private client: KuboClient | undefined;

  constructor(@Inject(ENV_TOKEN) private readonly env: Env) {
    super();
  }

  async onModuleInit(): Promise<void> {
    try {
      const mod = (await import('ipfs-http-client')) as {
        create(opts: { url: string }): KuboClient;
      };
      this.client = mod.create({ url: this.env.IPFS_API_URL });
    } catch (err) {
      this.logger.warn(
        { err },
        'ipfs-http-client failed to load; KuboIpfsAdapter will throw on use',
      );
    }
  }

  async pinBytes(bytes: Uint8Array): Promise<PinResult> {
    const client = this.requireClient();
    const result = await client.add(bytes);
    const cid = result.cid.toString();
    return { cid, url: `ipfs://${cid}` };
  }

  async pinJson(payload: unknown): Promise<PinResult> {
    return this.pinBytes(new TextEncoder().encode(JSON.stringify(payload)));
  }

  private requireClient(): KuboClient {
    if (!this.client) throw new Error('Kubo IPFS client not initialised');
    return this.client;
  }
}
