'use client';

// Bundle Leaflet's stylesheet with this chunk so the IPFS-hosted dApp
// has no third-party CDN dependency. This file is only imported via
// next/dynamic from PublicScanContent, so the CSS only ships when the
// user actually views a project page.
import 'leaflet/dist/leaflet.css';

import { useEffect, useRef } from 'react';
import { useTranslations } from 'next-intl';
import type { GeoCoordinates } from '@qr-bc/shared';

/**
 * Lazy-loaded Leaflet map. Only mounted when a project actually has
 * coordinates — keeps the leaflet bundle out of the critical path for
 * scans that lack location metadata.
 */
export function LocationMap({
  coordinates,
  label,
}: {
  coordinates: GeoCoordinates;
  label?: string;
}): JSX.Element {
  const t = useTranslations('publicScan');
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<unknown>(null);

  useEffect(() => {
    let cancelled = false;
    const node = containerRef.current;
    if (!node) return;

    void (async () => {
      const L = (await import('leaflet')).default;
      if (cancelled || !containerRef.current) return;
      const map = L.map(node, { scrollWheelZoom: false }).setView(
        [coordinates.lat, coordinates.lng],
        14,
      );
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors',
      }).addTo(map);
      const marker = L.marker([coordinates.lat, coordinates.lng]).addTo(map);
      if (label) marker.bindPopup(label).openPopup();
      mapRef.current = map;
    })();

    return () => {
      cancelled = true;
      const map = mapRef.current as { remove: () => void } | null;
      if (map && typeof map.remove === 'function') {
        map.remove();
      }
    };
  }, [coordinates.lat, coordinates.lng, label]);

  return (
    <section className="space-y-2" aria-label={t('mapTitle')}>
      <h2 className="text-lg font-semibold">{t('mapTitle')}</h2>
      <div
        ref={containerRef}
        className="h-64 w-full overflow-hidden rounded-md border border-border"
        role="region"
      />
    </section>
  );
}
