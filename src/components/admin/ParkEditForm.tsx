'use client';

import { useState } from 'react';
import type { Community } from '@prisma/client';

type FacilityRow = {
  slug: string;
  name: string;
  category: string;
  icon: string | null;
};

type Props = {
  park: Community;
  action: (formData: FormData) => Promise<void>;
  deleteAction: () => Promise<void>;
  allFacilities: FacilityRow[];
  checkedFacilitySlugs: string[];
};

const STATUSES = ['DRAFT', 'UNVERIFIED', 'PUBLISHED', 'CLAIMED', 'ARCHIVED'] as const;
const KINDS = [
  'LAND_LEASE',
  'LIFESTYLE_VILLAGE',
  'OVER_50S',
  'MANUFACTURED_HOME',
  'CARAVAN_LIFESTYLE_PARK',
  'RETIREMENT_VILLAGE',
] as const;
const FEE_FREQS = ['', 'WEEKLY', 'FORTNIGHTLY', 'MONTHLY', 'ANNUALLY'] as const;

const CATEGORY_LABELS: Record<string, string> = {
  'pools-wellness': 'Pools & wellness',
  fitness: 'Fitness',
  'indoor-recreation': 'Indoor recreation',
  'outdoor-recreation': 'Outdoor recreation',
  'food-social': 'Food & social',
  practical: 'Practical',
  'gardens-nature': 'Gardens & nature',
  'pet-family': 'Pets & family',
  'access-services': 'Access & services',
};

export function ParkEditForm({
  park,
  action,
  deleteAction,
  allFacilities,
  checkedFacilitySlugs,
}: Props) {
  const [pending, setPending] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const checked = new Set(checkedFacilitySlugs);

  // Group facilities by category, preserving CATEGORY_LABELS order
  const facilitiesByCategory = new Map<string, FacilityRow[]>();
  for (const f of allFacilities) {
    const list = facilitiesByCategory.get(f.category) ?? [];
    list.push(f);
    facilitiesByCategory.set(f.category, list);
  }

  async function onDelete() {
    const confirmed = window.confirm(
      `Delete "${park.name}" permanently?\n\nThis also removes any associated images, reviews, enquiries, and favourites. This cannot be undone.\n\nIf you just want to hide it from the site, set Status to ARCHIVED instead.`,
    );
    if (!confirmed) return;
    setDeleting(true);
    try {
      await deleteAction();
    } catch (err) {
      setDeleting(false);
      window.alert(`Delete failed: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  return (
    <form
      action={async (fd) => {
        setPending(true);
        try {
          await action(fd);
        } finally {
          setPending(false);
        }
      }}
      className="mt-8 space-y-8"
    >
      <Section title="Basics">
        <Field label="Name">
          <input name="name" defaultValue={park.name} required className={inputCls} />
        </Field>
        <div className="grid grid-cols-2 gap-4">
          <Field label="Status">
            <select name="status" defaultValue={park.status} className={inputCls}>
              {STATUSES.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Kind">
            <select name="kind" defaultValue={park.kind} className={inputCls}>
              {KINDS.map((k) => (
                <option key={k} value={k}>
                  {k.replaceAll('_', ' ')}
                </option>
              ))}
            </select>
          </Field>
        </div>
        <Field label="Short description (one sentence, shown in cards)">
          <input
            name="shortDescription"
            defaultValue={park.shortDescription ?? ''}
            className={inputCls}
          />
        </Field>
        <Field label="Long description">
          <textarea
            name="description"
            defaultValue={park.description ?? ''}
            rows={5}
            className={inputCls}
          />
        </Field>
      </Section>

      <Section title="Address & geo">
        <Field label="Address line 1">
          <input
            name="addressLine1"
            defaultValue={park.addressLine1}
            required
            className={inputCls}
          />
        </Field>
        <Field label="Address line 2">
          <input
            name="addressLine2"
            defaultValue={park.addressLine2 ?? ''}
            className={inputCls}
          />
        </Field>
        <div className="grid grid-cols-2 gap-4">
          <Field label="Postcode">
            <input name="postcode" defaultValue={park.postcode} required className={inputCls} />
          </Field>
          <Field label={`State: ${park.state} (read-only)`}>
            <input value={park.state} disabled className={`${inputCls} bg-ink-50`} />
          </Field>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <Field label="Latitude (-90 to 90)">
            <input
              name="latitude"
              type="number"
              step="any"
              defaultValue={park.latitude ?? ''}
              className={inputCls}
            />
          </Field>
          <Field label="Longitude (-180 to 180)">
            <input
              name="longitude"
              type="number"
              step="any"
              defaultValue={park.longitude ?? ''}
              className={inputCls}
            />
          </Field>
        </div>
      </Section>

      <Section title="Contact">
        <Field label="Website URL">
          <input
            name="websiteUrl"
            type="url"
            defaultValue={park.websiteUrl ?? ''}
            className={inputCls}
          />
        </Field>
        <div className="grid grid-cols-2 gap-4">
          <Field label="Phone">
            <input name="phone" defaultValue={park.phone ?? ''} className={inputCls} />
          </Field>
          <Field label="Enquiries email">
            <input
              name="emailEnquiries"
              type="email"
              defaultValue={park.emailEnquiries ?? ''}
              className={inputCls}
            />
          </Field>
        </div>
      </Section>

      <Section title="Fees">
        <div className="grid grid-cols-3 gap-4">
          <Field label="Min site fee ($)">
            <input
              name="siteFeesMinDollars"
              type="number"
              step="any"
              defaultValue={park.siteFeesMin != null ? park.siteFeesMin / 100 : ''}
              className={inputCls}
            />
          </Field>
          <Field label="Max site fee ($)">
            <input
              name="siteFeesMaxDollars"
              type="number"
              step="any"
              defaultValue={park.siteFeesMax != null ? park.siteFeesMax / 100 : ''}
              className={inputCls}
            />
          </Field>
          <Field label="Frequency">
            <select
              name="feeFrequency"
              defaultValue={park.feeFrequency ?? ''}
              className={inputCls}
            >
              {FEE_FREQS.map((f) => (
                <option key={f || 'none'} value={f}>
                  {f || '(none)'}
                </option>
              ))}
            </select>
          </Field>
        </div>
      </Section>

      <Section title="Facilities">
        <p className="text-xs text-ink-500">
          Tick every facility the community offers. These power the icon grid on
          the public page and side-by-side comparisons.
        </p>
        <div className="space-y-4">
          {Object.entries(CATEGORY_LABELS)
            .filter(([cat]) => (facilitiesByCategory.get(cat) ?? []).length > 0)
            .map(([cat, label]) => (
              <div key={cat}>
                <h4 className="text-xs font-medium uppercase tracking-wider text-ink-500">{label}</h4>
                <div className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1.5 sm:grid-cols-3">
                  {(facilitiesByCategory.get(cat) ?? []).map((f) => (
                    <Checkbox
                      key={f.slug}
                      name={`facility:${f.slug}`}
                      defaultChecked={checked.has(f.slug)}
                      label={f.name}
                    />
                  ))}
                </div>
              </div>
            ))}
        </div>
      </Section>

      <Section title="Other features">
        <div className="grid grid-cols-2 gap-3">
          <Checkbox name="petFriendly" defaultChecked={park.petFriendly} label="Pet friendly" />
          <Checkbox name="over50sOnly" defaultChecked={park.over50sOnly} label="Over 50s only" />
          <Checkbox name="coastal" defaultChecked={park.coastal} label="Coastal" />
          <Checkbox name="featured" defaultChecked={park.featured} label="Featured (homepage)" />
        </div>
        <div className="grid grid-cols-3 gap-4">
          <Field label="Age restriction (e.g. 55)">
            <input
              name="ageRestriction"
              type="number"
              defaultValue={park.ageRestriction ?? ''}
              className={inputCls}
            />
          </Field>
          <Field label="Total homes">
            <input
              name="totalHomes"
              type="number"
              defaultValue={park.totalHomes ?? ''}
              className={inputCls}
            />
          </Field>
          <Field label="Year established">
            <input
              name="yearEstablished"
              type="number"
              defaultValue={park.yearEstablished ?? ''}
              className={inputCls}
            />
          </Field>
        </div>
      </Section>

      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-ink-100 pt-6">
        <div className="flex items-center gap-3">
          <button
            type="submit"
            disabled={pending || deleting}
            className="rounded-lg bg-teal-700 px-5 py-2.5 text-sm font-medium text-white hover:bg-teal-800 disabled:opacity-50"
          >
            {pending ? 'Saving…' : 'Save changes'}
          </button>
          <a href="/admin/parks" className="text-sm text-ink-700 hover:text-ink-900">
            Cancel
          </a>
        </div>
        <button
          type="button"
          onClick={onDelete}
          disabled={pending || deleting}
          className="rounded-lg border border-red-300 px-4 py-2 text-sm font-medium text-red-700 hover:bg-red-50 disabled:opacity-50"
        >
          {deleting ? 'Deleting…' : 'Delete park'}
        </button>
      </div>
    </form>
  );
}

const inputCls =
  'w-full rounded-lg border border-ink-200 bg-white px-3 py-2 text-sm focus:border-teal-700 focus:outline-none';

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <fieldset className="space-y-4">
      <legend className="font-display text-lg text-ink-900">{title}</legend>
      {children}
    </fieldset>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="block text-xs uppercase tracking-wider text-ink-500">{label}</span>
      <div className="mt-1">{children}</div>
    </label>
  );
}

function Checkbox({ name, defaultChecked, label }: { name: string; defaultChecked: boolean; label: string }) {
  return (
    <label className="flex items-center gap-2 text-sm text-ink-800">
      <input type="checkbox" name={name} defaultChecked={defaultChecked} className="h-4 w-4" />
      {label}
    </label>
  );
}
