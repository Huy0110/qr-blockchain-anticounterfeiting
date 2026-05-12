import type { Locale } from '@/lib/i18n';
import { PublicScanContent } from '@/components/traceability/PublicScanContent';

/**
 * Static export hint. The phi space is unbounded so we emit a single
 * placeholder shell at build time and let the client component resolve
 * the actual phi from `params` at runtime.
 *
 * Concretely: `next build` with `output: 'export'` writes
 * `/<locale>/projects/placeholder/index.html`. The IPFS gateway / web
 * server is configured to serve that shell as the fallback for any
 * unmatched path under `/projects/...`. In dev (`next dev`) the
 * dynamic route works as usual.
 */
export function generateStaticParams(): Array<{ projectId: string }> {
  return [{ projectId: 'placeholder' }];
}

export default function PublicScanPage({
  params,
}: {
  params: { locale: Locale; projectId: string };
}): JSX.Element {
  return <PublicScanContent locale={params.locale} projectId={params.projectId} />;
}
