'use client';

import { useTranslations } from 'next-intl';
import type { ProjectStatus } from '@qr-bc/shared';
import { Badge } from '@/components/ui/badge';

const VARIANT: Record<ProjectStatus, 'default' | 'warning' | 'success'> = {
  in_progress: 'default',
  harvesting: 'warning',
  finished: 'success',
};

export function StatusBadge({ status }: { status: ProjectStatus }): JSX.Element {
  const t = useTranslations('projects.status');
  return <Badge variant={VARIANT[status]}>{t(status)}</Badge>;
}
