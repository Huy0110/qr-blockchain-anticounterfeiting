'use client';

import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';
import { ScanProgress } from './ScanProgress';
import { AuthenticResult } from './AuthenticResult';
import { AlreadyVerifiedResult } from './AlreadyVerifiedResult';
import { CounterfeitResult } from './CounterfeitResult';
import { usePrivateScan } from '@/lib/use-private-scan';
import { isAuthentic, isAlreadyVerified, isCounterfeit } from '@qr-bc/shared';
import type { Locale } from '@/lib/i18n';

export function PrivateScanContent({
  locale: _locale,
  projectId,
  secretId,
}: {
  locale: Locale;
  projectId: string;
  secretId: string;
}): JSX.Element {
  const tErr = useTranslations('errors');

  // When served as the placeholder shell, both params are the literal
  // 'placeholder' string; recover from URL.
  const [phi, setPhi] = useState<string>(projectId === 'placeholder' ? '' : projectId);
  const [sid, setSid] = useState<string>(secretId === 'placeholder' ? '' : secretId);
  useEffect(() => {
    if (projectId !== 'placeholder' && secretId !== 'placeholder') return;
    const m = window.location.pathname.match(/\/scan\/(0x[0-9a-fA-F]{64})\/(0x[0-9a-fA-F]+)/);
    if (m) {
      if (m[1]) setPhi(m[1]);
      if (m[2]) setSid(m[2]);
    }
  }, [projectId, secretId]);

  const state = usePrivateScan({ projectId: phi, secretId: sid });

  if (!phi || !sid) {
    return <ScanProgress stage="verifying" />;
  }

  if (state.stage === 'error') {
    return (
      <div className="container-narrow space-y-3 py-6 text-sm">
        <p className="text-danger">{tErr('network')}</p>
        <Button onClick={() => window.location.reload()}>{tErr('retry')}</Button>
      </div>
    );
  }

  if (state.stage === 'done') {
    const outcome = state.outcome;
    if (isAuthentic(outcome)) return <AuthenticResult outcome={outcome} />;
    if (isAlreadyVerified(outcome)) return <AlreadyVerifiedResult outcome={outcome} />;
    if (isCounterfeit(outcome)) return <CounterfeitResult outcome={outcome} />;
    return <CounterfeitResult outcome={{ status: 'COUNTERFEIT', message: 'Unknown outcome' }} />;
  }

  return <ScanProgress stage={state.stage} />;
}
