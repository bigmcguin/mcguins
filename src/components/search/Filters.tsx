'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useCallback } from 'react';
import type { CommunitySearch } from '@/lib/validators';

export function Filters({ initial }: { initial: CommunitySearch }) {
  const router = useRouter();
  const searchParams = useSearchParams();

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

  return (
    <div className="rounded-xl border border-brand-100 bg-white p-5 space-y-5">
      <fieldset>
        <legend className="font-semibold">State</legend>
        <select
          defaultValue={initial.state ?? ''}
          onChange={(e) => update('state', e.target.value || null)}
          className="mt-2 w-full rounded-md border border-brand-200 bg-white p-2"
        >
          <option value="">All states</option>
          {['NSW', 'VIC', 'QLD', 'WA', 'SA', 'TAS', 'ACT', 'NT'].map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
      </fieldset>

      <fieldset>
        <legend className="font-semibold">Postcode</legend>
        <input
          inputMode="numeric"
          pattern="\d{4}"
          defaultValue={initial.postcode ?? ''}
          onBlur={(e) => update('postcode', e.target.value || null)}
          className="mt-2 w-full rounded-md border border-brand-200 bg-white p-2"
        />
      </fieldset>

      <fieldset className="space-y-2">
        <legend className="font-semibold">Lifestyle</legend>
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

      <fieldset>
        <legend className="font-semibold">Sort by</legend>
        <select
          defaultValue={initial.sort}
          onChange={(e) => update('sort', e.target.value)}
          className="mt-2 w-full rounded-md border border-brand-200 bg-white p-2"
        >
          <option value="featured">Featured</option>
          <option value="newest">Newest</option>
          <option value="price">Site fees: low to high</option>
        </select>
      </fieldset>
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
    <label className="flex items-center gap-2">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="h-4 w-4 rounded border-brand-300 text-brand-700"
      />
      <span>{label}</span>
    </label>
  );
}
