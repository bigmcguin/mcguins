'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import type { CommunitySearch } from '@/lib/validators';
import { FEATURE_FILTERS, type FeatureFilterKey } from '@/lib/feature-filters';

const STATES = ['NSW', 'VIC', 'QLD', 'WA', 'SA', 'ACT', 'NT'] as const;

type DraftFilters = {
  name: string;
  postcode: string;
  state: string;
  petFriendly: boolean;
  over50sOnly: boolean;
  coastal: boolean;
  features: Record<FeatureFilterKey, boolean>;
  sort: string;
};

function draftFromInitial(initial: CommunitySearch): DraftFilters {
  return {
    name: initial.name ?? '',
    postcode: initial.postcode ?? '',
    state: initial.state ?? '',
    petFriendly: !!initial.petFriendly,
    over50sOnly: !!initial.over50sOnly,
    coastal: !!initial.coastal,
    features: FEATURE_FILTERS.reduce(
      (acc, f) => ({ ...acc, [f.key]: !!initial[f.key] }),
      {} as Record<FeatureFilterKey, boolean>,
    ),
    sort: initial.sort ?? 'featured',
  };
}

export function Filters({ initial }: { initial: CommunitySearch }) {
  const router = useRouter();
  const [draft, setDraft] = useState<DraftFilters>(() => draftFromInitial(initial));

  function apply() {
    const next = new URLSearchParams();
    if (draft.name.trim()) next.set('name', draft.name.trim());
    if (/^\d{4}$/.test(draft.postcode)) next.set('postcode', draft.postcode);
    if (draft.state) next.set('state', draft.state);
    if (draft.petFriendly) next.set('petFriendly', 'true');
    if (draft.over50sOnly) next.set('over50sOnly', 'true');
    if (draft.coastal) next.set('coastal', 'true');
    for (const f of FEATURE_FILTERS) {
      if (draft.features[f.key]) next.set(f.key, 'true');
    }
    if (draft.sort && draft.sort !== 'featured') next.set('sort', draft.sort);
    const qs = next.toString();
    router.push(qs ? `/communities?${qs}` : '/communities');
  }

  function clearAll() {
    setDraft({
      name: '',
      postcode: '',
      state: '',
      petFriendly: false,
      over50sOnly: false,
      coastal: false,
      features: FEATURE_FILTERS.reduce(
        (acc, f) => ({ ...acc, [f.key]: false }),
        {} as Record<FeatureFilterKey, boolean>,
      ),
      sort: 'featured',
    });
    router.push('/communities');
  }

  const activeCount = countActive(draft);

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        apply();
      }}
      className="rounded-xl border border-ink-100 bg-white p-5 space-y-5"
    >
      <fieldset>
        <legend className="font-medium text-ink-900">Park or operator</legend>
        <input
          type="search"
          value={draft.name}
          onChange={(e) => setDraft({ ...draft, name: e.target.value })}
          placeholder="e.g. Halcyon, Palm Lake Resort"
          className="mt-2 w-full rounded-md border border-ink-200 bg-white p-2 text-sm focus:border-teal-700 focus:outline-none"
        />
        <p className="mt-1 text-xs text-ink-500">
          Searches park names AND operator names.
        </p>
      </fieldset>

      <fieldset>
        <legend className="font-medium text-ink-900">Postcode</legend>
        <input
          inputMode="numeric"
          pattern="\d{4}"
          maxLength={4}
          value={draft.postcode}
          onChange={(e) => setDraft({ ...draft, postcode: e.target.value.replace(/\D/g, '') })}
          placeholder="e.g. 4220"
          className="mt-2 w-full rounded-md border border-ink-200 bg-white p-2 text-sm focus:border-teal-700 focus:outline-none"
        />
      </fieldset>

      <fieldset>
        <legend className="font-medium text-ink-900">State</legend>
        <select
          value={draft.state}
          onChange={(e) => setDraft({ ...draft, state: e.target.value })}
          className="mt-2 w-full rounded-md border border-ink-200 bg-white p-2 text-sm focus:border-teal-700 focus:outline-none"
        >
          <option value="">All states</option>
          {STATES.map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
      </fieldset>

      <fieldset className="space-y-2">
        <legend className="font-medium text-ink-900">Lifestyle</legend>
        <Toggle
          label="Pet friendly"
          checked={draft.petFriendly}
          onChange={(v) => setDraft({ ...draft, petFriendly: v })}
        />
        <Toggle
          label="Over 50s only"
          checked={draft.over50sOnly}
          onChange={(v) => setDraft({ ...draft, over50sOnly: v })}
        />
        <Toggle
          label="Coastal"
          checked={draft.coastal}
          onChange={(v) => setDraft({ ...draft, coastal: v })}
        />
      </fieldset>

      <fieldset className="space-y-2">
        <legend className="font-medium text-ink-900">Features</legend>
        {FEATURE_FILTERS.map((f) => (
          <Toggle
            key={f.key}
            label={f.label}
            checked={draft.features[f.key]}
            onChange={(v) => setDraft({ ...draft, features: { ...draft.features, [f.key]: v } })}
          />
        ))}
      </fieldset>

      <fieldset>
        <legend className="font-medium text-ink-900">Sort by</legend>
        <select
          value={draft.sort}
          onChange={(e) => setDraft({ ...draft, sort: e.target.value })}
          className="mt-2 w-full rounded-md border border-ink-200 bg-white p-2 text-sm focus:border-teal-700 focus:outline-none"
        >
          <option value="featured">Featured</option>
          <option value="newest">Newest</option>
          <option value="price">Site fees: low to high</option>
        </select>
      </fieldset>

      <div className="space-y-2 pt-2">
        <button
          type="submit"
          className="w-full rounded-lg bg-teal-700 px-4 py-2.5 text-sm font-medium text-white hover:bg-teal-800"
        >
          Search
        </button>
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
    </form>
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

function countActive(d: DraftFilters): number {
  let n = 0;
  if (d.name.trim()) n++;
  if (d.postcode) n++;
  if (d.state) n++;
  if (d.petFriendly) n++;
  if (d.over50sOnly) n++;
  if (d.coastal) n++;
  for (const f of FEATURE_FILTERS) {
    if (d.features[f.key]) n++;
  }
  return n;
}

