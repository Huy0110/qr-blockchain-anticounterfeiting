'use client';

import { useMutation } from '@tanstack/react-query';
import { useEffect, useRef } from 'react';
import type { Phi, Sid, VerificationOutcome } from '@qr-bc/shared';
import { postPrivateScan } from './api-client';

export type PrivateScanStage = 'idle' | 'verifying' | 'submitting' | 'confirming' | 'done';

export type PrivateScanState =
  | { stage: 'idle' }
  | { stage: 'verifying' | 'submitting' | 'confirming' }
  | { stage: 'done'; outcome: VerificationOutcome }
  | { stage: 'error'; error: Error };

interface UsePrivateScanArgs {
  projectId: string;
  secretId: string;
}

/** Drives a single /scan/private mutation through its 3 visual stages. */
export function usePrivateScan({ projectId, secretId }: UsePrivateScanArgs): PrivateScanState {
  const { mutate, isIdle, isPending, isError, isSuccess, data, error } = useMutation({
    mutationFn: async () =>
      postPrivateScan({ projectId: projectId as Phi, secretId: secretId as Sid }),
  });

  const validInputs = /^0x[0-9a-fA-F]{64}$/.test(projectId) && /^0x[0-9a-fA-F]+$/.test(secretId);

  // `mutate` from TanStack Query is referentially stable across renders,
  // so depending on it (rather than the whole `mut` object) keeps this
  // effect from re-running every render. The ref guarantees one-shot
  // semantics even if a future change makes `mutate` non-stable.
  const triggeredRef = useRef(false);
  useEffect(() => {
    if (validInputs && isIdle && !triggeredRef.current) {
      triggeredRef.current = true;
      mutate();
    }
  }, [validInputs, isIdle, mutate]);

  if (!validInputs) {
    return {
      stage: 'error',
      error: new Error('Invalid scan parameters'),
    };
  }
  if (isPending) {
    // The hub does its own internal phasing (Algorithm 3 phases 1-3); from
    // the client we just see a single Promise. Surface 'verifying' as the
    // generic in-flight stage.
    return { stage: 'verifying' };
  }
  if (isError) {
    return { stage: 'error', error: error as Error };
  }
  if (isSuccess) {
    return { stage: 'done', outcome: data };
  }
  return { stage: 'idle' };
}
