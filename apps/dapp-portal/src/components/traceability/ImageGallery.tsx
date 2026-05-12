import { useTranslations } from 'next-intl';

const IPFS_GATEWAY = process.env.NEXT_PUBLIC_IPFS_GATEWAY ?? 'https://ipfs.io/ipfs';

function ipfsToHttp(url: string): string {
  if (url.startsWith('ipfs://')) {
    const cid = url.slice('ipfs://'.length);
    return `${IPFS_GATEWAY.replace(/\/$/, '')}/${cid}`;
  }
  return url;
}

export function ImageGallery({ urls }: { urls: string[] }): JSX.Element | null {
  const t = useTranslations('publicScan');
  if (urls.length === 0) return null;
  return (
    <section className="space-y-3" aria-label={t('imagesTitle')}>
      <h2 className="text-lg font-semibold">{t('imagesTitle')}</h2>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        {urls.map((url, i) => (
          <div
            key={`${url}-${i}`}
            className="aspect-square overflow-hidden rounded-md border border-border bg-muted"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={ipfsToHttp(url)}
              alt=""
              className="h-full w-full object-cover"
              loading="lazy"
            />
          </div>
        ))}
      </div>
    </section>
  );
}
