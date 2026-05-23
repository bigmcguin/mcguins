# MVP Roadmap

A 14-week plan from empty repo to revenue-generating directory.

## Phase 0 — Foundations (week 1)

- [x] Next.js scaffold, Tailwind, TypeScript, ESLint
- [x] Prisma schema (v1)
- [ ] Neon Postgres + PostGIS extension enabled
- [ ] Vercel project + preview deploys per PR
- [ ] Clerk wired in, admin-only middleware
- [ ] Sentry + PostHog
- [ ] CI: lint + typecheck + Prisma validate on every push

Exit criteria: an admin can log in and see "Hello, admin" at `/admin`.

## Phase 1 — Directory MVP (weeks 2–4)

- [ ] Seed 200 communities (manual + CSV from a public register)
- [ ] `/communities` — server-rendered list with filter sidebar
- [ ] `/communities/[slug]` — full profile, gallery, static Mapbox image
- [ ] `/api/search` backed by Postgres (Meilisearch added in Phase 3)
- [ ] `/states/[state]` programmatic landing pages
- [ ] Contact form → email to a single inbox (manual lead handling)
- [ ] Basic JSON-LD `LocalBusiness` + breadcrumbs

Exit criteria: a user can find a community by state + postcode and submit
an enquiry; Google can index every community page.

## Phase 2 — Accounts & social proof (weeks 5–6)

- [ ] Clerk public sign-up
- [ ] Favourites (`Favourite` table + heart buttons + `/account/favourites`)
- [ ] Reviews — submit, moderation queue in admin, display with rating
- [ ] Saved searches with email alerts (Resend + cron via Vercel)

Exit criteria: a logged-in user can save communities, write a review, and
get an alert when a new community is added in their area.

## Phase 3 — Map, compare, search (weeks 7–8)

- [ ] Meilisearch Cloud index + sync on writes
- [ ] Instant-search directory (typo tolerance, facets)
- [ ] `/map` — clustered Mapbox map with on-map filters
- [ ] `/compare` — side-by-side comparison of up to 4 communities
- [ ] Suburb pages (`/suburbs/[suburb]`)

Exit criteria: search feels instant; map page loads in <1.5 s with 2,000
markers.

## Phase 4 — Operator portal & paid tiers (weeks 9–11)

- [ ] "Claim this listing" flow → operator verification (manual)
- [ ] Operator dashboard — edit communities, see leads, basic analytics
- [ ] Subscription tiers via Stripe (Basic / Featured / Premium)
- [ ] Lead routing — enquiries email the operator directly when claimed
- [ ] Pay-per-lead billing for unsubscribed operators

Exit criteria: first paying operator on the platform.

## Phase 5 — Content engine & SEO (weeks 12–14)

- [ ] Sanity studio for blog
- [ ] `/blog`, `/blog/[slug]`
- [ ] Programmatic combo pages (`/over-50s/[state]`, `/pet-friendly/[state]`)
- [ ] Schema markup audit (Review, FAQPage, AggregateRating)
- [ ] Split sitemaps + robots.txt
- [ ] Lighthouse 95+ across the board
- [ ] First 30 blog posts published

Exit criteria: organic traffic > 5k/month from search.

## Phase 6 — AI layer (post-MVP)

- [ ] Anthropic SDK in `src/lib/ai/`
- [ ] `/api/ai/search` — natural-language community search
- [ ] Nightly job: AI-generated community summaries
- [ ] FAQ chatbot on community pages (streamed)
- [ ] pgvector embeddings for semantic similarity

## Cross-cutting work (continuous)

- [ ] Accessibility audits (axe in CI)
- [ ] Performance budgets (LCP < 2.0 s, JS < 100 kB on directory)
- [ ] Open-data scraping for new communities (Phase 2 onwards)
- [ ] Trust signals: verified badges, photo verification, "last updated"
- [ ] Newsletter (Phase 2) + lifecycle emails (Phase 4)

## Risk register

| Risk                                               | Mitigation                                          |
|----------------------------------------------------|-----------------------------------------------------|
| Operators won't pay                                | Phase 1 proves user demand; talk to 10 operators first |
| Data quality (incorrect site fees etc.)            | Operator claim flow + "report inaccuracy" link      |
| Competitors copy the directory                     | Compound moats: SEO, reviews, photos, operator relationships |
| Mapbox costs at scale                              | Static maps on profiles, GL JS only on `/map`       |
| Clerk MAU pricing once we cross 10k                | Migrate to Auth.js; schema already provider-agnostic |
| Reviews moderation load                            | AI-assisted moderation in Phase 6                   |
