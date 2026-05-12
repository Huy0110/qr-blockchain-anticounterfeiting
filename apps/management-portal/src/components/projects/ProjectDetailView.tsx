'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Skeleton } from '@/components/ui/skeleton';
import { useDeleteProject, useProject } from '@/lib/use-projects';
import { StatusBadge } from './StatusBadge';
import type { Locale } from '@/lib/i18n';
import type { Phi } from '@qr-bc/shared';

export function ProjectDetailView({ locale, phi }: { locale: Locale; phi: Phi }): JSX.Element {
  const t = useTranslations('projects');
  const router = useRouter();
  const project = useProject(phi);
  const del = useDeleteProject();
  const [open, setOpen] = useState(false);

  if (project.isPending) {
    return (
      <div className="container-wide space-y-4 py-6">
        <Skeleton className="h-8 w-1/2" />
        <Skeleton className="h-32 w-full" />
      </div>
    );
  }
  if (project.isError || !project.data) {
    return (
      <div className="container-wide space-y-4 py-6">
        <p className="text-sm text-danger">{t('createFailure')}</p>
      </div>
    );
  }
  const p = project.data;

  return (
    <div className="container-wide space-y-4 py-6">
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold">{p.cooperativeName}</h1>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <StatusBadge status={p.status} />
            <span>{p.vegetableType}</span>
          </div>
        </div>
        <div className="flex gap-2">
          <Button asChild variant="outline">
            <Link href={`/${locale}/projects/${phi}/edit`}>{t('saveCta')}</Link>
          </Button>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button variant="destructive">{t('deleteCta')}</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogTitle>{t('deleteConfirmTitle')}</DialogTitle>
              <DialogDescription>{t('deleteConfirmBody')}</DialogDescription>
              <DialogFooter>
                <Button variant="outline" onClick={() => setOpen(false)}>
                  {t('cancelCta')}
                </Button>
                <Button
                  variant="destructive"
                  onClick={async () => {
                    await del.mutateAsync(phi);
                    router.push(`/${locale}/projects`);
                    router.refresh();
                  }}
                >
                  {t('deleteCta')}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{t('fields.description')}</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 text-sm sm:grid-cols-2">
          <Field label={t('fields.cooperativeName')}>{p.cooperativeName}</Field>
          <Field label={t('fields.vegetableType')}>{p.vegetableType}</Field>
          <Field label={t('fields.address')}>{p.cultivationLocation.address}</Field>
          <Field label={t('fields.province')}>{p.cultivationLocation.province}</Field>
          <Field label={t('fields.startDate')}>
            {new Date(p.startDate).toLocaleDateString(locale === 'vi' ? 'vi-VN' : 'en-US')}
          </Field>
          <Field label={t('fields.harvestDate')}>
            {new Date(p.harvestDate).toLocaleDateString(locale === 'vi' ? 'vi-VN' : 'en-US')}
          </Field>
          <Field label={t('fields.cultivationArea')}>{p.cultivationArea.toLocaleString()}</Field>
          <Field label={t('fields.expectedOutput')}>{p.expectedOutput.toLocaleString()}</Field>
          {p.description ? (
            <div className="sm:col-span-2">
              <Field label={t('fields.description')}>{p.description}</Field>
            </div>
          ) : null}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Sub-resources</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2 text-sm">
          <Button asChild variant="outline" size="sm">
            <Link href={`/${locale}/projects/${phi}/activities`}>Activities</Link>
          </Button>
          <Button asChild variant="outline" size="sm">
            <Link href={`/${locale}/projects/${phi}/certifications`}>Certifications</Link>
          </Button>
          <Button asChild variant="outline" size="sm">
            <Link href={`/${locale}/projects/${phi}/images`}>Images</Link>
          </Button>
          <Button asChild variant="outline" size="sm">
            <Link href={`/${locale}/projects/${phi}/batches`}>Batches</Link>
          </Button>
          <Button asChild variant="outline" size="sm">
            <Link href={`/${locale}/projects/${phi}/verifications`}>Verifications</Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }): JSX.Element {
  return (
    <div>
      <div className="text-xs uppercase tracking-wide text-muted-foreground">{label}</div>
      <div>{children}</div>
    </div>
  );
}
