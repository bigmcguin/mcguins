import { requireRole } from '@/lib/auth';
import { db } from '@/lib/db';

export default async function AdminDashboard() {
  await requireRole(['ADMIN']);

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
