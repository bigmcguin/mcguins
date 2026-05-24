import Link from 'next/link';
import { revalidatePath } from 'next/cache';
import { auth } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';
import { currentUser } from '@/lib/auth';
import { db } from '@/lib/db';

export const metadata = { title: 'Account status' };
export const dynamic = 'force-dynamic';

async function promoteToAdmin() {
  'use server';
  const { userId } = auth();
  if (!userId) redirect('/sign-in');

  // Only allowed when there's no admin in the system at all — this is the
  // bootstrap escape hatch for the project owner.
  const adminCount = await db.user.count({ where: { role: 'ADMIN' } });
  if (adminCount > 0) {
    return;
  }
  await db.user.update({
    where: { clerkId: userId },
    data: { role: 'ADMIN' },
  });
  revalidatePath('/admin/whoami');
  redirect('/admin/import');
}

export default async function WhoamiPage() {
  const { userId } = auth();
  if (!userId) {
    return (
      <Shell>
        <p className="text-ink-700">
          You&apos;re not signed in.{' '}
          <Link href="/sign-in" className="text-teal-700 underline">
            Sign in
          </Link>{' '}
          first.
        </p>
      </Shell>
    );
  }

  // currentUser() creates the row if missing and self-heals to ADMIN when
  // there are no admins yet — so just calling this is often enough to fix
  // the "I signed up but I'm not admin" case.
  const me = await currentUser();
  const adminCount = await db.user.count({ where: { role: 'ADMIN' } });

  return (
    <Shell>
      <dl className="mt-6 grid gap-3 text-sm">
        <Row label="Clerk user id" value={userId} mono />
        <Row label="Database row" value={me ? 'exists' : 'missing'} />
        <Row label="Email" value={me?.email ?? '—'} />
        <Row label="Your role" value={me?.role ?? '—'} mono />
        <Row label="Total admins in system" value={String(adminCount)} />
      </dl>

      {me?.role === 'ADMIN' ? (
        <div className="mt-8 rounded-lg bg-teal-50 p-4 text-teal-900">
          <p>
            You&apos;re an admin. Go to{' '}
            <Link href="/admin/import" className="font-medium underline">
              /admin/import
            </Link>{' '}
            to load your data.
          </p>
        </div>
      ) : adminCount === 0 ? (
        <form action={promoteToAdmin} className="mt-8">
          <p className="text-ink-700">
            No admin exists yet. You can promote yourself to admin now.
          </p>
          <button
            type="submit"
            className="mt-4 rounded-lg bg-teal-700 px-5 py-2.5 text-sm font-medium text-white hover:bg-teal-800"
          >
            Make me admin
          </button>
        </form>
      ) : (
        <p className="mt-8 text-ink-700">
          An admin already exists, so self-promotion is blocked. Ask the existing
          admin to promote your account.
        </p>
      )}
    </Shell>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="mx-auto max-w-2xl px-6 py-12">
      <p className="text-sm font-medium uppercase tracking-[0.18em] text-teal-700">Admin</p>
      <h1 className="mt-2 font-display text-3xl font-medium">Account status</h1>
      <p className="mt-3 text-ink-600">
        Diagnostic page showing how your sign-in maps to a database user.
      </p>
      {children}
    </div>
  );
}

function Row({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="grid grid-cols-[1fr_2fr] gap-3 border-b border-ink-100 py-2">
      <dt className="text-ink-500">{label}</dt>
      <dd className={mono ? 'font-mono text-xs text-ink-900' : 'text-ink-900'}>{value}</dd>
    </div>
  );
}
