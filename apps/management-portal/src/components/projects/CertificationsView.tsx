'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useSession } from 'next-auth/react';
import { useTranslations } from 'next-intl';
import { useState } from 'react';
import type { Phi } from '@qr-bc/shared';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import {
  createCertification,
  deleteCertification,
  listCertifications,
  uploadCertPdf,
  type CertificationRecord,
} from '@/lib/sub-resource-api';
import type { Locale } from '@/lib/i18n';

/**
 * Cert PDFs upload via the hub's dedicated single-file PDF sink
 * /projects/:phi/uploads/cert. The hub validates magic bytes
 * server-side and rejects non-PDFs with UNSUPPORTED_MEDIA_TYPE.
 * The form does a quick MIME check client-side first so the user
 * gets immediate feedback before paying the upload round-trip.
 */
export function CertificationsView({
  locale: _locale,
  phi,
}: {
  locale: Locale;
  phi: Phi;
}): JSX.Element {
  const t = useTranslations('certifications');
  const { data: session } = useSession();
  const accessToken = session?.accessToken ?? '';
  const queryClient = useQueryClient();

  const list = useQuery({
    queryKey: ['certifications', phi],
    queryFn: () => listCertifications(accessToken, phi),
    enabled: Boolean(accessToken),
  });

  const create = useMutation({
    mutationFn: (payload: Parameters<typeof createCertification>[2]) =>
      createCertification(accessToken, phi, payload),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ['certifications', phi] }),
  });

  const remove = useMutation({
    mutationFn: (id: string) => deleteCertification(accessToken, phi, id),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ['certifications', phi] }),
  });

  const [name, setName] = useState('');
  const [issuer, setIssuer] = useState('');
  const [issueDate, setIssueDate] = useState('');
  const [expiryDate, setExpiryDate] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const submit = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault();
    setUploadError(null);
    if (!name.trim() || !issuer.trim() || !issueDate) return;
    let documentUrl: string | undefined;
    if (file) {
      if (file.type !== 'application/pdf') {
        setUploadError(t('uploadFailure'));
        return;
      }
      const { promise } = uploadCertPdf(accessToken, phi, file, (loaded, total) => {
        setUploadProgress(Math.round((loaded / total) * 100));
      });
      try {
        const res = await promise;
        documentUrl = res.url;
      } catch {
        setUploadError(t('uploadFailure'));
        return;
      }
      setUploadProgress(0);
    }
    const payload: Parameters<typeof create.mutateAsync>[0] = {
      name: name.trim(),
      issuer: issuer.trim(),
      issueDate,
    };
    if (expiryDate) payload.expiryDate = expiryDate;
    if (documentUrl) payload.documentUrl = documentUrl;
    await create.mutateAsync(payload);
    setName('');
    setIssuer('');
    setIssueDate('');
    setExpiryDate('');
    setFile(null);
  };

  return (
    <div className="container-wide space-y-4 py-6">
      <h1 className="text-2xl font-semibold">{t('title')}</h1>

      <Card>
        <CardHeader>
          <CardTitle>{t('addCta')}</CardTitle>
        </CardHeader>
        <CardContent>
          <form className="grid gap-3 sm:grid-cols-2" onSubmit={submit}>
            <div className="space-y-1">
              <Label htmlFor="cName">{t('fields.name')}</Label>
              <Input id="cName" value={name} onChange={(e) => setName(e.target.value)} required />
            </div>
            <div className="space-y-1">
              <Label htmlFor="cIssuer">{t('fields.issuer')}</Label>
              <Input
                id="cIssuer"
                value={issuer}
                onChange={(e) => setIssuer(e.target.value)}
                required
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="cIssueDate">{t('fields.issueDate')}</Label>
              <Input
                id="cIssueDate"
                type="date"
                value={issueDate}
                onChange={(e) => setIssueDate(e.target.value)}
                required
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="cExpiryDate">{t('fields.expiryDate')}</Label>
              <Input
                id="cExpiryDate"
                type="date"
                value={expiryDate}
                onChange={(e) => setExpiryDate(e.target.value)}
              />
            </div>
            <div className="space-y-1 sm:col-span-2">
              <Label htmlFor="cFile">{t('fields.file')}</Label>
              <Input
                id="cFile"
                type="file"
                accept="application/pdf"
                onChange={(e) => setFile(e.target.files?.[0] ?? null)}
              />
              {uploadProgress > 0 && uploadProgress < 100 ? (
                <p className="text-xs text-muted-foreground">
                  {t('uploadProgress', { percent: uploadProgress })}
                </p>
              ) : null}
              {uploadError ? (
                <p className="text-xs text-danger" role="alert">
                  {uploadError}
                </p>
              ) : null}
            </div>
            <div className="sm:col-span-2 flex justify-end">
              <Button type="submit" disabled={create.isPending}>
                {t('addCta')}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t('title')}</CardTitle>
        </CardHeader>
        <CardContent>
          {list.isPending ? (
            <Skeleton className="h-24 w-full" />
          ) : (list.data?.items ?? []).length === 0 ? (
            <p className="text-sm text-muted-foreground">—</p>
          ) : (
            <ul className="divide-y divide-border">
              {(list.data?.items ?? []).map((c: CertificationRecord) => (
                <li key={c._id ?? c.name} className="flex items-start justify-between gap-3 py-2">
                  <div className="text-sm">
                    <h3 className="font-medium">{c.name}</h3>
                    <p className="text-xs text-muted-foreground">
                      {c.issuer} · {new Date(c.issueDate).toLocaleDateString()}
                      {c.expiryDate ? ` → ${new Date(c.expiryDate).toLocaleDateString()}` : ''}
                    </p>
                    {c.documentUrl ? (
                      <a
                        className="text-xs text-primary underline-offset-4 hover:underline"
                        href={c.documentUrl}
                        target="_blank"
                        rel="noreferrer"
                      >
                        {c.documentUrl}
                      </a>
                    ) : null}
                  </div>
                  {c._id ? (
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => void remove.mutate(c._id ?? '')}
                    >
                      ×
                    </Button>
                  ) : null}
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
