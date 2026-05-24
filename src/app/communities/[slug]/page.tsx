import { notFound } from 'next/navigation';
import Link from 'next/link';
import { db } from '@/lib/db';
import { pageMetadata, communityJsonLd, breadcrumbJsonLd } from '@/lib/seo';
import { formatFeeRange, STATE_LABELS } from '@/lib/utils';
import { imageUrl } from '@/lib/images';
import { EnquiryForm } from '@/components/community/EnquiryForm';
import { CommunityGallery } from '@/components/community/CommunityGallery';
import { MapEmbed } from '@/components/map/MapEmbed';
import { FacilitiesGrid } from '@/components/community/FacilitiesGrid';

export const revalidate = 60 * 60 * 24 * 7; // weekly ISR

export async function generateStaticParams() {
  // Resilient to a missing DATABASE_URL during build (e.g. CI without a DB
  // attached). Falls back to on-demand rendering rather than failing the build.
  try {
    const all = await db.community.findMany({
      where: { status: 'PUBLISHED', deletedAt: null },
      select: { slug: true },
    });
    return all.map((c) => ({ slug: c.slug }));
  } catch {
    return [];
  }
}

export async function generateMetadata({ params }: { params: { slug: string } }) {
  const c = await db.community.findUnique({
    where: { slug: params.slug },
    include: { suburb: true },
  });
  if (!c) return {};
  return pageMetadata({
    title: `${c.name}, ${c.suburb.name} ${c.state}`,
    description:
      c.shortDescription ??
      `${c.name} is a land lease community in ${c.suburb.name}, ${c.state}.`,
    path: `/communities/${c.slug}`,
  });
}

export default async function CommunityProfilePage({ params }: { params: { slug: string } }) {
  const c = await db.community.findUnique({
    where: { slug: params.slug },
    include: {
      operator: true,
      suburb: true,
      images: { orderBy: { order: 'asc' } },
      facilities: { include: { facility: true } },
      faqs: { orderBy: { order: 'asc' } },
      reviews: {
        where: { status: 'APPROVED', deletedAt: null },
        orderBy: { createdAt: 'desc' },
        take: 5,
        include: { user: { select: { name: true } } },
      },
      homes: {
        where: { status: 'FOR_SALE' },
        orderBy: { listedAt: 'desc' },
        take: 6,
      },
    },
  });

  if (!c || c.status === 'DRAFT' || c.deletedAt) notFound();

  const hero = c.images[0];
  const jsonLd = communityJsonLd({
    ...c,
    heroImage: hero ? imageUrl(hero, 1600) : null,
  });
  const breadcrumb = breadcrumbJsonLd([
    { name: 'Home', url: '/' },
    { name: STATE_LABELS[c.state], url: `/states/${c.state.toLowerCase()}` },
    { name: c.suburb.name, url: `/suburbs/${c.suburb.slug}` },
    { name: c.name, url: `/communities/${c.slug}` },
  ]);

  return (
    <article className="mx-auto max-w-6xl px-6 py-10">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumb) }}
      />

      {/* Breadcrumbs */}
      <nav aria-label="Breadcrumb" className="text-sm text-brand-700/70">
        <ol className="flex flex-wrap gap-1">
          <li><Link href="/" className="hover:underline">Home</Link> /</li>
          <li>
            <Link href={`/states/${c.state.toLowerCase()}`} className="hover:underline">
              {STATE_LABELS[c.state]}
            </Link> /
          </li>
          <li>
            <Link href={`/suburbs/${c.suburb.slug}`} className="hover:underline">
              {c.suburb.name}
            </Link> /
          </li>
          <li aria-current="page" className="font-medium text-brand-900">{c.name}</li>
        </ol>
      </nav>

      <header className="mt-4">
        <h1 className="font-display text-3xl sm:text-4xl font-semibold">{c.name}</h1>
        <p className="mt-2 text-brand-700/80">
          {c.addressLine1}, {c.suburb.name} {c.state} {c.postcode}
        </p>
      </header>

      {/* Gallery */}
      {c.images.length > 0 && (
        <div className="mt-6">
          <CommunityGallery images={c.images} alt={c.name} />
        </div>
      )}

      <div className="mt-10 grid gap-10 lg:grid-cols-[2fr_1fr]">
        <div className="space-y-10">
          {c.description && (
            <section>
              <h2 className="font-display text-2xl font-semibold">About</h2>
              <p className="mt-3 whitespace-pre-line text-brand-900/90 max-w-prose">
                {c.description}
              </p>
            </section>
          )}

          {c.facilities.length > 0 && (
            <section>
              <h2 className="font-display text-2xl font-semibold">Facilities</h2>
              <FacilitiesGrid
                items={c.facilities.map((f) => ({
                  slug: f.facility.slug,
                  name: f.facility.name,
                  category: f.facility.category,
                  icon: f.facility.icon ?? 'map-pin',
                }))}
              />
            </section>
          )}

          {c.homes.length > 0 && (
            <section>
              <h2 className="font-display text-2xl font-semibold">Homes for sale</h2>
              <ul className="mt-4 grid gap-4 sm:grid-cols-2">
                {c.homes.map((h) => (
                  <li key={h.id} className="rounded-lg border border-brand-100 bg-white p-4">
                    <h3 className="font-semibold">{h.title}</h3>
                    <p className="text-sm text-brand-700/80">
                      {h.bedrooms ?? '-'} bed · {h.bathrooms ?? '-'} bath · {h.carSpaces ?? '-'} car
                    </p>
                    {h.priceCents && (
                      <p className="mt-1 font-semibold">
                        {new Intl.NumberFormat('en-AU', { style: 'currency', currency: 'AUD', maximumFractionDigits: 0 }).format(h.priceCents / 100)}
                      </p>
                    )}
                  </li>
                ))}
              </ul>
            </section>
          )}

          {c.faqs.length > 0 && (
            <section>
              <h2 className="font-display text-2xl font-semibold">Frequently asked questions</h2>
              <dl className="mt-4 space-y-4">
                {c.faqs.map((f) => (
                  <div key={f.id} className="rounded-lg border border-brand-100 bg-white p-4">
                    <dt className="font-semibold">{f.question}</dt>
                    <dd className="mt-1 text-brand-900/90 whitespace-pre-line">{f.answer}</dd>
                  </div>
                ))}
              </dl>
            </section>
          )}

          <section>
            <h2 className="font-display text-2xl font-semibold">Reviews</h2>
            {c.reviews.length === 0 ? (
              <p className="mt-3 text-brand-700/70">No reviews yet. Be the first to write one.</p>
            ) : (
              <ul className="mt-4 space-y-4">
                {c.reviews.map((r) => (
                  <li key={r.id} className="rounded-lg border border-brand-100 bg-white p-4">
                    <div className="flex items-center justify-between">
                      <h3 className="font-semibold">{r.title}</h3>
                      <span aria-label={`${r.rating} out of 5 stars`}>
                        {'★'.repeat(r.rating)}{'☆'.repeat(5 - r.rating)}
                      </span>
                    </div>
                    <p className="mt-2 text-sm text-brand-700/80">{r.user.name ?? 'Anonymous'}</p>
                    <p className="mt-2 whitespace-pre-line">{r.body}</p>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>

        {/* Sidebar */}
        <aside className="space-y-6">
          <div className="rounded-xl border border-brand-100 bg-white p-5">
            <h3 className="font-semibold">At a glance</h3>
            <dl className="mt-3 space-y-2 text-sm">
              <Row label="Site fees" value={formatFeeRange(c.siteFeesMin, c.siteFeesMax, c.feeFrequency)} />
              <Row label="Total homes" value={c.totalHomes?.toString() ?? '-'} />
              <Row label="Established" value={c.yearEstablished?.toString() ?? '-'} />
              <Row label="Pet friendly" value={c.petFriendly ? 'Yes' : 'No'} />
              <Row label="Over 50s only" value={c.over50sOnly ? 'Yes' : 'No'} />
              <Row label="Coastal" value={c.coastal ? 'Yes' : 'No'} />
            </dl>
            {c.operator && (
              <p className="mt-4 text-sm">
                Operated by <Link href={`/operators/${c.operator.slug}`} className="font-semibold text-brand-700 hover:underline">{c.operator.name}</Link>
              </p>
            )}
          </div>

          <div className="rounded-xl border border-brand-100 bg-white p-5">
            <h3 className="font-semibold">Enquire about {c.name}</h3>
            <EnquiryForm communityId={c.id} />
          </div>

          {c.latitude && c.longitude && (
            <MapEmbed
              single
              height={300}
              points={[
                {
                  id: c.id,
                  name: c.name,
                  lat: c.latitude,
                  lng: c.longitude,
                  state: c.state,
                  suburb: c.suburb?.name,
                },
              ]}
            />
          )}
        </aside>
      </div>
    </article>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-3">
      <dt className="text-brand-700/70">{label}</dt>
      <dd className="font-medium text-right">{value}</dd>
    </div>
  );
}


