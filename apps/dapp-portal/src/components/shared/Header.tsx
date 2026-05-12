'use client';

import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { type Locale, locales } from '@/lib/i18n';
import { usePathname } from 'next/navigation';

export function Header({ locale }: { locale: Locale }): JSX.Element {
  const t = useTranslations('nav');
  const tApp = useTranslations('app');
  const pathname = usePathname();

  return (
    <header className="border-b border-border bg-background">
      <div className="container-narrow flex items-center justify-between py-3">
        <Link href={`/${locale}`} className="font-semibold">
          {tApp('name')}
        </Link>
        <nav className="flex items-center gap-4 text-sm">
          <Link href={`/${locale}/scanner`} className="hover:text-primary">
            {t('scanner')}
          </Link>
          <Link href={`/${locale}/about`} className="hover:text-primary">
            {t('about')}
          </Link>
          <LocaleSwitch currentLocale={locale} pathname={pathname} />
        </nav>
      </div>
    </header>
  );
}

function LocaleSwitch({
  currentLocale,
  pathname,
}: {
  currentLocale: Locale;
  pathname: string | null;
}): JSX.Element {
  const stripped = pathname ? pathname.replace(/^\/(vi|en)(?=\/|$)/, '') || '/' : '/';
  return (
    <div className="flex gap-1">
      {locales.map((l) => (
        <Link
          key={l}
          href={`/${l}${stripped}`}
          className={
            l === currentLocale
              ? 'rounded bg-primary px-2 py-0.5 text-xs uppercase text-primary-foreground'
              : 'rounded px-2 py-0.5 text-xs uppercase text-muted-foreground hover:text-primary'
          }
        >
          {l}
        </Link>
      ))}
    </div>
  );
}
