import type { Phi, ProjectMetadata } from '@qr-bc/shared';

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
  if (res.status === 204) return undefined as T;
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

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresAt: number;
}

export interface AuthSession extends AuthTokens {
  email: string;
  producerId: string;
}

/** POST /auth/login → JWT bundle. */
export async function hubLogin(args: { email: string; password: string }): Promise<{
  accessToken: string;
  refreshToken: string;
  accessTokenExpiresInSec: number;
  producerId: string;
  email: string;
}> {
  const res = await fetch(`${HUB_BASE_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(args),
  });
  return handle(res);
}

/** POST /auth/register → JWT bundle. */
export async function hubRegister(args: {
  email: string;
  password: string;
}): Promise<ReturnType<typeof hubLogin> extends Promise<infer T> ? T : never> {
  const res = await fetch(`${HUB_BASE_URL}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(args),
  });
  return handle(res);
}

/** POST /auth/refresh — used by NextAuth's jwt callback when expiring. */
export async function hubRefresh(refreshToken: string): Promise<{
  accessToken: string;
  refreshToken: string;
  accessTokenExpiresInSec: number;
}> {
  const res = await fetch(`${HUB_BASE_URL}/auth/refresh`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refreshToken }),
  });
  return handle(res);
}

/**
 * Authenticated fetch helper — caller passes the accessToken explicitly
 * (server components: read from session; client: from useSession()).
 */
export async function hubFetch<T>(
  path: string,
  init: RequestInit = {},
  accessToken?: string,
): Promise<T> {
  const headers = new Headers(init.headers ?? {});
  headers.set('Accept', 'application/json');
  if (accessToken) headers.set('Authorization', `Bearer ${accessToken}`);
  if (init.body && !headers.has('Content-Type') && !(init.body instanceof FormData)) {
    headers.set('Content-Type', 'application/json');
  }
  const res = await fetch(`${HUB_BASE_URL}${path}`, { ...init, headers });
  return handle<T>(res);
}

// ---------- Project CRUD shims ----------

export interface ListProjectsParams {
  q?: string;
  status?: ProjectMetadata['status'];
  page?: number;
  pageSize?: number;
}

export async function listProjects(
  accessToken: string,
  params: ListProjectsParams = {},
): Promise<{ items: ProjectMetadata[]; total: number }> {
  const qs = new URLSearchParams();
  if (params.q) qs.set('q', params.q);
  if (params.status) qs.set('status', params.status);
  if (params.page) qs.set('page', String(params.page));
  if (params.pageSize) qs.set('pageSize', String(params.pageSize));
  const path = `/projects${qs.toString() ? `?${qs}` : ''}`;
  return hubFetch(path, {}, accessToken);
}

export async function getProject(
  accessToken: string,
  phi: Phi,
): Promise<ProjectMetadata & { _version?: number }> {
  return hubFetch(`/projects/${phi}`, {}, accessToken);
}

/** Hub-shaped project create payload (string dates, no server-managed fields). */
export interface CreateProjectPayload {
  cooperativeName: string;
  vegetableType: string;
  cultivationLocation: {
    address: string;
    province: string;
    coordinates?: { lat: number; lng: number };
  };
  startDate: string;
  harvestDate: string;
  cultivationArea: number;
  expectedOutput: number;
  description: string;
}

export type UpdateProjectPayload = Partial<CreateProjectPayload> & {
  status?: ProjectMetadata['status'];
};

export async function createProject(
  accessToken: string,
  payload: CreateProjectPayload,
): Promise<ProjectMetadata> {
  return hubFetch(`/projects`, { method: 'POST', body: JSON.stringify(payload) }, accessToken);
}

export async function updateProject(
  accessToken: string,
  phi: Phi,
  payload: UpdateProjectPayload,
): Promise<ProjectMetadata> {
  return hubFetch(
    `/projects/${phi}`,
    { method: 'PATCH', body: JSON.stringify(payload) },
    accessToken,
  );
}

export async function deleteProject(accessToken: string, phi: Phi): Promise<void> {
  return hubFetch(`/projects/${phi}`, { method: 'DELETE' }, accessToken);
}

export { HUB_BASE_URL };
