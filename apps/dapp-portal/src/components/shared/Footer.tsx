import { useTranslations } from 'next-intl';
import { CidFooter } from './CidFooter';

export function Footer(): JSX.Element {
  const t = useTranslations('app');
  return (
    <footer className="border-t border-border bg-muted/40">
      <div className="container-narrow space-y-1 py-4 text-center text-xs text-muted-foreground">
        <p>{t('footer')}</p>
        <CidFooter />
      </div>
    </footer>
  );
}
