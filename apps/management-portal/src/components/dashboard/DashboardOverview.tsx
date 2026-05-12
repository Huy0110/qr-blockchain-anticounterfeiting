'use client';

import Link from 'next/link';
import { useSession } from 'next-auth/react';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useProjects } from '@/lib/use-projects';
import type { Locale } from '@/lib/i18n';

export function DashboardOverview({ locale }: { locale: Locale }): JSX.Element {
  const t = useTranslations('dashboard');
  const { data: session } = useSession();
  const projects = useProjects({ enabled: Boolean(session?.accessToken) });

  const items = projects.data?.items ?? [];
  const harvesting = items.filter((p) => p.status === 'harvesting').length;
  const finished = items.filter((p) => p.status === 'finished').length;

  return (
    <div className="container-wide space-y-6 py-6">
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold">{t('title')}</h1>
        {session?.user?.email ? (
          <p className="text-sm text-muted-foreground">
            {t('welcome', { email: session.user.email })}
          </p>
        ) : null}
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard title={t('totalProjects')} value={projects.data?.total ?? items.length} />
        <StatCard title={t('harvestingProjects')} value={harvesting} />
        <StatCard title={t('finishedProjects')} value={finished} />
      </div>

      <Card>
        <CardHeader className="flex-row items-center justify-between">
          <CardTitle>{t('recentProjects')}</CardTitle>
          <Button asChild variant="outline" size="sm">
            <Link href={`/${locale}/projects`}>{t('viewAll')}</Link>
          </Button>
        </CardHeader>
        <CardContent>
          {projects.isPending ? (
            <p className="text-sm text-muted-foreground">…</p>
          ) : items.length === 0 ? (
            <p className="text-sm text-muted-foreground">{t('empty')}</p>
          ) : (
            <ul className="divide-y divide-border">
              {items.slice(0, 5).map((p) => (
                <li key={p.projectId} className="py-2 text-sm">
                  <Link
                    href={`/${locale}/projects/${p.projectId}`}
                    className="text-primary underline-offset-4 hover:underline"
                  >
                    {p.cooperativeName}
                  </Link>{' '}
                  — {p.vegetableType}
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function StatCard({ title, value }: { title: string; value: number }): JSX.Element {
  return (
    <Card>
      <CardContent className="flex flex-col gap-1 p-4">
        <span className="text-xs uppercase tracking-wide text-muted-foreground">{title}</span>
        <span className="text-3xl font-semibold">{value}</span>
      </CardContent>
    </Card>
  );
}
