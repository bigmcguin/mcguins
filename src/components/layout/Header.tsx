import Link from 'next/link';
import { SignedIn, SignedOut, SignInButton, UserButton } from '@clerk/nextjs';

export function Header() {
  return (
    <header className="sticky top-0 z-40 bg-sand-50/95 backdrop-blur border-b border-brand-100">
      <div className="mx-auto max-w-6xl px-6 h-16 flex items-center justify-between">
        <Link href="/" className="font-display text-xl font-semibold text-brand-800">
          AU Land Lease
        </Link>
        <nav aria-label="Primary" className="hidden md:flex items-center gap-6 text-sm font-medium">
          <Link href="/communities" className="hover:text-brand-700">Browse</Link>
          <Link href="/map" className="hover:text-brand-700">Map</Link>
          <Link href="/compare" className="hover:text-brand-700">Compare</Link>
          <Link href="/blog" className="hover:text-brand-700">Guides</Link>
        </nav>
        <div className="flex items-center gap-3">
          <SignedOut>
            <SignInButton>
              <button className="text-sm font-medium text-brand-700 hover:underline">
                Sign in
              </button>
            </SignInButton>
          </SignedOut>
          <SignedIn>
            <Link href="/account" className="text-sm font-medium text-brand-700 hover:underline">
              My account
            </Link>
            <UserButton />
          </SignedIn>
        </div>
      </div>
    </header>
  );
}
