'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { Menu, X } from 'lucide-react';

type NavItem = { href: string; label: string };

export function MobileMenu({ items }: { items: NavItem[] }) {
  const [open, setOpen] = useState(false);

  // Close the menu if the user navigates by any means (back button, link
  // click that does a soft-nav, etc) — Next.js does not fire a route change
  // event for us in app router, but resetting body scroll when the menu
  // closes is enough for the common case.
  useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [open]);

  return (
    <>
      <button
        type="button"
        aria-label={open ? 'Close menu' : 'Open menu'}
        aria-expanded={open}
        aria-controls="mobile-menu"
        onClick={() => setOpen((v) => !v)}
        className="md:hidden inline-flex h-10 w-10 items-center justify-center rounded-lg text-ink-700 hover:bg-sand-100"
      >
        {open ? <X size={20} /> : <Menu size={20} />}
      </button>

      {open && (
        <div
          className="md:hidden fixed inset-0 top-16 z-40 bg-ink-900/40 backdrop-blur-sm"
          onClick={() => setOpen(false)}
          aria-hidden
        />
      )}

      <nav
        id="mobile-menu"
        aria-label="Mobile primary"
        className={`md:hidden fixed inset-x-0 top-16 z-50 origin-top border-b border-ink-100 bg-sand-50 shadow-lg transition ${
          open ? 'translate-y-0 opacity-100' : 'pointer-events-none -translate-y-2 opacity-0'
        }`}
      >
        <ul className="mx-auto max-w-6xl px-6 py-4">
          {items.map((item) => (
            <li key={item.href} className="border-b border-ink-100 last:border-b-0">
              <Link
                href={item.href}
                onClick={() => setOpen(false)}
                className="block py-3 text-base font-medium text-ink-800 hover:text-teal-800"
              >
                {item.label}
              </Link>
            </li>
          ))}
        </ul>
      </nav>
    </>
  );
}
