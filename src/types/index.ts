// Shared TypeScript types. Prefer Prisma-generated types where possible.

import type { Community, Suburb, CommunityImage, Operator } from '@prisma/client';

export type CommunityWithRelations = Community & {
  suburb: Suburb;
  images: CommunityImage[];
  operator?: Operator | null;
};
