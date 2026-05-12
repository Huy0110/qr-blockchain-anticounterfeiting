import { Injectable } from '@nestjs/common';
import { createHash } from 'node:crypto';
import { IpfsAdapter, type PinResult } from './ipfs-adapter.interface';

/**
 * In-memory IPFS adapter used by tests + CI. Computes a deterministic
 * pseudo-CID from sha256(content) so identical inputs always yield the
 * same CID — useful for assertions. Does NOT actually pin anywhere.
 */
@Injectable()
export class MockIpfsAdapter extends IpfsAdapter {
  pinBytes(bytes: Uint8Array): Promise<PinResult> {
    return Promise.resolve(this.deterministic(bytes));
  }

  pinJson(payload: unknown): Promise<PinResult> {
    const bytes = new TextEncoder().encode(JSON.stringify(payload));
    return Promise.resolve(this.deterministic(bytes));
  }

  private deterministic(bytes: Uint8Array): PinResult {
    const hex = createHash('sha256').update(Buffer.from(bytes)).digest('hex');
    // Distinct prefix from real CIDs (Qm... or bafy...) so consumers can
    // detect the mock by inspection if needed.
    const cid = `bamock${hex.slice(0, 50)}`;
    return { cid, url: `ipfs://${cid}` };
  }
}
