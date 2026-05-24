// Runs `prisma db push` during the Vercel build so the database schema is
// kept in sync without the user having to run migrations from a terminal.
//
// Two failure modes this script defends against:
//
// 1. DATABASE_URL is not set at build time (e.g. env var was added to
//    Production only and the build runs in a different env). We log a
//    loud warning and exit 0 so the build still succeeds — the site will
//    just not have working DB features.
//
// 2. DATABASE_URL is the pooled Neon URL (the only one users typically
//    paste in). Prisma cannot run DDL through pgbouncer in transaction
//    mode, so db push fails. We auto-derive the direct URL by stripping
//    `-pooler` from the hostname (Neon's convention) and use it for the
//    push. If DIRECT_URL is set, we prefer it.

import { spawnSync } from 'node:child_process';

const dbUrl = process.env.DATABASE_URL;

if (!dbUrl) {
  console.log('[db-sync] DATABASE_URL not set — skipping schema push.');
  console.log('[db-sync] The site will deploy but database features will not work.');
  console.log('[db-sync] Add DATABASE_URL (and ideally DIRECT_URL) in Vercel → Settings → Environment Variables, then redeploy.');
  process.exit(0);
}

const directUrl = process.env.DIRECT_URL ?? deriveDirectUrl(dbUrl);

if (!directUrl) {
  console.error('[db-sync] Could not determine a direct (non-pooled) database URL.');
  console.error('[db-sync] Set DIRECT_URL in your env vars to the non-pooled Neon URL.');
  process.exit(1);
}

if (directUrl !== dbUrl) {
  console.log('[db-sync] Using derived direct URL for schema push (pooler stripped).');
}

console.log('[db-sync] Pushing Prisma schema to the database…');
const result = spawnSync(
  'npx',
  ['prisma', 'db', 'push', '--skip-generate', '--accept-data-loss'],
  {
    stdio: 'inherit',
    shell: true,
    env: { ...process.env, DIRECT_URL: directUrl, DATABASE_URL: directUrl },
  },
);

if (result.status !== 0) {
  console.error('[db-sync] Schema push failed with exit code', result.status);
  console.error('[db-sync] Build continuing anyway — the site will deploy but tables will not exist until this is resolved.');
  // We deliberately do NOT fail the build here. If we did, the user would
  // have a broken site AND no /admin/whoami diagnostic to see what's wrong.
  // Better to ship the diagnostic and surface the problem clearly.
  process.exit(0);
}

console.log('[db-sync] Schema pushed.');
process.exit(0);

// ─────────────────────────────────────────────────────────────────────────────

function deriveDirectUrl(pooledUrl) {
  try {
    const u = new URL(pooledUrl);
    if (!u.hostname.includes('-pooler')) {
      // Not a recognised pooled URL — use as-is and hope for the best.
      return pooledUrl;
    }
    u.hostname = u.hostname.replace('-pooler', '');
    return u.toString();
  } catch {
    return null;
  }
}
