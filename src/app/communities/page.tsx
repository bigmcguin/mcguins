import { Suspense } from 'react';
import { db } from '@/lib/db';
import { communitySearchSchema } from '@/lib/validators';
import { CommunityCard } from '@/components/community/CommunityCard';
import { Filters, FEATURE_FILTERS } from '@/components/search/Filters';
import { pageMetadata } from '@/lib/seo';
import type { Prisma } from '@prisma/client';

export const metadata = pageMetadata({
  title: 'Browse land lease communities',
  description:
    'Search and filter Australian land lease, lifestyle and over-50s communities by state, suburb, postcode and facilities.',
  path: '/communities',
});

type Props = {
  searchParams: Record<string, string | string[] | undefined>;
};

export default async function CommunitiesPage({ searchParams }: Props) {
  const parsed = communitySearchSchema.safeParse(searchParams);
  const params = parsed.success ? parsed.data : communitySearchSchema.parse({});

  // Each feature filter maps to a list of facility slugs — any one of those
  // present on the community satisfies the filter. Combined as AND so the
  // user can require multiple features at once.
  const facilityClauses: Prisma.CommunityWhereInput[] = [];
  for (const f of FEATURE_FILTERS) {
    if (params[f.key]) {
      facilityClauses.push({
        facilities: { some: { facility: { slug: { in: f.slugs } } } },
      });
    }
  }

  const where: Prisma.CommunityWhereInput = {
    status: 'PUBLISHED',
    deletedAt: null,
    ...(params.state && { state: params.state }),
    ...(params.postcode && { postcode: params.postcode }),
    ...(params.petFriendly && { petFriendly: true }),
    ...(params.over50sOnly && { over50sOnly: true }),
    ...(params.coastal && { coastal: true }),
    ...(params.name && {
      name: { contains: params.name, mode: 'insensitive' },
    }),
    ...(params.q && {
      OR: [
        { name: { contains: params.q, mode: 'insensitive' } },
        { suburb: { name: { contains: params.q, mode: 'insensitive' } } },
        ...(/^\d{4}$/.test(params.q) ? [{ postcode: params.q }] : []),
      ],
    }),
    ...(facilityClauses.length > 0 && { AND: facilityClauses }),
  };

  const [items, total] = await Promise.all([
    db.community
      .findMany({
        where,
        include: { suburb: true, images: { take: 1, orderBy: { order: 'asc' } } },
        orderBy:
          params.sort === 'newest'
            ? { createdAt: 'desc' }
            : params.sort === 'price'
              ? { siteFeesMin: 'asc' }
              : [{ featured: 'desc' }, { updatedAt: 'desc' }],
        skip: (params.page - 1) * params.perPage,
        take: params.perPage,
      })
      .catch(() => []),
    db.community.count({ where }).catch(() => 0),
  ]);

  return (
    <div className="mx-auto max-w-6xl px-6 py-10">
      <header>
        <h1 className="font-display text-3xl font-semibold">Land lease communities</h1>
        <p className="mt-2 text-brand-700/80">
          {total} {total === 1 ? 'community' : 'communities'} found
          {params.state ? ` in ${params.state}` : ''}.
        </p>
      </header>

      <div className="mt-8 grid gap-8 lg:grid-cols-[280px_1fr]">
        <aside aria-label="Filters">
          <Suspense>
            <Filters initial={params} />
          </Suspense>
        </aside>

        <section aria-label="Results">
          {items.length === 0 ? (
            <p className="rounded-lg border border-brand-100 bg-white p-8 text-center text-brand-700/70">
              No communities match these filters. Try widening your search.
            </p>
          ) : (
            <div className="grid gap-6 sm:grid-cols-2">
              {items.map((c) => (
                <CommunityCard key={c.id} community={c} />
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
