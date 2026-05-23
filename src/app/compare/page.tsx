import { pageMetadata } from '@/lib/seo';

export const metadata = pageMetadata({
  title: 'Compare communities',
  description: 'Side-by-side comparison of Australian land lease communities — facilities, site fees, location and lifestyle features.',
  path: '/compare',
});

export default function ComparePage() {
  return (
    <div className="mx-auto max-w-6xl px-6 py-16">
      <h1 className="font-display text-3xl font-semibold">Compare communities</h1>
      <p className="mt-3 max-w-prose text-brand-700/80">
        Pick up to four communities from the directory and compare facilities,
        site fees and lifestyle features side-by-side.
      </p>
      <p className="mt-8 rounded-lg border border-brand-100 bg-white p-6 text-brand-700/70">
        Comparison tool — phase 3 of the roadmap.
      </p>
    </div>
  );
}
