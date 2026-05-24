// Shared import logic — consumed by both scripts/import-json.ts (CLI) and
// /api/admin/import-json (web upload). Keeps parsing rules in one place.

import {
  type AustralianState,
  type CommunityStatus,
  type FeeFrequency,
  type PrismaClient,
} from '@prisma/client';
import { slugify } from './utils';

// ── Source row shape ────────────────────────────────────────────────────────
export type OperatorRow = {
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

export function asString(v: unknown): string | undefined {
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
  const n = Number.parseInt(s.replace(/[^\d]/g, ''), 10);
  if (!Number.isFinite(n)) return undefined;
  const p = String(n).padStart(4, '0');
  return /^\d{4}$/.test(p) ? p : undefined;
}

function asState(v: unknown): AustralianState | undefined {
  const s = asString(v)?.toUpperCase();
  if (!s) return undefined;
  const first = s.split(/[,/]/)[0]?.trim();
  return first ? STATE_MAP[first] : undefined;
}

function parseAddress(full: string | undefined): {
  street?: string;
  suburbName?: string;
  state?: AustralianState;
  postcode?: string;
} {
  if (!full) return {};
  const trimmed = full.trim();
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

function parsePetPolicy(v: string | undefined): boolean | undefined {
  if (!v) return undefined;
  const s = v.toLowerCase();
  if (s.includes('no pet') || s === 'not allowed' || s.startsWith('not allowed')) return false;
  if (/pet|dog|cat/.test(s)) return true;
  return undefined;
}

function parseAgePolicy(v: string | undefined): { over50sOnly: boolean; age?: number } {
  if (!v) return { over50sOnly: false };
  const m = v.match(/over[\s-]?(\d{2})/i);
  if (m) {
    const age = Number.parseInt(m[1], 10);
    return { over50sOnly: age >= 50, age };
  }
  return { over50sOnly: false };
}

function detectCoastal(row: OperatorRow): boolean {
  const haystack = [row['Region/Area'], row['Village Name'], row['Full Address']]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();
  return /\b(beach|bay|coast|shore|harbour|harbor|seaside|cove|inlet|lake|river)\b/.test(haystack);
}

const FREQ_MAP: Record<string, FeeFrequency> = {
  week: 'WEEKLY', weekly: 'WEEKLY', pw: 'WEEKLY',
  fortnight: 'FORTNIGHTLY', fortnightly: 'FORTNIGHTLY', pf: 'FORTNIGHTLY', fn: 'FORTNIGHTLY',
  month: 'MONTHLY', monthly: 'MONTHLY', pm: 'MONTHLY',
  year: 'ANNUALLY', annual: 'ANNUALLY', annually: 'ANNUALLY', pa: 'ANNUALLY',
};

function parseFees(v: string | undefined): {
  min?: number;
  max?: number;
  freq?: FeeFrequency;
} {
  if (!v) return {};
  const text = v.toLowerCase();
  let freq: FeeFrequency | undefined;
  for (const [token, value] of Object.entries(FREQ_MAP)) {
    if (text.includes(token)) {
      freq = value;
      break;
    }
  }
  const dollarMatches = [...v.matchAll(/\$?\s*(\d[\d,]*\.?\d*)/g)]
    .map((m) => Number.parseFloat(m[1].replace(/,/g, '')))
    .filter((n) => Number.isFinite(n) && n > 0);
  if (dollarMatches.length === 0) return { freq };
  const cents = dollarMatches.map((d) => Math.round(d * 100));
  return { min: Math.min(...cents), max: Math.max(...cents), freq };
}

function statusFor(v: string | undefined, publishMode: boolean): CommunityStatus {
  if (publishMode) return 'PUBLISHED';
  const s = (v ?? '').toLowerCase();
  if (s.includes('established')) return 'PUBLISHED';
  return 'UNVERIFIED';
}

function operatorTierFromOwnership(ownership: string | undefined) {
  if (!ownership) return 'FREE' as const;
  if (/asx[-\s]?listed/i.test(ownership)) return 'PREMIUM' as const;
  if (/fund[-\s]?backed/i.test(ownership)) return 'FEATURED' as const;
  return 'BASIC' as const;
}

// ── Public API ──────────────────────────────────────────────────────────────

export type ImportOptions = {
  dryRun?: boolean;
  publish?: boolean;
  batchId?: string;
};

export type ImportSummary = {
  total: number;
  imported: number;
  skipped: number;
  errors: { row: number; name?: string; reason: string }[];
  batchId: string;
};

export async function importCommunities(
  db: PrismaClient,
  rows: OperatorRow[],
  opts: ImportOptions = {},
): Promise<ImportSummary> {
  const dryRun = opts.dryRun ?? false;
  const publish = opts.publish ?? false;
  const batchId = opts.batchId ?? `import-${new Date().toISOString()}`;
  const errors: ImportSummary['errors'] = [];
  let imported = 0;
  let skipped = 0;

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const rowNum = i + 1;
    try {
      const result = await importRow(db, row, statusFor(row.Status, publish), batchId, dryRun);
      if (result.skipped) {
        skipped++;
        errors.push({ row: rowNum, name: row['Village Name'], reason: result.reason ?? 'unknown' });
      } else {
        imported++;
      }
    } catch (err) {
      skipped++;
      errors.push({
        row: rowNum,
        name: row['Village Name'],
        reason: err instanceof Error ? err.message : String(err),
      });
    }
  }

  return { total: rows.length, imported, skipped, errors, batchId };
}

async function importRow(
  db: PrismaClient,
  row: OperatorRow,
  status: CommunityStatus,
  batchId: string,
  dryRun: boolean,
): Promise<{ skipped: boolean; reason?: string }> {
  const name = asString(row['Village Name']);
  if (!name) return { skipped: true, reason: 'missing Village Name' };

  const parsedAddr = parseAddress(asString(row['Full Address']));
  const state = parsedAddr.state ?? asState(row.State);
  const postcode = parsedAddr.postcode ?? asPostcode(row.Postcode);
  const suburbName = parsedAddr.suburbName ?? asString(row['Region/Area']);
  const addressLine1 = parsedAddr.street ?? asString(row['Full Address']);

  if (!state || !postcode || !suburbName || !addressLine1) {
    return {
      skipped: true,
      reason: `incomplete address (state=${state ?? '∅'} postcode=${postcode ?? '∅'} suburb=${suburbName ?? '∅'} street=${addressLine1 ?? '∅'})`,
    };
  }

  if (dryRun) return { skipped: false };

  // Operator
  let operatorId: string | undefined;
  const operatorName = asString(row['Park Chain (Operator)']);
  if (operatorName) {
    const operatorSlug = slugify(operatorName);
    const op = await db.operator.upsert({
      where: { slug: operatorSlug },
      update: {
        legalName: asString(row['Operator Legal Name']) ?? undefined,
        abn: asString(row.ABN)?.replace(/\s+/g, '') ?? undefined,
      },
      create: {
        slug: operatorSlug,
        name: operatorName,
        legalName: asString(row['Operator Legal Name']),
        abn: asString(row.ABN)?.replace(/\s+/g, ''),
        subscriptionTier: operatorTierFromOwnership(asString(row['Ownership Type'])),
        verified: /asx[-\s]?listed/i.test(asString(row['Ownership Type']) ?? ''),
      },
    });
    operatorId = op.id;
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

  const data = {
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
  };

  await db.community.upsert({
    where: { slug },
    update: data,
    create: {
      slug,
      kind: 'LAND_LEASE',
      status,
      source: 'json-import',
      ...data,
    },
  });

  return { skipped: false };
}
