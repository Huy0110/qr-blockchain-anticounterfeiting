import type { ProjectMetadata } from '@qr-bc/shared';
import { useTranslations, useLocale } from 'next-intl';
import { Badge } from '@/components/ui/badge';

export function ProjectHeader({ project }: { project: ProjectMetadata }): JSX.Element {
  const t = useTranslations('publicScan');
  const locale = useLocale();
  const fmt = new Intl.DateTimeFormat(locale === 'vi' ? 'vi-VN' : 'en-US', {
    dateStyle: 'medium',
  });

  return (
    <header className="space-y-3">
      <div className="flex items-baseline justify-between gap-3">
        <h1 className="text-2xl font-semibold sm:text-3xl">{project.cooperativeName}</h1>
        <Badge variant={project.status === 'finished' ? 'success' : 'default'}>
          {project.status}
        </Badge>
      </div>
      <dl className="grid grid-cols-2 gap-2 text-sm sm:grid-cols-3">
        <Field label={t('vegetable')}>{project.vegetableType}</Field>
        <Field label={t('location')}>
          {project.cultivationLocation.address}, {project.cultivationLocation.province}
        </Field>
        <Field label={t('startDate')}>{fmt.format(new Date(project.startDate))}</Field>
        <Field label={t('harvestDate')}>{fmt.format(new Date(project.harvestDate))}</Field>
        <Field label={t('area')}>{project.cultivationArea.toLocaleString()}</Field>
        <Field label={t('expectedOutput')}>{project.expectedOutput.toLocaleString()}</Field>
      </dl>
      {project.description ? (
        <p className="text-sm text-muted-foreground">{project.description}</p>
      ) : null}
    </header>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }): JSX.Element {
  return (
    <div className="flex flex-col">
      <dt className="text-xs uppercase tracking-wide text-muted-foreground">{label}</dt>
      <dd className="text-sm">{children}</dd>
    </div>
  );
}
