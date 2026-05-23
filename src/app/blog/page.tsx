import { pageMetadata } from '@/lib/seo';

export const metadata = pageMetadata({
  title: 'Guides & insights',
  description: 'Plain-English guides to land lease living, site fees, downsizing, manufactured homes and over-50s communities in Australia.',
  path: '/blog',
});

export default function BlogIndex() {
  return (
    <div className="mx-auto max-w-4xl px-6 py-16">
      <h1 className="font-display text-3xl font-semibold">Guides &amp; insights</h1>
      <p className="mt-3 max-w-prose text-brand-700/80">
        Editorial content lives in Sanity Studio and is rendered here. Phase 5 of the roadmap.
      </p>
    </div>
  );
}
