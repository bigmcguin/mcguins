import { notFound, redirect } from 'next/navigation';
import Link from 'next/link';
import { revalidatePath } from 'next/cache';
import { checkRole } from '@/lib/auth';
import { db } from '@/lib/db';
import { ParkEditForm } from '@/components/admin/ParkEditForm';

export const metadata = { title: 'Edit park' };
export const dynamic = 'force-dynamic';

async function savePark(id: string, formData: FormData) {
  'use server';

  const check = await checkRole(['ADMIN']);
  if (!check.ok) {
    throw new Error('Forbidden');
  }

  const str = (k: string) => {
    const v = formData.get(k);
    return typeof v === 'string' ? v.trim() : '';
  };
  const optStr = (k: string) => str(k) || null;
  const optInt = (k: string) => {
    const s = str(k);
    if (!s) return null;
    const n = Number.parseInt(s, 10);
    return Number.isFinite(n) ? n : null;
  };
  const optFloat = (k: string) => {
    const s = str(k);
    if (!s) return null;
    const n = Number.parseFloat(s);
    return Number.isFinite(n) ? n : null;
  };
  const optCents = (k: string) => {
    const s = str(k);
    if (!s) return null;
    const n = Number.parseFloat(s);
    if (!Number.isFinite(n)) return null;
    return Math.round(n * 100);
  };
  const bool = (k: string) => formData.get(k) === 'on';

  await db.community.update({
    where: { id },
    data: {
      name: str('name') || undefined,
      status: str('status') as
        | 'DRAFT' | 'UNVERIFIED' | 'PUBLISHED' | 'CLAIMED' | 'ARCHIVED',
      kind: str('kind') as
        | 'LAND_LEASE' | 'LIFESTYLE_VILLAGE' | 'OVER_50S' | 'MANUFACTURED_HOME'
        | 'CARAVAN_LIFESTYLE_PARK' | 'RETIREMENT_VILLAGE',
      addressLine1: str('addressLine1') || undefined,
      addressLine2: optStr('addressLine2'),
      postcode: str('postcode') || undefined,
      latitude: optFloat('latitude'),
      longitude: optFloat('longitude'),
      websiteUrl: optStr('websiteUrl'),
      phone: optStr('phone'),
      emailEnquiries: optStr('emailEnquiries'),
      shortDescription: optStr('shortDescription'),
      description: optStr('description'),
      petFriendly: bool('petFriendly'),
      over50sOnly: bool('over50sOnly'),
      coastal: bool('coastal'),
      ageRestriction: optInt('ageRestriction'),
      siteFeesMin: optCents('siteFeesMinDollars'),
      siteFeesMax: optCents('siteFeesMaxDollars'),
      feeFrequency: (str('feeFrequency') || null) as
        | 'WEEKLY' | 'FORTNIGHTLY' | 'MONTHLY' | 'ANNUALLY' | null,
      totalHomes: optInt('totalHomes'),
      yearEstablished: optInt('yearEstablished'),
      featured: bool('featured'),
    },
  });

  // Re-link facilities. We read all keys named "facility:<slug>" — the form
  // renders a checkbox per canonical facility, and the ones the admin ticked
  // come through as 'on'. Replace the join rows wholesale; this is small
  // (<50 inserts) and idempotent.
  const tickedSlugs = Array.from(formData.keys())
    .filter((k) => k.startsWith('facility:'))
    .map((k) => k.slice('facility:'.length));
  const facilityRows = tickedSlugs.length > 0
    ? await db.facility.findMany({ where: { slug: { in: tickedSlugs } }, select: { id: true } })
    : [];
  await db.communityFacility.deleteMany({ where: { communityId: id } });
  if (facilityRows.length > 0) {
    await db.communityFacility.createMany({
      data: facilityRows.map((f) => ({ communityId: id, facilityId: f.id })),
      skipDuplicates: true,
    });
  }

  revalidatePath('/admin/parks');
  revalidatePath(`/admin/parks/${id}/edit`);
  redirect('/admin/parks');
}

async function deletePark(id: string) {
  'use server';

  const check = await checkRole(['ADMIN']);
  if (!check.ok) {
    throw new Error('Forbidden');
  }

  // Cascade deletes on the schema clean up images, facilities, reviews,
  // enquiries, favourites, and FAQs automatically.
  await db.community.delete({ where: { id } });

  revalidatePath('/admin/parks');
  redirect('/admin/parks');
}

export default async function EditParkPage({ params }: { params: { id: string } }) {
  const check = await checkRole(['ADMIN']);
  if (!check.ok) {
    return (
      <div className="mx-auto max-w-2xl px-6 py-16">
        <h1 className="font-display text-3xl font-medium">Not authorised</h1>
      </div>
    );
  }

  const [park, allFacilities] = await Promise.all([
    db.community.findUnique({
      where: { id: params.id },
      include: {
        suburb: { select: { name: true } },
        facilities: { select: { facility: { select: { slug: true } } } },
      },
    }),
    db.facility.findMany({
      orderBy: [{ category: 'asc' }, { name: 'asc' }],
      select: { slug: true, name: true, category: true, icon: true },
    }),
  ]);
  if (!park) notFound();

  const save = savePark.bind(null, park.id);
  const remove = deletePark.bind(null, park.id);
  const checkedSlugs = new Set(park.facilities.map((f) => f.facility.slug));

  return (
    <div className="mx-auto max-w-3xl px-6 py-12">
      <p className="text-sm">
        <Link href="/admin/parks" className="text-teal-700 underline">
          ← Back to parks
        </Link>
      </p>
      <h1 className="mt-3 font-display text-3xl font-medium">{park.name}</h1>
      <p className="mt-1 text-sm text-ink-600">
        {park.suburb?.name}, {park.state} {park.postcode}
      </p>
      <ParkEditForm
        park={park}
        action={save}
        deleteAction={remove}
        allFacilities={allFacilities}
        checkedFacilitySlugs={Array.from(checkedSlugs)}
      />
    </div>
  );
}
