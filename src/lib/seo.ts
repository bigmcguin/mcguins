import type { Metadata } from 'next';

const SITE_NAME = 'Australian Land Lease Directory';
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://example.com.au';

export function pageMetadata(opts: {
  title: string;
  description: string;
  path: string;
  image?: string;
}): Metadata {
  const url = `${SITE_URL}${opts.path}`;
  return {
    title: `${opts.title} | ${SITE_NAME}`,
    description: opts.description,
    alternates: { canonical: url },
    openGraph: {
      title: opts.title,
      description: opts.description,
      url,
      siteName: SITE_NAME,
      locale: 'en_AU',
      type: 'website',
      images: opts.image ? [opts.image] : undefined,
    },
    twitter: {
      card: 'summary_large_image',
      title: opts.title,
      description: opts.description,
      images: opts.image ? [opts.image] : undefined,
    },
  };
}

type CommunityForLD = {
  name: string;
  slug: string;
  description?: string | null;
  addressLine1: string;
  suburb: { name: string };
  state: string;
  postcode: string;
  latitude?: number | null;
  longitude?: number | null;
  phone?: string | null;
  websiteUrl?: string | null;
  heroImage?: string | null;
};

// LocalBusiness JSON-LD for community profile pages.
export function communityJsonLd(c: CommunityForLD) {
  return {
    '@context': 'https://schema.org',
    '@type': 'LocalBusiness',
    '@id': `${SITE_URL}/communities/${c.slug}`,
    name: c.name,
    description: c.description ?? undefined,
    image: c.heroImage ?? undefined,
    url: c.websiteUrl ?? undefined,
    telephone: c.phone ?? undefined,
    address: {
      '@type': 'PostalAddress',
      streetAddress: c.addressLine1,
      addressLocality: c.suburb.name,
      addressRegion: c.state,
      postalCode: c.postcode,
      addressCountry: 'AU',
    },
    geo:
      c.latitude && c.longitude
        ? { '@type': 'GeoCoordinates', latitude: c.latitude, longitude: c.longitude }
        : undefined,
  };
}

export function breadcrumbJsonLd(items: { name: string; url: string }[]) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: item.name,
      item: `${SITE_URL}${item.url}`,
    })),
  };
}

export const SITE = { name: SITE_NAME, url: SITE_URL };
