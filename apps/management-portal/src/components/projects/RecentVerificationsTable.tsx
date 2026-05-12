'use client';

import { useTranslations } from 'next-intl';
import { Badge } from '@/components/ui/badge';
import type { VerificationStats } from '@/lib/verifications-api';

const EXPLORER = process.env.NEXT_PUBLIC_BLOCKCHAIN_EXPLORER ?? 'https://amoy.polygonscan.com';

export function RecentVerificationsTable({
  rows,
}: {
  rows: VerificationStats['recent'];
}): JSX.Element {
  const t = useTranslations('verifications.recentTableCols');
  const tOutcome = useTranslations('verifications');
  return (
    <div className="overflow-x-auto rounded-md border border-border">
      <table className="w-full min-w-[480px] text-sm">
        <thead className="bg-muted text-left text-xs uppercase tracking-wide text-muted-foreground">
          <tr>
            <th className="px-3 py-2">{t('outcome')}</th>
            <th className="px-3 py-2">{t('verifiedAt')}</th>
            <th className="px-3 py-2">{t('txHash')}</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {rows.map((r, i) => (
            <tr key={i}>
              <td className="px-3 py-2">
                <Badge
                  variant={
                    r.outcome === 'AUTHENTIC'
                      ? 'success'
                      : r.outcome === 'ALREADY_VERIFIED'
                        ? 'warning'
                        : 'danger'
                  }
                >
                  {r.outcome === 'AUTHENTIC'
                    ? tOutcome('outcomeAuthentic')
                    : r.outcome === 'ALREADY_VERIFIED'
                      ? tOutcome('outcomeAlreadyVerified')
                      : tOutcome('outcomeCounterfeit')}
                </Badge>
              </td>
              <td className="px-3 py-2 text-muted-foreground">
                {new Date(r.scannedAt).toLocaleString()}
              </td>
              <td className="px-3 py-2 font-mono text-xs">
                {r.txHash ? (
                  <a
                    className="text-primary underline-offset-4 hover:underline"
                    href={`${EXPLORER}/tx/${r.txHash}`}
                    target="_blank"
                    rel="noreferrer"
                  >
                    {r.txHash.slice(0, 12)}…
                  </a>
                ) : (
                  '—'
                )}
              </td>
            </tr>
          ))}
          {rows.length === 0 ? (
            <tr>
              <td colSpan={3} className="px-3 py-6 text-center text-muted-foreground">
                —
              </td>
            </tr>
          ) : null}
        </tbody>
      </table>
    </div>
  );
}
