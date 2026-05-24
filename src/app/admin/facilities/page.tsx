import { checkRole } from '@/lib/auth';
import { db } from '@/lib/db';
import { FACILITIES } from '@/lib/facilities';
import { FacilitiesAdmin } from '@/components/admin/FacilitiesAdmin';

export const metadata = { title: 'Facilities taxonomy' };
export const dynamic = 'force-dynamic';

export default async function AdminFacilitiesPage() {
  const check = await checkRole(['ADMIN']);
  if (!check.ok) {
    return (
      <div className="mx-auto max-w-2xl px-6 py-16">
        <h1 className="font-display text-3xl font-medium">Not authorised</h1>
      </div>
    );
  }

  const inDb = await db.facility.count();
  const linkedRows = await db.communityFacility.count();
  const communitiesWithFacilities = await db.community.count({
    where: { facilities: { some: {} } },
  });

  return (
    <div className="mx-auto max-w-3xl px-6 py-12">
      <p className="text-sm font-medium uppercase tracking-[0.18em] text-teal-700">Admin</p>
      <h1 className="mt-2 font-display text-3xl font-medium">Facilities taxonomy</h1>
      <p className="mt-3 text-ink-600">
        Two-step setup. First sync the canonical list of facilities into the
        database, then bulk-link each community to the facilities they offer
        based on the imported text.
      </p>

      <dl className="mt-6 grid grid-cols-3 gap-4 text-sm">
        <Stat label="Canonical facilities (in code)" value={FACILITIES.length} />
        <Stat label="Facilities in database" value={inDb} bad={inDb < FACILITIES.length} />
        <Stat label="Communities with facilities linked" value={communitiesWithFacilities} />
      </dl>
      <p className="mt-2 text-xs text-ink-500">Total community↔facility links: {linkedRows.toLocaleString()}</p>

      <FacilitiesAdmin />
    </div>
  );
}

function Stat({ label, value, bad }: { label: string; value: number; bad?: boolean }) {
  return (
    <div className="rounded-lg border border-ink-100 bg-white p-4">
      <dd className={`font-display text-2xl ${bad ? 'text-amber-700' : 'text-ink-900'}`}>{value}</dd>
      <dt className="mt-1 text-xs uppercase tracking-wider text-ink-500">{label}</dt>
    </div>
  );
}
