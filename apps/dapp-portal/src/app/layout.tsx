import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Produce Traceability',
  description: 'Blockchain-verified authenticity for agricultural products.',
};

// Default-locale lang attribute. The [locale]/layout segment sets the
// real locale at runtime via a one-line script so /en/ pages report
// `en` to assistive tech without breaking the static export contract
// (Next 14 requires <html>/<body> at the root layout).
export default function RootLayout({ children }: { children: React.ReactNode }): JSX.Element {
  return (
    <html lang="vi">
      <body>{children}</body>
    </html>
  );
}
