import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';
import { setRequestLocale } from 'next-intl/server';
import { authOptions } from '@/lib/auth';
import { DashboardChrome } from '@/components/shared/DashboardChrome';
import type { Locale } from '@/lib/i18n';

export default async function DashboardLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: { locale: Locale };
}): Promise<JSX.Element> {
  setRequestLocale(params.locale);
  const session = await getServerSession(authOptions);
  if (!session) {
    redirect(`/${params.locale}/login?callbackUrl=/${params.locale}/dashboard`);
  }
  return (
    <DashboardChrome locale={params.locale} email={session.user.email}>
      {children}
    </DashboardChrome>
  );
}
