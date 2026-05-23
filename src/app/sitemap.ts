import type { MetadataRoute } from 'next';
import { db } from '@/lib/db';
import { SITE } from '@/lib/seo';
import { AU_STATES } from '@/lib/validators';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [communities, suburbs] = await Promise.all([
    db.community.findMany({
      where: { status: 'PUBLISHED', deletedAt: null },
      select: { slug: true, updatedAt: true },
    }),
    db.suburb.findMany({
      where: { communities: { some: { status: 'PUBLISHED' } } },
      select: { slug: true },
    }),
  ]);

  const base = SITE.url;
  return [
    { url: `${base}/`, changeFrequency: 'daily', priority: 1 },
    { url: `${base}/communities`, changeFrequency: 'daily', priority: 0.9 },
    { url: `${base}/map`, changeFrequency: 'weekly', priority: 0.7 },
    { url: `${base}/compare`, changeFrequency: 'monthly', priority: 0.5 },
    ...AU_STATES.map((s) => ({
      url: `${base}/states/${s.toLowerCase()}`,
      changeFrequency: 'weekly' as const,
      priority: 0.7,
    })),
    ...suburbs.map((s) => ({
      url: `${base}/suburbs/${s.slug}`,
      changeFrequency: 'weekly' as const,
      priority: 0.6,
    })),
    ...communities.map((c) => ({
      url: `${base}/communities/${c.slug}`,
      lastModified: c.updatedAt,
      changeFrequency: 'weekly' as const,
      priority: 0.8,
    })),
  ];
}
