'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';

/**
 * Manual URL-paste fallback for desktop / no-camera situations.
 * Accepts either a full QR URL (e.g. https://dapp.example/vi/scan/0x.../0x...)
 * or a bare phi/sid path. Routes via window.location.href so the static
 * export can navigate to the dynamic page from anywhere.
 */
export function UrlPasteFallback({ id }: { id?: string }): JSX.Element {
  const t = useTranslations('scanner');
  const [value, setValue] = useState('');

  const onSubmit = (e: React.FormEvent): void => {
    e.preventDefault();
    if (!value.trim()) return;
    let target = value.trim();
    if (!/^https?:\/\//i.test(target)) {
      // Bare path: prefix with current origin so the route resolves.
      const origin = typeof window !== 'undefined' ? window.location.origin : '';
      target = `${origin}${target.startsWith('/') ? target : `/${target}`}`;
    }
    window.location.href = target;
  };

  return (
    <form id={id} onSubmit={onSubmit} className="space-y-2">
      <h2 className="text-base font-semibold">{t('pasteFallbackTitle')}</h2>
      <input
        type="url"
        inputMode="url"
        placeholder={t('pasteFallbackPlaceholder')}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
        aria-label={t('pasteFallbackTitle')}
      />
      <Button type="submit" disabled={!value.trim()}>
        {t('pasteFallbackCta')}
      </Button>
    </form>
  );
}
