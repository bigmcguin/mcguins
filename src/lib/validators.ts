import { z } from 'zod';

export const AU_STATES = ['ACT', 'NSW', 'NT', 'QLD', 'SA', 'VIC', 'WA'] as const;

export const communitySearchSchema = z.object({
  q: z.string().optional(),
  name: z.string().optional(),
  state: z.enum(AU_STATES).optional(),
  suburb: z.string().optional(),
  postcode: z.string().regex(/^\d{4}$/).optional(),
  operatorId: z.string().optional(),
  // Lifestyle policy
  petFriendly: z.coerce.boolean().optional(),
  over50sOnly: z.coerce.boolean().optional(),
  coastal: z.coerce.boolean().optional(),
  // Feature filters — each maps to one or more facility slugs in the page
  hasPool: z.coerce.boolean().optional(),
  hasGym: z.coerce.boolean().optional(),
  hasClubhouse: z.coerce.boolean().optional(),
  hasBowls: z.coerce.boolean().optional(),
  hasTennis: z.coerce.boolean().optional(),
  hasStorage: z.coerce.boolean().optional(),
  hasTrails: z.coerce.boolean().optional(),
  hasCommunityBus: z.coerce.boolean().optional(),
  hasAccessible: z.coerce.boolean().optional(),
  facilities: z.array(z.string()).optional(),
  feesMaxCents: z.coerce.number().int().nonnegative().optional(),
  page: z.coerce.number().int().min(1).default(1),
  perPage: z.coerce.number().int().min(1).max(50).default(20),
  sort: z.enum(['featured', 'newest', 'rating', 'price']).default('featured'),
});

export type CommunitySearch = z.infer<typeof communitySearchSchema>;

export const enquirySchema = z.object({
  communityId: z.string().cuid(),
  name: z.string().min(2).max(100),
  email: z.string().email(),
  phone: z.string().max(40).optional(),
  message: z.string().min(10).max(2000),
  // Honeypot — must be empty
  website: z.string().max(0).optional(),
});

export const reviewSchema = z.object({
  communityId: z.string().cuid(),
  rating: z.number().int().min(1).max(5),
  title: z.string().min(3).max(120),
  body: z.string().min(20).max(4000),
});
