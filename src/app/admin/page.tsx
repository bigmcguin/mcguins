import Link from 'next/link';
import { checkRole } from '@/lib/auth';
import { db } from '@/lib/db';

export default async function AdminDashboard() {
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
      <div className="mt-10">
        <Link
          href="/admin/import"
          className="inline-block rounded-lg bg-teal-700 px-5 py-2.5 text-sm font-medium text-white hover:bg-teal-800"
        >
          Import communities (JSON)
        </Link>
      </div>
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
