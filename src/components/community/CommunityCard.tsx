import Link from 'next/link';
import type { Community, CommunityImage as CommunityImageRow, Suburb } from '@prisma/client';
import { formatFeeRange } from '@/lib/utils';
import { imageUrl } from '@/lib/images';

type Props = {
  community: Community & {
    suburb: Suburb;
    images: CommunityImageRow[];
  };
};

// Stable placeholder colour per community so cards aren't all the same when
// images aren't loaded yet. Hashes the slug to pick from a small palette.
const PLACEHOLDER_TINTS = [
  'from-teal-700 to-teal-500',
  'from-teal-800 to-teal-600',
  'from-ink-700 to-ink-500',
  'from-teal-600 to-sand-300',
];

export function CommunityCard({ community }: Props) {
  const img = community.images[0];
  const src = img ? imageUrl(img, 800) : null;
  const tint = PLACEHOLDER_TINTS[hashCode(community.slug) % PLACEHOLDER_TINTS.length];

  return (
    <article className="group flex flex-col overflow-hidden rounded-2xl border border-ink-100 bg-white shadow-card hover:-translate-y-0.5 hover:shadow-xl transition">
      <Link href={`/communities/${community.slug}`} className="flex flex-col h-full">
        <div className="relative aspect-[4/3] overflow-hidden">
          {src ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={src}
              alt={img?.alt ?? community.name}
              loading="lazy"
              className="absolute inset-0 h-full w-full object-cover group-hover:scale-[1.03] transition duration-500"
            />
          ) : (
            <div className={`absolute inset-0 bg-gradient-to-br ${tint}`}>
              <span className="absolute inset-0 flex items-center justify-center font-display text-3xl text-white/30">
                {community.name.charAt(0)}
              </span>
            </div>
          )}
          {community.featured && (
            <span className="absolute top-3 left-3 rounded-full bg-white/95 text-teal-800 text-xs font-medium px-3 py-1 shadow-sm">
              Featured
            </span>
          )}
          <span className="absolute bottom-3 left-3 rounded-full bg-ink-900/70 text-white text-xs px-2.5 py-1 backdrop-blur">
            {community.state}
          </span>
        </div>
        <div className="flex flex-col flex-1 p-5">
          <p className="text-xs uppercase tracking-wider text-ink-500">
            {community.suburb.name} · {community.postcode}
          </p>
          <h3 className="mt-1 font-display text-xl leading-tight text-ink-900 group-hover:text-teal-800 transition">
            {community.name}
          </h3>
          {community.shortDescription && (
            <p className="mt-2 text-sm text-ink-600 line-clamp-2">{community.shortDescription}</p>
          )}
          <div className="mt-4 flex flex-wrap gap-1.5 text-xs">
            {community.over50sOnly && <Pill>Over 50s</Pill>}
            {community.petFriendly && <Pill>Pets OK</Pill>}
            {community.coastal && <Pill>Coastal</Pill>}
            {community.totalHomes && <Pill>{community.totalHomes} homes</Pill>}
          </div>
          <div className="mt-auto pt-5 flex items-baseline justify-between border-t border-ink-100">
            <div>
              <p className="text-xs uppercase tracking-wider text-ink-500">Site fees</p>
              <p className="font-display text-base text-ink-900">
                {formatFeeRange(community.siteFeesMin, community.siteFeesMax, community.feeFrequency)}
              </p>
            </div>
            <span className="text-sm text-teal-700 group-hover:text-teal-900 transition">View &rarr;</span>
          </div>
        </div>
      </Link>
    </article>
  );
}

function Pill({ children }: { children: React.ReactNode }) {
  return (
    <span className="rounded-full bg-teal-50 text-teal-800 px-2.5 py-0.5">
      {children}
    </span>
  );
}

function hashCode(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = ((h << 5) - h + s.charCodeAt(i)) | 0;
  return Math.abs(h);
}
