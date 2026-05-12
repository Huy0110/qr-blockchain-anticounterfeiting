import { redirect } from 'next/navigation';
import type { Locale } from '@/lib/i18n';

export default function LocaleRoot({ params }: { params: { locale: Locale } }): JSX.Element {
  redirect(`/${params.locale}/dashboard`);
}
