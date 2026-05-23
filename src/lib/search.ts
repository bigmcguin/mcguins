import { MeiliSearch } from 'meilisearch';

// Search-only client for the browser. Uses a key with `search` action only.
export const searchClient = new MeiliSearch({
  host: process.env.NEXT_PUBLIC_MEILISEARCH_HOST ?? process.env.MEILISEARCH_HOST ?? '',
  apiKey: process.env.NEXT_PUBLIC_MEILISEARCH_SEARCH_KEY ?? '',
});

// Admin client — server-only. Used for indexing.
export function adminSearchClient() {
  return new MeiliSearch({
    host: process.env.MEILISEARCH_HOST ?? '',
    apiKey: process.env.MEILISEARCH_MASTER_KEY ?? '',
  });
}

export const COMMUNITY_INDEX = 'communities';

export type CommunitySearchDoc = {
  id: string;
  slug: string;
  name: string;
  state: string;
  suburb: string;
  postcode: string;
  operatorName?: string;
  petFriendly: boolean;
  over50sOnly: boolean;
  coastal: boolean;
  facilities: string[];
  feesMin?: number;
  feesMax?: number;
  featured: boolean;
  heroImage?: string;
  lat?: number;
  lng?: number;
};

// Ensure index settings — call once during deploy.
export async function configureCommunityIndex() {
  const client = adminSearchClient();
  const index = client.index(COMMUNITY_INDEX);
  await index.updateSettings({
    searchableAttributes: ['name', 'operatorName', 'suburb', 'postcode'],
    filterableAttributes: [
      'state',
      'suburb',
      'postcode',
      'petFriendly',
      'over50sOnly',
      'coastal',
      'facilities',
      'featured',
    ],
    sortableAttributes: ['feesMin', 'feesMax', 'featured'],
    rankingRules: [
      'words',
      'typo',
      'proximity',
      'attribute',
      'sort',
      'exactness',
      'featured:desc',
    ],
  });
}
