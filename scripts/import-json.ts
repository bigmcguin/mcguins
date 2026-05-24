#!/usr/bin/env tsx
/**
 * JSON importer for community data with the field names from the operator
 * spreadsheet ("Park Chain (Operator)", "Village Name", "Full Address", etc.).
 *
 * Usage:
 *   pnpm db:import-json ./data/operators-communities.json              # imports as UNVERIFIED
 *   pnpm db:import-json ./data/operators-communities.json --dry-run    # parse + validate only
 *   pnpm db:import-json ./data/operators-communities.json --publish    # mark PUBLISHED
 *
 * Maps the spreadsheet schema to Prisma:
 *   - Operator: dedup by ABN if present, else by name slug
 *   - Suburb: extracted from "Full Address"; dedup by (name + state + postcode)
 *   - Community: upsert by slug (name + suburb + state)
 *
 * See data/operators-communities.sample.json for the expected shape.
 */

import { readFileSync } from 'node:fs';
import {
  PrismaClient,
  type AustralianState,
  type CommunityStatus,
  type FeeFrequency,
} from '@prisma/client';
import { slugify } from '../src/lib/utils';

const db = new PrismaClient();

// ── Source row shape ────────────────────────────────────────────────────────
type Row = {
  'Park Chain (Operator)'?: string;
  'Operator Legal Name'?: string;
  ABN?: string;
  ACN?: string;
  'Entity Type'?: string;
  'Ownership Type'?: string;
  'Brand/Sub-Brand'?: string;
  'Village Name'?: string;
  'Full Address'?: string;
  State?: string;
  'Region/Area'?: string;
  Postcode?: number | string;
  Latitude?: number | string;
  Longitude?: number | string;
  'Website URL'?: string;
  Phone?: string;
  Email?: string;
  Status?: string;
  'Number of Homes/Sites'?: number | string;
  'Year Established'?: number | string;
  'Age Policy'?: string;
  'Pet Policy'?: string;
  Security?: string;
  'Weekly Site Fees'?: string;
  'Home Price Range'?: string;
  Facilities?: string;
  'Google Rating'?: string;
  'Google Reviews Count'?: string;
};

// ── Parsing helpers ─────────────────────────────────────────────────────────

const STATE_MAP: Record<string, AustralianState> = {
  ACT: 'ACT', NSW: 'NSW', NT: 'NT', QLD: 'QLD',
  SA: 'SA', TAS: 'TAS', VIC: 'VIC', WA: 'WA',
};

function asString(v: unknown): string | undefined {
  if (v == null) return undefined;
  const s = String(v).trim();
  return s.length > 0 ? s : undefined;
}

function asInt(v: unknown): number | undefined {
  const s = asString(v);
  if (!s) return undefined;
  const cleaned = s.replace(/[^\d.-]/g, '');
  const n = Number.parseInt(cleaned, 10);
  return Number.isFinite(n) ? n : undefined;
}

function asFloat(v: unknown): number | undefined {
  const s = asString(v);
  if (!s) return undefined;
  const n = Number.parseFloat(s);
  return Number.isFinite(n) ? n : undefined;
}

function asPostcode(v: unknown): string | undefined {
  const s = asString(v);
  if (!s) return undefined;
  // Handle "2264.0" coming in as numeric → cast to int → string
  const n = Number.parseInt(s.replace(/[^\d]/g, ''), 10);
  if (!Number.isFinite(n)) return undefined;
  const p = String(n).padStart(4, '0');
  return /^\d{4}$/.test(p) ? p : undefined;
}

function asState(v: unknown): AustralianState | undefined {
  const s = asString(v)?.toUpperCase();
  if (!s) return undefined;
  // Handle multi-state strings like "QLD, NSW, VIC, SA, TAS, WA" — take the first
  const first = s.split(/[,/]/)[0]?.trim();
  return first ? STATE_MAP[first] : undefined;
}

// "12 Banksia Drive, Mandurah WA 6210" → { street, suburbName, state, postcode }
function parseAddress(full: string | undefined): {
  street?: string;
  suburbName?: string;
  state?: AustralianState;
  postcode?: string;
} {
  if (!full) return {};
  const trimmed = full.trim();
  // Greedy match: anything, comma, suburb words, state, 4-digit postcode
  const m = trimmed.match(/^(.+?),\s*(.+?)\s+(ACT|NSW|NT|QLD|SA|TAS|VIC|WA)\s+(\d{4})\s*$/i);
  if (m) {
    return {
      street: m[1].trim(),
      suburbName: m[2].trim(),
      state: STATE_MAP[m[3].toUpperCase()],
      postcode: m[4],
    };
  }
  return { street: trimmed };
}

// "Pet friendly community" → true
// "No pets" / "Not Allowed" → false
function parsePetPolicy(v: string | undefined): boolean | undefined {
  if (!v) return undefined;
  const s = v.toLowerCase();
  if (s.includes('no pet') || s === 'not allowed' || s.startsWith('not allowed')) return false;
  if (/pet|dog|cat/.test(s)) return true;
  return undefined;
}

// "Over 50s", "Over 55s", "Over-50s" → { over50sOnly: true, ageRestriction: 50/55 }
function parseAgePolicy(v: string | undefined): { over50sOnly: boolean; age?: number } {
  if (!v) return { over50sOnly: false };
  const m = v.match(/over[\s-]?(\d{2})/i);
  if (m) {
    const age = Number.parseInt(m[1], 10);
    return { over50sOnly: age >= 50, age };
  }
  if (/all ages/i.test(v)) return { over50sOnly: false };
  return { over50sOnly: false };
}

// Region/Area "Coastal", "Beach", "Bay" or pet/coastal keywords in security/region
function detectCoastal(row: Row): boolean {
  const haystack = [
    row['Region/Area'],
    row['Village Name'],
    row['Full Address'],
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();
  return /\b(beach|bay|coast|shore|harbour|harbor|seaside|cove|inlet|lake|river)\b/.test(haystack);
}

const FREQ_MAP: Record<string, FeeFrequency> = {
  week: 'WEEKLY',
  weekly: 'WEEKLY',
  pw: 'WEEKLY',
  fortnight: 'FORTNIGHTLY',
  fortnightly: 'FORTNIGHTLY',
  pf: 'FORTNIGHTLY',
  fn: 'FORTNIGHTLY',
  month: 'MONTHLY',
  monthly: 'MONTHLY',
  pm: 'MONTHLY',
  year: 'ANNUALLY',
  annual: 'ANNUALLY',
  annually: 'ANNUALLY',
  pa: 'ANNUALLY',
};

// "$190 - $220 per week" → min: 19000, max: 22000, freq: WEEKLY (cents)
// "$365 per fortnight" → min: 36500, max: 36500, freq: FORTNIGHTLY
// "$227.72 - $263.09 per week" → cents
function parseFees(v: string | undefined): {
  min?: number;
  max?: number;
  freq?: FeeFrequency;
} {
  if (!v) return {};
  const text = v.toLowerCase();

  // Find frequency token
  let freq: FeeFrequency | undefined;
  for (const [token, value] of Object.entries(FREQ_MAP)) {
    if (text.includes(token)) {
      freq = value;
      break;
    }
  }

  // Extract dollar numbers
  const dollarMatches = [...v.matchAll(/\$?\s*(\d[\d,]*\.?\d*)/g)]
    .map((m) => Number.parseFloat(m[1].replace(/,/g, '')))
    .filter((n) => Number.isFinite(n) && n > 0);

  if (dollarMatches.length === 0) return { freq };

  // Convert dollars to cents
  const cents = dollarMatches.map((d) => Math.round(d * 100));
  const min = Math.min(...cents);
  const max = Math.max(...cents);
  return { min, max, freq };
}

function parseStatus(v: string | undefined, publishMode: boolean): CommunityStatus {
  if (publishMode) return 'PUBLISHED';
  const s = (v ?? '').toLowerCase();
  if (s.includes('established')) return 'PUBLISHED';
  if (s.includes('development') || s.includes('greenfield')) return 'UNVERIFIED';
  return 'UNVERIFIED';
}

function operatorTierFromOwnership(ownership: string | undefined) {
  if (!ownership) return 'FREE' as const;
  if (/asx[-\s]?listed/i.test(ownership)) return 'PREMIUM' as const;
  if (/fund[-\s]?backed/i.test(ownership)) return 'FEATURED' as const;
  return 'BASIC' as const;
}

// ── Import ──────────────────────────────────────────────────────────────────

async function importRow(row: Row, status: CommunityStatus, batchId: string) {
  const name = asString(row['Village Name']);
  if (!name) return { skipped: true, reason: 'missing Village Name' };

  // Operator
  const operatorName = asString(row['Park Chain (Operator)']);
  let operatorId: string | undefined;
  if (operatorName) {
    const abn = asString(row.ABN)?.replace(/\s+/g, '');
    const operatorSlug = slugify(operatorName);
    const op = await db.operator.upsert({
      where: { slug: operatorSlug },
      update: {
        // Only fill blanks; don't overwrite curated data on re-import
        legalName: asString(row['Operator Legal Name']) ?? undefined,
        abn: abn ?? undefined,
      },
      create: {
        slug: operatorSlug,
        name: operatorName,
        legalName: asString(row['Operator Legal Name']),
        abn: abn,
        subscriptionTier: operatorTierFromOwnership(asString(row['Ownership Type'])),
        verified: /asx[-\s]?listed/i.test(asString(row['Ownership Type']) ?? ''),
      },
    });
    operatorId = op.id;
  }

  // Address parsing
  const parsedAddr = parseAddress(asString(row['Full Address']));
  const state =
    parsedAddr.state ??
    asState(row.State);
  const postcode =
    parsedAddr.postcode ??
    asPostcode(row.Postcode);
  const suburbName =
    parsedAddr.suburbName ??
    asString(row['Region/Area']);
  const addressLine1 = parsedAddr.street ?? asString(row['Full Address']);

  if (!state || !postcode || !suburbName || !addressLine1) {
    return {
      skipped: true,
      reason: `incomplete address (state=${state ?? '∅'} postcode=${postcode ?? '∅'} suburb=${suburbName ?? '∅'} street=${addressLine1 ?? '∅'})`,
    };
  }

  // Suburb
  const suburbSlug = slugify(`${suburbName} ${state}`);
  const suburb = await db.suburb.upsert({
    where: { slug: suburbSlug },
    update: {},
    create: { slug: suburbSlug, name: suburbName, state, postcode },
  });

  // Community
  const slug = slugify(`${name} ${suburbName} ${state}`);
  const fees = parseFees(asString(row['Weekly Site Fees']));
  const age = parseAgePolicy(asString(row['Age Policy']));
  const petFriendly = parsePetPolicy(asString(row['Pet Policy']));

  // Construct description from brand + facilities + home prices
  const descParts = [
    asString(row['Brand/Sub-Brand']) ? `Part of the ${row['Brand/Sub-Brand']} portfolio.` : null,
    asString(row['Facilities']) ? `Facilities: ${row['Facilities']}.` : null,
    asString(row['Home Price Range']) ? `Home prices: ${row['Home Price Range']}.` : null,
    asString(row['Security']) ? `Security: ${row['Security']}.` : null,
    asString(row['Pet Policy']) ? `Pets: ${row['Pet Policy']}.` : null,
  ].filter(Boolean);

  const shortDesc =
    asString(row['Brand/Sub-Brand']) && asString(row['Region/Area'])
      ? `A ${row['Brand/Sub-Brand']} community in ${row['Region/Area']}.`
      : undefined;

  await db.community.upsert({
    where: { slug },
    update: {
      name,
      addressLine1,
      suburbId: suburb.id,
      state,
      postcode,
      latitude: asFloat(row.Latitude),
      longitude: asFloat(row.Longitude),
      websiteUrl: asString(row['Website URL']),
      phone: asString(row.Phone),
      emailEnquiries: asString(row.Email),
      petFriendly: petFriendly ?? false,
      over50sOnly: age.over50sOnly,
      coastal: detectCoastal(row),
      ageRestriction: age.age,
      siteFeesMin: fees.min,
      siteFeesMax: fees.max,
      feeFrequency: fees.freq,
      totalHomes: asInt(row['Number of Homes/Sites']),
      yearEstablished: asInt(row['Year Established']),
      shortDescription: shortDesc,
      description: descParts.join('\n\n') || undefined,
      operatorId,
      importBatchId: batchId,
    },
    create: {
      slug,
      name,
      kind: 'LAND_LEASE',
      status,
      addressLine1,
      suburbId: suburb.id,
      state,
      postcode,
      latitude: asFloat(row.Latitude),
      longitude: asFloat(row.Longitude),
      websiteUrl: asString(row['Website URL']),
      phone: asString(row.Phone),
      emailEnquiries: asString(row.Email),
      petFriendly: petFriendly ?? false,
      over50sOnly: age.over50sOnly,
      coastal: detectCoastal(row),
      ageRestriction: age.age,
      siteFeesMin: fees.min,
      siteFeesMax: fees.max,
      feeFrequency: fees.freq,
      totalHomes: asInt(row['Number of Homes/Sites']),
      yearEstablished: asInt(row['Year Established']),
      shortDescription: shortDesc,
      description: descParts.join('\n\n') || undefined,
      operatorId,
      importBatchId: batchId,
      source: 'json-import',
    },
  });

  return { skipped: false };
}

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
  const rows: Row[] = JSON.parse(text);
  if (!Array.isArray(rows)) {
    console.error('JSON root must be an array of community objects.');
    process.exit(1);
  }

  console.log(`\nFile: ${path}`);
  console.log(`Rows: ${rows.length}`);
  console.log(`Mode: ${dryRun ? 'DRY RUN' : publish ? 'WRITE as PUBLISHED' : 'WRITE as UNVERIFIED'}\n`);

  const batchId = `json-import-${new Date().toISOString()}`;
  let imported = 0;
  let skipped = 0;
  const skipReasons: { row: number; name?: string; reason: string }[] = [];

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    if (dryRun) {
      // Just validate
      const parsed = parseAddress(row['Full Address']);
      const state = parsed.state ?? asState(row.State);
      const postcode = parsed.postcode ?? asPostcode(row.Postcode);
      const suburb = parsed.suburbName ?? asString(row['Region/Area']);
      if (!row['Village Name'] || !state || !postcode || !suburb) {
        skipped++;
        skipReasons.push({
          row: i + 1,
          name: row['Village Name'],
          reason: `incomplete (state=${state ?? '∅'} postcode=${postcode ?? '∅'} suburb=${suburb ?? '∅'})`,
        });
      } else {
        imported++;
      }
      continue;
    }

    try {
      const result = await importRow(row, parseStatus(row.Status, publish), batchId);
      if (result.skipped) {
        skipped++;
        skipReasons.push({ row: i + 1, name: row['Village Name'], reason: result.reason ?? 'unknown' });
      } else {
        imported++;
      }
    } catch (err) {
      skipped++;
      skipReasons.push({ row: i + 1, name: row['Village Name'], reason: String(err) });
    }
  }

  console.log(`✓ ${imported} ${dryRun ? 'would be imported' : 'imported'}`);
  if (skipped > 0) {
    console.log(`✗ ${skipped} skipped:`);
    for (const e of skipReasons.slice(0, 30)) {
      console.log(`  row ${e.row} (${e.name ?? '—'}): ${e.reason}`);
    }
    if (skipReasons.length > 30) console.log(`  ...and ${skipReasons.length - 30} more.`);
  }
  if (!dryRun && imported > 0) {
    console.log(`\nBatch ID: ${batchId}`);
    if (!publish) {
      console.log('Imported as UNVERIFIED. Use Prisma Studio (pnpm db:studio) to review, then flip to PUBLISHED.');
    }
  }
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
