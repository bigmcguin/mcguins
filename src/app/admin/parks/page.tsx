import Link from 'next/link';
import type { AustralianState, Prisma } from '@prisma/client';
import { checkRole } from '@/lib/auth';
import { db } from '@/lib/db';
import { STATE_LABELS } from '@/lib/utils';

export const metadata = { title: 'Edit parks' };
export const dynamic = 'force-dynamic';

const PAGE_SIZE = 50;

type Search = { q?: string; state?: string; page?: string };

export default async function AdminParksPage({ searchParams }: { searchParams: Search }) {
  const check = await checkRole(['ADMIN']);
  if (!check.ok) {
    return <Forbidden email={check.user.email} role={check.user.role} />;
  }

  const q = searchParams.q?.trim() ?? '';
  const stateFilter = searchParams.state?.trim().toUpperCase();
  const page = Math.max(1, Number.parseInt(searchParams.page ?? '1', 10) || 1);

  const conditions: Prisma.CommunityWhereInput[] = [];
  if (q) {
    conditions.push({
      OR: [
        { name: { contains: q, mode: 'insensitive' } },
        { addressLine1: { contains: q, mode: 'insensitive' } },
        { suburb: { name: { contains: q, mode: 'insensitive' } } },
      ],
    });
  }
  if (stateFilter && stateFilter in STATE_LABELS) {
    conditions.push({ state: stateFilter as AustralianState });
  }
  const where: Prisma.CommunityWhereInput = conditions.length > 0 ? { AND: conditions } : {};

  const [total, parks] = await Promise.all([
    db.community.count({ where }),
    db.community.findMany({
      where,
      orderBy: [{ name: 'asc' }],
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      select: {
        id: true,
        name: true,
        state: true,
        status: true,
        latitude: true,
        longitude: true,
        suburb: { select: { name: true } },
      },
    }),
  ]);

  const totalPages = Math.ceil(total / PAGE_SIZE);

  return (
    <div className="mx-auto max-w-6xl px-6 py-12">
      <p className="text-sm font-medium uppercase tracking-[0.18em] text-teal-700">Admin</p>
      <h1 className="mt-2 font-display text-3xl font-medium">Edit parks</h1>
      <p className="mt-3 text-ink-600">
        {total.toLocaleString()} communities total. Click any row to edit.
      </p>

      <form className="mt-6 flex flex-wrap gap-3" method="get">
        <input
          name="q"
          defaultValue={q}
          placeholder="Search by name, street, or suburb…"
          className="flex-1 min-w-[240px] rounded-lg border border-ink-200 bg-white px-3 py-2 text-sm"
        />
        <select
          name="state"
          defaultValue={stateFilter ?? ''}
          className="rounded-lg border border-ink-200 bg-white px-3 py-2 text-sm"
        >
          <option value="">All states</option>
          {Object.entries(STATE_LABELS).map(([code, label]) => (
            <option key={code} value={code}>
              {label}
            </option>
          ))}
        </select>
        <button
          type="submit"
          className="rounded-lg bg-teal-700 px-4 py-2 text-sm font-medium text-white hover:bg-teal-800"
        >
          Filter
        </button>
      </form>

      <div className="mt-6 overflow-x-auto rounded-xl border border-ink-100 bg-white">
        <table className="min-w-full text-sm">
          <thead className="bg-sand-100 text-left text-xs uppercase tracking-wider text-ink-500">
            <tr>
              <th className="px-4 py-2.5">Name</th>
              <th className="px-4 py-2.5">Suburb</th>
              <th className="px-4 py-2.5">State</th>
              <th className="px-4 py-2.5">Status</th>
              <th className="px-4 py-2.5">Geo</th>
              <th className="px-4 py-2.5"></th>
            </tr>
          </thead>
          <tbody>
            {parks.map((p) => (
              <tr key={p.id} className="border-t border-ink-100 hover:bg-sand-50">
                <td className="px-4 py-2.5 font-medium text-ink-900">{p.name}</td>
                <td className="px-4 py-2.5 text-ink-700">{p.suburb?.name ?? '-'}</td>
                <td className="px-4 py-2.5 text-ink-700">{p.state}</td>
                <td className="px-4 py-2.5">
                  <StatusPill status={p.status} />
                </td>
                <td className="px-4 py-2.5 text-ink-700">
                  {p.latitude != null && p.longitude != null ? '✓' : <span className="text-red-700">missing</span>}
                </td>
                <td className="px-4 py-2.5 text-right">
                  <Link
                    href={`/admin/parks/${p.id}/edit`}
                    className="text-teal-700 hover:text-teal-900 underline text-xs"
                  >
                    Edit →
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div className="mt-6 flex items-center justify-between text-sm text-ink-700">
          <span>
            Page {page} of {totalPages}
          </span>
          <div className="flex gap-2">
            {page > 1 && (
              <Link
                href={pageHref(searchParams, page - 1)}
                className="rounded-lg border border-ink-200 px-3 py-1.5 hover:bg-sand-50"
              >
                ← Previous
              </Link>
            )}
            {page < totalPages && (
              <Link
                href={pageHref(searchParams, page + 1)}
                className="rounded-lg border border-ink-200 px-3 py-1.5 hover:bg-sand-50"
              >
                Next →
              </Link>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function pageHref(s: Search, page: number) {
  const params = new URLSearchParams();
  if (s.q) params.set('q', s.q);
  if (s.state) params.set('state', s.state);
  if (page > 1) params.set('page', String(page));
  const qs = params.toString();
  return `/admin/parks${qs ? `?${qs}` : ''}`;
}

function StatusPill({ status }: { status: string }) {
  const styles: Record<string, string> = {
    DRAFT: 'bg-ink-100 text-ink-700',
    UNVERIFIED: 'bg-amber-100 text-amber-900',
    PUBLISHED: 'bg-teal-100 text-teal-900',
    CLAIMED: 'bg-emerald-100 text-emerald-900',
    ARCHIVED: 'bg-red-100 text-red-900',
  };
  return (
    <span className={`inline-block rounded px-2 py-0.5 text-xs font-medium ${styles[status] ?? 'bg-ink-100 text-ink-700'}`}>
      {status}
    </span>
  );
}

function Forbidden({ email, role }: { email: string; role: string }) {
  return (
    <div className="mx-auto max-w-2xl px-6 py-16">
      <h1 className="font-display text-3xl font-medium">Not authorised</h1>
      <p className="mt-4 text-ink-700">
        You&apos;re signed in as {email} ({role}). Admin pages are restricted.
      </p>
    </div>
  );
}
