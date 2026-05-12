import { NextIntlClientProvider } from 'next-intl';
import { getMessages, setRequestLocale } from 'next-intl/server';
import { notFound } from 'next/navigation';
import { locales, type Locale } from '@/lib/i18n';
import { Header } from '@/components/shared/Header';
import { Footer } from '@/components/shared/Footer';
import { QueryProvider } from '@/components/shared/QueryProvider';

export function generateStaticParams(): Array<{ locale: Locale }> {
  return locales.map((locale) => ({ locale }));
}

export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: { locale: string };
}): Promise<JSX.Element> {
  const { locale } = params;
  if (!locales.includes(locale as Locale)) notFound();
  setRequestLocale(locale);
  const messages = await getMessages();

  return (
    <NextIntlClientProvider locale={locale} messages={messages}>
      <QueryProvider>
        {/* Sync <html lang> with the URL locale on hydration so /en/
            pages report 'en' to assistive tech even though the static
            shell ships with the default lang. */}
        <script
          // eslint-disable-next-line react/no-danger
          dangerouslySetInnerHTML={{
            __html: `document.documentElement.lang=${JSON.stringify(locale)};`,
          }}
        />
        <div className="flex min-h-screen flex-col">
          <Header locale={locale as Locale} />
          <main className="flex-1">{children}</main>
          <Footer />
        </div>
      </QueryProvider>
    </NextIntlClientProvider>
  );
}
