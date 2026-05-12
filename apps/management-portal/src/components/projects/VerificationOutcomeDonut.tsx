'use client';

import { ArcElement, Chart as ChartJS, Legend, Tooltip } from 'chart.js';
import { useTranslations } from 'next-intl';
import { Doughnut } from 'react-chartjs-2';

ChartJS.register(ArcElement, Tooltip, Legend);

export function VerificationOutcomeDonut({
  totals,
}: {
  totals: { authentic: number; alreadyVerified: number; counterfeit: number };
}): JSX.Element {
  const t = useTranslations('verifications.totals');
  const data = {
    labels: [t('authentic'), t('alreadyVerified'), t('counterfeit')],
    datasets: [
      {
        data: [totals.authentic, totals.alreadyVerified, totals.counterfeit],
        backgroundColor: ['hsl(142, 71%, 30%)', 'hsl(28, 92%, 38%)', 'hsl(0, 70%, 42%)'],
        borderWidth: 0,
      },
    ],
  };
  return (
    <div className="h-64 w-full">
      <Doughnut data={data} options={{ plugins: { legend: { position: 'bottom' as const } } }} />
    </div>
  );
}
