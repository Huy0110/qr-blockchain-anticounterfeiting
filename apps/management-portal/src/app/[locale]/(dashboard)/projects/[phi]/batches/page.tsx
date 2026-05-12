import { setRequestLocale } from 'next-intl/server';
import { BatchListView } from '@/components/batches/BatchListView';
import type { Locale } from '@/lib/i18n';
import type { Phi } from '@qr-bc/shared';

export default function BatchesPage({
  params,
}: {
  params: { locale: Locale; phi: Phi };
}): JSX.Element {
  setRequestLocale(params.locale);
  return <BatchListView locale={params.locale} phi={params.phi} />;
}
