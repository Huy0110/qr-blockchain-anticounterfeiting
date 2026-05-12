import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { setRequestLocale } from 'next-intl/server';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { Locale } from '@/lib/i18n';

export default function LandingPage({ params }: { params: { locale: Locale } }): JSX.Element {
  setRequestLocale(params.locale);
  return <LandingInner locale={params.locale} />;
}

function LandingInner({ locale }: { locale: Locale }): JSX.Element {
  const t = useTranslations('landing');
  const tApp = useTranslations('app');

  return (
    <div className="container-narrow space-y-6 py-10">
      <div className="space-y-2 text-center">
        <h1 className="text-3xl font-semibold sm:text-4xl">{t('title')}</h1>
        <p className="text-muted-foreground">{tApp('tagline')}</p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>{tApp('name')}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p>{t('subtitle')}</p>
          <div className="flex flex-col gap-2 sm:flex-row">
            <Button asChild size="lg">
              <Link href={`/${locale}/scanner`}>{t('scanCta')}</Link>
            </Button>
            <Button asChild size="lg" variant="outline">
              <Link href={`/${locale}/scanner#paste`}>{t('pasteCta')}</Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
