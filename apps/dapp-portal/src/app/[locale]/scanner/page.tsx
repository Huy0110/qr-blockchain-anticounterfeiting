import { ScannerView } from '@/components/scan/ScannerView';
import type { Locale } from '@/lib/i18n';

export default function ScannerPage({ params }: { params: { locale: Locale } }): JSX.Element {
  return <ScannerView locale={params.locale} />;
}
