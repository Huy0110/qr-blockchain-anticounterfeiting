'use client';

import { useTranslations } from 'next-intl';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { CertificationCard } from './CertificationCard';
import { ImageGallery } from './ImageGallery';
import { ProjectHeader } from './ProjectHeader';
import { TraceabilityTimeline } from './TraceabilityTimeline';
import { usePublicScan } from '@/lib/use-public-scan';
import type { Locale } from '@/lib/i18n';

// Dynamic-import LocationMap so the Leaflet JS+CSS chunk only loads on
// project pages that actually have coordinates. The component itself
// also bundles `leaflet/dist/leaflet.css` (no runtime CDN dependency).
const LocationMap = dynamic(() => import('./LocationMap').then((m) => m.LocationMap), {
  ssr: false,
});

/**
 * Client-side renderer for /projects/[projectId]. Receives the phi from
 * the route params (Next.js dev) or extracts it from the URL pathname
 * (static-export gateway fallback shell).
 */
export function PublicScanContent({
  locale,
  projectId,
}: {
  locale: Locale;
  projectId: string;
}): JSX.Element {
  const t = useTranslations('publicScan');
  const tErr = useTranslations('errors');

  // When served as the static "placeholder" shell, the route param is the
  // literal string "placeholder". Read the real phi from the URL instead.
  const [phi, setPhi] = useState<string>(projectId === 'placeholder' ? '' : projectId);
  useEffect(() => {
    if (projectId !== 'placeholder') return;
    const m = window.location.pathname.match(/\/projects\/(0x[0-9a-fA-F]{64})/);
    if (m?.[1]) setPhi(m[1]);
  }, [projectId]);

  const result = usePublicScan(phi);

  if (!phi || result.state === 'loading') {
    return (
      <div className="container-narrow space-y-4 py-6">
        <Skeleton className="h-8 w-2/3" />
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-48 w-full" />
      </div>
    );
  }

  if (result.state === 'not-found') {
    return (
      <div className="container-narrow space-y-4 py-6">
        <h1 className="text-2xl font-semibold">{t('unknownProject')}</h1>
        <p className="text-muted-foreground">{t('unknownProjectHint')}</p>
        <Button asChild variant="outline">
          <Link href={`/${locale}/scanner`}>{t('mapTitle')}</Link>
        </Button>
      </div>
    );
  }

  if (result.state === 'error') {
    return (
      <div className="container-narrow space-y-3 py-6 text-sm">
        <p className="text-danger">{tErr('network')}</p>
        <Button onClick={() => window.location.reload()}>{tErr('retry')}</Button>
      </div>
    );
  }

  const project = result.data;
  return (
    <div className="container-narrow space-y-6 py-6">
      <ProjectHeader project={project} />

      <section aria-label={t('activitiesTitle')} className="space-y-3">
        <h2 className="text-lg font-semibold">{t('activitiesTitle')}</h2>
        <Card>
          <CardContent className="p-4">
            <TraceabilityTimeline activities={project.cultivationActivities} />
          </CardContent>
        </Card>
      </section>

      <section aria-label={t('certificationsTitle')} className="space-y-3">
        <h2 className="text-lg font-semibold">{t('certificationsTitle')}</h2>
        {project.certifications.length === 0 ? (
          <p className="text-sm text-muted-foreground">{t('noCerts')}</p>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            {project.certifications.map((c, i) => (
              <CertificationCard key={`${c.name}-${i}`} cert={c} />
            ))}
          </div>
        )}
      </section>

      <ImageGallery urls={project.imageUrls} />

      {project.cultivationLocation.coordinates ? (
        <LocationMap
          coordinates={project.cultivationLocation.coordinates}
          label={project.cooperativeName}
        />
      ) : null}
    </div>
  );
}
