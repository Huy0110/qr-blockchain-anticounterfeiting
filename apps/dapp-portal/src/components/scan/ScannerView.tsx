'use client';

import { useTranslations } from 'next-intl';
import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { CameraScanner } from './CameraScanner';
import { UrlPasteFallback } from './UrlPasteFallback';
import type { Locale } from '@/lib/i18n';

export function ScannerView({ locale: _locale }: { locale: Locale }): JSX.Element {
  const t = useTranslations('scanner');
  const [decoded, setDecoded] = useState<string | null>(null);
  // Detect camera support post-hydration to avoid the SSR/CSR layout
  // shift that pushed LCP past 6 s on Lighthouse mobile.
  const [hasCamera, setHasCamera] = useState(false);
  // User-initiated start avoids the camera permission prompt blocking
  // the initial paint and removes the unsized container from LCP.
  const [cameraStarted, setCameraStarted] = useState(false);

  useEffect(() => {
    setHasCamera(Boolean(navigator?.mediaDevices?.getUserMedia));
  }, []);

  // When a QR is decoded, navigate to the URL it carries. Producers'
  // batch QRs encode the full dApp URL (configured via dappBaseUrl in
  // the hub), so this is just window.location.href = decoded.
  if (decoded && typeof window !== 'undefined') {
    let target = decoded.trim();
    if (!/^https?:\/\//i.test(target)) {
      const origin = window.location.origin;
      target = `${origin}${target.startsWith('/') ? target : `/${target}`}`;
    }
    window.location.href = target;
  }

  return (
    <div className="container-narrow space-y-4 py-6">
      <h1 className="text-2xl font-semibold">{t('title')}</h1>
      {hasCamera ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">{t('title')}</CardTitle>
          </CardHeader>
          <CardContent>
            {cameraStarted ? (
              <CameraScanner onResult={setDecoded} />
            ) : (
              <Button onClick={() => setCameraStarted(true)}>{t('startCamera')}</Button>
            )}
          </CardContent>
        </Card>
      ) : null}
      <Card id="paste">
        <CardContent className="pt-4">
          <UrlPasteFallback id="paste-form" />
        </CardContent>
      </Card>
    </div>
  );
}
