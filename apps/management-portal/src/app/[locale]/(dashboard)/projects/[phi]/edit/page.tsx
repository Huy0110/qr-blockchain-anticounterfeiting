import { setRequestLocale } from 'next-intl/server';
import { EditProjectView } from '@/components/projects/EditProjectView';
import type { Locale } from '@/lib/i18n';
import type { Phi } from '@qr-bc/shared';

export default function EditProjectPage({
  params,
}: {
  params: { locale: Locale; phi: Phi };
}): JSX.Element {
  setRequestLocale(params.locale);
  return <EditProjectView locale={params.locale} phi={params.phi} />;
}
