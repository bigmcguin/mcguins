// Canonical taxonomy of community facilities. Each entry has a stable slug
// (used as the database key), a display name, a category, an icon (lucide
// component name), and a set of regex patterns used to detect this facility
// when parsing free-text facility lists from imported data.

export type FacilityCategory =
  | 'pools-wellness'
  | 'fitness'
  | 'indoor-recreation'
  | 'outdoor-recreation'
  | 'food-social'
  | 'practical'
  | 'gardens-nature'
  | 'pet-family'
  | 'access-services';

export const CATEGORY_LABELS: Record<FacilityCategory, string> = {
  'pools-wellness': 'Pools & wellness',
  fitness: 'Fitness',
  'indoor-recreation': 'Indoor recreation',
  'outdoor-recreation': 'Outdoor recreation',
  'food-social': 'Food & social',
  practical: 'Practical',
  'gardens-nature': 'Gardens & nature',
  'pet-family': 'Pets & family',
  'access-services': 'Access & services',
};

export const CATEGORY_ORDER: FacilityCategory[] = [
  'pools-wellness',
  'fitness',
  'indoor-recreation',
  'outdoor-recreation',
  'food-social',
  'gardens-nature',
  'pet-family',
  'practical',
  'access-services',
];

export type FacilityDef = {
  slug: string;
  name: string;
  category: FacilityCategory;
  // Name of a lucide-react icon component (see FacilityIcon.tsx for the map)
  icon: string;
  // Patterns used to detect this facility in raw text. Tested against the
  // lowercased text. Order matters — earlier wins for overlapping matches
  // (e.g. indoor-pool before outdoor-pool).
  matches: RegExp[];
};

// IMPORTANT: indoor-pool must come before outdoor-pool so the parser
// recognises an "indoor heated pool" as indoor rather than the default.
export const FACILITIES: FacilityDef[] = [
  // ── Pools & wellness ──────────────────────────────────────────────────────
  { slug: 'indoor-pool', name: 'Indoor pool', category: 'pools-wellness', icon: 'waves',
    matches: [/indoor\s*(?:heated\s*)?pool/, /heated\s*indoor\s*pool/] },
  { slug: 'outdoor-pool', name: 'Outdoor pool', category: 'pools-wellness', icon: 'waves',
    matches: [/(?:outdoor|resort|lap|swimming)\s*pool/, /\bpool\b/] },
  { slug: 'spa', name: 'Spa', category: 'pools-wellness', icon: 'droplets',
    matches: [/\bspa\b/] },
  { slug: 'sauna', name: 'Sauna', category: 'pools-wellness', icon: 'flame',
    matches: [/\bsauna\b/] },
  { slug: 'steam-room', name: 'Steam room', category: 'pools-wellness', icon: 'cloud',
    matches: [/steam\s*room/] },

  // ── Fitness ───────────────────────────────────────────────────────────────
  { slug: 'gym', name: 'Gym', category: 'fitness', icon: 'dumbbell',
    matches: [/\bgym(?:nasium)?\b/, /exercise\s*room/, /fitness\s*(?:room|centre|center)/] },
  { slug: 'yoga-studio', name: 'Yoga / Pilates', category: 'fitness', icon: 'flower-2',
    matches: [/yoga/, /pilates/] },
  { slug: 'dance-studio', name: 'Dance studio', category: 'fitness', icon: 'music',
    matches: [/dance\s*(?:studio|room)/] },
  { slug: 'massage-room', name: 'Massage room', category: 'fitness', icon: 'hand',
    matches: [/massage/] },

  // ── Indoor recreation ─────────────────────────────────────────────────────
  { slug: 'clubhouse', name: 'Clubhouse', category: 'indoor-recreation', icon: 'building',
    matches: [/clubhouse/, /country\s*club/, /community\s*centre/, /community\s*center/] },
  { slug: 'lounge', name: 'Lounge', category: 'indoor-recreation', icon: 'sofa',
    matches: [/lounge/, /lodge\s*with/] },
  { slug: 'recreation-room', name: 'Recreation room', category: 'indoor-recreation', icon: 'sofa',
    matches: [/recreation\s*room/, /\brec\s*room\b/] },
  { slug: 'cinema', name: 'Cinema / theatre', category: 'indoor-recreation', icon: 'film',
    matches: [/cinema/, /theatre/, /theater/, /movie\s*room/] },
  { slug: 'library', name: 'Library', category: 'indoor-recreation', icon: 'book-open',
    matches: [/library/] },
  { slug: 'games-room', name: 'Games room', category: 'indoor-recreation', icon: 'dices',
    matches: [/games?\s*room/, /\bcards?\s*room/] },
  { slug: 'billiards', name: 'Billiards / snooker', category: 'indoor-recreation', icon: 'circle-dot',
    matches: [/billiard/, /billard/, /snooker/, /pool\s*table/] },
  { slug: 'craft-room', name: 'Craft room', category: 'indoor-recreation', icon: 'scissors',
    matches: [/craft\s*room/, /arts?\s*(?:and|&)\s*crafts?/, /sewing\s*room/] },
  { slug: 'mens-shed', name: "Men's shed", category: 'indoor-recreation', icon: 'hammer',
    matches: [/men'?s?\s*shed/] },
  { slug: 'workshop', name: 'Workshop', category: 'indoor-recreation', icon: 'wrench',
    matches: [/workshop/, /workshed/] },
  { slug: 'pool-house', name: 'Pool house', category: 'indoor-recreation', icon: 'home',
    matches: [/pool\s*house/, /pool\s*pavilion/] },

  // ── Outdoor recreation ────────────────────────────────────────────────────
  { slug: 'tennis-court', name: 'Tennis court', category: 'outdoor-recreation', icon: 'target',
    matches: [/tennis/] },
  { slug: 'pickleball-court', name: 'Pickleball court', category: 'outdoor-recreation', icon: 'target',
    matches: [/pickleball/] },
  { slug: 'bowling-green', name: 'Bowling green', category: 'outdoor-recreation', icon: 'circle',
    matches: [/bowling\s*green/, /\bbowls?\b/, /lawn\s*bowls/] },
  { slug: 'croquet', name: 'Croquet', category: 'outdoor-recreation', icon: 'grip-vertical',
    matches: [/croquet/] },
  { slug: 'bocce', name: 'Bocce', category: 'outdoor-recreation', icon: 'circle',
    matches: [/bocce/] },
  { slug: 'putting-green', name: 'Putting green', category: 'outdoor-recreation', icon: 'flag',
    matches: [/putting\s*green/] },
  { slug: 'mini-golf', name: 'Mini golf', category: 'outdoor-recreation', icon: 'flag',
    matches: [/mini[\s-]*golf/] },

  // ── Food & social ─────────────────────────────────────────────────────────
  { slug: 'bbq-area', name: 'BBQ area', category: 'food-social', icon: 'flame',
    matches: [/\bbbq\b/, /barbecue/, /barbeque/] },
  { slug: 'kitchen', name: 'Communal kitchen', category: 'food-social', icon: 'utensils-crossed',
    matches: [/kitchen/] },
  { slug: 'dining-room', name: 'Dining room', category: 'food-social', icon: 'utensils',
    matches: [/dining\s*room/, /dining\s*area/] },
  { slug: 'cafe', name: 'Cafe', category: 'food-social', icon: 'coffee',
    matches: [/cafe|café/, /coffee\s*shop/] },
  { slug: 'alfresco-dining', name: 'Alfresco dining', category: 'food-social', icon: 'umbrella',
    matches: [/alfresco/, /al[\s-]?fresco/] },

  // ── Gardens & nature ──────────────────────────────────────────────────────
  { slug: 'community-garden', name: 'Community garden', category: 'gardens-nature', icon: 'sprout',
    matches: [/community\s*garden/, /vegetable\s*garden/, /veggie\s*garden/, /herb\s*garden/] },
  { slug: 'walking-trails', name: 'Walking trails', category: 'gardens-nature', icon: 'footprints',
    matches: [/walking\s*trail/, /walk\/bike/, /bike\s*track/, /walking\s*track/, /walking\s*paths?/] },
  { slug: 'lake', name: 'Lake / waterfront', category: 'gardens-nature', icon: 'waves',
    matches: [/\blake\b/, /waterfront/] },
  { slug: 'fruit-orchard', name: 'Fruit orchard', category: 'gardens-nature', icon: 'apple',
    matches: [/orchard/, /fruit\s*tree/] },

  // ── Pets & family ─────────────────────────────────────────────────────────
  { slug: 'dog-park', name: 'Off-leash dog area', category: 'pet-family', icon: 'dog',
    matches: [/off[\s-]?leash/, /dog\s*park/, /dog\s*run/] },
  { slug: 'pet-friendly', name: 'Pet-friendly community', category: 'pet-family', icon: 'paw-print',
    matches: [/pet[\s-]?friendly/] },

  // ── Practical ─────────────────────────────────────────────────────────────
  { slug: 'reception', name: 'Reception', category: 'practical', icon: 'bell',
    matches: [/reception/] },
  { slug: 'office', name: 'Office / admin', category: 'practical', icon: 'building-2',
    matches: [/management\s*office/, /admin\s*office/, /\boffice\b/] },
  { slug: 'caravan-boat-storage', name: 'Caravan / boat storage', category: 'practical', icon: 'truck',
    matches: [/caravan\s*(?:and|&)?\s*boat\s*storage/, /boat\s*(?:and|&)?\s*caravan\s*storage/, /\bcaravan\s*storage\b/, /\bboat\s*storage\b/] },
  { slug: 'community-bus', name: 'Community bus', category: 'practical', icon: 'bus',
    matches: [/community\s*bus/, /village\s*bus/, /shuttle\s*bus/] },
  { slug: 'ev-charging', name: 'EV charging', category: 'practical', icon: 'plug',
    matches: [/ev\s*charg/, /electric\s*vehicle/] },

  // ── Access & services ────────────────────────────────────────────────────
  { slug: 'accessible', name: 'Accessible amenities', category: 'access-services', icon: 'accessibility',
    matches: [/accessible/, /wheelchair/, /disabled\s*access/] },
  { slug: 'gated', name: 'Gated community', category: 'access-services', icon: 'lock-keyhole',
    matches: [/gated\s*community/, /security\s*gate/, /\bgated\b/] },
];

export function facilityBySlug(slug: string): FacilityDef | undefined {
  return FACILITIES.find((f) => f.slug === slug);
}

// Parses a free-text facilities string into canonical facility slugs.
export function parseFacilities(text: string | null | undefined): string[] {
  if (!text) return [];
  const haystack = text.toLowerCase();
  const found = new Set<string>();
  for (const f of FACILITIES) {
    if (f.matches.some((re) => re.test(haystack))) {
      // Avoid double-counting: indoor-pool wins over outdoor-pool, so don't
      // add outdoor-pool if indoor-pool already matched.
      if (f.slug === 'outdoor-pool' && found.has('indoor-pool')) continue;
      found.add(f.slug);
    }
  }
  return Array.from(found);
}
