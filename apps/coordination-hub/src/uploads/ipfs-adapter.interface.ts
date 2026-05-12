export interface PinResult {
  cid: string;
  url: string; // ipfs://CID
}

/**
 * Adapter interface for IPFS pinning. Two production implementations
 * (kubo, pinata) plus a deterministic in-memory mock (used by tests +
 * CI to keep the suite hermetic). Selected at module-init time via the
 * IPFS_PROVIDER env var.
 */
export abstract class IpfsAdapter {
  abstract pinBytes(bytes: Uint8Array, filename: string, mimeType: string): Promise<PinResult>;
  abstract pinJson(payload: unknown, name: string): Promise<PinResult>;
}
