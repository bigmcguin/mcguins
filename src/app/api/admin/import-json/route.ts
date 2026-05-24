import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { currentUser } from '@/lib/auth';
import { importCommunities, type OperatorRow } from '@/lib/import';

// Higher payload limit for community dumps (default is ~1 MB on Vercel edge,
// but the Node.js runtime is fine with our typical ~250 KB-1 MB dataset).
export const maxDuration = 60;
export const runtime = 'nodejs';

export async function POST(req: Request) {
  const user = await currentUser();
  if (!user || user.role !== 'ADMIN') {
    return NextResponse.json(
      { error: 'Forbidden: admin only' },
      { status: 403 },
    );
  }

  let payload: {
    rows: unknown;
    publish?: boolean;
    dryRun?: boolean;
    batchId?: string;
    rowOffset?: number;
  };
  try {
    payload = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON in request body' }, { status: 400 });
  }

  if (!Array.isArray(payload.rows)) {
    return NextResponse.json(
      { error: 'Body must be { rows: [...], publish?: bool, dryRun?: bool, batchId?: string, rowOffset?: number }' },
      { status: 400 },
    );
  }

  const summary = await importCommunities(
    db,
    payload.rows as OperatorRow[],
    {
      dryRun: payload.dryRun ?? false,
      publish: payload.publish ?? false,
      batchId: payload.batchId,
    },
  );

  // Shift row numbers in errors so the client can show real positions
  // when the import is sent in batches.
  const offset = payload.rowOffset ?? 0;
  if (offset > 0) {
    summary.errors = summary.errors.map((e) => ({ ...e, row: e.row + offset }));
  }

  return NextResponse.json(summary);
}
