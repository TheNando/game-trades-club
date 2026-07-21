import type { ListingCondition } from '../types/listing';

/** Human-readable labels keyed by listing condition. */
export const CONDITION_LABELS: Record<string, string> = {
  new: 'New',
  like_new: 'Like New',
  good: 'Good',
  fair: 'Fair',
  poor: 'Poor',
} as const;

/** Listing conditions formatted for selection controls. */
export const CONDITION_OPTIONS: { value: ListingCondition; label: string; }[] = [
  { value: 'new', label: 'New' },
  { value: 'like_new', label: 'Like New' },
  { value: 'good', label: 'Good' },
  { value: 'fair', label: 'Fair' },
  { value: 'poor', label: 'Poor' },
] as const;

/** All supported listing condition values. */
export const CONDITION_VALUES: readonly ListingCondition[] = [
  'new',
  'like_new',
  'good',
  'fair',
  'poor',
] as const;

/** Lookup set for supported listing condition values. */
export const VALID_CONDITIONS = new Set<string>(CONDITION_VALUES);
