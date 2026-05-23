#!/usr/bin/env tsx
/**
 * CSV importer for community data.
 *
 * Usage:
 *   pnpm db:import ./communities.csv              # imports to DB
 *   pnpm db:import ./communities.csv --dry-run    # parse + validate only, no writes
 *   pnpm db:import ./communities.csv --publish    # mark imported rows PUBLISHED (default: UNVERIFIED)
 *
 * See docs/CSV_FORMAT.md for the expected column reference.
 */

import { readFileSync } from 'node:fs';
import { parse } from 'csv-parse/sync';
import { PrismaClient, type AustralianState, type CommunityStatus, type FeeFrequency } from '@prisma/client';
import { slugify } from '../src/lib/utils';

const db = new PrismaClient();

// ── Header aliases ──────────────────────────────────────────────────────────
// Map a wide range of likely header names to canonical fields. Comparison is
// case-insensitive, ignores whitespace, underscores and hyphens.
const FIELD_ALIASES: Record<string, string[]> = {
  name: ['name', 'community name', 'community', 'park name', 'village name'],
  addressLine1: ['address', 'street address', 'address line 1', 'addressline1', 'street'],
  addressLine2: ['address line 2', 'addressline2'],
  suburbName: ['suburb', 'town', 'locality', 'city'],
  state: ['state', 'state code'],
  postcode: ['postcode', 'post code', 'zip', 'zipcode'],
  latitude: ['lat', 'latitude'],
  longitude: ['lng', 'lon', 'long', 'longitude'],
  shortDescription: ['short description', 'tagline', 'summary'],
  description: ['description', 'about', 'overview', 'long description'],
  websiteUrl: ['website', 'url', 'web', 'website url'],
  phone: ['phone', 'telephone', 'contact phone'],
  emailEnquiries: ['email', 'enquiry email', 'contact email'],
  petFriendly: ['pet friendly', 'pets', 'pets allowed', 'petfriendly'],
  over50sOnly: ['over 50s', 'over 50s only', 'age restricted', 'over50s', 'seniors only'],
  coastal: ['coastal', 'coastal location', 'near beach'],
  ageRestriction: ['age restriction', 'minimum age', 'min age'],
  siteFeesMin: ['site fees', 'site fees min', 'fees min', 'fee min', 'min site fees', 'site fee'],
  siteFeesMax: ['site fees max', 'fees max', 'fee max', 'max site fees'],
  feeFrequency: ['fee frequency', 'fees frequency', 'fee period', 'site fees frequency'],
  totalHomes: ['total homes', 'homes', 'sites', 'total sites', 'number of homes'],
  yearEstablished: ['year established', 'established', 'year', 'opened'],
  kind: ['kind', 'type', 'community type', 'category'],
  operatorName: ['operator', 'operator name', 'company', 'owner'],
  operatorWebsite: ['operator website', 'operator url'],
};

function normalise(header: string): string {
  return header.toLowerCase().replace(/[\s_-]+/g, ' ').trim();
}

function buildHeaderMap(headers: string[]): Map<string, number> {
  const result = new Map<string, number>();
  const normalised = headers.map(normalise);
  for (const [field, aliases] of Object.entries(FIELD_ALIASES)) {
    for (const alias of aliases) {
      const idx = normalised.indexOf(normalise(alias));
      if (idx !== -1) {
        if (!result.has(field)) result.set(field, idx);
        break;
      }
    }
  }
  return result;
}

// ── Value parsers ───────────────────────────────────────────────────────────

function asString(v: unknown): string | undefined {
  const s = String(v ?? '').trim();
  return s.length > 0 ? s : undefined;
}

function asBoolean(v: unknown): boolean | undefined {
  const s = asString(v)?.toLowerCase();
  if (!s) return undefined;
  if (['yes', 'y', 'true', '1', 'x', 'checked'].includes(s)) return true;
  if (['no', 'n', 'false', '0', ''].includes(s)) return false;
  return undefined;
}

function asInt(v: unknown): number | undefined {
  const s = asString(v);
  if (!s) return undefined;
  const cleaned = s.replace(/[^\d.-]/g, '');
  if (!cleaned) return undefined;
  const n = Number.parseInt(cleaned, 10);
  return Number.isFinite(n) ? n : undefined;
}

function asFloat(v: unknown): number | undefined {
  const s = asString(v);
  if (!s) return undefined;
  const n = Number.parseFloat(s);
  return Number.isFinite(n) ? n : undefined;
}

// Returns cents (integer)
function asMoneyCents(v: unknown): number | undefined {
  const s = asString(v);
  if (!s) return undefined;
  const cleaned = s.replace(/[^\d.]/g, '');
  if (!cleaned) return undefined;
  const dollars = Number.parseFloat(cleaned);
  return Number.isFinite(dollars) ? Math.round(dollars * 100) : undefined;
}

const STATE_MAP: Record<string, AustralianState> = {
  ACT: 'ACT', 'AUSTRALIAN CAPITAL TERRITORY': 'ACT',
  NSW: 'NSW', 'NEW SOUTH WALES': 'NSW',
  NT: 'NT', 'NORTHERN TERRITORY': 'NT',
  QLD: 'QLD', QUEENSLAND: 'QLD',
  SA: 'SA', 'SOUTH AUSTRALIA': 'SA',
  TAS: 'TAS', TASMANIA: 'TAS',
  VIC: 'VIC', VICTORIA: 'VIC',
  WA: 'WA', 'WESTERN AUSTRALIA': 'WA',
};

function asState(v: unknown): AustralianState | undefined {
  const s = asString(v)?.toUpperCase();
  return s ? STATE_MAP[s] : undefined;
}

const FREQ_MAP: Record<string, FeeFrequency> = {
  WEEKLY: 'WEEKLY', WEEK: 'WEEKLY', PW: 'WEEKLY', 'P/W': 'WEEKLY', '/WEEK': 'WEEKLY',
  FORTNIGHTLY: 'FORTNIGHTLY', FORTNIGHT: 'FORTNIGHTLY', PF: 'FORTNIGHTLY',
  MONTHLY: 'MONTHLY', MONTH: 'MONTHLY', PM: 'MONTHLY', 'P/M': 'MONTHLY',
  ANNUALLY: 'ANNUALLY', ANNUAL: 'ANNUALLY', YEARLY: 'ANNUALLY', YEAR: 'ANNUALLY', PA: 'ANNUALLY',
};

function asFeeFrequency(v: unknown): FeeFrequency | undefined {
  const s = asString(v)?.toUpperCase().replace(/[\s.]/g, '');
  return s ? FREQ_MAP[s] : undefined;
}

const KIND_MAP: Record<string, string> = {
  'LAND LEASE': 'LAND_LEASE',
  LANDLEASE: 'LAND_LEASE',
  'LIFESTYLE VILLAGE': 'LIFESTYLE_VILLAGE',
  LIFESTYLE: 'LIFESTYLE_VILLAGE',
  'OVER 50S': 'OVER_50S',
  OVER50S: 'OVER_50S',
  'MANUFACTURED HOME': 'MANUFACTURED_HOME',
  MANUFACTURED: 'MANUFACTURED_HOME',
  CARAVAN: 'CARAVAN_LIFESTYLE_PARK',
  'CARAVAN PARK': 'CARAVAN_LIFESTYLE_PARK',
  'LIFESTYLE PARK': 'CARAVAN_LIFESTYLE_PARK',
  RETIREMENT: 'RETIREMENT_VILLAGE',
  'RETIREMENT VILLAGE': 'RETIREMENT_VILLAGE',
};

function asKind(v: unknown) {
  const s = asString(v)?.toUpperCase().replace(/[\s_-]+/g, ' ').trim();
  if (!s) return undefined;
  return KIND_MAP[s] as
    | 'LAND_LEASE'
    | 'LIFESTYLE_VILLAGE'
    | 'OVER_50S'
    | 'MANUFACTURED_HOME'
    | 'CARAVAN_LIFESTYLE_PARK'
    | 'RETIREMENT_VILLAGE'
    | undefined;
}

// ── Import ──────────────────────────────────────────────────────────────────

type ImportRow = {
  rowNumber: number;
  name?: string;
  addressLine1?: string;
  addressLine2?: string;
  suburbName?: string;
  state?: AustralianState;
  postcode?: string;
  latitude?: number;
  longitude?: number;
  shortDescription?: string;
  description?: string;
  websiteUrl?: string;
  phone?: string;
  emailEnquiries?: string;
  petFriendly?: boolean;
  over50sOnly?: boolean;
  coastal?: boolean;
  ageRestriction?: number;
  siteFeesMin?: number;
  siteFeesMax?: number;
  feeFrequency?: FeeFrequency;
  totalHomes?: number;
  yearEstablished?: number;
  kind?: ReturnType<typeof asKind>;
  operatorName?: string;
  operatorWebsite?: string;
};

function parseRow(row: string[], headerMap: Map<string, number>, rowNumber: number): ImportRow {
  const v = (field: string) => {
    const idx = headerMap.get(field);
    return idx === undefined ? undefined : row[idx];
  };
  return {
    rowNumber,
    name: asString(v('name')),
    addressLine1: asString(v('addressLine1')),
    addressLine2: asString(v('addressLine2')),
    suburbName: asString(v('suburbName')),
    state: asState(v('state')),
    postcode: asString(v('postcode')),
    latitude: asFloat(v('latitude')),
    longitude: asFloat(v('longitude')),
    shortDescription: asString(v('shortDescription')),
    description: asString(v('description')),
    websiteUrl: asString(v('websiteUrl')),
    phone: asString(v('phone')),
    emailEnquiries: asString(v('emailEnquiries')),
    petFriendly: asBoolean(v('petFriendly')),
    over50sOnly: asBoolean(v('over50sOnly')),
    coastal: asBoolean(v('coastal')),
    ageRestriction: asInt(v('ageRestriction')),
    siteFeesMin: asMoneyCents(v('siteFeesMin')),
    siteFeesMax: asMoneyCents(v('siteFeesMax')),
    feeFrequency: asFeeFrequency(v('feeFrequency')),
    totalHomes: asInt(v('totalHomes')),
    yearEstablished: asInt(v('yearEstablished')),
    kind: asKind(v('kind')),
    operatorName: asString(v('operatorName')),
    operatorWebsite: asString(v('operatorWebsite')),
  };
}

function validateRow(r: ImportRow): string[] {
  const errors: string[] = [];
  if (!r.name) errors.push('missing name');
  if (!r.addressLine1) errors.push('missing address');
  if (!r.suburbName) errors.push('missing suburb');
  if (!r.state) errors.push('missing or invalid state');
  if (!r.postcode || !/^\d{4}$/.test(r.postcode)) errors.push('invalid postcode (must be 4 digits)');
  if (r.siteFeesMin != null && r.siteFeesMax != null && r.siteFeesMin > r.siteFeesMax) {
    errors.push('siteFeesMin > siteFeesMax');
  }
  return errors;
}

async function importRow(r: ImportRow, status: CommunityStatus, batchId: string) {
  // Suburb
  const suburbSlug = slugify(`${r.suburbName} ${r.state}`.toLowerCase());
  const suburb = await db.suburb.upsert({
    where: { slug: suburbSlug },
    update: {},
    create: {
      slug: suburbSlug,
      name: r.suburbName!,
      state: r.state!,
      postcode: r.postcode!,
    },
  });

  // Operator (optional)
  let operatorId: string | undefined;
  if (r.operatorName) {
    const operator = await db.operator.upsert({
      where: { slug: slugify(r.operatorName) },
      update: {},
      create: {
        slug: slugify(r.operatorName),
        name: r.operatorName,
        website: r.operatorWebsite,
      },
    });
    operatorId = operator.id;
  }

  // Community — upsert by slug
  const slug = slugify(`${r.name} ${r.suburbName} ${r.state}`);
  await db.community.upsert({
    where: { slug },
    update: {
      // Only overwrite obvious metadata; preserve operator-curated content if claimed.
      name: r.name!,
      addressLine1: r.addressLine1!,
      addressLine2: r.addressLine2,
      suburbId: suburb.id,
      state: r.state!,
      postcode: r.postcode!,
      latitude: r.latitude,
      longitude: r.longitude,
      shortDescription: r.shortDescription,
      description: r.description,
      websiteUrl: r.websiteUrl,
      phone: r.phone,
      emailEnquiries: r.emailEnquiries,
      petFriendly: r.petFriendly ?? false,
      over50sOnly: r.over50sOnly ?? false,
      coastal: r.coastal ?? false,
      ageRestriction: r.ageRestriction,
      siteFeesMin: r.siteFeesMin,
      siteFeesMax: r.siteFeesMax,
      feeFrequency: r.feeFrequency,
      totalHomes: r.totalHomes,
      yearEstablished: r.yearEstablished,
      kind: r.kind ?? 'LAND_LEASE',
      operatorId,
      importBatchId: batchId,
    },
    create: {
      slug,
      name: r.name!,
      kind: r.kind ?? 'LAND_LEASE',
      status,
      addressLine1: r.addressLine1!,
      addressLine2: r.addressLine2,
      suburbId: suburb.id,
      state: r.state!,
      postcode: r.postcode!,
      latitude: r.latitude,
      longitude: r.longitude,
      shortDescription: r.shortDescription,
      description: r.description,
      websiteUrl: r.websiteUrl,
      phone: r.phone,
      emailEnquiries: r.emailEnquiries,
      petFriendly: r.petFriendly ?? false,
      over50sOnly: r.over50sOnly ?? false,
      coastal: r.coastal ?? false,
      ageRestriction: r.ageRestriction,
      siteFeesMin: r.siteFeesMin,
      siteFeesMax: r.siteFeesMax,
      feeFrequency: r.feeFrequency,
      totalHomes: r.totalHomes,
      yearEstablished: r.yearEstablished,
      operatorId,
      importBatchId: batchId,
      source: 'csv-import',
    },
  });
}

async function main() {
  const args = process.argv.slice(2);
  const path = args.find((a) => !a.startsWith('--'));
  const dryRun = args.includes('--dry-run');
  const publish = args.includes('--publish');
  const status: CommunityStatus = publish ? 'PUBLISHED' : 'UNVERIFIED';

  if (!path) {
    console.error('Usage: pnpm db:import <path-to-csv> [--dry-run] [--publish]');
    process.exit(1);
  }

  const fileText = readFileSync(path, 'utf8');
  const rows: string[][] = parse(fileText, {
    skip_empty_lines: true,
    trim: true,
    bom: true,
    relax_column_count: true,
  });
  if (rows.length === 0) {
    console.error('No rows found in CSV.');
    process.exit(1);
  }

  const [headers, ...dataRows] = rows;
  const headerMap = buildHeaderMap(headers);

  const recognised = Array.from(headerMap.keys());
  const unrecognised = headers
    .map(normalise)
    .filter(
      (h) =>
        !Object.values(FIELD_ALIASES)
          .flat()
          .map(normalise)
          .includes(h),
    );

  console.log(`\nCSV: ${path}`);
  console.log(`Rows: ${dataRows.length}`);
  console.log(`Recognised columns (${recognised.length}): ${recognised.join(', ')}`);
  if (unrecognised.length) {
    console.log(`Ignored columns: ${unrecognised.join(', ')}`);
  }
  const missingRequired = ['name', 'addressLine1', 'suburbName', 'state', 'postcode'].filter(
    (f) => !headerMap.has(f),
  );
  if (missingRequired.length) {
    console.error(`\nMissing required columns: ${missingRequired.join(', ')}`);
    console.error('See docs/CSV_FORMAT.md for accepted header names.');
    process.exit(1);
  }
  console.log(`Mode: ${dryRun ? 'DRY RUN (no writes)' : `WRITE as ${status}`}\n`);

  const batchId = `import-${new Date().toISOString()}`;
  const errors: { row: number; problems: string[] }[] = [];
  let imported = 0;

  for (let i = 0; i < dataRows.length; i++) {
    const rowNum = i + 2; // +1 for header, +1 for 1-indexed
    const parsed = parseRow(dataRows[i], headerMap, rowNum);
    const problems = validateRow(parsed);
    if (problems.length > 0) {
      errors.push({ row: rowNum, problems });
      continue;
    }
    if (!dryRun) {
      try {
        await importRow(parsed, status, batchId);
      } catch (err) {
        errors.push({ row: rowNum, problems: [String(err)] });
        continue;
      }
    }
    imported++;
  }

  console.log(`\n✓ ${imported} rows ${dryRun ? 'would be imported' : 'imported'}.`);
  if (errors.length > 0) {
    console.log(`✗ ${errors.length} rows had errors:`);
    for (const e of errors.slice(0, 20)) {
      console.log(`  row ${e.row}: ${e.problems.join('; ')}`);
    }
    if (errors.length > 20) console.log(`  ...and ${errors.length - 20} more.`);
  }
  if (!dryRun && imported > 0) {
    console.log(`\nImport batch ID: ${batchId}`);
    if (!publish) {
      console.log(`Communities imported as UNVERIFIED. To publish:`);
      console.log(`  open Prisma Studio (pnpm db:studio) and change status, or`);
      console.log(`  re-run with --publish to mark all PUBLISHED.`);
    }
  }
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
