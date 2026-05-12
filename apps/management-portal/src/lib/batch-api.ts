import type { Phi } from '@qr-bc/shared';

const HUB_BASE_URL = process.env.NEXT_PUBLIC_HUB_BASE_URL ?? 'http://localhost:3000/api/v1';

export interface BatchListItem {
  count: number;
  status: 'pending' | 'confirmed' | 'failed';
  txHash?: string;
  createdAt: string;
}

/**
 * Fire POST /projects/:phi/batches and stream the ZIP into a Blob, then
 * trigger an automatic browser download. Returns the tx hash extracted
 * from the response headers (set by the hub via X-Tx-Hash).
 *
 * The hub responds with `Content-Disposition: attachment; filename=...`
 * and the raw ZIP bytes in the body — no JSON envelope.
 */
export async function postBatch(
  accessToken: string,
  phi: Phi,
  n: number,
): Promise<{ blob: Blob; filename: string; txHash?: string | undefined }> {
  const res = await fetch(`${HUB_BASE_URL}/projects/${phi}/batches`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ n }),
  });
  if (!res.ok) {
    let code = 'UNKNOWN';
    try {
      const j = (await res.json()) as { error?: { code?: string; message?: string } };
      code = j.error?.code ?? code;
    } catch {
      /* keep default */
    }
    throw Object.assign(new Error(`Batch failed: ${code}`), { status: res.status, code });
  }
  const blob = await res.blob();
  const cd = res.headers.get('Content-Disposition') ?? '';
  const m = cd.match(/filename="([^"]+)"/);
  const filename = m?.[1] ?? `batch-${phi.slice(0, 10)}.zip`;
  const txHash = res.headers.get('X-Tx-Hash');
  return txHash ? { blob, filename, txHash } : { blob, filename };
}

export async function listBatches(
  accessToken: string,
  phi: Phi,
): Promise<{ items: BatchListItem[]; note?: string }> {
  const res = await fetch(`${HUB_BASE_URL}/projects/${phi}/batches`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) return { items: [] };
  return (await res.json()) as { items: BatchListItem[]; note?: string };
}

/** Best-effort cost estimate. Real numbers depend on RPC gas + price. */
export function estimateCost(n: number): { gasGwei: number; matic: number } {
  // ProductRegistry.registerBatch is O(n) writes; each (sid, h) pair
  // costs ~50k gas at the contract's storage profile. At 30 Gwei on
  // Polygon Amoy a batch of 100 sits around 0.15 MATIC.
  const gasPerItem = 50_000;
  const gasGwei = (gasPerItem * n) / 1000; // gas units → Gwei-equivalent rough estimate
  const matic = ((gasPerItem * n * 30) / 1e18) * 1e9; // gas * gwei * 1e9 = wei → MATIC
  return { gasGwei, matic: Math.round(matic * 10_000) / 10_000 };
}
