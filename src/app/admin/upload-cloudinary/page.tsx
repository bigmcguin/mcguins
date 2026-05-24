import { checkRole } from '@/lib/auth';
import { cloudinaryConfigured } from '@/lib/cloudinary';
import { CloudinaryUploadForm } from '@/components/admin/CloudinaryUploadForm';

export const metadata = { title: 'Upload images to Cloudinary' };
export const dynamic = 'force-dynamic';

export default async function AdminUploadCloudinaryPage() {
  const check = await checkRole(['ADMIN']);
  if (!check.ok) {
    return (
      <div className="mx-auto max-w-2xl px-6 py-16">
        <h1 className="font-display text-3xl font-medium">Not authorised</h1>
      </div>
    );
  }

  const cfg = cloudinaryConfigured();

  return (
    <div className="mx-auto max-w-3xl px-6 py-12">
      <p className="text-sm font-medium uppercase tracking-[0.18em] text-teal-700">Admin</p>
      <h1 className="mt-2 font-display text-3xl font-medium">Upload images to Cloudinary</h1>
      <p className="mt-3 max-w-prose text-ink-600">
        Pastes a JSON list of village + image-URL entries, and for each one hits
        Cloudinary&apos;s remote-fetch upload endpoint so Cloudinary downloads
        the image and stores it permanently. Each community ends up with a
        Cloudinary <code>publicId</code> instead of a temporary external URL.
      </p>

      {!cfg.ok ? (
        <Setup />
      ) : (
        <>
          <div className="mt-6 rounded-md bg-teal-50 p-4 text-sm text-teal-900">
            Cloudinary is configured — cloud <code>{cfg.cloud}</code>. Ready to upload.
          </div>
          <CloudinaryUploadForm />
        </>
      )}
    </div>
  );
}

function Setup() {
  return (
    <div className="mt-6 rounded-xl border border-amber-200 bg-amber-50 p-5 text-sm text-amber-900">
      <h2 className="font-medium">Cloudinary isn&apos;t configured yet</h2>
      <p className="mt-2">
        To use this tool, set up a free Cloudinary account and add three env
        vars to Vercel:
      </p>
      <ol className="mt-3 list-decimal space-y-1 pl-5">
        <li>
          Sign up at <a className="underline" href="https://cloudinary.com/users/register_free" target="_blank" rel="noreferrer">cloudinary.com/users/register_free</a>
        </li>
        <li>On the dashboard, copy your <strong>Cloud name</strong>, <strong>API Key</strong>, and <strong>API Secret</strong>.</li>
        <li>
          In Vercel → Settings → Environment Variables, add:
          <ul className="mt-1 list-disc pl-5 font-mono text-xs">
            <li>NEXT_PUBLIC_CLOUDINARY_CLOUD = your cloud name</li>
            <li>CLOUDINARY_API_KEY = your API key</li>
            <li>CLOUDINARY_API_SECRET = your API secret</li>
          </ul>
          Tick all three environments (Production, Preview, Development).
        </li>
        <li>Trigger a fresh deploy.</li>
        <li>Reload this page — it&apos;ll switch to upload mode.</li>
      </ol>
    </div>
  );
}
