// Feature filter definitions for the /communities directory page.
//
// Each entry maps a single URL boolean (e.g. ?hasPool=true) to one or more
// canonical facility slugs from the facilities taxonomy. The page applies
// each enabled filter as a "community has at least one of these facilities"
// clause, and combines them with AND so multiple feature filters narrow
// the result set.
//
// Kept in its own file so both the server page and the client Filters
// component can import it without crossing the "use client" boundary
// (importing non-component values from a client module into a server
// component is not supported reliably).

export type FeatureFilterKey =
  | 'hasPool'
  | 'hasGym'
  | 'hasClubhouse'
  | 'hasBowls'
  | 'hasTennis'
  | 'hasStorage'
  | 'hasTrails'
  | 'hasCommunityBus'
  | 'hasAccessible';

export type FeatureFilterDef = {
  key: FeatureFilterKey;
  label: string;
  slugs: string[];
};

export const FEATURE_FILTERS: ReadonlyArray<FeatureFilterDef> = [
  { key: 'hasPool', label: 'Pool', slugs: ['outdoor-pool', 'indoor-pool'] },
  { key: 'hasGym', label: 'Gym', slugs: ['gym'] },
  { key: 'hasClubhouse', label: 'Clubhouse', slugs: ['clubhouse'] },
  { key: 'hasBowls', label: 'Bowling green', slugs: ['bowling-green'] },
  { key: 'hasTennis', label: 'Tennis / pickleball', slugs: ['tennis-court', 'pickleball-court'] },
  { key: 'hasStorage', label: 'Caravan / boat storage', slugs: ['caravan-boat-storage'] },
  { key: 'hasTrails', label: 'Walking trails', slugs: ['walking-trails'] },
  { key: 'hasCommunityBus', label: 'Community bus', slugs: ['community-bus'] },
  { key: 'hasAccessible', label: 'Accessible amenities', slugs: ['accessible'] },
];
