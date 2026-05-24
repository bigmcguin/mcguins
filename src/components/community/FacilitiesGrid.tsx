import { CATEGORY_LABELS, CATEGORY_ORDER, type FacilityCategory } from '@/lib/facilities';
import { FacilityIcon } from './FacilityIcon';

type Item = {
  slug: string;
  name: string;
  category: string;
  icon: string;
};

export function FacilitiesGrid({ items }: { items: Item[] }) {
  const byCategory = new Map<FacilityCategory, Item[]>();
  for (const item of items) {
    const cat = (CATEGORY_ORDER.includes(item.category as FacilityCategory)
      ? item.category
      : 'access-services') as FacilityCategory;
    const list = byCategory.get(cat) ?? [];
    list.push(item);
    byCategory.set(cat, list);
  }

  // Render in the canonical category order, skipping empty categories
  const ordered = CATEGORY_ORDER
    .map((cat) => ({ cat, items: byCategory.get(cat) ?? [] }))
    .filter((group) => group.items.length > 0);

  return (
    <div className="mt-4 space-y-6">
      {ordered.map(({ cat, items }) => (
        <div key={cat}>
          <h3 className="text-xs font-medium uppercase tracking-[0.18em] text-ink-500">
            {CATEGORY_LABELS[cat]}
          </h3>
          <ul className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2 sm:grid-cols-3">
            {items.map((item) => (
              <li key={item.slug} className="flex items-center gap-2 text-sm text-ink-800">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-teal-50 text-teal-700">
                  <FacilityIcon name={item.icon} size={18} />
                </span>
                <span>{item.name}</span>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
}
