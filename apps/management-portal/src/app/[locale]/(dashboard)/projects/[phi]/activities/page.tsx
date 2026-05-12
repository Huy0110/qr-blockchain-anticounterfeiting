import { setRequestLocale } from 'next-intl/server';
import { ActivitiesView } from '@/components/projects/ActivitiesView';
import type { Locale } from '@/lib/i18n';
import type { Phi } from '@qr-bc/shared';

export default function ActivitiesPage({
  params,
}: {
  params: { locale: Locale; phi: Phi };
}): JSX.Element {
  setRequestLocale(params.locale);
  return <ActivitiesView locale={params.locale} phi={params.phi} />;
}
