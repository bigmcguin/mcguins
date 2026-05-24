import { db } from '@/lib/db';
import { pageMetadata } from '@/lib/seo';
import { MapEmbed } from '@/components/map/MapEmbed';

export const metadata = pageMetadata({
  title: 'Map of all communities',
  description: 'Explore Australian land lease and lifestyle communities on an interactive map.',
  path: '/map',
});

export const dynamic = 'force-dynamic';

export default async function MapPage() {
  const communities = await db.community.findMany({
    where: {
      latitude: { not: null },
      longitude: { not: null },
      status: { in: ['PUBLISHED', 'UNVERIFIED', 'CLAIMED'] },
    },
    select: {
      id: true,
      slug: true,
      name: true,
      latitude: true,
      longitude: true,
      state: true,
      suburb: { select: { name: true } },
    },
  });

  const points = communities
    .filter((c) => c.latitude != null && c.longitude != null)
    .map((c) => ({
      id: c.id,
      slug: c.slug,
      name: c.name,
      lat: c.latitude!,
      lng: c.longitude!,
      state: c.state,
      suburb: c.suburb?.name,
    }));

  const totalCount = await db.community.count({
    where: { status: { in: ['PUBLISHED', 'UNVERIFIED', 'CLAIMED'] } },
  });
  const withoutCoords = totalCount - points.length;

  return (
    <div className="mx-auto max-w-6xl px-6 py-12">
      <p className="text-sm font-medium uppercase tracking-[0.18em] text-teal-700">Explore</p>
      <h1 className="mt-2 font-display text-3xl font-medium">Communities on a map</h1>
      <p className="mt-3 max-w-prose text-ink-600">
        {points.length.toLocaleString()} of {totalCount.toLocaleString()} communities
        plotted across Australia. Click a pin to see the community name; zoom in to
        split clusters apart.
        {withoutCoords > 0 && (
          <>
            {' '}
            <span className="text-ink-500">
              ({withoutCoords} community{withoutCoords === 1 ? '' : 'ies'} not yet geocoded.)
            </span>
          </>
        )}
      </p>

      <div className="mt-8">
        <MapEmbed points={points} height={640} />
      </div>
    </div>
  );
}
