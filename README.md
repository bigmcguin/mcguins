# Australian Land Lease Directory

A modern, SEO-first comparison and directory platform for Australia's land lease
communities, lifestyle villages, over-50s communities, manufactured-home
communities, and lifestyle parks.

## Stack

| Layer       | Choice                                    |
|-------------|-------------------------------------------|
| Framework   | Next.js 14 (App Router, React Server Components) |
| Language    | TypeScript                                |
| Styling     | Tailwind CSS                              |
| Database    | PostgreSQL (Neon) + PostGIS               |
| ORM         | Prisma                                    |
| Search      | Meilisearch                               |
| Auth        | Clerk                                     |
| Maps        | Mapbox GL JS                              |
| Images      | Cloudinary                                |
| Email       | Resend                                    |
| Blog CMS    | Sanity (later)                            |
| Hosting     | Vercel                                    |
| Analytics   | PostHog                                   |
| Errors      | Sentry                                    |

See `ARCHITECTURE.md` for the design rationale and `ROADMAP.md` for the MVP plan.

## Getting started

```bash
# 1. Install dependencies
pnpm install

# 2. Configure environment
cp .env.example .env
# fill in DATABASE_URL, CLERK_*, MAPBOX_TOKEN, etc.

# 3. Set up the database
pnpm db:migrate
pnpm db:seed

# 4. Run the dev server
pnpm dev
```

Open http://localhost:3000.

## Project structure

```
src/
├── app/              Next.js App Router (pages + route handlers)
├── components/       UI / layout / domain components
├── lib/              db client, auth, search, seo, utils
└── types/            shared TypeScript types
prisma/
├── schema.prisma     Database schema
└── seed.ts           Seed script (sample communities)
```

## Scripts

| Script             | Purpose                                    |
|--------------------|--------------------------------------------|
| `pnpm dev`         | Local development server                   |
| `pnpm build`       | Production build                           |
| `pnpm start`       | Run production build                       |
| `pnpm lint`        | ESLint                                     |
| `pnpm typecheck`   | TypeScript                                 |
| `pnpm db:migrate`  | Apply Prisma migrations                    |
| `pnpm db:seed`     | Seed sample communities                    |
| `pnpm db:studio`   | Open Prisma Studio                         |
