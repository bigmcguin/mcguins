import { notFound } from 'next/navigation';
import { db } from '@/lib/db';
import { CommunityCard } from '@/components/community/CommunityCard';
import { pageMetadata } from '@/lib/seo';
import { STATE_LABELS } from '@/lib/utils';
import type { AustralianState } from '@prisma/client';
import { AU_STATES as AU_STATES_LIST } from '@/lib/validators';

export const revalidate = 60 * 60 * 24 * 7;

export function generateStaticParams() {
  return AU_STATES_LIST.map((s) => ({ state: s.toLowerCase() }));
}

export async function generateMetadata({ params }: { params: { state: string } }) {
  const code = params.state.toUpperCase();
  const label = STATE_LABELS[code];
  if (!label) return {};
  return pageMetadata({
    title: `Land lease communities in ${label}`,
    description: `Browse and compare land lease communities, lifestyle villages and over-50s communities across ${label}.`,
    path: `/states/${params.state.toLowerCase()}`,
  });
}

export default async function StatePage({ params }: { params: { state: string } }) {
  const code = params.state.toUpperCase() as AustralianState;
  const label = STATE_LABELS[code];
  if (!label) notFound();

  const communities = await db.community.findMany({
    where: { state: code, status: 'PUBLISHED', deletedAt: null },
    include: { suburb: true, images: { take: 1, orderBy: { order: 'asc' } } },
    orderBy: [{ featured: 'desc' }, { name: 'asc' }],
  });

  return (
    <div className="mx-auto max-w-6xl px-6 py-10">
      <h1 className="font-display text-3xl font-semibold">
        Land lease communities in {label}
      </h1>
      <p className="mt-3 max-w-prose text-brand-700/80">
        Explore {communities.length} {communities.length === 1 ? 'community' : 'communities'} in {label}.
        Filter by location, facilities and lifestyle to find the right fit.
      </p>

      <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {communities.map((c) => (
          <CommunityCard key={c.id} community={c} />
        ))}
      </div>
    </div>
  );
}
