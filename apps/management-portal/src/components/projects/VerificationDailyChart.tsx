'use client';

import {
  CategoryScale,
  Chart as ChartJS,
  Legend,
  LinearScale,
  LineElement,
  PointElement,
  Title,
  Tooltip,
} from 'chart.js';
import { useTranslations } from 'next-intl';
import { Line } from 'react-chartjs-2';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend);

export function VerificationDailyChart({
  daily,
}: {
  daily: Array<{ date: string; authentic: number; alreadyVerified: number; counterfeit: number }>;
}): JSX.Element {
  const t = useTranslations('verifications.totals');
  const labels = daily.map((d) => d.date.slice(5)); // MM-DD
  const data = {
    labels,
    datasets: [
      {
        label: t('authentic'),
        data: daily.map((d) => d.authentic),
        borderColor: 'hsl(142, 71%, 30%)',
        backgroundColor: 'hsl(142, 71%, 30%, 0.2)',
        tension: 0.3,
      },
      {
        label: t('alreadyVerified'),
        data: daily.map((d) => d.alreadyVerified),
        borderColor: 'hsl(28, 92%, 38%)',
        backgroundColor: 'hsl(28, 92%, 38%, 0.2)',
        tension: 0.3,
      },
      {
        label: t('counterfeit'),
        data: daily.map((d) => d.counterfeit),
        borderColor: 'hsl(0, 70%, 42%)',
        backgroundColor: 'hsl(0, 70%, 42%, 0.2)',
        tension: 0.3,
      },
    ],
  };
  const options = {
    responsive: true,
    plugins: { legend: { position: 'bottom' as const } },
    scales: { y: { beginAtZero: true, ticks: { precision: 0 } } },
  };
  return (
    <div className="h-64 w-full">
      <Line data={data} options={options} />
    </div>
  );
}
