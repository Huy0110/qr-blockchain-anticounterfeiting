import type { Certification } from '@qr-bc/shared';
import { useLocale, useTranslations } from 'next-intl';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export function CertificationCard({ cert }: { cert: Certification }): JSX.Element {
  const t = useTranslations('publicScan');
  const locale = useLocale();
  const fmt = new Intl.DateTimeFormat(locale === 'vi' ? 'vi-VN' : 'en-US', {
    dateStyle: 'medium',
  });
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{cert.name}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-1 text-sm">
        <p className="text-muted-foreground">{cert.issuer}</p>
        <p>
          {fmt.format(new Date(cert.issueDate))}
          {cert.expiryDate ? ` → ${fmt.format(new Date(cert.expiryDate))}` : ''}
        </p>
        {cert.documentUrl ? (
          <a
            className="text-primary underline"
            href={cert.documentUrl}
            target="_blank"
            rel="noreferrer"
          >
            {t('certificationsTitle')}
          </a>
        ) : null}
      </CardContent>
    </Card>
  );
}
