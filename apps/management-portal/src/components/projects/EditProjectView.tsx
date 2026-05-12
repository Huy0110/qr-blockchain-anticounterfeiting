'use client';

import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useState } from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useProject, useUpdateProject } from '@/lib/use-projects';
import { ProjectFormSchema, toCreatePayload } from '@/lib/project-schema';
import { ProjectForm } from './ProjectForm';
import { HubApiError } from '@/lib/api-client';
import type { Locale } from '@/lib/i18n';
import type { Phi, ProjectMetadata } from '@qr-bc/shared';

export function EditProjectView({ locale, phi }: { locale: Locale; phi: Phi }): JSX.Element {
  const t = useTranslations('projects');
  const router = useRouter();
  const project = useProject(phi);
  const update = useUpdateProject();
  const [error, setError] = useState<string | null>(null);
  const [conflictOpen, setConflictOpen] = useState(false);

  if (project.isPending) {
    return (
      <div className="container-wide space-y-4 py-6">
        <Skeleton className="h-8 w-1/2" />
        <Skeleton className="h-64 w-full" />
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

  return (
    <div className="container-wide space-y-4 py-6">
      <h1 className="text-2xl font-semibold">{t('editTitle')}</h1>
      <ProjectForm
        initial={project.data as ProjectMetadata}
        showStatus
        submitting={update.isPending}
        errorMessage={error}
        onCancel={() => router.push(`/${locale}/projects/${phi}`)}
        onSubmit={async (values) => {
          setError(null);
          const parsed = ProjectFormSchema.safeParse(values);
          if (!parsed.success) return;
          try {
            const payload = parsed.data.status
              ? { ...toCreatePayload(parsed.data), status: parsed.data.status }
              : toCreatePayload(parsed.data);
            await update.mutateAsync({ phi, payload });
            router.push(`/${locale}/projects/${phi}`);
            router.refresh();
          } catch (err) {
            if (err instanceof HubApiError && err.status === 409) {
              setConflictOpen(true);
              return;
            }
            if (err instanceof HubApiError) {
              setError(err.message || t('createFailure'));
            } else {
              setError(t('createFailure'));
            }
          }
        }}
      />
      <Dialog open={conflictOpen} onOpenChange={setConflictOpen}>
        <DialogContent>
          <DialogTitle>{t('conflictTitle')}</DialogTitle>
          <DialogDescription>{t('conflictBody')}</DialogDescription>
          <DialogFooter>
            <Button onClick={() => router.refresh()}>{t('saveCta')}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
