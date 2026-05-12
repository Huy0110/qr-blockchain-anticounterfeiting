'use client';

import { useTranslations } from 'next-intl';
import { Card, CardContent } from '@/components/ui/card';

export function VerificationStatsCards({
  totals,
}: {
  totals: { authentic: number; alreadyVerified: number; counterfeit: number };
}): JSX.Element {
  const t = useTranslations('verifications.totals');
  return (
    <div className="grid gap-4 sm:grid-cols-3">
      <StatCard label={t('authentic')} value={totals.authentic} tone="success" />
      <StatCard label={t('alreadyVerified')} value={totals.alreadyVerified} tone="warning" />
      <StatCard label={t('counterfeit')} value={totals.counterfeit} tone="danger" />
    </div>
  );
}

function StatCard({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone: 'success' | 'warning' | 'danger';
}): JSX.Element {
  const colour =
    tone === 'success' ? 'text-success' : tone === 'warning' ? 'text-warning' : 'text-danger';
  return (
    <Card>
      <CardContent className="flex flex-col gap-1 p-4">
        <span className="text-xs uppercase tracking-wide text-muted-foreground">{label}</span>
        <span className={`text-3xl font-semibold ${colour}`}>{value}</span>
      </CardContent>
    </Card>
  );
}
