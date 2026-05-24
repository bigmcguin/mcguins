import { NextResponse } from 'next/server';
import { createHash } from 'node:crypto';
import { currentUser } from '@/lib/auth';
import { cloudinaryConfigured } from '@/lib/cloudinary';

// Diagnostic endpoint — does NOT reveal the actual secret values, only
// metadata that helps identify the usual paste mistakes (trailing
// whitespace, wrong character class, length doesn't match what Cloudinary
// shows in the dashboard).

export const runtime = 'nodejs';

export async function GET() {
  const user = await currentUser();
  if (!user || user.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Forbidden: admin only' }, { status: 403 });
  }

  const cfg = cloudinaryConfigured();
  const raw = {
    NEXT_PUBLIC_CLOUDINARY_CLOUD: process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD,
    CLOUDINARY_API_KEY: process.env.CLOUDINARY_API_KEY,
    CLOUDINARY_API_SECRET: process.env.CLOUDINARY_API_SECRET,
  };

  function describe(v: string | undefined) {
    if (v == null) return { present: false };
    const trimmed = v.trim();
    return {
      present: true,
      length: v.length,
      lengthTrimmed: trimmed.length,
      hasLeadingWhitespace: v !== v.trimStart(),
      hasTrailingWhitespace: v !== v.trimEnd(),
      // first/last 3 chars of TRIMMED value so we can compare to the
      // Cloudinary dashboard without exposing the secret
      firstThree: trimmed.slice(0, 3),
      lastThree: trimmed.slice(-3),
      // SHA-256 of trimmed value — lets us compare without revealing
      sha256Prefix: createHash('sha256').update(trimmed).digest('hex').slice(0, 12),
    };
  }

  // Roundtrip test: sign a canonical params string and see whether
  // Cloudinary accepts it. We don't actually call Cloudinary here — just
  // surface the signed string and signature so the admin can spot-check.
  let signTest: object | null = null;
  if (cfg.ok) {
    const timestamp = Math.floor(Date.now() / 1000);
    const params: Record<string, string | number> = {
      folder: 'mcguins/communities',
      overwrite: 'true',
      public_id: 'diagnostic-test',
      timestamp,
    };
    const toSign = Object.keys(params).sort().map((k) => `${k}=${params[k]}`).join('&');
    const signature = createHash('sha1').update(toSign + cfg.apiSecret!).digest('hex');
    signTest = { stringToSign: toSign, signature };
  }

  return NextResponse.json({
    configured: cfg.ok,
    cloudName: raw.NEXT_PUBLIC_CLOUDINARY_CLOUD ?? null,
    apiKey: describe(raw.CLOUDINARY_API_KEY),
    apiSecret: describe(raw.CLOUDINARY_API_SECRET),
    signTest,
  });
}
