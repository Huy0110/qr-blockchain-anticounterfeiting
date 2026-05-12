import { setRequestLocale } from 'next-intl/server';
import { NewProjectView } from '@/components/projects/NewProjectView';
import type { Locale } from '@/lib/i18n';

export default function NewProjectPage({ params }: { params: { locale: Locale } }): JSX.Element {
  setRequestLocale(params.locale);
  return <NewProjectView locale={params.locale} />;
}
