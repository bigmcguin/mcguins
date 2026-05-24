import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { currentUser } from '@/lib/auth';
import { FACILITIES, parseFacilities } from '@/lib/facilities';

export const maxDuration = 60;
export const runtime = 'nodejs';

// Bulk-link communities to canonical facilities from a JSON dump. The shape
// is compatible with the existing image dataset — each entry has
// village_name + operator + facilities (free text). The community is matched
// by name + operator (with a name-only fallback when unique), the facilities
// string is parsed into canonical slugs, and CommunityFacility rows are
// created (replacing any existing ones for that community).

type Entry = {
  village_name?: string;
  village?: string;
  operator?: string;
  facilities?: string;
};

function normaliseName(s: string): string {
  return s.toLowerCase().replace(/[^\p{L}\p{N}\s]/gu, ' ').replace(/\s+/g, ' ').trim();
}

type Result =
  | { row: number; village?: string; status: 'linked'; matched: number; ignored: number }
  | { row: number; village?: string; status: 'skipped'; reason: string };

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
  const entries = body.entries as Entry[];
  const replaceExisting = body.replaceExisting ?? true;

  // Make sure the canonical facilities exist in the DB. Without these, the
  // CommunityFacility inserts below would fail on foreign key constraints.
  const dbFacilities = await db.facility.findMany({ select: { slug: true, id: true } });
  const facilityIdBySlug = new Map(dbFacilities.map((f) => [f.slug, f.id]));
  const missing = FACILITIES.filter((f) => !facilityIdBySlug.has(f.slug));
  if (missing.length > 0) {
    return NextResponse.json(
      {
        error: `Canonical facilities not yet seeded (${missing.length} missing). Run the "Sync taxonomy" button first.`,
      },
      { status: 412 },
    );
  }

  // Preload communities for matching
  const communities = await db.community.findMany({
    select: { id: true, name: true, operator: { select: { name: true } } },
  });
  const byKey = new Map<string, string[]>();
  for (const c of communities) {
    const nameKey = normaliseName(c.name);
    const opKey = c.operator ? normaliseName(c.operator.name) : '';
    const combined = `${nameKey}::${opKey}`;
    for (const k of [combined, nameKey]) {
      const list = byKey.get(k) ?? [];
      list.push(c.id);
      byKey.set(k, list);
    }
  }

  // First pass: parse and match in memory. No DB writes in this loop, so
  // it's fast even for hundreds of entries.
  const results: Result[] = [];
  const linkRows: { communityId: string; facilityId: string }[] = [];
  const communityIdsToClear = new Set<string>();

  for (let i = 0; i < entries.length; i++) {
    const e = entries[i];
    const row = i + 1;
    const village = e.village_name ?? e.village ?? '';

    if (!village || !e.facilities) {
      results.push({ row, village, status: 'skipped', reason: 'missing village or facilities' });
      continue;
    }

    const nameKey = normaliseName(village);
    const opKey = e.operator ? normaliseName(e.operator) : '';
    let candidates = byKey.get(`${nameKey}::${opKey}`);
    if (!candidates || candidates.length === 0) {
      const unique = Array.from(new Set(byKey.get(nameKey) ?? []));
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

    const communityId = candidates[0];
    const slugs = parseFacilities(e.facilities);
    communityIdsToClear.add(communityId);
    for (const slug of slugs) {
      const facilityId = facilityIdBySlug.get(slug);
      if (facilityId) linkRows.push({ communityId, facilityId });
    }

    const tokens = e.facilities.split(/[,;\n]/).map((t) => t.trim()).filter(Boolean);
    results.push({
      row,
      village,
      status: 'linked',
      matched: slugs.length,
      ignored: Math.max(0, tokens.length - slugs.length),
    });
  }

  // Second pass: hit the DB just twice per batch — one bulk delete to clear
  // existing links for every matched community, one bulk insert to create
  // the new ones. Through Neon's pooler that's ~50ms total, regardless of
  // how many entries the batch contained.
  if (replaceExisting && communityIdsToClear.size > 0) {
    await db.communityFacility.deleteMany({
      where: { communityId: { in: Array.from(communityIdsToClear) } },
    });
  }
  if (linkRows.length > 0) {
    await db.communityFacility.createMany({
      data: linkRows,
      skipDuplicates: true,
    });
  }
  const totalLinks = linkRows.length;

  const linked = results.filter((r) => r.status === 'linked').length;
  const skipped = results.length - linked;
  return NextResponse.json({
    total: entries.length,
    linked,
    skipped,
    totalLinks,
    results,
  });
}
