// Token-authenticated ingest endpoint for external scrapers (Robomotion,
// Make.com, n8n, a self-hosted Playwright runner, etc.).
//
// The existing /api/admin/import-json is Clerk-session-gated, which is the
// right gate for a human admin uploading a CSV from the dashboard. It's the
// wrong gate for a service-to-service call from Robomotion, which has no
// browser session. This endpoint mirrors the same body shape and reuses the
// same importCommunities() core, but authenticates via a shared bearer
// token instead.
//
// Calling convention from Robomotion (or any HTTP client):
//
//   POST /api/ingest/communities
//   Authorization: Bearer <INGEST_TOKEN>
//   Content-Type: application/json
//
//   {
//     "rows": [
//       {
//         "village_name": "The Grange",
//         "full_address": "4 Gimberts Road, Morisset NSW 2264",
//         "operator": "Ingenia Communities",
//         "website_url": "https://ingenialifestyle.com.au/communities/...",
//         "weekly_site_fees": "$190 - $220 per week"
//       },
//       ...
//     ],
//     "publish": false,   // optional; rows default to UNVERIFIED
//     "dryRun":  false,   // optional; validate only, no DB writes
//     "batchId": "robomotion-ingenia-2026-05-25"   // optional
//   }
//
// Both snake_case and "Title Case" row keys are accepted — see normaliseRow
// in src/lib/import.ts.

import { NextResponse } from 'next/server';
import { timingSafeEqual } from 'node:crypto';
import { db } from '@/lib/db';
import { importCommunities, type OperatorRow } from '@/lib/import';

export const maxDuration = 60;
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function isAuthorised(req: Request): boolean {
  const token = process.env.INGEST_TOKEN;
  // Refuse rather than allowing through with an empty token — a missing
  // env var should be a deployment-time error, not a silent open door.
  if (!token) return false;

  const provided = req.headers.get('authorization') ?? '';
  const expected = `Bearer ${token}`;
  if (provided.length !== expected.length) return false;
  return timingSafeEqual(Buffer.from(provided), Buffer.from(expected));
}

export async function POST(req: Request) {
  if (!isAuthorised(req)) {
    return NextResponse.json({ error: 'Unauthorised' }, { status: 401 });
  }

  let payload: {
    rows: unknown;
    publish?: boolean;
    dryRun?: boolean;
    batchId?: string;
  };
  try {
    payload = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON in request body' }, { status: 400 });
  }

  if (!Array.isArray(payload.rows)) {
    return NextResponse.json(
      {
        error:
          'Body must be { rows: [...], publish?: bool, dryRun?: bool, batchId?: string }',
      },
      { status: 400 },
    );
  }

  // Tag each batch with the source header so we can grep logs back to a
  // specific Robomotion flow when something goes sideways. Optional — the
  // request still works without it.
  const sourceTag = req.headers.get('x-ingest-source') ?? 'unknown';
  const startedAt = Date.now();

  const summary = await importCommunities(
    db,
    payload.rows as OperatorRow[],
    {
      dryRun: payload.dryRun ?? false,
      publish: payload.publish ?? false,
      batchId: payload.batchId ?? `ingest-${sourceTag}-${new Date().toISOString()}`,
    },
  );

  // Structured log line so Vercel log search can pick up ingest failures
  // without scrolling through HTTP access logs.
  console.log(
    JSON.stringify({
      event: 'ingest',
      source: sourceTag,
      batchId: summary.batchId,
      total: summary.total,
      imported: summary.imported,
      skipped: summary.skipped,
      dryRun: payload.dryRun ?? false,
      durationMs: Date.now() - startedAt,
    }),
  );

  return NextResponse.json(summary);
}
