'use client';

import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';
import { useProjects } from '@/lib/use-projects';
import { ProjectTable } from './ProjectTable';
import type { Locale } from '@/lib/i18n';

export function ProjectListView({ locale }: { locale: Locale }): JSX.Element {
  const t = useTranslations('projects');
  const projects = useProjects();
  return (
    <div className="container-wide space-y-4 py-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">{t('listTitle')}</h1>
        <Button asChild>
          <Link href={`/${locale}/projects/new`}>{t('newCta')}</Link>
        </Button>
      </div>
      <ProjectTable
        locale={locale}
        items={projects.data?.items ?? []}
        loading={projects.isPending}
      />
    </div>
  );
}
