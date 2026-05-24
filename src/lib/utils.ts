import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function slugify(input: string): string {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-');
}

export function formatCurrencyAUD(cents: number | null | undefined): string {
  if (cents == null) return '-';
  return new Intl.NumberFormat('en-AU', {
    style: 'currency',
    currency: 'AUD',
    maximumFractionDigits: 0,
  }).format(cents / 100);
}

export function formatFeeRange(
  min: number | null | undefined,
  max: number | null | undefined,
  freq: string | null | undefined,
): string {
  if (min == null && max == null) return 'Fees on enquiry';
  const freqLabel = (freq ?? '').toLowerCase();
  if (min != null && max != null && min !== max) {
    return `${formatCurrencyAUD(min)}–${formatCurrencyAUD(max)} ${freqLabel}`;
  }
  return `${formatCurrencyAUD(min ?? max)} ${freqLabel}`;
}

export const STATE_LABELS: Record<string, string> = {
  ACT: 'Australian Capital Territory',
  NSW: 'New South Wales',
  NT: 'Northern Territory',
  QLD: 'Queensland',
  SA: 'South Australia',
  TAS: 'Tasmania',
  VIC: 'Victoria',
  WA: 'Western Australia',
};
