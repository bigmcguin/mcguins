import Link from 'next/link';
import { STATE_LABELS } from '@/lib/utils';

export function Footer() {
  return (
    <footer className="mt-20 bg-teal-900 text-teal-50">
      <div className="mx-auto max-w-6xl px-6 py-16 grid gap-10 md:grid-cols-4 text-sm">
        <div className="md:col-span-2">
          <div className="flex items-center gap-2.5">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/logo-light.png"
              alt=""
              aria-hidden
              width="36"
              height="36"
              className="h-9 w-9 object-contain"
            />
            <span className="font-display text-lg font-medium text-white">Land Lease Lifestyle</span>
          </div>
          <p className="mt-4 max-w-prose text-teal-100/80 leading-relaxed">
            Australia&apos;s independent directory for land lease, lifestyle, over-50s and
            manufactured-home communities.
          </p>
        </div>
        <div>
          <p className="font-medium text-white">Browse by state</p>
          <ul className="mt-3 space-y-1.5">
            {Object.entries(STATE_LABELS).map(([code, label]) => (
              <li key={code}>
                <Link
                  href={`/states/${code.toLowerCase()}`}
                  className="text-teal-100/80 hover:text-white"
                >
                  {label}
                </Link>
              </li>
            ))}
          </ul>
        </div>
        <div>
          <p className="font-medium text-white">About</p>
          <ul className="mt-3 space-y-1.5">
            <li><Link href="/contact" className="text-teal-100/80 hover:text-white">Contact</Link></li>
            <li><Link href="/privacy" className="text-teal-100/80 hover:text-white">Privacy</Link></li>
          </ul>
        </div>
      </div>
      <div className="border-t border-white/10 py-5 text-center text-xs text-teal-100/60">
        © {new Date().getFullYear()} Land Lease Lifestyle. Made in Australia.
      </div>
    </footer>
  );
}
