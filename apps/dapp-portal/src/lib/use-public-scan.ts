'use client';

import { useQuery } from '@tanstack/react-query';
import type { Phi, ProjectMetadata } from '@qr-bc/shared';
import { fetchPublicScan, HubApiError } from './api-client';

export type PublicScanQueryResult =
  | { state: 'loading' }
  | { state: 'ok'; data: ProjectMetadata }
  | { state: 'not-found' }
  | { state: 'error'; error: Error };

export function usePublicScan(phi: string): PublicScanQueryResult {
  const validPhi = /^0x[0-9a-fA-F]{64}$/.test(phi);
  const query = useQuery({
    queryKey: ['publicScan', phi],
    queryFn: () => fetchPublicScan(phi as Phi),
    enabled: validPhi,
    retry: (failureCount, err) => {
      // 404 is terminal — no retries on PROJECT_NOT_FOUND.
      if (err instanceof HubApiError && err.status === 404) return false;
      return failureCount < 1;
    },
  });

  if (!validPhi) {
    return { state: 'not-found' };
  }
  if (query.isPending) return { state: 'loading' };
  if (query.isError) {
    if (query.error instanceof HubApiError && query.error.status === 404) {
      return { state: 'not-found' };
    }
    return { state: 'error', error: query.error as Error };
  }
  return { state: 'ok', data: query.data };
}
