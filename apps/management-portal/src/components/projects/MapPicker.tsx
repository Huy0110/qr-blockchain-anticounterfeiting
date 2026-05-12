'use client';

// Bundle Leaflet's stylesheet with this lazy chunk — no third-party CDN.
import 'leaflet/dist/leaflet.css';

import { useEffect, useRef } from 'react';

/**
 * Click-to-pin map picker. Lazy-imported (next/dynamic) by the form so
 * the leaflet bundle only loads when a project is being created/edited.
 */
export function MapPicker({
  lat,
  lng,
  onChange,
}: {
  lat?: number | undefined;
  lng?: number | undefined;
  onChange: (coords: { lat: number; lng: number }) => void;
}): JSX.Element {
  const containerRef = useRef<HTMLDivElement | null>(null);
  // We hold the leaflet map + marker on a single ref to avoid re-creating
  // the map on every prop tick — only the marker position is mutated.
  const stateRef = useRef<{
    map: { remove: () => void; setView: (c: [number, number], z: number) => unknown } | null;
    marker: { setLatLng: (c: [number, number]) => unknown } | null;
  }>({ map: null, marker: null });

  useEffect(() => {
    let cancelled = false;
    const node = containerRef.current;
    if (!node) return;
    void (async () => {
      const L = (await import('leaflet')).default;
      if (cancelled || !containerRef.current) return;
      // Default to Hà Nội center if no coordinates provided.
      const initial: [number, number] = [lat ?? 21.0285, lng ?? 105.8542];
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const map = (L as any).map(node, { scrollWheelZoom: false }).setView(initial, 12);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (L as any)
        .tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          attribution: '© OpenStreetMap contributors',
        })
        .addTo(map);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const marker = (L as any).marker(initial, { draggable: true }).addTo(map);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      map.on('click', (e: any) => {
        marker.setLatLng(e.latlng);
        onChange({ lat: e.latlng.lat, lng: e.latlng.lng });
      });
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      marker.on('dragend', () => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const ll = (marker as any).getLatLng();
        onChange({ lat: ll.lat, lng: ll.lng });
      });
      stateRef.current = { map, marker };
    })();
    return () => {
      cancelled = true;
      stateRef.current.map?.remove();
      stateRef.current = { map: null, marker: null };
    };
    // Intentional one-shot init: subsequent lat/lng prop updates are
    // syncing back from form state and shouldn't re-mount the map.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Re-center the marker when the parent provides new coords (e.g. user
  // typed lat/lng manually).
  useEffect(() => {
    if (lat === undefined || lng === undefined) return;
    stateRef.current.marker?.setLatLng([lat, lng]);
    stateRef.current.map?.setView([lat, lng], 13);
  }, [lat, lng]);

  return (
    <div
      ref={containerRef}
      role="region"
      aria-label="Map picker"
      className="h-64 w-full overflow-hidden rounded-md border border-border"
    />
  );
}
