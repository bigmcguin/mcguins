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
      className="flex flex-col sm:flex-row gap-2 rounded-xl bg-white p-2 shadow-lg"
    >
      <label className="flex-1">
        <span className="sr-only">Search suburb, postcode or community</span>
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          type="search"
          placeholder="Suburb, postcode or community name"
          className="w-full rounded-lg bg-sand-50 px-4 py-3 text-brand-900"
        />
      </label>
      <label className="sm:w-44">
        <span className="sr-only">State</span>
        <select
          value={state}
          onChange={(e) => setState(e.target.value)}
          className="w-full rounded-lg bg-sand-50 px-4 py-3 text-brand-900"
        >
          <option value="">All states</option>
          {['NSW', 'VIC', 'QLD', 'WA', 'SA', 'TAS', 'ACT', 'NT'].map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
      </label>
      <button
        type="submit"
        className="rounded-lg bg-brand-700 px-6 py-3 text-white font-medium hover:bg-brand-800"
      >
        Search
      </button>
    </form>
  );
}
