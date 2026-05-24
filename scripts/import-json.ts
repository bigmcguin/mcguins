#!/usr/bin/env tsx
/**
 * CLI wrapper around the shared importer in src/lib/import.ts.
 *
 * Usage:
 *   pnpm db:import-json ./data/operators-communities.json              # imports as UNVERIFIED
 *   pnpm db:import-json ./data/operators-communities.json --dry-run    # parse + validate only
 *   pnpm db:import-json ./data/operators-communities.json --publish    # mark PUBLISHED
 */

import { readFileSync } from 'node:fs';
import { PrismaClient } from '@prisma/client';
import { importCommunities, type OperatorRow } from '../src/lib/import';

const db = new PrismaClient();

async function main() {
  const args = process.argv.slice(2);
  const path = args.find((a) => !a.startsWith('--'));
  const dryRun = args.includes('--dry-run');
  const publish = args.includes('--publish');

  if (!path) {
    console.error('Usage: pnpm db:import-json <path-to-json> [--dry-run] [--publish]');
    process.exit(1);
  }

  const text = readFileSync(path, 'utf8');
  const rows: OperatorRow[] = JSON.parse(text);
  if (!Array.isArray(rows)) {
    console.error('JSON root must be an array of community objects.');
    process.exit(1);
  }

  console.log(`\nFile: ${path}`);
  console.log(`Rows: ${rows.length}`);
  console.log(`Mode: ${dryRun ? 'DRY RUN' : publish ? 'WRITE as PUBLISHED' : 'WRITE as UNVERIFIED'}\n`);

  const summary = await importCommunities(db, rows, { dryRun, publish });

  console.log(`✓ ${summary.imported} ${dryRun ? 'would be imported' : 'imported'}`);
  if (summary.skipped > 0) {
    console.log(`✗ ${summary.skipped} skipped:`);
    for (const e of summary.errors.slice(0, 30)) {
      console.log(`  row ${e.row} (${e.name ?? '—'}): ${e.reason}`);
    }
    if (summary.errors.length > 30) {
      console.log(`  ...and ${summary.errors.length - 30} more.`);
    }
  }
  if (!dryRun && summary.imported > 0) {
    console.log(`\nBatch ID: ${summary.batchId}`);
    if (!publish) {
      console.log('Imported as UNVERIFIED. Use Prisma Studio or the admin page to flip to PUBLISHED.');
    }
  }
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
