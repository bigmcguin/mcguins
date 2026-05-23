# Architecture

This document explains the design decisions for the Australian Land Lease
Directory. Written so that a non-engineer can read it and understand the trade-offs.

## 1. Guiding principles

1. **SEO is the moat.** Every architectural decision is weighed against its
   impact on organic search. The site must render fast HTML to bots, expose
   structured data, and produce thousands of legitimate landing pages.
2. **Trust matters more than features.** Older demographics will judge the
   site harshly if it feels sketchy. Clean visual design, real reviews,
   verified operators, accessible UI.
3. **Cheap until traction, scalable when needed.** Use managed services with
   generous free tiers for the MVP; design so that any single component can
   be swapped to self-hosted later.
4. **Data is the asset.** The directory of communities is the long-term moat.
   Schema design prioritises data quality, claimability, and ingestion from
   multiple sources.

## 2. System diagram

```
                  ┌──────────────────────────┐
                  │  Visitors / Search bots  │
                  └────────────┬─────────────┘
                               │  (CDN + SSR/ISR)
                  ┌────────────▼─────────────┐
                  │   Next.js 14 (Vercel)    │
                  │  - App Router            │
                  │  - React Server Comps    │
                  │  - SSG / ISR pages       │
                  │  - Route Handlers (API)  │
                  │  - Middleware (auth)     │
                  └─┬────────┬────────┬──────┘
        ┌──────────┘         │        └──────────┐
   ┌────▼────┐         ┌─────▼─────┐         ┌───▼────┐
   │Postgres │         │Meilisearch│         │ Sanity │
   │+ PostGIS│         │  (search) │         │ (blog) │
   │+ Prisma │         └───────────┘         └────────┘
   └─────────┘
   ┌─────────┐  ┌─────────┐  ┌─────────┐  ┌─────────┐  ┌─────────┐
   │  Clerk  │  │ Mapbox  │  │Cloudin- │  │ Resend  │  │ PostHog │
   │  (auth) │  │ (maps)  │  │   ary   │  │ (email) │  │(analytics)│
   └─────────┘  └─────────┘  └─────────┘  └─────────┘  └─────────┘
```

## 3. Why Next.js App Router

The site is fundamentally a content directory. We need:

- Server-rendered HTML for every community / suburb / state page (SEO).
- Static generation with periodic revalidation (ISR) — communities rarely
  change, but we want freshness.
- A small number of interactive surfaces (filters, map, forms) — these
  become Client Components, the rest stays server-side.
- Co-located API routes for forms and admin actions.

App Router gives us all of this in one project. React Server Components
mean we ship very little JavaScript to the client on content pages, which
helps Core Web Vitals.

## 4. Why Postgres (not Mongo / Firestore)

Communities have relationships everywhere: an Operator runs many
Communities; a Community has many Facilities, Images, Homes, Reviews,
Enquiries; a Community lives in a Suburb in a State. This is the textbook
case for a relational database. We also need:

- Faceted filtering ("pet-friendly + over-50s + WA + < $200/wk site fees").
- Geo queries ("communities within 20 km of this postcode") — PostGIS.
- Strong consistency for bookings/enquiries/billing later.
- Reporting and analytics SQL.

Prisma gives us typed queries, migrations, and a usable studio for ops.

## 5. Why Meilisearch (not Postgres full-text, not Algolia)

Postgres `tsvector` is fine for keyword search but weak on typo tolerance,
faceted filtering UX, and "instant" results as the user types. Algolia is
excellent but expensive ($1/1k searches) and a sunk cost once you have
millions of searches. Meilisearch is open-source, self-hostable, has
Algolia-quality typo tolerance, and a managed cloud option for the MVP.
Same client API on either side, so swap is painless.

## 6. Why Clerk (not Auth.js)

Clerk gets us further faster: prebuilt UI, MFA, social, organisations for
operator accounts, role-based metadata, MFA, webhooks to sync to Postgres.
The cost is vendor lock-in and a per-MAU price above the free tier. For
the MVP this is the right trade. If we outgrow Clerk we migrate to Auth.js
— the user model in our database is provider-agnostic (`clerkId` is just a
string).

## 7. Why Sanity for blog only

We deliberately do **not** put community data in a CMS. Community data is
structured, queried in many ways, and needs to be operated on (CSV
imports, geo joins, claim flows). That's a database job, not a CMS job.

Blog content is the opposite: free-form, edited by humans, occasionally
restructured. Sanity gives marketing a great editing experience without
us building one.

## 8. Image strategy (Cloudinary)

- Originals uploaded to Cloudinary via signed uploads from the admin.
- We store only the `publicId` in Postgres.
- Next.js `<Image>` rewrites Cloudinary URLs with the right size, format
  (AVIF/WebP), and quality on the fly.
- LCP image on community profiles uses `priority` and is preloaded.
- Lazy load below-the-fold images by default.

## 9. Search & filtering

The directory page is the most-used surface. It must feel instant.

1. The user types or toggles a filter.
2. The client sends a query to `/api/search` (debounced 150 ms).
3. The route handler queries Meilisearch with facets and returns results.
4. We sync Postgres → Meilisearch via Prisma middleware on writes and a
   nightly reconciliation job.

Why sync rather than search Postgres directly: Meilisearch returns
results + facet counts in <50 ms even on millions of records. Postgres
can do this but each new filter is more work; we'd be rebuilding a
search engine.

## 10. Maps

Mapbox GL JS, client-side. The map page loads community geo data from a
lightweight `/api/communities/geo` endpoint that returns only id, slug,
name, lat, lng. Mapbox's built-in clustering handles tens of thousands
of points smoothly. We avoid Mapbox bills on profile pages by using
static map images (`api.mapbox.com/styles/.../static`) for the small
map on each community page.

## 11. Auth and roles

Three roles in `User.role`:

| Role     | Can do                                                              |
|----------|---------------------------------------------------------------------|
| USER     | Favourite, review, enquire, save searches                           |
| OPERATOR | Manage their claimed communities, see leads, edit listing details   |
| ADMIN    | Everything, including moderation, imports, operator approvals       |

Middleware (`src/middleware.ts`) gates `/admin/*` to ADMIN and `/operator/*`
to OPERATOR or ADMIN. Server Components read `auth()` from Clerk.

## 12. SEO strategy (technical)

1. **Static generation** for all community, suburb, and state pages with
   weekly ISR revalidation.
2. **Programmatic landing pages**:
   - `/states/[state]` — e.g. `/states/nsw`
   - `/suburbs/[suburb]` — e.g. `/suburbs/mandurah-wa`
   - `/over-50s/[state]`, `/pet-friendly/[state]`, `/coastal/[state]` — combos
   - Each page is unique, has its own H1/intro, lists its communities,
     internal-links to siblings and parent state.
3. **JSON-LD** schema rendered server-side:
   - `LocalBusiness` / `Place` on community pages
   - `Review` + `AggregateRating`
   - `FAQPage` on community FAQs
   - `BreadcrumbList` everywhere
4. **Sitemaps** auto-generated and split:
   `/sitemap.xml` is an index pointing at
   `/sitemap-communities.xml`, `/sitemap-suburbs.xml`, `/sitemap-blog.xml`.
5. **Core Web Vitals**:
   - RSC keeps client JS tiny on content pages.
   - `next/image` for all images, AVIF/WebP via Cloudinary.
   - `next/font` for self-hosted fonts.
   - Avoid layout shift on the directory list (skeleton rows).
6. **Internal linking graph**: every community links to its suburb, state,
   operator, and 3 nearest communities. This compounds rapidly.

## 13. Caching

- **Edge cache (Vercel)** for SSG/ISR pages.
- **Route handler cache** with `revalidate` for read-mostly endpoints
  (e.g. `/api/communities` filtered list).
- **Meilisearch** holds its own index — effectively a search cache.
- **No client-side data cache** beyond React's built-in dedup on the
  server. We avoid SWR/React Query for content pages because RSC handles
  the caching for us; we only use it on interactive client surfaces.

## 14. Security

- All inputs validated with **Zod** at the route handler boundary.
- **Rate limiting** via Upstash Redis on `/api/enquiries`, `/api/reviews`,
  `/api/search` (per IP, per minute).
- Clerk handles password hashing, MFA, session rotation.
- **CSRF** protection on state-changing routes (Next.js fetch w/ same-origin).
- **SQL injection**: not possible — Prisma parameterises everything.
- **XSS**: React escapes by default; we never `dangerouslySetInnerHTML`
  user content. Sanitised Markdown for reviews (rehype-sanitize).
- **Image uploads**: signed uploads to Cloudinary, never trust the client.
- **Environment secrets** in Vercel/Doppler, never in the repo.
- **Honeypot fields** + Cloudflare Turnstile on public forms.
- **Soft deletes** for community/review records so we can recover.
- **Audit log** on admin mutations (planned, Phase 4).

## 15. Accessibility

- WCAG 2.2 AA target.
- Native semantic HTML before ARIA.
- All interactive elements keyboard reachable.
- Focus states visible (Tailwind `focus-visible:` utilities).
- Colour contrast ≥ 4.5:1; tested with axe.
- `prefers-reduced-motion` respected on the map and carousels.
- Form labels, error messages, and `aria-invalid` on every field.
- Large default font size (17 px body) given the older audience.
- Skip-to-content link in the header.

## 16. Observability

- **Sentry** for runtime errors (server + client).
- **PostHog** for product analytics, funnels, session replays.
- **Vercel Analytics** for Web Vitals.
- **Structured logs** via Pino on the server, shipped to Logtail.
- **Uptime** via Better Stack pings on `/`, `/communities`, `/api/health`.

## 17. AI readiness

We don't build AI features into the MVP, but we leave clean seams:

- `src/lib/ai/` is where the Anthropic client will live.
- `/api/ai/search` for natural-language search ("3-bedroom pet-friendly
  community in QLD under $200/wk").
- `/api/ai/summarise` to generate a 2-paragraph summary for each
  community (run nightly, cached on the row).
- `/api/ai/chat` for the FAQ assistant — streams from Claude.
- We store embeddings (pgvector) on Community for semantic search later.

## 18. Monetisation hooks already in the schema

- `Operator.subscriptionTier` enum (FREE/BASIC/FEATURED/PREMIUM).
- `Community.featured` boolean + `featuredUntil` date.
- `Enquiry.routedToOperatorId` + `chargedCents` for pay-per-lead billing.
- `Operator.leadCreditBalance` for prepaid models.
- Affiliate tracking on outbound clicks (`/r/[provider]?to=...`).

## 19. Data ingestion

Three pipelines, all writing to the same `Community` table:

1. **Manual admin entry** — the canonical path, used to verify everything.
2. **CSV import** — `/api/admin/import` accepts a CSV matching the
   `CommunityImport` Zod schema, dedupes by `(postcode, name)`, marks
   imported rows as `UNVERIFIED` so operators can claim them.
3. **Open-data scraping** — separate Node script (not in this repo)
   pulls from state government registers, writes to `Community` with
   `source` set to the URL and `status = UNVERIFIED`.

All three converge through the same Zod schema, so validation is uniform.

## 20. Folder structure

```
src/
├── app/
│   ├── (marketing)/             public home + landing pages
│   ├── communities/
│   │   ├── page.tsx             directory
│   │   └── [slug]/page.tsx      profile
│   ├── states/[state]/page.tsx
│   ├── suburbs/[suburb]/page.tsx
│   ├── compare/page.tsx
│   ├── map/page.tsx
│   ├── blog/[slug]/page.tsx
│   ├── account/                 user account
│   ├── operator/                operator portal (gated)
│   ├── admin/                   admin dashboard (gated)
│   ├── api/                     route handlers
│   ├── sitemap.ts
│   └── robots.ts
├── components/
│   ├── ui/                      Button, Card, Input, ... (primitives)
│   ├── layout/                  Header, Footer
│   ├── community/               domain components
│   ├── search/                  SearchBar, Filters
│   └── map/                     ClusterMap
├── lib/
│   ├── db.ts                    Prisma client (singleton)
│   ├── auth.ts                  Clerk helpers + role checks
│   ├── search.ts                Meilisearch client + indexers
│   ├── seo.ts                   metadata + JSON-LD helpers
│   ├── geo.ts                   PostGIS helpers
│   ├── validators.ts            shared Zod schemas
│   └── utils.ts
├── types/index.ts
└── middleware.ts
prisma/
├── schema.prisma
└── seed.ts
```
