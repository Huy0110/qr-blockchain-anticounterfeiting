'use client';

import { useEffect, useState } from 'react';

/**
 * Reads the IPFS CID from the URL pathname when the dApp is served via
 * an IPFS gateway (e.g., /ipfs/<CID>/...). Useful so reviewers can see
 * the exact build that's serving them.
 */
export function CidFooter(): JSX.Element | null {
  const [cid, setCid] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const match = window.location.pathname.match(/\/ipfs\/([a-zA-Z0-9]+)/);
    const buildCid = process.env.NEXT_PUBLIC_BUILD_CID || (match?.[1] ?? null);
    setCid(buildCid);
  }, []);

  if (!cid) return null;
  return (
    <p className="font-mono">
      CID: <span title={cid}>{cid.slice(0, 12)}…</span>
    </p>
  );
}
