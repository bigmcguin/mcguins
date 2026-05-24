// Daily listings-scrape cron.
//
// Triggered by Vercel Cron (see vercel.json) once per day. For each configured
// operator source in src/lib/scrapers/sources.ts:
//   1. Fetch the listings page via the tiered ScrapingBee fallback.
//   2. Run the source's HTML parser to produce OperatorRow[].
//   3. Hand the rows to importCommunities() which upserts into Postgres.
//
// Returns a JSON summary that Vercel surfaces in the cron logs, so we can
// spot "no rows extracted" or "all tiers failed" without digging through
// raw logs.
//
// Auth: accepts either the Vercel Cron bearer token (CRON_SECRET) or an
// admin Clerk session — so it can be triggered manually from the browser
// for debugging.

import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { currentUser } from '@/lib/auth';
import { importCommunities, type OperatorRow } from '@/lib/import';
import { fetchWithFallback } from '@/lib/scrapers/fetch';
import { SOURCES } from '@/lib/scrapers/sources';

export const maxDuration = 60;
export const runtime = 'nodejs';
// Don't cache the cron result — every invocation should hit the upstream sites.
export const dynamic = 'force-dynamic';

type SourceResult = {
  id: string;
  ok: boolean;
  tier?: string;
  bytes?: number;
  rowsParsed: number;
  imported?: number;
  skipped?: number;
  durationMs: number;
  error?: string;
};

async function isAuthorised(req: Request): Promise<boolean> {
  const bearer = req.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret && bearer === `Bearer ${cronSecret}`) return true;

  // Fall back to Clerk admin so we can hit this URL from a browser for
  // ad-hoc debugging (e.g. /api/cron/scrape-listings?source=ingenia&dryRun=1).
  const user = await currentUser();
  return user?.role === 'ADMIN';
}

async function runSource(
  source: (typeof SOURCES)[number],
  opts: { dryRun: boolean },
): Promise<SourceResult> {
  const startedAt = Date.now();
  try {
    const fetched = await fetchWithFallback(source.indexUrl);
    const rows: OperatorRow[] = source.parse(fetched.html);

    if (rows.length === 0) {
      return {
        id: source.id,
        ok: false,
        tier: fetched.tier,
        bytes: fetched.bytes,
        rowsParsed: 0,
        durationMs: Date.now() - startedAt,
        error: 'parser returned 0 rows (HTML structure changed?)',
      };
    }

    const summary = await importCommunities(db, rows, {
      dryRun: opts.dryRun,
      publish: false,
      batchId: `cron-${source.id}-${new Date().toISOString()}`,
    });

    return {
      id: source.id,
      ok: true,
      tier: fetched.tier,
      bytes: fetched.bytes,
      rowsParsed: rows.length,
      imported: summary.imported,
      skipped: summary.skipped,
      durationMs: Date.now() - startedAt,
    };
  } catch (err) {
    return {
      id: source.id,
      ok: false,
      rowsParsed: 0,
      durationMs: Date.now() - startedAt,
      error: err instanceof Error ? err.message : String(err),
    };
  }
}

export async function GET(req: Request) {
  if (!(await isAuthorised(req))) {
    return NextResponse.json({ error: 'Unauthorised' }, { status: 401 });
  }

  const url = new URL(req.url);
  const onlyId = url.searchParams.get('source');
  const dryRun = url.searchParams.get('dryRun') === '1';

  const sources = onlyId ? SOURCES.filter((s) => s.id === onlyId) : SOURCES;
  if (onlyId && sources.length === 0) {
    return NextResponse.json(
      { error: `unknown source: ${onlyId}`, availableSources: SOURCES.map((s) => s.id) },
      { status: 400 },
    );
  }

  const startedAt = Date.now();
  // Run sources in parallel — each is independent and the cron has a 60s
  // budget, so serial execution would risk timing out with more operators.
  const results = await Promise.all(sources.map((s) => runSource(s, { dryRun })));

  return NextResponse.json({
    ok: results.every((r) => r.ok),
    dryRun,
    durationMs: Date.now() - startedAt,
    totalImported: results.reduce((acc, r) => acc + (r.imported ?? 0), 0),
    totalSkipped: results.reduce((acc, r) => acc + (r.skipped ?? 0), 0),
    results,
  });
}
