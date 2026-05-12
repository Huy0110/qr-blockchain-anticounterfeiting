'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { SessionProvider } from 'next-auth/react';
import { useState } from 'react';

export function Providers({ children }: { children: React.ReactNode }): JSX.Element {
  // One QueryClient per app instance — avoids re-creation on every render.
  const [client] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            // Mgmt portal data is mutated frequently; lean on
            // refetchOnWindowFocus to keep the project list fresh after
            // creating/editing in another tab.
            refetchOnWindowFocus: true,
            staleTime: 30_000,
            retry: 1,
          },
        },
      }),
  );
  return (
    <SessionProvider>
      <QueryClientProvider client={client}>{children}</QueryClientProvider>
    </SessionProvider>
  );
}
