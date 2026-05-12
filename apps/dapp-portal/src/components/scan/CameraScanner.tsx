'use client';

import { useEffect, useRef, useState } from 'react';
import { useTranslations } from 'next-intl';

type ScannerState = 'idle' | 'requesting' | 'scanning' | 'denied' | 'no-camera';

/**
 * In-app QR scanner powered by html5-qrcode. Lazy-imports the library
 * so the leaflet-style cost only applies when the user actively visits
 * /scanner. Calls navigator.mediaDevices.getUserMedia under the hood;
 * on permission denial we surface the bilingual instruction and rely
 * on the URL-paste fallback rendered alongside.
 */
export function CameraScanner({ onResult }: { onResult: (text: string) => void }): JSX.Element {
  const t = useTranslations('scanner');
  const containerId = 'qr-scanner-region';
  const [state, setState] = useState<ScannerState>('idle');
  const scannerRef = useRef<{ stop: () => Promise<void> } | null>(null);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      if (typeof navigator === 'undefined' || !navigator.mediaDevices) {
        setState('no-camera');
        return;
      }
      setState('requesting');
      try {
        const mod = await import('html5-qrcode');
        if (cancelled) return;
        const scanner = new mod.Html5Qrcode(containerId);
        scannerRef.current = scanner;
        await scanner.start(
          { facingMode: 'environment' },
          { fps: 10, qrbox: { width: 240, height: 240 } },
          (decoded) => {
            if (!cancelled) {
              onResult(decoded);
              void scanner.stop();
            }
          },
          // ignored decode failures — html5-qrcode fires every frame
          () => undefined,
        );
        setState('scanning');
      } catch (err) {
        const msg = (err as Error)?.message ?? '';
        if (/permission|denied|NotAllowedError/i.test(msg)) {
          setState('denied');
        } else {
          setState('no-camera');
        }
      }
    })();

    return () => {
      cancelled = true;
      const scanner = scannerRef.current;
      if (scanner && state === 'scanning') {
        void scanner.stop().catch(() => undefined);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (state === 'denied') {
    return <p className="text-sm text-warning">{t('permissionDenied')}</p>;
  }
  if (state === 'no-camera') {
    return <p className="text-sm text-muted-foreground">{t('noCamera')}</p>;
  }

  return (
    <div className="space-y-2">
      <p className="text-sm text-muted-foreground">{t('permissionPrompt')}</p>
      <div
        id={containerId}
        className="aspect-square w-full overflow-hidden rounded-md border border-border bg-muted"
      />
    </div>
  );
}
