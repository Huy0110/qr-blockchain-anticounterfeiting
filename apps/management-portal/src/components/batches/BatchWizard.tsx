'use client';

import { useSession } from 'next-auth/react';
import { useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import type { Phi } from '@qr-bc/shared';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { estimateCost, postBatch } from '@/lib/batch-api';
import { useProject } from '@/lib/use-projects';
import type { Locale } from '@/lib/i18n';

const FAUCET_URL = process.env.NEXT_PUBLIC_FAUCET_URL ?? 'https://faucet.polygon.technology/';
const EXPLORER = process.env.NEXT_PUBLIC_BLOCKCHAIN_EXPLORER ?? 'https://amoy.polygonscan.com';

type Stage = 'count' | 'review' | 'submitting' | 'confirming' | 'generating' | 'done' | 'error';

export function BatchWizard({ locale, phi }: { locale: Locale; phi: Phi }): JSX.Element {
  const t = useTranslations('batches.wizard');
  const tStatus = useTranslations('batches');
  const tErr = useTranslations('errors');
  const router = useRouter();
  const { data: session } = useSession();
  const project = useProject(phi);

  const [n, setN] = useState(10);
  const [stage, setStage] = useState<Stage>('count');
  const [txHash, setTxHash] = useState<string | null>(null);
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null);
  const [downloadName, setDownloadName] = useState<string>('batch.zip');
  const [error, setError] = useState<string | null>(null);

  // The wallet balance is owned by the hub; we don't have a /wallet
  // endpoint exposed yet, so the wizard surfaces a placeholder and only
  // shows the "insufficient balance" guard when the hub returns an
  // INSUFFICIENT_BALANCE error code on submit.
  const balance = '—';

  const cost = estimateCost(n);

  const submit = async (): Promise<void> => {
    setError(null);
    setStage('submitting');
    try {
      // Server stages: submit → confirm → generate ZIP. The hub does
      // them sequentially in one POST; we drive UI stages on a timer
      // so the user sees progress.
      setTimeout(() => setStage((s) => (s === 'submitting' ? 'confirming' : s)), 1500);
      setTimeout(() => setStage((s) => (s === 'confirming' ? 'generating' : s)), 4500);
      const {
        blob,
        filename,
        txHash: returnedHash,
      } = await postBatch(session?.accessToken ?? '', phi, n);
      const url = URL.createObjectURL(blob);
      // Auto-trigger download.
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setDownloadUrl(url);
      setDownloadName(filename);
      if (returnedHash) setTxHash(returnedHash);
      setStage('done');
    } catch (err) {
      const e = err as { code?: string; message?: string };
      if (e?.code === 'INSUFFICIENT_BALANCE') {
        setError(t('step3Insufficient', { faucet: FAUCET_URL }));
      } else {
        setError(e?.message ?? tErr('generic'));
      }
      setStage('error');
    }
  };

  if (project.isPending) {
    return <div className="container-wide py-6">…</div>;
  }

  return (
    <div className="container-wide space-y-4 py-6">
      <h1 className="text-2xl font-semibold">{tStatus('newCta')}</h1>
      <p className="text-sm text-muted-foreground">
        {project.data?.cooperativeName} — {project.data?.vegetableType}
      </p>

      {stage === 'count' || stage === 'review' || stage === 'error' ? (
        <Card>
          <CardHeader>
            <CardTitle>{stage === 'review' ? t('step3Title') : t('step2Title')}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {stage === 'count' || stage === 'error' ? (
              <div className="space-y-1">
                <Label htmlFor="batchN">{tStatus('fields.count')}</Label>
                <Input
                  id="batchN"
                  type="number"
                  min={1}
                  max={500}
                  value={n}
                  onChange={(e) => setN(Number(e.target.value))}
                />
                <p className="text-xs text-muted-foreground">{t('step2Help')}</p>
              </div>
            ) : null}
            {stage === 'review' ? (
              <p className="text-sm">
                {t('step3Body', {
                  n,
                  gas: cost.gasGwei.toLocaleString(),
                  matic: cost.matic,
                  balance,
                })}
              </p>
            ) : null}
            {error ? (
              <p role="alert" className="text-sm text-danger">
                {error}
              </p>
            ) : null}
            <div className="flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => router.push(`/${locale}/projects/${phi}/batches`)}
              >
                {tStatus('newCta')}
              </Button>
              {stage === 'count' || stage === 'error' ? (
                <Button type="button" onClick={() => setStage('review')} disabled={n < 1}>
                  Next
                </Button>
              ) : (
                <Button type="button" onClick={() => void submit()}>
                  Generate
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      ) : null}

      {stage === 'submitting' || stage === 'confirming' || stage === 'generating' ? (
        <Card>
          <CardHeader>
            <CardTitle>{t('step4Title')}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm" aria-live="polite">
            <div className={stage === 'submitting' ? 'text-foreground' : 'text-muted-foreground'}>
              {stage === 'submitting' ? '⏳' : '✓'} {t('step4Submitting')}
            </div>
            <div className={stage === 'confirming' ? 'text-foreground' : 'text-muted-foreground'}>
              {stage === 'confirming' ? '⏳' : stage === 'generating' ? '✓' : '·'}{' '}
              {t('step4Confirming')}
            </div>
            <div className={stage === 'generating' ? 'text-foreground' : 'text-muted-foreground'}>
              {stage === 'generating' ? '⏳' : '·'} {t('step4Generating')}
            </div>
          </CardContent>
        </Card>
      ) : null}

      {stage === 'done' ? (
        <Card className="border-success/40 bg-success/5">
          <CardHeader>
            <CardTitle className="text-success">
              {tStatus('successToast', { n, txHash: txHash ?? '—' })}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            {txHash ? (
              <a
                className="break-all font-mono text-xs text-primary underline"
                href={`${EXPLORER}/tx/${txHash}`}
                target="_blank"
                rel="noreferrer"
              >
                {EXPLORER}/tx/{txHash}
              </a>
            ) : null}
            {downloadUrl ? (
              <Button asChild variant="outline">
                <a href={downloadUrl} download={downloadName}>
                  {tStatus('downloadCta')}
                </a>
              </Button>
            ) : null}
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}
