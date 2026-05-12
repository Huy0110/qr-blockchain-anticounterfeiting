'use client';

import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useState } from 'react';
import { useCreateProject } from '@/lib/use-projects';
import { ProjectFormSchema, toCreatePayload } from '@/lib/project-schema';
import { ProjectForm } from './ProjectForm';
import { HubApiError } from '@/lib/api-client';
import type { Locale } from '@/lib/i18n';

export function NewProjectView({ locale }: { locale: Locale }): JSX.Element {
  const t = useTranslations('projects');
  const router = useRouter();
  const create = useCreateProject();
  const [error, setError] = useState<string | null>(null);

  return (
    <div className="container-wide space-y-4 py-6">
      <h1 className="text-2xl font-semibold">{t('newTitle')}</h1>
      <ProjectForm
        submitting={create.isPending}
        errorMessage={error}
        onCancel={() => router.push(`/${locale}/projects`)}
        onSubmit={async (values) => {
          setError(null);
          const parsed = ProjectFormSchema.safeParse(values);
          if (!parsed.success) return;
          try {
            const project = await create.mutateAsync(toCreatePayload(parsed.data));
            router.push(`/${locale}/projects/${project.projectId}`);
            router.refresh();
          } catch (err) {
            if (err instanceof HubApiError) {
              setError(err.message || t('createFailure'));
            } else {
              setError(t('createFailure'));
            }
          }
        }}
      />
    </div>
  );
}
