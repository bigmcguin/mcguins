import Link from 'next/link';
import { STATE_LABELS } from '@/lib/utils';

export function Footer() {
  return (
    <footer className="mt-16 border-t border-brand-100 bg-white">
      <div className="mx-auto max-w-6xl px-6 py-12 grid gap-10 md:grid-cols-4 text-sm">
        <div className="md:col-span-2">
          <p className="font-display text-lg font-semibold text-brand-800">
            AU Land Lease
          </p>
          <p className="mt-2 max-w-prose text-brand-700/80">
            Australia's directory for land lease, lifestyle, over-50s and
            manufactured-home communities. Independent listings, real reviews.
          </p>
        </div>
        <div>
          <p className="font-semibold">Browse by state</p>
          <ul className="mt-3 space-y-1">
            {Object.entries(STATE_LABELS).map(([code, label]) => (
              <li key={code}>
                <Link
                  href={`/states/${code.toLowerCase()}`}
                  className="text-brand-700 hover:underline"
                >
                  {label}
                </Link>
              </li>
            ))}
          </ul>
        </div>
        <div>
          <p className="font-semibold">About</p>
          <ul className="mt-3 space-y-1">
            <li><Link href="/blog" className="text-brand-700 hover:underline">Guides &amp; insights</Link></li>
            <li><Link href="/operators/claim" className="text-brand-700 hover:underline">List your community</Link></li>
            <li><Link href="/about" className="text-brand-700 hover:underline">About us</Link></li>
            <li><Link href="/contact" className="text-brand-700 hover:underline">Contact</Link></li>
            <li><Link href="/privacy" className="text-brand-700 hover:underline">Privacy</Link></li>
          </ul>
        </div>
      </div>
      <div className="border-t border-brand-100 py-4 text-center text-xs text-brand-700/60">
        © {new Date().getFullYear()} AU Land Lease Directory
      </div>
    </footer>
  );
}
