import { setRequestLocale } from 'next-intl/server';
import type { Locale } from '@/lib/i18n';

export default function AuthLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: { locale: Locale };
}): JSX.Element {
  setRequestLocale(params.locale);
  return (
    <div className="container-narrow flex min-h-screen flex-col items-stretch justify-center py-10">
      {children}
    </div>
  );
}
