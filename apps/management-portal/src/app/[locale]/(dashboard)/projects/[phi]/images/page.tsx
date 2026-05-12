import { setRequestLocale } from 'next-intl/server';
import { ImagesView } from '@/components/projects/ImagesView';
import type { Locale } from '@/lib/i18n';
import type { Phi } from '@qr-bc/shared';

export default function ImagesPage({
  params,
}: {
  params: { locale: Locale; phi: Phi };
}): JSX.Element {
  setRequestLocale(params.locale);
  return <ImagesView locale={params.locale} phi={params.phi} />;
}
