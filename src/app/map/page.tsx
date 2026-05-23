import { pageMetadata } from '@/lib/seo';

export const metadata = pageMetadata({
  title: 'Map of all communities',
  description: 'Explore Australian land lease and lifestyle communities on an interactive map.',
  path: '/map',
});

export default function MapPage() {
  return (
    <div className="mx-auto max-w-6xl px-6 py-16">
      <h1 className="font-display text-3xl font-semibold">Map view</h1>
      <p className="mt-3 max-w-prose text-brand-700/80">
        An interactive Mapbox map with clustered markers and on-map filters.
      </p>
      <div className="mt-8 aspect-[16/9] rounded-xl border border-brand-100 bg-sand-100 flex items-center justify-center text-brand-700/60">
        Mapbox cluster map — phase 3 of the roadmap.
      </div>
    </div>
  );
}
