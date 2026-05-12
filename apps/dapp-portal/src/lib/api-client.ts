import type { Phi, Sid, ProjectMetadata, VerificationOutcome } from '@qr-bc/shared';

const HUB_BASE_URL = process.env.NEXT_PUBLIC_HUB_BASE_URL ?? 'http://localhost:3000/api/v1';

export class HubApiError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: string,
    public readonly requestId?: string,
    message?: string,
  ) {
    super(message ?? `Hub returned ${status} ${code}`);
    this.name = 'HubApiError';
  }
}

interface HubErrorBody {
  error?: { code?: string; message?: string; requestId?: string };
}

async function handle<T>(res: Response): Promise<T> {
  if (res.ok) return (await res.json()) as T;
  let body: HubErrorBody = {};
  try {
    body = (await res.json()) as HubErrorBody;
  } catch {
    /* keep default */
  }
  throw new HubApiError(
    res.status,
    body.error?.code ?? 'UNKNOWN',
    body.error?.requestId,
    body.error?.message,
  );
}

/** GET /scan/public/:phi — anonymous, returns project metadata if visible. */
export async function fetchPublicScan(phi: Phi): Promise<ProjectMetadata> {
  const res = await fetch(`${HUB_BASE_URL}/scan/public/${phi}`, {
    method: 'GET',
    headers: { Accept: 'application/json' },
  });
  return handle<ProjectMetadata>(res);
}

/** POST /scan/private — submits sid; resolves with one of three outcomes. */
export async function postPrivateScan(args: {
  projectId: Phi;
  secretId: Sid;
}): Promise<VerificationOutcome> {
  const res = await fetch(`${HUB_BASE_URL}/scan/private`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify(args),
  });
  return handle<VerificationOutcome>(res);
}

export { HUB_BASE_URL };
