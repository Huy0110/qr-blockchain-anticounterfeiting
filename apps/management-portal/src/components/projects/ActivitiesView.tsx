'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useSession } from 'next-auth/react';
import { useTranslations } from 'next-intl';
import { useState } from 'react';
import type { CultivationActivity, Phi } from '@qr-bc/shared';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input, Textarea } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import {
  createActivity,
  deleteActivity,
  listActivities,
  type ActivityRecord,
} from '@/lib/sub-resource-api';
import type { Locale } from '@/lib/i18n';

const TYPES = [
  'planting',
  'fertilizing',
  'pest_control',
  'harvesting',
  'land_preparation',
  'other',
] as const satisfies ReadonlyArray<CultivationActivity['type']>;

export function ActivitiesView({
  locale: _locale,
  phi,
}: {
  locale: Locale;
  phi: Phi;
}): JSX.Element {
  const t = useTranslations('activities');
  const { data: session } = useSession();
  const accessToken = session?.accessToken ?? '';
  const queryClient = useQueryClient();

  const list = useQuery({
    queryKey: ['activities', phi],
    queryFn: () => listActivities(accessToken, phi),
    enabled: Boolean(accessToken),
  });

  const create = useMutation({
    mutationFn: (payload: Omit<CultivationActivity, 'activityDate'> & { activityDate: string }) =>
      createActivity(accessToken, phi, payload),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ['activities', phi] }),
  });

  const remove = useMutation({
    mutationFn: (id: string) => deleteActivity(accessToken, phi, id),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ['activities', phi] }),
  });

  const [type, setType] = useState<CultivationActivity['type']>('planting');
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [activityDate, setActivityDate] = useState('');

  const items = list.data?.items ?? [];
  const sorted = [...items].sort(
    (a, b) => new Date(a.activityDate).getTime() - new Date(b.activityDate).getTime(),
  );

  return (
    <div className="container-wide space-y-4 py-6">
      <h1 className="text-2xl font-semibold">{t('title')}</h1>

      <Card>
        <CardHeader>
          <CardTitle>{t('addCta')}</CardTitle>
        </CardHeader>
        <CardContent>
          <form
            className="grid gap-3 sm:grid-cols-2"
            onSubmit={async (e) => {
              e.preventDefault();
              if (!name.trim() || !activityDate) return;
              await create.mutateAsync({
                type,
                name: name.trim(),
                description: description.trim(),
                activityDate,
              });
              setName('');
              setDescription('');
              setActivityDate('');
            }}
          >
            <div className="space-y-1">
              <Label htmlFor="actType">{t('fields.type')}</Label>
              <select
                id="actType"
                value={type}
                onChange={(e) => setType(e.target.value as CultivationActivity['type'])}
                className="flex h-10 w-full rounded-md border border-border bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              >
                {TYPES.map((tt) => (
                  <option key={tt} value={tt}>
                    {t(`types.${tt === 'land_preparation' ? 'other' : tt}` as 'planting')}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1">
              <Label htmlFor="actDate">{t('fields.activityDate')}</Label>
              <Input
                id="actDate"
                type="date"
                value={activityDate}
                onChange={(e) => setActivityDate(e.target.value)}
                required
              />
            </div>
            <div className="space-y-1 sm:col-span-2">
              <Label htmlFor="actName">{t('fields.name')}</Label>
              <Input id="actName" value={name} onChange={(e) => setName(e.target.value)} required />
            </div>
            <div className="space-y-1 sm:col-span-2">
              <Label htmlFor="actDesc">{t('fields.description')}</Label>
              <Textarea
                id="actDesc"
                rows={2}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>
            <div className="sm:col-span-2 flex justify-end">
              <Button type="submit" disabled={create.isPending}>
                {t('addCta')}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t('title')}</CardTitle>
        </CardHeader>
        <CardContent>
          {list.isPending ? (
            <Skeleton className="h-24 w-full" />
          ) : sorted.length === 0 ? (
            <p className="text-sm text-muted-foreground">—</p>
          ) : (
            <ol className="relative space-y-3 border-l border-border pl-6">
              {sorted.map((a: ActivityRecord) => (
                <li key={a._id ?? a.name + String(a.activityDate)} className="relative">
                  <span className="absolute -left-[19px] top-1 inline-block h-3 w-3 rounded-full bg-primary" />
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h3 className="text-sm font-medium">{a.name}</h3>
                      <p className="text-xs text-muted-foreground">
                        {new Date(a.activityDate).toLocaleDateString()} · {a.type}
                      </p>
                      {a.description ? <p className="mt-1 text-sm">{a.description}</p> : null}
                    </div>
                    {a._id ? (
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => void remove.mutate(a._id ?? '')}
                      >
                        ×
                      </Button>
                    ) : null}
                  </div>
                </li>
              ))}
            </ol>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
