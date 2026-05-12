import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Producer Management Portal',
  description: 'Manage projects, batches, and verification analytics.',
};

// Inline pre-paint script: read the persisted theme preference from
// localStorage and toggle the `dark` class on <html> before React
// hydrates. Without this, the toggle in DashboardChrome is reset on
// every reload (writes localStorage but nothing reads it back at boot).
const themeBootScript = `(function(){try{var t=localStorage.getItem('theme');if(t==='dark')document.documentElement.classList.add('dark');}catch(e){}})();`;

export default function RootLayout({ children }: { children: React.ReactNode }): JSX.Element {
  return (
    <html lang="vi">
      <head>
        {/* eslint-disable-next-line react/no-danger */}
        <script dangerouslySetInnerHTML={{ __html: themeBootScript }} />
      </head>
      <body>{children}</body>
    </html>
  );
}
