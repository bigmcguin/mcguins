// Runs `prisma db push` during the Vercel build so the database schema is
// kept in sync without the user having to run migrations from a terminal.
// If DATABASE_URL isn't configured yet, this is a no-op (so the first deploy
// before the env var is set still succeeds — just without a working DB).

import { spawnSync } from 'node:child_process';

if (!process.env.DATABASE_URL) {
  console.log('[db-sync] DATABASE_URL not set — skipping schema push.');
  console.log('[db-sync] The site will deploy but database features will not work.');
  console.log('[db-sync] Add DATABASE_URL and DIRECT_URL in Vercel → Settings → Environment Variables, then redeploy.');
  process.exit(0);
}

console.log('[db-sync] Pushing Prisma schema to the database…');
const result = spawnSync(
  'npx',
  ['prisma', 'db', 'push', '--skip-generate', '--accept-data-loss'],
  { stdio: 'inherit', shell: true },
);
process.exit(result.status ?? 0);
