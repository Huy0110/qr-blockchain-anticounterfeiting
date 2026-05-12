import type { CultivationActivity } from '@qr-bc/shared';
import { useLocale, useTranslations } from 'next-intl';

const TYPE_BADGES: Record<CultivationActivity['type'], string> = {
  land_preparation: '🪴',
  planting: '🌱',
  fertilizing: '💧',
  pest_control: '🐛',
  harvesting: '🧺',
  other: '📋',
};

export function TraceabilityTimeline({
  activities,
}: {
  activities: CultivationActivity[];
}): JSX.Element {
  const t = useTranslations('publicScan');
  const locale = useLocale();
  const fmt = new Intl.DateTimeFormat(locale === 'vi' ? 'vi-VN' : 'en-US', {
    dateStyle: 'medium',
  });

  if (activities.length === 0) {
    return <p className="text-sm text-muted-foreground">{t('noActivities')}</p>;
  }

  const sorted = [...activities].sort(
    (a, b) => new Date(a.activityDate).getTime() - new Date(b.activityDate).getTime(),
  );

  return (
    <ol className="relative space-y-4 pl-6">
      <span className="absolute left-2 top-0 h-full w-px bg-border" aria-hidden="true" />
      {sorted.map((a, i) => (
        <li key={`${a.activityDate.toString()}-${i}`} className="relative">
          <span
            className="absolute -left-[19px] flex h-4 w-4 items-center justify-center rounded-full bg-primary text-[10px]"
            aria-hidden="true"
          >
            {TYPE_BADGES[a.type]}
          </span>
          <h3 className="text-sm font-medium">{a.name}</h3>
          <p className="text-xs text-muted-foreground">{fmt.format(new Date(a.activityDate))}</p>
          {a.description ? <p className="mt-1 text-sm">{a.description}</p> : null}
          {a.materials && a.materials.length > 0 ? (
            <p className="mt-1 text-xs text-muted-foreground">{a.materials.join(' • ')}</p>
          ) : null}
        </li>
      ))}
    </ol>
  );
}
