import { Inject, Injectable, Logger } from '@nestjs/common';
import { ENV_TOKEN } from '../config/config.module';
import type { Env } from '../config/env.schema';
import { IpfsAdapter, type PinResult } from './ipfs-adapter.interface';

/**
 * Pinata IPFS adapter. Uses the JWT API directly (HTTPS) instead of the
 * @pinata/sdk to avoid pulling its transitive deps when IPFS_PROVIDER!='pinata'.
 *
 * Pinata's pinFileToIPFS endpoint accepts multipart/form-data. Pinata's
 * pinJSONToIPFS accepts application/json. Both return { IpfsHash, ... }.
 */
@Injectable()
export class PinataIpfsAdapter extends IpfsAdapter {
  private readonly logger = new Logger(PinataIpfsAdapter.name);
  private readonly base = 'https://api.pinata.cloud/pinning';

  constructor(@Inject(ENV_TOKEN) private readonly env: Env) {
    super();
  }

  async pinBytes(bytes: Uint8Array, filename: string, mimeType: string): Promise<PinResult> {
    const jwt = this.requireJwt();
    const form = new FormData();
    form.append('file', new Blob([bytes], { type: mimeType }), filename);
    const res = await fetch(`${this.base}/pinFileToIPFS`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${jwt}` },
      body: form,
    });
    if (!res.ok) {
      const body = await res.text();
      throw new Error(`Pinata pinFile failed (${res.status}): ${body}`);
    }
    const data = (await res.json()) as { IpfsHash: string };
    return { cid: data.IpfsHash, url: `ipfs://${data.IpfsHash}` };
  }

  async pinJson(payload: unknown, name: string): Promise<PinResult> {
    const jwt = this.requireJwt();
    const res = await fetch(`${this.base}/pinJSONToIPFS`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${jwt}`,
      },
      body: JSON.stringify({
        pinataMetadata: { name },
        pinataContent: payload,
      }),
    });
    if (!res.ok) {
      const body = await res.text();
      throw new Error(`Pinata pinJSON failed (${res.status}): ${body}`);
    }
    const data = (await res.json()) as { IpfsHash: string };
    return { cid: data.IpfsHash, url: `ipfs://${data.IpfsHash}` };
  }

  private requireJwt(): string {
    if (!this.env.PINATA_JWT) {
      throw new Error('PINATA_JWT env var is required when IPFS_PROVIDER=pinata');
    }
    return this.env.PINATA_JWT;
  }
}
