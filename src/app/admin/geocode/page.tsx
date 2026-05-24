import { checkRole } from '@/lib/auth';
import { db } from '@/lib/db';
import { GeocodeRunner } from '@/components/admin/GeocodeRunner';

export const metadata = { title: 'Geocode missing coordinates' };
export const dynamic = 'force-dynamic';

export default async function AdminGeocodePage() {
  const check = await checkRole(['ADMIN']);
  if (!check.ok) {
    return (
      <div className="mx-auto max-w-2xl px-6 py-16">
        <h1 className="font-display text-3xl font-medium">Not authorised</h1>
      </div>
    );
  }

  const missing = await db.community.findMany({
    where: { OR: [{ latitude: null }, { longitude: null }] },
    select: { id: true, name: true, state: true, suburb: { select: { name: true } } },
    orderBy: { name: 'asc' },
  });

  return (
    <div className="mx-auto max-w-3xl px-6 py-12">
      <p className="text-sm font-medium uppercase tracking-[0.18em] text-teal-700">Admin</p>
      <h1 className="mt-2 font-display text-3xl font-medium">Geocode missing coordinates</h1>
      <p className="mt-3 text-ink-600">
        {missing.length === 0
          ? 'Every community has a latitude and longitude. Nothing to do here.'
          : `${missing.length} community${missing.length === 1 ? '' : 'ies'} ${missing.length === 1 ? 'is' : 'are'} missing coordinates. Run the geocoder to look them up via OpenStreetMap's Nominatim service (free, ~1 second per address).`}
      </p>

      {missing.length > 0 && (
        <>
          <GeocodeRunner ids={missing.map((m) => m.id)} />
          <details className="mt-8 rounded-xl border border-ink-100 bg-white p-5 text-sm text-ink-700">
            <summary className="cursor-pointer font-medium text-ink-900">
              Show the list ({missing.length})
            </summary>
            <ul className="mt-3 max-h-80 overflow-auto space-y-1">
              {missing.map((m) => (
                <li key={m.id} className="text-xs text-ink-700">
                  {m.name} <span className="text-ink-500">— {m.suburb?.name}, {m.state}</span>
                </li>
              ))}
            </ul>
          </details>
        </>
      )}
    </div>
  );
}
