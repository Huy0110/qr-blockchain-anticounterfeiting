import { useTranslations } from 'next-intl';
import type { PrivateScanState } from '@/lib/use-private-scan';

export function ScanProgress({ stage }: { stage: PrivateScanState['stage'] }): JSX.Element {
  const t = useTranslations('privateScan');
  const stages: Array<{ key: 'stageVerifying' | 'stageSubmitting' | 'stageConfirming' }> = [
    { key: 'stageVerifying' },
    { key: 'stageSubmitting' },
    { key: 'stageConfirming' },
  ];
  const activeIdx =
    stage === 'verifying' ? 0 : stage === 'submitting' ? 1 : stage === 'confirming' ? 2 : 0;

  return (
    <div className="container-narrow space-y-4 py-6">
      <h2 className="text-lg font-semibold">{t('verifyingTitle')}</h2>
      <ol className="space-y-2 text-sm" aria-live="polite">
        {stages.map((s, i) => (
          <li
            key={s.key}
            className={
              i <= activeIdx
                ? 'flex items-center gap-2 text-foreground'
                : 'flex items-center gap-2 text-muted-foreground'
            }
          >
            <Spinner active={i === activeIdx} done={i < activeIdx} />
            <span>{t(s.key)}</span>
          </li>
        ))}
      </ol>
    </div>
  );
}

function Spinner({ active, done }: { active: boolean; done: boolean }): JSX.Element {
  if (done) return <span className="text-success">✓</span>;
  if (active)
    return (
      <span
        className="inline-block h-3 w-3 animate-spin rounded-full border-2 border-current border-r-transparent"
        aria-hidden="true"
      />
    );
  return <span className="inline-block h-3 w-3 rounded-full bg-muted" aria-hidden="true" />;
}
