import Link from 'next/link';
import Image from 'next/image';
import { db } from '@/lib/db';
import { CommunityCard } from '@/components/community/CommunityCard';
import { SearchBar } from '@/components/search/SearchBar';
import { STATE_LABELS } from '@/lib/utils';

export const revalidate = 3600;

export default async function HomePage() {
  const [featured, totalCount] = await Promise.all([
    db.community
      .findMany({
        where: { status: 'PUBLISHED', deletedAt: null },
        include: { suburb: true, images: { take: 1, orderBy: { order: 'asc' } } },
        orderBy: [{ featured: 'desc' }, { updatedAt: 'desc' }],
        take: 6,
      })
      .catch(() => []),
    db.community.count({ where: { status: 'PUBLISHED', deletedAt: null } }).catch(() => 0),
  ]);

  return (
    <>
      {/* Hero */}
      <section className="relative isolate overflow-hidden bg-teal-900 text-white">
        <Image
          src="https://images.unsplash.com/photo-1493809842364-78817add7ffb?auto=format&fit=crop&w=2000&q=80"
          alt=""
          fill
          priority
          sizes="100vw"
          className="object-cover opacity-30"
        />
        <div className="absolute inset-0 bg-gradient-to-br from-teal-900/90 via-teal-900/75 to-teal-700/40" aria-hidden />
        <div className="relative mx-auto max-w-6xl px-6 py-24 sm:py-32">
          <p className="text-sm font-medium uppercase tracking-[0.18em] text-teal-100/90">
            Australia&apos;s land lease directory
          </p>
          <h1 className="mt-4 font-display text-4xl sm:text-6xl font-medium leading-[1.05] max-w-3xl tracking-tight">
            Find your next chapter, on your terms.
          </h1>
          <p className="mt-5 max-w-2xl text-lg text-teal-50/90">
            Compare {totalCount > 0 ? `${totalCount}+` : ''} lifestyle villages, over-50s
            communities and land lease estates across Australia. Real photos, site fees,
            verified operators and resident reviews — all in one place.
          </p>
          <div className="mt-10 max-w-3xl">
            <SearchBar />
          </div>
          <div className="mt-6 flex flex-wrap items-center gap-x-6 gap-y-2 text-sm text-teal-50/80">
            <span>Popular searches:</span>
            <Link href="/communities?coastal=true" className="hover:text-white hover:underline">Coastal</Link>
            <Link href="/communities?petFriendly=true" className="hover:text-white hover:underline">Pet friendly</Link>
            <Link href="/communities?over50sOnly=true" className="hover:text-white hover:underline">Over 50s only</Link>
            <Link href="/states/qld" className="hover:text-white hover:underline">Queensland</Link>
            <Link href="/states/nsw" className="hover:text-white hover:underline">NSW</Link>
            <Link href="/states/vic" className="hover:text-white hover:underline">Victoria</Link>
          </div>
        </div>
      </section>

      {/* Trust strip */}
      <section className="border-y border-ink-100 bg-white">
        <div className="mx-auto max-w-6xl px-6 py-8 grid grid-cols-2 md:grid-cols-4 gap-6 text-sm">
          <Trust label="Communities listed" value={totalCount > 0 ? `${totalCount}+` : '—'} />
          <Trust label="States covered" value="All 8" />
          <Trust label="Operators verified" value="Manually" />
          <Trust label="Independent" value="Free to browse" />
        </div>
      </section>

      {/* Featured */}
      <section className="mx-auto max-w-6xl px-6 py-20">
        <div className="flex items-end justify-between gap-4">
          <div>
            <p className="text-sm font-medium uppercase tracking-[0.18em] text-teal-700">Featured</p>
            <h2 className="mt-2 font-display text-3xl sm:text-4xl font-medium">
              Communities worth a closer look
            </h2>
          </div>
          <Link
            href="/communities"
            className="hidden sm:inline-block text-sm font-medium text-teal-700 hover:text-teal-900"
          >
            Browse all &rarr;
          </Link>
        </div>
        {featured.length === 0 ? (
          <p className="mt-10 rounded-2xl border border-ink-100 bg-white p-10 text-center text-ink-500">
            No published communities yet. Run <code className="text-ink-900">pnpm db:import-json</code> to add some.
          </p>
        ) : (
          <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {featured.map((c) => (
              <CommunityCard key={c.id} community={c} />
            ))}
          </div>
        )}
      </section>

      {/* Browse by state */}
      <section className="bg-teal-50">
        <div className="mx-auto max-w-6xl px-6 py-20">
          <div className="flex items-end justify-between gap-4">
            <div>
              <p className="text-sm font-medium uppercase tracking-[0.18em] text-teal-700">By location</p>
              <h2 className="mt-2 font-display text-3xl sm:text-4xl font-medium">
                Browse by state
              </h2>
            </div>
          </div>
          <ul className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {Object.entries(STATE_LABELS).map(([code, label]) => (
              <li key={code}>
                <Link
                  href={`/states/${code.toLowerCase()}`}
                  className="group flex items-baseline justify-between rounded-xl border border-teal-200 bg-white px-5 py-4 hover:border-teal-500 hover:shadow-card transition"
                >
                  <span>
                    <span className="block font-display text-lg text-ink-900">{label}</span>
                    <span className="block text-xs uppercase tracking-wider text-ink-500">{code}</span>
                  </span>
                  <span className="text-teal-700 group-hover:translate-x-0.5 transition">&rarr;</span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* Why us */}
      <section className="mx-auto max-w-6xl px-6 py-20">
        <p className="text-sm font-medium uppercase tracking-[0.18em] text-teal-700">Why land lease?</p>
        <h2 className="mt-2 font-display text-3xl sm:text-4xl font-medium max-w-2xl">
          A smarter way to live well in retirement.
        </h2>
        <div className="mt-12 grid gap-8 md:grid-cols-3">
          <Pillar
            title="Buy the home, lease the land"
            body="No stamp duty on the land, no exit fees, and you own the home. Site fees cover the use of the community grounds and shared facilities."
          />
          <Pillar
            title="Built around community"
            body="Clubhouses, pools, bowling greens, libraries, workshops — most communities are designed for a connected, active lifestyle from day one."
          />
          <Pillar
            title="Free up your savings"
            body="Selling a long-held family home and downsizing to a land lease community typically frees up significant capital — often eligible for the Centrelink pension."
          />
        </div>
      </section>
    </>
  );
}

function Trust({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="font-display text-2xl text-ink-900">{value}</p>
      <p className="mt-1 text-xs uppercase tracking-wider text-ink-500">{label}</p>
    </div>
  );
}

function Pillar({ title, body }: { title: string; body: string }) {
  return (
    <article>
      <h3 className="font-display text-xl text-ink-900">{title}</h3>
      <p className="mt-3 text-ink-700 leading-relaxed">{body}</p>
    </article>
  );
}
