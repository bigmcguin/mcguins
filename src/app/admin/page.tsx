import Link from 'next/link';
import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { checkRole } from '@/lib/auth';
import { db } from '@/lib/db';
import { isCoastal } from '@/lib/import';

export const dynamic = 'force-dynamic';

async function reclassifyCoastalAction() {
  'use server';
  const check = await checkRole(['ADMIN']);
  if (!check.ok) throw new Error('Forbidden');

  const all = await db.community.findMany({
    select: {
      id: true,
      name: true,
      coastal: true,
      addressLine1: true,
      suburb: { select: { name: true } },
    },
  });

  let changed = 0;
  for (const c of all) {
    const next = isCoastal({
      name: c.name,
      suburb: c.suburb?.name,
      address: c.addressLine1,
    });
    if (next !== c.coastal) {
      await db.community.update({ where: { id: c.id }, data: { coastal: next } });
      changed += 1;
    }
  }

  revalidatePath('/admin');
  revalidatePath('/admin/parks');
  redirect(`/admin?reclassified=1&changed=${changed}&total=${all.length}`);
}

export default async function AdminDashboard({
  searchParams,
}: {
  searchParams: { reclassified?: string; changed?: string; total?: string };
}) {
  const check = await checkRole(['ADMIN']);

  if (!check.ok) {
    return (
      <div className="mx-auto max-w-2xl px-6 py-16">
        <h1 className="font-display text-3xl font-medium">Not authorised</h1>
        <p className="mt-4 text-ink-700">
          You&apos;re signed in as <strong>{check.user.email}</strong> with role{' '}
          <code className="rounded bg-ink-100 px-1.5 py-0.5">{check.user.role}</code>.
          Admin pages are restricted.
        </p>
        <p className="mt-4 text-ink-700">
          See{' '}
          <Link href="/admin/whoami" className="text-teal-700 underline">
            /admin/whoami
          </Link>{' '}
          for your account status.
        </p>
      </div>
    );
  }

  const [communities, pendingReviews, recentEnquiries] = await Promise.all([
    db.community.count(),
    db.review.count({ where: { status: 'PENDING' } }),
    db.enquiry.count({ where: { status: 'NEW' } }),
  ]);

  return (
    <div className="mx-auto max-w-6xl px-6 py-16">
      <h1 className="font-display text-3xl font-semibold">Admin dashboard</h1>
      <div className="mt-8 grid gap-4 sm:grid-cols-3">
        <Stat label="Communities" value={communities} />
        <Stat label="Reviews pending moderation" value={pendingReviews} />
        <Stat label="New enquiries" value={recentEnquiries} />
      </div>

      <div className="mt-10 flex flex-wrap gap-3">
        <Link
          href="/admin/parks"
          className="rounded-lg bg-teal-700 px-5 py-2.5 text-sm font-medium text-white hover:bg-teal-800"
        >
          Edit parks
        </Link>
        <Link
          href="/admin/import"
          className="rounded-lg border border-teal-700 px-5 py-2.5 text-sm font-medium text-teal-700 hover:bg-teal-50"
        >
          Import JSON
        </Link>
        <Link
          href="/admin/geocode"
          className="rounded-lg border border-teal-700 px-5 py-2.5 text-sm font-medium text-teal-700 hover:bg-teal-50"
        >
          Geocode missing coords
        </Link>
        <Link
          href="/admin/import-images"
          className="rounded-lg border border-teal-700 px-5 py-2.5 text-sm font-medium text-teal-700 hover:bg-teal-50"
        >
          Import images (JSON)
        </Link>
        <Link
          href="/admin/upload-cloudinary"
          className="rounded-lg border border-teal-700 px-5 py-2.5 text-sm font-medium text-teal-700 hover:bg-teal-50"
        >
          Upload to Cloudinary
        </Link>
        <Link
          href="/admin/facilities"
          className="rounded-lg border border-teal-700 px-5 py-2.5 text-sm font-medium text-teal-700 hover:bg-teal-50"
        >
          Facilities taxonomy
        </Link>
      </div>

      <section className="mt-12 rounded-xl border border-ink-100 bg-white p-6">
        <h2 className="font-display text-xl text-ink-900">Bulk re-classify</h2>
        <p className="mt-2 text-sm text-ink-700">
          Re-runs the coastal detection (expanded keyword list + known coastal
          town names) across every community and flips the Coastal checkbox to
          match. Doesn&apos;t touch any other fields. Safe to run repeatedly.
        </p>
        <form action={reclassifyCoastalAction} className="mt-4">
          <button
            type="submit"
            className="rounded-lg border border-teal-700 px-4 py-2 text-sm font-medium text-teal-700 hover:bg-teal-50"
          >
            Re-classify coastal flag
          </button>
        </form>
        {searchParams.reclassified === '1' && (
          <p className="mt-4 rounded-md bg-teal-50 px-3 py-2 text-sm text-teal-900">
            Done. Updated <strong>{searchParams.changed}</strong> of {searchParams.total} communities.
          </p>
        )}
      </section>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-xl border border-brand-100 bg-white p-5">
      <p className="text-sm text-brand-700/70">{label}</p>
      <p className="mt-2 text-3xl font-semibold">{value}</p>
    </div>
  );
}
