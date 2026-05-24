'use client';

import { useMemo, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';

export type PickerOption = {
  slug: string;
  name: string;
  state: string;
  suburb: string | null;
  operator: string | null;
};

export function ComparePicker({
  options,
  selectedSlugs,
  max,
}: {
  options: PickerOption[];
  selectedSlugs: string[];
  max: number;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [query, setQuery] = useState('');

  const selectedSet = useMemo(() => new Set(selectedSlugs), [selectedSlugs]);

  const matches = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (q.length < 2) return [];
    return options
      .filter((o) => !selectedSet.has(o.slug))
      .filter((o) => {
        return (
          o.name.toLowerCase().includes(q) ||
          (o.suburb ?? '').toLowerCase().includes(q) ||
          (o.operator ?? '').toLowerCase().includes(q)
        );
      })
      .slice(0, 8);
  }, [options, selectedSet, query]);

  function updateSlugs(next: string[]) {
    const params = new URLSearchParams();
    if (next.length > 0) params.set('slugs', next.join(','));
    startTransition(() => {
      router.replace(`/compare${next.length > 0 ? `?${params.toString()}` : ''}`, {
        scroll: false,
      });
    });
  }

  function addSlug(slug: string) {
    if (selectedSet.has(slug)) return;
    if (selectedSlugs.length >= max) return;
    updateSlugs([...selectedSlugs, slug]);
    setQuery('');
  }

  function removeSlug(slug: string) {
    updateSlugs(selectedSlugs.filter((s) => s !== slug));
  }

  const selectedOptions = selectedSlugs
    .map((s) => options.find((o) => o.slug === s))
    .filter((o): o is PickerOption => !!o);

  return (
    <div className="mt-8 rounded-xl border border-ink-100 bg-white p-5">
      {/* Selected chips */}
      {selectedOptions.length > 0 && (
        <ul className="mb-4 flex flex-wrap gap-2">
          {selectedOptions.map((o) => (
            <li
              key={o.slug}
              className="inline-flex items-center gap-2 rounded-full bg-teal-50 px-3 py-1.5 text-sm text-teal-900"
            >
              <span className="font-medium">{o.name}</span>
              <span className="text-xs text-teal-700/70">
                {o.suburb ? `${o.suburb}, ` : ''}
                {o.state}
              </span>
              <button
                type="button"
                onClick={() => removeSlug(o.slug)}
                aria-label={`Remove ${o.name}`}
                className="rounded-full px-1.5 text-teal-700 hover:bg-teal-100"
                disabled={pending}
              >
                ✕
              </button>
            </li>
          ))}
        </ul>
      )}

      {selectedSlugs.length < max ? (
        <div className="relative">
          <label htmlFor="compare-search" className="block text-sm font-medium text-ink-900">
            Add a community to compare
          </label>
          <input
            id="compare-search"
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Type a village name, suburb, or operator…"
            className="mt-2 w-full rounded-lg border border-ink-200 bg-white px-3 py-2 text-sm focus:border-teal-700 focus:outline-none"
            autoComplete="off"
          />
          <p className="mt-1 text-xs text-ink-500">
            {selectedSlugs.length} of {max} added.
          </p>

          {matches.length > 0 && (
            <ul
              role="listbox"
              className="absolute left-0 right-0 z-20 mt-1 max-h-72 overflow-auto rounded-lg border border-ink-200 bg-white shadow-lg"
            >
              {matches.map((m) => (
                <li key={m.slug}>
                  <button
                    type="button"
                    onClick={() => addSlug(m.slug)}
                    className="block w-full px-3 py-2 text-left text-sm hover:bg-sand-50"
                  >
                    <span className="font-medium text-ink-900">{m.name}</span>
                    <span className="ml-2 text-xs text-ink-500">
                      {m.suburb ? `${m.suburb}, ` : ''}
                      {m.state}
                      {m.operator ? ` · ${m.operator}` : ''}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}

          {query.trim().length >= 2 && matches.length === 0 && (
            <p className="mt-2 text-xs text-ink-500">No matches for &ldquo;{query}&rdquo;.</p>
          )}
        </div>
      ) : (
        <p className="text-sm text-ink-600">
          You&apos;ve added the maximum of {max} communities. Remove one to add another.
        </p>
      )}
    </div>
  );
}
