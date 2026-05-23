import Link from 'next/link';
import Image from 'next/image';
import type { Community, CommunityImage as CommunityImageRow, Suburb } from '@prisma/client';
import { formatFeeRange } from '@/lib/utils';

type Props = {
  community: Community & {
    suburb: Suburb;
    images: CommunityImageRow[];
  };
};

export function CommunityCard({ community }: Props) {
  const img = community.images[0];
  const src = img ? cloudinaryUrl(img.publicId, 800) : '/placeholder.svg';

  return (
    <article className="group rounded-xl overflow-hidden border border-brand-100 bg-white hover:shadow-lg transition">
      <Link href={`/communities/${community.slug}`} className="block">
        <div className="relative aspect-[4/3] bg-sand-100">
          <Image
            src={src}
            alt={img?.alt ?? community.name}
            fill
            sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
            className="object-cover group-hover:scale-[1.02] transition"
          />
          {community.featured && (
            <span className="absolute top-3 left-3 rounded-full bg-brand-700 text-white text-xs px-2 py-1">
              Featured
            </span>
          )}
        </div>
        <div className="p-4">
          <h3 className="font-display text-lg font-semibold text-brand-900">
            {community.name}
          </h3>
          <p className="mt-1 text-sm text-brand-700/80">
            {community.suburb.name}, {community.state} {community.postcode}
          </p>
          <p className="mt-3 text-sm font-medium text-brand-800">
            {formatFeeRange(community.siteFeesMin, community.siteFeesMax, community.feeFrequency)}
          </p>
          <div className="mt-3 flex flex-wrap gap-1.5 text-xs">
            {community.over50sOnly && <Pill>Over 50s</Pill>}
            {community.petFriendly && <Pill>Pet friendly</Pill>}
            {community.coastal && <Pill>Coastal</Pill>}
          </div>
        </div>
      </Link>
    </article>
  );
}

function Pill({ children }: { children: React.ReactNode }) {
  return (
    <span className="rounded-full bg-brand-50 text-brand-800 px-2 py-0.5">
      {children}
    </span>
  );
}

function cloudinaryUrl(publicId: string, width: number) {
  const cloud = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
  if (!cloud) return '/placeholder.svg';
  return `https://res.cloudinary.com/${cloud}/image/upload/f_auto,q_auto,w_${width}/${publicId}`;
}
