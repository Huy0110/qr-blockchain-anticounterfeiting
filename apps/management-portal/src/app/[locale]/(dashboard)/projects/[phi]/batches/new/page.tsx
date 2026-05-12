import { setRequestLocale } from 'next-intl/server';
import { BatchWizard } from '@/components/batches/BatchWizard';
import type { Locale } from '@/lib/i18n';
import type { Phi } from '@qr-bc/shared';

export default function NewBatchPage({
  params,
}: {
  params: { locale: Locale; phi: Phi };
}): JSX.Element {
  setRequestLocale(params.locale);
  return <BatchWizard locale={params.locale} phi={params.phi} />;
}
