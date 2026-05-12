import type { VerificationOutcome } from '@qr-bc/shared';
import { useTranslations } from 'next-intl';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export function CounterfeitResult({
  outcome,
}: {
  outcome: Extract<VerificationOutcome, { status: 'COUNTERFEIT' }>;
}): JSX.Element {
  const t = useTranslations('privateScan');
  return (
    <div className="container-narrow space-y-4 py-6">
      <Card className="border-danger/40 bg-danger/5">
        <CardHeader>
          <CardTitle className="text-danger">{t('counterfeitTitle')}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <p>{t('counterfeitBody')}</p>
          <p className="text-xs text-muted-foreground">{outcome.message}</p>
        </CardContent>
      </Card>
    </div>
  );
}
