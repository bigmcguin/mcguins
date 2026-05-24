'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

export function SearchBar() {
  const router = useRouter();
  const [q, setQ] = useState('');
  const [state, setState] = useState('');

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const params = new URLSearchParams();
    if (q) params.set('q', q);
    if (state) params.set('state', state);
    router.push(`/communities?${params.toString()}`);
  }

  return (
    <form
      onSubmit={onSubmit}
      role="search"
      className="flex flex-col sm:flex-row gap-1.5 rounded-2xl bg-white p-1.5 shadow-2xl shadow-teal-950/30 ring-1 ring-white/10"
    >
      <label className="flex-1 relative">
        <span className="sr-only">Search suburb, postcode or community</span>
        <svg
          aria-hidden
          viewBox="0 0 24 24"
          className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-ink-400"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
        >
          <circle cx="11" cy="11" r="7" />
          <path d="M21 21l-4.3-4.3" strokeLinecap="round" />
        </svg>
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          type="search"
          placeholder="Suburb, postcode or community name"
          className="w-full rounded-xl bg-sand-50 pl-11 pr-4 py-4 text-ink-900 placeholder:text-ink-400"
        />
      </label>
      <label className="sm:w-44">
        <span className="sr-only">State</span>
        <select
          value={state}
          onChange={(e) => setState(e.target.value)}
          className="w-full h-full rounded-xl bg-sand-50 px-4 py-4 text-ink-900 appearance-none"
        >
          <option value="">All states</option>
          {['NSW', 'VIC', 'QLD', 'WA', 'SA', 'TAS', 'ACT', 'NT'].map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
      </label>
      <button
        type="submit"
        className="rounded-xl bg-teal-700 px-7 py-4 text-white font-medium hover:bg-teal-800 active:scale-[0.98] transition"
      >
        Search
      </button>
    </form>
  );
}
