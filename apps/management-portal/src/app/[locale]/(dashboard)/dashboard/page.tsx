import { setRequestLocale } from 'next-intl/server';
import { DashboardOverview } from '@/components/dashboard/DashboardOverview';
import type { Locale } from '@/lib/i18n';

export default function DashboardPage({ params }: { params: { locale: Locale } }): JSX.Element {
  setRequestLocale(params.locale);
  return <DashboardOverview locale={params.locale} />;
}
