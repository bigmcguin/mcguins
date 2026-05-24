import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { currentUser } from '@/lib/auth';

export const maxDuration = 60;
export const runtime = 'nodejs';

// Accepted entry shapes. The original importer used flat fields (village,
// source_url, description). The newer dataset nests the image fields and
// uses snake_case (village_name + image.cdn_url). We normalise both into
// the same internal shape below.
type FlatEntry = {
  village?: string;
  operator?: string;
  source_url?: string;
  description?: string;
};
type NestedEntry = {
  village_name?: string;
  operator?: string;
  image?: {
    cdn_url?: string;
    source_url?: string;
    description?: string;
  };
};
type Entry = FlatEntry | NestedEntry;

type NormalisedEntry = {
  village?: string;
  operator?: string;
  imageUrl?: string;
  sourcePageUrl?: string;
  description?: string;
};

function normaliseEntry(e: Entry): NormalisedEntry {
  if ('image' in e && e.image) {
    return {
      village: e.village_name,
      operator: e.operator,
      imageUrl: e.image.cdn_url,
      sourcePageUrl: e.image.source_url,
      description: e.image.description,
    };
  }
  const flat = e as FlatEntry;
  return {
    village: flat.village,
    operator: flat.operator,
    imageUrl: flat.source_url,
    sourcePageUrl: flat.source_url,
    description: flat.description,
  };
}

type Result =
  | { row: number; village?: string; status: 'imported' }
  | { row: number; village?: string; status: 'skipped'; reason: string };

// Normalise a name for fuzzy matching: lowercase, strip punctuation, collapse
// whitespace. So "Archer's Run, Morisset" → "archers run morisset".
function normaliseName(s: string): string {
  return s
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

// Does the source URL point at an actual image file? We accept the common
// raster formats. We DO NOT try to load the URL — that would be too slow and
// require permissive network access. A URL like ".../image.jpg?fit=cover" is
// still recognised because we strip the query string first.
function isDirectImageUrl(url: string): boolean {
  try {
    const u = new URL(url);
    const path = u.pathname.toLowerCase();
    return /\.(jpe?g|png|webp|gif|avif)$/.test(path);
  } catch {
    return false;
  }
}

export async function POST(req: Request) {
  const user = await currentUser();
  if (!user || user.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Forbidden — admin only' }, { status: 403 });
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
  const entries = (body.entries as Entry[]).map(normaliseEntry);
  const replaceExisting = body.replaceExisting ?? false;

  // Preload all communities + operators so matching doesn't hit the DB per row.
  const communities = await db.community.findMany({
    select: {
      id: true,
      name: true,
      operator: { select: { name: true } },
    },
  });
  const byKey = new Map<string, string[]>();
  for (const c of communities) {
    const nameKey = normaliseName(c.name);
    const opKey = c.operator ? normaliseName(c.operator.name) : '';
    const key = `${nameKey}::${opKey}`;
    const list = byKey.get(key) ?? [];
    list.push(c.id);
    byKey.set(key, list);
    // Also index by name-only for last-resort match
    const nameOnly = byKey.get(nameKey) ?? [];
    nameOnly.push(c.id);
    byKey.set(nameKey, nameOnly);
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

    if (!isDirectImageUrl(e.imageUrl)) {
      let host = '';
      try {
        host = new URL(e.imageUrl).hostname;
      } catch {
        host = 'unparseable URL';
      }
      results.push({
        row,
        village,
        status: 'skipped',
        reason: `image URL is a webpage, not a direct image (${host})`,
      });
      continue;
    }

    const nameKey = normaliseName(e.village);
    const opKey = e.operator ? normaliseName(e.operator) : '';

    // First try strict name+operator match
    let ids = byKey.get(`${nameKey}::${opKey}`);

    // If that didn't find one and there's only one community with this name,
    // accept it. (Common when operator labels differ slightly.)
    if (!ids || ids.length === 0) {
      const nameOnly = byKey.get(nameKey);
      // De-dupe (the index appended the id under both keys)
      const unique = nameOnly ? Array.from(new Set(nameOnly)) : [];
      if (unique.length === 1) ids = unique;
    }

    if (!ids || ids.length === 0) {
      results.push({
        row,
        village,
        status: 'skipped',
        reason: `no community matches "${e.village}" (operator "${e.operator ?? ''}")`,
      });
      continue;
    }

    if (ids.length > 1) {
      results.push({
        row,
        village,
        status: 'skipped',
        reason: `ambiguous: ${ids.length} communities match this name+operator`,
      });
      continue;
    }

    const communityId = ids[0];

    // If replaceExisting, drop any existing image rows for this community
    // first so we don't accumulate duplicates each time the user re-runs.
    if (replaceExisting) {
      await db.communityImage.deleteMany({ where: { communityId } });
    }

    await db.communityImage.create({
      data: {
        communityId,
        externalUrl: e.imageUrl,
        alt: e.description ?? e.village,
        isHero: true,
        order: 0,
        sourcePageUrl: e.sourcePageUrl ?? e.imageUrl,
      },
    });

    results.push({ row, village, status: 'imported' });
  }

  const imported = results.filter((r) => r.status === 'imported').length;
  const skipped = results.length - imported;
  return NextResponse.json({ total: entries.length, imported, skipped, results });
}
