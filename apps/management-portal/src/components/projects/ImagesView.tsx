'use client';

import { useQueryClient } from '@tanstack/react-query';
import { useSession } from 'next-auth/react';
import { useTranslations } from 'next-intl';
import { useRef, useState } from 'react';
import type { Phi } from '@qr-bc/shared';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { uploadImages } from '@/lib/sub-resource-api';
import { useProject } from '@/lib/use-projects';
import type { Locale } from '@/lib/i18n';

const MAX_FILES = 10;

export function ImagesView({ locale: _locale, phi }: { locale: Locale; phi: Phi }): JSX.Element {
  const t = useTranslations('images');
  const { data: session } = useSession();
  const accessToken = session?.accessToken ?? '';
  const queryClient = useQueryClient();
  const project = useProject(phi);

  const [percent, setPercent] = useState(0);
  const [doneCount, setDoneCount] = useState(0);
  const [totalCount, setTotalCount] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const abortRef = useRef<(() => void) | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);

  const start = async (files: File[]): Promise<void> => {
    setError(null);
    if (files.length === 0) return;
    if (files.length > MAX_FILES) {
      setError(`Max ${MAX_FILES} files per upload`);
      return;
    }
    for (const f of files) {
      if (!f.type.startsWith('image/')) {
        setError(t('mimeError'));
        return;
      }
    }
    setBusy(true);
    setTotalCount(files.length);
    setDoneCount(0);
    setPercent(0);
    const { promise, abort } = uploadImages(accessToken, phi, files, (loaded, total) => {
      const p = total > 0 ? Math.round((loaded / total) * 100) : 0;
      setPercent(p);
      setDoneCount(p === 100 ? files.length : Math.floor((loaded / total) * files.length));
    });
    abortRef.current = abort;
    try {
      await promise;
      setDoneCount(files.length);
      void queryClient.invalidateQueries({ predicate: (q) => q.queryKey[0] === 'project' });
    } catch (err) {
      const msg = (err as Error)?.message ?? '';
      if (!msg.includes('cancelled')) setError(msg || 'Upload failed');
    } finally {
      setBusy(false);
      abortRef.current = null;
      if (inputRef.current) inputRef.current.value = '';
    }
  };

  const urls = project.data?.imageUrls ?? [];

  return (
    <div className="container-wide space-y-4 py-6">
      <h1 className="text-2xl font-semibold">{t('title')}</h1>

      <Card>
        <CardHeader>
          <CardTitle>{t('addCta')}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="space-y-1">
            <Label htmlFor="imgFiles">{t('addCta')}</Label>
            <Input
              id="imgFiles"
              type="file"
              accept="image/*"
              multiple
              ref={inputRef}
              onChange={(e) => {
                const files = Array.from(e.target.files ?? []);
                void start(files);
              }}
            />
          </div>
          {busy ? (
            <div className="space-y-2">
              <p className="text-xs text-muted-foreground">
                {t('uploadProgress', { done: doneCount, total: totalCount })} ({percent}%)
              </p>
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => abortRef.current?.()}
              >
                {t('cancelCta')}
              </Button>
            </div>
          ) : null}
          {error ? (
            <p className="text-sm text-danger" role="alert">
              {error}
            </p>
          ) : null}
        </CardContent>
      </Card>

      {urls.length > 0 ? (
        <Card>
          <CardContent className="grid grid-cols-2 gap-3 p-4 sm:grid-cols-3">
            {urls.map((url, i) => (
              <div
                key={`${url}-${i}`}
                className="aspect-square overflow-hidden rounded-md border border-border bg-muted"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={
                    url.startsWith('ipfs://')
                      ? url.replace('ipfs://', 'https://ipfs.io/ipfs/')
                      : url
                  }
                  alt=""
                  className="h-full w-full object-cover"
                  loading="lazy"
                />
              </div>
            ))}
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}
