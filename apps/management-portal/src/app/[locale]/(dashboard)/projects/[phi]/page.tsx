import { setRequestLocale } from 'next-intl/server';
import { ProjectDetailView } from '@/components/projects/ProjectDetailView';
import type { Locale } from '@/lib/i18n';
import type { Phi } from '@qr-bc/shared';

export default function ProjectDetailPage({
  params,
}: {
  params: { locale: Locale; phi: Phi };
}): JSX.Element {
  setRequestLocale(params.locale);
  return <ProjectDetailView locale={params.locale} phi={params.phi} />;
}
