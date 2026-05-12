import type { Locale } from '@/lib/i18n';
import { PrivateScanContent } from '@/components/scan/PrivateScanContent';

/**
 * Static export hint: phi × sid space is unbounded. Emit a single
 * placeholder shell; PrivateScanContent extracts the actual params from
 * window.location.pathname at runtime.
 */
export function generateStaticParams(): Array<{ projectId: string; secretId: string }> {
  return [{ projectId: 'placeholder', secretId: 'placeholder' }];
}

export default function PrivateScanPage({
  params,
}: {
  params: { locale: Locale; projectId: string; secretId: string };
}): JSX.Element {
  return (
    <PrivateScanContent
      locale={params.locale}
      projectId={params.projectId}
      secretId={params.secretId}
    />
  );
}
