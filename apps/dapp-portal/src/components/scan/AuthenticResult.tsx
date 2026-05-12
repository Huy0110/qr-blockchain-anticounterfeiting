import type { VerificationOutcome } from '@qr-bc/shared';
import { useLocale, useTranslations } from 'next-intl';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

const EXPLORER = process.env.NEXT_PUBLIC_BLOCKCHAIN_EXPLORER ?? 'https://amoy.polygonscan.com';

export function AuthenticResult({
  outcome,
}: {
  outcome: Extract<VerificationOutcome, { status: 'AUTHENTIC' }>;
}): JSX.Element {
  const t = useTranslations('privateScan');
  const locale = useLocale();
  const fmt = new Intl.DateTimeFormat(locale === 'vi' ? 'vi-VN' : 'en-US', {
    dateStyle: 'medium',
    timeStyle: 'short',
  });
  const verifiedAt =
    outcome.verifiedAt instanceof Date
      ? outcome.verifiedAt
      : new Date(outcome.verifiedAt as unknown as string);
  return (
    <div className="container-narrow space-y-4 py-6">
      <Card className="border-success/40 bg-success/5">
        <CardHeader>
          <CardTitle className="text-success">{t('authenticTitle')}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <p>{t('authenticBody')}</p>
          <Field label={t('verifiedAtLabel')}>{fmt.format(verifiedAt)}</Field>
          <Field label={t('txHashLabel')}>
            <a
              className="break-all font-mono text-xs text-primary underline"
              href={`${EXPLORER}/tx/${outcome.txHash}`}
              target="_blank"
              rel="noreferrer"
            >
              {outcome.txHash}
            </a>
          </Field>
          <a
            className="text-sm text-primary underline"
            href={`${EXPLORER}/tx/${outcome.txHash}`}
            target="_blank"
            rel="noreferrer"
          >
            {t('viewOnExplorer')}
          </a>
        </CardContent>
      </Card>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }): JSX.Element {
  return (
    <div>
      <div className="text-xs uppercase tracking-wide text-muted-foreground">{label}</div>
      <div>{children}</div>
    </div>
  );
}
