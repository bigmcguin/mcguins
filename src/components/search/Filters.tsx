'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useCallback, useState } from 'react';
import type { CommunitySearch } from '@/lib/validators';
import { FEATURE_FILTERS } from '@/lib/feature-filters';

export function Filters({ initial }: { initial: CommunitySearch }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [nameDraft, setNameDraft] = useState(initial.name ?? '');
  const [postcodeDraft, setPostcodeDraft] = useState(initial.postcode ?? '');

  const update = useCallback(
    (key: string, value: string | null) => {
      const next = new URLSearchParams(searchParams.toString());
      if (!value) next.delete(key);
      else next.set(key, value);
      next.delete('page');
      router.push(`/communities?${next.toString()}`);
    },
    [router, searchParams],
  );

  const clearAll = useCallback(() => {
    setNameDraft('');
    setPostcodeDraft('');
    router.push('/communities');
  }, [router]);

  // Count active non-default filters so the "Reset" button shows a useful badge
  const activeCount = countActive(initial);

  return (
    <div className="rounded-xl border border-ink-100 bg-white p-5 space-y-5">
      <fieldset>
        <legend className="font-medium text-ink-900">Park name</legend>
        <input
          type="search"
          defaultValue={initial.name ?? ''}
          value={nameDraft}
          onChange={(e) => setNameDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              update('name', nameDraft || null);
            }
          }}
          onBlur={() => {
            if ((initial.name ?? '') !== nameDraft) update('name', nameDraft || null);
          }}
          placeholder="e.g. Halcyon Greens"
          className="mt-2 w-full rounded-md border border-ink-200 bg-white p-2 text-sm focus:border-teal-700 focus:outline-none"
        />
      </fieldset>

      <fieldset>
        <legend className="font-medium text-ink-900">Postcode</legend>
        <input
          inputMode="numeric"
          pattern="\d{4}"
          maxLength={4}
          value={postcodeDraft}
          onChange={(e) => setPostcodeDraft(e.target.value.replace(/\D/g, ''))}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              update('postcode', /^\d{4}$/.test(postcodeDraft) ? postcodeDraft : null);
            }
          }}
          onBlur={() => {
            const cleaned = /^\d{4}$/.test(postcodeDraft) ? postcodeDraft : null;
            if ((initial.postcode ?? null) !== cleaned) update('postcode', cleaned);
          }}
          placeholder="e.g. 4220"
          className="mt-2 w-full rounded-md border border-ink-200 bg-white p-2 text-sm focus:border-teal-700 focus:outline-none"
        />
      </fieldset>

      <fieldset>
        <legend className="font-medium text-ink-900">State</legend>
        <select
          defaultValue={initial.state ?? ''}
          onChange={(e) => update('state', e.target.value || null)}
          className="mt-2 w-full rounded-md border border-ink-200 bg-white p-2 text-sm focus:border-teal-700 focus:outline-none"
        >
          <option value="">All states</option>
          {['NSW', 'VIC', 'QLD', 'WA', 'SA', 'TAS', 'ACT', 'NT'].map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
      </fieldset>

      <fieldset className="space-y-2">
        <legend className="font-medium text-ink-900">Lifestyle</legend>
        <Toggle
          label="Pet friendly"
          checked={!!initial.petFriendly}
          onChange={(v) => update('petFriendly', v ? 'true' : null)}
        />
        <Toggle
          label="Over 50s only"
          checked={!!initial.over50sOnly}
          onChange={(v) => update('over50sOnly', v ? 'true' : null)}
        />
        <Toggle
          label="Coastal"
          checked={!!initial.coastal}
          onChange={(v) => update('coastal', v ? 'true' : null)}
        />
      </fieldset>

      <fieldset className="space-y-2">
        <legend className="font-medium text-ink-900">Features</legend>
        {FEATURE_FILTERS.map((f) => (
          <Toggle
            key={f.key}
            label={f.label}
            checked={!!initial[f.key]}
            onChange={(v) => update(f.key, v ? 'true' : null)}
          />
        ))}
      </fieldset>

      <fieldset>
        <legend className="font-medium text-ink-900">Sort by</legend>
        <select
          defaultValue={initial.sort}
          onChange={(e) => update('sort', e.target.value)}
          className="mt-2 w-full rounded-md border border-ink-200 bg-white p-2 text-sm focus:border-teal-700 focus:outline-none"
        >
          <option value="featured">Featured</option>
          <option value="newest">Newest</option>
          <option value="price">Site fees: low to high</option>
        </select>
      </fieldset>

      {activeCount > 0 && (
        <button
          type="button"
          onClick={clearAll}
          className="w-full rounded-md border border-ink-200 px-3 py-2 text-sm text-ink-700 hover:bg-sand-50"
        >
          Clear all filters ({activeCount})
        </button>
      )}
    </div>
  );
}

function Toggle({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <label className="flex items-center gap-2 text-sm text-ink-800">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="h-4 w-4 rounded border-ink-300 text-teal-700 focus:ring-teal-700"
      />
      <span>{label}</span>
    </label>
  );
}

function countActive(s: CommunitySearch): number {
  let n = 0;
  if (s.name) n++;
  if (s.postcode) n++;
  if (s.state) n++;
  if (s.petFriendly) n++;
  if (s.over50sOnly) n++;
  if (s.coastal) n++;
  for (const f of FEATURE_FILTERS) {
    if (s[f.key]) n++;
  }
  return n;
}
