import { createHash } from 'node:crypto';

// Cloudinary upload using their REST API directly so we don't pull in their
// SDK as a dependency. We use the "remote fetch" mode — pass the source URL
// and Cloudinary's servers download it themselves. That way the upload
// works even though our Vercel function (and this sandbox) can't reach the
// Manus CDN host.

type UploadResult = {
  publicId: string;
  url: string;
  width?: number;
  height?: number;
};

export function cloudinaryConfigured(): {
  ok: boolean;
  cloud?: string;
  apiKey?: string;
  apiSecret?: string;
} {
  // Defensive trim — values pasted into Vercel sometimes pick up trailing
  // whitespace/newlines, which silently breaks the HMAC signature.
  const cloud = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD?.trim();
  const apiKey = process.env.CLOUDINARY_API_KEY?.trim();
  const apiSecret = process.env.CLOUDINARY_API_SECRET?.trim();
  if (!cloud || !apiKey || !apiSecret) return { ok: false };
  return { ok: true, cloud, apiKey, apiSecret };
}

export async function uploadFromUrl(opts: {
  sourceUrl: string;
  publicId: string;
  folder?: string;
}): Promise<UploadResult> {
  const cfg = cloudinaryConfigured();
  if (!cfg.ok) throw new Error('Cloudinary env vars not configured');

  const timestamp = Math.floor(Date.now() / 1000);
  const folder = opts.folder ?? 'mcguins/communities';

  // Signature is SHA-1 of the parameters that go to Cloudinary, sorted
  // alphabetically, joined as key=value pairs with '&', plus the api secret.
  const paramsToSign: Record<string, string | number> = {
    folder,
    overwrite: 'true',
    public_id: opts.publicId,
    timestamp,
  };
  const toSign = Object.keys(paramsToSign)
    .sort()
    .map((k) => `${k}=${paramsToSign[k]}`)
    .join('&');
  const signature = createHash('sha1').update(toSign + cfg.apiSecret!).digest('hex');

  const form = new URLSearchParams();
  form.set('file', opts.sourceUrl);
  form.set('folder', folder);
  form.set('overwrite', 'true');
  form.set('public_id', opts.publicId);
  form.set('timestamp', String(timestamp));
  form.set('api_key', cfg.apiKey!);
  form.set('signature', signature);

  const url = `https://api.cloudinary.com/v1_1/${cfg.cloud}/image/upload`;
  const res = await fetch(url, { method: 'POST', body: form });
  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`Cloudinary upload failed: ${res.status} ${body.slice(0, 200)}`);
  }
  const data = (await res.json()) as {
    public_id: string;
    secure_url: string;
    width?: number;
    height?: number;
  };
  return {
    publicId: data.public_id,
    url: data.secure_url,
    width: data.width,
    height: data.height,
  };
}
