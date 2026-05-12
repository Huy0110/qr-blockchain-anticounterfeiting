import { setRequestLocale } from 'next-intl/server';
import { ProjectListView } from '@/components/projects/ProjectListView';
import type { Locale } from '@/lib/i18n';

export default function ProjectsPage({ params }: { params: { locale: Locale } }): JSX.Element {
  setRequestLocale(params.locale);
  return <ProjectListView locale={params.locale} />;
}
