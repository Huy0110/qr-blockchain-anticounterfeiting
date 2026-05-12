'use client';

import { useQuery } from '@tanstack/react-query';
import { useSession } from 'next-auth/react';
import { useTranslations } from 'next-intl';
import Link from 'next/link';
import type { Phi } from '@qr-bc/shared';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { listBatches } from '@/lib/batch-api';
import type { Locale } from '@/lib/i18n';

const EXPLORER = process.env.NEXT_PUBLIC_BLOCKCHAIN_EXPLORER ?? 'https://amoy.polygonscan.com';

export function BatchListView({ locale, phi }: { locale: Locale; phi: Phi }): JSX.Element {
  const t = useTranslations('batches');
  const tStatus = useTranslations('batches.status');
  const { data: session } = useSession();
  const accessToken = session?.accessToken ?? '';
  const list = useQuery({
    queryKey: ['batches', phi],
    queryFn: () => listBatches(accessToken, phi),
    enabled: Boolean(accessToken),
  });

  return (
    <div className="container-wide space-y-4 py-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">{t('listTitle')}</h1>
        <Button asChild>
          <Link href={`/${locale}/projects/${phi}/batches/new`}>{t('newCta')}</Link>
        </Button>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>{t('listTitle')}</CardTitle>
        </CardHeader>
        <CardContent>
          {list.isPending ? (
            <p className="text-sm text-muted-foreground">…</p>
          ) : (list.data?.items ?? []).length === 0 ? (
            <div className="space-y-2 text-sm text-muted-foreground">
              <p>—</p>
              {list.data?.note ? <p className="text-xs">{list.data.note}</p> : null}
            </div>
          ) : (
            <ul className="divide-y divide-border">
              {(list.data?.items ?? []).map((b, i) => (
                <li key={i} className="flex items-center justify-between gap-3 py-2 text-sm">
                  <div>
                    <span className="font-medium">{b.count}</span> ·{' '}
                    <span className="text-muted-foreground">
                      {new Date(b.createdAt).toLocaleString()}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge
                      variant={
                        b.status === 'confirmed'
                          ? 'success'
                          : b.status === 'failed'
                            ? 'danger'
                            : 'warning'
                      }
                    >
                      {tStatus(b.status)}
                    </Badge>
                    {b.txHash ? (
                      <a
                        className="font-mono text-xs text-primary underline-offset-4 hover:underline"
                        href={`${EXPLORER}/tx/${b.txHash}`}
                        target="_blank"
                        rel="noreferrer"
                      >
                        {b.txHash.slice(0, 10)}…
                      </a>
                    ) : null}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
