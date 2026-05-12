import { useTranslations } from 'next-intl';
import { setRequestLocale } from 'next-intl/server';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { Locale } from '@/lib/i18n';

export default function AboutPage({ params }: { params: { locale: Locale } }): JSX.Element {
  setRequestLocale(params.locale);
  return <AboutInner />;
}

function AboutInner(): JSX.Element {
  const t = useTranslations('about');
  const repo = process.env.NEXT_PUBLIC_GITHUB_REPO ?? '';
  const doi = process.env.NEXT_PUBLIC_PAPER_DOI ?? '';
  const cid = process.env.NEXT_PUBLIC_BUILD_CID ?? '';

  return (
    <div className="container-narrow space-y-6 py-8">
      <Card>
        <CardHeader>
          <CardTitle>{t('title')}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <p>{t('intro')}</p>
          <Field label={t('repoLabel')}>
            {repo ? (
              <a className="text-primary underline" href={repo} target="_blank" rel="noreferrer">
                {repo}
              </a>
            ) : (
              <span className="text-muted-foreground">—</span>
            )}
          </Field>
          <Field label={t('doiLabel')}>
            {doi ? (
              <a className="text-primary underline" href={doi} target="_blank" rel="noreferrer">
                {doi}
              </a>
            ) : (
              <span className="text-muted-foreground">{t('doiPending')}</span>
            )}
          </Field>
          <Field label={t('buildCidLabel')}>
            {cid ? (
              <span className="font-mono text-xs">{cid}</span>
            ) : (
              <span className="text-muted-foreground">{t('buildCidPending')}</span>
            )}
          </Field>
        </CardContent>
      </Card>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }): JSX.Element {
  return (
    <div className="flex items-baseline gap-2">
      <span className="w-32 shrink-0 font-medium text-muted-foreground">{label}</span>
      <span>{children}</span>
    </div>
  );
}
