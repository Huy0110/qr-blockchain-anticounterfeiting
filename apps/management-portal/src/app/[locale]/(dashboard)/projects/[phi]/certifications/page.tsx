import { setRequestLocale } from 'next-intl/server';
import { CertificationsView } from '@/components/projects/CertificationsView';
import type { Locale } from '@/lib/i18n';
import type { Phi } from '@qr-bc/shared';

export default function CertificationsPage({
  params,
}: {
  params: { locale: Locale; phi: Phi };
}): JSX.Element {
  setRequestLocale(params.locale);
  return <CertificationsView locale={params.locale} phi={params.phi} />;
}
