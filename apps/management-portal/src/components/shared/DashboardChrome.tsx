'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { signOut } from 'next-auth/react';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';
import type { Locale } from '@/lib/i18n';

const NAV = (locale: Locale): Array<{ href: string; key: 'dashboard' | 'projects' }> => [
  { href: `/${locale}/dashboard`, key: 'dashboard' },
  { href: `/${locale}/projects`, key: 'projects' },
];

export function DashboardChrome({
  locale,
  email,
  children,
}: {
  locale: Locale;
  email: string;
  children: React.ReactNode;
}): JSX.Element {
  const t = useTranslations('nav');
  const pathname = usePathname();
  const router = useRouter();
  const links = NAV(locale);

  const toggleLocale = (): void => {
    const other: Locale = locale === 'vi' ? 'en' : 'vi';
    const replaced = pathname.replace(`/${locale}`, `/${other}`);
    router.push(replaced || `/${other}/dashboard`);
  };

  const toggleDark = (): void => {
    const root = document.documentElement;
    const next = !root.classList.contains('dark');
    root.classList.toggle('dark', next);
    try {
      localStorage.setItem('theme', next ? 'dark' : 'light');
    } catch {
      /* ignore */
    }
  };

  return (
    <div className="flex min-h-screen flex-col">
      <header className="border-b border-border bg-background">
        <div className="container-wide flex h-14 items-center justify-between gap-4">
          <nav className="flex items-center gap-2 text-sm" aria-label="Primary">
            {links.map((l) => {
              const active = pathname === l.href || pathname.startsWith(`${l.href}/`);
              return (
                <Link
                  key={l.key}
                  href={l.href}
                  className={
                    active
                      ? 'rounded-md bg-muted px-3 py-1.5 font-medium text-foreground'
                      : 'rounded-md px-3 py-1.5 text-muted-foreground hover:bg-muted hover:text-foreground'
                  }
                >
                  {t(l.key)}
                </Link>
              );
            })}
          </nav>
          <div className="flex items-center gap-2">
            <span className="hidden text-xs text-muted-foreground sm:inline">{email}</span>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={toggleLocale}
              aria-label={t('language')}
            >
              {locale === 'vi' ? 'EN' : 'VI'}
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={toggleDark}
              aria-label={t('darkMode')}
            >
              ☾
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => void signOut({ callbackUrl: `/${locale}/login` })}
            >
              {t('logout')}
            </Button>
          </div>
        </div>
      </header>
      <main className="flex-1">{children}</main>
      <footer className="border-t border-border bg-background py-4 text-center text-xs text-muted-foreground">
        <div className="container-wide">© Open source. Tamper-evident.</div>
      </footer>
    </div>
  );
}
