import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { currentUser } from '@/lib/auth';
import { uploadFromUrl, cloudinaryConfigured } from '@/lib/cloudinary';
import { slugify } from '@/lib/utils';

export const maxDuration = 60;
export const runtime = 'nodejs';

type FlatEntry = {
  village?: string;
  operator?: string;
  source_url?: string;
  description?: string;
};
type NestedEntry = {
  village_name?: string;
  operator?: string;
  image?: { cdn_url?: string; source_url?: string; description?: string };
};
type Entry = FlatEntry | NestedEntry;

type Normalised = {
  village?: string;
  operator?: string;
  imageUrl?: string;
  sourcePageUrl?: string;
  description?: string;
};

function normalise(e: Entry): Normalised {
  if ('image' in e && e.image) {
    return {
      village: e.village_name,
      operator: e.operator,
      imageUrl: e.image.cdn_url,
      sourcePageUrl: e.image.source_url,
      description: e.image.description,
    };
  }
  const f = e as FlatEntry;
  return {
    village: f.village,
    operator: f.operator,
    imageUrl: f.source_url,
    sourcePageUrl: f.source_url,
    description: f.description,
  };
}

function normaliseName(s: string): string {
  return s.toLowerCase().replace(/[^\p{L}\p{N}\s]/gu, ' ').replace(/\s+/g, ' ').trim();
}

type Result =
  | { row: number; village?: string; status: 'uploaded'; publicId: string }
  | { row: number; village?: string; status: 'skipped'; reason: string };

export async function POST(req: Request) {
  const user = await currentUser();
  if (!user || user.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Forbidden: admin only' }, { status: 403 });
  }

  if (!cloudinaryConfigured().ok) {
    return NextResponse.json(
      {
        error:
          'Cloudinary env vars not set. Add NEXT_PUBLIC_CLOUDINARY_CLOUD, CLOUDINARY_API_KEY, and CLOUDINARY_API_SECRET in Vercel and redeploy.',
      },
      { status: 412 },
    );
  }

  let body: { entries?: unknown; replaceExisting?: boolean };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }
  if (!Array.isArray(body.entries)) {
    return NextResponse.json(
      { error: 'Body must be { entries: [...], replaceExisting?: bool }' },
      { status: 400 },
    );
  }
  const entries = (body.entries as Entry[]).map(normalise);
  const replaceExisting = body.replaceExisting ?? true;

  // Preload communities for matching
  const communities = await db.community.findMany({
    select: {
      id: true,
      name: true,
      slug: true,
      operator: { select: { name: true } },
    },
  });
  const byKey = new Map<string, { id: string; slug: string }[]>();
  for (const c of communities) {
    const nameKey = normaliseName(c.name);
    const opKey = c.operator ? normaliseName(c.operator.name) : '';
    const combined = `${nameKey}::${opKey}`;
    for (const k of [combined, nameKey]) {
      const list = byKey.get(k) ?? [];
      list.push({ id: c.id, slug: c.slug });
      byKey.set(k, list);
    }
  }

  const results: Result[] = [];

  for (let i = 0; i < entries.length; i++) {
    const e = entries[i];
    const row = i + 1;
    const village = e.village ?? '';

    if (!e.village || !e.imageUrl) {
      results.push({ row, village, status: 'skipped', reason: 'missing village or image URL' });
      continue;
    }

    const nameKey = normaliseName(e.village);
    const opKey = e.operator ? normaliseName(e.operator) : '';
    let candidates = byKey.get(`${nameKey}::${opKey}`);
    if (!candidates || candidates.length === 0) {
      const unique = Array.from(
        new Map((byKey.get(nameKey) ?? []).map((c) => [c.id, c])).values(),
      );
      if (unique.length === 1) candidates = unique;
    }

    if (!candidates || candidates.length === 0) {
      results.push({ row, village, status: 'skipped', reason: 'no community match' });
      continue;
    }
    if (candidates.length > 1) {
      results.push({ row, village, status: 'skipped', reason: 'ambiguous community match' });
      continue;
    }

    const community = candidates[0];
    const publicIdLeaf = slugify(community.slug || e.village);

    try {
      const result = await uploadFromUrl({
        sourceUrl: e.imageUrl,
        publicId: publicIdLeaf,
      });

      if (replaceExisting) {
        await db.communityImage.deleteMany({ where: { communityId: community.id } });
      }
      await db.communityImage.create({
        data: {
          communityId: community.id,
          publicId: result.publicId,
          alt: e.description ?? e.village,
          isHero: true,
          order: 0,
          sourcePageUrl: e.sourcePageUrl ?? e.imageUrl,
        },
      });
      results.push({ row, village, status: 'uploaded', publicId: result.publicId });
    } catch (err) {
      results.push({
        row,
        village,
        status: 'skipped',
        reason: err instanceof Error ? err.message : String(err),
      });
    }
  }

  const uploaded = results.filter((r) => r.status === 'uploaded').length;
  const skipped = results.length - uploaded;
  return NextResponse.json({ total: entries.length, uploaded, skipped, results });
}
