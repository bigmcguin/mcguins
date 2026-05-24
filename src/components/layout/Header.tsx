import Link from 'next/link';
import { SignedIn, SignedOut, SignInButton, UserButton } from '@clerk/nextjs';
import { MobileMenu } from './MobileMenu';

const NAV_ITEMS = [
  { href: '/communities', label: 'Browse' },
  { href: '/map', label: 'Map' },
  { href: '/compare', label: 'Compare' },
  { href: '/blog', label: 'Guides' },
];

export function Header() {
  return (
    <header className="sticky top-0 z-40 bg-sand-50/85 backdrop-blur-md border-b border-ink-100">
      <div className="mx-auto max-w-6xl px-6 h-16 flex items-center justify-between gap-4">
        <Link href="/" className="flex items-center gap-2.5">
          <span aria-hidden className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-teal-700 text-white font-display text-lg">
            ◆
          </span>
          <span className="font-display text-lg font-medium text-ink-900 leading-none">
            AU Land Lease
            <span className="block text-[10px] uppercase tracking-[0.18em] text-ink-500 mt-0.5">
              Directory
            </span>
          </span>
        </Link>
        <nav aria-label="Primary" className="hidden md:flex items-center gap-7 text-sm">
          {NAV_ITEMS.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="text-ink-700 hover:text-teal-800"
            >
              {item.label}
            </Link>
          ))}
        </nav>
        <div className="flex items-center gap-3">
          <SignedOut>
            <SignInButton>
              <button className="text-sm font-medium text-teal-700 hover:text-teal-900">
                Sign in
              </button>
            </SignInButton>
          </SignedOut>
          <SignedIn>
            <Link href="/account" className="hidden sm:inline text-sm font-medium text-teal-700 hover:text-teal-900">
              My account
            </Link>
            <UserButton />
          </SignedIn>
          <MobileMenu items={NAV_ITEMS} />
        </div>
      </div>
    </header>
  );
}
