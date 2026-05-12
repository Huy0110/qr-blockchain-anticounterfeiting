import { setRequestLocale } from 'next-intl/server';
import { VerificationsView } from '@/components/projects/VerificationsView';
import type { Locale } from '@/lib/i18n';
import type { Phi } from '@qr-bc/shared';

export default function VerificationsPage({
  params,
}: {
  params: { locale: Locale; phi: Phi };
}): JSX.Element {
  setRequestLocale(params.locale);
  return <VerificationsView locale={params.locale} phi={params.phi} />;
}
