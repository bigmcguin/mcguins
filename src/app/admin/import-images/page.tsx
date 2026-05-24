import { checkRole } from '@/lib/auth';
import { ImageImportForm } from '@/components/admin/ImageImportForm';

export const metadata = { title: 'Import community images' };
export const dynamic = 'force-dynamic';

export default async function AdminImageImportPage() {
  const check = await checkRole(['ADMIN']);
  if (!check.ok) {
    return (
      <div className="mx-auto max-w-2xl px-6 py-16">
        <h1 className="font-display text-3xl font-medium">Not authorised</h1>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl px-6 py-12">
      <p className="text-sm font-medium uppercase tracking-[0.18em] text-teal-700">Admin</p>
      <h1 className="mt-2 font-display text-3xl font-medium">Import community images</h1>
      <p className="mt-3 max-w-prose text-ink-600">
        Paste a JSON array of image links and hit import. Each entry must have{' '}
        <code>village</code>, <code>operator</code>, <code>source_url</code>, and{' '}
        <code>description</code>. The importer matches by village name + operator,
        skips URLs that point at HTML pages rather than image files, and
        lists every skipped row so you can fix them later.
      </p>

      <ImageImportForm />

      <details className="mt-10 rounded-xl border border-ink-100 bg-white p-5 text-sm text-ink-700">
        <summary className="cursor-pointer font-medium text-ink-900">
          Expected JSON shape
        </summary>
        <pre className="mt-3 overflow-x-auto rounded-md bg-sand-100 p-3 text-xs">{`[
  {
    "village": "The Grange",
    "operator": "Ingenia Communities",
    "source_url": "https://example.com/image.jpg",
    "description": "Aerial view of clubhouse and pool"
  },
  ...
]`}</pre>
        <p className="mt-3">
          A row is <strong>skipped</strong> if the <code>source_url</code> does not
          end in <code>.jpg</code>, <code>.jpeg</code>, <code>.png</code>,{' '}
          <code>.webp</code>, <code>.gif</code>, or <code>.avif</code>. Webpage
          URLs like <code>example.com/communities/the-grange</code> can&apos;t be
          rendered as images, so they get reported back rather than saved as
          broken images.
        </p>
      </details>
    </div>
  );
}
