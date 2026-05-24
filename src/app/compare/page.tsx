import Link from 'next/link';
import { db } from '@/lib/db';
import { pageMetadata } from '@/lib/seo';
import { imageUrl } from '@/lib/images';
import { formatFeeRange, STATE_LABELS } from '@/lib/utils';
import {
  CATEGORY_LABELS,
  CATEGORY_ORDER,
  type FacilityCategory,
} from '@/lib/facilities';
import { ComparePicker } from '@/components/compare/ComparePicker';
import { FacilityIcon } from '@/components/community/FacilityIcon';

export const metadata = pageMetadata({
  title: 'Compare communities',
  description:
    'Side-by-side comparison of Australian land lease communities — facilities, site fees, location and lifestyle features.',
  path: '/compare',
});

export const dynamic = 'force-dynamic';

const MAX_COMPARE = 4;

export default async function ComparePage({
  searchParams,
}: {
  searchParams: { slugs?: string };
}) {
  const rawSlugs = (searchParams.slugs ?? '').split(',').map((s) => s.trim()).filter(Boolean);
  const slugs = Array.from(new Set(rawSlugs)).slice(0, MAX_COMPARE);

  const [pickerOptions, selectedCommunities] = await Promise.all([
    db.community.findMany({
      where: { status: { in: ['PUBLISHED', 'UNVERIFIED', 'CLAIMED'] }, deletedAt: null },
      orderBy: { name: 'asc' },
      select: {
        slug: true,
        name: true,
        state: true,
        suburb: { select: { name: true } },
        operator: { select: { name: true } },
      },
    }),
    slugs.length > 0
      ? db.community.findMany({
          where: { slug: { in: slugs } },
          include: {
            operator: { select: { name: true } },
            suburb: { select: { name: true, slug: true } },
            images: { orderBy: { order: 'asc' }, take: 1 },
            facilities: {
              include: {
                facility: { select: { slug: true, name: true, category: true, icon: true } },
              },
            },
          },
        })
      : Promise.resolve([]),
  ]);

  // Reorder to match the URL order, not whatever the DB returned
  const bySlug = new Map(selectedCommunities.map((c) => [c.slug, c]));
  const ordered = slugs
    .map((s) => bySlug.get(s))
    .filter((c): c is NonNullable<typeof c> => !!c);

  return (
    <div className="mx-auto max-w-6xl px-6 py-12">
      <p className="text-sm font-medium uppercase tracking-[0.18em] text-teal-700">Compare</p>
      <h1 className="mt-2 font-display text-3xl font-medium">Side-by-side comparison</h1>
      <p className="mt-3 max-w-prose text-ink-600">
        Add up to {MAX_COMPARE} communities below to see their fees, facilities and
        lifestyle features at a glance. Share the URL to send a comparison to
        someone else.
      </p>

      <ComparePicker
        options={pickerOptions.map((c) => ({
          slug: c.slug,
          name: c.name,
          state: c.state,
          suburb: c.suburb?.name ?? null,
          operator: c.operator?.name ?? null,
        }))}
        selectedSlugs={ordered.map((c) => c.slug)}
        max={MAX_COMPARE}
      />

      {ordered.length === 0 ? (
        <EmptyState />
      ) : (
        <ComparisonTable communities={ordered} />
      )}
    </div>
  );
}

function EmptyState() {
  return (
    <div className="mt-10 rounded-xl border border-dashed border-ink-200 bg-white p-10 text-center">
      <p className="text-ink-600">
        Use the search above to add at least one community to start comparing.
      </p>
      <Link href="/communities" className="mt-3 inline-block text-sm text-teal-700 underline">
        Or browse the full directory →
      </Link>
    </div>
  );
}

type CommunityForCompare = {
  id: string;
  slug: string;
  name: string;
  kind: string;
  state: string;
  phone: string | null;
  websiteUrl: string | null;
  yearEstablished: number | null;
  totalHomes: number | null;
  siteFeesMin: number | null;
  siteFeesMax: number | null;
  feeFrequency: string | null;
  over50sOnly: boolean;
  ageRestriction: number | null;
  petFriendly: boolean;
  coastal: boolean;
  suburb: { name: string; slug: string } | null;
  operator: { name: string } | null;
  images: Array<{ publicId: string | null; externalUrl: string | null; alt: string }>;
  facilities: Array<{
    facility: { slug: string; name: string; category: string; icon: string | null };
  }>;
};

function ComparisonTable({ communities }: { communities: CommunityForCompare[] }) {
  // Collect the union of facilities across the selected communities so we only
  // render rows for things at least one park has. Grouped by category.
  type FacRow = {
    slug: string;
    name: string;
    category: string;
    icon: string;
    /** Set of community slugs that have this facility. */
    presentIn: Set<string>;
  };
  const facilitiesByCategory = new Map<FacilityCategory, FacRow[]>();
  const seen = new Map<string, FacRow>();
  for (const c of communities) {
    for (const link of c.facilities) {
      const f = link.facility;
      let row = seen.get(f.slug);
      if (!row) {
        row = {
          slug: f.slug,
          name: f.name,
          category: f.category,
          icon: f.icon ?? 'map-pin',
          presentIn: new Set(),
        };
        seen.set(f.slug, row);
        const cat = (CATEGORY_ORDER.includes(f.category as FacilityCategory)
          ? f.category
          : 'access-services') as FacilityCategory;
        const list = facilitiesByCategory.get(cat) ?? [];
        list.push(row);
        facilitiesByCategory.set(cat, list);
      }
      row.presentIn.add(c.slug);
    }
  }
  const orderedCategories = CATEGORY_ORDER.map((cat) => ({
    cat,
    items: (facilitiesByCategory.get(cat) ?? []).sort((a, b) =>
      a.name.localeCompare(b.name),
    ),
  })).filter((g) => g.items.length > 0);

  const totalCols = communities.length + 1;

  return (
    <div className="mt-8 sm:mt-10">
      <p className="mb-2 text-xs text-ink-500 sm:hidden">
        Swipe sideways to see all columns →
      </p>
      <div className="relative overflow-x-auto rounded-xl border border-ink-100 bg-white">
        <table className="w-full text-xs sm:text-sm">
          <thead>
            <tr className="border-b border-ink-100">
              <th className="sticky left-0 z-10 w-[120px] min-w-[120px] border-r border-ink-100 bg-white px-3 py-3 text-left sm:w-auto sm:min-w-[160px] sm:px-4 sm:py-4" />
              {communities.map((c) => {
                const heroSrc = c.images[0] ? imageUrl(c.images[0], 600) : null;
                return (
                  <th
                    key={c.id}
                    className="min-w-[160px] px-3 py-3 align-top text-left font-normal sm:min-w-[220px] sm:px-4 sm:py-4"
                  >
                    <div className="space-y-2 sm:space-y-3">
                      <div className="relative h-20 w-full overflow-hidden rounded-md bg-sand-100 sm:h-32">
                        {heroSrc ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={heroSrc}
                            alt={c.name}
                            className="absolute inset-0 h-full w-full object-cover"
                          />
                        ) : (
                          <div className="flex h-full items-center justify-center text-xs text-ink-400">
                            No photo
                          </div>
                        )}
                      </div>
                      <div>
                        <Link
                          href={`/communities/${c.slug}`}
                          className="block font-display text-sm leading-tight text-ink-900 hover:text-teal-700 sm:text-lg"
                        >
                          {c.name}
                        </Link>
                        <p className="mt-0.5 text-[10px] text-ink-500 sm:text-xs">
                          {c.suburb?.name}, {STATE_LABELS[c.state] ?? c.state}
                        </p>
                      </div>
                    </div>
                  </th>
                );
              })}
            </tr>
          </thead>

        <tbody className="divide-y divide-ink-100">
          <SectionHeader label="Basics" colSpan={totalCols} />
          <Row label="Operator" cells={communities.map((c) => c.operator?.name ?? '—')} />
          <Row label="Type" cells={communities.map((c) => kindLabel(c.kind))} />
          <Row
            label="Year established"
            cells={communities.map((c) => (c.yearEstablished ? String(c.yearEstablished) : '—'))}
          />
          <Row
            label="Total homes / sites"
            cells={communities.map((c) => (c.totalHomes ? c.totalHomes.toLocaleString() : '—'))}
          />

          <SectionHeader label="Fees" colSpan={totalCols} />
          <Row
            label="Site fees"
            cells={communities.map((c) =>
              formatFeeRange(c.siteFeesMin, c.siteFeesMax, c.feeFrequency),
            )}
          />

          <SectionHeader label="Lifestyle" colSpan={totalCols} />
          <Row
            label="Age policy"
            cells={communities.map((c) =>
              c.over50sOnly
                ? `Over ${c.ageRestriction ?? 50}s only`
                : c.ageRestriction
                  ? `${c.ageRestriction}+`
                  : 'No restriction',
            )}
          />
          <BoolRow label="Pet-friendly" cells={communities.map((c) => c.petFriendly)} />
          <BoolRow label="Coastal" cells={communities.map((c) => c.coastal)} />

          <SectionHeader label="Contact" colSpan={totalCols} />
          <Row label="Phone" cells={communities.map((c) => c.phone ?? '—')} />
          <Row
            label="Website"
            cells={communities.map((c) =>
              c.websiteUrl ? (
                <a
                  key={c.id}
                  href={c.websiteUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="text-teal-700 underline"
                >
                  Visit ↗
                </a>
              ) : (
                '—'
              ),
            )}
          />

          {orderedCategories.map(({ cat, items }) => (
            <FacilityCategoryRows
              key={cat}
              category={cat}
              items={items}
              communities={communities}
              totalCols={totalCols}
            />
          ))}
        </tbody>
        </table>
      </div>
    </div>
  );
}

function FacilityCategoryRows({
  category,
  items,
  communities,
  totalCols,
}: {
  category: FacilityCategory;
  items: Array<{ slug: string; name: string; icon: string; presentIn: Set<string> }>;
  communities: CommunityForCompare[];
  totalCols: number;
}) {
  return (
    <>
      <SectionHeader label={CATEGORY_LABELS[category]} colSpan={totalCols} />
      {items.map((row) => (
        <tr key={row.slug}>
          <th className="sticky left-0 z-10 w-[120px] min-w-[120px] border-r border-ink-100 bg-white px-3 py-2 text-left align-top font-normal text-ink-700 sm:w-auto sm:min-w-[160px] sm:px-4">
            <span className="inline-flex items-start gap-1.5 sm:gap-2">
              <FacilityIcon name={row.icon} size={14} className="mt-0.5 shrink-0 text-teal-700 sm:h-4 sm:w-4" />
              <span className="leading-snug">{row.name}</span>
            </span>
          </th>
          {communities.map((c) => (
            <td key={c.id} className="px-3 py-2 align-top sm:px-4">
              {row.presentIn.has(c.slug) ? (
                <span aria-label="Yes" className="text-teal-700">
                  ✓
                </span>
              ) : (
                <span aria-label="No" className="text-ink-300">
                  —
                </span>
              )}
            </td>
          ))}
        </tr>
      ))}
    </>
  );
}

function SectionHeader({ label, colSpan }: { label: string; colSpan: number }) {
  return (
    <tr className="bg-sand-100">
      <th
        colSpan={colSpan}
        className="px-3 py-2 text-left text-[10px] font-medium uppercase tracking-[0.18em] text-ink-600 sm:px-4 sm:text-xs"
      >
        {label}
      </th>
    </tr>
  );
}

function Row({ label, cells }: { label: string; cells: React.ReactNode[] }) {
  return (
    <tr>
      <th className="sticky left-0 z-10 w-[120px] min-w-[120px] border-r border-ink-100 bg-white px-3 py-2 text-left align-top font-normal leading-snug text-ink-700 sm:w-auto sm:min-w-[160px] sm:px-4">
        {label}
      </th>
      {cells.map((c, i) => (
        <td key={i} className="px-3 py-2 align-top text-ink-900 sm:px-4">
          {c}
        </td>
      ))}
    </tr>
  );
}

function BoolRow({ label, cells }: { label: string; cells: boolean[] }) {
  return (
    <Row
      label={label}
      cells={cells.map((v, i) =>
        v ? (
          <span key={i} className="text-teal-700">✓</span>
        ) : (
          <span key={i} className="text-ink-300">—</span>
        ),
      )}
    />
  );
}

function kindLabel(kind: string): string {
  return kind
    .replaceAll('_', ' ')
    .toLowerCase()
    .replace(/\b\w/g, (m) => m.toUpperCase());
}
