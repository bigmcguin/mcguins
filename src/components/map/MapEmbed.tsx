'use client';

import dynamic from 'next/dynamic';
import type { ComponentProps } from 'react';
import type LeafletMapType from './LeafletMap';

// Leaflet only works in the browser — dynamic import with ssr:false keeps
// it out of the server bundle entirely.
const LeafletMap = dynamic(() => import('./LeafletMap'), {
  ssr: false,
  loading: () => (
    <div
      className="flex items-center justify-center rounded-xl border border-ink-100 bg-sand-100 text-sm text-ink-500"
      style={{ height: 500 }}
    >
      Loading map…
    </div>
  ),
});

export function MapEmbed(props: ComponentProps<typeof LeafletMapType>) {
  return <LeafletMap {...props} />;
}
