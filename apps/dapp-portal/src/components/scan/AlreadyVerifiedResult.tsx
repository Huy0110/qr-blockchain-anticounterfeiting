import type { VerificationOutcome } from '@qr-bc/shared';
import { useLocale, useTranslations } from 'next-intl';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

const EXPLORER = process.env.NEXT_PUBLIC_BLOCKCHAIN_EXPLORER ?? 'https://amoy.polygonscan.com';

export function AlreadyVerifiedResult({
  outcome,
}: {
  outcome: Extract<VerificationOutcome, { status: 'ALREADY_VERIFIED' }>;
}): JSX.Element {
  const t = useTranslations('privateScan');
  const locale = useLocale();
  const fmt = new Intl.DateTimeFormat(locale === 'vi' ? 'vi-VN' : 'en-US', {
    dateStyle: 'medium',
    timeStyle: 'short',
  });
  return (
    <div className="container-narrow space-y-4 py-6">
      <Card className="border-warning/40 bg-warning/5">
        <CardHeader>
          <CardTitle className="text-warning">{t('alreadyVerifiedTitle')}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <p>{t('alreadyVerifiedBody')}</p>
          {outcome.previousVerifiedAt ? (
            <div>
              <div className="text-xs uppercase tracking-wide text-muted-foreground">
                {t('previousVerifiedAt')}
              </div>
              <div>{fmt.format(new Date(outcome.previousVerifiedAt as unknown as string))}</div>
            </div>
          ) : null}
          {outcome.previousTxHash ? (
            <a
              className="break-all font-mono text-xs text-primary underline"
              href={`${EXPLORER}/tx/${outcome.previousTxHash}`}
              target="_blank"
              rel="noreferrer"
            >
              {outcome.previousTxHash}
            </a>
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
}
