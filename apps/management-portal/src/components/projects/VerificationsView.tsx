'use client';

import { useQuery } from '@tanstack/react-query';
import { useSession } from 'next-auth/react';
import { useTranslations } from 'next-intl';
import dynamic from 'next/dynamic';
import type { Phi } from '@qr-bc/shared';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { getVerificationStats } from '@/lib/verifications-api';
import { VerificationStatsCards } from './VerificationStatsCards';
import { RecentVerificationsTable } from './RecentVerificationsTable';
import type { Locale } from '@/lib/i18n';

// Charts dynamic-imported (no SSR) so chart.js stays out of the server
// bundle and the donut/line chunks only load on this page.
const VerificationDailyChart = dynamic(
  () => import('./VerificationDailyChart').then((m) => m.VerificationDailyChart),
  { ssr: false, loading: () => <Skeleton className="h-64 w-full" /> },
);
const VerificationOutcomeDonut = dynamic(
  () => import('./VerificationOutcomeDonut').then((m) => m.VerificationOutcomeDonut),
  { ssr: false, loading: () => <Skeleton className="h-64 w-full" /> },
);

export function VerificationsView({
  locale: _locale,
  phi,
}: {
  locale: Locale;
  phi: Phi;
}): JSX.Element {
  const t = useTranslations('verifications');
  const { data: session } = useSession();
  const accessToken = session?.accessToken ?? '';
  const stats = useQuery({
    queryKey: ['verifications', phi],
    queryFn: () => getVerificationStats(accessToken, phi),
    enabled: Boolean(accessToken),
  });

  return (
    <div className="container-wide space-y-4 py-6">
      <h1 className="text-2xl font-semibold">{t('title')}</h1>
      <p className="text-sm text-muted-foreground">{t('summary')}</p>

      {stats.isPending ? (
        <Skeleton className="h-32 w-full" />
      ) : stats.isError || !stats.data ? (
        <p className="text-sm text-danger">—</p>
      ) : (
        <>
          <VerificationStatsCards totals={stats.data.totals} />
          <div className="grid gap-4 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>{t('outcomeDonut')}</CardTitle>
              </CardHeader>
              <CardContent>
                <VerificationOutcomeDonut totals={stats.data.totals} />
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>{t('dailyChart')}</CardTitle>
              </CardHeader>
              <CardContent>
                <VerificationDailyChart daily={stats.data.daily} />
              </CardContent>
            </Card>
          </div>
          <Card>
            <CardHeader>
              <CardTitle>{t('recentTitle')}</CardTitle>
            </CardHeader>
            <CardContent>
              <RecentVerificationsTable rows={stats.data.recent} />
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
