// Per-operator source configurations and HTML parsers.
//
// Each source describes a listings page (typically the operator's "communities"
// index) and a parser that converts the page HTML into rows shaped for
// importCommunities() in src/lib/import.ts.
//
// Design notes:
//   - Parsers are deliberately conservative on v1. They try JSON-LD first (most
//     reliable when present) and fall back to simple link extraction. Once we
//     see the actual HTML returned by ScrapingBee, we refine selectors here.
//   - Parsers run dependency-free (regex + JSON.parse). If a site needs richer
//     parsing later we'll add `cheerio` and revisit.
//   - Every parser must return an array. Empty array is allowed and surfaces
//     in the cron summary so we can spot "no rows extracted" failures.

import type { OperatorRow } from '@/lib/import';

export type Source = {
  id: string;
  operatorName: string;
  indexUrl: string;
  parse: (html: string) => OperatorRow[];
};

// ── Helpers ────────────────────────────────────────────────────────────────

// Extract every <script type="application/ld+json">...</script> block and
// JSON.parse it. Bad blocks are silently skipped. Returns a flat array of
// parsed values (single objects, arrays, or @graph members).
export function extractJsonLd(html: string): unknown[] {
  const out: unknown[] = [];
  const re = /<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
  let match: RegExpExecArray | null;
  while ((match = re.exec(html)) !== null) {
    const raw = match[1].trim();
    try {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) out.push(...parsed);
      else if (parsed && typeof parsed === 'object' && '@graph' in parsed && Array.isArray((parsed as { '@graph': unknown[] })['@graph'])) {
        out.push(...(parsed as { '@graph': unknown[] })['@graph']);
      } else {
        out.push(parsed);
      }
    } catch {
      // Some sites embed templated JSON-LD with handlebars / unescaped quotes.
      // Skip rather than fail the whole parse.
    }
  }
  return out;
}

// Pull anchor hrefs whose pathname matches a regex. Deduplicates and resolves
// against the source's origin. Useful when JSON-LD isn't present and we just
// want a list of community pages from the index.
export function extractHrefs(html: string, origin: string, pathRegex: RegExp): string[] {
  const seen = new Set<string>();
  const re = /<a\b[^>]*href=["']([^"']+)["']/gi;
  let match: RegExpExecArray | null;
  while ((match = re.exec(html)) !== null) {
    const href = match[1];
    let absolute: string;
    try {
      absolute = new URL(href, origin).toString();
    } catch {
      continue;
    }
    let pathname: string;
    try {
      pathname = new URL(absolute).pathname;
    } catch {
      continue;
    }
    if (pathRegex.test(pathname)) seen.add(absolute);
  }
  return [...seen];
}

// Look up a JSON-LD entity by @type. Useful when sites list each community
// as a separate Place / LocalBusiness object in their index page schema.
export function jsonLdOfType(blocks: unknown[], type: string): Record<string, unknown>[] {
  return blocks
    .filter((b): b is Record<string, unknown> => !!b && typeof b === 'object')
    .filter((b) => {
      const t = (b as { '@type'?: unknown })['@type'];
      if (typeof t === 'string') return t === type;
      if (Array.isArray(t)) return t.includes(type);
      return false;
    });
}

function str(v: unknown): string | undefined {
  if (v == null) return undefined;
  if (typeof v === 'string') return v.trim() || undefined;
  if (typeof v === 'number') return String(v);
  return undefined;
}

// Convert a JSON-LD Place / LocalBusiness block into our OperatorRow shape.
// Conservative: only fills fields we can be confident about from schema.org.
function placeToRow(
  place: Record<string, unknown>,
  operatorName: string,
): OperatorRow | null {
  const name = str(place.name);
  if (!name) return null;

  const addr = place.address as Record<string, unknown> | undefined;
  const streetAddress = str(addr?.streetAddress);
  const locality = str(addr?.addressLocality);
  const region = str(addr?.addressRegion);
  const postcode = str(addr?.postalCode);
  const fullAddress = [streetAddress, locality, region, postcode]
    .filter(Boolean)
    .join(', ');

  const geo = place.geo as Record<string, unknown> | undefined;

  return {
    'Park Chain (Operator)': operatorName,
    'Village Name': name,
    'Full Address': fullAddress || undefined,
    State: region,
    'Region/Area': locality,
    Postcode: postcode,
    Latitude: str(geo?.latitude),
    Longitude: str(geo?.longitude),
    'Website URL': str(place.url),
    Phone: str(place.telephone),
    Email: str(place.email),
  };
}

// Wrap a parser to apply the operator name + a tag indicating which source
// emitted the row. Keeps individual parsers focused on extraction.
function bind(operatorName: string, fn: (html: string) => OperatorRow[]): Source['parse'] {
  return (html) =>
    fn(html).map((row) => ({
      ...row,
      'Park Chain (Operator)': row['Park Chain (Operator)'] ?? operatorName,
    }));
}

// ── Per-operator parsers ───────────────────────────────────────────────────
//
// v1 strategy: try JSON-LD first (sites optimised for SEO usually expose
// Place / LocalBusiness blocks). If nothing comes back, return [] and surface
// in the cron summary — that's the signal to refine the parser for that site
// based on what the HTML actually contains.

function parseIngenia(html: string): OperatorRow[] {
  const blocks = extractJsonLd(html);
  const places = [
    ...jsonLdOfType(blocks, 'Place'),
    ...jsonLdOfType(blocks, 'LocalBusiness'),
    ...jsonLdOfType(blocks, 'Accommodation'),
    ...jsonLdOfType(blocks, 'Residence'),
  ];
  const rows = places
    .map((p) => placeToRow(p, 'Ingenia Communities'))
    .filter((r): r is OperatorRow => r !== null);
  return rows;
}

function parseGemLife(html: string): OperatorRow[] {
  const blocks = extractJsonLd(html);
  const places = [
    ...jsonLdOfType(blocks, 'Place'),
    ...jsonLdOfType(blocks, 'LocalBusiness'),
    ...jsonLdOfType(blocks, 'Residence'),
  ];
  return places
    .map((p) => placeToRow(p, 'GemLife'))
    .filter((r): r is OperatorRow => r !== null);
}

function parseHalcyon(html: string): OperatorRow[] {
  const blocks = extractJsonLd(html);
  const places = [
    ...jsonLdOfType(blocks, 'Place'),
    ...jsonLdOfType(blocks, 'LocalBusiness'),
    ...jsonLdOfType(blocks, 'Residence'),
  ];
  return places
    .map((p) => placeToRow(p, 'Halcyon'))
    .filter((r): r is OperatorRow => r !== null);
}

export const SOURCES: Source[] = [
  {
    id: 'ingenia',
    operatorName: 'Ingenia Communities',
    indexUrl: 'https://ingenialifestyle.com.au/communities',
    parse: bind('Ingenia Communities', parseIngenia),
  },
  {
    id: 'gemlife',
    operatorName: 'GemLife',
    indexUrl: 'https://gemlife.com.au/communities/',
    parse: bind('GemLife', parseGemLife),
  },
  {
    id: 'halcyon',
    operatorName: 'Halcyon',
    indexUrl: 'https://www.halcyonliving.com.au/communities/',
    parse: bind('Halcyon', parseHalcyon),
  },
];
