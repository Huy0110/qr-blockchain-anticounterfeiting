'use client';

import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { useState, useMemo } from 'react';
import type { ProjectMetadata } from '@qr-bc/shared';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { StatusBadge } from './StatusBadge';
import type { Locale } from '@/lib/i18n';

export function ProjectTable({
  locale,
  items,
  loading,
}: {
  locale: Locale;
  items: ProjectMetadata[];
  loading?: boolean;
}): JSX.Element {
  const t = useTranslations('projects');
  const tCols = useTranslations('projects.tableCols');
  const [q, setQ] = useState('');

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    if (!needle) return items;
    return items.filter(
      (p) =>
        p.cooperativeName.toLowerCase().includes(needle) ||
        p.vegetableType.toLowerCase().includes(needle),
    );
  }, [items, q]);

  return (
    <div className="space-y-3">
      <Input
        type="search"
        placeholder={t('search')}
        value={q}
        onChange={(e) => setQ(e.target.value)}
        aria-label={t('search')}
        className="max-w-xs"
      />
      <div className="overflow-x-auto rounded-md border border-border">
        <table className="w-full min-w-[640px] text-sm">
          <thead className="bg-muted text-left text-xs uppercase tracking-wide text-muted-foreground">
            <tr>
              <th className="px-3 py-2">{tCols('name')}</th>
              <th className="px-3 py-2">{tCols('vegetable')}</th>
              <th className="px-3 py-2">{tCols('status')}</th>
              <th className="px-3 py-2">{tCols('createdAt')}</th>
              <th className="px-3 py-2 text-right">{tCols('actions')}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {loading
              ? Array.from({ length: 3 }).map((_, i) => (
                  <tr key={i}>
                    <td colSpan={5} className="px-3 py-2">
                      <Skeleton className="h-4 w-full" />
                    </td>
                  </tr>
                ))
              : filtered.map((p) => (
                  <tr key={p.projectId}>
                    <td className="px-3 py-2 font-medium">
                      <Link
                        href={`/${locale}/projects/${p.projectId}`}
                        className="text-primary underline-offset-4 hover:underline"
                      >
                        {p.cooperativeName}
                      </Link>
                    </td>
                    <td className="px-3 py-2">{p.vegetableType}</td>
                    <td className="px-3 py-2">
                      <StatusBadge status={p.status} />
                    </td>
                    <td className="px-3 py-2 text-muted-foreground">
                      {new Date(p.createdAt).toLocaleDateString(
                        locale === 'vi' ? 'vi-VN' : 'en-US',
                      )}
                    </td>
                    <td className="px-3 py-2 text-right">
                      <Link
                        href={`/${locale}/projects/${p.projectId}/edit`}
                        className="text-xs text-primary underline-offset-4 hover:underline"
                      >
                        Edit
                      </Link>
                    </td>
                  </tr>
                ))}
            {!loading && filtered.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-3 py-6 text-center text-muted-foreground">
                  No projects.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </div>
  );
}
