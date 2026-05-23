import { notFound } from 'next/navigation';
import { db } from '@/lib/db';
import { CommunityCard } from '@/components/community/CommunityCard';
import { pageMetadata } from '@/lib/seo';
import { STATE_LABELS } from '@/lib/utils';

export const revalidate = 60 * 60 * 24 * 7;

export async function generateStaticParams() {
  const suburbs = await db.suburb.findMany({
    where: { communities: { some: { status: 'PUBLISHED' } } },
    select: { slug: true },
  });
  return suburbs.map((s) => ({ suburb: s.slug }));
}

export async function generateMetadata({ params }: { params: { suburb: string } }) {
  const suburb = await db.suburb.findUnique({ where: { slug: params.suburb } });
  if (!suburb) return {};
  return pageMetadata({
    title: `Land lease communities in ${suburb.name}, ${suburb.state}`,
    description: `Compare land lease, lifestyle and over-50s communities in ${suburb.name} ${suburb.state} ${suburb.postcode}.`,
    path: `/suburbs/${suburb.slug}`,
  });
}

export default async function SuburbPage({ params }: { params: { suburb: string } }) {
  const suburb = await db.suburb.findUnique({
    where: { slug: params.suburb },
    include: {
      communities: {
        where: { status: 'PUBLISHED', deletedAt: null },
        include: { suburb: true, images: { take: 1, orderBy: { order: 'asc' } } },
        orderBy: [{ featured: 'desc' }, { name: 'asc' }],
      },
    },
  });
  if (!suburb) notFound();

  return (
    <div className="mx-auto max-w-6xl px-6 py-10">
      <h1 className="font-display text-3xl font-semibold">
        Land lease communities in {suburb.name}, {suburb.state}
      </h1>
      <p className="mt-3 max-w-prose text-brand-700/80">
        {suburb.communities.length} {suburb.communities.length === 1 ? 'community' : 'communities'}
        {' '}in {suburb.name} ({suburb.postcode}), {STATE_LABELS[suburb.state]}.
      </p>
      <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {suburb.communities.map((c) => (
          <CommunityCard key={c.id} community={c} />
        ))}
      </div>
    </div>
  );
}
