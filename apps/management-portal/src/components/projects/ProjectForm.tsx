'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import dynamic from 'next/dynamic';
import { useTranslations } from 'next-intl';
import { Controller, useForm } from 'react-hook-form';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input, Textarea } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ProjectFormSchema, type ProjectFormValues } from '@/lib/project-schema';
import type { ProjectMetadata } from '@qr-bc/shared';

const MapPicker = dynamic(() => import('./MapPicker').then((m) => m.MapPicker), {
  ssr: false,
  loading: () => <div className="h-64 w-full animate-pulse rounded-md bg-muted" />,
});

interface Props {
  initial?: ProjectMetadata;
  submitting?: boolean;
  onSubmit: (values: ProjectFormValues) => void | Promise<void>;
  onCancel?: () => void;
  showStatus?: boolean;
  errorMessage?: string | null;
}

function isoDate(d: Date | string | undefined): string {
  if (!d) return '';
  const dt = typeof d === 'string' ? new Date(d) : d;
  if (isNaN(dt.getTime())) return '';
  return dt.toISOString().slice(0, 10);
}

export function ProjectForm({
  initial,
  submitting,
  onSubmit,
  onCancel,
  showStatus,
  errorMessage,
}: Props): JSX.Element {
  const t = useTranslations('projects');
  const tValidation = useTranslations('projects.validation');
  const defaults: ProjectFormValues = initial
    ? {
        cooperativeName: initial.cooperativeName,
        vegetableType: initial.vegetableType,
        address: initial.cultivationLocation.address,
        province: initial.cultivationLocation.province,
        lat: initial.cultivationLocation.coordinates?.lat,
        lng: initial.cultivationLocation.coordinates?.lng,
        startDate: isoDate(initial.startDate),
        harvestDate: isoDate(initial.harvestDate),
        cultivationArea: initial.cultivationArea,
        expectedOutput: initial.expectedOutput,
        description: initial.description ?? '',
        status: initial.status,
      }
    : {
        cooperativeName: '',
        vegetableType: '',
        address: '',
        province: '',
        startDate: '',
        harvestDate: '',
        cultivationArea: 0,
        expectedOutput: 0,
        description: '',
      };

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    control,
    formState: { errors },
  } = useForm<ProjectFormValues>({
    resolver: zodResolver(ProjectFormSchema),
    defaultValues: defaults,
    mode: 'onBlur',
  });

  const lat = watch('lat');
  const lng = watch('lng');

  const errKey = (key: keyof ProjectFormValues): string | null => {
    const msg = errors[key]?.message;
    if (!msg) return null;
    if (msg === 'required') return tValidation('required');
    if (msg === 'positive') return tValidation('positive');
    if (msg === 'harvestAfterStart') return tValidation('harvestAfterStart');
    return msg;
  };

  return (
    <form className="space-y-4" onSubmit={handleSubmit((v) => onSubmit(v))} noValidate>
      <Card>
        <CardContent className="grid gap-4 p-4 sm:grid-cols-2">
          <Field
            id="cooperativeName"
            label={t('fields.cooperativeName')}
            error={errKey('cooperativeName')}
          >
            <Input id="cooperativeName" {...register('cooperativeName')} />
          </Field>
          <Field
            id="vegetableType"
            label={t('fields.vegetableType')}
            error={errKey('vegetableType')}
          >
            <Input id="vegetableType" {...register('vegetableType')} />
          </Field>
          <Field id="address" label={t('fields.address')} error={errKey('address')}>
            <Input id="address" {...register('address')} />
          </Field>
          <Field id="province" label={t('fields.province')} error={errKey('province')}>
            <Input id="province" {...register('province')} />
          </Field>
          <Field id="startDate" label={t('fields.startDate')} error={errKey('startDate')}>
            <Input id="startDate" type="date" {...register('startDate')} />
          </Field>
          <Field id="harvestDate" label={t('fields.harvestDate')} error={errKey('harvestDate')}>
            <Input id="harvestDate" type="date" {...register('harvestDate')} />
          </Field>
          <Field
            id="cultivationArea"
            label={t('fields.cultivationArea')}
            error={errKey('cultivationArea')}
          >
            <Input id="cultivationArea" type="number" step="any" {...register('cultivationArea')} />
          </Field>
          <Field
            id="expectedOutput"
            label={t('fields.expectedOutput')}
            error={errKey('expectedOutput')}
          >
            <Input id="expectedOutput" type="number" step="any" {...register('expectedOutput')} />
          </Field>
          {showStatus ? (
            <Field id="status" label={t('fields.status')}>
              <Controller
                control={control}
                name="status"
                render={({ field }) => (
                  <select
                    id="status"
                    value={field.value ?? 'in_progress'}
                    onChange={field.onChange}
                    onBlur={field.onBlur}
                    className="flex h-10 w-full rounded-md border border-border bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                  >
                    <option value="in_progress">{t('status.in_progress')}</option>
                    <option value="harvesting">{t('status.harvesting')}</option>
                    <option value="finished">{t('status.finished')}</option>
                  </select>
                )}
              />
            </Field>
          ) : null}
          <div className="sm:col-span-2 grid grid-cols-2 gap-4">
            <Field id="lat" label={t('fields.lat')} error={errKey('lat')}>
              <Input
                id="lat"
                type="number"
                step="any"
                {...register('lat', {
                  setValueAs: (v) => (v === '' || v === null ? undefined : Number(v)),
                })}
              />
            </Field>
            <Field id="lng" label={t('fields.lng')} error={errKey('lng')}>
              <Input
                id="lng"
                type="number"
                step="any"
                {...register('lng', {
                  setValueAs: (v) => (v === '' || v === null ? undefined : Number(v)),
                })}
              />
            </Field>
          </div>
          <div className="sm:col-span-2">
            <Label>Map</Label>
            <div className="mt-1">
              <MapPicker
                lat={typeof lat === 'number' ? lat : undefined}
                lng={typeof lng === 'number' ? lng : undefined}
                onChange={({ lat: newLat, lng: newLng }) => {
                  setValue('lat', newLat, { shouldValidate: true });
                  setValue('lng', newLng, { shouldValidate: true });
                }}
              />
            </div>
          </div>
          <Field id="description" label={t('fields.description')}>
            <Textarea id="description" rows={3} {...register('description')} />
          </Field>
        </CardContent>
      </Card>

      {errorMessage ? (
        <p role="alert" className="text-sm text-danger">
          {errorMessage}
        </p>
      ) : null}

      <div className="flex justify-end gap-2">
        {onCancel ? (
          <Button type="button" variant="outline" onClick={onCancel}>
            {t('cancelCta')}
          </Button>
        ) : null}
        <Button type="submit" disabled={submitting}>
          {t('saveCta')}
        </Button>
      </div>
    </form>
  );
}

function Field({
  id,
  label,
  error,
  children,
}: {
  id?: string;
  label: string;
  error?: string | null;
  children: React.ReactNode;
}): JSX.Element {
  return (
    <div className="space-y-1">
      <Label htmlFor={id}>{label}</Label>
      {children}
      {error ? (
        <p role="alert" className="text-xs text-danger">
          {error}
        </p>
      ) : null}
    </div>
  );
}
