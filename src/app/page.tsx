import Link from 'next/link';
import { db } from '@/lib/db';
import { CommunityCard } from '@/components/community/CommunityCard';
import { SearchBar } from '@/components/search/SearchBar';
import { STATE_LABELS } from '@/lib/utils';

export const revalidate = 3600; // 1 hour

export default async function HomePage() {
  const featured = await db.community.findMany({
    where: { status: 'PUBLISHED', featured: true, deletedAt: null },
    include: { suburb: true, images: { take: 1, orderBy: { order: 'asc' } } },
    take: 6,
    orderBy: { updatedAt: 'desc' },
  });

  return (
    <>
      {/* Hero */}
      <section className="relative bg-brand-700 text-white">
        <div className="mx-auto max-w-6xl px-6 py-20 sm:py-28">
          <h1 className="font-display text-4xl sm:text-5xl font-semibold tracking-tight max-w-3xl">
            Find your perfect Australian land lease community.
          </h1>
          <p className="mt-4 max-w-2xl text-lg text-brand-50/90">
            Compare lifestyle villages, over-50s communities, manufactured-home
            communities and lifestyle parks — all in one place.
          </p>
          <div className="mt-8 max-w-3xl">
            <SearchBar />
          </div>
          <div className="mt-6 flex flex-wrap gap-2 text-sm">
            {['Coastal', 'Pet friendly', 'Over 50s', 'Affordable'].map((label) => (
              <Link
                key={label}
                href={`/communities?${label.toLowerCase().replace(' ', '')}=true`}
                className="rounded-full bg-white/10 hover:bg-white/20 px-3 py-1.5 transition"
              >
                {label}
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Featured */}
      <section className="mx-auto max-w-6xl px-6 py-16">
        <div className="flex items-end justify-between">
          <h2 className="font-display text-2xl sm:text-3xl font-semibold">
            Featured communities
          </h2>
          <Link href="/communities" className="text-brand-700 hover:underline">
            Browse all →
          </Link>
        </div>
        {featured.length === 0 ? (
          <p className="mt-8 text-brand-700/70">
            No featured communities yet — run <code>pnpm db:seed</code> to load samples.
          </p>
        ) : (
          <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {featured.map((c) => (
              <CommunityCard key={c.id} community={c} />
            ))}
          </div>
        )}
      </section>

      {/* Browse by state */}
      <section className="bg-white">
        <div className="mx-auto max-w-6xl px-6 py-16">
          <h2 className="font-display text-2xl sm:text-3xl font-semibold">
            Browse by state
          </h2>
          <ul className="mt-8 grid gap-3 sm:grid-cols-2 md:grid-cols-4">
            {Object.entries(STATE_LABELS).map(([code, label]) => (
              <li key={code}>
                <Link
                  href={`/states/${code.toLowerCase()}`}
                  className="block rounded-lg border border-brand-100 bg-sand-50 px-4 py-3 hover:border-brand-300 hover:bg-white transition"
                >
                  <span className="font-semibold text-brand-800">{code}</span>
                  <span className="ml-2 text-brand-700/70">{label}</span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </section>
    </>
  );
}
