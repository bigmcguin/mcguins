import Link from 'next/link';
import { checkRole } from '@/lib/auth';
import { ImportForm } from '@/components/admin/ImportForm';

export const metadata = { title: 'Import communities' };

export default async function AdminImportPage() {
  const check = await checkRole(['ADMIN']);

  if (!check.ok) {
    return <Forbidden email={check.user.email} role={check.user.role} />;
  }

  return (
    <div className="mx-auto max-w-3xl px-6 py-12">
      <p className="text-sm font-medium uppercase tracking-[0.18em] text-teal-700">Admin</p>
      <h1 className="mt-2 font-display text-3xl font-medium">Import communities</h1>
      <p className="mt-3 max-w-prose text-ink-600">
        Paste the JSON array of communities below, or upload a <code>.json</code> file.
        Use <strong>Dry run</strong> first to preview what will be imported and check
        for errors. Then run the real import.
      </p>

      <ImportForm />

      <details className="mt-10 rounded-xl border border-ink-100 bg-white p-5 text-sm text-ink-700">
        <summary className="cursor-pointer font-medium text-ink-900">
          Expected JSON shape
        </summary>
        <p className="mt-3">
          Each entry should look like the operator spreadsheet, with fields such as{' '}
          <code>Village Name</code>, <code>Full Address</code>,{' '}
          <code>Park Chain (Operator)</code>, <code>State</code>, <code>Postcode</code>,{' '}
          <code>Weekly Site Fees</code>, etc.
        </p>
        <p className="mt-3">
          The required fields per row are: <strong>Village Name</strong>,{' '}
          <strong>Full Address</strong>, <strong>State</strong>, <strong>Postcode</strong>.
          Everything else is optional. What&apos;s present gets imported, what&apos;s
          missing stays blank and can be filled in later.
        </p>
      </details>
    </div>
  );
}

function Forbidden({ email, role }: { email: string; role: string }) {
  return (
    <div className="mx-auto max-w-2xl px-6 py-16">
      <h1 className="font-display text-3xl font-medium">Not authorised</h1>
      <p className="mt-4 text-ink-700">
        You&apos;re signed in as <strong>{email}</strong> with the role{' '}
        <code className="rounded bg-ink-100 px-1.5 py-0.5">{role}</code>, but this
        page is restricted to <code className="rounded bg-ink-100 px-1.5 py-0.5">ADMIN</code>.
      </p>
      <p className="mt-4 text-ink-700">
        If you&apos;re the project owner and were expecting admin access, visit{' '}
        <Link href="/admin/whoami" className="text-teal-700 underline">
          /admin/whoami
        </Link>{' '}
        to check your account status and self-promote (allowed only when no admin
        exists yet).
      </p>
    </div>
  );
}
